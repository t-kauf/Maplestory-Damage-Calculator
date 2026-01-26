// Inner Ability Data Structures and Constants
// Converted from inner-ability-data.js to TypeScript

import { STAT, type StatId } from '@ts/types/constants';

/**
 * Inner ability stat names for UI dropdown options
 * These are the user-facing stat names displayed in the UI
 */
export const innerAbilityStats = [
    'Accuracy',
    'Attack Speed',
    'Boss Monster Damage',
    'Critical Rate',
    'Critical Resistance',
    'Damage',
    'Damage Taken Decrease',
    'Damage Tolerance',
    'Debuff Tolerance',
    'Defense Penetration',
    'EXP Gain',
    'Evasion',
    'Main Stat',
    'Max Damage Multiplier',
    'Max HP',
    'Max MP',
    'Meso Drop',
    'Min Damage Multiplier',
    'MP Recovery Per Sec',
    'Normal Monster Damage'
] as const;

/**
 * Inner ability stat display names mapped to STAT constant IDs
 * These are the user-facing stat names used in the UI
 */
export const INNER_ABILITY_STAT_NAMES: Record<string, string> = {
    [STAT.ATTACK_SPEED.id]: 'Attack Speed',
    [STAT.BOSS_DAMAGE.id]: 'Boss Monster Damage',
    [STAT.CRIT_RATE.id]: 'Critical Rate',
    [STAT.DAMAGE.id]: 'Damage',
    [STAT.DEF_PEN.id]: 'Defense Penetration',
    [STAT.MIN_DAMAGE.id]: 'Min Damage Multiplier',
    [STAT.MAX_DAMAGE.id]: 'Max Damage Multiplier',
    [STAT.NORMAL_DAMAGE.id]: 'Normal Monster Damage',
    [STAT.PRIMARY_MAIN_STAT.id]: 'Main Stat',
} as const;

/**
 * Non-combat stats that don't affect DPS
 */
export const INNER_ABILITY_NON_COMBAT_STATS = [
    'Accuracy',
    'Critical Resistance',
    'Damage Taken Decrease',
    'Damage Tolerance',
    'Debuff Tolerance',
    'EXP Gain',
    'Evasion',
    'Max HP',
    'Max MP',
    'Meso Drop',
    'MP Recovery Per Sec'
] as const;

export type InnerAbilityStat = typeof innerAbilityStats[number];

export interface StatRange {
    min: number;
    max: number;
}

export interface RarityStats {
    lineRate: number;
    [statName: string]: StatRange | number;
}

export interface InnerAbilitiesData {
    [rarity: string]: RarityStats;
}

export interface RarityRates {
    [level: number]: {
        [rarity: string]: number;
    };
}

