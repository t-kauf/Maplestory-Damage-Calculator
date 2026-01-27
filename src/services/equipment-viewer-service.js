/**
 * Equipment Viewer Integration Service
 * 
 * This module integrates the external Equipment Viewer tool with the 
 * Damage Calculator's Item Comparison feature.
 * 
 * It reads equipment data from the Equipment Viewer's localStorage
 * and maps it to the format expected by the Item Comparison tool.
 */

// Slot mapping: Damage Calculator slot ID → Equipment Viewer slot name
const SLOT_MAPPING = {
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

// Reverse mapping: Equipment Viewer slot name → Damage Calculator slot ID
const REVERSE_SLOT_MAPPING = Object.fromEntries(
    Object.entries(SLOT_MAPPING).map(([k, v]) => [v.toLowerCase(), k])
);

// Stat mapping: Equipment Viewer column name → Damage Calculator stat type
const STAT_MAPPING = {
    'attack': 'attack',
    'crit rate': 'crit-rate',
    'crit damage': 'crit-damage',
    'damage': 'damage',
    'normal monster': 'normal-damage',
    'boss damage': 'boss-damage',
    'defense': 'defense',
    '1st job skill': 'skill-level-1st',
    '2nd job skill': 'skill-level-2nd',
    '3rd job skill': 'skill-level-3rd',
    // Fields that don't have direct mappings in the calculator:
    // 'accuracy', 'evasion', 'max hp', 'max mp'
};

// Stats that should be treated as percentage values
const PERCENT_STATS = new Set([
    'crit-rate', 'crit-damage', 'damage', 'normal-damage', 'boss-damage'
]);

// LocalStorage key for the Equipment Viewer
const STORAGE_KEY = 'equipmentViewerData';

/**
 * Get all equipment data from the Equipment Viewer
 * @returns {Object|null} Equipment viewer data or null if not found
 */
export function getEquipmentViewerData() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        console.log('[EquipmentViewerService] Raw localStorage data:', stored ? 'Found (' + stored.length + ' chars)' : 'Not found');
        if (!stored) {
            return null;
        }
        const parsed = JSON.parse(stored);
        console.log('[EquipmentViewerService] Parsed data:', {
            hasAllItems: !!parsed.allItems,
            itemCount: parsed.allItems?.length || 0,
            slots: parsed.allItems?.map(i => i.Slot || i['Slot']).filter(Boolean)
        });
        return parsed;
    } catch (e) {
        console.error('[EquipmentViewerService] Failed to read equipment viewer data:', e);
        return null;
    }
}

/**
 * Check if Equipment Viewer data exists
 * @returns {boolean} True if equipment viewer data is available
 */
export function hasEquipmentViewerData() {
    const data = getEquipmentViewerData();
    return data && data.allItems && data.allItems.length > 0;
}

/**
 * Get equipment viewer slot name from calculator slot ID
 * @param {string} calculatorSlotId - Calculator slot ID (e.g., 'head', 'chest')
 * @returns {string} Equipment viewer slot name (e.g., 'Hat', 'Top')
 */
export function getEquipmentViewerSlotName(calculatorSlotId) {
    return SLOT_MAPPING[calculatorSlotId] || null;
}

/**
 * Get calculator slot ID from equipment viewer slot name
 * @param {string} viewerSlotName - Equipment viewer slot name (e.g., 'Hat', 'Top')
 * @returns {string} Calculator slot ID (e.g., 'head', 'chest')
 */
export function getCalculatorSlotId(viewerSlotName) {
    return REVERSE_SLOT_MAPPING[viewerSlotName.toLowerCase()] || null;
}

/**
 * Convert an equipment viewer item to calculator comparison item format
 * @param {Object} viewerItem - Equipment viewer item
 * @param {Object} starForceBySlot - Star Force levels by slot
 * @returns {Object} Comparison item in calculator format
 */
