/**
 * Equipment Type Definitions
 * Shared types for the equipment module
 */

import { STAT } from '@ts/types/constants';

/**
 * Equipment slot ID type
 */
export type EquipmentSlotId =
    | 'head'
    | 'cape'
    | 'chest'
    | 'shoulders'
    | 'legs'
    | 'belt'
    | 'gloves'
    | 'boots'
    | 'ring'
    | 'neck'
    | 'eye-accessory';

/**
 * Equipment slot configuration interface
 */
export interface EquipmentSlotConfig {
    id: EquipmentSlotId;
    name: string;
    hasMainStat: boolean;
}

/**
 * Stat line type (value from availableStats array)
 */
export type StatLineType =
    | 'attack'
    | 'main-stat'
    | 'defense'
    | 'crit-rate'
    | 'crit-damage'
    | 'skill-level-1st'
    | 'skill-level-2nd'
    | 'skill-level-3rd'
    | 'skill-level-4th'
    | 'skill-level-all'
    | 'normal-damage'
    | 'boss-damage'
    | 'damage'
    | 'damage-amp'
    | 'final-damage'
    | 'min-damage'
    | 'max-damage';

/**
 * Stat line interface
 */
export interface StatLine {
    type: StatLineType;
    value: number;
}

/**
 * Equipment data interface for a single slot
 */
export interface EquipmentSlotData {
    name: string;
    attack: number;
    mainStat?: number; // Optional since not all slots have main stat
    statLines: StatLine[];
}

/**
 * Equipment data storage (all slots)
 */
export type EquipmentData = Record<EquipmentSlotId, EquipmentSlotData | null>;

/**
 * Equipment slot stats (calculated contributions)
 */
export interface EquipmentSlotStats {
    attack: number;
    mainStat?: number;
    defense?: number;
    critRate?: number;
    critDamage?: number;
    bossDamage?: number;
    normalDamage?: number;
    damage?: number;
    damageAmp?: number;
    finalDamage?: number;
    minDamage?: number;
    maxDamage?: number;
    skillLevel1st?: number;
    skillLevel2nd?: number;
    skillLevel3rd?: number;
    skillLevel4th?: number;
    skillLevelAll?: number;
}

/**
 * Equipment contributions (all slots)
 */
export type EquipmentContributions = Record<EquipmentSlotId, EquipmentSlotStats | null>;

/**
 * Aggregate stats totals
 */
export interface EquipmentAggregateStats {
    attack: number;
    mainStat: number;
    defense: number;
    critRate: number;
    critDamage: number;
    bossDamage: number;
    normalDamage: number;
    damage: number;
    damageAmp: number;
    finalDamage: number;
    minDamage: number;
    maxDamage: number;
    skillLevel1st: number;
    skillLevel2nd: number;
    skillLevel3rd: number;
    skillLevel4th: number;
    skillLevelAll: number;
}

/**
 * Stat display configuration for summary
 */
export interface StatDisplayConfig {
    key: keyof EquipmentAggregateStats;
    label: string;
    isPercent: boolean;
}

/**
 * Equipment slot configuration interface
 */
export interface EquipmentSlotConfig {
    id: EquipmentSlotId;
    name: string;
    hasMainStat: boolean;
}

/**
 * Stat type to property key mapping (shared between logic and UI)
 * Uses STAT constant IDs where possible for consistency
 */
export const STAT_KEY_MAP: Record<StatLineType, keyof EquipmentSlotStats> = {
    'attack': STAT.ATTACK.id,
    'main-stat': 'mainStat', // Equipment-specific key
    'defense': STAT.DEFENSE.id,
    'crit-rate': STAT.CRIT_RATE.id,
    'crit-damage': STAT.CRIT_DAMAGE.id,
    'skill-level-1st': STAT.SKILL_LEVEL_1ST.id,
    'skill-level-2nd': STAT.SKILL_LEVEL_2ND.id,
    'skill-level-3rd': STAT.SKILL_LEVEL_3RD.id,
    'skill-level-4th': STAT.SKILL_LEVEL_4TH.id,
    'skill-level-all': 'skillLevelAll', // Equipment-specific key (no STAT equivalent)
    'normal-damage': STAT.NORMAL_DAMAGE.id,
    'boss-damage': STAT.BOSS_DAMAGE.id,
    'damage': STAT.DAMAGE.id,
    'damage-amp': STAT.DAMAGE_AMP.id,
    'final-damage': STAT.FINAL_DAMAGE.id,
    'min-damage': STAT.MIN_DAMAGE.id,
    'max-damage': STAT.MAX_DAMAGE.id
} as const;
