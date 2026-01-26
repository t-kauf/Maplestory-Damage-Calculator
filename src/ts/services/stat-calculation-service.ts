// StatCalculationService - Unified stat modification service
// Provides a consistent, chainable API for modifying stats before calculating DPS

import { loadoutStore } from '@ts/store/loadout.store.js';
import { calculateFinalAttackBonusFromJobSkills, calculate3rdJobSkillCoefficient, calculate4thJobSkillCoefficient } from '@ts/services/skill-coefficient.service.js';
import { BaseStats, type StatKey } from '@ts/types/loadout.js';
import { JOB_TIER, STAT } from '@ts/types/constants';
import { calculateDamage } from './damage-calculation.service';

/**
 * Damage calculation result
 */
export interface DamageResult {
    baseDamage: number;
    baseHitDamage: number;
    nonCritMin: number;
    nonCritMax: number;
    nonCritAvg: number;
    critMin: number;
    critMax: number;
    critAvg: number;
    expectedDamage: number;
    dps: number;
    damageAmpMultiplier: number;
    attackSpeedMultiplier: number;
    finalDamageMultiplier: number;
}

/**
 * Monster type for damage calculations
 */
export type MonsterType = 'boss' | 'normal';

/**
 * Context object for stat calculations
 */
export interface StatContext {
    mainStatPct: number;
    mainStat: number;
    defense: number;
    selectedClass: string | null;
}

/**
 * Options for creating stat service
 */
export interface CreateStatServiceOptions {
    weaponAttackBonus?: number;
}

/**
 * Options for cumulative calculator series
 */
interface CumulativeSeriesOptions {
    weaponAttackBonus?: number;
    monsterType?: MonsterType;
    numSteps?: number;
}

/**
 * Series state for cumulative calculator
 */
interface SeriesState {
    baseStats: BaseStats;
    baseDPS: number;
    previousDPS: number;
    cumulativeStats: BaseStats;
    weaponAttackBonus: number;
    monsterType: MonsterType;
    numSteps: number;
    mainStatPct: number;
    mainStat: number;
    defense: number;
    selectedClass: string | null;
    previousCumulativeIncrease: number;
}

/**
 * Chart data point
 */
export interface ChartPoint {
    x: number;
    y: number;
}

/**
 * StatCalculationService - A unified service for stat manipulation
 *
 * This class provides a consistent, chainable API for modifying stats before
 * calling calculateDamage(). It eliminates the duplication and inconsistency
 * of stat manipulation patterns across the codebase.
 *
 * Usage:
 *   const service = new StatCalculationService(baseStats);
 *   const result = service.addAttack(500).addMainStat(1000).computeDPS('boss');
 *   const dpsGain = ((result.dps - baseDPS) / baseDPS * 100);
 */
export class StatCalculationService {
    private static readonly DARK_KNIGHT_DEFENSE_CONVERSION_RATE = 0.127;

    /**
     * Convert lowercase stat ID to StatKey (uppercase)
     * Maps 'attack' -> 'ATTACK', 'critRate' -> 'CRIT_RATE', etc.
     */
    private static idToStatKey(id: string): StatKey {
        // Find the STAT entry with matching ID
        for (const key of Object.keys(STAT) as StatKey[]) {
            if (STAT[key].id === id) {
                return key;
            }
        }
        throw new Error(`Unknown stat ID: ${id}`);
    }

    stats: BaseStats;
    weaponAttackBonus: number;
    context: StatContext;
    baseBossDPS: number;
    baseNormalDPS: number;
    private _originalStats?: BaseStats;

    /**
     * @param baseStats - The base stats object to modify
     * @param weaponAttackBonus - Weapon attack bonus percentage (undefined = auto-fetch from state)
     */
    constructor(baseStats: BaseStats, weaponAttackBonus?: number) {
        // Clone the stats to avoid mutating the original
        this.stats = { ...baseStats };    

        // Handle weaponAttackBonus: explicit value or auto-fetch from state
        if (weaponAttackBonus !== undefined) {
            // Explicit override provided
            this.weaponAttackBonus = weaponAttackBonus;
        } else {
            // Auto-fetch from loadout store
            const result = loadoutStore.getWeaponAttackBonus().totalAttack;

            if (typeof result !== 'number' || isNaN(result) || result < 0) {
                console.error('loadoutStore.getWeaponAttackBonus returned unexpected value:', result, '- treating as 0');
                this.weaponAttackBonus = 0;
            } else {
                this.weaponAttackBonus = result;
            }
        }

        // Read context values from stats object or state
        this.context = {
            mainStatPct: this.stats.MAIN_STAT_PCT || 0,
            mainStat: this.stats.PRIMARY_MAIN_STAT || 0,
            defense: this.stats.DEFENSE || 0,
            selectedClass: loadoutStore.getSelectedClass()
        };

        // Calculate base DPS for both monster types
        const baseDamage = calculateDamage(this.stats, 'boss');
        this.baseBossDPS = baseDamage.dps;
        this.baseNormalDPS = calculateDamage(this.stats, 'normal').dps;
    }

