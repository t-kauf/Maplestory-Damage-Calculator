/**
 * Equipment Logic - Core business logic for equipment management
 * Handles data operations, state management, and calculations
 */

import type {
    EquipmentSlotId,
    EquipmentData,
    EquipmentSlotData,
    EquipmentSlotStats,
    EquipmentContributions,
    EquipmentSlotConfig,
} from '@ts/types/page/equipment/equipment.types';
import { STAT, type StatId } from '@ts/types/constants';
import { loadoutStore } from '@ts/store/loadout.store';

// ============================================================================
// EQUIPMENT SLOT DEFINITIONS
// ============================================================================

/**
 * All equipment slot configurations
 */
export const EQUIPMENT_SLOTS: readonly EquipmentSlotConfig[] = [
    { id: 'head', name: 'Head', hasMainStat: false },
    { id: 'cape', name: 'Cape', hasMainStat: false },
    { id: 'chest', name: 'Chest', hasMainStat: false },
    { id: 'shoulders', name: 'Shoulders', hasMainStat: false },
    { id: 'legs', name: 'Legs', hasMainStat: false },
    { id: 'belt', name: 'Belt', hasMainStat: false },
    { id: 'gloves', name: 'Gloves', hasMainStat: false },
    { id: 'boots', name: 'Boots', hasMainStat: false },
    { id: 'ring', name: 'Ring', hasMainStat: true },
    { id: 'eye-accessory', name: 'Eye Accessory', hasMainStat: true },
    { id: 'neck', name: 'Neck', hasMainStat: true }
] as const;

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

/**
 * In-memory equipment data store
 */
let equipmentData: EquipmentData = {
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
    'eye-accessory': null
};

// ============================================================================
// DATA OPERATIONS
// ============================================================================

/**
 * Get data for a specific equipment slot
 */
export function getSlotData(slotId: EquipmentSlotId): EquipmentSlotData | null {
    return equipmentData[slotId];
}

/**
 * Get all equipment data
 */
export function getAllEquipmentData(): EquipmentData {
    return equipmentData;
}

/**
 * Set equipment data for a specific slot
 * Updates both in-memory store and localStorage
 */
export function setSlotData(slotId: EquipmentSlotId, data: EquipmentSlotData): void {
    equipmentData[slotId] = data;
    saveSlotToStorage(slotId, data);
}

/**
 * Clear all data for a specific slot
 */
export function clearSlotData(slotId: EquipmentSlotId): void {
    const emptyData: EquipmentSlotData = {
        name: '',
        attack: 0,
        mainStat: 0,
        statLines: []
    };
    setSlotData(slotId, emptyData);
}

/**
 * Load equipment data from loadout store for all slots
 */
export function loadAllEquipmentData(): void {
    const storeData = loadoutStore.getEquipmentData();
    EQUIPMENT_SLOTS.forEach(slot => {
        equipmentData[slot.id] = storeData[slot.id];
    });
}

/**
 * Legacy kebab-case to STAT.X.id mapping for migration
 */
const LEGACY_STAT_KEY_MAP: Record<string, string> = {
    'attack': STAT.ATTACK.id,
    'main-stat': STAT.PRIMARY_MAIN_STAT.id,
    'defense': STAT.DEFENSE.id,
    'crit-rate': STAT.CRIT_RATE.id,
    'crit-damage': STAT.CRIT_DAMAGE.id,
    'skill-level-1st': STAT.SKILL_LEVEL_1ST.id,
    'skill-level-2nd': STAT.SKILL_LEVEL_2ND.id,
    'skill-level-3rd': STAT.SKILL_LEVEL_3RD.id,
    'skill-level-4th': STAT.SKILL_LEVEL_4TH.id,
    'skill-level-all': STAT.SKILL_LEVEL_ALL.id,
    'attack-speed': STAT.ATTACK_SPEED.id,
    'normal-damage': STAT.NORMAL_DAMAGE.id,
    'boss-damage': STAT.BOSS_DAMAGE.id,
    'damage': STAT.DAMAGE.id,
    'damage-amp': STAT.DAMAGE_AMP.id,
    'final-damage': STAT.FINAL_DAMAGE.id,
    'min-damage': STAT.MIN_DAMAGE.id,
    'max-damage': STAT.MAX_DAMAGE.id,
};

/**
 * Migrate legacy kebab-case statline types to statId format
 * This actively converts all old format data in storage to the new format
 */
