import { StatCalculationService } from "@ts/services/stat-calculation-service.js";
import { loadoutStore } from "@ts/store/loadout.store.js";
import { STAT } from "@ts/types/constants.js";
const SCROLLS_L65 = {
  "L65_70": { name: "70% Level 65", baseSuccess: 0.7, cost: 250, attack: 100, damageAmp: 0 },
  "L65_30": { name: "30% Level 65", baseSuccess: 0.3, cost: 300, attack: 200, damageAmp: 0.1 }
};
const SCROLLS_L85 = {
  "L85_70": { name: "70% Level 85", baseSuccess: 0.7, cost: 500, attack: 200, damageAmp: 0.2 },
  "L85_30": { name: "30% Level 85", baseSuccess: 0.3, cost: 650, attack: 400, damageAmp: 0.4 },
  "L85_15": { name: "15% Level 85", baseSuccess: 0.15, cost: 800, attack: 800, damageAmp: 0.8 }
};
const BONUS_AT_SLOT_5 = 0.1;
const BONUS_AT_SLOT_10 = 0.2;
const RESET_COST = 50;
const NUM_SLOTS = 10;
function getScrollsForLevel(level) {
  return level === "65" ? SCROLLS_L65 : SCROLLS_L85;
}
function getScrollSuccessRate(scroll, slotNumber, enhancementBonus) {
  let rate = scroll.baseSuccess + enhancementBonus.total;
  if (slotNumber === 5) rate += BONUS_AT_SLOT_5;
  if (slotNumber === 10) rate += BONUS_AT_SLOT_10;
  return Math.min(rate, 1);
}
function attemptScrollRun(strategy, budget, traceUsed, scrolls, enhancementBonus) {
  let totalAttack = 0;
  let totalDamageAmp = 0;
  let successfulSlots = 0;
  let failedSlots = 0;
  let attemptCost = 0;
  const slotResults = [];
  let earlyReset = false;
  for (let slot = 1; slot <= NUM_SLOTS; slot++) {
    const scrollType = strategy.selectScroll(slot, successfulSlots, failedSlots, traceUsed + attemptCost, budget);
    const scroll = scrolls[scrollType];
    if (traceUsed + attemptCost + scroll.cost > budget) {
      for (let s = slot; s <= NUM_SLOTS; s++) {
        slotResults.push({ slot: s, success: false, unfunded: true, attack: 0, damageAmp: 0, successRate: 0 });
      }
      break;
    }
    attemptCost += scroll.cost;
    const successRate = getScrollSuccessRate(scroll, slot, enhancementBonus);
    const success = Math.random() < successRate;
    slotResults.push({
      slot,
      scrollType,
      success,
      attack: success ? scroll.attack : 0,
      damageAmp: success ? scroll.damageAmp : 0,
      successRate: successRate * 100,
      unfunded: false
    });
    if (success) {
      totalAttack += scroll.attack;
      totalDamageAmp += scroll.damageAmp;
      successfulSlots++;
    } else {
      failedSlots++;
    }
    if (strategy.shouldResetEarly) {
      const shouldResetEarly = strategy.shouldResetEarly(slotResults, slot, successfulSlots, failedSlots);
      if (shouldResetEarly) {
        earlyReset = true;
        for (let s = slot + 1; s <= NUM_SLOTS; s++) {
          slotResults.push({ slot: s, success: false, unfunded: true, attack: 0, damageAmp: 0, successRate: 0 });
        }
        break;
      }
    }
  }
  return {
    totalAttack,
    totalDamageAmp,
    successfulSlots,
    failedSlots,
    attemptCost,
    slotResults,
    earlyReset
  };
}
function simulateScrollWithResets(strategy, budget, scrolls, enhancementBonus) {
  let traceUsed = 0;
  let resetCount = 0;
  let finalResult = null;
  let attemptCount = 0;
  while (traceUsed < budget) {
    attemptCount++;
    const result = attemptScrollRun(strategy, budget, traceUsed, scrolls, enhancementBonus);
    if (traceUsed + result.attemptCost > budget) {
      if (finalResult) {
        return { ...finalResult, resetCount, attemptCount };
      } else {
        return {
          totalAttack: 0,
          totalDamageAmp: 0,
          successfulSlots: 0,
          failedSlots: NUM_SLOTS,
          attemptCost: 0,
          traceUsed: 0,
          resetCount: 0,
          attemptCount: 0,
          slotResults: [],
          earlyReset: false
        };
      }
    }
    traceUsed += result.attemptCost;
    finalResult = { ...result, traceUsed };
    let shouldReset = false;
    if (result.earlyReset) {
      shouldReset = true;
    } else {
      shouldReset = strategy.shouldReset(result, traceUsed, budget);
    }
    if (!shouldReset) {
      break;
    }
    if (traceUsed + RESET_COST <= budget) {
      traceUsed += RESET_COST;
      resetCount++;
    } else {
      break;
    }
  }
  return { ...finalResult, resetCount, attemptCount };
}
function createL65Strategies() {
  const strategies = [];
  strategies.push({
    id: "L65_slot1_30_lock",
    name: "Secure Slot 1 (30%)",
    description: "Reset until 30% succeeds on slot 1. Then 30% on slots 5&10, 70% on others. Low budget efficient.",
    selectScroll: (slot) => {
      if (slot === 1) return "L65_30";
      if (slot === 5 || slot === 10) return "L65_30";
      return "L65_70";
    },
    shouldResetEarly: (slotResults, currentSlot) => {
      if (currentSlot === 1 && slotResults.length >= 1) {
        const slot1 = slotResults[0];
        if (!slot1.success && !slot1.unfunded) {
          return true;
        }
      }
      return false;
    },
    shouldReset: () => false
  });
  strategies.push({
    id: "L65_70_bonus_30",
    name: "70% Base + Bonus 30%",
    description: "70% L65 on all slots except 5&10, which use 30% (42% and 52% success rates). No early resets.",
    selectScroll: (slot) => {
      if (slot === 5 || slot === 10) return "L65_30";
      return "L65_70";
    },
    shouldReset: () => false
  });
  strategies.push({
    id: "L65_slot10_30_lock",
    name: "Secure Slot 10 (30%)",
    description: "Reset until 30% succeeds on slot 10 (52% with +20% bonus). Then 30% on slots 1&5, 70% on others.",
    selectScroll: (slot) => {
      if (slot === 10) return "L65_30";
      if (slot === 1 || slot === 5) return "L65_30";
      return "L65_70";
    },
    shouldResetEarly: (slotResults, currentSlot) => {
      if (currentSlot === 10 && slotResults.length >= 10) {
        const slot10 = slotResults[9];
        if (!slot10.success && !slot10.unfunded) {
          return true;
        }
      }
      return false;
    },
    shouldReset: () => false
  });
  strategies.push({
    id: "L65_slot5_30_lock",
    name: "Secure Slot 5 (30%)",
    description: "Reset until 30% succeeds on slot 5 (42% with +10% bonus). Then 30% on slots 1&10, 70% on others.",
    selectScroll: (slot) => {
      if (slot === 5) return "L65_30";
      if (slot === 1 || slot === 10) return "L65_30";
      return "L65_70";
    },
    shouldResetEarly: (slotResults, currentSlot) => {
      if (currentSlot === 5 && slotResults.length >= 5) {
        const slot5 = slotResults[4];
        if (!slot5.success && !slot5.unfunded) {
          return true;
        }
      }
      return false;
    },
    shouldReset: () => false
  });
  strategies.push({
    id: "L65_slot1_10_double_lock",
    name: "Secure Slots 1+10 (30%)",
    description: "Reset until slot 1 succeeds, then reset until slot 10 succeeds (both 30%). Then 30% on slot 5, 70% on others. High damage floor.",
    selectScroll: (slot) => {
      if (slot === 1 || slot === 10) return "L65_30";
      if (slot === 5) return "L65_30";
      return "L65_70";
    },
    shouldResetEarly: (slotResults, currentSlot) => {
      if (currentSlot === 1 && slotResults.length >= 1) {
        const slot1 = slotResults[0];
        if (!slot1.success && !slot1.unfunded) {
          return true;
        }
      }
      if (currentSlot === 10 && slotResults.length >= 10) {
        const slot1 = slotResults[0];
        const slot10 = slotResults[9];
        if (slot1.success && !slot10.success && !slot10.unfunded) {
          return true;
        }
      }
      return false;
    },
    shouldReset: () => false
  });
  strategies.push({
    id: "L65_slot1_5_double_lock",
    name: "Secure Slots 1+5 (30%)",
    description: "Reset until slot 1 succeeds, then reset until slot 5 succeeds (both 30%). Then 30% on slot 10, 70% on others. Medium budget.",
    selectScroll: (slot) => {
      if (slot === 1 || slot === 5) return "L65_30";
      if (slot === 10) return "L65_30";
      return "L65_70";
    },
    shouldResetEarly: (slotResults, currentSlot) => {
      if (currentSlot === 1 && slotResults.length >= 1) {
        const slot1 = slotResults[0];
        if (!slot1.success && !slot1.unfunded) {
          return true;
        }
      }
      if (currentSlot === 5 && slotResults.length >= 5) {
        const slot1 = slotResults[0];
        const slot5 = slotResults[4];
        if (slot1.success && !slot5.success && !slot5.unfunded) {
          return true;
        }
      }
      return false;
    },
    shouldReset: () => false
  });
  strategies.push({
    id: "L65_triple_lock_1_5_10",
    name: "Secure All Three 30% (1+5+10)",
    description: "Reset until slots 1, 5, and 10 all succeed sequentially (all 30%). 70% on others. High budget, guarantees 3x 30% success.",
    selectScroll: (slot) => {
      if (slot === 1 || slot === 5 || slot === 10) return "L65_30";
      return "L65_70";
    },
    shouldResetEarly: (slotResults, currentSlot) => {
      if (currentSlot === 1 && slotResults.length >= 1) {
        const slot1 = slotResults[0];
        if (!slot1.success && !slot1.unfunded) {
          return true;
        }
      }
      if (currentSlot === 5 && slotResults.length >= 5) {
        const slot1 = slotResults[0];
        const slot5 = slotResults[4];
        if (slot1.success && !slot5.success && !slot5.unfunded) {
          return true;
        }
      }
      if (currentSlot === 10 && slotResults.length >= 10) {
        const slot1 = slotResults[0];
        const slot5 = slotResults[4];
        const slot10 = slotResults[9];
        if (slot1.success && slot5.success && !slot10.success && !slot10.unfunded) {
          return true;
        }
      }
      return false;
    },
    shouldReset: () => false
  });
  strategies.push({
    id: "L65_slot1_lock_all_30",
    name: "Secure Slot 1 (30%) + All 30%",
    description: "Reset until slot 1 succeeds with 30%, then use 30% L65 for ALL remaining slots. High damage amp potential, high budget required.",
    selectScroll: () => "L65_30",
    shouldResetEarly: (slotResults, currentSlot) => {
      if (currentSlot === 1 && slotResults.length >= 1) {
        const slot1 = slotResults[0];
        if (!slot1.success && !slot1.unfunded) {
          return true;
        }
      }
      return false;
    },
    shouldReset: () => false
  });
  strategies.push({
    id: "L65_slot1_lock_amp_0_5",
    name: "Secure Slot 1 (30%) + 0.5% Amp",
    description: "Reset until slot 1 succeeds with 30%, then 30% on slots 5&10, 70% elsewhere. Also reset if total damage amp < 0.5%. High budget.",
    selectScroll: (slot) => {
      if (slot === 1) return "L65_30";
      if (slot === 5 || slot === 10) return "L65_30";
      return "L65_70";
    },
    shouldResetEarly: (slotResults, currentSlot) => {
      if (currentSlot === 1 && slotResults.length >= 1) {
        const slot1 = slotResults[0];
        if (!slot1.success && !slot1.unfunded) {
          return true;
        }
      }
      return false;
    },
    shouldReset: (result) => {
      return result.totalDamageAmp < 0.5;
    }
  });
  strategies.push({
    id: "L65_slot1_lock_bonus_retry",
    name: "Secure Slot 1 (30%) + Bonus Retry",
    description: "Reset until slot 1 succeeds with 30%, then 30% on slots 5&10, 70% elsewhere. Also reset if both bonus slots (5&10) fail. Medium budget.",
    selectScroll: (slot) => {
      if (slot === 1) return "L65_30";
      if (slot === 5 || slot === 10) return "L65_30";
      return "L65_70";
    },
    shouldResetEarly: (slotResults, currentSlot) => {
      if (currentSlot === 1 && slotResults.length >= 1) {
        const slot1 = slotResults[0];
        if (!slot1.success && !slot1.unfunded) {
          return true;
        }
      }
      return false;
    },
    shouldReset: (result) => {
      const slot5 = result.slotResults.find((s) => s.slot === 5);
      const slot10 = result.slotResults.find((s) => s.slot === 10);
      if (slot5 && slot10 && !slot5.unfunded && !slot10.unfunded) {
        if (!slot5.success && !slot10.success) {
          return true;
        }
      }
      return false;
    }
  });
  strategies.push({
    id: "L65_slot1_lock_8plus",
    name: "Secure Slot 1 (30%) + 8+ Successes",
    description: "Reset until slot 1 succeeds with 30%, then 30% on slots 5&10, 70% elsewhere. Also reset if <8 total successes. Very high budget.",
    selectScroll: (slot) => {
      if (slot === 1) return "L65_30";
      if (slot === 5 || slot === 10) return "L65_30";
      return "L65_70";
    },
    shouldResetEarly: (slotResults, currentSlot) => {
      if (currentSlot === 1 && slotResults.length >= 1) {
        const slot1 = slotResults[0];
        if (!slot1.success && !slot1.unfunded) {
          return true;
        }
      }
      return false;
    },
    shouldReset: (result) => {
      return result.successfulSlots < 8;
    }
  });
  return strategies;
}
function createL85Strategies() {
  const strategies = [];
  strategies.push({
    id: "L85_slot1_15_lock",
    name: "Slot 1 15% Lock-In",
    description: "15% L85 on slot 1, reset until success. Then 15% on slots 5&10, 70% on others. No resets after slot 1 succeeds.",
    selectScroll: (slot) => {
      if (slot === 1) return "L85_15";
      if (slot === 5 || slot === 10) return "L85_15";
      return "L85_70";
    },
    shouldResetEarly: (slotResults, currentSlot) => {
      if (currentSlot === 1 && slotResults.length >= 1) {
        const slot1 = slotResults[0];
        if (!slot1.success && !slot1.unfunded) {
          return true;
        }
      }
      return false;
    },
    shouldReset: () => false
  });
  strategies.push({
    id: "L85_slot12_15_lock",
    name: "Slot 1+2 15% Lock-In",
    description: "15% L85 on slot 1 and 2, reset until success on both. Then 15% on slots 5&10, 70% on others. No resets after slot 2 succeeds.",
    selectScroll: (slot) => {
      if (slot === 1) return "L85_15";
      if (slot === 2) return "L85_15";
      if (slot === 5 || slot === 10) return "L85_15";
      return "L85_70";
    },
    shouldResetEarly: (slotResults, currentSlot) => {
      if (currentSlot === 1 && slotResults.length >= 1) {
        const slot1 = slotResults[0];
        if (!slot1.success && !slot1.unfunded) {
          return true;
        }
      }
      if (currentSlot === 2 && slotResults.length >= 2) {
        const slot2 = slotResults[1];
        if (!slot2.success && !slot2.unfunded) {
          return true;
        }
      }
      return false;
    },
    shouldReset: () => false
  });
  strategies.push({
    id: "L85_slot123_15_lock",
    name: "Slot 1+2+3 15% Lock-In",
    description: "15% L85 on slot 1, 2 and 3, reset until success on all. Then 15% on slots 5&10, 70% on others. No resets after slot 2 succeeds.",
    selectScroll: (slot) => {
      if (slot === 1) return "L85_15";
      if (slot === 2) return "L85_15";
      if (slot === 3) return "L85_15";
      if (slot === 5 || slot === 10) return "L85_15";
      return "L85_70";
    },
    shouldResetEarly: (slotResults, currentSlot) => {
      if (currentSlot === 1 && slotResults.length >= 1) {
        const slot1 = slotResults[0];
        if (!slot1.success && !slot1.unfunded) {
          return true;
        }
      }
      if (currentSlot === 2 && slotResults.length >= 2) {
        const slot2 = slotResults[1];
        if (!slot2.success && !slot2.unfunded) {
          return true;
        }
      }
      if (currentSlot === 3 && slotResults.length >= 3) {
        const slot3 = slotResults[2];
        if (!slot3.success && !slot3.unfunded) {
          return true;
        }
      }
      return false;
    },
    shouldReset: () => false
  });
  strategies.push({
    id: "L85_slot1_lock_then_30",
    name: "Slot 1 Lock + All 30%",
    description: "Lock slot 1 with 15%, then use 30% L85 for all remaining slots. Higher risk/reward for high budgets.",
    selectScroll: (slot) => {
      if (slot === 1) return "L85_15";
      return "L85_30";
    },
    shouldResetEarly: (slotResults, currentSlot) => {
      if (currentSlot === 1 && slotResults.length >= 1) {
        const slot1 = slotResults[0];
        if (!slot1.success && !slot1.unfunded) {
          return true;
        }
      }
      return false;
    },
    shouldReset: () => false
  });
  strategies.push({
    id: "L85_slot1_lock_7plus",
    name: "Slot 1 Lock + 7+ Successes",
    description: "Lock slot 1, then 15% on slots 5&10, 70% elsewhere. Reset if <7 total successes. Very high budget.",
    selectScroll: (slot) => {
      if (slot === 1) return "L85_15";
      if (slot === 5 || slot === 10) return "L85_15";
      return "L85_70";
    },
    shouldResetEarly: (slotResults, currentSlot) => {
      if (currentSlot === 1 && slotResults.length >= 1) {
        const slot1 = slotResults[0];
        if (!slot1.success && !slot1.unfunded) {
          return true;
        }
      }
      return false;
    },
    shouldReset: (result) => {
      return result.successfulSlots < 7;
    }
  });
  strategies.push({
    id: "L85_slot1_5_double_lock",
    name: "Slot 1+5 Double Lock",
    description: "Reset until slot 1 succeeds with a 15%, 70% until slot 5, reset until slot 15% suceeds here too, 70% until slot 10 where finish off with 15%.",
    selectScroll: (slot) => {
      if (slot === 1 || slot === 5) return "L85_15";
      if (slot === 10) return "L85_15";
      return "L85_70";
    },
    shouldResetEarly: (slotResults, currentSlot) => {
      if (currentSlot === 1 && slotResults.length >= 1) {
        const slot1 = slotResults[0];
        if (!slot1.success && !slot1.unfunded) {
          return true;
        }
      }
      if (currentSlot === 5 && slotResults.length >= 5) {
        const slot1 = slotResults[0];
        const slot5 = slotResults[4];
        if (slot1.success && !slot5.success && !slot5.unfunded) {
          return true;
        }
      }
      return false;
    },
    shouldReset: () => false
  });
  strategies.push({
    id: "L85_slot1_lock_all_15",
    name: "Slot 1 Lock + All 15%",
    description: "Lock slot 1, then use 15% L85 for ALL remaining slots. Ultra-aggressive, extreme budget required.",
    selectScroll: () => "L85_15",
    shouldResetEarly: (slotResults, currentSlot) => {
      if (currentSlot === 1 && slotResults.length >= 1) {
        const slot1 = slotResults[0];
        if (!slot1.success && !slot1.unfunded) {
          return true;
        }
      }
      return false;
    },
    shouldReset: () => false
  });
  return strategies;
}
function calculateScrollDamageGain(avgAttack, avgDamageAmp) {
  const baseStats = loadoutStore.getBaseStats();
  const service = new StatCalculationService(baseStats);
  service.add(STAT.ATTACK.id, avgAttack);
  service.add(STAT.DAMAGE_AMP.id, avgDamageAmp);
  const baseDPS = service.baseBossDPS;
  const newDPS = service.computeDPS("boss");
  const dpsGain = (newDPS - baseDPS) / baseDPS * 100;
  const weaponAttackBonus = service.weaponAttackBonus;
  const effectiveAttackIncrease = avgAttack * (1 + weaponAttackBonus / 100);
  return {
    baseDPS,
    newDPS,
    dpsGain,
    effectiveAttackIncrease
  };
}
export {
  SCROLLS_L65,
  SCROLLS_L85,
  attemptScrollRun,
  calculateScrollDamageGain,
  createL65Strategies,
  createL85Strategies,
  getScrollSuccessRate,
  getScrollsForLevel,
  simulateScrollWithResets
};
//# sourceMappingURL=scrolling.js.map
