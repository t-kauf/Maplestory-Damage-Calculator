const COMPANION_CLASSES = [
  "Hero",
  "DarkKnight",
  "ArchMageIL",
  "ArchMageFP",
  "BowMaster",
  "Marksman",
  "NightLord",
  "Shadower"
];
const COMPANION_RARITIES = [
  "Normal",
  "Rare",
  "Epic",
  "Unique",
  "Legendary"
];
const CLASS_DISPLAY_NAMES = {
  "Hero": "Hero",
  "DarkKnight": "Dark Knight",
  "ArchMageIL": "I/L Mage",
  "ArchMageFP": "F/P Mage",
  "BowMaster": "Bow Master",
  "Marksman": "Marksman",
  "NightLord": "Night Lord",
  "Shadower": "Shadower"
};
const CLASS_ORDER = [
  "Hero",
  "DarkKnight",
  "ArchMageIL",
  "ArchMageFP",
  "BowMaster",
  "Marksman",
  "NightLord",
  "Shadower"
];
const RARITY_CONFIG = {
  "Normal": {
    color: "#ffffff",
    borderColor: "#888888",
    count: 4,
    classes: ["Hero", "ArchMageIL", "BowMaster", "Shadower"]
    // Only first 4 classes
  },
  "Rare": {
    color: "#00ccff",
    borderColor: "#5d87df",
    count: 8,
    classes: CLASS_ORDER
    // All 8 classes
  },
  "Epic": {
    color: "#bb77ff",
    borderColor: "#7e5ad4",
    count: 8,
    classes: CLASS_ORDER
  },
  "Unique": {
    color: "#ffaa00",
    borderColor: "#e8a019",
    count: 8,
    classes: CLASS_ORDER
  },
  "Legendary": {
    color: "#1fffca",
    borderColor: "#2dbd7a",
    count: 8,
    classes: CLASS_ORDER
  }
};
const EMPTY_PRESET = {
  main: null,
  subs: [null, null, null, null, null, null]
};
const DEFAULT_COMPANION_STATE = {
  companions: {},
  presets: {
    "preset1": { ...EMPTY_PRESET },
    "preset2": { ...EMPTY_PRESET },
    "preset3": { ...EMPTY_PRESET },
    "preset4": { ...EMPTY_PRESET },
    "preset5": { ...EMPTY_PRESET },
    "preset6": { ...EMPTY_PRESET },
    "preset7": { ...EMPTY_PRESET },
    "preset8": { ...EMPTY_PRESET },
    "preset9": { ...EMPTY_PRESET },
    "preset10": { ...EMPTY_PRESET },
    "preset11": { ...EMPTY_PRESET },
    "preset12": { ...EMPTY_PRESET },
    "preset13": { ...EMPTY_PRESET },
    "preset14": { ...EMPTY_PRESET },
    "preset15": { ...EMPTY_PRESET },
    "preset16": { ...EMPTY_PRESET },
    "preset17": { ...EMPTY_PRESET },
    "preset18": { ...EMPTY_PRESET },
    "preset19": { ...EMPTY_PRESET },
    "preset20": { ...EMPTY_PRESET },
    "optimal-boss": { ...EMPTY_PRESET },
    "optimal-normal": { ...EMPTY_PRESET }
  },
  equippedPresetId: "preset1",
  showPresetDpsComparison: false,
  lockedMainCompanion: {
    "optimal-boss": null,
    "optimal-normal": null
  }
};
const COMPANION_STAT_KEY_TO_STAT_ID = {
  // Core stats
  "Attack": "attack",
  "MainStat": "mainStat",
  // Damage stats
  "damage": "damage",
  "bossDamage": "bossDamage",
  "normalDamage": "normalDamage",
  "minDamage": "minDamage",
  "maxDamage": "maxDamage",
  // Combat stats
  "critRate": "critRate",
  "attackSpeed": "attackSpeed"
};
export {
  CLASS_DISPLAY_NAMES,
  CLASS_ORDER,
  COMPANION_CLASSES,
  COMPANION_RARITIES,
  COMPANION_STAT_KEY_TO_STAT_ID,
  DEFAULT_COMPANION_STATE,
  EMPTY_PRESET,
  RARITY_CONFIG
};
//# sourceMappingURL=companions.types.js.map
