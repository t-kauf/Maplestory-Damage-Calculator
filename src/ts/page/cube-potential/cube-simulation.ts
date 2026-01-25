/**
 * Cube Simulation - Monte Carlo Simulation and Strategy Implementations
 * Simulates cube usage strategies to compare effectiveness
 */

import { StatCalculationService } from '@ts/services/stat-calculation-service.js';
import { loadoutStore } from '@ts/store/loadout.store.js';
import {
    RARITY_UPGRADE_RATES,
    EQUIPMENT_POTENTIAL_DATA,
    SLOT_SPECIFIC_POTENTIALS,
    SLOT_NAMES,
    RARITIES
} from '@ts/page/cube-potential/cube-potential-data.js';
import {
    potentialStatToDamageStat,
    rankingsCache,
    rankingsInProgress,
    type RankingEntry
} from '@ts/page/cube-potential/cube-potential.js';
import { findOptimalSlotToCube, sampleExpectedDPSGain } from './cube-expected-value.js';
import type { CubeSlotId, Rarity, PotentialLineEntry, PotentialSet } from '@ts/types/page/gear-lab/gear-lab.types';
import type { BaseStats } from '@ts/types/loadout.js';
import type { SlotState } from './cube-expected-value.js';

// ============================================================================
// TYPES
// ============================================================================

export interface SimulationSlotState extends SlotState {
    lines: (PotentialLineEntry | null)[];
}

export interface SimulationResult {
    totalGains: number[];
    simulations: SimulationRunResult[];
    avgGain: number;
    slotDistribution: Record<string, number>;
}

export interface SimulationRunResult {
    slots: SimulationSlotState[];
    totalGain: number;
    decisionLog?: DecisionLogEntry[];
    simulations?: SimulationRunResult[]; // For nested results in DP Optimal
}

export interface DecisionLogEntry {
    cubeNum: number;
    slotId: CubeSlotId;
    slotName: string;
    marginalGain: number;
    rarity: Rarity;
    rollCount: number;
    dpsBeforeCube: number;
}

// ============================================================================
// STATE
// ============================================================================

/**
 * Batch size for progress updates during ranking calculation
 * Updates UI every N combinations processed
 */
const PROGRESS_UPDATE_BATCH_SIZE = 50;

/**
 * Minimum DPS gain threshold (in %) for a combination to be included in rankings
 * Filters out negligible gains that don't meaningfully impact damage
 */
const MIN_GAIN_THRESHOLD = 0.01;

/**
 * Simulation cache for performance optimization
 */
interface SimulationCache {
    baseStats: BaseStats | null;
    baseDPS: number | null;
    lineOptionsCache: Record<string, LineOptionsCacheEntry>;
    weightCache: Record<string, number>;
}

interface LineOptionsCacheEntry {
    line1: PotentialLineEntry[];
    line2: PotentialLineEntry[];
    line3: PotentialLineEntry[];
}

const simCache: SimulationCache = {
    baseStats: null,
    baseDPS: null,
    lineOptionsCache: {},
    weightCache: {}
};

// ============================================================================
// SIMULATION CORE
// ============================================================================

/**
 * Initialize simulation cache for performance
 */
export function initSimulationCache(baseStats: BaseStats): void {
    simCache.baseStats = baseStats;
    simCache.baseDPS = new StatCalculationService(baseStats).computeDPS('boss');
    simCache.lineOptionsCache = {};
    simCache.weightCache = {};

    // Pre-calculate line options and weights for all slot+rarity combinations
    SLOT_NAMES.forEach(slotDef => {
        const slotId = slotDef.id;
        RARITIES.forEach(rarity => {
            const potentialData = EQUIPMENT_POTENTIAL_DATA[rarity as Rarity];
            if (!potentialData) return;

            const key = `${slotId}-${rarity}`;
            const cached: LineOptionsCacheEntry = {
                line1: [...(potentialData.line1 || [])],
                line2: [...(potentialData.line2 || [])],
                line3: [...(potentialData.line3 || [])]
            };

            // Add slot-specific lines
            const slotSpecific = SLOT_SPECIFIC_POTENTIALS[slotId]?.[rarity as Rarity];
            if (slotSpecific) {
                if (slotSpecific.line1) cached.line1 = [...cached.line1, ...slotSpecific.line1];
                if (slotSpecific.line2) cached.line2 = [...cached.line2, ...slotSpecific.line2];
                if (slotSpecific.line3) cached.line3 = [...cached.line3, ...slotSpecific.line3];
            }

            simCache.lineOptionsCache[key] = cached;

            // Pre-calculate total weights
            simCache.weightCache[`${key}-1`] = cached.line1.reduce((sum, opt) => sum + opt.weight, 0);
            simCache.weightCache[`${key}-2`] = cached.line2.reduce((sum, opt) => sum + opt.weight, 0);
            simCache.weightCache[`${key}-3`] = cached.line3.reduce((sum, opt) => sum + opt.weight, 0);
        });
    });
}

