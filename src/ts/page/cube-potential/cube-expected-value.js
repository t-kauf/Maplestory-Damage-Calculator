import { StatCalculationService } from "@ts/services/stat-calculation-service.js";
import {
  RARITY_UPGRADE_RATES,
  EQUIPMENT_POTENTIAL_DATA,
  SLOT_SPECIFIC_POTENTIALS
} from "@ts/page/cube-potential/cube-potential-data.js";
import { potentialStatToDamageStat } from "@ts/page/cube-potential/cube-potential.js";
const expectedDPSCache = {};
function calculateExpectedMarginalGain(slotId, currentRarity, currentRollCount, currentSlotDPSGain, baseStats, baseDPS, sampleSize = 100) {
  const upgradeData = RARITY_UPGRADE_RATES[currentRarity];
  let tierUpProb = 0;
  if (upgradeData) {
    tierUpProb = currentRollCount + 1 >= upgradeData.max ? 1 : upgradeData.rate;
  }
  let totalSampledGain = 0;
  for (let i = 0; i < sampleSize; i++) {
    const didTierUp = Math.random() < tierUpProb;
    const rollRarity = didTierUp && upgradeData?.next ? upgradeData.next : currentRarity;
    const lines = samplePotentialLines(slotId, rollRarity);
    const dpsGain = calculateActualDPSGain(lines, baseStats, baseDPS);
    totalSampledGain += dpsGain;
  }
  const expectedDPSAfterCube = totalSampledGain / sampleSize;
  const marginalGain = expectedDPSAfterCube - currentSlotDPSGain;
  return {
    expectedDPSAfterCube,
    marginalGain,
    tierUpProb,
    currentSlotDPSGain
  };
}
function samplePotentialLines(slotId, rarity) {
  const potentialData = EQUIPMENT_POTENTIAL_DATA[rarity];
  if (!potentialData) return [null, null, null];
  let line1Options = [...potentialData.line1 || []];
  let line2Options = [...potentialData.line2 || []];
  let line3Options = [...potentialData.line3 || []];
  const slotSpecific = SLOT_SPECIFIC_POTENTIALS[slotId]?.[rarity];
  if (slotSpecific) {
    if (slotSpecific.line1) line1Options = [...line1Options, ...slotSpecific.line1];
    if (slotSpecific.line2) line2Options = [...line2Options, ...slotSpecific.line2];
    if (slotSpecific.line3) line3Options = [...line3Options, ...slotSpecific.line3];
  }
  return [
    rollWeightedLine(line1Options),
    rollWeightedLine(line2Options),
    rollWeightedLine(line3Options)
  ];
}
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
function calculateActualDPSGain(lines, baseStats, baseDPS) {
  const slotService = new StatCalculationService(baseStats);
  let accumulatedMainStatPct = 0;
  for (const line of lines) {
    if (!line || !line.stat) continue;
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
  const slotDPS = slotService.computeDPS("boss");
  return (slotDPS - baseDPS) / baseDPS * 100;
}
function sampleExpectedDPSGain(slotId, rarity, baseStats, baseDPS, samples = 20) {
  let total = 0;
  for (let i = 0; i < samples; i++) {
    const lines = samplePotentialLines(slotId, rarity);
    total += calculateActualDPSGain(lines, baseStats, baseDPS);
  }
  return total / samples;
}
function getCachedExpectedDPS(slotId, rarity, baseStats, baseDPS) {
  const key = `${slotId}-${rarity}`;
  if (!expectedDPSCache[key]) {
    expectedDPSCache[key] = sampleExpectedDPSGain(slotId, rarity, baseStats, baseDPS, 200);
  }
  return expectedDPSCache[key];
}
function clearExpectedDPSCache() {
  Object.keys(expectedDPSCache).forEach((k) => delete expectedDPSCache[k]);
}
function findOptimalSlotToCube(slots, baseStats, baseDPS, sampleSize = 50) {
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
export {
  calculateExpectedMarginalGain,
  clearExpectedDPSCache,
  findOptimalSlotToCube,
  sampleExpectedDPSGain
};
//# sourceMappingURL=cube-expected-value.js.map
