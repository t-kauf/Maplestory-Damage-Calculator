import { CONTENT_TYPE, JOB_TIER, MASTERY_TYPE, DEFAULT_BASE_STATS } from "./constants.js";
import { DEFAULT_COMPANION_STATE } from "./page/companions/companions.types.js";
const DEFAULT_LOADOUT_DATA = {
  baseStats: DEFAULT_BASE_STATS,
  character: {
    level: 0,
    class: null,
    jobTier: JOB_TIER.THIRD
  },
  weapons: {},
  mastery: {
    [JOB_TIER.THIRD]: { [MASTERY_TYPE.ALL]: {}, [MASTERY_TYPE.BOSS]: {} },
    [JOB_TIER.FOURTH]: { [MASTERY_TYPE.ALL]: {}, [MASTERY_TYPE.BOSS]: {} }
  },
  target: {
    contentType: CONTENT_TYPE.NONE,
    subcategory: null,
    selectedStage: null
  },
  weaponAttackBonus: {
    totalAttack: 0,
    equippedAttack: 0
  },
  companions: DEFAULT_COMPANION_STATE,
  equipment: {
    head: null,
    cape: null,
    chest: null,
    shoulders: null,
    legs: null,
    belt: null,
    gloves: null,
    boots: null,
    ring: null,
    neck: null,
    "eye-accessory": null
  }
};
export {
  DEFAULT_LOADOUT_DATA
};
//# sourceMappingURL=loadout.js.map