/**
 * Helper function to get initial slot state
 * Either starts from user's current equipment data or from scratch
 */
function getInitialSlotState(
    useUserData: boolean,
    potentialType: 'regular' | 'bonus',
    cubeSlotData: Record<string, any>
): SimulationSlotState[] {
    if (useUserData) {
        return SLOT_NAMES.map(slotDef => {
            const slotData = cubeSlotData[slotDef.id][potentialType];
            // Extract lines from setA
            const lines = [
                slotData.setA.line1?.stat ? slotData.setA.line1 : null,
                slotData.setA.line2?.stat ? slotData.setA.line2 : null,
                slotData.setA.line3?.stat ? slotData.setA.line3 : null
            ];
            return {
                id: slotDef.id,
                name: slotDef.name,
                rarity: slotData.rarity,
                rollCount: slotData.rollCount || 0,
                lines: lines,
                dpsGain: calculateExistingSlotDPSGain(slotDef.id, slotData)
            };
        });
    } else {
        return SLOT_NAMES.map(slotDef => ({
            id: slotDef.id,
            name: slotDef.name,
            rarity: 'normal',
            rollCount: 0,
            lines: [null, null, null],
            dpsGain: 0
        }));
    }
}

/**
 * Calculate DPS gain for existing slot data
 */
function calculateExistingSlotDPSGain(slotId: CubeSlotId, slotData: { rarity: Rarity; setA: PotentialSet }): number {
    if (!simCache.baseStats || simCache.baseDPS === null) {
        throw new Error('Simulation cache not initialized');
    }

    const slotService = new StatCalculationService(simCache.baseStats);
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
    return ((slotDPS - simCache.baseDPS) / simCache.baseDPS * 100);
}

/**
 * Simulate using a single cube on a slot
 */
export function simulateCubeOnSlot(slot: SimulationSlotState): void {
    if (!simCache.baseStats || simCache.baseDPS === null) {
        throw new Error('Simulation cache not initialized');
    }

    // Increment roll count
    slot.rollCount = (slot.rollCount || 0) + 1;

    // Check for rarity upgrade with pity mechanics
    const upgradeData = RARITY_UPGRADE_RATES[slot.rarity];
    if (upgradeData) {
        // Check pity first (guaranteed upgrade at max rolls)
        if (slot.rollCount >= upgradeData.max) {
            slot.rarity = upgradeData.next;
            slot.rollCount = 0;
        }
        // Then check random upgrade
        else if (Math.random() < upgradeData.rate) {
            slot.rarity = upgradeData.next;
            slot.rollCount = 0;
        }
    }

    // Get cached line options
    const key = `${slot.id}-${slot.rarity}`;
    const lineOptions = simCache.lineOptionsCache[key];
    if (!lineOptions) return;

    // Roll each line based on weight using cached options
    slot.lines = [
        rollPotentialLineCached(lineOptions.line1, simCache.weightCache[`${key}-1`]),
        rollPotentialLineCached(lineOptions.line2, simCache.weightCache[`${key}-2`]),
        rollPotentialLineCached(lineOptions.line3, simCache.weightCache[`${key}-3`])
    ];

    // Calculate DPS gain for this slot
    slot.dpsGain = calculateSlotDPSGainCached(slot);
}

