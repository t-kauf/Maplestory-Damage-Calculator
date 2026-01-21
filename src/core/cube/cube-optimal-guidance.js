import { findOptimalSlotToCube, sampleExpectedDPSGain } from './cube-expected-value.js';
import { getCubeSlotData } from '@core/state/state.js';
import { saveToLocalStorage } from '@core/state/storage.js';
import { slotNames, RARITY_UPGRADE_RATES } from './cube-potential-data.js';
import { getStats } from '@core/state/state.js';
import { StatCalculationService } from '@core/services/stat-calculation-service.js';
import { potentialStatToDamageStat } from './cube-logic.js';

let guidanceState = {
    potentialType: 'regular',
    cubeBudget: 100
};

/**
 * Initialize optimal guidance tab
 */
export function initOptimalGuidance() {
    loadGuidanceBudget();
    calculateAndDisplayRecommendation();
    setupEventListeners();
}

/**
 * Load saved cube budget from localStorage
 */
function loadGuidanceBudget() {
    const saved = localStorage.getItem('optimalGuidanceBudget');
    if (saved) {
        guidanceState.cubeBudget = parseInt(saved) || 100;
        const budgetInput = document.getElementById('optimal-cube-budget');
        if (budgetInput) {
            budgetInput.value = guidanceState.cubeBudget;
        }
    }
}

/**
 * Calculate current slot DPS gain
 */
function calculateCurrentSlotDPSGain(slotId, slotData) {
    const baseStats = getStats('base');
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
                slotService.addPercentageStat('statDamage', mapped.value);
                accumulatedMainStatPct += line.value;
            } else {
                slotService.addPercentageStat(mapped.stat, mapped.value);
            }
        }
    });

    const slotDPS = slotService.computeDPS('boss');
    return ((slotDPS - baseDPS) / baseDPS * 100);
}

/**
 * Calculate and display current recommendation
 */
export function calculateAndDisplayRecommendation() {
    const cubeSlotData = getCubeSlotData();
    const potentialType = guidanceState.potentialType;

    // Get base stats for calculations
    const baseStats = getStats('base');
    const baseDPS = new StatCalculationService(baseStats).computeDPS('boss');

    // Build current slots state from user data
    const slots = slotNames.map(slotDef => {
        const slotData = cubeSlotData[slotDef.id][potentialType];
        return {
            id: slotDef.id,
            name: slotDef.name,
            rarity: slotData.rarity,
            rollCount: slotData.rollCount || 0,
            dpsGain: calculateCurrentSlotDPSGain(slotDef.id, slotData)
        };
    });

    // Find optimal slot with new function signature
    const { slot: recommendedSlot, marginalGain } = findOptimalSlotToCube(
        slots,
        baseStats,
        baseDPS,
        100 // Higher sample size for user-facing guidance
    );

    if (!recommendedSlot) {
        displayNoRecommendation();
        return;
    }

    // Calculate full optimal sequence
    const optimalSequence = calculateOptimalSequence(slots, guidanceState.cubeBudget);

    // Display
    displayRecommendation(recommendedSlot, marginalGain);
    displayOptimalSequence(optimalSequence);
}

/**
 * Calculate optimal sequence for entire budget
 */
function calculateOptimalSequence(slots, budget) {
    const sequence = [];
    const simSlots = JSON.parse(JSON.stringify(slots)); // Deep copy

    // Get base stats for DPS calculations
    const baseStats = getStats('base');
    const baseDPS = new StatCalculationService(baseStats).computeDPS('boss');

    let currentSlotId = null;
    let cubesOnCurrentSlot = 0;

    for (let i = 0; i < budget; i++) {
        const { slot } = findOptimalSlotToCube(simSlots, baseStats, baseDPS, 30);
        if (!slot) break;

        if (slot.id !== currentSlotId) {
            if (currentSlotId !== null) {
                const cumulativeDPS = simSlots.reduce((sum, s) => sum + s.dpsGain, 0);
                sequence.push({
                    slotId: currentSlotId,
                    slotName: simSlots.find(s => s.id === currentSlotId).name,
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

        // KEY FIX: Update dpsGain with expected value at new rarity
        // Sample what DPS we'd expect after this cube
        const sampledDPS = sampleExpectedDPSGain(slot.id, slot.rarity, baseStats, baseDPS);
        slot.dpsGain = sampledDPS;
    }

    // Add final slot
    if (currentSlotId !== null) {
        const cumulativeDPS = simSlots.reduce((sum, s) => sum + s.dpsGain, 0);
        sequence.push({
            slotId: currentSlotId,
            slotName: simSlots.find(s => s.id === currentSlotId).name,
            cubes: cubesOnCurrentSlot,
            cumulativeDPS
        });
    }

    return sequence;
}

/**
 * Display no recommendation message
 */
function displayNoRecommendation() {
    const panel = document.getElementById('optimal-recommendation');
    if (!panel) return;

    panel.innerHTML = `
        <div style="background: rgba(255, 255, 255, 0.5); border: 2px solid var(--border-color); border-radius: 16px; padding: 24px; text-align: center;">
            <div style="font-size: 1.2em; color: var(--text-secondary);">No recommendation available</div>
            <div style="font-size: 0.9em; color: var(--text-secondary); margin-top: 8px;">Please select a class first</div>
        </div>
    `;
}

/**
 * Display recommendation panel
 */
function displayRecommendation(slot, marginalGain) {
    const panel = document.getElementById('optimal-recommendation');
    if (!panel) return;

    const upgradeData = RARITY_UPGRADE_RATES[slot.rarity];
    const rollsUntilPity = upgradeData ? (upgradeData.max - slot.rollCount) : 'N/A';

    panel.innerHTML = `
        <div style="background: linear-gradient(135deg, rgba(52, 199, 89, 0.1), rgba(0, 122, 255, 0.05));
                    border: 2px solid var(--accent-success); border-radius: 16px; padding: 24px;">
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
function displayOptimalSequence(sequence) {
    const container = document.getElementById('optimal-sequence');
    if (!container) return;

    let html = `
        <h4 style="color: var(--accent-primary); margin: 20px 0 15px;">
            Optimal Sequence (${sequence.reduce((sum, s) => sum + s.cubes, 0)} cubes)
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
function setupEventListeners() {
    // Potential type selector
    const potentialTypeSelect = document.getElementById('optimal-potential-type');
    if (potentialTypeSelect) {
        potentialTypeSelect.addEventListener('change', (e) => {
            guidanceState.potentialType = e.target.value;
            calculateAndDisplayRecommendation();
        });
    }

    // Cube budget input
    const budgetInput = document.getElementById('optimal-cube-budget');
    if (budgetInput) {
        budgetInput.addEventListener('change', (e) => {
            const value = parseInt(e.target.value) || 100;
            guidanceState.cubeBudget = Math.max(1, Math.min(9999, value));
            budgetInput.value = guidanceState.cubeBudget;
            localStorage.setItem('optimalGuidanceBudget', guidanceState.cubeBudget.toString());
            calculateAndDisplayRecommendation();
        });
    }
}

// Export for window binding
window.initOptimalGuidance = initOptimalGuidance;
