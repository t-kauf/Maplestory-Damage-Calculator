/**
 * Equipment Viewer Integration Service
 * 
 * Integrates the Equipment Viewer tool with the Damage Calculator.
 * Reads equipment data from Equipment Viewer's localStorage and maps it
 * to the format expected by the calculator's comparison and equipment tools.
 */

import { STAT, type StatId } from '@ts/types/constants';
import type { EquipmentSlotId } from '@ts/types/page/equipment/equipment.types';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Equipment Viewer item from localStorage
 */
export interface EquipmentViewerItem {
    'Slot': string;
    'Level': number | string;
    'Rarity': string;
    'Base Atk': number | string;
    'Equipped?': string;
    'Locked?': string;
    'New?': string;
    '_manualFinal'?: boolean;
    [key: string]: unknown;
}

/**
 * Equipment Viewer localStorage data structure
 */
export interface EquipmentViewerData {
    allItems: EquipmentViewerItem[];
    columns: string[];
    starForceBySlot: Record<string, number>;
    originalColumns?: string[];
}

/**
 * Converted item for calculator use
 */
export interface ConvertedItem {
    name: string;
    attack: number;
    stats: Array<{ type: StatId; value: number }>;
    isNew: boolean;
    isEquipped: boolean;
    rarity: string;
    level: number;
    viewerIndex: number;  // Index in Equipment Viewer's allItems array
}

/**
 * Items separated by equipped status
 */
export interface SeparatedItems {
    equippedItem: ConvertedItem | null;
    comparisonItems: ConvertedItem[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Slot mapping: Calculator slot ID → Equipment Viewer slot name
 */
const SLOT_MAPPING: Record<EquipmentSlotId, string> = {
    'head': 'Hat',
    'chest': 'Top',
    'shoulders': 'Shoulder',
    'legs': 'Bottom',
    'neck': 'Necklace',
    'eye-accessory': 'Eye',
    'cape': 'Cape',
    'belt': 'Belt',
    'gloves': 'Gloves',
    'boots': 'Boots',
    'ring': 'Ring'
};

/**
 * Reverse mapping: Equipment Viewer slot name → Calculator slot ID
 */
const REVERSE_SLOT_MAPPING: Record<string, EquipmentSlotId> = Object.fromEntries(
    Object.entries(SLOT_MAPPING).map(([k, v]) => [v.toLowerCase(), k as EquipmentSlotId])
) as Record<string, EquipmentSlotId>;

/**
 * Stat mapping: Equipment Viewer column name (lowercase) → Calculator STAT ID
 */
const STAT_MAPPING: Record<string, StatId> = {
    'attack': STAT.ATTACK.id,
    'base atk': STAT.ATTACK.id,
    'crit rate': STAT.CRIT_RATE.id,
    'critical rate': STAT.CRIT_RATE.id,
    'crit damage': STAT.CRIT_DAMAGE.id,
    'critical damage': STAT.CRIT_DAMAGE.id,
    'damage': STAT.DAMAGE.id,
    'normal monster': STAT.NORMAL_DAMAGE.id,
    'normal damage': STAT.NORMAL_DAMAGE.id,
    'boss damage': STAT.BOSS_DAMAGE.id,
    'boss monster damage': STAT.BOSS_DAMAGE.id,
    'defense': STAT.DEFENSE.id,
    '1st job skill': STAT.SKILL_LEVEL_1ST.id,
    '2nd job skill': STAT.SKILL_LEVEL_2ND.id,
    '3rd job skill': STAT.SKILL_LEVEL_3RD.id,
    '4th job skill': STAT.SKILL_LEVEL_4TH.id,
    'attack speed': STAT.ATTACK_SPEED.id,
    'min damage': STAT.MIN_DAMAGE.id,
    'max damage': STAT.MAX_DAMAGE.id,
    'final damage': STAT.FINAL_DAMAGE.id,
};

/**
 * Star Force amplification tables (must match equipment-viewer.html)
 */
const BASE_AMP_BY_LEVEL: Record<number, number> = {
    0: 0, 1: 0.1, 2: 0.2, 3: 0.3, 4: 0.4, 5: 0.6,
    6: 0.75, 7: 0.9, 8: 1.05, 9: 1.2, 10: 1.5,
    11: 1.75, 12: 2, 13: 2.25, 14: 2.5, 15: 3,
    16: 3.5, 17: 4, 18: 4.5, 19: 5, 20: 6,
    21: 7, 22: 9, 23: 12, 24: 15, 25: 20
};

const SUB_AMP_BY_LEVEL: Record<number, number> = {
    0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0.1,
    6: 0.1, 7: 0.1, 8: 0.1, 9: 0.1, 10: 0.25,
    11: 0.25, 12: 0.25, 13: 0.25, 14: 0.25, 15: 0.5,
    16: 0.6, 17: 0.7, 18: 0.8, 19: 0.9, 20: 1,
    21: 1.1, 22: 1.3, 23: 1.6, 24: 2, 25: 2.5
};

const STORAGE_KEY = 'equipmentViewerData';

// ============================================================================
// DATA ACCESS
// ============================================================================

/**
 * Get all equipment data from the Equipment Viewer localStorage
 */
export function getEquipmentViewerData(): EquipmentViewerData | null {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) {
            return null;
        }
        return JSON.parse(stored) as EquipmentViewerData;
    } catch (e) {
        console.error('[EquipmentViewerService] Failed to read data:', e);
        return null;
    }
}

