/**
 * Centralized store for loadout data
 * Handles loading, saving, and migrating loadout configuration
 *
 * DATA FLOW:
 * 1. User changes DOM input
 * 2. Event listener fires UI handler
 * 3. UI handler calls loadoutStore.updateX()
 * 4. Store updates memory + saves to localStorage (dual-write)
 */

import type {
    LoadoutData,
    MasteryTier,
    MasteryType,
    LegacyDamageCalculatorData,
    BaseStats
} from '@ts/types/loadout';
import { DEFAULT_LOADOUT_DATA } from '@ts/types/loadout';
import { CONTENT_TYPE, JOB_TIER, MASTERY_TYPE, DEFAULT_BASE_STATS, STAT, type ContentType, type JobTier, type MasteryTypeValue, type StatKey } from '@ts/types/constants';
import type { CompanionKey, CompanionPresetId, CompanionPreset, CompanionData, CompanionState } from '@ts/types/page/companions/companions.types';
import type { EquipmentSlotId, EquipmentSlotData, StatLine } from '@ts/types/page/equipment/equipment.types';
import { EventEmitter } from '@ts/utils/event-emitter';

export class LoadoutStore extends EventEmitter {
    private data: LoadoutData;
    private isInitialized: boolean = false;

    // ========================================================================
    // CONSTRUCTOR
    // ========================================================================

    constructor() {
        super();
        // Initialize with empty data - will be populated by initialize()
        this.data = JSON.parse(JSON.stringify(DEFAULT_LOADOUT_DATA));
    }

    // ========================================================================
    // PRIVATE MIGRATION MAP
    // ========================================================================

    /**
     * Migration map: legacy hyphenated keys → uppercase StatKey enum values
     * Used internally during data loading/migration
     */
    private static readonly STAT_KEY_MIGRATION: Record<string, string> = {
        // Hyphenated → Uppercase StatKey
        'crit-rate': 'CRIT_RATE',
        'crit-damage': 'CRIT_DAMAGE',
        'stat-damage': 'STAT_DAMAGE',
        'damage-amp': 'DAMAGE_AMP',
        'damage': 'DAMAGE',
        'attack-speed': 'ATTACK_SPEED',
        'def-pen': 'DEF_PEN',
        'boss-damage': 'BOSS_DAMAGE',
        'normal-damage': 'NORMAL_DAMAGE',
        'skill-coeff': 'SKILL_COEFFICIENT',
        'skill-mastery': 'MASTERY',
        'skill-mastery-boss': 'BOSS_MASTERY',
        'min-damage': 'MIN_DAMAGE',
        'max-damage': 'MAX_DAMAGE',
        'primary-main-stat': 'PRIMARY_MAIN_STAT',
        'main-stat': 'PRIMARY_MAIN_STAT',
        'secondary-main-stat': 'SECONDARY_MAIN_STAT',
        'final-damage': 'FINAL_DAMAGE',
        'main-stat-pct': 'MAIN_STAT_PCT',
        'skill-level-1st': 'SKILL_LEVEL_1ST',
        'skill-level-2nd': 'SKILL_LEVEL_2ND',
        'skill-level-3rd': 'SKILL_LEVEL_3RD',
        'skill-level-4th': 'SKILL_LEVEL_4TH',
        'skill-level-all': 'SKILL_LEVEL_ALL',
        'basic-attack-damage': 'BASIC_ATTACK_DAMAGE',
        'skill-damage': 'SKILL_DAMAGE',
        'final-attack': 'FINAL_ATTACK',
        'defense': 'DEFENSE',
        'attack': 'ATTACK',
        'str': 'STR',
        'dex': 'DEX',
        'int': 'INT',
        'luk': 'LUK',
    };

    /**
     * Helper: Get uppercase StatKey from camelCase id
     */
    private static statKeyFromId(id: string): StatKey | string {
        for (const [key, stat] of Object.entries(STAT)) {
            if (stat.id === id) return key as StatKey;
        }
        return id;
    }

    /**
     * Reverse mapping: camelCase id → uppercase StatKey
     * Computed from STAT constant for normalizing all keys to uppercase
     */
    private static readonly CAMELCASE_TO_UPPERCASE: Record<string, string> =
        Object.values(STAT).reduce((acc, stat) => {
            acc[stat.id] = LoadoutStore.statKeyFromId(stat.id);
            return acc;
        }, {} as Record<string, string>);

