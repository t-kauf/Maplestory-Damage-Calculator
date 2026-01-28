/**
 * Gear Lab Store Types
 *
 * Centralized types for the gearLabStore which manages Inner Ability presets
 * and will be extensible for future Gear Lab features.
 */

import type { StatId } from '@ts/types/constants';

// ============================================================================
// INNER ABILITY TYPES
// ============================================================================

/**
 * Individual inner ability line (stat + value)
 */
export interface InnerAbilityLine {
    stat: string;  // e.g., "Boss Monster Damage"
    statId: string;  // Maps to STAT.X.id (e.g., "bossDamage")
    value: number;  // e.g., 40
}

/**
 * A complete inner ability preset (1-10)
 */
export interface InnerAbilityPreset {
    id: number;  // 1-10
    isEquipped: boolean;
    lines: InnerAbilityLine[];  // Up to 6 lines, can be empty
}

/**
 * Result from preset comparison calculation
 */
export interface PresetComparisonResult {
    id: number;
    isEquipped: boolean;
    lines: InnerAbilityLine[];
    bossDPSGain: number;
    normalDPSGain: number;
    lineContributions: Array<{
        stat: string;
        value: number;
        dpsContribution: number;
    }>;
}

/**
 * Result from theoretical best calculation
 */
export interface TheoreticalRollResult {
    stat: string;
    rarity: string;  // 'Mystic', 'Legendary', etc.
    roll: 'Min' | 'Mid' | 'Max';
    value: number;
    dpsGain: number;
    percentIncrease: number;
}

/**
 * Best combination result
 */
export interface BestCombinationResult {
    lines: Array<{
        stat: string;
        rarity: string;
        value: number;
        dpsGain?: number;
    }>;
    totalDPS: number;
}

// ============================================================================
// CUBE POTENTIAL TYPES
// ============================================================================

/**
 * Equipment slot ID type
 */
export type CubeSlotId =
    | 'helm' | 'cape' | 'chest' | 'shoulder' | 'legs' | 'belt'
    | 'gloves' | 'boots' | 'ring' | 'necklace' | 'eye-accessory';

/**
 * Potential type
 */
export type PotentialType = 'regular' | 'bonus';

/**
 * Rarity tier
 */
export type Rarity = 'normal' | 'rare' | 'epic' | 'unique' | 'legendary' | 'mystic';

/**
 * Individual potential line
 */
export interface PotentialLine {
    stat: string;
    value: number;
    prime: boolean;
}

/**
 * Potential line entry for rankings
 */
export interface PotentialLineEntry {
    stat: string;
    value: number;
    prime: boolean;
    weight?: number; // Weight for weighted random selection
}

/**
 * A potential set (3 lines)
 */
export interface PotentialSet {
    line1: PotentialLine;
    line2: PotentialLine;
    line3: PotentialLine;
}

/**
 * Empty potential line
 */
export const EMPTY_POTENTIAL_LINE: PotentialLine = {
    stat: '',
    value: 0,
    prime: false
};

/**
 * Empty potential set
 */
export const EMPTY_POTENTIAL_SET: PotentialSet = {
    line1: { ...EMPTY_POTENTIAL_LINE },
    line2: { ...EMPTY_POTENTIAL_LINE },
    line3: { ...EMPTY_POTENTIAL_LINE }
};

/**
 * Potential type data (contains both regular and bonus potential)
 */
export interface PotentialTypeData {
    rarity: Rarity;
    rollCount: number;
    setA: PotentialSet;
    setB: PotentialSet;
}

/**
 * Equipment slot configuration
 */
export interface CubeSlotConfig {
    id: CubeSlotId;
    name: string;
}

/**
 * Cube slot data (contains both regular and bonus potential)
 */
export interface CubeSlotData {
    regular: PotentialTypeData;
    bonus: PotentialTypeData;
}

/**
 * All cube slot data
 */
export type AllCubeSlotData = Record<CubeSlotId, CubeSlotData>;

/**
 * Legacy cube slot data format (for migration)
 */
export interface LegacyCubeSlotData {
    regular: {
        rarity: Rarity;
        rollCount: number;
        setA: PotentialSet;
        setB: PotentialSet;
    };
    bonus: {
        rarity: Rarity;
        rollCount: number;
        setA: PotentialSet;
        setB: PotentialSet;
    };
}