    private refreshSkillCoefficient(): void {
        const character = loadoutStore.getCharacter();
        if (character.jobTier === JOB_TIER.THIRD) {
            this.stats.SKILL_COEFFICIENT = calculate3rdJobSkillCoefficient(character.level, this.stats.SKILL_LEVEL_3RD + this.stats.SKILL_LEVEL_ALL);
        } else if (character.jobTier === JOB_TIER.FOURTH) {
            this.stats.SKILL_COEFFICIENT = calculate4thJobSkillCoefficient(character.level, this.stats.SKILL_LEVEL_4TH + this.stats.SKILL_LEVEL_ALL);
        }
    }

    /**
     * Add flat attack with optional weapon attack bonus application
     * @param value - Attack value to add
     * @param applyWeaponBonus - Whether to apply weapon attack bonus (default: true)
     * @returns Returns this for chaining
     * @private
     */
    private addAttackCore(value: number, applyWeaponBonus = true): this {
        const finalAttackBonus = calculateFinalAttackBonusFromJobSkills(
            this.context.selectedClass,
            loadoutStore.getCharacterLevel(),
            {
                firstJob: this.stats.SKILL_LEVEL_1ST,
                secondJob: this.stats.SKILL_LEVEL_2ND,
                thirdJob: this.stats.SKILL_LEVEL_3RD,
                fourthJob: this.stats.SKILL_LEVEL_4TH,
                allSkills: this.stats.SKILL_LEVEL_ALL
            }
        );

        const effective = applyWeaponBonus
            ? value * (1 + this.weaponAttackBonus / 100) * finalAttackBonus
            : value;
        this.stats.ATTACK += effective;
        return this;
    }

    /**
     * Add main stat (flat value, converts to stat damage)
     * 100 main stat = 1% stat damage
     * @param value - Main stat value to add
     * @returns Returns this for chaining
     * @private
     */
    private addMainStatCore(value: number): this {
        const increaseWithMainstatPct = this.calculateMainStatIncreaseWithPct(value);
        const statDamageIncrease = increaseWithMainstatPct / 100;

        this.stats.PRIMARY_MAIN_STAT += increaseWithMainstatPct;

        this.addAttackCore(increaseWithMainstatPct);

        this.stats.STAT_DAMAGE += statDamageIncrease;
        return this;
    }

    /**
     * Add main stat % with proper diminishing returns calculation
     * @param value - Main stat % to add
     * @returns Returns this for chaining
     * @private
     */
    private addMainStatPctCore(value: number): this {
        const mainStatGain = this.calculateMainStatPercentGain(
            value,
            this.context.mainStatPct,
            this.context.mainStat,
            this.context.defense,
            this.context.selectedClass
        );

        const statDamageIncrease = mainStatGain / 100;
        this.addAttackCore(mainStatGain);
        this.stats.STAT_DAMAGE += statDamageIncrease;
        this.stats.PRIMARY_MAIN_STAT += mainStatGain;

        this.context.mainStatPct += value;
        return this;
    }

    calculateMainStatIncreaseWithPct(value: number): number {
        const mainStatPct = this.context.mainStatPct;
        const mainStatWithPctIncrease = value * (1 + mainStatPct / 100);
        return mainStatWithPctIncrease;
    }

    /**
     * Add a percentage-based stat (additive)
     * @param statId - The stat ID (e.g., 'bossDamage', 'critRate')
     * @param value - Value to add
     * @returns Returns this for chaining
     * @private
     */
    private addPercentageStatCore(statId: string, value: number): this {
        const statKey = StatCalculationService.idToStatKey(statId);
        this.stats[statKey] = (this.stats[statKey] || 0) + value;
        return this;
    }

