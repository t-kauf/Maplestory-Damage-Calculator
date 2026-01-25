/**
 * Cube Optimal Guidance - Recommendation Engine and Optimal Strategy Display
 * Provides recommendations for optimal cube usage based on expected value
 */

import { StatCalculationService } from '@ts/services/stat-calculation-service.js';
import {
    RARITY_UPGRADE_RATES,
    SLOT_NAMES
} from '@ts/page/cube-potential/cube-potential-data.js';
import { loadoutStore } from '@ts/store/loadout.store.js';
import { potentialStatToDamageStat } from '@ts/page/cube-potential/cube-potential.js';
import { findOptimalSlotToCube, sampleExpectedDPSGain } from './cube-expected-value.js';
import type { SlotState } from './cube-expected-value.js';
import type { BaseStats } from '@ts/types/loadout.js';
import type { CubeSlotId, Rarity, PotentialSet } from '@ts/types/page/gear-lab/gear-lab.types';

// ============================================================================
// TYPES
// ============================================================================

export interface GuidanceState {
    potentialType: 'regular' | 'bonus';
    cubeBudget: number;
}

export interface OptimalSequenceStep {
    slotId: CubeSlotId;
    slotName: string;
    cubes: number;
    cumulativeDPS: number;
}

export interface GuidanceData {
    recommendedSlot: SlotState | null;
    marginalGain: number;
    optimalSequence: OptimalSequenceStep[];
}

// ============================================================================
// STATE
// ============================================================================

let guidanceState: GuidanceState = {
    potentialType: 'regular',
    cubeBudget: 100
};

// ============================================================================
// OPTIMAL GUIDANCE FUNCTIONS
// ============================================================================

/**
 * Initialize optimal guidance system
 */
export function initOptimalGuidance(): void {
    loadGuidanceBudget();
}

/**
 * Load saved cube budget from localStorage
 */
function loadGuidanceBudget(): void {
    const saved = localStorage.getItem('optimalGuidanceBudget');
    if (saved) {
        guidanceState.cubeBudget = parseInt(saved) || 100;
        const budgetInput = document.getElementById('optimal-cube-budget') as HTMLInputElement;
        if (budgetInput) {
            budgetInput.value = guidanceState.cubeBudget.toString();
        }
    }
}

/**
 * Calculate current slot DPS gain
 */
function calculateCurrentSlotDPSGain(slotId: CubeSlotId, slotData: { rarity: Rarity; setA: PotentialSet }): number {
    const baseStats = loadoutStore.getBaseStats();
    const baseDPS = new StatCalculationService(baseStats).computeDPS('boss');

    const slotService = new StatCalculationService(baseStats);
    let accumulatedMainStatPct = 0;

    const lines = [
        slotData.setA.line1,
        slotData.setA.line2,
        slotData.setA.line3
    ];

    lines.forEach(line => {
        if (!line || !line.stat) return;
        const mapped = potentialStatToDamageStat(line.stat, line.value, accumulatedMainStatPct);
        if (mapped.stat) {
            if (mapped.isMainStatPct) {
                slotService.add(mapped.stat, mapped.value);
                accumulatedMainStatPct += line.value;
            } else {
                slotService.add(mapped.stat, mapped.value);
            }
        }
    });

    const slotDPS = slotService.computeDPS('boss');
    return ((slotDPS - baseDPS) / baseDPS * 100);
}

/**
 * Calculate and display current recommendation
 */
