/**
 * Equipment Type Definitions
 * Shared types for the equipment module
 */

import { STAT, type StatId } from '@ts/types/constants';

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
 * Stat line interface using STAT constant IDs
 * The type field stores STAT constant ID values (e.g., 'critRate', 'bossDamage', 'attack')
 * All stat references now use STAT.X.id format for consistency
 */
export interface StatLine {
    type: StatId;
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
 * Uses STAT constant IDs as property keys for consistency with StatCalculationService
 */
export interface EquipmentSlotStats {
    [STAT.ATTACK.id]: number;
    [STAT.PRIMARY_MAIN_STAT.id]?: number;
    [STAT.MAIN_STAT_PCT.id]?: number;
    [STAT.DEFENSE.id]?: number;
    [STAT.CRIT_RATE.id]?: number;
    [STAT.CRIT_DAMAGE.id]?: number;
    [STAT.BOSS_DAMAGE.id]?: number;
    [STAT.NORMAL_DAMAGE.id]?: number;
    [STAT.DAMAGE.id]?: number;
    [STAT.DAMAGE_AMP.id]?: number;
    [STAT.FINAL_DAMAGE.id]?: number;
    [STAT.MIN_DAMAGE.id]?: number;
    [STAT.MAX_DAMAGE.id]?: number;
    [STAT.SKILL_LEVEL_1ST.id]?: number;
    [STAT.SKILL_LEVEL_2ND.id]?: number;
    [STAT.SKILL_LEVEL_3RD.id]?: number;
    [STAT.SKILL_LEVEL_4TH.id]?: number;
    [STAT.SKILL_LEVEL_ALL.id]?: number;
    [STAT.ATTACK_SPEED.id]?: number;
}

/**
 * Equipment contributions (all slots)
 */
export type EquipmentContributions = Record<EquipmentSlotId, EquipmentSlotStats | null>;

/**
 * Aggregate stats totals
 * Uses STAT constant IDs as property keys for consistency with StatCalculationService
 */
export interface EquipmentAggregateStats {
    [STAT.ATTACK.id]: number;
    [STAT.PRIMARY_MAIN_STAT.id]: number;
    [STAT.MAIN_STAT_PCT.id]: number;
    [STAT.DEFENSE.id]: number;
    [STAT.CRIT_RATE.id]: number;
    [STAT.CRIT_DAMAGE.id]: number;
    [STAT.BOSS_DAMAGE.id]: number;
    [STAT.NORMAL_DAMAGE.id]: number;
    [STAT.DAMAGE.id]: number;
    [STAT.DAMAGE_AMP.id]: number;
    [STAT.FINAL_DAMAGE.id]: number;
    [STAT.MIN_DAMAGE.id]: number;
    [STAT.MAX_DAMAGE.id]: number;
    [STAT.SKILL_LEVEL_1ST.id]: number;
    [STAT.SKILL_LEVEL_2ND.id]: number;
    [STAT.SKILL_LEVEL_3RD.id]: number;
    [STAT.SKILL_LEVEL_4TH.id]: number;
    [STAT.SKILL_LEVEL_ALL.id]: number;
    [STAT.ATTACK_SPEED.id]: number;
}

/**
 * Stat display configuration for summary
 */
export interface StatDisplayConfig {
    key: StatId;
    label: string;
    isPercent: boolean;
}
