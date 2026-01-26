/**
 * Skill Coefficient Manager
 *
 * Listens for changes to character level and skill levels (3rd/4th/all)
 * and automatically updates the SKILL_COEFFICIENT stat in the loadout store.
 *
 * This provides an event-driven approach to keeping skill coefficients
 * in sync with the underlying character data.
 */

import { loadoutStore } from '@ts/store/loadout.store';
import { calculate3rdJobSkillCoefficient, calculate4thJobSkillCoefficient } from '@ts/services/skill-coefficient.service';
import { JOB_TIER } from '@ts/types/constants';

/**
 * Manages skill coefficient updates through event subscriptions
 */
class SkillCoefficientManager {
    private unsubscribeFunctions: (() => void)[] = [];
    private isInitialized: boolean = false;

    /**
     * Initialize the manager and subscribe to relevant events
     * Call this during app initialization
     */
    initialize(): void {
        if (this.isInitialized) {
            console.warn('SkillCoefficientManager already initialized');
            return;
        }

        // Subscribe to skill level changes
        this.unsubscribeFunctions.push(
            loadoutStore.on('skill:level:changed', () => {
                this.updateSkillCoefficient();
            })
        );

        // Subscribe to character level changes
        this.unsubscribeFunctions.push(
            loadoutStore.on('character:level:changed', () => {
                this.updateSkillCoefficient();
            })
        );

        // Subscribe to job tier changes
        this.unsubscribeFunctions.push(
            loadoutStore.on('character:jobtier:changed', () => {
                this.updateSkillCoefficient();
            })
        );

        // Calculate initial coefficient on load to ensure it's up-to-date
        this.updateSkillCoefficient();

        this.isInitialized = true;
    }

    /**
     * Update the skill coefficient based on current character data
     * Reads from the store and writes back to the store
     */
    private updateSkillCoefficient(): void {
        const character = loadoutStore.getCharacter();
        const baseStats = loadoutStore.getBaseStats();

        let coefficient: number;

        // Calculate coefficient based on job tier
        if (character.jobTier === JOB_TIER.FOURTH) {
            coefficient = calculate4thJobSkillCoefficient(
                character.level,
                baseStats.SKILL_LEVEL_4TH + baseStats.SKILL_LEVEL_ALL
            );
        } else if (character.jobTier === JOB_TIER.THIRD) {
            coefficient = calculate3rdJobSkillCoefficient(
                character.level,
                baseStats.SKILL_LEVEL_3RD + baseStats.SKILL_LEVEL_ALL
            );
        } else {
            // Not applicable for 1st/2nd job
            return;
        }

        // Update the coefficient in the store
        loadoutStore.updateBaseStat('SKILL_COEFFICIENT', coefficient);
    }

    /**
     * Clean up event subscriptions
     * Call this during app teardown (if applicable)
     */
    destroy(): void {
        this.unsubscribeFunctions.forEach(fn => fn());
        this.unsubscribeFunctions = [];
        this.isInitialized = false;
    }

    /**
     * Check if manager is initialized
     */
    isActive(): boolean {
        return this.isInitialized;
    }
}

// Export singleton instance
export const skillCoefficientManager = new SkillCoefficientManager();
