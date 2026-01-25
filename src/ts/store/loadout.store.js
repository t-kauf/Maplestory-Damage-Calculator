import { DEFAULT_LOADOUT_DATA } from "@ts/types/loadout.js";
import { CONTENT_TYPE, JOB_TIER, MASTERY_TYPE, DEFAULT_BASE_STATS, STAT } from "@ts/types/constants.js";
const _LoadoutStore = class _LoadoutStore {
  // ========================================================================
  // CONSTRUCTOR
  // ========================================================================
  constructor() {
    this.isInitialized = false;
    this.data = JSON.parse(JSON.stringify(DEFAULT_LOADOUT_DATA));
  }
  /**
   * Helper: Get uppercase StatKey from camelCase id
   */
  static statKeyFromId(id) {
    for (const [key, stat] of Object.entries(STAT)) {
      if (stat.id === id) return key;
    }
    return id;
  }
  // ========================================================================
  // INITIALIZATION
  // ========================================================================
  /**
   * Initialize store - loads from localStorage, handles migration
   * Call this at the top of loadout-page init
   *
   * @returns Promise that resolves when initialization is complete
   */
  async initialize() {
    if (this.isInitialized) {
      console.warn("LoadoutStore already initialized");
      return;
    }
    const newData = localStorage.getItem("loadout-data");
    if (newData) {
      try {
        this.data = JSON.parse(newData);
        console.log("LoadoutStore: Loaded from new format (loadout-data)");
      } catch (e) {
        console.error("LoadoutStore: Failed to parse loadout-data, falling back to migration", e);
        this.migrateFromLegacy();
      }
    } else {
      this.migrateFromLegacy();
    }
    this.validateAndFillDefaults();
    this.isInitialized = true;
    console.log("LoadoutStore: Initialization complete", this.data);
  }
  /**
   * Migrate data from legacy localStorage keys to new format
   */
  migrateFromLegacy() {
    console.log("LoadoutStore: Migrating from legacy format...");
    const legacyDataStr = localStorage.getItem("damageCalculatorData");
    const selectedClass = localStorage.getItem("selectedClass");
    const selectedJobTier = localStorage.getItem("selectedJobTier");
    if (!legacyDataStr && !selectedClass && !selectedJobTier) {
      console.log("LoadoutStore: No legacy data found, using defaults");
      return;
    }
    const legacy = legacyDataStr ? JSON.parse(legacyDataStr) : {};
    if (legacy.baseSetup) {
      Object.entries(legacy.baseSetup).forEach(([key, value]) => {
        if (key === "character-level" && typeof value === "string") {
          this.data.character.level = parseFloat(value);
          return;
        }
        if (typeof value === "number") {
          this.data.baseStats[key] = value;
        } else if (typeof value === "string") {
          const parsed = parseFloat(value);
          if (!isNaN(parsed)) {
            this.data.baseStats[key] = parsed;
          }
        }
      });
    }
    if (legacy.weapons) {
      Object.entries(legacy.weapons).forEach(([key, weapon]) => {
        this.data.weapons[key] = {
          level: typeof weapon.level === "number" ? weapon.level : parseInt(weapon.level) || 0,
          stars: typeof weapon.stars === "number" ? weapon.stars : parseInt(weapon.stars) || 0,
          equipped: weapon.equipped || false
        };
      });
    }
    if (legacy.masteryBonuses) {
      const tiers = [JOB_TIER.THIRD, JOB_TIER.FOURTH];
      const types = [MASTERY_TYPE.ALL, MASTERY_TYPE.BOSS];
      tiers.forEach((tier) => {
        types.forEach((type) => {
          const tierData = legacy.masteryBonuses[tier];
          if (tierData && tierData[type]) {
            this.data.mastery[tier][type] = { ...tierData[type] };
          }
        });
      });
    }
    if (legacy.contentType) {
      this.data.target.contentType = legacy.contentType;
    }
    if (legacy.subcategory) {
      this.data.target.subcategory = legacy.subcategory;
    }
    if (legacy.selectedStage) {
      this.data.target.selectedStage = legacy.selectedStage;
    }
    if (selectedClass) {
      this.data.character.class = selectedClass;
    }
    if (selectedJobTier) {
      this.data.character.jobTier = selectedJobTier;
    }
    let companions = localStorage.getItem("companions");
    let presets = localStorage.getItem("presets");
    const equippedPresetId = localStorage.getItem("equippedPresetId");
    const showPresetDpsComparison = localStorage.getItem("showPresetDpsComparison");
    const lockedMainCompanion = localStorage.getItem("lockedMainCompanion");
    if (!companions && legacy && legacy.companions) {
      companions = JSON.stringify(legacy.companions);
    }
    if (companions) {
      try {
        const companionsData = JSON.parse(companions);
        const migratedCompanions = {};
        Object.entries(companionsData).forEach(([key, value]) => {
          if (value && typeof value === "object") {
            migratedCompanions[key] = {
              unlocked: value.unlocked ?? false,
              level: value.level ?? 1
              // 'equipped' field is no longer needed
            };
          }
        });
        this.data.companions.companions = migratedCompanions;
      } catch (e) {
        console.error("Failed to parse companions data", e);
      }
    }
    if (presets) {
      try {
        this.data.companions.presets = JSON.parse(presets);
      } catch (e) {
        console.error("Failed to parse presets data", e);
      }
    }
    if (equippedPresetId) {
      this.data.companions.equippedPresetId = equippedPresetId;
    }
    if (showPresetDpsComparison) {
      this.data.companions.showPresetDpsComparison = showPresetDpsComparison === "true";
    }
    if (lockedMainCompanion) {
      try {
        this.data.companions.lockedMainCompanion = JSON.parse(lockedMainCompanion);
      } catch (e) {
        console.error("Failed to parse lockedMainCompanion data", e);
      }
    }
    const equipmentSlotsData = localStorage.getItem("equipmentSlots");
    let equipmentSlotIds = [];
    if (equipmentSlotsData) {
      try {
        const slotNamesObj = JSON.parse(equipmentSlotsData);
        Object.keys(slotNamesObj).forEach((slotName) => {
          equipmentSlotIds.push(slotName);
          if (this.data.equipment[slotName]) return;
          const equippedKey = `equipped.${slotName}`;
          const equippedData = localStorage.getItem(equippedKey);
          if (equippedData) {
            try {
              const slotData = JSON.parse(equippedData);
              this.data.equipment[slotName] = slotData;
              console.log(`LoadoutStore: Migrated ${equippedKey} to loadout-data.equipment.${slotName}`);
            } catch (e) {
              console.error(`Failed to parse ${equippedKey} data`, e);
            }
          }
        });
        console.log("LoadoutStore: Migrated equipment data from equipmentSlots");
      } catch (e) {
        console.error("Failed to parse equipmentSlots data", e);
      }
    }
    console.log("LoadoutStore: Migration complete, saving to new format...");
    this.saveDualWrite();
    console.log("LoadoutStore: Cleaning up old localStorage keys...");
    const keysToDelete = [
      "selectedClass",
      "selectedJobTier",
      "lockedMainCompanion",
      "showPresetDpsComparison",
      "presets",
      "companions",
      "damageCalculatorData",
      // Old legacy format
      "equipmentSlots",
      // Old equipment slots format
      ...equipmentSlotIds.map((slotId) => `equipped.${slotId}`)
      // Equipment keys
    ];
    keysToDelete.forEach((key) => {
      localStorage.removeItem(key);
    });
    console.log(`LoadoutStore: Deleted ${keysToDelete.length} old localStorage keys`);
  }
  /**
   * Migrate stat keys from legacy hyphenated/camelCase format to uppercase StatKey
   * Called during initialization - completely transparent to consumers
   */
  migrateStatKeys() {
    const migratedStats = {};
    let hasMigrations = false;
    Object.entries(this.data.baseStats).forEach(([key, value]) => {
      const migratedKey = _LoadoutStore.STAT_KEY_MIGRATION[key];
      if (migratedKey) {
        migratedStats[migratedKey] = value;
        hasMigrations = true;
      } else {
        migratedStats[key] = value;
      }
    });
    if (hasMigrations) {
      this.data.baseStats = migratedStats;
      console.log("LoadoutStore: Migrated stat keys to uppercase StatKey format");
    }
  }
  /**
   * Validate data structure and fill missing fields with defaults
   */
  validateAndFillDefaults() {
    this.migrateStatKeys();
    const defaults = DEFAULT_LOADOUT_DATA;
    if (!this.data.baseStats) {
      this.data.baseStats = {};
    }
    const cleanedStats = {};
    Object.keys(STAT).forEach((statKey) => {
      const statId = STAT[statKey].id;
      let value = this.data.baseStats[statKey];
      if (value === void 0) {
        value = this.data.baseStats[statId];
        if (value !== void 0) {
          delete this.data.baseStats[statId];
        }
      }
      cleanedStats[statKey] = value ?? DEFAULT_BASE_STATS[statId];
    });
    this.data.baseStats = cleanedStats;
    if (!this.data.character) {
      this.data.character = { ...defaults.character };
    }
    if (typeof this.data.character.level !== "number") {
      this.data.character.level = defaults.character.level;
    }
    if (this.data.character.class === void 0) {
      this.data.character.class = defaults.character.class;
    }
    if (!this.data.character.jobTier || ![JOB_TIER.THIRD, JOB_TIER.FOURTH].includes(this.data.character.jobTier)) {
      this.data.character.jobTier = defaults.character.jobTier;
    }
    if (!this.data.weapons) {
      this.data.weapons = {};
    }
    if (!this.data.mastery) {
      this.data.mastery = { ...defaults.mastery };
    }
    [JOB_TIER.THIRD, JOB_TIER.FOURTH].forEach((tier) => {
      if (!this.data.mastery[tier]) {
        this.data.mastery[tier] = { [MASTERY_TYPE.ALL]: {}, [MASTERY_TYPE.BOSS]: {} };
      }
      [MASTERY_TYPE.ALL, MASTERY_TYPE.BOSS].forEach((type) => {
        if (!this.data.mastery[tier][type]) {
          this.data.mastery[tier][type] = {};
        }
      });
    });
    if (!this.data.target) {
      this.data.target = { ...defaults.target };
    }
    if (!this.data.target.contentType) {
      this.data.target.contentType = CONTENT_TYPE.NONE;
    }
    if (!this.data.weaponAttackBonus) {
      this.data.weaponAttackBonus = { ...defaults.weaponAttackBonus };
    }
    if (typeof this.data.weaponAttackBonus.totalAttack !== "number") {
      this.data.weaponAttackBonus.totalAttack = defaults.weaponAttackBonus.totalAttack;
    }
    if (typeof this.data.weaponAttackBonus.equippedAttack !== "number") {
      this.data.weaponAttackBonus.equippedAttack = defaults.weaponAttackBonus.equippedAttack;
    }
    if (!this.data.companions) {
      this.data.companions = { ...defaults.companions };
    }
    if (!this.data.companions.companions) {
      this.data.companions.companions = {};
    }
    if (!this.data.companions.presets) {
      this.data.companions.presets = { ...defaults.companions.presets };
    }
    const presetIds = [
      "preset1",
      "preset2",
      "preset3",
      "preset4",
      "preset5",
      "optimal-boss",
      "optimal-normal"
    ];
    presetIds.forEach((presetId) => {
      const preset = this.data.companions.presets[presetId];
      if (!preset) {
        this.data.companions.presets[presetId] = { ...defaults.companions.presets[presetId] };
      } else {
        if (!preset.main) {
          preset.main = null;
        }
        if (!preset.subs || preset.subs.length !== 6) {
          preset.subs = [null, null, null, null, null, null];
        }
        if (presetId === "optimal-boss" || presetId === "optimal-normal") {
          this.data.companions.presets[presetId] = {
            main: null,
            subs: [null, null, null, null, null, null]
          };
        }
      }
    });
    if (!this.data.companions.equippedPresetId || !presetIds.includes(this.data.companions.equippedPresetId)) {
      this.data.companions.equippedPresetId = defaults.companions.equippedPresetId;
    }
    if (typeof this.data.companions.showPresetDpsComparison !== "boolean") {
      this.data.companions.showPresetDpsComparison = defaults.companions.showPresetDpsComparison;
    }
    if (!this.data.companions.lockedMainCompanion) {
      this.data.companions.lockedMainCompanion = { ...defaults.companions.lockedMainCompanion };
    }
    if (!this.data.equipment) {
      this.data.equipment = { ...defaults.equipment };
    }
    const equipmentSlots = [
      "head",
      "cape",
      "chest",
      "shoulders",
      "legs",
      "belt",
      "gloves",
      "boots",
      "ring",
      "neck",
      "eye-accessory"
    ];
    const allSlotsNull = equipmentSlots.every((slotId) => this.data.equipment[slotId] === null);
    if (allSlotsNull) {
      const equipmentSlotsData = localStorage.getItem("equipmentSlots");
      if (equipmentSlotsData) {
        try {
          const legacySlots = JSON.parse(equipmentSlotsData);
          let migratedCount = 0;
          equipmentSlots.forEach((slotId) => {
            const legacyData = legacySlots[slotId];
            if (legacyData) {
              const statLines = [];
              if (legacyData.damageAmp > 0) {
                statLines.push({ type: STAT.DAMAGE_AMP.id, value: legacyData.damageAmp });
              }
              this.data.equipment[slotId] = {
                name: "",
                attack: legacyData.attack,
                mainStat: legacyData.mainStat,
                statLines
              };
              migratedCount++;
            }
          });
          if (migratedCount > 0) {
            console.log(`LoadoutStore: Recovered ${migratedCount} equipment slots from legacy equipmentSlots data`);
            localStorage.removeItem("equipmentSlots");
            this.saveDualWrite();
          }
        } catch (e) {
          console.error("Failed to recover equipmentSlots data", e);
        }
      }
    }
    equipmentSlots.forEach((slotId) => {
      if (this.data.equipment[slotId] === void 0) {
        this.data.equipment[slotId] = null;
      }
    });
  }
  // ========================================================================
  // GETTERS - Return pre-hydrated data with safe defaults
  // ========================================================================
  /**
   * Get all base stats as key-value object
   * @returns All base stats with type safety
   */
  getBaseStats() {
    return { ...this.data.baseStats };
  }
  /**
   * Get a single base stat value
   * @param key - Stat key (e.g., "attack", "crit-rate")
   * @returns Stat value (0 if not set)
   */
  getBaseStat(key) {
    return this.data.baseStats[key] ?? 0;
  }
  /**
   * Get all weapons data
   * @returns Weapons object indexed by rarity-tier key
   */
  getWeapons() {
    return { ...this.data.weapons };
  }
  /**
   * Get single weapon data
   * @param key - Weapon key (e.g., "legendary-t4")
   * @returns Weapon data or null if not found
   */
  getWeapon(key) {
    return this.data.weapons[key] ? { ...this.data.weapons[key] } : null;
  }
  /**
   * Get mastery bonuses
   * @returns Complete mastery bonus object
   */
  getMastery() {
    return JSON.parse(JSON.stringify(this.data.mastery));
  }
  /**
   * Get specific mastery checkbox state
   * @param tier - Mastery tier ('3rd' or '4th')
   * @param type - Mastery type ('all' or 'boss')
   * @param level - Mastery level (e.g., '64', '124')
   * @returns Checkbox state (false if not set)
   */
  getMasteryCheckbox(tier, type, level) {
    return this.data.mastery[tier][type][level] ?? false;
  }
  /**
   * Get target selection
   * @returns Target selection object
   */
  getTarget() {
    return { ...this.data.target };
  }
  /**
   * Get character metadata
   * @returns Character metadata object
   */
  getCharacter() {
    return { ...this.data.character };
  }
  /**
   * Get selected class
   * @returns Selected class name or null
   */
  getSelectedClass() {
    return this.data.character.class;
  }
  /**
   * Get selected job tier
   * @returns Job tier ('3rd' or '4th')
   */
  getSelectedJobTier() {
    return this.data.character.jobTier;
  }
  /**
   * Get character level
   * @returns Character level
   */
  getCharacterLevel() {
    return this.data.character.level;
  }
  /**
   * Get weapon attack bonus
   * @returns Weapon attack bonus object with totalAttack and equippedAttack
   */
  getWeaponAttackBonus() {
    return { ...this.data.weaponAttackBonus };
  }
  /**
   * Get entire loadout data (for export/debugging)
   * @returns Deep clone of loadout data
   */
  getAllData() {
    return JSON.parse(JSON.stringify(this.data));
  }
  // ========================================================================
  // COMPANION GETTERS
  // ========================================================================
  /**
   * Get all companion state
   * @returns Complete companion state
   */
  getCompanions() {
    return { ...this.data.companions };
  }
  /**
   * Get a single companion's data
   * @param companionKey - Companion key (e.g., 'Hero-Legendary')
   * @returns Companion data (returns default locked state if not found)
   */
  getCompanion(companionKey) {
    if (!this.data.companions.companions[companionKey]) {
      return { unlocked: false, level: 1 };
    }
    return { ...this.data.companions.companions[companionKey] };
  }
  /**
   * Get all presets
   * @returns All presets
   */
  getPresets() {
    return JSON.parse(JSON.stringify(this.data.companions.presets));
  }
  /**
   * Get a single preset
   * @param presetId - Preset ID
   * @returns Preset data
   */
  getPreset(presetId) {
    return JSON.parse(JSON.stringify(this.data.companions.presets[presetId]));
  }
  /**
   * Get equipped preset ID
   * @returns Currently equipped preset ID
   */
  getEquippedPresetId() {
    return this.data.companions.equippedPresetId;
  }
  /**
   * Get show preset DPS comparison setting
   * @returns Whether to show DPS comparison
   */
  getShowPresetDpsComparison() {
    return this.data.companions.showPresetDpsComparison;
  }
  /**
   * Get locked main companion for optimal presets
   * @param optimalType - 'optimal-boss' or 'optimal-normal'
   * @returns Locked companion key or null
   */
  getLockedMainCompanion(optimalType) {
    return this.data.companions.lockedMainCompanion[optimalType];
  }
  // ========================================================================
  // SETTERS - Partial updates with immediate save
  // ========================================================================
  /**
   * Update multiple base stats at once
   * @param updates - Object mapping stat keys (hyphenated, camelCase, or uppercase) to values
   */
  updateBaseStats(updates) {
    const normalizedUpdates = {};
    Object.entries(updates).forEach(([key, value]) => {
      let normalizedKey = key;
      const hyphenatedMigrated = _LoadoutStore.STAT_KEY_MIGRATION[key];
      if (hyphenatedMigrated) {
        normalizedKey = hyphenatedMigrated;
      }
      const uppercased = _LoadoutStore.CAMELCASE_TO_UPPERCASE[normalizedKey];
      if (uppercased) {
        normalizedKey = uppercased;
      }
      normalizedUpdates[normalizedKey] = value;
    });
    Object.assign(this.data.baseStats, normalizedUpdates);
    this.saveDualWrite();
  }
  /**
   * Update single base stat
   * @param key - Stat key (accepts hyphenated, camelCase, or uppercase)
   * @param value - New value
   */
  updateBaseStat(key, value) {
    let normalizedKey = key;
    const hyphenatedMigrated = _LoadoutStore.STAT_KEY_MIGRATION[key];
    if (hyphenatedMigrated) {
      normalizedKey = hyphenatedMigrated;
    }
    const uppercased = _LoadoutStore.CAMELCASE_TO_UPPERCASE[normalizedKey];
    if (uppercased) {
      normalizedKey = uppercased;
    }
    this.data.baseStats[normalizedKey] = value;
    this.saveDualWrite();
  }
  /**
   * Update weapon data
   * @param key - Weapon key (e.g., "legendary-t4")
   * @param data - Partial weapon data to update
   */
  updateWeapon(key, data) {
    if (!this.data.weapons[key]) {
      this.data.weapons[key] = { level: 0, stars: 0, equipped: false };
    }
    this.data.weapons[key] = { ...this.data.weapons[key], ...data };
    this.saveDualWrite();
  }
  /**
   * Update mastery checkbox state
   * @param tier - Mastery tier ('3rd' or '4th')
   * @param type - Mastery type ('all' or 'boss')
   * @param level - Mastery level (e.g., '64', '124')
   * @param checked - Checkbox state
   */
  updateMasteryCheckbox(tier, type, level, checked) {
    this.data.mastery[tier][type][level] = checked;
    this.saveDualWrite();
  }
  /**
   * Update target selection
   * @param data - Partial target data
   */
  updateTarget(data) {
    Object.assign(this.data.target, data);
    this.saveDualWrite();
  }
  /**
   * Update character metadata
   * @param data - Partial character data
   */
  updateCharacter(data) {
    Object.assign(this.data.character, data);
    this.saveDualWrite();
  }
  /**
   * Update equipment data for a specific slot
   * @param slotId - Equipment slot ID
   * @param data - Equipment slot data
   */
  updateEquipment(slotId, data) {
    this.data.equipment[slotId] = data;
    this.saveDualWrite();
  }
  /**
   * Get all equipment data
   */
  getEquipmentData() {
    return this.data.equipment;
  }
  /**
   * Set selected class
   * @param className - Class name or null
   */
  setSelectedClass(className) {
    this.data.character.class = className;
    this.saveDualWrite();
  }
  /**
   * Set selected job tier
   * @param jobTier - Job tier ('3rd' or '4th')
   */
  setSelectedJobTier(jobTier) {
    this.data.character.jobTier = jobTier;
    this.saveDualWrite();
  }
  /**
   * Set character level
   * @param level - Character level
   */
  setCharacterLevel(level) {
    this.data.character.level = level;
    this.saveDualWrite();
  }
  /**
   * Update weapon attack bonus
   * @param data - Partial weapon attack bonus data
   */
  updateWeaponAttackBonus(data) {
    Object.assign(this.data.weaponAttackBonus, data);
    this.saveDualWrite();
  }
  // ========================================================================
  // COMPANION SETTERS
  // ========================================================================
  /**
   * Update companion data
   * @param companionKey - Companion key
   * @param data - Partial companion data to update
   */
  updateCompanion(companionKey, data) {
    if (!this.data.companions.companions[companionKey]) {
      this.data.companions.companions[companionKey] = { unlocked: false, level: 1 };
    }
    this.data.companions.companions[companionKey] = {
      ...this.data.companions.companions[companionKey],
      ...data
    };
    this.saveDualWrite();
  }
  /**
   * Set a preset slot
   * @param presetId - Preset ID
   * @param slotType - 'main' or 'sub'
   * @param slotIndex - Slot index (0 for main, 0-5 for subs)
   * @param companionKey - Companion key or null to clear
   */
  setPresetSlot(presetId, slotType, slotIndex, companionKey) {
    if (presetId === "optimal-boss" || presetId === "optimal-normal") {
      console.warn(`[LoadoutStore] Cannot modify optimal preset ${presetId} - it is calculated dynamically`);
      return;
    }
    const preset = this.data.companions.presets[presetId];
    if (!preset) return;
    if (slotType === "main") {
      preset.main = companionKey;
    } else {
      preset.subs[slotIndex] = companionKey;
    }
    this.saveDualWrite();
  }
  /**
   * Clear a preset slot
   * @param presetId - Preset ID
   * @param slotType - 'main' or 'sub'
   * @param slotIndex - Slot index (0 for main, 0-5 for subs)
   */
  clearPresetSlot(presetId, slotType, slotIndex) {
    if (presetId === "optimal-boss" || presetId === "optimal-normal") {
      console.warn(`[LoadoutStore] Cannot clear optimal preset ${presetId} - it is calculated dynamically`);
      return;
    }
    this.setPresetSlot(presetId, slotType, slotIndex, null);
  }
  /**
   * Set equipped preset ID
   * @param presetId - Preset ID to equip
   */
  setEquippedPresetId(presetId) {
    this.data.companions.equippedPresetId = presetId;
    this.saveDualWrite();
  }
  /**
   * Set show preset DPS comparison
   * @param show - Whether to show DPS comparison
   */
  setShowPresetDpsComparison(show) {
    this.data.companions.showPresetDpsComparison = show;
    this.saveDualWrite();
  }
  /**
   * Set locked main companion for optimal presets
   * @param optimalType - 'optimal-boss' or 'optimal-normal'
   * @param companionKey - Companion key or null to clear
   */
  setLockedMainCompanion(optimalType, companionKey) {
    this.data.companions.lockedMainCompanion[optimalType] = companionKey;
    this.saveDualWrite();
  }
  // ========================================================================
  // PERSISTENCE
  // ========================================================================
  /**
   * Save to localStorage
   * Note: Only writes to 'loadout-data' key. Legacy dual-write has been removed.
   */
  saveDualWrite() {
    localStorage.setItem("loadout-data", JSON.stringify(this.data));
  }
  /**
   * Convert new LoadoutData to legacy damageCalculatorData format
   * Used for dual-write backward compatibility
   */
  convertToLegacyFormat() {
    const reverseMigration = {};
    Object.entries(_LoadoutStore.STAT_KEY_MIGRATION).forEach(([hyphenated, upper]) => {
      reverseMigration[upper] = hyphenated;
    });
    const baseSetup = {};
    Object.entries(this.data.baseStats).forEach(([key, value]) => {
      const legacyKey = reverseMigration[key] ?? key;
      baseSetup[legacyKey] = value;
    });
    const legacy = {
      baseSetup,
      weapons: {},
      masteryBonuses: {
        [JOB_TIER.THIRD]: {
          [MASTERY_TYPE.ALL]: { ...this.data.mastery[JOB_TIER.THIRD][MASTERY_TYPE.ALL] },
          [MASTERY_TYPE.BOSS]: { ...this.data.mastery[JOB_TIER.THIRD][MASTERY_TYPE.BOSS] }
        },
        [JOB_TIER.FOURTH]: {
          [MASTERY_TYPE.ALL]: { ...this.data.mastery[JOB_TIER.FOURTH][MASTERY_TYPE.ALL] },
          [MASTERY_TYPE.BOSS]: { ...this.data.mastery[JOB_TIER.FOURTH][MASTERY_TYPE.BOSS] }
        }
      },
      contentType: this.data.target.contentType === CONTENT_TYPE.NONE ? void 0 : this.data.target.contentType,
      subcategory: this.data.target.subcategory ?? void 0,
      selectedStage: this.data.target.selectedStage ?? void 0
    };
    Object.entries(this.data.weapons).forEach(([key, weapon]) => {
      legacy.weapons[key] = {
        level: weapon.level,
        stars: weapon.stars,
        equipped: weapon.equipped
      };
    });
    return legacy;
  }
  // ========================================================================
  // TESTING/DEBUGGING HELPERS
  // ========================================================================
  /**
   * Reset store to defaults (for testing)
   */
  reset() {
    this.data = JSON.parse(JSON.stringify(DEFAULT_LOADOUT_DATA));
    this.saveDualWrite();
  }
  /**
   * Check if store is initialized
   */
  isReady() {
    return this.isInitialized;
  }
};
// ========================================================================
// PRIVATE MIGRATION MAP
// ========================================================================
/**
 * Migration map: legacy hyphenated keys → uppercase StatKey enum values
 * Used internally during data loading/migration
 */
