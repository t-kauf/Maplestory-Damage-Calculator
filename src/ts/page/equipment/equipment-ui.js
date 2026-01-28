import {
  EQUIPMENT_SLOTS,
  getSlotConfig,
  generateStatTypeOptionsHTML,
  setSlotData,
  loadAllEquipmentData,
  getAllEquipmentData,
  calculateAllContributions,
  isValidSlot,
  migrateStatlineFormats
} from "./equipment.js";
import { STAT } from "@ts/types/constants.js";
import {
  hasEquipmentViewerData,
  getAllEquippedItems
} from "@ts/services/equipment-viewer.service.js";
import { showToast } from "@ts/utils/notifications.js";
const LEGACY_KEY_TO_STAT_ID = {
  "attack": STAT.ATTACK.id,
  "main-stat": STAT.PRIMARY_MAIN_STAT.id,
  "defense": STAT.DEFENSE.id,
  "crit-rate": STAT.CRIT_RATE.id,
  "crit-damage": STAT.CRIT_DAMAGE.id,
  "skill-level-1st": STAT.SKILL_LEVEL_1ST.id,
  "skill-level-2nd": STAT.SKILL_LEVEL_2ND.id,
  "skill-level-3rd": STAT.SKILL_LEVEL_3RD.id,
  "skill-level-4th": STAT.SKILL_LEVEL_4TH.id,
  "attack-speed": STAT.ATTACK_SPEED.id,
  "skill-level-all": STAT.SKILL_LEVEL_ALL.id,
  "normal-damage": STAT.NORMAL_DAMAGE.id,
  "boss-damage": STAT.BOSS_DAMAGE.id,
  "damage": STAT.DAMAGE.id,
  "damage-amp": STAT.DAMAGE_AMP.id,
  "final-damage": STAT.FINAL_DAMAGE.id,
  "min-damage": STAT.MIN_DAMAGE.id,
  "max-damage": STAT.MAX_DAMAGE.id
};
function generateSlotCardHTML(slot) {
  const mainStatInput = slot.hasMainStat ? `
        <div class="equipment-input-group">
            <label class="equipment-input-label" for="equipment-${slot.id}-main-stat">Main Stat</label>
            <input type="number" step="1" id="equipment-${slot.id}-main-stat" value="0" min="0" class="equipment-input-field">
        </div>
    ` : "";
  return `
        <div id="equipment-slot-${slot.id}" class="equipment-slot-card" data-needs-init="true">
            <div class="equipment-slot-header">
                <div class="equipment-slot-name">${slot.name}</div>
            </div>

            <div class="equipment-inputs-grid">
                <div class="equipment-input-group">
                    <label class="equipment-input-label" for="equipment-${slot.id}-attack">${STAT.ATTACK.label}</label>
                    <input type="number" step="0.1" id="equipment-${slot.id}-attack" value="0" min="0" class="equipment-input-field">
                </div>
                ${mainStatInput}
            </div>

            <div class="equipment-stats-section">
                <div class="equipment-stats-header">
                    <label class="equipment-stats-label">Additional Stats</label>
                    <button data-slot="${slot.id}" class="equipment-action-btn equipment-btn-add">
                        + Add Stat
                    </button>
                </div>
                <div id="equipment-${slot.id}-stats-container" class="equipment-stats-container">
                    <!-- Stat lines will be added here -->
                </div>
            </div>
        </div>
    `;
}
function generateStatLineHTML(slotId, statIndex) {
  const optionsHTML = generateStatTypeOptionsHTML();
  return `
        <div id="equipment-${slotId}-stat-${statIndex}" class="equipment-stat-line">
            <div class="equipment-input-group equipment-stat-type-select">
                <select id="equipment-${slotId}-stat-${statIndex}-type" class="equipment-input-field equipment-select-field">
                    ${optionsHTML}
                </select>
            </div>
            <div class="equipment-input-group">
                <input type="number" step="0.1" id="equipment-${slotId}-stat-${statIndex}-value" value="0" class="equipment-input-field equipment-stat-value-input">
            </div>
            <button data-slot="${slotId}" data-stat="${statIndex}" class="equipment-btn-delete equipment-stat-delete-btn" title="Remove stat line">\u2715</button>
        </div>
    `;
}
function generateEquipmentHTML() {
  return `
        <div id="equipment-header" class="equipment-header">
            <div id="equipment-summary-container" class="mb-8">
                <div class="mb-4">Equipment Summary</div>
                <div id="equipment-summary-content" class="equipment-summary-content">
                    <span class="equipment-summary-empty">No equipment configured</span>
                </div>
            </div>
            <button id="refresh-equipment-from-viewer-btn" class="equipment-refresh-btn" title="Refresh from Equipment Viewer" style="display: none;">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path fill-rule="evenodd" d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/>
                    <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/>
                </svg>
                <span>Refresh from Equipment Viewer</span>
            </button>
        </div>

        <div id="equipment-slots-container" class="equipment-slots-grid">
            ${EQUIPMENT_SLOTS.map(generateSlotCardHTML).join("")}
        </div>       
    `;
}
function initializeEquipmentUI() {
  const container = document.getElementById("setup-equipment");
  if (!container) {
    console.error("Equipment container not found");
    return;
  }
  migrateStatlineFormats();
  container.innerHTML = generateEquipmentHTML();
}
function loadEquipmentUI() {
  loadAllEquipmentData();
  const equipmentData = getAllEquipmentData();
  EQUIPMENT_SLOTS.forEach((slot) => {
    const slotElement = document.getElementById(`equipment-slot-${slot.id}`);
    const slotData = equipmentData[slot.id];
    if (!slotElement) return;
    slotElement.dataset.needsInit = "false";
    if (slotData) {
      populateSlotWithData(slot.id, slotData);
    } else {
      const statsContainer = document.getElementById(`equipment-${slot.id}-stats-container`);
      if (statsContainer && statsContainer.children.length === 0) {
        for (let i = 0; i < 3; i++) {
          addStatLineToSlot(slot.id);
        }
      }
    }
  });
  updateEquipmentSummary();
}
function populateSlotWithData(slotId, data) {
  const attackInput = document.getElementById(`equipment-${slotId}-attack`);
  if (attackInput) attackInput.value = (data.attack || 0).toString();
  const mainStatInput = document.getElementById(`equipment-${slotId}-main-stat`);
  if (mainStatInput && data.mainStat !== void 0) {
    mainStatInput.value = data.mainStat.toString();
  }
  const statsContainer = document.getElementById(`equipment-${slotId}-stats-container`);
  if (statsContainer) {
    statsContainer.innerHTML = "";
    if (data.statLines && Array.isArray(data.statLines)) {
      data.statLines.forEach((statLine) => {
        addStatLineToSlot(slotId);
        const statCount = statsContainer.children.length;
        const typeInput = document.getElementById(`equipment-${slotId}-stat-${statCount}-type`);
        const valueInput = document.getElementById(`equipment-${slotId}-stat-${statCount}-value`);
        let typeValue = statLine.type;
        if (typeValue in LEGACY_KEY_TO_STAT_ID) {
          typeValue = LEGACY_KEY_TO_STAT_ID[typeValue];
        }
        if (typeInput) typeInput.value = typeValue;
        if (valueInput) valueInput.value = statLine.value.toString();
      });
    }
  }
}
function debounce(func, wait) {
  let timeout = null;
  return function executedFunction(...args) {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}
function saveSlotDataFromDOM(slotId) {
  if (!isValidSlot(slotId)) {
    console.warn(`Invalid slot ID: ${slotId}`);
    return;
  }
  const validSlotId = slotId;
  const slotConfig = getSlotConfig(validSlotId);
  if (!slotConfig) return;
  const attackInput = document.getElementById(`equipment-${validSlotId}-attack`);
  const attack = attackInput ? parseFloat(attackInput.value) || 0 : 0;
  let mainStat;
  if (slotConfig.hasMainStat) {
    const mainStatInput = document.getElementById(`equipment-${validSlotId}-main-stat`);
    mainStat = mainStatInput ? parseFloat(mainStatInput.value) || 0 : void 0;
  }
  const statLines = [];
  const statsContainer = document.getElementById(`equipment-${validSlotId}-stats-container`);
  if (statsContainer) {
    const statElements = statsContainer.querySelectorAll(`[id^="equipment-${validSlotId}-stat-"]:not([id*="-type"]):not([id*="-value"])`);
    statElements.forEach((statElement) => {
      const typeInput = statElement.querySelector('[id$="-type"]');
      const valueInput = statElement.querySelector('[id$="-value"]');
      if (typeInput && valueInput && typeInput.value && valueInput.value) {
        statLines.push({
          type: typeInput.value,
          // Cast to StatId
          value: parseFloat(valueInput.value) || 0
        });
      }
    });
  }
  const slotData = {
    name: "",
    attack,
    mainStat,
    statLines
  };
  setSlotData(validSlotId, slotData);
}
function addStatLineToSlot(slotId) {
  const statsContainer = document.getElementById(`equipment-${slotId}-stats-container`);
  if (!statsContainer) return;
  const currentCount = statsContainer.children.length;
  const statId = currentCount + 1;
  const statDiv = document.createElement("div");
  statDiv.innerHTML = generateStatLineHTML(slotId, statId);
  statsContainer.appendChild(statDiv.firstElementChild);
}
function removeStatLineFromSlot(slotId, statId) {
  const statElement = document.getElementById(`equipment-${slotId}-stat-${statId}`);
  if (statElement) {
    statElement.remove();
    saveSlotDataFromDOM(slotId);
    notifyStatContributors();
  }
}
function notifyStatContributors() {
  const equipmentStats = calculateAllContributions();
  updateEquipmentSummary();
}
function calculateAggregateStats(equipmentData) {
  const totals = {
    [STAT.ATTACK.id]: 0,
    [STAT.PRIMARY_MAIN_STAT.id]: 0,
    [STAT.MAIN_STAT_PCT.id]: 0,
    [STAT.DEFENSE.id]: 0,
    [STAT.CRIT_RATE.id]: 0,
    [STAT.CRIT_DAMAGE.id]: 0,
    [STAT.BOSS_DAMAGE.id]: 0,
    [STAT.NORMAL_DAMAGE.id]: 0,
    [STAT.DAMAGE.id]: 0,
    [STAT.DAMAGE_AMP.id]: 0,
    [STAT.FINAL_DAMAGE.id]: 0,
    [STAT.MIN_DAMAGE.id]: 0,
    [STAT.MAX_DAMAGE.id]: 0,
    [STAT.SKILL_LEVEL_1ST.id]: 0,
    [STAT.SKILL_LEVEL_2ND.id]: 0,
    [STAT.SKILL_LEVEL_3RD.id]: 0,
    [STAT.SKILL_LEVEL_4TH.id]: 0,
    [STAT.SKILL_LEVEL_ALL.id]: 0,
    [STAT.ATTACK_SPEED.id]: 0
  };
  Object.values(equipmentData).forEach((slotData) => {
    if (!slotData) return;
    if (slotData.attack) {
      totals[STAT.ATTACK.id] += slotData.attack;
    }
    if (slotData.mainStat) {
      totals[STAT.PRIMARY_MAIN_STAT.id] += slotData.mainStat;
    }
    if (slotData.statLines && Array.isArray(slotData.statLines)) {
      slotData.statLines.forEach((statLine) => {
        const statId = statLine.type;
        if (statId && totals.hasOwnProperty(statId)) {
          totals[statId] += statLine.value;
        }
      });
    }
  });
  return totals;
}
function updateEquipmentSummary() {
  const equipmentData = getAllEquipmentData();
  const totals = calculateAggregateStats(equipmentData);
  updateSummaryDisplay(totals);
}
function updateSummaryDisplay(totals) {
  const summaryElement = document.getElementById("equipment-summary-content");
  if (!summaryElement) return;
  const parts = [];
  const statConfigs = [
    { key: STAT.ATTACK.id, label: STAT.ATTACK.label, isPercent: false },
    { key: STAT.PRIMARY_MAIN_STAT.id, label: "Main Stat", isPercent: false },
    { key: STAT.MAIN_STAT_PCT.id, label: "Main Stat %", isPercent: true },
    { key: STAT.DEFENSE.id, label: STAT.DEFENSE.label, isPercent: false },
    { key: STAT.CRIT_RATE.id, label: STAT.CRIT_RATE.label.replace(" (%)", ""), isPercent: true },
    { key: STAT.CRIT_DAMAGE.id, label: STAT.CRIT_DAMAGE.label.replace(" (%)", ""), isPercent: true },
    { key: STAT.BOSS_DAMAGE.id, label: STAT.BOSS_DAMAGE.label.replace(" (%)", "").replace("Monster ", ""), isPercent: true },
    { key: STAT.DAMAGE.id, label: STAT.DAMAGE.label.replace(" (%)", ""), isPercent: true },
    { key: STAT.NORMAL_DAMAGE.id, label: STAT.NORMAL_DAMAGE.label.replace(" (%)", "").replace("Monster ", ""), isPercent: true },
    { key: STAT.FINAL_DAMAGE.id, label: STAT.FINAL_DAMAGE.label.replace(" (%)", ""), isPercent: true },
    { key: STAT.MIN_DAMAGE.id, label: STAT.MIN_DAMAGE.label.replace(" (%)", "").replace(" Multiplier", ""), isPercent: true },
    { key: STAT.MAX_DAMAGE.id, label: STAT.MAX_DAMAGE.label.replace(" (%)", "").replace(" Multiplier", ""), isPercent: true },
    { key: STAT.SKILL_LEVEL_1ST.id, label: STAT.SKILL_LEVEL_1ST.label, isPercent: false },
    { key: STAT.SKILL_LEVEL_2ND.id, label: STAT.SKILL_LEVEL_2ND.label, isPercent: false },
    { key: STAT.SKILL_LEVEL_3RD.id, label: STAT.SKILL_LEVEL_3RD.label, isPercent: false },
    { key: STAT.SKILL_LEVEL_4TH.id, label: STAT.SKILL_LEVEL_4TH.label, isPercent: false },
    { key: STAT.SKILL_LEVEL_ALL.id, label: STAT.SKILL_LEVEL_ALL.label, isPercent: false },
    { key: STAT.ATTACK_SPEED.id, label: "All Jobs (Atk Speed)", isPercent: false }
    // Fallback for skill-level-all
  ];
  statConfigs.forEach((config) => {
    const value = totals[config.key];
    const roundedValue = Math.round(value * 10) / 10;
    if (roundedValue > 0) {
      const formattedValue = config.isPercent ? `${roundedValue}%` : roundedValue;
      parts.push(`
                <span class="equipment-summary-stat">
                    <span class="equipment-summary-stat-value">+${formattedValue}</span>
                    ${config.label}
                </span>
            `);
    }
  });
  if (parts.length === 0) {
    summaryElement.innerHTML = '<span class="equipment-summary-empty">No equipment configured</span>';
  } else {
    summaryElement.innerHTML = parts.join('<span class="equipment-summary-divider">\u2022</span>');
  }
  window.equipmentAggregateStats = totals;
}
function attachEquipmentEventListeners() {
  EQUIPMENT_SLOTS.forEach((slot) => {
    const slotElement = document.getElementById(`equipment-slot-${slot.id}`);
    if (!slotElement) return;
    slotElement.addEventListener("input", debounce(() => {
      saveSlotDataFromDOM(slot.id);
      notifyStatContributors();
    }, 300));
    const addStatBtn = slotElement.querySelector(".equipment-btn-add");
    addStatBtn?.addEventListener("click", () => addStatLineToSlot(slot.id));
    slotElement.addEventListener("click", (e) => {
      const target = e.target;
      if (target.classList.contains("equipment-stat-delete-btn")) {
        const statId = target.getAttribute("data-stat");
        if (statId) {
          removeStatLineFromSlot(slot.id, parseInt(statId));
        }
      }
    });
  });
  const refreshBtn = document.getElementById("refresh-equipment-from-viewer-btn");
  if (refreshBtn) {
    refreshBtn.addEventListener("click", refreshFromEquipmentViewer);
    updateRefreshButtonVisibility();
  }
}
function updateRefreshButtonVisibility() {
  const refreshBtn = document.getElementById("refresh-equipment-from-viewer-btn");
  if (refreshBtn) {
    refreshBtn.style.display = hasEquipmentViewerData() ? "" : "none";
  }
}
function refreshFromEquipmentViewer() {
  if (!hasEquipmentViewerData()) {
    showToast("No Equipment Viewer data found. Open Equipment Viewer and add items.", false);
    return;
  }
  const equippedItems = getAllEquippedItems();
  let updatedCount = 0;
  for (const [slotId, item] of Object.entries(equippedItems)) {
    if (!item) continue;
    const statLines = item.stats.map((stat) => ({
      type: stat.type,
      value: stat.value
    }));
    const slotData = {
      name: item.name,
      attack: item.attack,
      mainStat: 0,
      statLines
    };
    setSlotData(slotId, slotData);
    populateSlotWithData(slotId, slotData);
    updatedCount++;
  }
  updateEquipmentSummary();
  notifyStatContributors();
  showToast(`Updated ${updatedCount} equipment slot(s) from Equipment Viewer`, true);
}
window.saveSlotData = (slotId) => {
  saveSlotDataFromDOM(slotId);
  notifyStatContributors();
};
window.addStatLineToSlot = addStatLineToSlot;
window.removeStatLineFromSlot = (slotId, statId) => {
  removeStatLineFromSlot(slotId, statId);
};
window.loadEquipmentData = loadEquipmentUI;
window.notifyStatContributors = notifyStatContributors;
export {
  attachEquipmentEventListeners,
  generateEquipmentHTML,
  initializeEquipmentUI,
  loadEquipmentUI,
  updateEquipmentSummary
};
//# sourceMappingURL=equipment-ui.js.map