/**
 * Roll a single potential line based on weights (optimized with cached total weight)
 */
export function rollPotentialLineCached(
    options: PotentialLineEntry[],
    totalWeight: number
): PotentialLineEntry | null {
    if (!options || options.length === 0) return null;

    let random = Math.random() * totalWeight;

    for (const option of options) {
        random -= option.weight;
        if (random <= 0) {
            return option;
        }
    }

    return options[options.length - 1];
}

/**
 * Calculate DPS gain for a single slot (optimized with cached base stats)
 */
export function calculateSlotDPSGainCached(slot: SimulationSlotState): number {
    if (!simCache.baseStats || simCache.baseDPS === null) {
        throw new Error('Simulation cache not initialized');
    }

    const slotService = new StatCalculationService(simCache.baseStats);
    let accumulatedMainStatPct = 0;

    if (slot.lines) {
        for (const line of slot.lines) {
            if (!line) continue;
            const mapped = potentialStatToDamageStat(line.stat, line.value, accumulatedMainStatPct);
            if (mapped.stat) {
                if (mapped.isMainStatPct) {
                    slotService.add(mapped.stat, mapped.value);
                    accumulatedMainStatPct += line.value;
                } else {
                    slotService.add(mapped.stat, mapped.value);
                }
            }
        }
    }

    const slotDPS = slotService.computeDPS('boss');
    return ((slotDPS - simCache.baseDPS) / simCache.baseDPS * 100);
}

/**
 * Calculate total DPS gain from all slots (optimized with cached base stats)
 */
export function calculateTotalDPSGain(slots: SimulationSlotState[]): number {
    if (!simCache.baseStats || simCache.baseDPS === null) {
        throw new Error('Simulation cache not initialized');
    }

    const totalService = new StatCalculationService(simCache.baseStats);
    let accumulatedMainStatPct = 0;

    for (const slot of slots) {
        if (!slot.lines) continue;

        for (const line of slot.lines) {
            if (!line) continue;
            const mapped = potentialStatToDamageStat(line.stat, line.value, accumulatedMainStatPct);
            if (mapped.stat) {
                if (mapped.isMainStatPct) {
                    totalService.add(mapped.stat, mapped.value);
                    accumulatedMainStatPct += line.value;
                } else {
                    totalService.add(mapped.stat, mapped.value);
                }
            }
        }
    }

    const totalDPS = totalService.computeDPS('boss');
    return ((totalDPS - simCache.baseDPS) / simCache.baseDPS * 100);
}

/**
 * Calculate rankings for a specific slot and rarity
 * This function computes all possible combinations and ranks them by DPS gain
 */
