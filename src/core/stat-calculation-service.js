// StatCalculationService - Unified stat modification service
// Provides a consistent, chainable API for modifying stats before calculating DPS

import { calculateDamage } from '@core/calculations/damage-calculations.js';
import { calculateMainStatPercentGain } from '@core/calculations/stat-calculations.js';

/**
 * StatCalculationService - A unified service for stat manipulation
 *
 * This class provides a consistent, chainable API for modifying stats before
 * calling calculateDamage(). It eliminates the duplication and inconsistency
 * of stat manipulation patterns across the codebase.
 *
 * Usage:
 *   const service = new StatCalculationService(baseStats, weaponAttackBonus, context);
 *   const result = service.addAttack(500).addMainStat(1000).calculateDPS('boss');
 *   const dpsGain = ((result.dps - baseDPS) / baseDPS * 100);
 */
export class StatCalculationService {
    /**
     * @param {Object} baseStats - The base stats object to modify
     * @param {number} weaponAttackBonus - Weapon attack bonus percentage (default: 0)
     * @param {Object} context - Additional context for stat calculations
     * @param {number} context.mainStatPct - Current main stat % base value
     * @param {number} context.primaryMainStat - Primary main stat value
     * @param {number} context.defense - Defense value
     * @param {Object} context.selectedClass - Selected class information
     */
    constructor(baseStats, weaponAttackBonus = 0, context = {}) {
        // Clone the stats to avoid mutating the original
        this.stats = { ...baseStats };
        this.weaponAttackBonus = weaponAttackBonus;
        this.context = {
            mainStatPct: context.mainStatPct || 0,
            primaryMainStat: context.primaryMainStat || 0,
            defense: context.defense || 0,
            selectedClass: context.selectedClass || null
        };
    }

    /**
     * Add flat attack with optional weapon attack bonus application
     * @param {number} value - Attack value to add
     * @param {boolean} applyWeaponBonus - Whether to apply weapon attack bonus (default: true)
     * @returns {StatCalculationService} Returns this for chaining
     */
    addAttack(value, applyWeaponBonus = true) {
        const effective = applyWeaponBonus
            ? value * (1 + this.weaponAttackBonus / 100)
            : value;
        this.stats.attack += effective;
        return this;
    }

    /**
     * Add main stat (flat value, converts to stat damage)
     * 100 main stat = 1% stat damage
     * @param {number} value - Main stat value to add
     * @returns {StatCalculationService} Returns this for chaining
     */
    addMainStat(value) {
        const statDamageIncrease = value / 100;
        this.stats.statDamage += statDamageIncrease;
        return this;
    }

    /**
     * Add main stat % with proper diminishing returns calculation
     * @param {number} value - Main stat % to add
     * @returns {StatCalculationService} Returns this for chaining
     */
    addMainStatPct(value) {
        const statDamageGain = calculateMainStatPercentGain(
            value,
            this.context.mainStatPct,
            this.context.primaryMainStat,
            this.context.defense,
            this.context.selectedClass
        );
        this.stats.statDamage += statDamageGain;
        return this;
    }

    /**
     * Add a percentage-based stat (additive)
     * @param {string} statKey - The stat key (e.g., 'bossDamage', 'critRate')
     * @param {number} value - Value to add
     * @returns {StatCalculationService} Returns this for chaining
     */
    addPercentageStat(statKey, value) {
        this.stats[statKey] = (this.stats[statKey] || 0) + value;
        return this;
    }

    /**
     * Add a multiplicative stat (like Final Damage)
     * Uses formula: newValue = ((1 + old/100) * (1 + value/100) - 1) * 100
     * @param {string} statKey - The stat key
     * @param {number} value - Value to add
     * @returns {StatCalculationService} Returns this for chaining
     */
    addMultiplicativeStat(statKey, value) {
        const oldValue = this.stats[statKey] || 0;
        const newValue = (((1 + oldValue / 100) * (1 + value / 100)) - 1) * 100;
        this.stats[statKey] = newValue;
        return this;
    }

