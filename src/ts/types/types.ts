/**
 * Strongly typed interface for all character stats
 * Uses clean camelCase property names without hyphens
 */
export interface Stat {
    attack: string;
    critRate: string;
    critDamage: string;
    statDamage: string;
    damage: string;
    damageAmp: string;
    attackSpeed: string;
    defPen: string;
    bossDamage: string;
    normalDamage: string;
    skillCoeff: string;
    skillMastery: string;
    skillMasteryBoss: string;
    minDamage: string;
    maxDamage: string;
    primaryMainStat: string;
    secondaryMainStat: string;
    finalDamage: string;
    targetStage: string;
    defense: string;
    mainStatPct: string;
    skillLevel1st: string;
    skillLevel2nd: string;
    skillLevel3rd: string;
    skillLevel4th: string;
    str: string;
    dex: string;
    int: string;
    luk: string;
    characterLevel: string;
}

/**
 * Mapping between localStorage keys (with hyphens) and Stat property names (camelCase)
 */
export const STORAGE_KEY_MAPPING: Record<keyof Stat, string> = {
    attack: 'attack',
    critRate: 'crit-rate',
    critDamage: 'crit-damage',
    statDamage: 'stat-damage',
    damage: 'damage',
    damageAmp: 'damage-amp',
    attackSpeed: 'attack-speed',
    defPen: 'def-pen',
    bossDamage: 'boss-damage',
    normalDamage: 'normal-damage',
    skillCoeff: 'skill-coeff',
    skillMastery: 'skill-mastery',
    skillMasteryBoss: 'skill-mastery-boss',
    minDamage: 'min-damage',
    maxDamage: 'max-damage',
    primaryMainStat: 'primary-main-stat',
    secondaryMainStat: 'secondary-main-stat',
    finalDamage: 'final-damage',
    targetStage: 'target-stage',
    defense: 'defense',
    mainStatPct: 'main-stat-pct',
    skillLevel1st: 'skill-level-1st',
    skillLevel2nd: 'skill-level-2nd',
    skillLevel3rd: 'skill-level-3rd',
    skillLevel4th: 'skill-level-4th',
    str: 'str',
    dex: 'dex',
    int: 'int',
    luk: 'luk',
    characterLevel: 'character-level'
} as const;

/**
 * Reverse mapping: localStorage key -> Stat property name
 */
export const STORAGE_KEY_TO_STAT_PROPERTY: Record<string, keyof Stat> = Object.entries(
    STORAGE_KEY_MAPPING
).reduce((acc, [statKey, storageKey]) => {
    acc[storageKey] = statKey as keyof Stat;
    return acc;
}, {} as Record<string, keyof Stat>);

/**
 * Array of all Stat property keys (camelCase)
 */
export const STAT_KEYS = Object.keys(STORAGE_KEY_MAPPING) as Array<keyof Stat>;

/**
 * Array of all localStorage keys (with hyphens)
 */
export const STORAGE_KEYS = Object.values(STORAGE_KEY_MAPPING) as string[];

/**
 * Base setup fields that need to be saved/loaded/monitored
 */
export const BASE_SETUP_FIELDS = [
    'attack', 'crit-rate', 'crit-damage', 'stat-damage', 'damage',
    'damage-amp', 'attack-speed', 'def-pen', 'boss-damage',
    'normal-damage', 'skill-coeff', 'skill-mastery', 'skill-mastery-boss',
    'min-damage', 'max-damage', 'primary-main-stat', 'secondary-main-stat', 'final-damage',
    'target-stage', 'defense', 'main-stat-pct',
    'skill-level-1st', 'skill-level-2nd', 'skill-level-3rd', 'skill-level-4th',
    'str', 'dex', 'int', 'luk'
] as const;

export type BaseSetupField = typeof BASE_SETUP_FIELDS[number];