export async function calculateRankingsForRarity(
    rarity: Rarity,
    slotId: CubeSlotId
): Promise<void> {
    const key = `${slotId}-${rarity}`;

    try {
        // Initialize slot cache if needed
        if (!rankingsCache[slotId]) {
            rankingsCache[slotId] = {} as any;
        }

        // Check if already calculated for this slot and rarity
        if (rankingsCache[slotId][rarity]) {
            return;
        }

        // Check if already calculating this combination
        if (rankingsInProgress[key]) {
            return; // Already calculating, skip
        }

        // Mark as in progress
        rankingsInProgress[key] = true;

        // Check if class is selected
        if (!loadoutStore.getSelectedClass()) {
            delete rankingsInProgress[key];
            return;
        }

        const progressBar = document.getElementById('cube-rankings-progress') as HTMLElement;
        const progressFill = document.getElementById('cube-rankings-progress-fill') as HTMLElement;
        const progressText = document.getElementById('cube-rankings-progress-text') as HTMLElement;

        // Show progress bar
        if (progressBar) progressBar.style.display = 'block';
        if (progressFill) progressFill.style.width = '0%';
        if (progressText) progressText.textContent = 'Calculating... 0%';

        const potentialData = EQUIPMENT_POTENTIAL_DATA[rarity];
        if (!potentialData) {
            if (progressBar) progressBar.style.display = 'none';
            delete rankingsInProgress[key];
            return;
        }

        // Get base potential lines
        let line1Options = [...(potentialData.line1 || [])];
        let line2Options = [...(potentialData.line2 || [])];
        let line3Options = [...(potentialData.line3 || [])];

        // Add slot-specific lines if available for current slot
        if (SLOT_SPECIFIC_POTENTIALS[slotId] && SLOT_SPECIFIC_POTENTIALS[slotId][rarity]) {
            const slotSpecific = SLOT_SPECIFIC_POTENTIALS[slotId][rarity];
            if (slotSpecific.line1) {
                line1Options = [...line1Options, ...slotSpecific.line1];
            }
            if (slotSpecific.line2) {
                line2Options = [...line2Options, ...slotSpecific.line2];
            }
            if (slotSpecific.line3) {
                line3Options = [...line3Options, ...slotSpecific.line3];
            }
        }

        const totalCombinations = line1Options.length * line2Options.length * line3Options.length;
        const rankings: RankingEntry[] = [];
        const baseStats = loadoutStore.getBaseStats();
        const baseService = new StatCalculationService(baseStats);
        const baseDPS = baseService.computeDPS('boss');

        // Reuse service instance to avoid redundant calculations
        const comboService = new StatCalculationService(baseStats);

        let processedCount = 0;

        // Process in batches
        for (let i = 0; i < line1Options.length; i++) {
            for (let j = 0; j < line2Options.length; j++) {
                for (let k = 0; k < line3Options.length; k++) {
                    const combo = {
                        line1: line1Options[i],
                        line2: line2Options[j],
                        line3: line3Options[k]
                    };

                    // Calculate stats for this combination using StatCalculationService
                    comboService.reset();
                    let accumulatedMainStatPct = 0;

                    [combo.line1, combo.line2, combo.line3].forEach(line => {
                        const mapped = potentialStatToDamageStat(line.stat, line.value, accumulatedMainStatPct);
                        if (mapped.stat) {
                            if (mapped.isMainStatPct) {
                                comboService.add(mapped.stat, mapped.value);
                                accumulatedMainStatPct += line.value;
                            } else {
                                comboService.add(mapped.stat, mapped.value);
                            }
                        }
                    });

                    const comboDPS = comboService.computeDPS('boss');
                    const gain = ((comboDPS - baseDPS) / baseDPS * 100);

                    rankings.push({
                        line1: combo.line1,
                        line2: combo.line2,
                        line3: combo.line3,
                        dpsGain: gain
                    });

                    processedCount++;

                    // Update progress periodically
                    if (processedCount % PROGRESS_UPDATE_BATCH_SIZE === 0) {
                        const progress = (processedCount / totalCombinations * 100);

                        if (progressFill) progressFill.style.width = `${progress}%`;
                        if (progressText) progressText.textContent = `Calculating... ${Math.round(progress)}%`;

                        // Allow UI to update
                        await new Promise(resolve => setTimeout(resolve, 0));
                    }
                }
            }
        }

        // Sort by DPS gain descending
        rankings.sort((a, b) => b.dpsGain - a.dpsGain);

        // Deduplicate: keep only unique combinations of lines (order doesn't matter)
        // This ensures that [LineA, LineB, LineC] is treated the same as [LineC, LineA, LineB]
        const seen = new Set<string>();
        const deduplicatedRankings: RankingEntry[] = [];

        for (const combo of rankings) {
            // Create a canonical signature by sorting the 3 lines alphabetically
            // This allows us to detect duplicate combinations regardless of order
            const signature = [combo.line1, combo.line2, combo.line3]
                .map(line => `${line.stat}|${line.value}|${line.prime}`)
                .sort()
                .join('||');

            if (!seen.has(signature)) {
                seen.add(signature);
                deduplicatedRankings.push(combo);
            }
        }

        // Filter out combinations with negligible DPS gain (< 0.01%)
        // This prevents showing combinations that have no meaningful impact on damage
        const filteredRankings = deduplicatedRankings.filter(combo => combo.dpsGain > MIN_GAIN_THRESHOLD);

        // Cache the filtered results for this slot and rarity
        rankingsCache[slotId][rarity] = filteredRankings;

        // Hide progress bar
        if (progressBar) {
            progressBar.style.display = 'none';
        }
    } catch (error) {
        console.error(`[${key}] Error calculating rankings:`, error);
        const progressBar = document.getElementById('cube-rankings-progress') as HTMLElement;
        if (progressBar) {
            progressBar.style.display = 'none';
        }
    } finally {
        // Always mark as complete and remove from in-progress tracker
        delete rankingsInProgress[key];
    }
}

