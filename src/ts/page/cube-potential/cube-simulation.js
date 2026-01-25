import { StatCalculationService } from "@ts/services/stat-calculation-service.js";
import { loadoutStore } from "@ts/store/loadout.store.js";
import {
  RARITY_UPGRADE_RATES,
  EQUIPMENT_POTENTIAL_DATA,
  SLOT_SPECIFIC_POTENTIALS,
  SLOT_NAMES,
  RARITIES
} from "@ts/page/cube-potential/cube-potential-data.js";
import {
  potentialStatToDamageStat,
  rankingsCache,
  rankingsInProgress
} from "@ts/page/cube-potential/cube-potential.js";
import { findOptimalSlotToCube } from "./cube-expected-value.js";
const PROGRESS_UPDATE_BATCH_SIZE = 50;
const MIN_GAIN_THRESHOLD = 0.01;
const simCache = {
  baseStats: null,
  baseDPS: null,
  lineOptionsCache: {},
  weightCache: {}
};
function initSimulationCache(baseStats) {
  simCache.baseStats = baseStats;
  simCache.baseDPS = new StatCalculationService(baseStats).computeDPS("boss");
  simCache.lineOptionsCache = {};
  simCache.weightCache = {};
  SLOT_NAMES.forEach((slotDef) => {
    const slotId = slotDef.id;
    RARITIES.forEach((rarity) => {
      const potentialData = EQUIPMENT_POTENTIAL_DATA[rarity];
      if (!potentialData) return;
      const key = `${slotId}-${rarity}`;
      const cached = {
        line1: [...potentialData.line1 || []],
        line2: [...potentialData.line2 || []],
        line3: [...potentialData.line3 || []]
      };
      const slotSpecific = SLOT_SPECIFIC_POTENTIALS[slotId]?.[rarity];
      if (slotSpecific) {
        if (slotSpecific.line1) cached.line1 = [...cached.line1, ...slotSpecific.line1];
        if (slotSpecific.line2) cached.line2 = [...cached.line2, ...slotSpecific.line2];
        if (slotSpecific.line3) cached.line3 = [...cached.line3, ...slotSpecific.line3];
      }
      simCache.lineOptionsCache[key] = cached;
      simCache.weightCache[`${key}-1`] = cached.line1.reduce((sum, opt) => sum + opt.weight, 0);
      simCache.weightCache[`${key}-2`] = cached.line2.reduce((sum, opt) => sum + opt.weight, 0);
      simCache.weightCache[`${key}-3`] = cached.line3.reduce((sum, opt) => sum + opt.weight, 0);
    });
  });
}
function getInitialSlotState(useUserData, potentialType, cubeSlotData) {
  if (useUserData) {
    return SLOT_NAMES.map((slotDef) => {
      const slotData = cubeSlotData[slotDef.id][potentialType];
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
        lines,
        dpsGain: calculateExistingSlotDPSGain(slotDef.id, slotData)
      };
    });
  } else {
    return SLOT_NAMES.map((slotDef) => ({
      id: slotDef.id,
      name: slotDef.name,
      rarity: "normal",
      rollCount: 0,
      lines: [null, null, null],
      dpsGain: 0
    }));
  }
}
function calculateExistingSlotDPSGain(slotId, slotData) {
  if (!simCache.baseStats || simCache.baseDPS === null) {
    throw new Error("Simulation cache not initialized");
  }
  const slotService = new StatCalculationService(simCache.baseStats);
  let accumulatedMainStatPct = 0;
  const lines = [
    slotData.setA.line1,
    slotData.setA.line2,
    slotData.setA.line3
  ];
  lines.forEach((line) => {
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
  const slotDPS = slotService.computeDPS("boss");
  return (slotDPS - simCache.baseDPS) / simCache.baseDPS * 100;
}
function simulateCubeOnSlot(slot) {
  if (!simCache.baseStats || simCache.baseDPS === null) {
    throw new Error("Simulation cache not initialized");
  }
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
  const key = `${slot.id}-${slot.rarity}`;
  const lineOptions = simCache.lineOptionsCache[key];
  if (!lineOptions) return;
  slot.lines = [
    rollPotentialLineCached(lineOptions.line1, simCache.weightCache[`${key}-1`]),
    rollPotentialLineCached(lineOptions.line2, simCache.weightCache[`${key}-2`]),
    rollPotentialLineCached(lineOptions.line3, simCache.weightCache[`${key}-3`])
  ];
  slot.dpsGain = calculateSlotDPSGainCached(slot);
}
function rollPotentialLineCached(options, totalWeight) {
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
function calculateSlotDPSGainCached(slot) {
  if (!simCache.baseStats || simCache.baseDPS === null) {
    throw new Error("Simulation cache not initialized");
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
  const slotDPS = slotService.computeDPS("boss");
  return (slotDPS - simCache.baseDPS) / simCache.baseDPS * 100;
}
function calculateTotalDPSGain(slots) {
  if (!simCache.baseStats || simCache.baseDPS === null) {
    throw new Error("Simulation cache not initialized");
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
  const totalDPS = totalService.computeDPS("boss");
  return (totalDPS - simCache.baseDPS) / simCache.baseDPS * 100;
}
async function calculateRankingsForRarity(rarity, slotId) {
  const key = `${slotId}-${rarity}`;
  try {
    if (!rankingsCache[slotId]) {
      rankingsCache[slotId] = {};
    }
    if (rankingsCache[slotId][rarity]) {
      return;
    }
    if (rankingsInProgress[key]) {
      return;
    }
    rankingsInProgress[key] = true;
    if (!loadoutStore.getSelectedClass()) {
      delete rankingsInProgress[key];
      return;
    }
    const progressBar = document.getElementById("cube-rankings-progress");
    const progressFill = document.getElementById("cube-rankings-progress-fill");
    const progressText = document.getElementById("cube-rankings-progress-text");
    if (progressBar) progressBar.style.display = "block";
    if (progressFill) progressFill.style.width = "0%";
    if (progressText) progressText.textContent = "Calculating... 0%";
    const potentialData = EQUIPMENT_POTENTIAL_DATA[rarity];
    if (!potentialData) {
      if (progressBar) progressBar.style.display = "none";
      delete rankingsInProgress[key];
      return;
    }
    let line1Options = [...potentialData.line1 || []];
    let line2Options = [...potentialData.line2 || []];
    let line3Options = [...potentialData.line3 || []];
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
    const rankings = [];
    const baseStats = loadoutStore.getBaseStats();
    const baseService = new StatCalculationService(baseStats);
    const baseDPS = baseService.computeDPS("boss");
    const comboService = new StatCalculationService(baseStats);
    let processedCount = 0;
    for (let i = 0; i < line1Options.length; i++) {
      for (let j = 0; j < line2Options.length; j++) {
        for (let k = 0; k < line3Options.length; k++) {
          const combo = {
            line1: line1Options[i],
            line2: line2Options[j],
            line3: line3Options[k]
          };
          comboService.reset();
          let accumulatedMainStatPct = 0;
          [combo.line1, combo.line2, combo.line3].forEach((line) => {
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
          const comboDPS = comboService.computeDPS("boss");
          const gain = (comboDPS - baseDPS) / baseDPS * 100;
          rankings.push({
            line1: combo.line1,
            line2: combo.line2,
            line3: combo.line3,
            dpsGain: gain
          });
          processedCount++;
          if (processedCount % PROGRESS_UPDATE_BATCH_SIZE === 0) {
            const progress = processedCount / totalCombinations * 100;
            if (progressFill) progressFill.style.width = `${progress}%`;
            if (progressText) progressText.textContent = `Calculating... ${Math.round(progress)}%`;
            await new Promise((resolve) => setTimeout(resolve, 0));
          }
        }
      }
    }
    rankings.sort((a, b) => b.dpsGain - a.dpsGain);
    const seen = /* @__PURE__ */ new Set();
    const deduplicatedRankings = [];
    for (const combo of rankings) {
      const signature = [combo.line1, combo.line2, combo.line3].map((line) => `${line.stat}|${line.value}|${line.prime}`).sort().join("||");
      if (!seen.has(signature)) {
        seen.add(signature);
        deduplicatedRankings.push(combo);
      }
    }
    const filteredRankings = deduplicatedRankings.filter((combo) => combo.dpsGain > MIN_GAIN_THRESHOLD);
    rankingsCache[slotId][rarity] = filteredRankings;
    if (progressBar) {
      progressBar.style.display = "none";
    }
  } catch (error) {
    console.error(`[${key}] Error calculating rankings:`, error);
    const progressBar = document.getElementById("cube-rankings-progress");
    if (progressBar) {
      progressBar.style.display = "none";
    }
  } finally {
    delete rankingsInProgress[key];
  }
}
function runWorstFirstStrategy(cubeBudget, useUserData = false, potentialType = "regular", cubeSlotData = {}) {
  const slots = getInitialSlotState(useUserData, potentialType, cubeSlotData);
  for (let i = 0; i < cubeBudget; i++) {
    let worstSlot = slots[0];
    for (const slot of slots) {
      if (slot.dpsGain < worstSlot.dpsGain) {
        worstSlot = slot;
      }
    }
    simulateCubeOnSlot(worstSlot);
  }
  return slots;
}
function runBalancedThresholdStrategy(cubeBudget, useUserData = false, potentialType = "regular", cubeSlotData = {}) {
  const slots = getInitialSlotState(useUserData, potentialType, cubeSlotData);
  for (let i = 0; i < cubeBudget; i++) {
    const avgDPS = slots.reduce((sum, slot) => sum + slot.dpsGain, 0) / slots.length;
    let targetSlot = slots[0];
    let maxDeficit = avgDPS - targetSlot.dpsGain;
    for (const slot of slots) {
      const deficit = avgDPS - slot.dpsGain;
      if (deficit > maxDeficit) {
        maxDeficit = deficit;
        targetSlot = slot;
      }
    }
    simulateCubeOnSlot(targetSlot);
  }
  return slots;
}
function runRarityWeightedWorstFirstStrategy(cubeBudget, useUserData = false, potentialType = "regular", cubeSlotData = {}) {
  const slots = getInitialSlotState(useUserData, potentialType, cubeSlotData);
  slots.forEach((slot) => {
    slot.cubesAtCurrentRarity = slot.rollCount || 0;
  });
  const expectedCubesForUpgrade = {
    "normal": 1 / 0.06,
    // ~16.7 cubes
    "rare": 1 / 0.03333,
    // ~30 cubes
    "epic": 1 / 0.0167,
    // ~60 cubes
    "unique": 1 / 6e-3,
    // ~167 cubes
    "legendary": 1 / 21e-4
    // ~476 cubes
  };
  for (let i = 0; i < cubeBudget; i++) {
    let bestSlot = slots[0];
    let bestScore = Infinity;
    for (const slot of slots) {
      let score = slot.dpsGain;
      const expectedCubes = expectedCubesForUpgrade[slot.rarity];
      if (expectedCubes) {
        const upgradeProgress = (slot.cubesAtCurrentRarity || 0) / expectedCubes;
        score = score * (1 - upgradeProgress * 0.5);
      }
      if (score < bestScore) {
        bestScore = score;
        bestSlot = slot;
      }
    }
    simulateCubeOnSlot(bestSlot);
    bestSlot.cubesAtCurrentRarity = bestSlot.rollCount || 0;
  }
  return slots;
}
function runHybridFastRarityStrategy(cubeBudget, useUserData = false, potentialType = "regular", cubeSlotData = {}) {
  const slots = getInitialSlotState(useUserData, potentialType, cubeSlotData);
  let cubesUsed = 0;
  const targetRarity = "epic";
  const rarityProgression = ["rare", "epic", "unique", "legendary", "mystic"];
  for (const slot of slots) {
    while (cubesUsed < cubeBudget && slot.rarity !== targetRarity) {
      simulateCubeOnSlot(slot);
      cubesUsed++;
      const currentIndex = rarityProgression.indexOf(slot.rarity);
      const targetIndex = rarityProgression.indexOf(targetRarity);
      if (currentIndex >= targetIndex) break;
    }
    if (cubesUsed >= cubeBudget) break;
  }
  while (cubesUsed < cubeBudget) {
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
function runDPOptimalStrategy(cubeBudget, useUserData = false, potentialType = "regular", cubeSlotData = {}) {
  const slots = getInitialSlotState(useUserData, potentialType, cubeSlotData);
  const decisionLog = [];
  if (!simCache.baseStats || simCache.baseDPS === null) {
    throw new Error("Simulation cache not initialized");
  }
  const baseStats = simCache.baseStats;
  const baseDPS = simCache.baseDPS;
  for (let cubeNum = 1; cubeNum <= cubeBudget; cubeNum++) {
    const { slot: targetSlot, marginalGain } = findOptimalSlotToCube(
      slots,
      baseStats,
      baseDPS,
      30
      // Sample size for simulation speed
    );
    if (!targetSlot) break;
    decisionLog.push({
      cubeNum,
      slotId: targetSlot.id,
      slotName: targetSlot.name,
      marginalGain,
      rarity: targetSlot.rarity,
      rollCount: targetSlot.rollCount,
      dpsBeforeCube: targetSlot.dpsGain
    });
    const simSlot = slots.find((s) => s.id === targetSlot.id);
    if (simSlot) {
      simulateCubeOnSlot(simSlot);
    }
  }
  return { slots, decisionLog, totalGain: 0, simulations: [] };
}
async function runCubeSimulation(cubeBudget, simulationCount, potentialType, useUserData, cubeSlotData) {
  if (!loadoutStore.getSelectedClass()) {
    throw new Error("Please select a class in the Character Setup section first.");
  }
  const baseStats = cubeSlotData.baseStats;
  if (!baseStats) {
    throw new Error("Base stats not available");
  }
  initSimulationCache(baseStats);
  const results = {
    worstFirst: { totalGains: [], simulations: [], avgGain: 0, slotDistribution: {} },
    balancedThreshold: { totalGains: [], simulations: [], avgGain: 0, slotDistribution: {} },
    hybridFastRarity: { totalGains: [], simulations: [], avgGain: 0, slotDistribution: {} },
    rarityWeightedWorstFirst: { totalGains: [], simulations: [], avgGain: 0, slotDistribution: {} },
    dpOptimal: { totalGains: [], simulations: [], avgGain: 0, slotDistribution: {} }
  };
  const allPromises = [];
  for (let i = 0; i < simulationCount; i++) {
    allPromises.push(
      Promise.resolve({
        strategy: "worstFirst",
        slots: runWorstFirstStrategy(cubeBudget, useUserData, potentialType, cubeSlotData),
        totalGain: 0
      }).then((result) => ({
        ...result,
        totalGain: calculateTotalDPSGain(result.slots)
      }))
    );
    allPromises.push(
      Promise.resolve({
        strategy: "balancedThreshold",
        slots: runBalancedThresholdStrategy(cubeBudget, useUserData, potentialType, cubeSlotData),
        totalGain: 0
      }).then((result) => ({
        ...result,
        totalGain: calculateTotalDPSGain(result.slots)
      }))
    );
    allPromises.push(
      Promise.resolve({
        strategy: "hybridFastRarity",
        slots: runHybridFastRarityStrategy(cubeBudget, useUserData, potentialType, cubeSlotData),
        totalGain: 0
      }).then((result) => ({
        ...result,
        totalGain: calculateTotalDPSGain(result.slots)
      }))
    );
    allPromises.push(
      Promise.resolve({
        strategy: "rarityWeightedWorstFirst",
        slots: runRarityWeightedWorstFirstStrategy(cubeBudget, useUserData, potentialType, cubeSlotData),
        totalGain: 0
      }).then((result) => ({
        ...result,
        totalGain: calculateTotalDPSGain(result.slots)
      }))
    );
    const dpResult = runDPOptimalStrategy(cubeBudget, useUserData, potentialType, cubeSlotData);
    allPromises.push(
      Promise.resolve({
        strategy: "dpOptimal",
        slots: dpResult.slots,
        totalGain: calculateTotalDPSGain(dpResult.slots),
        decisionLog: dpResult.decisionLog
      })
    );
  }
  const batchSize = 50;
  const totalSimulations = allPromises.length;
  let completedSimulations = 0;
  for (let i = 0; i < totalSimulations; i += batchSize) {
    const batch = allPromises.slice(i, Math.min(i + batchSize, totalSimulations));
    const batchResults = await Promise.all(batch);
    batchResults.forEach((result) => {
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
  Object.keys(results).forEach((strategy) => {
    results[strategy].avgGain = results[strategy].totalGains.reduce((a, b) => a + b, 0) / simulationCount;
  });
  return results;
}
export {
  calculateRankingsForRarity,
  calculateSlotDPSGainCached,
  calculateTotalDPSGain,
  initSimulationCache,
  rollPotentialLineCached,
  runBalancedThresholdStrategy,
  runCubeSimulation,
  runDPOptimalStrategy,
  runHybridFastRarityStrategy,
  runRarityWeightedWorstFirstStrategy,
  runWorstFirstStrategy,
  simulateCubeOnSlot
};
//# sourceMappingURL=cube-simulation.js.map
