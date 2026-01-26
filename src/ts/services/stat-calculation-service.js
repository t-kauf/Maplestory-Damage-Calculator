import { loadoutStore } from "@ts/store/loadout.store.js";
import { calculateFinalAttackBonusFromJobSkills, calculate3rdJobSkillCoefficient, calculate4thJobSkillCoefficient } from "@ts/services/skill-coefficient.service.js";
import { JOB_TIER, STAT } from "@ts/types/constants.js";
import { calculateDamage } from "./damage-calculation.service.js";
const _StatCalculationService = class _StatCalculationService {
  /**
   * Convert lowercase stat ID to StatKey (uppercase)
   * Maps 'attack' -> 'ATTACK', 'critRate' -> 'CRIT_RATE', etc.
   */
  static idToStatKey(id) {
    for (const key of Object.keys(STAT)) {
      if (STAT[key].id === id) {
        return key;
      }
    }
    throw new Error(`Unknown stat ID: ${id}`);
  }
  /**
   * @param baseStats - The base stats object to modify
   * @param weaponAttackBonus - Weapon attack bonus percentage (undefined = auto-fetch from state)
   */
  constructor(baseStats, weaponAttackBonus) {
    this.stats = { ...baseStats };
    if (weaponAttackBonus !== void 0) {
      this.weaponAttackBonus = weaponAttackBonus;
    } else {
      const result = loadoutStore.getWeaponAttackBonus().totalAttack;
      if (typeof result !== "number" || isNaN(result) || result < 0) {
        console.error("loadoutStore.getWeaponAttackBonus returned unexpected value:", result, "- treating as 0");
        this.weaponAttackBonus = 0;
      } else {
        this.weaponAttackBonus = result;
      }
    }
    this.context = {
      mainStatPct: this.stats.MAIN_STAT_PCT || 0,
      mainStat: this.stats.PRIMARY_MAIN_STAT || 0,
      defense: this.stats.DEFENSE || 0,
      selectedClass: loadoutStore.getSelectedClass()
    };
    const baseDamage = calculateDamage(this.stats, "boss");
    this.baseBossDPS = baseDamage.dps;
    this.baseNormalDPS = calculateDamage(this.stats, "normal").dps;
  }
  refreshSkillCoefficient() {
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
  addAttackCore(value, applyWeaponBonus = true) {
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
    const effective = applyWeaponBonus ? value * (1 + this.weaponAttackBonus / 100) * finalAttackBonus : value;
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
  addMainStatCore(value) {
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
  addMainStatPctCore(value) {
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
  calculateMainStatIncreaseWithPct(value) {
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
  addPercentageStatCore(statId, value) {
    const statKey = _StatCalculationService.idToStatKey(statId);
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
  addMultiplicativeStatCore(statId, value) {
    const statKey = _StatCalculationService.idToStatKey(statId);
    const oldValue = this.stats[statKey] || 0;
    const newValue = ((1 + oldValue / 100) * (1 + value / 100) - 1) * 100;
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
  addDiminishingReturnStatCore(statId, value, factor) {
    const statKey = _StatCalculationService.idToStatKey(statId);
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
  add(statId, value) {
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
        return this.addDiminishingReturnStatCore(statId, value, 150);
      case STAT.DEF_PEN.id:
        return this.addDiminishingReturnStatCore(statId, value, 100);
      case STAT.SKILL_LEVEL_3RD.id:
      case STAT.SKILL_LEVEL_4TH.id:
      case STAT.SKILL_LEVEL_ALL.id:
        this.addPercentageStatCore(statId, value);
        this.refreshSkillCoefficient();
        return this;
      default:
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
  subtract(statId, value) {
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
        const statKey = _StatCalculationService.idToStatKey(statId);
        return this.subtractMultiplicativeStatCore(statKey, value);
      }
      case STAT.ATTACK_SPEED.id:
        return this.subtractDiminishingReturnStatCore(statId, value, 150);
      case STAT.DEF_PEN.id:
        return this.subtractDiminishingReturnStatCore(statId, value, 100);
      case STAT.SKILL_LEVEL_3RD.id:
      case STAT.SKILL_LEVEL_4TH.id:
      case STAT.SKILL_LEVEL_ALL.id:
        this.subtractStatCore(statId, value);
        this.refreshSkillCoefficient();
        return this;
      default:
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
  subtractStatCore(statId, value) {
    const statKey = _StatCalculationService.idToStatKey(statId);
    this.stats[statKey] -= value;
    return this;
  }
  /**
   * Subtract attack with optional weapon attack bonus application
   * @param value - Attack value to subtract
   * @returns Returns this for chaining
   * @private
   */
  subtractAttackCore(value) {
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
  subtractMainStatCore(value) {
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
  subtractMainStatPctCore(value) {
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
  subtractMultiplicativeStatCore(statKey, value) {
    const oldValue = this.stats[statKey] || 0;
    const newValue = ((1 + oldValue / 100) / (1 + value / 100) - 1) * 100;
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
  subtractDiminishingReturnStatCore(statId, value, factor) {
    const statKey = _StatCalculationService.idToStatKey(statId);
    const currentValue = this.stats[statKey] || 0;
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
  addDefenseCore(value) {
    this.stats.DEFENSE = (this.stats.DEFENSE || 0) + value;
    if (this.context.selectedClass === "dark-knight") {
      const mainStatFromDefense = value * _StatCalculationService.DARK_KNIGHT_DEFENSE_CONVERSION_RATE;
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
  subtractDefenseCore(value) {
    this.stats.DEFENSE = (this.stats.DEFENSE || 0) - value;
    if (this.context.selectedClass === "dark-knight") {
      const mainStatFromDefense = value * _StatCalculationService.DARK_KNIGHT_DEFENSE_CONVERSION_RATE;
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
  setStat(statKey, value) {
    this.stats[statKey] = value;
    return this;
  }
  /**
   * Get a copy of the current stats
   * @returns Copy of current stats
   */
  getStats() {
    return { ...this.stats };
  }
  /**
   * Compute damage and return the full result object
   * @param monsterType - 'boss' or 'normal' (default: 'boss')
   * @returns Result from calculateDamage (includes dps, expectedDamage, etc.)
   */
  compute(monsterType = "boss") {
    return calculateDamage(this.stats, monsterType);
  }
  /**
   * Calculate DPS only (shorthand for compute().dps)
   * @param monsterType - 'boss' or 'normal' (default: 'boss')
   * @returns DPS value
   */
  computeDPS(monsterType = "boss") {
    return this.compute(monsterType).dps;
  }
  /**
   * Calculate DPS gain compared to base stats
   * @param baseDPS - Base DPS to compare against
   * @param monsterType - 'boss' or 'normal' (default: 'boss')
   * @returns DPS gain as percentage
   */
  computeDPSGain(baseDPS, monsterType = "boss") {
    const newDPS = this.computeDPS(monsterType);
    return (newDPS - baseDPS) / baseDPS * 100;
  }
  /**
   * Reset stats to original base stats
   * @returns Returns this for chaining
   */
  reset() {
    if (!this._originalStats) {
      this._originalStats = { ...this.stats };
    }
    this.stats = { ...this._originalStats };
    return this;
  }
  calculateMainStatPercentGain(mainStatPctIncrease, currentMainStatPct, mainStat, defense, selectedClass) {
    let defenseToMainStat = 0;
    if (selectedClass === "dark-knight") {
      defenseToMainStat = defense * 0.127;
    }
    const currentMultiplier = 1 + currentMainStatPct / 100;
    const baseMainStat = (mainStat - defenseToMainStat) / currentMultiplier;
    const newMultiplier = 1 + (currentMainStatPct + mainStatPctIncrease) / 100;
    const newTotalMainStat = baseMainStat * newMultiplier + defenseToMainStat;
    const mainStatGain = newTotalMainStat - mainStat;
    return mainStatGain;
  }
};
_StatCalculationService.DARK_KNIGHT_DEFENSE_CONVERSION_RATE = 0.127;
let StatCalculationService = _StatCalculationService;
function createStatService(baseStats, options = {}) {
  const { weaponAttackBonus } = options;
  return new StatCalculationService(baseStats, weaponAttackBonus);
}
class CumulativeStatCalculator {
  constructor() {
    this.statService = null;
    this.previousDPS = 0;
    this.previousCumulativeIncrease = 0;
    this.monsterType = "boss";
    this.baseStats = {};
  }
  /**
   * Initialize a new calculation series
   * @param baseStats - Starting stats
   * @param options - Configuration
   */
  startSeries(baseStats, options = {}) {
    const { weaponAttackBonus, monsterType = "boss" } = options;
    this.statService = new StatCalculationService(baseStats, weaponAttackBonus);
    this.baseStats = { ...baseStats };
    this.monsterType = monsterType;
    this.previousDPS = this.statService.computeDPS(monsterType);
    this.previousCumulativeIncrease = 0;
  }
  /**
   * Calculate the next step in the series
   * @param statId - Stat ID using STAT enum (e.g., 'attack', 'mainStat', 'bossDamage')
   * @param cumulativeIncrease - Total increase at this step
   * @returns Chart-ready point {cumulativeIncrease, gainPerUnit}
   */
  nextStep(statId, cumulativeIncrease, previousStatCalculationService) {
    if (!this.statService) {
      throw new Error("Must call startSeries() before nextStep()");
    }
    const previousDPS = previousStatCalculationService.computeDPS(this.monsterType);
    const freshService = new StatCalculationService(this.baseStats, this.statService.weaponAttackBonus);
    freshService.add(statId, cumulativeIncrease);
    const currentDPS = freshService.computeDPS(this.monsterType);
    const marginalGain = (currentDPS - previousDPS) / previousDPS * 100;
    const stepIncrease = cumulativeIncrease - this.previousCumulativeIncrease;
    const gainPerUnit = this.calculateGainPerUnit(statId, stepIncrease, marginalGain);
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
  calculateGainPerUnit(statId, stepIncrease, marginalGain) {
    const unitSizes = {
      "attack": 500,
      // Per 500 attack
      "mainStat": 100,
      // Per 100 main stat
      "default": 1
      // Per 1 unit (for percentage stats)
    };
    const unitSize = unitSizes[statId] || unitSizes["default"];
    const actualStepSize = statId === STAT.ATTACK.id || statId === STAT.PRIMARY_MAIN_STAT.id ? stepIncrease / unitSize : stepIncrease;
    return actualStepSize > 0 ? marginalGain / actualStepSize : 0;
  }
  /**
   * Reset the calculator state
   */
  reset() {
    this.statService = null;
    this.previousDPS = 0;
    this.previousCumulativeIncrease = 0;
  }
}
export {
  CumulativeStatCalculator,
  StatCalculationService,
  createStatService
};
//# sourceMappingURL=stat-calculation-service.js.map