export function calculateAndDisplayRecommendation(
    cubeSlotData: Record<string, any>
): GuidanceData | null {
    const potentialType = guidanceState.potentialType;

    // Get base stats for calculations
    const baseStats = loadoutStore.getBaseStats();
    const baseDPS = new StatCalculationService(baseStats).computeDPS('boss');

    // Build current slots state from user data
    const slots: SlotState[] = SLOT_NAMES.map(slotDef => {
        const slotData = cubeSlotData[slotDef.id][potentialType];
        return {
            id: slotDef.id,
            name: slotDef.name,
            rarity: slotData.rarity,
            rollCount: slotData.rollCount || 0,
            dpsGain: calculateCurrentSlotDPSGain(slotDef.id, slotData)
        };
    });

    // Find optimal slot
    const { slot: recommendedSlot, marginalGain } = findOptimalSlotToCube(
        slots,
        baseStats,
        baseDPS,
        100 // Higher sample size for user-facing guidance
    );

    if (!recommendedSlot) {
        displayNoRecommendation();
        return null;
    }

    // Calculate full optimal sequence
    const optimalSequence = calculateOptimalSequence(slots, baseStats, baseDPS);

    // Display
    displayRecommendation(recommendedSlot, marginalGain);
    displayOptimalSequence(optimalSequence);

    return {
        recommendedSlot,
        marginalGain,
        optimalSequence
    };
}

/**
 * Calculate optimal sequence for entire budget
 */
function calculateOptimalSequence(
    initialSlots: SlotState[],
    baseStats: BaseStats,
    baseDPS: number
): OptimalSequenceStep[] {
    const sequence: OptimalSequenceStep[] = [];
    const simSlots: SlotState[] = JSON.parse(JSON.stringify(initialSlots)); // Deep copy

    let currentSlotId: CubeSlotId | null = null;
    let cubesOnCurrentSlot = 0;

    for (let i = 0; i < guidanceState.cubeBudget; i++) {
        const { slot } = findOptimalSlotToCube(simSlots, baseStats, baseDPS, 30);
        if (!slot) break;

        if (slot.id !== currentSlotId) {
            if (currentSlotId !== null) {
                const cumulativeDPS = simSlots.reduce((sum, s) => sum + s.dpsGain, 0);
                sequence.push({
                    slotId: currentSlotId,
                    slotName: simSlots.find(s => s.id === currentSlotId)!.name,
                    cubes: cubesOnCurrentSlot,
                    cumulativeDPS
                });
            }
            currentSlotId = slot.id;
            cubesOnCurrentSlot = 0;
        }

        cubesOnCurrentSlot++;

        // Simulate cube use
        slot.rollCount = (slot.rollCount || 0) + 1;

        const upgradeData = RARITY_UPGRADE_RATES[slot.rarity];
        if (upgradeData) {
            if (slot.rollCount >= upgradeData.max) {
                slot.rarity = upgradeData.next;
                slot.rollCount = 0;
            } else if (Math.random() < upgradeData.rate) {
                slot.rarity = upgradeData.next;
                slot.rollCount = 0;
            }
        }

        // Update dpsGain with expected value at new rarity
        const sampledDPS = sampleExpectedDPSGain(slot.id, slot.rarity, baseStats, baseDPS);
        slot.dpsGain = sampledDPS;
    }

    // Add final slot
    if (currentSlotId !== null) {
        const cumulativeDPS = simSlots.reduce((sum, s) => sum + s.dpsGain, 0);
        sequence.push({
            slotId: currentSlotId,
            slotName: simSlots.find(s => s.id === currentSlotId)!.name,
            cubes: cubesOnCurrentSlot,
            cumulativeDPS
        });
    }

    return sequence;
}

/**
 * Display no recommendation message
 */
function displayNoRecommendation(): void {
    const panel = document.getElementById('optimal-recommendation');
    if (!panel) return;

    panel.innerHTML = `
        <div class="optimal-no-recommendation-card">
            <div style="font-size: 1.2em; color: var(--text-secondary);">No recommendation available</div>
            <div style="font-size: 0.9em; color: var(--text-secondary); margin-top: 8px;">Please select a class first</div>
        </div>
    `;
}

/**
 * Display recommendation panel
 */
