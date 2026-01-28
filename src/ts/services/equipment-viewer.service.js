import { STAT } from "@ts/types/constants.js";
const SLOT_MAPPING = {
  "head": "Hat",
  "chest": "Top",
  "shoulders": "Shoulder",
  "legs": "Bottom",
  "neck": "Necklace",
  "eye-accessory": "Eye",
  "cape": "Cape",
  "belt": "Belt",
  "gloves": "Gloves",
  "boots": "Boots",
  "ring": "Ring"
};
const REVERSE_SLOT_MAPPING = Object.fromEntries(
  Object.entries(SLOT_MAPPING).map(([k, v]) => [v.toLowerCase(), k])
);
const STAT_MAPPING = {
  "attack": STAT.ATTACK.id,
  "base atk": STAT.ATTACK.id,
  "crit rate": STAT.CRIT_RATE.id,
  "critical rate": STAT.CRIT_RATE.id,
  "crit damage": STAT.CRIT_DAMAGE.id,
  "critical damage": STAT.CRIT_DAMAGE.id,
  "damage": STAT.DAMAGE.id,
  "normal monster": STAT.NORMAL_DAMAGE.id,
  "normal damage": STAT.NORMAL_DAMAGE.id,
  "boss damage": STAT.BOSS_DAMAGE.id,
  "boss monster damage": STAT.BOSS_DAMAGE.id,
  "defense": STAT.DEFENSE.id,
  "1st job skill": STAT.SKILL_LEVEL_1ST.id,
  "2nd job skill": STAT.SKILL_LEVEL_2ND.id,
  "3rd job skill": STAT.SKILL_LEVEL_3RD.id,
  "4th job skill": STAT.SKILL_LEVEL_4TH.id,
  "attack speed": STAT.ATTACK_SPEED.id,
  "min damage": STAT.MIN_DAMAGE.id,
  "max damage": STAT.MAX_DAMAGE.id,
  "final damage": STAT.FINAL_DAMAGE.id
};
const BASE_AMP_BY_LEVEL = {
  0: 0,
  1: 0.1,
  2: 0.2,
  3: 0.3,
  4: 0.4,
  5: 0.6,
  6: 0.75,
  7: 0.9,
  8: 1.05,
  9: 1.2,
  10: 1.5,
  11: 1.75,
  12: 2,
  13: 2.25,
  14: 2.5,
  15: 3,
  16: 3.5,
  17: 4,
  18: 4.5,
  19: 5,
  20: 6,
  21: 7,
  22: 9,
  23: 12,
  24: 15,
  25: 20
};
const SUB_AMP_BY_LEVEL = {
  0: 0,
  1: 0,
  2: 0,
  3: 0,
  4: 0,
  5: 0.1,
  6: 0.1,
  7: 0.1,
  8: 0.1,
  9: 0.1,
  10: 0.25,
  11: 0.25,
  12: 0.25,
  13: 0.25,
  14: 0.25,
  15: 0.5,
  16: 0.6,
  17: 0.7,
  18: 0.8,
  19: 0.9,
  20: 1,
  21: 1.1,
  22: 1.3,
  23: 1.6,
  24: 2,
  25: 2.5
};
const STORAGE_KEY = "equipmentViewerData";
function getEquipmentViewerData() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return null;
    }
    return JSON.parse(stored);
  } catch (e) {
    console.error("[EquipmentViewerService] Failed to read data:", e);
    return null;
  }
}
function saveEquipmentViewerData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error("[EquipmentViewerService] Failed to save data:", e);
  }
}
function hasEquipmentViewerData() {
  const data = getEquipmentViewerData();
  return data !== null && Array.isArray(data.allItems) && data.allItems.length > 0;
}
function getViewerSlotName(calcSlotId) {
  return SLOT_MAPPING[calcSlotId] || null;
}
function getCalcSlotId(viewerSlotName) {
  return REVERSE_SLOT_MAPPING[viewerSlotName.toLowerCase()] || null;
}
function convertItem(item, index, starForceBySlot) {
  const slot = String(item["Slot"] || "").trim();
  const rarity = String(item["Rarity"] || "").trim();
  const level = parseInt(String(item["Level"] || "0"), 10) || 0;
  const isManualFinal = item._manualFinal === true;
  const sfLevel = starForceBySlot[slot] || 0;
  const clampedLevel = Math.max(0, Math.min(25, Math.floor(sfLevel)));
  const baseAmp = BASE_AMP_BY_LEVEL[clampedLevel] || 0;
  const subAmp = SUB_AMP_BY_LEVEL[clampedLevel] || 0;
  let baseAtk = parseFloat(String(item["Base Atk"] || item["Attack"] || "0")) || 0;
  if (!isManualFinal && baseAmp > 0) {
    baseAtk = baseAtk * (1 + baseAmp);
  }
  const stats = [];
  for (const [key, value] of Object.entries(item)) {
    if (typeof value !== "number" && typeof value !== "string") continue;
    if (["Slot", "Level", "Rarity", "Equipped?", "Locked?", "New?", "Base Atk", "Attack", "_manualFinal", "_isNewRow"].includes(key)) continue;
    const numValue = parseFloat(String(value));
    if (isNaN(numValue) || numValue === 0) continue;
    const statId = STAT_MAPPING[key.toLowerCase()];
    if (!statId) continue;
    let finalValue = numValue;
    if (!isManualFinal && subAmp > 0) {
      finalValue = numValue * (1 + subAmp);
    }
    stats.push({ type: statId, value: Math.round(finalValue * 10) / 10 });
  }
  let name = "";
  if (rarity) name += rarity + " ";
  if (slot) name += slot;
  if (level) name += ` Lv${level}`;
  name = name.trim() || "Unnamed Item";
  return {
    name,
    attack: Math.round(baseAtk),
    stats,
    isNew: String(item["New?"] || "").trim().toUpperCase() === "Y",
    isEquipped: String(item["Equipped?"] || "").trim().toUpperCase() === "Y",
    rarity,
    level,
    viewerIndex: index
  };
}
function getItemsForSlot(calcSlotId) {
  const data = getEquipmentViewerData();
  if (!data || !data.allItems) return [];
  const viewerSlotName = getViewerSlotName(calcSlotId);
  if (!viewerSlotName) return [];
  const starForceBySlot = data.starForceBySlot || {};
  return data.allItems.map((item, index) => ({ item, index })).filter(({ item }) => {
    const itemSlot = String(item["Slot"] || "").trim().toLowerCase();
    return itemSlot === viewerSlotName.toLowerCase();
  }).map(({ item, index }) => convertItem(item, index, starForceBySlot));
}
function getItemsForSlotSeparated(calcSlotId) {
  const items = getItemsForSlot(calcSlotId);
  let equippedItem = null;
  const comparisonItems = [];
  for (const item of items) {
    if (item.isEquipped && !equippedItem) {
      equippedItem = item;
    } else {
      comparisonItems.push(item);
    }
  }
  return { equippedItem, comparisonItems };
}
function getAllEquippedItems() {
  const result = {};
  for (const slotId of Object.keys(SLOT_MAPPING)) {
    const { equippedItem } = getItemsForSlotSeparated(slotId);
    result[slotId] = equippedItem;
  }
  return result;
}
function getItemCountsBySlot() {
  const data = getEquipmentViewerData();
  if (!data || !data.allItems) return {};
  const counts = {};
  for (const item of data.allItems) {
    const viewerSlot = String(item["Slot"] || "").trim();
    const calcSlot = getCalcSlotId(viewerSlot);
    if (calcSlot) {
      counts[calcSlot] = (counts[calcSlot] || 0) + 1;
    }
  }
  return counts;
}
function setItemEquipped(viewerIndex) {
  const data = getEquipmentViewerData();
  if (!data || !data.allItems || !data.allItems[viewerIndex]) {
    return false;
  }
  const targetItem = data.allItems[viewerIndex];
  const targetSlot = String(targetItem["Slot"] || "").trim().toLowerCase();
  for (const item of data.allItems) {
    const itemSlot = String(item["Slot"] || "").trim().toLowerCase();
    if (itemSlot === targetSlot) {
      item["Equipped?"] = "";
    }
  }
  targetItem["Equipped?"] = "Y";
  saveEquipmentViewerData(data);
  return true;
}
function removeItem(viewerIndex) {
  const data = getEquipmentViewerData();
  if (!data || !data.allItems || !data.allItems[viewerIndex]) {
    return false;
  }
  data.allItems.splice(viewerIndex, 1);
  saveEquipmentViewerData(data);
  return true;
}
if (typeof window !== "undefined") {
  window.__equipmentViewerService = {
    getData: getEquipmentViewerData,
    hasData: hasEquipmentViewerData,
    getItemsForSlot,
    getItemsSeparated: getItemsForSlotSeparated,
    getAllEquipped: getAllEquippedItems,
    setEquipped: setItemEquipped,
    removeItem
  };
}
export {
  getAllEquippedItems,
  getCalcSlotId,
  getEquipmentViewerData,
  getItemCountsBySlot,
  getItemsForSlot,
  getItemsForSlotSeparated,
  getViewerSlotName,
  hasEquipmentViewerData,
  removeItem,
  saveEquipmentViewerData,
  setItemEquipped
};
//# sourceMappingURL=equipment-viewer.service.js.map
