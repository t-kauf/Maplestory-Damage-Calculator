import { loadoutStore } from "@ts/store/loadout.store.js";
import { calculate3rdJobSkillCoefficient, calculate4thJobSkillCoefficient } from "@ts/services/skill-coefficient.service.js";
import { JOB_TIER } from "@ts/types/constants.js";
class SkillCoefficientManager {
  constructor() {
    this.unsubscribeFunctions = [];
    this.isInitialized = false;
  }
  /**
   * Initialize the manager and subscribe to relevant events
   * Call this during app initialization
   */
  initialize() {
    if (this.isInitialized) {
      console.warn("SkillCoefficientManager already initialized");
      return;
    }
    this.unsubscribeFunctions.push(
      loadoutStore.on("skill:level:changed", () => {
        this.updateSkillCoefficient();
      })
    );
    this.unsubscribeFunctions.push(
      loadoutStore.on("character:level:changed", () => {
        this.updateSkillCoefficient();
      })
    );
    this.unsubscribeFunctions.push(
      loadoutStore.on("character:jobtier:changed", () => {
        this.updateSkillCoefficient();
      })
    );
    this.updateSkillCoefficient();
    this.isInitialized = true;
  }
  /**
   * Update the skill coefficient based on current character data
   * Reads from the store and writes back to the store
   */
  updateSkillCoefficient() {
    const character = loadoutStore.getCharacter();
    const baseStats = loadoutStore.getBaseStats();
    let coefficient;
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
      return;
    }
    loadoutStore.updateBaseStat("SKILL_COEFFICIENT", coefficient);
  }
  /**
   * Clean up event subscriptions
   * Call this during app teardown (if applicable)
   */
  destroy() {
    this.unsubscribeFunctions.forEach((fn) => fn());
    this.unsubscribeFunctions = [];
    this.isInitialized = false;
  }
  /**
   * Check if manager is initialized
   */
  isActive() {
    return this.isInitialized;
  }
}
const skillCoefficientManager = new SkillCoefficientManager();
export {
  skillCoefficientManager
};
//# sourceMappingURL=skill-coefficient-manager.js.map