// ============================================================================
// EQUIPMENT SLOT TYPES
// ============================================================================

/**
 * Valid equipment slot IDs
 */
export const VALID_EQUIPMENT_SLOTS: EquipmentSlotId[] = ['head', 'cape', 'chest', 'shoulders', 'legs', 'belt', 'gloves', 'boots', 'ring', 'neck', 'eye-accessory'];

/**
 * Equipment slot ID type
 */
export type EquipmentSlotId =
    | 'head' | 'cape' | 'chest' | 'shoulders' | 'legs' | 'belt'
    | 'gloves' | 'boots' | 'ring' | 'neck' | 'eye-accessory';

/**
 * Equipment slot data (attack, main stat, damage amp)
 */
export interface EquipmentSlotData {
    attack: number;
    mainStat: number;
    damageAmp: number;
}

/**
 * All equipment slot data
 */
export type AllEquipmentSlotData = Record<EquipmentSlotId, EquipmentSlotData>;

/**
 * Legacy equipment slot data from localStorage (for migration)
 */
export interface LegacyEquipmentSlotData {
    attack: number;
    mainStat: number;
    damageAmp: number;
}

// ============================================================================
// COMPARISON EQUIPMENT TYPES
// ============================================================================

/**
 * Stat line interface for comparison items
 * Uses StatId type for type-safe stat selection
 */
export interface ComparisonStatLine {
    type: StatId;  // Stat ID from STAT.X.id (e.g., 'attack', 'bossDamage')
    value: number;
}

/**
 * A comparison item for a specific equipment slot
 */
export interface ComparisonItem {
    guid: string;              // UUID v4 unique identifier
    name: string;              // Item name (e.g., "Item 1", "Item 2")
    attack: number;            // Attack value
    mainStat: number;          // Main stat value (0 for non-accessory slots)
    statLines: ComparisonStatLine[];  // Array of stat lines
    // Job skill level bonuses
    skillLevel1st?: number;     // 1st job skill level bonus
    skillLevel2nd?: number;     // 2nd job skill level bonus
    skillLevel3rd?: number;     // 3rd job skill level bonus
    skillLevel4th?: number;     // 4th job skill level bonus
    skillLevelAll?: number;     // All jobs skill level bonus
}

/**
 * Comparison equipment data structure
 * Maps each equipment slot to an array of comparison items
 */
export type ComparisonEquipment = Record<EquipmentSlotId, ComparisonItem[]>;

/**
 * Legacy comparison item format (for migration from comparison-state.js)
 */
export interface LegacyComparisonItem {
    guid: string;
    version: number;
    name: string;
    attack: number;
    stats: Array<{ type: string; value: string }>;  // Old format had values as strings
}

// ============================================================================
// STORE DATA STRUCTURE
// ============================================================================

/**
 * Complete gear lab data structure
 * Designed to be extensible for future Gear Lab features
 */
export interface GearLabData {
    innerAbility: {
        presets: Record<number, InnerAbilityPreset>;
    };
    cubePotential: AllCubeSlotData;
    equipmentSlots: AllEquipmentSlotData;
    comparisonEquipment: ComparisonEquipment;
    // Future: cubeStrategies, scrollOptimization, etc.
}

/**
 * Default potential type data
 */
const DEFAULT_POTENTIAL_TYPE_DATA: PotentialTypeData = {
    rarity: 'normal',
    rollCount: 0,
    setA: { ...EMPTY_POTENTIAL_SET },
    setB: { ...EMPTY_POTENTIAL_SET }
};

/**
 * Default cube slot data
 */
const DEFAULT_CUBE_SLOT_DATA: CubeSlotData = {
    regular: { ...DEFAULT_POTENTIAL_TYPE_DATA },
    bonus: { ...DEFAULT_POTENTIAL_TYPE_DATA }
};

/**
 * Create default cube slot data for all slots
 */