/**
 * Save equipment data back to localStorage
 */
export function saveEquipmentViewerData(data: EquipmentViewerData): void {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
        console.error('[EquipmentViewerService] Failed to save data:', e);
    }
}

/**
 * Check if Equipment Viewer data exists
 */
export function hasEquipmentViewerData(): boolean {
    const data = getEquipmentViewerData();
    return data !== null && Array.isArray(data.allItems) && data.allItems.length > 0;
}

// ============================================================================
// SLOT MAPPING
// ============================================================================

/**
 * Get Equipment Viewer slot name from calculator slot ID
 */
export function getViewerSlotName(calcSlotId: EquipmentSlotId): string | null {
    return SLOT_MAPPING[calcSlotId] || null;
}

/**
 * Get calculator slot ID from Equipment Viewer slot name
 */
export function getCalcSlotId(viewerSlotName: string): EquipmentSlotId | null {
    return REVERSE_SLOT_MAPPING[viewerSlotName.toLowerCase()] || null;
}

// ============================================================================
// ITEM CONVERSION
// ============================================================================

/**
 * Convert an Equipment Viewer item to calculator format
 */
function convertItem(
    item: EquipmentViewerItem,
    index: number,
    starForceBySlot: Record<string, number>
): ConvertedItem {
    const slot = String(item['Slot'] || '').trim();
    const rarity = String(item['Rarity'] || '').trim();
    const level = parseInt(String(item['Level'] || '0'), 10) || 0;
    const isManualFinal = item._manualFinal === true;
    
    // Star Force amplification
    const sfLevel = starForceBySlot[slot] || 0;
    const clampedLevel = Math.max(0, Math.min(25, Math.floor(sfLevel)));
    const baseAmp = BASE_AMP_BY_LEVEL[clampedLevel] || 0;
    const subAmp = SUB_AMP_BY_LEVEL[clampedLevel] || 0;
    
    // Base Attack
    let baseAtk = parseFloat(String(item['Base Atk'] || item['Attack'] || '0')) || 0;
    if (!isManualFinal && baseAmp > 0) {
        baseAtk = baseAtk * (1 + baseAmp);
    }
    
    // Build stats array
    const stats: Array<{ type: StatId; value: number }> = [];
    
    for (const [key, value] of Object.entries(item)) {
        if (typeof value !== 'number' && typeof value !== 'string') continue;
        if (['Slot', 'Level', 'Rarity', 'Equipped?', 'Locked?', 'New?', 'Base Atk', 'Attack', '_manualFinal', '_isNewRow'].includes(key)) continue;
        
        const numValue = parseFloat(String(value));
        if (isNaN(numValue) || numValue === 0) continue;
        
        const statId = STAT_MAPPING[key.toLowerCase()];
        if (!statId) continue;
        
        // Apply SF amplification to sub-stats
        let finalValue = numValue;
        if (!isManualFinal && subAmp > 0) {
            finalValue = numValue * (1 + subAmp);
        }
        
        stats.push({ type: statId, value: Math.round(finalValue * 10) / 10 });
    }
    
    // Build item name
    let name = '';
    if (rarity) name += rarity + ' ';
    if (slot) name += slot;
    if (level) name += ` Lv${level}`;
    name = name.trim() || 'Unnamed Item';
    
    return {
        name,
        attack: Math.round(baseAtk),
        stats,
        isNew: String(item['New?'] || '').trim().toUpperCase() === 'Y',
        isEquipped: String(item['Equipped?'] || '').trim().toUpperCase() === 'Y',
        rarity,
        level,
        viewerIndex: index
    };
}

