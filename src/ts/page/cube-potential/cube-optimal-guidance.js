import { StatCalculationService } from "@ts/services/stat-calculation-service.js";
import {
  RARITY_UPGRADE_RATES,
  SLOT_NAMES
} from "@ts/page/cube-potential/cube-potential-data.js";
import { loadoutStore } from "@ts/store/loadout.store.js";
import { potentialStatToDamageStat } from "@ts/page/cube-potential/cube-potential.js";
import { findOptimalSlotToCube, sampleExpectedDPSGain } from "./cube-expected-value.js";
let guidanceState = {
  potentialType: "regular",
  cubeBudget: 100
};
function initOptimalGuidance() {
  loadGuidanceBudget();
}
function loadGuidanceBudget() {
  const saved = localStorage.getItem("optimalGuidanceBudget");
  if (saved) {
    guidanceState.cubeBudget = parseInt(saved) || 100;
    const budgetInput = document.getElementById("optimal-cube-budget");
    if (budgetInput) {
      budgetInput.value = guidanceState.cubeBudget.toString();
    }
  }
}
function calculateCurrentSlotDPSGain(slotId, slotData) {
  const baseStats = loadoutStore.getBaseStats();
  const baseDPS = new StatCalculationService(baseStats).computeDPS("boss");
  const slotService = new StatCalculationService(baseStats);
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
  return (slotDPS - baseDPS) / baseDPS * 100;
}
function calculateAndDisplayRecommendation(cubeSlotData) {
  const potentialType = guidanceState.potentialType;
  const baseStats = loadoutStore.getBaseStats();
  const baseDPS = new StatCalculationService(baseStats).computeDPS("boss");
  const slots = SLOT_NAMES.map((slotDef) => {
    const slotData = cubeSlotData[slotDef.id][potentialType];
    return {
      id: slotDef.id,
      name: slotDef.name,
      rarity: slotData.rarity,
      rollCount: slotData.rollCount || 0,
      dpsGain: calculateCurrentSlotDPSGain(slotDef.id, slotData)
    };
  });
  const { slot: recommendedSlot, marginalGain } = findOptimalSlotToCube(
    slots,
    baseStats,
    baseDPS,
    100
    // Higher sample size for user-facing guidance
  );
  if (!recommendedSlot) {
    displayNoRecommendation();
    return null;
  }
  const optimalSequence = calculateOptimalSequence(slots, baseStats, baseDPS);
  displayRecommendation(recommendedSlot, marginalGain);
  displayOptimalSequence(optimalSequence);
  return {
    recommendedSlot,
    marginalGain,
    optimalSequence
  };
}
function calculateOptimalSequence(initialSlots, baseStats, baseDPS) {
  const sequence = [];
  const simSlots = JSON.parse(JSON.stringify(initialSlots));
  let currentSlotId = null;
  let cubesOnCurrentSlot = 0;
  for (let i = 0; i < guidanceState.cubeBudget; i++) {
    const { slot } = findOptimalSlotToCube(simSlots, baseStats, baseDPS, 30);
    if (!slot) break;
    if (slot.id !== currentSlotId) {
      if (currentSlotId !== null) {
        const cumulativeDPS = simSlots.reduce((sum, s) => sum + s.dpsGain, 0);
        sequence.push({
          slotId: currentSlotId,
          slotName: simSlots.find((s) => s.id === currentSlotId).name,
          cubes: cubesOnCurrentSlot,
          cumulativeDPS
        });
      }
      currentSlotId = slot.id;
      cubesOnCurrentSlot = 0;
    }
    cubesOnCurrentSlot++;
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
    const sampledDPS = sampleExpectedDPSGain(slot.id, slot.rarity, baseStats, baseDPS);
    slot.dpsGain = sampledDPS;
  }
  if (currentSlotId !== null) {
    const cumulativeDPS = simSlots.reduce((sum, s) => sum + s.dpsGain, 0);
    sequence.push({
      slotId: currentSlotId,
      slotName: simSlots.find((s) => s.id === currentSlotId).name,
      cubes: cubesOnCurrentSlot,
      cumulativeDPS
    });
  }
  return sequence;
}
function displayNoRecommendation() {
  const panel = document.getElementById("optimal-recommendation");
  if (!panel) return;
  panel.innerHTML = `
        <div class="optimal-no-recommendation-card">
            <div style="font-size: 1.2em; color: var(--text-secondary);">No recommendation available</div>
            <div style="font-size: 0.9em; color: var(--text-secondary); margin-top: 8px;">Please select a class first</div>
        </div>
    `;
}
function displayRecommendation(slot, marginalGain) {
  const panel = document.getElementById("optimal-recommendation");
  if (!panel) return;
  const upgradeData = RARITY_UPGRADE_RATES[slot.rarity];
  const rollsUntilPity = upgradeData ? upgradeData.max - slot.rollCount : "N/A";
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
                        ${slot.rarity.charAt(0).toUpperCase() + slot.rarity.slice(1)} \u2022
                        ${slot.rollCount} rolls \u2022
                        ${typeof rollsUntilPity === "number" ? rollsUntilPity : rollsUntilPity} until pity
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
function displayOptimalSequence(sequence) {
  const container = document.getElementById("optimal-sequence");
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
  html += "</tbody></table>";
  container.innerHTML = html;
}
function setupOptimalGuidanceEventListeners() {
  const potentialTypeSelect = document.getElementById("optimal-potential-type");
  if (potentialTypeSelect) {
    potentialTypeSelect.addEventListener("change", (e) => {
      guidanceState.potentialType = e.target.value;
      const cubeSlotData = window.cubeSlotData;
      if (cubeSlotData) {
        calculateAndDisplayRecommendation(cubeSlotData);
      }
    });
  }
  const budgetInput = document.getElementById("optimal-cube-budget");
  if (budgetInput) {
    budgetInput.addEventListener("change", (e) => {
      const value = parseInt(e.target.value) || 100;
      guidanceState.cubeBudget = Math.max(1, Math.min(9999, value));
      budgetInput.value = guidanceState.cubeBudget.toString();
      localStorage.setItem("optimalGuidanceBudget", guidanceState.cubeBudget.toString());
      const cubeSlotData = window.cubeSlotData;
      if (cubeSlotData) {
        calculateAndDisplayRecommendation(cubeSlotData);
      }
    });
  }
}
function getGuidanceState() {
  return { ...guidanceState };
}
function updateGuidanceState(updates) {
  guidanceState = { ...guidanceState, ...updates };
}
export {
  calculateAndDisplayRecommendation,
  getGuidanceState,
  initOptimalGuidance,
  setupOptimalGuidanceEventListeners,
  updateGuidanceState
};
//# sourceMappingURL=cube-optimal-guidance.js.map