const createDefaultCubeSlotData = (): AllCubeSlotData => ({
    helm: { ...DEFAULT_CUBE_SLOT_DATA },
    cape: { ...DEFAULT_CUBE_SLOT_DATA },
    chest: { ...DEFAULT_CUBE_SLOT_DATA },
    shoulder: { ...DEFAULT_CUBE_SLOT_DATA },
    legs: { ...DEFAULT_CUBE_SLOT_DATA },
    belt: { ...DEFAULT_CUBE_SLOT_DATA },
    gloves: { ...DEFAULT_CUBE_SLOT_DATA },
    boots: { ...DEFAULT_CUBE_SLOT_DATA },
    ring: { ...DEFAULT_CUBE_SLOT_DATA },
    necklace: { ...DEFAULT_CUBE_SLOT_DATA },
    'eye-accessory': { ...DEFAULT_CUBE_SLOT_DATA }
});

/**
 * Create default equipment slot data for all slots
 */
const createDefaultEquipmentSlotData = (): AllEquipmentSlotData => ({
    head: { attack: 0, mainStat: 0, damageAmp: 0 },
    cape: { attack: 0, mainStat: 0, damageAmp: 0 },
    chest: { attack: 0, mainStat: 0, damageAmp: 0 },
    shoulders: { attack: 0, mainStat: 0, damageAmp: 0 },
    legs: { attack: 0, mainStat: 0, damageAmp: 0 },
    belt: { attack: 0, mainStat: 0, damageAmp: 0 },
    gloves: { attack: 0, mainStat: 0, damageAmp: 0 },
    boots: { attack: 0, mainStat: 0, damageAmp: 0 },
    ring: { attack: 0, mainStat: 0, damageAmp: 0 },
    neck: { attack: 0, mainStat: 0, damageAmp: 0 },
    'eye-accessory': { attack: 0, mainStat: 0, damageAmp: 0 }
});

/**
 * Create default comparison equipment data for all slots
 */
const createDefaultComparisonEquipment = (): ComparisonEquipment => ({
    head: [],
    cape: [],
    chest: [],
    shoulders: [],
    legs: [],
    belt: [],
    gloves: [],
    boots: [],
    ring: [],
    neck: [],
    'eye-accessory': []
});

/**
 * Default gear lab data
 */
export const DEFAULT_GEAR_LAB_DATA: GearLabData = {
    innerAbility: {
        presets: {
            1: { id: 1, isEquipped: false, lines: [] },
            2: { id: 2, isEquipped: false, lines: [] },
            3: { id: 3, isEquipped: false, lines: [] },
            4: { id: 4, isEquipped: false, lines: [] },
            5: { id: 5, isEquipped: false, lines: [] },
            6: { id: 6, isEquipped: false, lines: [] },
            7: { id: 7, isEquipped: false, lines: [] },
            8: { id: 8, isEquipped: false, lines: [] },
            9: { id: 9, isEquipped: false, lines: [] },
            10: { id: 10, isEquipped: false, lines: [] },
            11: { id: 11, isEquipped: false, lines: [] },
            12: { id: 12, isEquipped: false, lines: [] },
            13: { id: 13, isEquipped: false, lines: [] },
            14: { id: 14, isEquipped: false, lines: [] },
            15: { id: 15, isEquipped: false, lines: [] },
            16: { id: 16, isEquipped: false, lines: [] },
            17: { id: 17, isEquipped: false, lines: [] },
            18: { id: 18, isEquipped: false, lines: [] },
            19: { id: 19, isEquipped: false, lines: [] },
            20: { id: 20, isEquipped: false, lines: [] },
        }
    },
    cubePotential: createDefaultCubeSlotData(),
    equipmentSlots: createDefaultEquipmentSlotData(),
    comparisonEquipment: createDefaultComparisonEquipment()
};

// ============================================================================
// LEGACY DATA TYPES (for migration)
// ============================================================================

/**
 * Legacy heroPowerPresets format from localStorage
 */
export interface LegacyHeroPowerPresets {
    [presetId: string]: {
        isEquipped: boolean;
        lines: Array<{
            stat: string;
            value: number;
        }>;
    };
}

/**
 * Legacy cube slot data from localStorage
 * Matches the old format stored by state.js
 */
export interface LegacyCubePotentialData {
    [slotId: string]: {
        regular: {
            rarity: Rarity;
            rollCount: number;
            setA: PotentialSet;
            setB: PotentialSet;
        };
        bonus: {
            rarity: Rarity;
            rollCount: number;
            setA: PotentialSet;
            setB: PotentialSet;
        };
    };
}
