/**
 * Companion Service
 *
 * Provides access to static companion data from companion-data.ts
 * This service does NOT handle user configuration (unlocked status, levels, presets)
 * - that data lives in the loadout store (loadout-data companions)
 *
 * Usage:
 * - Import this service for static data: getCompanionEffects(), getCompanionClasses(), etc.
 * - Import loadoutStore for user config: getCompanion(), getPresets(), etc.
 */

import { COMPANION_DATA } from '../data/companion-data.js';
import type { CompanionLevelData, CompanionClassData, CompanionDataRoot, CompanionRarityData } from '../data/companion-data.js';
import type { CompanionKey, CompanionClass, CompanionEffects } from '@ts/types/page/companions/companions.types';

// ============================================================================
// STATIC DATA ACCESS (from companion-data.ts)
// ============================================================================

/**
 * Get companion effects for a given class, rarity, and level
 * @param className - The companion class (e.g., 'Hero', 'BowMaster', 'NightLord')
 * @param rarity - The rarity ('Normal', 'Rare', 'Epic', 'Unique', 'Legendary')
 * @param level - The companion level (1-300)
 * @returns Object containing inventoryEffect and equipEffect, or null if not found
 */
export function getCompanionEffects(
    className: string,
    rarity: string,
    level: number
): CompanionEffects | null {
    // Validate inputs
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

    // Get the companion data
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

/**
 * Get all available companion classes
 * @returns Array of class names
 */
export function getCompanionClasses(): CompanionClass[] {
    return [...COMPANION_DATA.classes] as CompanionClass[];
}

/**
 * Get all available rarities
 * @returns Array of rarity names
 */
export function getCompanionRarities(): string[] {
    return [...COMPANION_DATA.rarities];
}

/**
 * Get maximum companion level
 * @returns Maximum level
 */
export function getMaxCompanionLevel(): number {
    return COMPANION_DATA.maxLevel;
}

/**
 * Get all data for a specific companion class
 * @param className - The companion class
 * @returns All rarity data for the class, or null if not found
 */
export function getCompanionClassData(className: string): CompanionClassData | null {
    if (!COMPANION_DATA.classes.includes(className)) {
        console.warn(`Invalid class: ${className}`);
        return null;
    }
    return COMPANION_DATA.data[className] || null;
}

/**
 * Get all available companion keys (class-rarity combinations)
 * @returns Array of all possible companion keys
 */
export function getAllCompanionKeys(): CompanionKey[] {
    const keys: CompanionKey[] = [];
    COMPANION_DATA.classes.forEach(className => {
        COMPANION_DATA.rarities.forEach(rarity => {
            keys.push(`${className}-${rarity}` as CompanionKey);
        });
    });
    return keys;
}

// ============================================================================
// DATA HELPERS
// ============================================================================

/**
 * Check if a companion key is valid
 * @param companionKey - Companion key to validate
 * @returns True if the key is valid
 */
export function isValidCompanionKey(companionKey: string): companionKey is CompanionKey {
    const [className, rarity] = companionKey.split('-');
    return COMPANION_DATA.classes.includes(className) && COMPANION_DATA.rarities.includes(rarity);
}

/**
 * Parse a companion key into class and rarity
 * @param companionKey - Companion key (e.g., 'Hero-Legendary')
 * @returns Object with className and rarity, or null if invalid
 */
export function parseCompanionKey(companionKey: CompanionKey): { className: CompanionClass; rarity: string } | null {
    const [className, rarity] = companionKey.split('-');
    if (!className || !rarity) return null;
    if (!COMPANION_DATA.classes.includes(className) || !COMPANION_DATA.rarities.includes(rarity)) {
        return null;
    }
    return { className: className as CompanionClass, rarity };
}

// ============================================================================
// EXPORTS
// ============================================================================

// Export the raw data for advanced usage
export { COMPANION_DATA };

// Export types from companion-data
export type { CompanionLevelData, CompanionRarityData, CompanionClassData, CompanionDataRoot } from '../data/companion-data.js';

// Expose getCompanionEffects globally after module loads (for legacy compatibility)
(window as any).getCompanionEffects = getCompanionEffects;