export function migrateStatlineFormats(): void {
    // Check if migration has already completed
    if (localStorage.getItem('statline-migration-complete')) {
        return;
    }

    const storeData = loadoutStore.getEquipmentData();
    let totalMigrated = 0;
    const slotsMigrated: EquipmentSlotId[] = [];

    // Batch all updates to minimize localStorage writes
    const updates: Partial<Record<EquipmentSlotId, EquipmentSlotData>> = {};

    EQUIPMENT_SLOTS.forEach(slot => {
        const slotData = storeData[slot.id];
        // Guard against corrupted data - ensure statLines is a valid array
        if (!slotData || !Array.isArray(slotData.statLines)) return;

        // Check if any statlines need migration (kebab-case contains '-')
        const needsMigration = slotData.statLines.some(statLine =>
            statLine && statLine.type && typeof statLine.type === 'string' && statLine.type.includes('-')
        );

        if (needsMigration) {
            // Migrate statlines to statId format
            const migratedStatLines = slotData.statLines.map(statLine => {
                if (!statLine || !statLine.type || typeof statLine.type !== 'string') {
                    return statLine; // Skip invalid entries
                }
                if (statLine.type.includes('-')) {
                    // Convert kebab-case to statId using legacy mapping
                    const statId = LEGACY_STAT_KEY_MAP[statLine.type];
                    totalMigrated++;
                    return {
                        ...statLine,
                        type: (statId || statLine.type) as StatId // Use statId if mapping exists
                    };
                }
                return statLine;
            });

            // Queue the update for batching
            updates[slot.id] = {
                ...slotData,
                statLines: migratedStatLines
            };
            slotsMigrated.push(slot.id);
        }
    });

    // Apply all updates in a batch
    Object.entries(updates).forEach(([slotId, data]) => {
        loadoutStore.updateEquipment(slotId as EquipmentSlotId, data!);
    });

    // Mark migration as complete
    if (totalMigrated > 0) {
        localStorage.setItem('statline-migration-complete', 'true');
        console.log(`[Equipment] Migrated ${totalMigrated} statlines across ${slotsMigrated.length} slots from kebab-case to statId`);
    }
}

/**
 * Save a single slot's data via loadout store
 */
function saveSlotToStorage(slotId: EquipmentSlotId, data: EquipmentSlotData): void {
    loadoutStore.updateEquipment(slotId, data);
}

/**
 * Create empty slot data with defaults
 */
export function createEmptySlotData(hasMainStat: boolean): EquipmentSlotData {
    return {
        name: '',
        attack: 0,
        mainStat: hasMainStat ? 0 : undefined,
        statLines: []
    };
}

// ============================================================================
// STAT LINE OPERATIONS
// ============================================================================

/**
 * Get available stat types for dropdown
 * Uses STAT constant for single source of truth
 */
export function getAvailableStats(): Array<{ value: string; label: string }> {
    return [
        { value: STAT.ATTACK.id, label: STAT.ATTACK.label },
        { value: STAT.PRIMARY_MAIN_STAT.id, label: 'Main Stat' },
        { value: STAT.MAIN_STAT_PCT.id, label: 'Main Stat %' },
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
        { value: STAT.MAX_DAMAGE.id, label: STAT.MAX_DAMAGE.label },
    ];
}

/**
 * Generate HTML option tags for stat type dropdown
 * Shared function used by both equipment and comparison tabs
 */
export function generateStatTypeOptionsHTML(): string {
    return getAvailableStats()
        .map(stat => `<option value="${stat.value}">${stat.label}</option>`)
        .join('');
}

/**
 * Validate a stat type string is a valid STAT.X.id
 * All stat types are now STAT.X.id values (camelCase format)
 */
export function getStatKey(statType: StatId | string): StatId | null {
    // Check if this is a known STAT.X.id
    const statEntry = Object.values(STAT).find(stat => stat.id === statType);
    return statEntry ? (statType as StatId) : null;
}

// ============================================================================
// CALCULATIONS
// ============================================================================

/**
 * Calculate stat contributions from a single equipment slot
 */
export function calculateSlotContributions(
    slotConfig: EquipmentSlotConfig,
    slotData: EquipmentSlotData | null
): EquipmentSlotStats | null {
    if (!slotData) return null;

    // Initialize with attack (using STAT.X.id as key)
    const stats: Partial<Record<StatId, number>> = {
        [STAT.ATTACK.id]: slotData.attack || 0
    };

    // Add main stat if applicable - stored as flat value, maps to mainStatPct for consistency
    if (slotConfig.hasMainStat && slotData.mainStat !== undefined) {
        stats[STAT.MAIN_STAT_PCT.id] = slotData.mainStat;
    }

    // Add stat lines - all stat types are now STAT.X.id values
    if (slotData.statLines && Array.isArray(slotData.statLines)) {
        slotData.statLines.forEach(statLine => {
            const statId = getStatKey(statLine.type);
            if (statId) {
                stats[statId] = (stats[statId] || 0) + statLine.value;
            }
        });
    }

    return stats as EquipmentSlotStats;
}

/**
 * Calculate all stat contributions from equipment
 * Returns contributions keyed by slot ID
 */
export function calculateAllContributions(): EquipmentContributions {
    const contributions: Partial<EquipmentContributions> = {};

    EQUIPMENT_SLOTS.forEach(slot => {
        contributions[slot.id] = calculateSlotContributions(slot, equipmentData[slot.id]);
    });

    return contributions as EquipmentContributions;
}

/**
 * Get slot configuration by ID
 */
export function getSlotConfig(slotId: EquipmentSlotId): EquipmentSlotConfig | undefined {
    return EQUIPMENT_SLOTS.find(slot => slot.id === slotId);
}

/**
 * Check if a slot exists
 */
export function isValidSlot(slotId: string): slotId is EquipmentSlotId {
    return EQUIPMENT_SLOTS.some(slot => slot.id === slotId);
}