    /**
     * Add a multiplicative stat (like Final Damage)
     * Uses formula: newValue = ((1 + old/100) * (1 + value/100) - 1) * 100
     * @param statId - The stat ID
     * @param value - Value to add
     * @returns Returns this for chaining
     * @private
     */
    private addMultiplicativeStatCore(statId: string, value: number): this {
        const statKey = StatCalculationService.idToStatKey(statId);
        const oldValue = this.stats[statKey] || 0;
        const newValue = (((1 + oldValue / 100) * (1 + value / 100)) - 1) * 100;
        this.stats[statKey] = newValue;
        return this;
    }

    /**
     * Add a stat with diminishing returns (like Attack Speed)
     * Uses formula: newValue = (1 - (1 - old/factor) * (1 - value/factor)) * factor
     * @param statId - The stat ID
     * @param value - Value to add
     * @param factor - Diminishing returns factor (e.g., 150 for attack speed)
     * @returns Returns this for chaining
     * @private
     */
    private addDiminishingReturnStatCore(statId: string, value: number, factor: number): this {
        const statKey = StatCalculationService.idToStatKey(statId);
        const oldValue = this.stats[statKey] || 0;
        const newValue = (1 - (1 - oldValue / factor) * (1 - value / factor)) * factor;
        this.stats[statKey] = newValue;
        return this;
    }

    /**
     * Add a stat by key - routes to dedicated add method
     * This is the main public API for adding stats
     * @param statId - The stat ID (e.g., 'attack', 'mainStat', 'mainStatPct', 'defense')
     * @param value - Value to add
     * @returns Returns this for chaining
     */
    add(statId: string, value: number): this {
        switch (statId) {
            case STAT.ATTACK.id:
                return this.addAttackCore(value, true);
            case STAT.PRIMARY_MAIN_STAT.id:
                return this.addMainStatCore(value);
            case STAT.MAIN_STAT_PCT.id:
                return this.addMainStatPctCore(value);
            case STAT.DEFENSE.id:
                return this.addDefenseCore(value);
            case STAT.FINAL_DAMAGE.id:
                return this.addMultiplicativeStatCore(statId, value);
            case STAT.ATTACK_SPEED.id:
                // Attack speed uses diminishing returns formula with factor 150
                return this.addDiminishingReturnStatCore(statId, value, 150);
            case STAT.DEF_PEN.id:
                // Defense penetration uses diminishing returns formula with factor 100
                return this.addDiminishingReturnStatCore(statId, value, 100);
            default:
                // Most stats (critDamage, bossDamage, critRate, etc.) use simple addition
                return this.addPercentageStatCore(statId, value);
        }
    }

    /**
     * Subtract a stat by key - routes to dedicated subtract method
     * This is the main public API for subtracting stats
     * @param statId - The stat ID (e.g., 'attack', 'mainStat', 'mainStatPct', 'defense')
     * @param value - Value to subtract
     * @returns Returns this for chaining
     */
    subtract(statId: string, value: number): this {
        switch (statId) {
            case STAT.ATTACK.id:
                return this.subtractAttackCore(value);
            case STAT.PRIMARY_MAIN_STAT.id:
                return this.subtractMainStatCore(value);
            case STAT.MAIN_STAT_PCT.id:
                return this.subtractMainStatPctCore(value);
            case STAT.DEFENSE.id:
                return this.subtractDefenseCore(value);
            case STAT.FINAL_DAMAGE.id: {
                const statKey = StatCalculationService.idToStatKey(statId);
                return this.subtractMultiplicativeStatCore(statKey, value);
            }
            case STAT.ATTACK_SPEED.id:
                // Attack speed uses diminishing returns formula with factor 150
                return this.subtractDiminishingReturnStatCore(statId, value, 150);
            case STAT.DEF_PEN.id:
                // Defense penetration uses diminishing returns formula with factor 100
                return this.subtractDiminishingReturnStatCore(statId, value, 100);
            default:
                // Most stats (critDamage, bossDamage, etc.) use simple subtraction
                return this.subtractStatCore(statId, value);
        }
    }

    /**
     * Subtract a flat stat value (fallback method)
     * @param statId - The stat ID
     * @param value - Value to subtract
     * @returns Returns this for chaining
     * @private
     */
    private subtractStatCore(statId: string, value: number): this {
        const statKey = StatCalculationService.idToStatKey(statId);
        this.stats[statKey] -= value;
        return this;
    }