    // ========================================================================
    // INITIALIZATION
    // ========================================================================

    /**
     * Initialize store - loads from localStorage, handles migration
     * Call this at the top of loadout-page init
     *
     * @returns Promise that resolves when initialization is complete
     */
    async initialize(): Promise<void> {
        if (this.isInitialized) {
            console.warn('LoadoutStore already initialized');
            return;
        }

        // 1. Try loading from new 'loadout-data' key
        const newData = localStorage.getItem('loadout-data');

        if (newData) {
            try {
                this.data = JSON.parse(newData);   
                this.emit('data:initialized', { data: this.data });             
            } catch (e) {
                console.error('LoadoutStore: Failed to parse loadout-data, falling back to migration', e);
                this.migrateFromLegacy();
            }
        } else {
            // 2. If new key doesn't exist, migrate from old keys
            this.migrateFromLegacy();
        }

        // 3. Validate and fill in missing fields with defaults
        this.validateAndFillDefaults();

        this.isInitialized = true;
    }

    /**
     * Migrate data from legacy localStorage keys to new format
     */
    private migrateFromLegacy(): void {
        const legacyDataStr = localStorage.getItem('damageCalculatorData');
        const selectedClass = localStorage.getItem('selectedClass');
        const selectedJobTier = localStorage.getItem('selectedJobTier');

        if (!legacyDataStr && !selectedClass && !selectedJobTier) {
            return;
        }

        const legacy: Partial<LegacyDamageCalculatorData> = legacyDataStr
            ? JSON.parse(legacyDataStr)
            : {};

        // Migrate baseStats
        if (legacy.baseSetup) {
            Object.entries(legacy.baseSetup).forEach(([key, value]) => {
                if(key === 'character-level' && typeof value === 'string')
                {
                    this.data.character.level = parseFloat(value);
                    return;
                }

                if (typeof value === 'number') {
                    this.data.baseStats[key] = value;
                } else if (typeof value === 'string') {
                    const parsed = parseFloat(value);
                    if (!isNaN(parsed)) {
                        this.data.baseStats[key] = parsed;
                    }
                }
            });
        }

        // Migrate weapons
        if (legacy.weapons) {
            Object.entries(legacy.weapons).forEach(([key, weapon]) => {
                this.data.weapons[key] = {
                    level: typeof weapon.level === 'number' ? weapon.level : parseInt(weapon.level) || 0,
                    stars: typeof weapon.stars === 'number' ? weapon.stars : parseInt(weapon.stars) || 0,
                    equipped: weapon.equipped || false
                };
            });
        }

        // Migrate mastery bonuses
        if (legacy.masteryBonuses) {
            const tiers: JobTier[] = [JOB_TIER.THIRD, JOB_TIER.FOURTH];
            const types: MasteryTypeValue[] = [MASTERY_TYPE.ALL, MASTERY_TYPE.BOSS];

            tiers.forEach(tier => {
                types.forEach(type => {
                    const tierData = legacy.masteryBonuses![tier];
                    if (tierData && tierData[type]) {
                        this.data.mastery[tier][type] = { ...tierData[type] };
                    }
                });
            });
        }

        // Migrate target selection
        if (legacy.contentType) {
            this.data.target.contentType = legacy.contentType as ContentType;
        }
        if (legacy.subcategory) {
            this.data.target.subcategory = legacy.subcategory;
        }
        if (legacy.selectedStage) {
            this.data.target.selectedStage = legacy.selectedStage;
        }

        // Migrate character data from separate keys
        if (selectedClass) {
            this.data.character.class = selectedClass;
        }
        if (selectedJobTier) {
            this.data.character.jobTier = selectedJobTier as JobTier;
        }

        // Migrate companions data
        // First try from separate localStorage keys
        let companions = localStorage.getItem('companions');
        let presets = localStorage.getItem('presets');
        const equippedPresetId = localStorage.getItem('equippedPresetId');
        const showPresetDpsComparison = localStorage.getItem('showPresetDpsComparison');
        const lockedMainCompanion = localStorage.getItem('lockedMainCompanion');

        // If companions not found in separate key, check legacy damageCalculatorData
        if (!companions && legacy && (legacy as any).companions) {
            companions = JSON.stringify((legacy as any).companions);
        }

        if (companions) {
            try {
                const companionsData = JSON.parse(companions);
                // Migrate each companion, removing 'equipped' field if present
                const migratedCompanions: Partial<Record<CompanionKey, CompanionData>> = {};
                Object.entries(companionsData).forEach(([key, value]: [string, any]) => {
                    if (value && typeof value === 'object') {
                        migratedCompanions[key as CompanionKey] = {
                            unlocked: value.unlocked ?? false,
                            level: value.level ?? 1
                            // 'equipped' field is no longer needed
                        };
                    }
                });
                // Type assertion: migrated data is valid as Record<CompanionKey, CompanionData>
                // since the validateAndFillDefaults() method will fill in missing keys
                this.data.companions.companions = migratedCompanions as Record<CompanionKey, CompanionData>;
            } catch (e) {
                console.error('Failed to parse companions data', e);
            }
        }

        if (presets) {
            try {
                this.data.companions.presets = JSON.parse(presets);
            } catch (e) {
                console.error('Failed to parse presets data', e);
            }
        }

        if (equippedPresetId) {
            this.data.companions.equippedPresetId = equippedPresetId as CompanionPresetId;
        }

        if (showPresetDpsComparison) {
            this.data.companions.showPresetDpsComparison = showPresetDpsComparison === 'true';
        }

        if (lockedMainCompanion) {
            try {
                this.data.companions.lockedMainCompanion = JSON.parse(lockedMainCompanion);
            } catch (e) {
                console.error('Failed to parse lockedMainCompanion data', e);
            }
        }

        // Migrate equipment data from equipmentSlots and equipped.X keys
        // equipmentSlots is an array of slot names (e.g., ["head", "cape", "chest"])
        // Each slot name is used to get equipped.{slotName} which contains EquipmentSlotData
        const equipmentSlotsData = localStorage.getItem('equipmentSlots');
        let equipmentSlotIds = [];
        if (equipmentSlotsData) {
            try {
                // Parse equipmentSlots as an object with slot names as keys
                const slotNamesObj: Record<string, unknown> = JSON.parse(equipmentSlotsData);

                Object.keys(slotNamesObj).forEach((slotName) => {
                    equipmentSlotIds.push(slotName);

                    // Skip if already migrated
                    if (this.data.equipment[slotName as EquipmentSlotId]) return;

                    const equippedKey = `equipped.${slotName}`;
                    const equippedData = localStorage.getItem(equippedKey);

                    if (equippedData) {
                        try {
                            // Parse as EquipmentSlotData and add to equipment object
                            const slotData: EquipmentSlotData = JSON.parse(equippedData);
                            this.data.equipment[slotName as EquipmentSlotId] = slotData;
                        } catch (e) {
                            console.error(`Failed to parse ${equippedKey} data`, e);
                        }
                    }
                });
            } catch (e) {
                console.error('Failed to parse equipmentSlots data', e);
            }
        }

        // Note: migrateStatKeys() will be called in validateAndFillDefaults() after this method
        this.saveDualWrite();

        // Clean up old localStorage keys that have been migrated to loadout-data
        const keysToDelete = [
            'selectedClass',
            'selectedJobTier',
            'lockedMainCompanion',
            'showPresetDpsComparison',
            'presets',
            'companions',
            'damageCalculatorData', // Old legacy format
            'equipmentSlots', // Old equipment slots format
            ...equipmentSlotIds.map(slotId => `equipped.${slotId}`) // Equipment keys
        ];

        keysToDelete.forEach(key => {
            localStorage.removeItem(key);
        });
    }