    /**
     * Add a stat with diminishing returns (like Attack Speed)
     * Uses formula: newValue = (1 - (1 - old/factor) * (1 - value/factor)) * factor
     * @param {string} statKey - The stat key
     * @param {number} value - Value to add
     * @param {number} factor - Diminishing returns factor (e.g., 150 for attack speed)
     * @returns {StatCalculationService} Returns this for chaining
     */
    addDiminishingReturnStat(statKey, value, factor) {
        const oldValue = this.stats[statKey] || 0;
        const newValue = (1 - (1 - oldValue / factor) * (1 - value / factor)) * factor;
        this.stats[statKey] = newValue;
        return this;
    }

    /**
     * Subtract a flat stat value
     * @param {string} statKey - The stat key
     * @param {number} value - Value to subtract
     * @returns {StatCalculationService} Returns this for chaining
     */
    subtractStat(statKey, value) {
        this.stats[statKey] -= value;
        return this;
    }

    /**
     * Subtract attack with optional weapon attack bonus application
     * @param {number} value - Attack value to subtract
     * @param {boolean} applyWeaponBonus - Whether to apply weapon attack bonus (default: true)
     * @returns {StatCalculationService} Returns this for chaining
     */
    subtractAttack(value, applyWeaponBonus = true) {
        const effective = applyWeaponBonus
            ? value * (1 + this.weaponAttackBonus / 100)
            : value;
        this.stats.attack -= effective;
        return this;
    }

    /**
     * Set a stat to a specific value
     * @param {string} statKey - The stat key
     * @param {number} value - Value to set
     * @returns {StatCalculationService} Returns this for chaining
     */
    setStat(statKey, value) {
        this.stats[statKey] = value;
        return this;
    }

    /**
     * Get a copy of the current stats
     * @returns {Object} Copy of current stats
     */
    getStats() {
        return { ...this.stats };
    }

    /**
     * Calculate damage and return the full result object
     * @param {string} monsterType - 'boss' or 'normal' (default: 'boss')
     * @returns {Object} Result from calculateDamage (includes dps, expectedDamage, etc.)
     */
    calculateDamage(monsterType = 'boss') {
        return calculateDamage(this.stats, monsterType);
    }

    /**
     * Calculate DPS only (shorthand for calculateDamage().dps)
     * @param {string} monsterType - 'boss' or 'normal' (default: 'boss')
     * @returns {number} DPS value
     */
    calculateDPS(monsterType = 'boss') {
        return this.calculateDamage(monsterType).dps;
    }

    /**
     * Calculate DPS gain compared to base stats
     * @param {number} baseDPS - Base DPS to compare against
     * @param {string} monsterType - 'boss' or 'normal' (default: 'boss')
     * @returns {number} DPS gain as percentage
     */
    calculateDPSGain(baseDPS, monsterType = 'boss') {
        const newDPS = this.calculateDPS(monsterType);
        return ((newDPS - baseDPS) / baseDPS * 100);
    }

    /**
     * Reset stats to original base stats
     * @returns {StatCalculationService} Returns this for chaining
     */
    reset() {
        // We need to store the original stats
        if (!this._originalStats) {
            this._originalStats = { ...this.stats };
        }
        this.stats = { ...this._originalStats };
        return this;
    }
}

/**
 * Factory function to create a StatCalculationService with common setup
 * @param {Object} baseStats - Base stats
 * @param {Object} options - Configuration options
 * @returns {StatCalculationService}
 */
export function createStatService(baseStats, options = {}) {
    const {
        weaponAttackBonus = 0,
        mainStatPct = 0,
        primaryMainStat = 0,
        defense = 0,
        selectedClass = null
    } = options;

    return new StatCalculationService(
        baseStats,
        weaponAttackBonus,
        { mainStatPct, primaryMainStat, defense, selectedClass }
    );
}