// ============================================================================
// STRATEGIES
// ============================================================================

/**
 * Strategy: Worst First - always upgrade the slot with lowest DPS
 */
export function runWorstFirstStrategy(
    cubeBudget: number,
    useUserData: boolean = false,
    potentialType: 'regular' | 'bonus' = 'regular',
    cubeSlotData: Record<string, any> = {}
): SimulationSlotState[] {
    const slots = getInitialSlotState(useUserData, potentialType, cubeSlotData);

    // Use all cubes
    for (let i = 0; i < cubeBudget; i++) {
        // Find slot with lowest DPS gain
        let worstSlot = slots[0];
        for (const slot of slots) {
            if (slot.dpsGain < worstSlot.dpsGain) {
                worstSlot = slot;
            }
        }

        // Use cube on worst slot
        simulateCubeOnSlot(worstSlot);
    }

    return slots;
}

/**
 * Strategy: Balanced Threshold - keep all slots within a certain range of each other
 */
export function runBalancedThresholdStrategy(
    cubeBudget: number,
    useUserData: boolean = false,
    potentialType: 'regular' | 'bonus' = 'regular',
    cubeSlotData: Record<string, any> = {}
): SimulationSlotState[] {
    const slots = getInitialSlotState(useUserData, potentialType, cubeSlotData);

    // Use all cubes
    for (let i = 0; i < cubeBudget; i++) {
        // Find the average DPS gain
        const avgDPS = slots.reduce((sum, slot) => sum + slot.dpsGain, 0) / slots.length;

        // Find slot that is furthest below average
        let targetSlot = slots[0];
        let maxDeficit = avgDPS - targetSlot.dpsGain;

        for (const slot of slots) {
            const deficit = avgDPS - slot.dpsGain;
            if (deficit > maxDeficit) {
                maxDeficit = deficit;
                targetSlot = slot;
            }
        }

        // Use cube on target slot
        simulateCubeOnSlot(targetSlot);
    }

    return slots;
}

/**
 * Strategy: Rarity-Weighted Worst First - considers proximity to rarity upgrades
 */
export function runRarityWeightedWorstFirstStrategy(
    cubeBudget: number,
    useUserData: boolean = false,
    potentialType: 'regular' | 'bonus' = 'regular',
    cubeSlotData: Record<string, any> = {}
): SimulationSlotState[] {
    const slots = getInitialSlotState(useUserData, potentialType, cubeSlotData);

    // Initialize cubesAtCurrentRarity from rollCount for each slot
    slots.forEach(slot => {
        slot.cubesAtCurrentRarity = slot.rollCount || 0;
    });

    const expectedCubesForUpgrade: Record<string, number> = {
        'normal': 1 / 0.06,      // ~16.7 cubes
        'rare': 1 / 0.03333,     // ~30 cubes
        'epic': 1 / 0.0167,      // ~60 cubes
        'unique': 1 / 0.006,     // ~167 cubes
        'legendary': 1 / 0.0021  // ~476 cubes
    };

    // Use all cubes
    for (let i = 0; i < cubeBudget; i++) {
        // Calculate weighted score for each slot
        let bestSlot = slots[0];
        let bestScore = Infinity;

        for (const slot of slots) {
            // Lower DPS is worse (want to improve it)
            let score = slot.dpsGain;

            // If slot is close to upgrading, reduce its score (make it more attractive)
            const expectedCubes = expectedCubesForUpgrade[slot.rarity];
            if (expectedCubes) {
                const upgradeProgress = (slot.cubesAtCurrentRarity || 0) / expectedCubes;
                // Bonus for being close to upgrade (up to 50% reduction in score)
                score = score * (1 - upgradeProgress * 0.5);
            }

            if (score < bestScore) {
                bestScore = score;
                bestSlot = slot;
            }
        }

        // Track cubes used at current rarity
        simulateCubeOnSlot(bestSlot);

        // Update cubesAtCurrentRarity to match rollCount from simulateCubeOnSlot
        bestSlot.cubesAtCurrentRarity = bestSlot.rollCount || 0;
    }

    return slots;
}