    /**
     * Migrate stat keys from legacy hyphenated/camelCase format to uppercase StatKey
     * Called during initialization - completely transparent to consumers
     */
    private migrateStatKeys(): void {
        const migratedStats: Record<string, number> = {};
        let hasMigrations = false;

        // Check each key in baseStats
        Object.entries(this.data.baseStats).forEach(([key, value]) => {
            const migratedKey = LoadoutStore.STAT_KEY_MIGRATION[key];
            if (migratedKey) {
                // Legacy hyphenated key found - migrate to uppercase StatKey
                migratedStats[migratedKey] = value;
                hasMigrations = true;
            } else {
                // Already in final format or unmapped - keep as-is
                migratedStats[key] = value;
            }
        });

        if (hasMigrations) {
            this.data.baseStats = migratedStats as BaseStats;
        }
    }

    /**
     * Validate data structure and fill missing fields with defaults
     */
    private validateAndFillDefaults(): void {
        // Migrate legacy stat keys to uppercase StatKey format (transparent to consumers)
        this.migrateStatKeys();

        const defaults = DEFAULT_LOADOUT_DATA;

        // Ensure baseStats exists and hydrate ALL fields with defaults
        // BaseStats uses uppercase StatKey enum keys (ATTACK, DEFENSE, etc.)
        if (!this.data.baseStats) {
            this.data.baseStats = {} as BaseStats;
        }

        const cleanedStats: Record<string, number> = {};

        // For each STAT key (uppercase), get the value or default
        (Object.keys(STAT) as StatKey[]).forEach(statKey => {
            const statId = STAT[statKey].id; // camelCase version (e.g., 'attack')

            // Check for value in uppercase key first
            let value = this.data.baseStats[statKey];

            // If not found, check camelCase id for backward compatibility with buggy migration
            if (value === undefined) {
                value = this.data.baseStats[statId as StatKey];
                // If found in camelCase, delete the old key to ensure clean state
                if (value !== undefined) {
                    delete this.data.baseStats[statId as StatKey];
                }
            }

            // Use value if found, otherwise use default
            cleanedStats[statKey] = value ?? DEFAULT_BASE_STATS[statId];
        });

        this.data.baseStats = cleanedStats as BaseStats;

        // Ensure character fields exist
        if (!this.data.character) {
            this.data.character = { ...defaults.character };
        }
        if (typeof this.data.character.level !== 'number') {
            this.data.character.level = defaults.character.level;
        }
        if (this.data.character.class === undefined) {
            this.data.character.class = defaults.character.class;
        }
        if (!this.data.character.jobTier || ![JOB_TIER.THIRD, JOB_TIER.FOURTH].includes(this.data.character.jobTier as JobTier)) {
            this.data.character.jobTier = defaults.character.jobTier;
        }

        // Ensure weapons exists
        if (!this.data.weapons) {
            this.data.weapons = {};
        }

        // Ensure mastery structure exists
        if (!this.data.mastery) {
            this.data.mastery = { ...defaults.mastery };
        }
        ([JOB_TIER.THIRD, JOB_TIER.FOURTH] as JobTier[]).forEach(tier => {
            if (!this.data.mastery[tier]) {
                this.data.mastery[tier] = { [MASTERY_TYPE.ALL]: {}, [MASTERY_TYPE.BOSS]: {} };
            }
            ([MASTERY_TYPE.ALL, MASTERY_TYPE.BOSS] as MasteryTypeValue[]).forEach(type => {
                if (!this.data.mastery[tier][type]) {
                    this.data.mastery[tier][type] = {};
                }
            });
        });

        // Ensure target exists
        if (!this.data.target) {
            this.data.target = { ...defaults.target };
        }
        if (!this.data.target.contentType) {
            this.data.target.contentType = CONTENT_TYPE.NONE;
        }

        // Ensure weaponAttackBonus exists
        if (!this.data.weaponAttackBonus) {
            this.data.weaponAttackBonus = { ...defaults.weaponAttackBonus };
        }
        if (typeof this.data.weaponAttackBonus.totalAttack !== 'number') {
            this.data.weaponAttackBonus.totalAttack = defaults.weaponAttackBonus.totalAttack;
        }
        if (typeof this.data.weaponAttackBonus.equippedAttack !== 'number') {
            this.data.weaponAttackBonus.equippedAttack = defaults.weaponAttackBonus.equippedAttack;
        }

        // Ensure companions exists
        if (!this.data.companions) {
            this.data.companions = { ...defaults.companions };
        }

        // Ensure companions.companions exists
        if (!this.data.companions.companions) {
            this.data.companions.companions = {} as Record<CompanionKey, CompanionData>;
        }

        // Ensure companions.presets exists and has all presets
        if (!this.data.companions.presets) {
            this.data.companions.presets = { ...defaults.companions.presets };
        }

        // Validate each preset has correct structure
        const presetIds: CompanionPresetId[] = [
            'preset1', 'preset2', 'preset3', 'preset4', 'preset5',
            'optimal-boss', 'optimal-normal'
        ];
        presetIds.forEach(presetId => {
            const preset = this.data.companions.presets[presetId];
            if (!preset) {
                this.data.companions.presets[presetId] = { ...defaults.companions.presets[presetId] };
            } else {
                // Ensure preset has main and subs
                if (!preset.main) {
                    preset.main = null;
                }
                if (!preset.subs || preset.subs.length !== 6) {
                    preset.subs = [null, null, null, null, null, null];
                }

                // IMPORTANT: Always reset optimal presets to empty
                // They are calculated dynamically on every render, not stored
                if (presetId === 'optimal-boss' || presetId === 'optimal-normal') {
                    this.data.companions.presets[presetId] = {
                        main: null,
                        subs: [null, null, null, null, null, null]
                    };
                }
            }
        });

        // Ensure companions.equippedPresetId is valid
        if (!this.data.companions.equippedPresetId || !presetIds.includes(this.data.companions.equippedPresetId)) {
            this.data.companions.equippedPresetId = defaults.companions.equippedPresetId;
        }

        // Ensure companions.showPresetDpsComparison is boolean
        if (typeof this.data.companions.showPresetDpsComparison !== 'boolean') {
            this.data.companions.showPresetDpsComparison = defaults.companions.showPresetDpsComparison;
        }

        // Ensure companions.lockedMainCompanion exists
        if (!this.data.companions.lockedMainCompanion) {
            this.data.companions.lockedMainCompanion = { ...defaults.companions.lockedMainCompanion };
        }

        // Ensure equipment exists
        if (!this.data.equipment) {
            this.data.equipment = { ...defaults.equipment };
        }

        // Ensure each equipment slot exists
        const equipmentSlots: EquipmentSlotId[] = [
            'head', 'cape', 'chest', 'shoulders', 'legs', 'belt',
            'gloves', 'boots', 'ring', 'neck', 'eye-accessory'
        ];

        // Recovery migration: if all equipment slots are null and old equipmentSlots exists in localStorage,
        // migrate the old data to recover it
        const allSlotsNull = equipmentSlots.every(slotId => this.data.equipment[slotId] === null);
        if (allSlotsNull) {
            const equipmentSlotsData = localStorage.getItem('equipmentSlots');
            if (equipmentSlotsData) {
                try {
                    const legacySlots: Record<string, { attack: number; mainStat: number; damageAmp: number }> = JSON.parse(equipmentSlotsData);
                    let migratedCount = 0;

                    equipmentSlots.forEach(slotId => {
                        const legacyData = legacySlots[slotId];
                        if (legacyData) {
                            // Convert legacy format to new EquipmentSlotData format
                            const statLines: StatLine[] = [];
                            if (legacyData.damageAmp > 0) {
                                statLines.push({ type: STAT.DAMAGE_AMP.id, value: legacyData.damageAmp });
                            }

                            this.data.equipment[slotId] = {
                                name: '',
                                attack: legacyData.attack,
                                mainStat: legacyData.mainStat,
                                statLines
                            };
                            migratedCount++;
                        }
                    });

                    if (migratedCount > 0) {
                        // Clean up the old key after successful recovery
                        localStorage.removeItem('equipmentSlots');
                        this.saveDualWrite();
                    }
                } catch (e) {
                    console.error('Failed to recover equipmentSlots data', e);
                }
            }
        }

        equipmentSlots.forEach(slotId => {
            if (this.data.equipment[slotId] === undefined) {
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
    getBaseStats(): BaseStats {
        return { ...this.data.baseStats };
    }

    /**
     * Get a single base stat value
     * @param key - Stat key (e.g., "attack", "crit-rate")
     * @returns Stat value (0 if not set)
     */
    getBaseStat(key: string): number {
        return this.data.baseStats[key] ?? 0;
    }

    /**
     * Get all weapons data
     * @returns Weapons object indexed by rarity-tier key
     */
    getWeapons(): LoadoutData['weapons'] {
        return { ...this.data.weapons };
    }

    /**
     * Get single weapon data
     * @param key - Weapon key (e.g., "legendary-t4")
     * @returns Weapon data or null if not found
     */
    getWeapon(key: string): LoadoutData['weapons'][string] | null {
        return this.data.weapons[key] ? { ...this.data.weapons[key] } : null;
    }

    /**
     * Get mastery bonuses
     * @returns Complete mastery bonus object
     */
    getMastery(): LoadoutData['mastery'] {
        return JSON.parse(JSON.stringify(this.data.mastery));
    }

    /**
     * Get specific mastery checkbox state
     * @param tier - Mastery tier ('3rd' or '4th')
     * @param type - Mastery type ('all' or 'boss')
     * @param level - Mastery level (e.g., '64', '124')
     * @returns Checkbox state (false if not set)
     */
    getMasteryCheckbox(tier: MasteryTier, type: MasteryType, level: string): boolean {
        return this.data.mastery[tier][type][level] ?? false;
    }

    /**
     * Get target selection
     * @returns Target selection object
     */
    getTarget(): LoadoutData['target'] {
        return { ...this.data.target };
    }

    /**
     * Get character metadata
     * @returns Character metadata object
     */
    getCharacter(): LoadoutData['character'] {
        return { ...this.data.character };
    }

    /**
     * Get selected class
     * @returns Selected class name or null
     */
    getSelectedClass(): string | null {
        return this.data.character.class;
    }

    /**
     * Get selected job tier
     * @returns Job tier ('3rd' or '4th')
     */
    getSelectedJobTier(): MasteryTier {
        return this.data.character.jobTier;
    }

    /**
     * Get character level
     * @returns Character level
     */
    getCharacterLevel(): number {
        return this.data.character.level;
    }

    /**
     * Get weapon attack bonus
     * @returns Weapon attack bonus object with totalAttack and equippedAttack
     */
    getWeaponAttackBonus(): LoadoutData['weaponAttackBonus'] {
        return { ...this.data.weaponAttackBonus };
    }

    /**
     * Get entire loadout data (for export/debugging)
     * @returns Deep clone of loadout data
     */
    getAllData(): LoadoutData {
        return JSON.parse(JSON.stringify(this.data));
    }

    // ========================================================================
    // COMPANION GETTERS
    // ========================================================================

    /**
     * Get all companion state
     * @returns Complete companion state
     */
    getCompanions(): CompanionState {
        return { ...this.data.companions };
    }

    /**
     * Get a single companion's data
     * @param companionKey - Companion key (e.g., 'Hero-Legendary')
     * @returns Companion data (returns default locked state if not found)
     */
    getCompanion(companionKey: CompanionKey): CompanionData {
        if (!this.data.companions.companions[companionKey]) {
            // Return default locked state for uninitialized companions
            return { unlocked: false, level: 1 };
        }
        return { ...this.data.companions.companions[companionKey] };
    }

    /**
     * Get all presets
     * @returns All presets
     */
    getPresets(): Record<CompanionPresetId, CompanionPreset> {
        return JSON.parse(JSON.stringify(this.data.companions.presets));
    }

    /**
     * Get a single preset
     * @param presetId - Preset ID
     * @returns Preset data
     */
    getPreset(presetId: CompanionPresetId): CompanionPreset {
        return JSON.parse(JSON.stringify(this.data.companions.presets[presetId]));
    }

    /**
     * Get equipped preset ID
     * @returns Currently equipped preset ID
     */
    getEquippedPresetId(): CompanionPresetId {
        return this.data.companions.equippedPresetId;
    }

    /**
     * Get show preset DPS comparison setting
     * @returns Whether to show DPS comparison
     */
    getShowPresetDpsComparison(): boolean {
        return this.data.companions.showPresetDpsComparison;
    }

    /**
     * Get locked main companion for optimal presets
     * @param optimalType - 'optimal-boss' or 'optimal-normal'
     * @returns Locked companion key or null
     */
    getLockedMainCompanion(optimalType: 'optimal-boss' | 'optimal-normal'): CompanionKey | null {
        return this.data.companions.lockedMainCompanion[optimalType];
    }

    // ========================================================================
    // SETTERS - Partial updates with immediate save
    // ========================================================================

    /**
     * Update multiple base stats at once
     * @param updates - Object mapping stat keys (hyphenated, camelCase, or uppercase) to values
     */
    updateBaseStats(updates: Record<string, number>): void {
        const normalizedUpdates: Record<string, number> = {};
        Object.entries(updates).forEach(([key, value]) => {
            let normalizedKey = key;

            // First, migrate hyphenated to camelCase
            const hyphenatedMigrated = LoadoutStore.STAT_KEY_MIGRATION[key];
            if (hyphenatedMigrated) {
                normalizedKey = hyphenatedMigrated;
            }

            // Then, convert camelCase to uppercase
            const uppercased = LoadoutStore.CAMELCASE_TO_UPPERCASE[normalizedKey];
            if (uppercased) {
                normalizedKey = uppercased;
            }

            normalizedUpdates[normalizedKey] = value;
        });
        Object.assign(this.data.baseStats, normalizedUpdates);
        this.saveDualWrite();

        // Emit stat changed event
        this.emit('stat:changed', { updates: normalizedUpdates });
    }

    /**
     * Update single base stat
     * @param key - Stat key (accepts hyphenated, camelCase, or uppercase)
     * @param value - New value
     */
    updateBaseStat(key: StatKey | string, value: number): void {
        // Normalize key to uppercase StatKey format
        let normalizedKey = key;

        // First, migrate hyphenated to camelCase
        const hyphenatedMigrated = LoadoutStore.STAT_KEY_MIGRATION[key];
        if (hyphenatedMigrated) {
            normalizedKey = hyphenatedMigrated;
        }

        // Then, convert camelCase to uppercase
        const uppercased = LoadoutStore.CAMELCASE_TO_UPPERCASE[normalizedKey];
        if (uppercased) {
            normalizedKey = uppercased;
        }

        this.data.baseStats[normalizedKey] = value;
        this.saveDualWrite();

        // Emit stat changed event
        this.emit('stat:changed', { key: normalizedKey, value });

        // Emit skill coefficient trigger events for skill level changes
        if (normalizedKey === 'SKILL_LEVEL_3RD' ||
            normalizedKey === 'SKILL_LEVEL_4TH' ||
            normalizedKey === 'SKILL_LEVEL_ALL') {
            this.emit('skill:level:changed', {
                statKey: normalizedKey,
                value
            });
        }
    }

    /**
     * Update weapon data
     * @param key - Weapon key (e.g., "legendary-t4")
     * @param data - Partial weapon data to update
     */
    updateWeapon(key: string, data: Partial<LoadoutData['weapons'][string]>): void {
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
    updateMasteryCheckbox(
        tier: MasteryTier,
        type: MasteryType,
        level: string,
        checked: boolean
    ): void {
        this.data.mastery[tier][type][level] = checked;
        this.saveDualWrite();
    }

    /**
     * Update target selection
     * @param data - Partial target data
     */
    updateTarget(data: Partial<LoadoutData['target']>): void {
        Object.assign(this.data.target, data);
        this.saveDualWrite();
    }

    /**
     * Update equipment data for a specific slot
     * @param slotId - Equipment slot ID
     * @param data - Equipment slot data
     */
    updateEquipment(slotId: EquipmentSlotId, data: EquipmentSlotData): void {
        this.data.equipment[slotId] = data;
        this.saveDualWrite();
    }

    /**
     * Get all equipment data
     */
    getEquipmentData(): LoadoutData['equipment'] {
        return this.data.equipment;
    }

    /**
     * Set selected class
     * @param className - Class name or null
     */
    setSelectedClass(className: string | null): void {
        this.data.character.class = className;
        this.saveDualWrite();
    }

    /**
     * Set selected job tier
     * @param jobTier - Job tier ('3rd' or '4th')
     */
    setSelectedJobTier(jobTier: MasteryTier): void {
        const oldTier = this.data.character.jobTier;
        this.data.character.jobTier = jobTier;
        this.saveDualWrite();

        // Emit job tier changed event if it actually changed
        if (oldTier !== jobTier) {
            this.emit('character:jobtier:changed', { oldTier, newTier: jobTier });
        }
    }

    /**
     * Set character level
     * @param level - Character level
     */
    setCharacterLevel(level: number): void {
        this.data.character.level = level;
        this.saveDualWrite();

        // Emit character level changed event
        this.emit('character:level:changed', { level });
    }

    /**
     * Update weapon attack bonus
     * @param data - Partial weapon attack bonus data
     */
    updateWeaponAttackBonus(data: Partial<LoadoutData['weaponAttackBonus']>): void {
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
    updateCompanion(companionKey: CompanionKey, data: Partial<CompanionData>): void {
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
    setPresetSlot(
        presetId: CompanionPresetId,
        slotType: 'main' | 'sub',
        slotIndex: number,
        companionKey: CompanionKey | null
    ): void {
        // Optimal presets are calculated dynamically, never saved
        if (presetId === 'optimal-boss' || presetId === 'optimal-normal') {
            console.warn(`[LoadoutStore] Cannot modify optimal preset ${presetId} - it is calculated dynamically`);
            return;
        }

        const preset = this.data.companions.presets[presetId];
        if (!preset) return;

        if (slotType === 'main') {
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
    clearPresetSlot(
        presetId: CompanionPresetId,
        slotType: 'main' | 'sub',
        slotIndex: number
    ): void {
        // Optimal presets are calculated dynamically, never saved
        if (presetId === 'optimal-boss' || presetId === 'optimal-normal') {
            console.warn(`[LoadoutStore] Cannot clear optimal preset ${presetId} - it is calculated dynamically`);
            return;
        }
        this.setPresetSlot(presetId, slotType, slotIndex, null);
    }

    /**
     * Set equipped preset ID
     * @param presetId - Preset ID to equip
     */
    setEquippedPresetId(presetId: CompanionPresetId): void {
        this.data.companions.equippedPresetId = presetId;
        this.saveDualWrite();
    }

    /**
     * Set show preset DPS comparison
     * @param show - Whether to show DPS comparison
     */
    setShowPresetDpsComparison(show: boolean): void {
        this.data.companions.showPresetDpsComparison = show;
        this.saveDualWrite();
    }

    /**
     * Set locked main companion for optimal presets
     * @param optimalType - 'optimal-boss' or 'optimal-normal'
     * @param companionKey - Companion key or null to clear
     */
    setLockedMainCompanion(
        optimalType: 'optimal-boss' | 'optimal-normal',
        companionKey: CompanionKey | null
    ): void {
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
    private saveDualWrite(): void {
        // Write to new 'loadout-data' key only
        localStorage.setItem('loadout-data', JSON.stringify(this.data));
    }

    /**
     * Convert new LoadoutData to legacy damageCalculatorData format
     * Used for dual-write backward compatibility
     */
    private convertToLegacyFormat(): LegacyDamageCalculatorData {
        // Reverse map: uppercase → hyphenated for legacy export
        const reverseMigration: Record<string, string> = {};
        Object.entries(LoadoutStore.STAT_KEY_MIGRATION).forEach(([hyphenated, upper]) => {
            reverseMigration[upper] = hyphenated;
        });

        // Convert baseStats from uppercase to hyphenated
        const baseSetup: Record<string, number> = {};
        Object.entries(this.data.baseStats).forEach(([key, value]) => {
            const legacyKey = reverseMigration[key] ?? key;
            baseSetup[legacyKey] = value;
        });

        const legacy: LegacyDamageCalculatorData = {
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
            contentType: this.data.target.contentType === CONTENT_TYPE.NONE ? undefined : this.data.target.contentType,
            subcategory: this.data.target.subcategory ?? undefined,
            selectedStage: this.data.target.selectedStage ?? undefined
        };

        // Convert weapons to legacy format
        Object.entries(this.data.weapons).forEach(([key, weapon]) => {
            legacy.weapons![key] = {
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
    reset(): void {
        this.data = JSON.parse(JSON.stringify(DEFAULT_LOADOUT_DATA));
        this.saveDualWrite();
    }

    /**
     * Check if store is initialized
     */
    isReady(): boolean {
        return this.isInitialized;
    }
}

// ========================================================================
// SINGLETON EXPORT
// ========================================================================

export const loadoutStore = new LoadoutStore();