function convertToComparisonItem(viewerItem, starForceBySlot = {}) {
    const slot = String(viewerItem['Slot'] || '').trim();
    const sfLevel = starForceBySlot[slot] || 0;
    
    // Star Force amplification tables (MUST match equipment-viewer.html)
    const baseAmpByLevel = {
        0: 0, 1: 0.1, 2: 0.2, 3: 0.3, 4: 0.4, 5: 0.6,
        6: 0.75, 7: 0.9, 8: 1.05, 9: 1.2, 10: 1.5,
        11: 1.75, 12: 2, 13: 2.25, 14: 2.5, 15: 3,
        16: 3.5, 17: 4, 18: 4.5, 19: 5, 20: 6,
        21: 7, 22: 9, 23: 12, 24: 15, 25: 20
    };
    
    const subAmpByLevel = {
        0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0.1,
        6: 0.1, 7: 0.1, 8: 0.1, 9: 0.1, 10: 0.25,
        11: 0.25, 12: 0.25, 13: 0.25, 14: 0.25, 15: 0.5,
        16: 0.6, 17: 0.7, 18: 0.8, 19: 0.9, 20: 1,
        21: 1.1, 22: 1.3, 23: 1.6, 24: 2, 25: 2.5
    };
    
    const clampedLevel = Math.max(0, Math.min(25, Math.floor(sfLevel)));
    const baseAmp = baseAmpByLevel[clampedLevel] || 0;
    const subAmp = subAmpByLevel[clampedLevel] || 0;
    
    // Debug logging
    console.log(`[EquipmentViewerService] Converting item:`, {
        slot,
        sfLevel,
        clampedLevel,
        baseAmp,
        subAmp,
        _manualFinal: viewerItem._manualFinal,
        storedDefense: viewerItem['Defense'],
        storedBossDamage: viewerItem['Boss Damage'],
        storedAttack: viewerItem['Attack'],
        storedBaseAtk: viewerItem['Base Atk']
    });
    
    // Get the base attack value and apply SF if item is not _manualFinal
    let baseAtk = parseFloat(viewerItem['Base Atk']) || 0;
    if (!viewerItem._manualFinal && baseAmp > 0) {
        baseAtk = baseAtk * (1 + baseAmp);
    }
    
    // Build the item name from available info
    const rarity = viewerItem['Rarity'] || '';
    const level = viewerItem['Level'] || '';
    let name = '';
    if (rarity) name += rarity + ' ';
    if (slot) name += slot;
    if (level) name += ` Lv${level}`;
    name = name.trim() || 'Unnamed Item';
    
    // Collect stats
    const stats = [];
    
    // Map each stat from the viewer to calculator format
    Object.entries(STAT_MAPPING).forEach(([viewerStatName, calcStatType]) => {
        // Find the column in the viewer item (case-insensitive)
        const matchingKey = Object.keys(viewerItem).find(
            k => k.toLowerCase() === viewerStatName.toLowerCase()
        );
        
        if (matchingKey) {
            let value = parseFloat(viewerItem[matchingKey]);
            const originalValue = value;
            if (!isNaN(value) && value !== 0) {
                // Apply SF amplification to sub-stats if not _manualFinal
                if (!viewerItem._manualFinal && subAmp > 0) {
                    value = value * (1 + subAmp);
                }
                
                const afterSfValue = value;
                
                // Preserve precision - round to 1 decimal place for percentages
                // Use the same precision as stored in the equipment viewer
                if (PERCENT_STATS.has(calcStatType)) {
                    // Round to 1 decimal place, preserving the original value
                    value = parseFloat(value.toFixed(1));
                } else {
                    value = Math.round(value);
                }
                
                console.log(`[EquipmentViewerService] Stat ${viewerStatName}: stored=${originalValue}, afterSF=${afterSfValue}, final=${value}, _manualFinal=${viewerItem._manualFinal}`);
                
                if (value !== 0) {
                    stats.push({
                        type: calcStatType,
                        value: value.toString()
                    });
                }
            }
        }
    });
    
    // Check if item is marked as "New"
    const isNew = String(viewerItem['New?'] || '').trim().toUpperCase() === 'Y';
    
    console.log(`[EquipmentViewerService] Item "${name}" - New?: "${viewerItem['New?']}" -> isNew: ${isNew}`);
    
    return {
        name: name,
        attack: Math.round(baseAtk),
        stats: stats,
        isNew: isNew
    };
}

/**
 * Get all items from the equipment viewer for a specific slot
 * @param {string} calculatorSlotId - Calculator slot ID (e.g., 'head', 'chest')
 * @returns {Array} Array of items in comparison format
 */
export function getItemsForSlot(calculatorSlotId) {
    const data = getEquipmentViewerData();
    if (!data || !data.allItems) {
        return [];
    }
    
    const viewerSlotName = getEquipmentViewerSlotName(calculatorSlotId);
    if (!viewerSlotName) {
        console.warn(`[EquipmentViewerService] No mapping for slot: ${calculatorSlotId}`);
        return [];
    }
    
    const starForceBySlot = data.starForceBySlot || {};
    
    // Filter items by slot and convert to comparison format
    const filteredItems = data.allItems.filter(item => {
        const itemSlot = String(item['Slot'] || '').trim().toLowerCase();
        return itemSlot === viewerSlotName.toLowerCase();
    });
    
    return filteredItems.map(item => convertToComparisonItem(item, starForceBySlot));
}

/**
 * Get items for a slot, separated into equipped and comparison items
 * @param {string} calculatorSlotId - Calculator slot ID (e.g., 'head', 'chest')
 * @returns {Object} { equippedItem: Object|null, comparisonItems: Array }
 */