// ============================================================================
// ITEM RETRIEVAL
// ============================================================================

/**
 * Get all items for a specific slot
 */
export function getItemsForSlot(calcSlotId: EquipmentSlotId): ConvertedItem[] {
    const data = getEquipmentViewerData();
    if (!data || !data.allItems) return [];
    
    const viewerSlotName = getViewerSlotName(calcSlotId);
    if (!viewerSlotName) return [];
    
    const starForceBySlot = data.starForceBySlot || {};
    
    return data.allItems
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => {
            const itemSlot = String(item['Slot'] || '').trim().toLowerCase();
            return itemSlot === viewerSlotName.toLowerCase();
        })
        .map(({ item, index }) => convertItem(item, index, starForceBySlot));
}

/**
 * Get items for a slot, separated into equipped and comparison items
 */
export function getItemsForSlotSeparated(calcSlotId: EquipmentSlotId): SeparatedItems {
    const items = getItemsForSlot(calcSlotId);
    
    let equippedItem: ConvertedItem | null = null;
    const comparisonItems: ConvertedItem[] = [];
    
    for (const item of items) {
        if (item.isEquipped && !equippedItem) {
            equippedItem = item;
        } else {
            comparisonItems.push(item);
        }
    }
    
    return { equippedItem, comparisonItems };
}

/**
 * Get all equipped items across all slots
 */
export function getAllEquippedItems(): Record<EquipmentSlotId, ConvertedItem | null> {
    const result: Partial<Record<EquipmentSlotId, ConvertedItem | null>> = {};
    
    for (const slotId of Object.keys(SLOT_MAPPING) as EquipmentSlotId[]) {
        const { equippedItem } = getItemsForSlotSeparated(slotId);
        result[slotId] = equippedItem;
    }
    
    return result as Record<EquipmentSlotId, ConvertedItem | null>;
}

/**
 * Get item counts per slot
 */
export function getItemCountsBySlot(): Record<EquipmentSlotId, number> {
    const data = getEquipmentViewerData();
    if (!data || !data.allItems) return {} as Record<EquipmentSlotId, number>;
    
    const counts: Partial<Record<EquipmentSlotId, number>> = {};
    
    for (const item of data.allItems) {
        const viewerSlot = String(item['Slot'] || '').trim();
        const calcSlot = getCalcSlotId(viewerSlot);
        if (calcSlot) {
            counts[calcSlot] = (counts[calcSlot] || 0) + 1;
        }
    }
    
    return counts as Record<EquipmentSlotId, number>;
}

// ============================================================================
// ITEM MODIFICATION
// ============================================================================

/**
 * Set an item as equipped, automatically unequipping others in the same slot
 */
export function setItemEquipped(viewerIndex: number): boolean {
    const data = getEquipmentViewerData();
    if (!data || !data.allItems || !data.allItems[viewerIndex]) {
        return false;
    }
    
    const targetItem = data.allItems[viewerIndex];
    const targetSlot = String(targetItem['Slot'] || '').trim().toLowerCase();
    
    // Unequip all other items in the same slot
    for (const item of data.allItems) {
        const itemSlot = String(item['Slot'] || '').trim().toLowerCase();
        if (itemSlot === targetSlot) {
            item['Equipped?'] = '';
        }
    }
    
    // Equip the target item
    targetItem['Equipped?'] = 'Y';
    
    saveEquipmentViewerData(data);
    return true;
}

/**
 * Remove an item from the Equipment Viewer
 */
export function removeItem(viewerIndex: number): boolean {
    const data = getEquipmentViewerData();
    if (!data || !data.allItems || !data.allItems[viewerIndex]) {
        return false;
    }
    
    data.allItems.splice(viewerIndex, 1);
    saveEquipmentViewerData(data);
    return true;
}

// ============================================================================
// WINDOW EXPORTS FOR DEBUGGING
// ============================================================================

declare global {
    interface Window {
        __equipmentViewerService: {
            getData: typeof getEquipmentViewerData;
            hasData: typeof hasEquipmentViewerData;
            getItemsForSlot: typeof getItemsForSlot;
            getItemsSeparated: typeof getItemsForSlotSeparated;
            getAllEquipped: typeof getAllEquippedItems;
            setEquipped: typeof setItemEquipped;
            removeItem: typeof removeItem;
        };
    }
}

if (typeof window !== 'undefined') {
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
