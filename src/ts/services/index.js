import { COMPANION_DATA } from "../data/companion-data.js";
function getCompanionEffects(className, rarity, level) {
  if (!COMPANION_DATA.classes.includes(className)) {
    console.warn(`Invalid class: ${className}. Available classes:`, COMPANION_DATA.classes);
    return null;
  }
  if (!COMPANION_DATA.rarities.includes(rarity)) {
    console.warn(`Invalid rarity: ${rarity}. Available rarities:`, COMPANION_DATA.rarities);
    return null;
  }
  if (level < 1 || level > COMPANION_DATA.maxLevel) {
    console.warn(`Invalid level: ${level}. Must be between 1 and ${COMPANION_DATA.maxLevel}`);
    return null;
  }
  const classData = COMPANION_DATA.data[className];
  if (!classData || !classData[rarity]) {
    return null;
  }
  const rarityData = classData[rarity];
  const levelData = rarityData.levels[level];
  if (!levelData) {
    console.warn(`No data found for level ${level}`);
    return null;
  }
  return {
    inventoryEffect: levelData.inventoryEffect,
    equipEffect: levelData.equipEffect,
    supporterCode: parseInt(rarityData.supporterCode, 10),
    supporterIndex: parseInt(rarityData.supporterIndex, 10)
  };
}
function getCompanionClasses() {
  return [...COMPANION_DATA.classes];
}
function getCompanionRarities() {
  return [...COMPANION_DATA.rarities];
}
function getMaxCompanionLevel() {
  return COMPANION_DATA.maxLevel;
}
function getCompanionClassData(className) {
  if (!COMPANION_DATA.classes.includes(className)) {
    console.warn(`Invalid class: ${className}`);
    return null;
  }
  return COMPANION_DATA.data[className] || null;
}
function getAllCompanionKeys() {
  const keys = [];
  COMPANION_DATA.classes.forEach((className) => {
    COMPANION_DATA.rarities.forEach((rarity) => {
      keys.push(`${className}-${rarity}`);
    });
  });
  return keys;
}
function isValidCompanionKey(companionKey) {
  const [className, rarity] = companionKey.split("-");
  return COMPANION_DATA.classes.includes(className) && COMPANION_DATA.rarities.includes(rarity);
}
function parseCompanionKey(companionKey) {
  const [className, rarity] = companionKey.split("-");
  if (!className || !rarity) return null;
  if (!COMPANION_DATA.classes.includes(className) || !COMPANION_DATA.rarities.includes(rarity)) {
    return null;
  }
  return { className, rarity };
}
window.getCompanionEffects = getCompanionEffects;
export {
  COMPANION_DATA,
  getAllCompanionKeys,
  getCompanionClassData,
  getCompanionClasses,
  getCompanionEffects,
  getCompanionRarities,
  getMaxCompanionLevel,
  isValidCompanionKey,
  parseCompanionKey
};
//# sourceMappingURL=index.js.map