    /**
     * Subtract attack with optional weapon attack bonus application
     * @param value - Attack value to subtract
     * @returns Returns this for chaining
     * @private
     */
    private subtractAttackCore(value: number): this {
        const finalAttackBonus = calculateFinalAttackBonusFromJobSkills(
            this.context.selectedClass,
            loadoutStore.getCharacterLevel(),
            {
                firstJob: this.stats.SKILL_LEVEL_1ST,
                secondJob: this.stats.SKILL_LEVEL_2ND,
                thirdJob: this.stats.SKILL_LEVEL_3RD,
                fourthJob: this.stats.SKILL_LEVEL_4TH,
                allSkills: this.stats.SKILL_LEVEL_ALL
            }
        );

        const effective = value * (1 + this.weaponAttackBonus / 100) * finalAttackBonus;
        this.stats.ATTACK -= effective;
        return this;
    }

    /**
     * Subtract main stat (flat value, converts to stat damage)
     * 100 main stat = 1% stat damage
     * @param value - Main stat value to subtract
     * @returns Returns this for chaining
     * @private
     */
    private subtractMainStatCore(value: number): this {
        const increaseWithMainstatPct = this.calculateMainStatIncreaseWithPct(value);
        const statDamageIncrease = increaseWithMainstatPct / 100;

        this.stats.PRIMARY_MAIN_STAT -= increaseWithMainstatPct;

        this.subtractAttackCore(increaseWithMainstatPct);

        this.stats.STAT_DAMAGE -= statDamageIncrease;
        return this;
    }

    /**
     * Subtract main stat % with proper diminishing returns calculation
     * @param value - Main stat % to subtract
     * @returns Returns this for chaining
     * @private
     */
    private subtractMainStatPctCore(value: number): this {
        const mainStatGain = this.calculateMainStatPercentGain(
            value,
            this.context.mainStatPct,
            this.context.mainStat,
            this.context.defense,
            this.context.selectedClass
        );

        const statDamageIncrease = mainStatGain / 100;
        this.subtractAttackCore(mainStatGain);
        this.stats.STAT_DAMAGE -= statDamageIncrease;
        this.stats.PRIMARY_MAIN_STAT -= mainStatGain;

        this.context.mainStatPct -= value;
        return this;
    }

    /**
     * Subtract a multiplicative stat (like Final Damage)
     * Uses formula: newValue = ((1 + old/100) / (1 + value/100) - 1) * 100
     * This reverses the addition of a multiplicative stat
     * @param statKey - The stat key
     * @param value - Value to subtract (the multiplicative contribution to remove)
     * @returns Returns this for chaining
     * @private
     */
    private subtractMultiplicativeStatCore(statKey: keyof BaseStats, value: number): this {
        const oldValue = this.stats[statKey] || 0;
        const newValue = (((1 + oldValue / 100) / (1 + value / 100)) - 1) * 100;
        this.stats[statKey] = newValue;
        return this;
    }

    /**
     * Subtract a stat with diminishing returns (like Attack Speed)
     * Uses formula: oldValue = (1 - (1 - current/factor) / (1 - value/factor)) * factor
     * This reverses the addition of a diminishing returns stat
     * @param statId - The stat ID
     * @param value - Value to subtract (the diminishing returns contribution to remove)
     * @param factor - Diminishing returns factor (e.g., 150 for attack speed)
     * @returns Returns this for chaining
     * @private
     */
    private subtractDiminishingReturnStatCore(statId: string, value: number, factor: number): this {
        const statKey = StatCalculationService.idToStatKey(statId);
        const currentValue = this.stats[statKey] || 0;

        // Avoid division by zero
        if (value >= factor) {
            console.warn(`subtractDiminishingReturnStat: value ${value} >= factor ${factor}, clamping to factor - 0.01`);
            value = factor - 0.01;
        }

        const oldValue = (1 - (1 - currentValue / factor) / (1 - value / factor)) * factor;
        this.stats[statKey] = Math.max(0, oldValue);
        return this;
    }

    /**
     * Add defense with Dark Knight conversion to main stat
     * For Dark Knight: defense converts to main stat (but is NOT affected by main stat %)
     * Conversion rate: 1 defense = 0.127 main stat
     * Then main stat converts to stat damage (100 main stat = 1% stat damage)
     * And main stat converts 1:1 to attack
     * @param value - Defense value to add
     * @returns Returns this for chaining
     * @private
     */
    addDefenseCore(value: number): this {
        // Add the defense value itself
        this.stats.DEFENSE = (this.stats.DEFENSE || 0) + value;

        // For Dark Knight: convert defense to main stat using addMainStatCore
        // This will automatically add attack and stat damage
        if (this.context.selectedClass === 'dark-knight') {
            const mainStatFromDefense = value * StatCalculationService.DARK_KNIGHT_DEFENSE_CONVERSION_RATE;
            this.addMainStatCore(mainStatFromDefense);
        }

        return this;
    }

