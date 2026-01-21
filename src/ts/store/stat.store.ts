import type { Stat, STORAGE_KEY_TO_STAT_PROPERTY } from '@ts/types/types';
import { STORAGE_KEY_MAPPING } from '@ts/types/types';

/**
 * Reactive stat store for managing character stats
 */
class StatStore {
    private stats: Stat = this.getInitialStats();
    private listeners: Set<(stats: Stat) => void> = new Set();

    private getInitialStats(): Stat {
        return {
            attack: '0',
            critRate: '0',
            critDamage: '0',
            statDamage: '0',
            damage: '0',
            damageAmp: '0',
            attackSpeed: '0',
            defPen: '0',
            bossDamage: '0',
            normalDamage: '0',
            skillCoeff: '0',
            skillMastery: '0',
            skillMasteryBoss: '0',
            minDamage: '0',
            maxDamage: '0',
            primaryMainStat: '0',
            secondaryMainStat: '0',
            finalDamage: '0',
            targetStage: '',
            defense: '0',
            mainStatPct: '0',
            skillLevel1st: '0',
            skillLevel2nd: '0',
            skillLevel3rd: '0',
            skillLevel4th: '0',
            str: '0',
            dex: '0',
            int: '0',
            luk: '0',
            characterLevel: '0'
        };
    }

    /**
     * Load stats from localStorage and populate the store
     * Maps localStorage keys (with hyphens) to camelCase Stat properties
     */
    loadStatsFromLocalStorage(): boolean {
        const savedData = localStorage.getItem('damageCalculatorData');
        if (!savedData) {
            return false;
        }

        try {
            const data = JSON.parse(savedData);

            if (data.baseSetup) {
                // Map localStorage keys to Stat properties and merge into store
                Object.keys(data.baseSetup).forEach((storageKey) => {
                    const statKey = STORAGE_KEY_TO_STAT_PROPERTY[storageKey];
                    if (statKey && statKey in this.stats) {
                        this.stats[statKey] = data.baseSetup[storageKey];
                    }
                });

                // Notify all listeners of the update
                this.notify();

                return true;
            }

            return false;
        } catch (e) {
            console.error('Error loading stats from localStorage:', e);
            return false;
        }
    }

    /**
     * Get the current stats object
     */
    getStats(): Stat {
        return { ...this.stats };
    }

    /**
     * Get a specific stat value
     */
    getStat<K extends keyof Stat>(key: K): Stat[K] {
        return this.stats[key];
    }

    /**
     * Update a specific stat value
     */
    setStat<K extends keyof Stat>(key: K, value: Stat[K]): void {
        this.stats[key] = value;
        this.notify();
    }

    /**
     * Update multiple stats at once
     */
    setStats(updates: Partial<Stat>): void {
        Object.keys(updates).forEach((key) => {
            if (key in this.stats) {
                this.stats[key as keyof Stat] = updates[key as keyof Stat]!;
            }
        });
        this.notify();
    }

    /**
     * Sync stats from DOM elements (useful for manual refresh)
     * Maps DOM element IDs (with hyphens and -base suffix) to camelCase Stat properties
     */
    syncFromDOM(): void {
        // Iterate through all stat properties and sync from corresponding DOM elements
        Object.entries(STORAGE_KEY_MAPPING).forEach(([statKey, storageKey]) => {
            // Most elements have -base suffix, character-level does not
            const elementId = statKey === 'characterLevel'
                ? storageKey
                : `${storageKey}-base`;

            const element = document.getElementById(elementId);
            if (element) {
                this.stats[statKey as keyof Stat] = element.value;
            }
        });
    }

    /**
     * Subscribe to stat changes
     * @returns Unsubscribe function
     */
    subscribe(listener: (stats: Stat) => void): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    /**
     * Notify all listeners of stat changes
     */
    private notify(): void {
        this.listeners.forEach((listener) => listener(this.getStats()));
    }

    /**
     * Reset all stats to initial values
     */
    reset(): void {
        this.stats = this.getInitialStats();
        this.notify();
    }
}

// Export singleton instance
export const statStore = new StatStore();

// Also export the class for testing purposes
export { StatStore };
