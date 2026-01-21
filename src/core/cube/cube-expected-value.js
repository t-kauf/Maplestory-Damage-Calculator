import { RARITY_UPGRADE_RATES, equipmentPotentialData, slotSpecificPotentials } from './cube-potential-data.js';
import { StatCalculationService } from '@core/services/stat-calculation-service.js';
import { potentialStatToDamageStat } from './cube-logic.js';
import { getStats } from '@core/state/state.js';

// Cache for expected DPS values by slot+rarity
const expectedDPSCache = {};

/**
 * Calculate expected MARGINAL DPS gain from using one cube on a slot.
 * Uses Monte Carlo sampling with actual DPS calculations.
 *
 * @param {string} slotId - Equipment slot ID
 * @param {string} currentRarity - Current rarity of the slot
 * @param {number} currentRollCount - Rolls at current rarity (for pity)
 * @param {number} currentSlotDPSGain - Current DPS% this slot provides
 * @param {object} baseStats - Base character stats
 * @param {number} baseDPS - Base DPS without any potential bonuses
 * @param {number} sampleSize - Monte Carlo samples (default 100)
 */
export function calculateExpectedMarginalGain(
    slotId,
    currentRarity,
    currentRollCount,
    currentSlotDPSGain,
    baseStats,
    baseDPS,
    sampleSize = 100
) {
    const upgradeData = RARITY_UPGRADE_RATES[currentRarity];

    // Calculate tier-up probability
    let tierUpProb = 0;
    if (upgradeData) {
        tierUpProb = (currentRollCount + 1 >= upgradeData.max) ? 1 : upgradeData.rate;
    }

    // Sample outcomes and compute average DPS gain
    let totalSampledGain = 0;

    for (let i = 0; i < sampleSize; i++) {
        // Determine rarity for this sample
        const didTierUp = Math.random() < tierUpProb;
        const rollRarity = (didTierUp && upgradeData?.next) ? upgradeData.next : currentRarity;

        // Roll lines at this rarity
        const lines = samplePotentialLines(slotId, rollRarity);

        // Calculate DPS gain from these lines using actual stat calculations
        const dpsGain = calculateActualDPSGain(lines, baseStats, baseDPS);

        totalSampledGain += dpsGain;
    }

    const expectedDPSAfterCube = totalSampledGain / sampleSize;

    // Marginal gain = expected outcome - what we currently have
    // This is the key fix: we're comparing expected NEW state vs CURRENT state
    const marginalGain = expectedDPSAfterCube - currentSlotDPSGain;

    return {
        expectedDPSAfterCube,
        marginalGain,
        tierUpProb,
        currentSlotDPSGain
    };
}

/**
 * Sample a random set of 3 potential lines for a slot at given rarity
 */
function samplePotentialLines(slotId, rarity) {
    const potentialData = equipmentPotentialData[rarity];
    if (!potentialData) return [null, null, null];

    // Get line options with slot-specific additions
    let line1Options = [...(potentialData.line1 || [])];
    let line2Options = [...(potentialData.line2 || [])];
    let line3Options = [...(potentialData.line3 || [])];

    if (slotSpecificPotentials[slotId]?.[rarity]) {
        const specific = slotSpecificPotentials[slotId][rarity];
        if (specific.line1) line1Options = [...line1Options, ...specific.line1];
        if (specific.line2) line2Options = [...line2Options, ...specific.line2];
        if (specific.line3) line3Options = [...line3Options, ...specific.line3];
    }

    return [
        rollWeightedLine(line1Options),
        rollWeightedLine(line2Options),
        rollWeightedLine(line3Options)
    ];
}

/**
 * Roll a single line based on weights
 */
function rollWeightedLine(options) {
    if (!options || options.length === 0) return null;

    const totalWeight = options.reduce((sum, opt) => sum + opt.weight, 0);
    let random = Math.random() * totalWeight;

    for (const option of options) {
        random -= option.weight;
        if (random <= 0) return option;
    }

    return options[options.length - 1];
}

/**
 * Calculate actual DPS gain from a set of potential lines
 * Uses StatCalculationService for accurate calculations
 */
function calculateActualDPSGain(lines, baseStats, baseDPS) {
    const slotService = new StatCalculationService(baseStats);
    let accumulatedMainStatPct = 0;

    for (const line of lines) {
        if (!line || !line.stat) continue;

        const mapped = potentialStatToDamageStat(line.stat, line.value, accumulatedMainStatPct);
        if (mapped.stat) {
            if (mapped.isMainStatPct) {
                slotService.addPercentageStat('statDamage', mapped.value);
                accumulatedMainStatPct += line.value;
            } else {
                slotService.addPercentageStat(mapped.stat, mapped.value);
            }
        }
    }

    const slotDPS = slotService.computeDPS('boss');
    return ((slotDPS - baseDPS) / baseDPS * 100);
}

/**
 * Sample expected DPS gain for a slot at given rarity
 * Takes average of multiple samples
 */
export function sampleExpectedDPSGain(slotId, rarity, baseStats, baseDPS, samples = 20) {
    let total = 0;
    for (let i = 0; i < samples; i++) {
        const lines = samplePotentialLines(slotId, rarity);
        total += calculateActualDPSGain(lines, baseStats, baseDPS);
    }
    return total / samples;
}

/**
 * Get cached expected DPS value for a slot+rarity combination
 */
function getCachedExpectedDPS(slotId, rarity, baseStats, baseDPS) {
    const key = `${slotId}-${rarity}`;
    if (!expectedDPSCache[key]) {
        expectedDPSCache[key] = sampleExpectedDPSGain(slotId, rarity, baseStats, baseDPS, 200);
    }
    return expectedDPSCache[key];
}

/**
 * Clear the expected DPS cache
 * Call this when stats change significantly
 */
export function clearExpectedDPSCache() {
    Object.keys(expectedDPSCache).forEach(k => delete expectedDPSCache[k]);
}

/**
 * Find the optimal slot to cube given current states
 * Uses Monte Carlo expected value to find highest marginal gain
 *
 * @param {Array} slots - Array of slot objects with id, rarity, rollCount, dpsGain
 * @param {object} baseStats - Base character stats
 * @param {number} baseDPS - Base DPS without potential bonuses
 * @param {number} sampleSize - Monte Carlo sample size (default 50)
 */
export function findOptimalSlotToCube(slots, baseStats, baseDPS, sampleSize = 50) {
    let bestSlot = null;
    let bestMarginalGain = -Infinity;

    for (const slot of slots) {
        const ev = calculateExpectedMarginalGain(
            slot.id,
            slot.rarity,
            slot.rollCount || 0,
            slot.dpsGain || 0,
            baseStats,
            baseDPS,
            sampleSize
        );

        // The key insight: we compare marginal gains across slots
        // A slot at 0% DPS with expected 2% gain beats a slot at 5% with expected 5.3% gain
        // because marginalGain = 2 - 0 = 2 vs 5.3 - 5 = 0.3
        if (ev.marginalGain > bestMarginalGain) {
            bestMarginalGain = ev.marginalGain;
            bestSlot = slot;
        }
    }

    return {
        slot: bestSlot,
        marginalGain: bestMarginalGain
    };
}
