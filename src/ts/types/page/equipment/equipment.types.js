import { STAT } from "@ts/types/constants.js";
const STAT_KEY_MAP = {
  "attack": STAT.ATTACK.id,
  "main-stat": "mainStat",
  // Equipment-specific key
  "defense": STAT.DEFENSE.id,
  "crit-rate": STAT.CRIT_RATE.id,
  "crit-damage": STAT.CRIT_DAMAGE.id,
  "skill-level-1st": STAT.SKILL_LEVEL_1ST.id,
  "skill-level-2nd": STAT.SKILL_LEVEL_2ND.id,
  "skill-level-3rd": STAT.SKILL_LEVEL_3RD.id,
  "skill-level-4th": STAT.SKILL_LEVEL_4TH.id,
  "skill-level-all": "skillLevelAll",
  // Equipment-specific key (no STAT equivalent)
  "normal-damage": STAT.NORMAL_DAMAGE.id,
  "boss-damage": STAT.BOSS_DAMAGE.id,
  "damage": STAT.DAMAGE.id,
  "damage-amp": STAT.DAMAGE_AMP.id,
  "final-damage": STAT.FINAL_DAMAGE.id,
  "min-damage": STAT.MIN_DAMAGE.id,
  "max-damage": STAT.MAX_DAMAGE.id
};
export {
  STAT_KEY_MAP
};
//# sourceMappingURL=equipment.types.js.map
