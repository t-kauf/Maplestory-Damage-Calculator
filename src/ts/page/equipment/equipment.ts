/**
 * Equipment Logic - Core business logic for equipment management
 * Handles data operations, state management, and calculations
 */

import type {
    EquipmentSlotId,
    EquipmentData,
    EquipmentSlotData,
    StatLineType,
    EquipmentSlotStats,
    EquipmentContributions,
    EquipmentSlotConfig,
} from '@ts/types/page/equipment/equipment.types';
import { STAT_KEY_MAP } from '@ts/types/page/equipment/equipment.types';
import { availableStats } from '@core/constants';
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
    { id: 'neck', name: 'Neck', hasMainStat: true },
    { id: 'eye-accessory', name: 'Eye Accessory', hasMainStat: true }
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
 */
export function getAvailableStats(): Array<{ value: string; label: string }> {
    return availableStats;
}

/**
 * Convert stat type string to property key
 */
export function getStatKey(statType: StatLineType): keyof EquipmentSlotStats | null {
    return STAT_KEY_MAP[statType] || null;
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

    const stats: EquipmentSlotStats = {
        attack: slotData.attack || 0
    };

    // Add main stat if applicable
    if (slotConfig.hasMainStat && slotData.mainStat !== undefined) {
        stats.mainStat = slotData.mainStat;
    }

    // Add stat lines
    if (slotData.statLines && Array.isArray(slotData.statLines)) {
        slotData.statLines.forEach(statLine => {
            const statKey = getStatKey(statLine.type);
            if (statKey) {
                stats[statKey] = (stats[statKey] || 0) + statLine.value;
            }
        });
    }

    return stats;
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
