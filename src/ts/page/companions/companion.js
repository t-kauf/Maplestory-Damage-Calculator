import { StatCalculationService } from "@ts/services/stat-calculation-service.js";
import { COMPANION_STAT_KEY_TO_STAT_ID } from "@ts/types/page/companions/companions.types.js";
import { loadoutStore } from "@ts/store/loadout.store.js";
function applyEffectsToService(service, effects, isRemoving = false) {
  if (!effects) return service;
  const statTypes = {
    // Flat attack - applies weapon attack bonus
    attack: (value) => isRemoving ? service.subtract("attack", Math.abs(value)) : service.add("attack", value),
    // Flat main stat - converts to stat damage (100 main stat = 1% stat damage)
    mainStat: (value) => service.add("mainStat", isRemoving ? -Math.abs(value) : value),
    // Main stat % with diminishing returns
    statDamage: (value) => service.add("mainStatPct", isRemoving ? -Math.abs(value) : value),
    // Multiplicative stat (Final Damage) - for removal, we use subtract
    finalDamage: (value) => {
      if (isRemoving) {
        service.subtract("finalDamage", value);
      } else {
        service.add("finalDamage", value);
      }
    },
    // Diminishing returns stats - for removal, use subtract
    attackSpeed: (value) => {
      if (isRemoving) {
        service.subtract("attackSpeed", value);
      } else {
        service.add("attackSpeed", value);
      }
    },
    defPenMultiplier: (value) => {
      if (isRemoving) {
        service.subtract("defPenMultiplier", value);
      } else {
        service.add("defPenMultiplier", value);
      }
    }
  };
  Object.entries(effects).forEach(([statKey, value]) => {
    if (value === 0 || value === void 0 || value === null) return;
    if (statTypes[statKey]) {
      statTypes[statKey](value);
    } else {
      const adjustedValue = isRemoving ? -Math.abs(value) : value;
      service.add(statKey, adjustedValue);
    }
  });
  return service;
}
function calculateDpsDifference(currentEffects, newEffects, monsterType = "boss") {
  const baseStats = loadoutStore.getBaseStats();
  const baselineService = new StatCalculationService(baseStats, null);
  applyEffectsToService(baselineService, currentEffects, true);
  const baselineDps = baselineService.computeDPS(monsterType);
  const currentService = new StatCalculationService(baseStats, null);
  const currentPresetDps = currentService.computeDPS(monsterType);
  const newService = new StatCalculationService(baseStats, null);
  applyEffectsToService(newService, currentEffects, true);
  applyEffectsToService(newService, newEffects, false);
  const newPresetDps = newService.computeDPS(monsterType);
  const currentPresetGain = currentPresetDps - baselineDps;
  const newPresetGain = newPresetDps - baselineDps;
  const dpsGain = baselineDps > 0 ? (newPresetGain - currentPresetGain) / baselineDps * 100 : 0;
  return {
    baselineDps,
    currentPresetDps,
    newPresetDps,
    currentPresetGain,
    newPresetGain,
    dpsGain
  };
}
function calculateBothDpsDifferences(currentEffects, newEffects) {
  const bossResults = calculateDpsDifference(currentEffects, newEffects, "boss");
  const normalResults = calculateDpsDifference(currentEffects, newEffects, "normal");
  return {
    boss: bossResults,
    normal: normalResults
  };
}
function presetHasAnyCompanion(preset) {
  if (!preset) return false;
  if (preset.main) return true;
  if (preset.subs && preset.subs.some((sub) => sub)) return true;
  return false;
}
function calculatePresetStatValue(preset, targetStat, getCompanionEffects, getCompanion) {
  if (!preset) return 0;
  let total = 0;
  const allSlots = [preset.main, ...preset.subs];
  allSlots.forEach((companionKey) => {
    if (!companionKey) return;
    const [className, rarity] = companionKey.split("-");
    const companionData = getCompanion(companionKey);
    if (!companionData.unlocked) return;
    const level = companionData.level || 1;
    const effects = getCompanionEffects(className, rarity, level);
    if (effects && effects.equipEffect && effects.equipEffect[targetStat]) {
      total += effects.equipEffect[targetStat];
    }
  });
  return total;
}
function generateOptimalPreset(targetStat, getCompanionEffects, getCompanion, getMaxCompanionLevel, lockedMainCompanion = null) {
  const classes = ["Hero", "ArchMageIL", "ArchMageFP", "BowMaster", "NightLord", "Shadower"];
  const rarities = ["Legendary", "Unique", "Epic"];
  const monsterType = targetStat === "bossDamage" ? "boss" : "normal";
  const unlockedCompanions = [];
  rarities.forEach((rarity) => {
    classes.forEach((className) => {
      const companionKey = `${className}-${rarity}`;
      const companionData = getCompanion(companionKey);
      if (!companionData.unlocked) return;
      const level = companionData.level || getMaxCompanionLevel();
      const effects = getCompanionEffects(className, rarity, level);
      if (!effects || !effects.equipEffect) return;
      unlockedCompanions.push({
        companionKey,
        effects: effects.equipEffect
      });
    });
  });
  if (unlockedCompanions.length === 0) {
    return { main: null, subs: [null, null, null, null, null, null] };
  }
  let lockedMain = null;
  if (lockedMainCompanion) {
    const lockedMainData = unlockedCompanions.find((c) => c.companionKey === lockedMainCompanion);
    if (!lockedMainData) {
      console.warn(`[generateOptimalPreset] Locked main companion ${lockedMainCompanion} not found or not unlocked`);
      return { main: null, subs: [null, null, null, null, null, null] };
    }
    lockedMain = lockedMainData;
    const lockedIndex = unlockedCompanions.indexOf(lockedMainData);
    unlockedCompanions.splice(lockedIndex, 1);
  }
  const minRequired = lockedMain ? 6 : 7;
  if (unlockedCompanions.length < minRequired) {
    console.warn(`[generateOptimalPreset] Only ${unlockedCompanions.length} companions available, filling all available slots`);
    const allKeys = unlockedCompanions.map((c) => c.companionKey);
    if (lockedMain) {
      return {
        main: lockedMain.companionKey,
        subs: [
          allKeys[0] || null,
          allKeys[1] || null,
          allKeys[2] || null,
          allKeys[3] || null,
          allKeys[4] || null,
          allKeys[5] || null
        ]
      };
    } else {
      return {
        main: allKeys[0] || null,
        subs: [
          allKeys[1] || null,
          allKeys[2] || null,
          allKeys[3] || null,
          allKeys[4] || null,
          allKeys[5] || null,
          allKeys[6] || null
        ]
      };
    }
  }
  const baseStats = loadoutStore.getBaseStats();
  const baselineService = new StatCalculationService(baseStats, null);
  const baselineDps = baselineService.computeDPS(monsterType);
  function* generateCombinations(companions, size, start = 0) {
    if (size === 0) {
      yield [];
      return;
    }
    for (let i = start; i < companions.length; i++) {
      for (const rest of generateCombinations(companions, size - 1, i + 1)) {
        yield [companions[i], ...rest];
      }
    }
  }
  const scoredCompanions = unlockedCompanions.map((comp) => {
    const service2 = new StatCalculationService(baseStats, null);
    applyEffectsToService(service2, comp.effects, false);
    const dps = service2.computeDPS(monsterType);
    const gain = dps - baselineDps;
    return {
      companion: comp,
      individualDps: dps,
      dpsGain: gain
    };
  });
  scoredCompanions.sort((a, b) => b.dpsGain - a.dpsGain);
  const locked = [];
  const pool = [...scoredCompanions];
  let prevGain = Infinity;
  const MIN_LOCKED = 2;
  const MAX_LOCKED = 4;
  const MARGINAL_GAIN_THRESHOLD = 0.6;
  const MIN_GAIN_PERCENT = 8e-3;
  for (let i = 0; i < scoredCompanions.length && locked.length < MAX_LOCKED; i++) {
    const score = scoredCompanions[i];
    const gainPercent = score.dpsGain / baselineDps;
    const shouldLock = locked.length < MIN_LOCKED || // Always lock at least 2
    score.dpsGain > prevGain * MARGINAL_GAIN_THRESHOLD || // High marginal value
    gainPercent > MIN_GAIN_PERCENT;
    if (shouldLock) {
      locked.push(score);
      pool.splice(pool.indexOf(score), 1);
      prevGain = score.dpsGain;
    }
  }
  const selectedKeys = /* @__PURE__ */ new Set();
  if (lockedMain) {
    selectedKeys.add(lockedMain.companionKey);
  }
  locked.forEach((s) => selectedKeys.add(s.companion.companionKey));
  const POOL_SIZE = Math.min(15, unlockedCompanions.length);
  const candidates = locked.concat(pool.slice(0, Math.min(POOL_SIZE - locked.length, pool.length)));
  const totalSlots = lockedMain ? 6 : 7;
  const numToSelect = totalSlots - locked.length;
  const remaining = candidates.slice(locked.length).map((s) => s.companion).filter((comp) => !selectedKeys.has(comp.companionKey));
  let bestDps = 0;
  let bestPreset = { main: null, subs: [null, null, null, null, null, null] };
  const service = new StatCalculationService(baseStats, null);
  let combinationsTested = 0;
  const maxCombinations = 15e3;
  const calculateDpsForCombination = (companions) => {
    const totalEffects = {};
    companions.forEach((comp) => {
      Object.entries(comp.effects).forEach(([stat, value]) => {
        totalEffects[stat] = (totalEffects[stat] || 0) + value;
      });
    });
    service.reset();
    applyEffectsToService(service, totalEffects, false);
    return service.computeDPS(monsterType);
  };
  for (const combination of generateCombinations(remaining, numToSelect)) {
    combinationsTested++;
    if (combinationsTested > maxCombinations) {
      console.warn(`[Phase 3] Reached max combinations limit (${maxCombinations}), using best found so far`);
      break;
    }
    let fullSelection;
    if (lockedMain) {
      fullSelection = [lockedMain, ...locked.map((s) => s.companion), ...combination];
    } else {
      fullSelection = locked.map((s) => s.companion).concat(combination);
    }
    const dps = calculateDpsForCombination(fullSelection);
    if (dps > bestDps) {
      bestDps = dps;
      if (lockedMain) {
        bestPreset = {
          main: lockedMain.companionKey,
          subs: fullSelection.slice(1).map((c) => c.companionKey)
        };
      } else {
        bestPreset = {
          main: fullSelection[0].companionKey,
          subs: fullSelection.slice(1).map((c) => c.companionKey)
        };
      }
    }
  }
  const totalGainPercent = (bestDps - baselineDps) / baselineDps * 100;
  return bestPreset;
}
function swapCompanionPresetEffects(currentEffects, newEffects) {
  const baseStats = loadoutStore.getBaseStats();
  const service = new StatCalculationService(baseStats, null);
  Object.entries(currentEffects).forEach(([statKey, value]) => {
    if (value === 0 || value === void 0 || value === null) return;
    const mappedId = COMPANION_STAT_KEY_TO_STAT_ID[statKey];
    if (!mappedId) {
      console.warn(`[swapCompanionPresetEffects] Unknown companion stat key: ${statKey}, skipping removal`);
      return;
    }
    service.subtract(mappedId, value);
  });
  Object.entries(newEffects).forEach(([statKey, value]) => {
    if (value === 0 || value === void 0 || value === null) return;
    const mappedId = COMPANION_STAT_KEY_TO_STAT_ID[statKey];
    if (!mappedId) {
      console.warn(`[swapCompanionPresetEffects] Unknown companion stat key: ${statKey}, skipping addition`);
      return;
    }
    service.add(mappedId, value);
  });
  return service.getStats();
}
export {
  calculateBothDpsDifferences,
  calculateDpsDifference,
  calculatePresetStatValue,
  generateOptimalPreset,
  presetHasAnyCompanion,
  swapCompanionPresetEffects
};
//# sourceMappingURL=companion.js.map