// Inner abilities data with min/max values per rarity
// Uses STAT.X.id as keys for consistency
export const innerAbilitiesData: InnerAbilitiesData = {
    "Mystic": {
        lineRate: 5.2632, // Probability of getting a specific line within this rarity (%)
        "Meso Drop": { min: 9, max: 15 },
        "EXP Gain": { min: 9, max: 15 },
        [STAT.DEF_PEN.id]: { min: 14, max: 20 },
        [STAT.BOSS_DAMAGE.id]: { min: 28, max: 40 },
        [STAT.NORMAL_DAMAGE.id]: { min: 28, max: 40 },
        [STAT.ATTACK_SPEED.id]: { min: 15, max: 20 },
        "Damage Taken Decrease": { min: 7, max: 10 },
        [STAT.MIN_DAMAGE.id]: { min: 28, max: 40 },
        [STAT.MAX_DAMAGE.id]: { min: 28, max: 40 },
        [STAT.CRIT_RATE.id]: { min: 15, max: 20 },
        "Critical Resistance": { min: 22.5, max: 30 },
        [STAT.DAMAGE.id]: { min: 28, max: 40 },
        "Debuff Tolerance": { min: 18, max: 25 },
        [STAT.PRIMARY_MAIN_STAT.id]: { min: 1500, max: 2500 },
        "Max HP": { min: 70000, max: 115000 },
        "Max MP": { min: 900, max: 1500 },
        "Accuracy": { min: 20, max: 25 },
        "Evasion": { min: 20, max: 25 },
        "MP Recovery Per Sec": { min: 80, max: 150 }
    },
    "Legendary": {
        lineRate: 5.2632, // Probability of getting a specific line within this rarity (%)
        "Meso Drop": { min: 5, max: 8 },
        "EXP Gain": { min: 5, max: 8 },
        [STAT.DEF_PEN.id]: { min: 8, max: 12 },
        [STAT.BOSS_DAMAGE.id]: { min: 18, max: 25 },
        [STAT.NORMAL_DAMAGE.id]: { min: 18, max: 25 },
        [STAT.ATTACK_SPEED.id]: { min: 10, max: 14 },
        "Damage Taken Decrease": { min: 4, max: 6 },
        [STAT.MIN_DAMAGE.id]: { min: 18, max: 25 },
        [STAT.MAX_DAMAGE.id]: { min: 18, max: 25 },
        [STAT.CRIT_RATE.id]: { min: 10, max: 14 },
        "Critical Resistance": { min: 15, max: 21 },
        [STAT.DAMAGE.id]: { min: 18, max: 25 },
        "Debuff Tolerance": { min: 14, max: 16 },
        [STAT.PRIMARY_MAIN_STAT.id]: { min: 800, max: 1200 },
        "Max HP": { min: 35000, max: 65000 },
        "Max MP": { min: 500, max: 800 },
        "Accuracy": { min: 14, max: 16 },
        "Evasion": { min: 14, max: 16 },
        "MP Recovery Per Sec": { min: 40, max: 60 }
    },
    "Unique": {
        lineRate: 7.1429, // Probability of getting a specific line within this rarity (%)
        [STAT.ATTACK_SPEED.id]: { min: 7, max: 9 },
        "Damage Taken Decrease": { min: 2, max: 3 },
        [STAT.MIN_DAMAGE.id]: { min: 12, max: 15 },
        [STAT.MAX_DAMAGE.id]: { min: 12, max: 15 },
        [STAT.CRIT_RATE.id]: { min: 7, max: 9 },
        "Critical Resistance": { min: 10.5, max: 13.5 },
        [STAT.DAMAGE.id]: { min: 12, max: 15 },
        "Debuff Tolerance": { min: 10, max: 12 },
        [STAT.PRIMARY_MAIN_STAT.id]: { min: 400, max: 700 },
        "Max HP": { min: 15000, max: 30000 },
        "Max MP": { min: 200, max: 400 },
        "Accuracy": { min: 10, max: 12 },
        "Evasion": { min: 10, max: 12 },
        "MP Recovery Per Sec": { min: 21, max: 30 }
    },
    "Epic": {
        lineRate: 8.3333, // Probability of getting a specific line within this rarity (%)
        [STAT.MIN_DAMAGE.id]: { min: 7, max: 10 },
        [STAT.MAX_DAMAGE.id]: { min: 7, max: 10 },
        [STAT.CRIT_RATE.id]: { min: 3, max: 6 },
        "Critical Resistance": { min: 4.5, max: 9 },
        [STAT.DAMAGE.id]: { min: 7, max: 10 },
        "Debuff Tolerance": { min: 6, max: 8 },
        [STAT.PRIMARY_MAIN_STAT.id]: { min: 200, max: 300 },
        "Max HP": { min: 4500, max: 9000 },
        "Max MP": { min: 100, max: 150 },
        "Accuracy": { min: 6, max: 8 },
        "Evasion": { min: 6, max: 8 },
        "MP Recovery Per Sec": { min: 11, max: 20 }
    },
    "Rare": {
        lineRate: 12.0, // Probability of getting a specific line within this rarity (%)
        [STAT.DAMAGE.id]: { min: 3, max: 5 },
        "Damage Tolerance": { min: 4, max: 5 },
        [STAT.PRIMARY_MAIN_STAT.id]: { min: 100, max: 150 },
        "Max HP": { min: 1800, max: 3000 },
        "Max MP": { min: 50, max: 70 },
        "Accuracy": { min: 4, max: 5 },
        "Evasion": { min: 4, max: 5 },
        "MP Recovery Per Sec": { min: 6, max: 10 }
    },
    "Normal": {
        lineRate: 16.6667, // Probability of getting a specific line within this rarity (%)
        [STAT.PRIMARY_MAIN_STAT.id]: { min: 40, max: 60 },
        "Max HP": { min: 1200, max: 1500 },
        "Max MP": { min: 30, max: 40 },
        "Accuracy": { min: 2, max: 3 },
        "Evasion": { min: 2, max: 3 },
        "MP Recovery Per Sec": { min: 3, max: 5 }
    }
};