/**
 * Strategy: Hybrid Fast Rarity + Worst First
 */
export function runHybridFastRarityStrategy(
    cubeBudget: number,
    useUserData: boolean = false,
    potentialType: 'regular' | 'bonus' = 'regular',
    cubeSlotData: Record<string, any> = {}
): SimulationSlotState[] {
    const slots = getInitialSlotState(useUserData, potentialType, cubeSlotData);

    let cubesUsed = 0;
    const targetRarity: Rarity = 'epic'; // Get all slots to epic first
    const rarityProgression: Rarity[] = ['rare', 'epic', 'unique', 'legendary', 'mystic'];

    // Phase 1: Rush all slots to target rarity
    for (const slot of slots) {
        while (cubesUsed < cubeBudget && slot.rarity !== targetRarity) {
            simulateCubeOnSlot(slot);
            cubesUsed++;

            // Check if we reached target
            const currentIndex = rarityProgression.indexOf(slot.rarity);
            const targetIndex = rarityProgression.indexOf(targetRarity);
            if (currentIndex >= targetIndex) break;
        }

        if (cubesUsed >= cubeBudget) break;
    }

    // Phase 2: Use remaining cubes with Worst First strategy
    while (cubesUsed < cubeBudget) {
        // Find slot with lowest DPS gain
        let worstSlot = slots[0];
        for (const slot of slots) {
            if (slot.dpsGain < worstSlot.dpsGain) {
                worstSlot = slot;
            }
        }

        simulateCubeOnSlot(worstSlot);
        cubesUsed++;
    }

    return slots;
}

/**
 * DP Optimal Strategy
 * At each step, cubes the slot with highest expected marginal DPS gain
 * Uses Monte Carlo expected value with actual DPS calculations
 */
export function runDPOptimalStrategy(
    cubeBudget: number,
    useUserData: boolean = false,
    potentialType: 'regular' | 'bonus' = 'regular',
    cubeSlotData: Record<string, any> = {}
): SimulationRunResult {
    const slots = getInitialSlotState(useUserData, potentialType, cubeSlotData);
    const decisionLog: DecisionLogEntry[] = [];

    if (!simCache.baseStats || simCache.baseDPS === null) {
        throw new Error('Simulation cache not initialized');
    }

    // Get base stats and DPS from cache
    const baseStats = simCache.baseStats;
    const baseDPS = simCache.baseDPS;

    for (let cubeNum = 1; cubeNum <= cubeBudget; cubeNum++) {
        // Find optimal slot using Monte Carlo expected value
        const { slot: targetSlot, marginalGain } = findOptimalSlotToCube(
            slots as SlotState[],
            baseStats,
            baseDPS,
            30 // Sample size for simulation speed
        );

        if (!targetSlot) break;

        // Log decision
        decisionLog.push({
            cubeNum,
            slotId: targetSlot.id,
            slotName: targetSlot.name,
            marginalGain,
            rarity: targetSlot.rarity,
            rollCount: targetSlot.rollCount,
            dpsBeforeCube: targetSlot.dpsGain
        });

        // Use cube on optimal slot
        // simulateCubeOnSlot already updates slot.dpsGain
        const simSlot = slots.find(s => s.id === targetSlot.id);
        if (simSlot) {
            simulateCubeOnSlot(simSlot);
        }
    }

    return { slots, decisionLog, totalGain: 0, simulations: [] };
}

/**
 * Run complete simulation comparing all strategies
 */
