/**
 * Item Comparison Service
 * Provides passive gains calculation for items with job skill level bonuses
 */

import {
    calculateJobSkillPassiveGains
} from '@ts/services/skill-coefficient.service.js';
import { STAT } from '@ts/types';
import type { ComparisonItem } from '@ts/types/page/gear-lab/gear-lab.types';

// Re-export for convenience
export type { ComparisonItem };

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Context for passive gains calculations
 */
export interface PassiveGainsContext {
    /** Character class (e.g., 'dark-knight') */
    currentClass: string;
    /** Character level */
    characterLevel: number;
    /**
     * Defense stat for passive gains calculations
     *
     * For Dark Knight: Used for Iron Wall passive (defense → STR conversion).
     * Should be the character's base defense value (before item modifications),
     * as item defense bonuses are handled separately via addDefense/subtractDefense.
     *
     * @example
     * // Get base defense from stats
     * defense: baseStats.DEFENSE || 0
     */
    defense: number;
}

// ============================================================================
// PASSIVE GAINS CALCULATION
// ============================================================================

/**
 * Calculate passive gains for a single item based on its skill level bonuses
 *
 * @param item - Item with skill level bonuses
 * @param context - Calculation context
 * @returns Passive gains with statChanges, breakdown, and complexPassives
 */
export function calculatePassiveGainsForItem(
    item: ComparisonItem,
    context: PassiveGainsContext
): {
    statChanges: Record<string, number>;
    breakdown: Array<{
        passive: string;
        stat: string;
        statDisplay?: string;
        baseValue: number;
        bonusValue: number;
        gain: number;
        isPercent: boolean;
        note?: string;
    }>;
    complexPassives: Array<{
        passive: string;
        stat?: string;
        baseValue?: number;
        bonusValue?: number;
        gain?: number;
        isPercent?: boolean;
        note?: string;
    }>;
    complexStatChanges: Record<string, number>;
} {
    const { currentClass, characterLevel, defense } = context;

    // Extract and validate skill level bonuses from item
    const skillLevelBonuses = {
        firstJob: validateSkillLevel(item.statLines.find(s => s.type === STAT.SKILL_LEVEL_1ST.id)?.value),
        secondJob: validateSkillLevel(item.statLines.find(s => s.type === STAT.SKILL_LEVEL_2ND.id)?.value),
        thirdJob: validateSkillLevel(item.statLines.find(s => s.type === STAT.SKILL_LEVEL_3RD.id)?.value),
        fourthJob: validateSkillLevel(item.statLines.find(s => s.type === STAT.SKILL_LEVEL_4TH.id)?.value),
        allSkills: validateSkillLevel(item.statLines.find(s => s.type === STAT.SKILL_LEVEL_ALL.id)?.value),
    };

    // Check if item has any skill level bonuses
    const hasSkillLevels = Object.values(skillLevelBonuses).some(v => v > 0);

    if (!hasSkillLevels) {
        return {
            statChanges: {},
            breakdown: [],
            complexPassives: [],
            complexStatChanges: {}
        };
    }

    // Calculate passive gains using the skill coefficient service
    const result = calculateJobSkillPassiveGains(
        currentClass,
        characterLevel,
        skillLevelBonuses,
        { defense }
    );

    return {
        statChanges: result.statChanges,
        breakdown: result.breakdown,
        complexPassives: result.complexPassives,
        complexStatChanges: result.complexStatChanges || {}
    };
}

/**
 * Validate and normalize a skill level value
 * @param value - Skill level value from item
 * @returns Validated skill level (0-50)
 */
function validateSkillLevel(value: number | undefined): number {
    if (typeof value !== 'number' || isNaN(value)) {
        return 0;
    }
    // Clamp to reasonable range (0-50)
    return Math.max(0, Math.min(50, Math.floor(value)));
}