export function getItemsForSlotSeparated(calculatorSlotId) {
    const data = getEquipmentViewerData();
    if (!data || !data.allItems) {
        return { equippedItem: null, comparisonItems: [] };
    }
    
    const viewerSlotName = getEquipmentViewerSlotName(calculatorSlotId);
    if (!viewerSlotName) {
        console.warn(`[EquipmentViewerService] No mapping for slot: ${calculatorSlotId}`);
        return { equippedItem: null, comparisonItems: [] };
    }
    
    const starForceBySlot = data.starForceBySlot || {};
    
    // Filter items by slot
    const filteredItems = data.allItems.filter(item => {
        const itemSlot = String(item['Slot'] || '').trim().toLowerCase();
        return itemSlot === viewerSlotName.toLowerCase();
    });
    
    // Separate equipped vs non-equipped
    let equippedItem = null;
    const comparisonItems = [];
    
    filteredItems.forEach(item => {
        const isEquipped = String(item['Equipped?'] || '').trim().toUpperCase() === 'Y';
        const converted = convertToComparisonItem(item, starForceBySlot);
        
        if (isEquipped && !equippedItem) {
            equippedItem = converted;
        } else {
            comparisonItems.push(converted);
        }
    });
    
    console.log(`[EquipmentViewerService] Slot ${calculatorSlotId}: equipped=${equippedItem ? 'yes' : 'no'}, comparison=${comparisonItems.length}`);
    
    return { equippedItem, comparisonItems };
}

/**
 * Get item counts per slot from the equipment viewer
 * @returns {Object} Object mapping calculator slot IDs to item counts
 */
export function getItemCountsBySlot() {
    const data = getEquipmentViewerData();
    if (!data || !data.allItems) {
        return {};
    }
    
    const counts = {};
    
    data.allItems.forEach(item => {
        const viewerSlot = String(item['Slot'] || '').trim();
        const calcSlot = getCalculatorSlotId(viewerSlot);
        if (calcSlot) {
            counts[calcSlot] = (counts[calcSlot] || 0) + 1;
        }
    });
    
    return counts;
}

/**
 * Get summary info about the equipment viewer data
 * @returns {Object} Summary object with total items and breakdown
 */
export function getEquipmentViewerSummary() {
    const data = getEquipmentViewerData();
    if (!data || !data.allItems) {
        return {
            available: false,
            totalItems: 0,
            itemsBySlot: {}
        };
    }
    
    return {
        available: true,
        totalItems: data.allItems.length,
        itemsBySlot: getItemCountsBySlot(),
        starForceBySlot: data.starForceBySlot || {}
    };
}

/**
 * Remove an item from the Equipment Viewer's localStorage
 * @param {string} calculatorSlotId - Calculator slot ID (e.g., 'head', 'chest')
 * @param {string} itemName - The item name to match (e.g., 'Unique Top Lv92')
 * @param {number} attack - The attack value to help identify the item
 * @returns {boolean} True if item was found and removed
 */
export function removeItemFromEquipmentViewer(calculatorSlotId, itemName, attack) {
    try {
        const data = getEquipmentViewerData();
        if (!data || !data.allItems) {
            console.log('[EquipmentViewerService] No data to remove from');
            return false;
        }
        
        const viewerSlotName = getEquipmentViewerSlotName(calculatorSlotId);
        if (!viewerSlotName) {
            console.log('[EquipmentViewerService] No slot mapping for:', calculatorSlotId);
            return false;
        }
        
        // Find the item index by matching slot and name pattern
        const itemIndex = data.allItems.findIndex(item => {
            const itemSlot = String(item['Slot'] || '').trim();
            if (itemSlot.toLowerCase() !== viewerSlotName.toLowerCase()) {
                return false;
            }
            
            // Build expected name from item data (same logic as convertToComparisonItem)
            const rarity = item['Rarity'] || '';
            const level = item['Level'] || '';
            let expectedName = '';
            if (rarity) expectedName += rarity + ' ';
            if (itemSlot) expectedName += itemSlot;
            if (level) expectedName += ` Lv${level}`;
            expectedName = expectedName.trim() || 'Unnamed Item';
            
            return expectedName === itemName;
        });
        
        if (itemIndex === -1) {
            console.log('[EquipmentViewerService] Item not found:', itemName);
            return false;
        }
        
        // Remove the item
        const removedItem = data.allItems.splice(itemIndex, 1)[0];
        console.log('[EquipmentViewerService] Removing item:', removedItem);
        
        // Save back to localStorage
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        console.log('[EquipmentViewerService] Item removed and saved');
        
        return true;
    } catch (e) {
        console.error('[EquipmentViewerService] Failed to remove item:', e);
        return false;
    }
}

// Export for debugging
if (typeof window !== 'undefined') {
    window.__equipmentViewerDebug = {
        getData: getEquipmentViewerData,
        getSummary: getEquipmentViewerSummary,
        getItemsForSlot: getItemsForSlot,
        removeItem: removeItemFromEquipmentViewer,
        SLOT_MAPPING,
        STAT_MAPPING
    };
}
