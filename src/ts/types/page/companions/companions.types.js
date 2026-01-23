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
export {
  CLASS_DISPLAY_NAMES,
  CLASS_ORDER,
  COMPANION_CLASSES,
  COMPANION_RARITIES,
  DEFAULT_COMPANION_STATE,
  EMPTY_PRESET,
  RARITY_CONFIG
};
//# sourceMappingURL=companions.types.js.map
