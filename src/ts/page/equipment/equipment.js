import { STAT_KEY_MAP } from "@ts/types/page/equipment/equipment.types.js";
import { availableStats } from "@core/constants.js";
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
  return availableStats;
}
function getStatKey(statType) {
  return STAT_KEY_MAP[statType] || null;
}
function calculateSlotContributions(slotConfig, slotData) {
  if (!slotData) return null;
  const stats = {
    attack: slotData.attack || 0
  };
  if (slotConfig.hasMainStat && slotData.mainStat !== void 0) {
    stats.mainStat = slotData.mainStat;
  }
  if (slotData.statLines && Array.isArray(slotData.statLines)) {
    slotData.statLines.forEach((statLine) => {
      const statKey = getStatKey(statLine.type);
      if (statKey) {
        stats[statKey] = (stats[statKey] || 0) + statLine.value;
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
  getAllEquipmentData,
  getAvailableStats,
  getSlotConfig,
  getSlotData,
  getStatKey,
  isValidSlot,
  loadAllEquipmentData,
  setSlotData
};
//# sourceMappingURL=equipment.js.map
