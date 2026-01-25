import { STAT } from "@ts/types/constants.js";
import { loadoutStore } from "@ts/store/loadout.store.js";
const EQUIPMENT_SLOTS = [
  { id: "head", name: "Head", hasMainStat: false },
  { id: "cape", name: "Cape", hasMainStat: false },
  { id: "chest", name: "Chest", hasMainStat: false },
  { id: "shoulders", name: "Shoulders", hasMainStat: false },
  { id: "legs", name: "Legs", hasMainStat: false },
  { id: "belt", name: "Belt", hasMainStat: false },
  { id: "gloves", name: "Gloves", hasMainStat: false },
  { id: "boots", name: "Boots", hasMainStat: false },
  { id: "ring", name: "Ring", hasMainStat: true },
  { id: "neck", name: "Neck", hasMainStat: true },
  { id: "eye-accessory", name: "Eye Accessory", hasMainStat: true }
];
let equipmentData = {
  head: null,
  cape: null,
  chest: null,
  shoulders: null,
  legs: null,
  belt: null,
  gloves: null,
  boots: null,
  ring: null,
  neck: null,
  "eye-accessory": null
};
function getSlotData(slotId) {
  return equipmentData[slotId];
}
function getAllEquipmentData() {
  return equipmentData;
}
function setSlotData(slotId, data) {
  equipmentData[slotId] = data;
  saveSlotToStorage(slotId, data);
}
function clearSlotData(slotId) {
  const emptyData = {
    name: "",
    attack: 0,
    mainStat: 0,
    statLines: []
  };
  setSlotData(slotId, emptyData);
}
function loadAllEquipmentData() {
  const storeData = loadoutStore.getEquipmentData();
  EQUIPMENT_SLOTS.forEach((slot) => {
    equipmentData[slot.id] = storeData[slot.id];
  });
}
const LEGACY_STAT_KEY_MAP = {
  "attack": STAT.ATTACK.id,
  "main-stat": STAT.PRIMARY_MAIN_STAT.id,
  "defense": STAT.DEFENSE.id,
  "crit-rate": STAT.CRIT_RATE.id,
  "crit-damage": STAT.CRIT_DAMAGE.id,
  "skill-level-1st": STAT.SKILL_LEVEL_1ST.id,
  "skill-level-2nd": STAT.SKILL_LEVEL_2ND.id,
  "skill-level-3rd": STAT.SKILL_LEVEL_3RD.id,
  "skill-level-4th": STAT.SKILL_LEVEL_4TH.id,
  "skill-level-all": STAT.SKILL_LEVEL_ALL.id,
  "attack-speed": STAT.ATTACK_SPEED.id,
  "normal-damage": STAT.NORMAL_DAMAGE.id,
  "boss-damage": STAT.BOSS_DAMAGE.id,
  "damage": STAT.DAMAGE.id,
  "damage-amp": STAT.DAMAGE_AMP.id,
  "final-damage": STAT.FINAL_DAMAGE.id,
  "min-damage": STAT.MIN_DAMAGE.id,
  "max-damage": STAT.MAX_DAMAGE.id
};
function migrateStatlineFormats() {
  if (localStorage.getItem("statline-migration-complete")) {
    return;
  }
  const storeData = loadoutStore.getEquipmentData();
  let totalMigrated = 0;
  const slotsMigrated = [];
  const updates = {};
  EQUIPMENT_SLOTS.forEach((slot) => {
    const slotData = storeData[slot.id];
    if (!slotData || !Array.isArray(slotData.statLines)) return;
    const needsMigration = slotData.statLines.some(
      (statLine) => statLine && statLine.type && typeof statLine.type === "string" && statLine.type.includes("-")
    );
    if (needsMigration) {
      const migratedStatLines = slotData.statLines.map((statLine) => {
        if (!statLine || !statLine.type || typeof statLine.type !== "string") {
          return statLine;
        }
        if (statLine.type.includes("-")) {
          const statId = LEGACY_STAT_KEY_MAP[statLine.type];
          totalMigrated++;
          return {
            ...statLine,
            type: statId || statLine.type
            // Use statId if mapping exists
          };
        }
        return statLine;
      });
      updates[slot.id] = {
        ...slotData,
        statLines: migratedStatLines
      };
      slotsMigrated.push(slot.id);
    }
  });
  Object.entries(updates).forEach(([slotId, data]) => {
    loadoutStore.updateEquipment(slotId, data);
  });
  if (totalMigrated > 0) {
    localStorage.setItem("statline-migration-complete", "true");
    console.log(`[Equipment] Migrated ${totalMigrated} statlines across ${slotsMigrated.length} slots from kebab-case to statId`);
  }
}
function saveSlotToStorage(slotId, data) {
  loadoutStore.updateEquipment(slotId, data);
}
function createEmptySlotData(hasMainStat) {
  return {
    name: "",
    attack: 0,
    mainStat: hasMainStat ? 0 : void 0,
    statLines: []
  };
}
function getAvailableStats() {
  return [
    { value: STAT.ATTACK.id, label: STAT.ATTACK.label },
    { value: STAT.PRIMARY_MAIN_STAT.id, label: "Main Stat" },
    { value: STAT.MAIN_STAT_PCT.id, label: "Main Stat %" },
    { value: STAT.DEFENSE.id, label: STAT.DEFENSE.label },
    { value: STAT.CRIT_RATE.id, label: STAT.CRIT_RATE.label },
    { value: STAT.CRIT_DAMAGE.id, label: STAT.CRIT_DAMAGE.label },
    { value: STAT.SKILL_LEVEL_1ST.id, label: STAT.SKILL_LEVEL_1ST.label },
    { value: STAT.SKILL_LEVEL_2ND.id, label: STAT.SKILL_LEVEL_2ND.label },
    { value: STAT.SKILL_LEVEL_3RD.id, label: STAT.SKILL_LEVEL_3RD.label },
    { value: STAT.SKILL_LEVEL_4TH.id, label: STAT.SKILL_LEVEL_4TH.label },
    { value: STAT.SKILL_LEVEL_ALL.id, label: STAT.SKILL_LEVEL_ALL.label },
    { value: STAT.ATTACK_SPEED.id, label: STAT.ATTACK_SPEED.label },
    { value: STAT.NORMAL_DAMAGE.id, label: STAT.NORMAL_DAMAGE.label },
    { value: STAT.BOSS_DAMAGE.id, label: STAT.BOSS_DAMAGE.label },
    { value: STAT.DAMAGE.id, label: STAT.DAMAGE.label },
    { value: STAT.FINAL_DAMAGE.id, label: STAT.FINAL_DAMAGE.label },
    { value: STAT.MIN_DAMAGE.id, label: STAT.MIN_DAMAGE.label },
    { value: STAT.MAX_DAMAGE.id, label: STAT.MAX_DAMAGE.label }
  ];
}
function generateStatTypeOptionsHTML() {
  return getAvailableStats().map((stat) => `<option value="${stat.value}">${stat.label}</option>`).join("");
}
function getStatKey(statType) {
  const statEntry = Object.values(STAT).find((stat) => stat.id === statType);
  return statEntry ? statType : null;
}
function calculateSlotContributions(slotConfig, slotData) {
  if (!slotData) return null;
  const stats = {
    [STAT.ATTACK.id]: slotData.attack || 0
  };
  if (slotConfig.hasMainStat && slotData.mainStat !== void 0) {
    stats[STAT.MAIN_STAT_PCT.id] = slotData.mainStat;
  }
  if (slotData.statLines && Array.isArray(slotData.statLines)) {
    slotData.statLines.forEach((statLine) => {
      const statId = getStatKey(statLine.type);
      if (statId) {
        stats[statId] = (stats[statId] || 0) + statLine.value;
      }
    });
  }
  return stats;
}
function calculateAllContributions() {
  const contributions = {};
  EQUIPMENT_SLOTS.forEach((slot) => {
    contributions[slot.id] = calculateSlotContributions(slot, equipmentData[slot.id]);
  });
  return contributions;
}
function getSlotConfig(slotId) {
  return EQUIPMENT_SLOTS.find((slot) => slot.id === slotId);
}
function isValidSlot(slotId) {
  return EQUIPMENT_SLOTS.some((slot) => slot.id === slotId);
}
export {
  EQUIPMENT_SLOTS,
  calculateAllContributions,
  calculateSlotContributions,
  clearSlotData,
  createEmptySlotData,
  generateStatTypeOptionsHTML,
  getAllEquipmentData,
  getAvailableStats,
  getSlotConfig,
  getSlotData,
  getStatKey,
  isValidSlot,
  loadAllEquipmentData,
  migrateStatlineFormats,
  setSlotData
};
//# sourceMappingURL=equipment.js.map