function displayRecommendation(slot: SlotState, marginalGain: number): void {
    const panel = document.getElementById('optimal-recommendation');
    if (!panel) return;

    const upgradeData = RARITY_UPGRADE_RATES[slot.rarity];
    const rollsUntilPity = upgradeData ? (upgradeData.max - slot.rollCount) : 'N/A';

    panel.innerHTML = `
        <div class="optimal-recommendation-card">
            <div style="display: flex; justify-content: space-between; align-items: start;">
                <div>
                    <div style="font-size: 0.85em; color: var(--text-secondary); margin-bottom: 4px;">
                        Recommended Next Slot
                    </div>
                    <div style="font-size: 1.8em; font-weight: 700; color: var(--accent-success);">
                        ${slot.name}
                    </div>
                    <div style="font-size: 0.9em; color: var(--text-secondary); margin-top: 8px;">
                        ${slot.rarity.charAt(0).toUpperCase() + slot.rarity.slice(1)} •
                        ${slot.rollCount} rolls •
                        ${typeof rollsUntilPity === 'number' ? rollsUntilPity : rollsUntilPity} until pity
                    </div>
                </div>
                <div style="text-align: right;">
                    <div style="font-size: 0.85em; color: var(--text-secondary);">Expected Gain</div>
                    <div style="font-size: 1.5em; font-weight: 700; color: var(--accent-primary);">
                        +${marginalGain.toFixed(3)}%
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Display optimal sequence table
 */
function displayOptimalSequence(sequence: OptimalSequenceStep[]): void {
    const container = document.getElementById('optimal-sequence');
    if (!container) return;

    const totalCubes = sequence.reduce((sum, s) => sum + s.cubes, 0);

    let html = `
        <h4 style="color: var(--accent-primary); margin: 20px 0 15px;">
            Optimal Sequence (${totalCubes} cubes)
        </h4>
        <table class="stat-weight-table">
            <thead>
                <tr>
                    <th>Priority</th>
                    <th>Slot</th>
                    <th>Cubes</th>
                    <th>Cumulative DPS</th>
                </tr>
            </thead>
            <tbody>
    `;

    sequence.forEach((step, idx) => {
        html += `
            <tr>
                <td style="font-weight: 600;">${idx + 1}</td>
                <td>${step.slotName}</td>
                <td>${step.cubes}</td>
                <td>+${step.cumulativeDPS.toFixed(2)}%</td>
            </tr>
        `;
    });

    html += '</tbody></table>';
    container.innerHTML = html;
}

/**
 * Setup event listeners for optimal guidance tab
 */
export function setupOptimalGuidanceEventListeners(): void {
    // Potential type selector
    const potentialTypeSelect = document.getElementById('optimal-potential-type') as HTMLSelectElement;
    if (potentialTypeSelect) {
        potentialTypeSelect.addEventListener('change', (e) => {
            guidanceState.potentialType = (e.target as HTMLSelectElement).value as 'regular' | 'bonus';
            // Trigger recalculation via callback
            const cubeSlotData = (window as any).cubeSlotData;
            if (cubeSlotData) {
                calculateAndDisplayRecommendation(cubeSlotData);
            }
        });
    }

    // Cube budget input
    const budgetInput = document.getElementById('optimal-cube-budget') as HTMLInputElement;
    if (budgetInput) {
        budgetInput.addEventListener('change', (e) => {
            const value = parseInt((e.target as HTMLInputElement).value) || 100;
            guidanceState.cubeBudget = Math.max(1, Math.min(9999, value));
            budgetInput.value = guidanceState.cubeBudget.toString();
            localStorage.setItem('optimalGuidanceBudget', guidanceState.cubeBudget.toString());

            // Trigger recalculation via callback
            const cubeSlotData = (window as any).cubeSlotData;
            if (cubeSlotData) {
                calculateAndDisplayRecommendation(cubeSlotData);
            }
        });
    }
}

/**
 * Get current guidance state
 */
export function getGuidanceState(): GuidanceState {
    return { ...guidanceState };
}

/**
 * Update guidance state
 */
export function updateGuidanceState(updates: Partial<GuidanceState>): void {
    guidanceState = { ...guidanceState, ...updates };
}