// Inner ability rarity rates by character level
// Based on HeroPowerAbilityGradeProbTable.json from game data
// Probabilities are out of 10000 (divide by 100 to get percentage)
export const innerAbilityRarityRates: RarityRates = {
    1: {
        "Normal": 60.00,
        "Rare": 35.00,
        "Epic": 4.70,
        "Unique": 0.30,
        "Legendary": 0.00,
        "Mystic": 0.00
    },
    2: {
        "Normal": 59.30,
        "Rare": 35.00,
        "Epic": 5.00,
        "Unique": 0.70,
        "Legendary": 0.00,
        "Mystic": 0.00
    },
    3: {
        "Normal": 50.00,
        "Rare": 35.00,
        "Epic": 13.50,
        "Unique": 1.50,
        "Legendary": 0.00,
        "Mystic": 0.00
    },
    4: {
        "Normal": 40.00,
        "Rare": 35.00,
        "Epic": 22.50,
        "Unique": 2.50,
        "Legendary": 0.00,
        "Mystic": 0.00
    },
    5: {
        "Normal": 30.00,
        "Rare": 32.00,
        "Epic": 34.30,
        "Unique": 3.50,
        "Legendary": 0.20,
        "Mystic": 0.00
    },
    6: {
        "Normal": 25.00,
        "Rare": 32.00,
        "Epic": 39.00,
        "Unique": 3.60,
        "Legendary": 0.40,
        "Mystic": 0.00
    },
    7: {
        "Normal": 25.00,
        "Rare": 32.00,
        "Epic": 38.50,
        "Unique": 3.70,
        "Legendary": 0.80,
        "Mystic": 0.00
    },
    8: {
        "Normal": 25.00,
        "Rare": 32.00,
        "Epic": 38.33,
        "Unique": 3.65,
        "Legendary": 1.00,
        "Mystic": 0.02
    },
    9: {
        "Normal": 25.00,
        "Rare": 32.00,
        "Epic": 38.28,
        "Unique": 3.60,
        "Legendary": 1.09,
        "Mystic": 0.03
    },
    10: {
        "Normal": 25.00,
        "Rare": 32.00,
        "Epic": 38.23,
        "Unique": 3.55,
        "Legendary": 1.18,
        "Mystic": 0.04
    },
    11: {
        "Normal": 25.00,
        "Rare": 32.00,
        "Epic": 38.17,
        "Unique": 3.50,
        "Legendary": 1.27,
        "Mystic": 0.06
    },
    12: {
        "Normal": 25.00,
        "Rare": 32.00,
        "Epic": 38.11,
        "Unique": 3.45,
        "Legendary": 1.36,
        "Mystic": 0.08
    },
    13: {
        "Normal": 25.00,
        "Rare": 32.00,
        "Epic": 38.05,
        "Unique": 3.40,
        "Legendary": 1.45,
        "Mystic": 0.10
    },
    14: {
        "Normal": 25.00,
        "Rare": 32.00,
        "Epic": 37.99,
        "Unique": 3.35,
        "Legendary": 1.54,
        "Mystic": 0.12
    },
    15: {
        "Normal": 25.00,
        "Rare": 32.00,
        "Epic": 37.93,
        "Unique": 3.30,
        "Legendary": 1.63,
        "Mystic": 0.14
    },
    16: {
        "Normal": 25.00,
        "Rare": 32.00,
        "Epic": 37.87,
        "Unique": 3.25,
        "Legendary": 1.72,
        "Mystic": 0.16
    },
    17: {
        "Normal": 25.00,
        "Rare": 32.00,
        "Epic": 37.81,
        "Unique": 3.20,
        "Legendary": 1.81,
        "Mystic": 0.18
    },
    18: {
        "Normal": 25.00,
        "Rare": 32.00,
        "Epic": 37.75,
        "Unique": 3.15,
        "Legendary": 1.90,
        "Mystic": 0.20
    },
    19: {
        "Normal": 25.00,
        "Rare": 32.00,
        "Epic": 37.69,
        "Unique": 3.10,
        "Legendary": 1.99,
        "Mystic": 0.22
    },
    20: {
        "Normal": 25.00,
        "Rare": 32.00,
        "Epic": 37.63,
        "Unique": 3.05,
        "Legendary": 2.08,
        "Mystic": 0.24
    }
};