    /**
     * Subtract defense with Dark Knight conversion to main stat
     * For Dark Knight: defense converts to main stat (but is NOT affected by main stat %)
     * Conversion rate: 1 defense = 0.127 main stat
     * Then main stat converts to stat damage (100 main stat = 1% stat damage)
     * And main stat converts 1:1 to attack
     * @param value - Defense value to subtract
     * @returns Returns this for chaining
     * @private
     */
    private subtractDefenseCore(value: number): this {
        // Subtract the defense value itself
        this.stats.DEFENSE = (this.stats.DEFENSE || 0) - value;

        // For Dark Knight: convert defense to main stat using subtractMainStatCore
        // This will automatically subtract attack and stat damage
        if (this.context.selectedClass === 'dark-knight') {
            const mainStatFromDefense = value * StatCalculationService.DARK_KNIGHT_DEFENSE_CONVERSION_RATE;
            this.subtractMainStatCore(mainStatFromDefense);
        }

        return this;
    }

    /**
     * Set a stat to a specific value
     * @param statKey - The stat key
     * @param value - Value to set
     * @returns Returns this for chaining
     */
    setStat(statKey: keyof BaseStats, value: number): this {
        this.stats[statKey] = value;
        return this;
    }

    /**
     * Get a copy of the current stats
     * @returns Copy of current stats
     */
    getStats(): BaseStats {
        return { ...this.stats };
    }

    /**
     * Compute damage and return the full result object
     * @param monsterType - 'boss' or 'normal' (default: 'boss')
     * @returns Result from calculateDamage (includes dps, expectedDamage, etc.)
     */
    compute(monsterType: MonsterType = 'boss'): DamageResult {
        return calculateDamage(this.stats, monsterType);
    }

    /**
     * Calculate DPS only (shorthand for compute().dps)
     * @param monsterType - 'boss' or 'normal' (default: 'boss')
     * @returns DPS value
     */
    computeDPS(monsterType: MonsterType = 'boss'): number {
        return this.compute(monsterType).dps;
    }

    /**
     * Calculate DPS gain compared to base stats
     * @param baseDPS - Base DPS to compare against
     * @param monsterType - 'boss' or 'normal' (default: 'boss')
     * @returns DPS gain as percentage
     */
    computeDPSGain(baseDPS: number, monsterType: MonsterType = 'boss'): number {
        const newDPS = this.computeDPS(monsterType);
        return ((newDPS - baseDPS) / baseDPS * 100);
    }

    /**
     * Reset stats to original base stats
     * @returns Returns this for chaining
     */
    reset(): this {
        // We need to store the original stats
        if (!this._originalStats) {
            this._originalStats = { ...this.stats };
        }
        this.stats = { ...this._originalStats };
        return this;
    }

    calculateMainStatPercentGain(mainStatPctIncrease, currentMainStatPct, mainStat, defense, selectedClass) {
        let defenseToMainStat = 0;
        if (selectedClass === 'dark-knight') {
            defenseToMainStat = defense * 0.127;
        }

        const currentMultiplier = 1 + currentMainStatPct / 100;
        const baseMainStat = (mainStat - defenseToMainStat) / currentMultiplier;

        // Now calculate the new total with the increased main stat %
        const newMultiplier = 1 + (currentMainStatPct + mainStatPctIncrease) / 100;
        const newTotalMainStat = (baseMainStat * newMultiplier) + defenseToMainStat;

        // Calculate the gain in main stat
        const mainStatGain = newTotalMainStat - mainStat;
        return mainStatGain;
    }
}

/**
 * Factory function to create a StatCalculationService with common setup
 * @param baseStats - Base stats
 * @param options - Configuration options
 * @returns
 */
export function createStatService(baseStats: BaseStats, options: CreateStatServiceOptions = {}): StatCalculationService {
    const { weaponAttackBonus } = options;
    return new StatCalculationService(baseStats, weaponAttackBonus);
}