_LoadoutStore.STAT_KEY_MIGRATION = {
  // Hyphenated → Uppercase StatKey
  "crit-rate": "CRIT_RATE",
  "crit-damage": "CRIT_DAMAGE",
  "stat-damage": "STAT_DAMAGE",
  "damage-amp": "DAMAGE_AMP",
  "damage": "DAMAGE",
  "attack-speed": "ATTACK_SPEED",
  "def-pen": "DEF_PEN",
  "boss-damage": "BOSS_DAMAGE",
  "normal-damage": "NORMAL_DAMAGE",
  "skill-coeff": "SKILL_COEFFICIENT",
  "skill-mastery": "MASTERY",
  "skill-mastery-boss": "BOSS_MASTERY",
  "min-damage": "MIN_DAMAGE",
  "max-damage": "MAX_DAMAGE",
  "primary-main-stat": "PRIMARY_MAIN_STAT",
  "main-stat": "PRIMARY_MAIN_STAT",
  "secondary-main-stat": "SECONDARY_MAIN_STAT",
  "final-damage": "FINAL_DAMAGE",
  "main-stat-pct": "MAIN_STAT_PCT",
  "skill-level-1st": "SKILL_LEVEL_1ST",
  "skill-level-2nd": "SKILL_LEVEL_2ND",
  "skill-level-3rd": "SKILL_LEVEL_3RD",
  "skill-level-4th": "SKILL_LEVEL_4TH",
  "skill-level-all": "SKILL_LEVEL_ALL",
  "basic-attack-damage": "BASIC_ATTACK_DAMAGE",
  "skill-damage": "SKILL_DAMAGE",
  "final-attack": "FINAL_ATTACK",
  "defense": "DEFENSE",
  "attack": "ATTACK",
  "str": "STR",
  "dex": "DEX",
  "int": "INT",
  "luk": "LUK"
};
/**
 * Reverse mapping: camelCase id → uppercase StatKey
 * Computed from STAT constant for normalizing all keys to uppercase
 */
_LoadoutStore.CAMELCASE_TO_UPPERCASE = Object.values(STAT).reduce((acc, stat) => {
  acc[stat.id] = _LoadoutStore.statKeyFromId(stat.id);
  return acc;
}, {});
let LoadoutStore = _LoadoutStore;
const loadoutStore = new LoadoutStore();
export {
  LoadoutStore,
  loadoutStore
};
//# sourceMappingURL=loadout.store.js.map