export async function runCubeSimulation(
    cubeBudget: number,
    simulationCount: number,
    potentialType: 'regular' | 'bonus',
    useUserData: boolean,
    cubeSlotData: Record<string, any>
): Promise<Record<string, SimulationResult>> {
    if (!loadoutStore.getSelectedClass()) {
        throw new Error('Please select a class in the Character Setup section first.');
    }

    // Get base stats for initialization
    const baseStats = cubeSlotData.baseStats;
    if (!baseStats) {
        throw new Error('Base stats not available');
    }

    // Initialize simulation cache
    initSimulationCache(baseStats);

    // Results storage
    const results: Record<string, SimulationResult> = {
        worstFirst: { totalGains: [], simulations: [], avgGain: 0, slotDistribution: {} },
        balancedThreshold: { totalGains: [], simulations: [], avgGain: 0, slotDistribution: {} },
        hybridFastRarity: { totalGains: [], simulations: [], avgGain: 0, slotDistribution: {} },
        rarityWeightedWorstFirst: { totalGains: [], simulations: [], avgGain: 0, slotDistribution: {} },
        dpOptimal: { totalGains: [], simulations: [], avgGain: 0, slotDistribution: {} }
    };

    // Run all simulations for all strategies
    const allPromises: Promise<{ strategy: string; slots: SimulationSlotState[]; totalGain: number; decisionLog?: DecisionLogEntry[] }>[] = [];

    for (let i = 0; i < simulationCount; i++) {
        // Worst First
        allPromises.push(
            Promise.resolve({
                strategy: 'worstFirst',
                slots: runWorstFirstStrategy(cubeBudget, useUserData, potentialType, cubeSlotData),
                totalGain: 0
            }).then(result => ({
                ...result,
                totalGain: calculateTotalDPSGain(result.slots)
            }))
        );

        // Balanced Threshold
        allPromises.push(
            Promise.resolve({
                strategy: 'balancedThreshold',
                slots: runBalancedThresholdStrategy(cubeBudget, useUserData, potentialType, cubeSlotData),
                totalGain: 0
            }).then(result => ({
                ...result,
                totalGain: calculateTotalDPSGain(result.slots)
            }))
        );

        // Hybrid Fast Rarity
        allPromises.push(
            Promise.resolve({
                strategy: 'hybridFastRarity',
                slots: runHybridFastRarityStrategy(cubeBudget, useUserData, potentialType, cubeSlotData),
                totalGain: 0
            }).then(result => ({
                ...result,
                totalGain: calculateTotalDPSGain(result.slots)
            }))
        );

        // Rarity-Weighted Worst First
        allPromises.push(
            Promise.resolve({
                strategy: 'rarityWeightedWorstFirst',
                slots: runRarityWeightedWorstFirstStrategy(cubeBudget, useUserData, potentialType, cubeSlotData),
                totalGain: 0
            }).then(result => ({
                ...result,
                totalGain: calculateTotalDPSGain(result.slots)
            }))
        );

        // DP Optimal
        const dpResult = runDPOptimalStrategy(cubeBudget, useUserData, potentialType, cubeSlotData);
        allPromises.push(
            Promise.resolve({
                strategy: 'dpOptimal',
                slots: dpResult.slots,
                totalGain: calculateTotalDPSGain(dpResult.slots),
                decisionLog: dpResult.decisionLog
            })
        );
    }

    // Process all promises
    const batchSize = 50;
    const totalSimulations = allPromises.length;
    let completedSimulations = 0;

    for (let i = 0; i < totalSimulations; i += batchSize) {
        const batch = allPromises.slice(i, Math.min(i + batchSize, totalSimulations));
        const batchResults = await Promise.all(batch);

        // Distribute results to appropriate strategy
        batchResults.forEach(result => {
            const strategy = result.strategy;
            if (results[strategy]) {
                results[strategy].totalGains.push(result.totalGain);
                results[strategy].simulations.push({
                    slots: result.slots,
                    totalGain: result.totalGain,
                    decisionLog: result.decisionLog
                });
            }
        });

        completedSimulations += batch.length;
    }

    // Calculate averages for all strategies
    Object.keys(results).forEach(strategy => {
        results[strategy].avgGain = results[strategy].totalGains.reduce((a, b) => a + b, 0) / simulationCount;
    });

    return results;
}