/**
 * CumulativeStatCalculator - Specialized calculator for stat weight charts
 *
 * This class handles cumulative stat calculations across multiple iterations,
 * maintaining internal state to track progression. Designed specifically for
 * generating chart data points that show marginal DPS gains.
 *
 * DElegates ALL stat manipulation logic to StatCalculationService.
 * Only handles iteration tracking and marginal gain calculation.
 *
 * Usage:
 *   const calculator = new CumulativeStatCalculator();
 *   calculator.startSeries(baseStats, { weaponAttackBonus, monsterType });
 *
 *   for (let i = 0; i <= numPoints; i++) {
 *       const point = calculator.nextStep('attack', cumulativeIncrease);
 *       dataPoints.push(point); // point = { x: cumulativeIncrease, y: gainPerUnit }
 *   }
 */
export class CumulativeStatCalculator {
    statService: StatCalculationService | null;
    private previousDPS: number;
    private previousCumulativeIncrease: number;
    private monsterType: MonsterType;
    private baseStats: BaseStats;

    constructor() {
        this.statService = null;
        this.previousDPS = 0;
        this.previousCumulativeIncrease = 0;
        this.monsterType = 'boss';
        this.baseStats = {} as BaseStats;
    }

    /**
     * Initialize a new calculation series
     * @param baseStats - Starting stats
     * @param options - Configuration
     */
    startSeries(baseStats: BaseStats, options: CumulativeSeriesOptions = {}): void {
        const { weaponAttackBonus, monsterType = 'boss' } = options;

        // Create StatCalculationService instance with base stats
        this.statService = new StatCalculationService(baseStats, weaponAttackBonus);
        this.baseStats = { ...baseStats };
        this.monsterType = monsterType;

        // Calculate base DPS
        this.previousDPS = this.statService.computeDPS(monsterType);
        this.previousCumulativeIncrease = 0;
    }

    /**
     * Calculate the next step in the series
     * @param statId - Stat ID using STAT enum (e.g., 'attack', 'mainStat', 'bossDamage')
     * @param cumulativeIncrease - Total increase at this step
     * @returns Chart-ready point {cumulativeIncrease, gainPerUnit}
     */
    nextStep(statId: string, cumulativeIncrease: number, previousStatCalculationService: StatCalculationService): {point: ChartPoint, statCalculationService: StatCalculationService} {
        if (!this.statService) {
            throw new Error('Must call startSeries() before nextStep()');
        }

        const previousDPS = previousStatCalculationService.computeDPS(this.monsterType);

        // Create a fresh service for this step to avoid accumulating stats
        const freshService = new StatCalculationService(this.baseStats, this.statService.weaponAttackBonus);    

        // Calculate DPS at current cumulative increase
        freshService.add(statId, cumulativeIncrease);
        const currentDPS = freshService.computeDPS(this.monsterType);

        // Calculate marginal gain relative to previous DPS
        const marginalGain = ((currentDPS - previousDPS) / previousDPS * 100);

        // Calculate gain per unit based on stat type
        const stepIncrease = cumulativeIncrease - this.previousCumulativeIncrease;
        const gainPerUnit = this.calculateGainPerUnit(statId, stepIncrease, marginalGain);

        // Update state for next iteration
        this.previousDPS = currentDPS;
        this.previousCumulativeIncrease = cumulativeIncrease;

        return {
            point: {
                x: cumulativeIncrease,
                y: parseFloat(gainPerUnit.toFixed(2))
            },
            statCalculationService: freshService           
        };
    }

    /**
     * Calculate gain per unit based on stat type
     * @private
     */
    private calculateGainPerUnit(statId: string, stepIncrease: number, marginalGain: number): number {
        // Define unit sizes for different stat types
        const unitSizes: Record<string, number> = {
            'attack': 500,              // Per 500 attack
            'mainStat': 100,     // Per 100 main stat
            'default': 1                // Per 1 unit (for percentage stats)
        };

        const unitSize = unitSizes[statId] || unitSizes['default'];

        // For flat stats, divide step increase by unit size to get number of units
        // For percentage stats, step increase is already in the correct units
        const actualStepSize = (statId === STAT.ATTACK.id || statId === STAT.PRIMARY_MAIN_STAT.id)
            ? stepIncrease / unitSize
            : stepIncrease;

        return actualStepSize > 0 ? marginalGain / actualStepSize : 0;
    }

    /**
     * Reset the calculator state
     */
    reset(): void {
        this.statService = null;
        this.previousDPS = 0;
        this.previousCumulativeIncrease = 0;
    }
}
