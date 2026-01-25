import {
  calculateJobSkillPassiveGains
} from "@ts/services/skill-coefficient.service.js";
import { STAT } from "@ts/types";
function calculatePassiveGainsForItem(item, context) {
  const { currentClass, characterLevel, defense } = context;
  const skillLevelBonuses = {
    firstJob: validateSkillLevel(item.statLines.find((s) => s.type === STAT.SKILL_LEVEL_1ST.id)?.value),
    secondJob: validateSkillLevel(item.statLines.find((s) => s.type === STAT.SKILL_LEVEL_2ND.id)?.value),
    thirdJob: validateSkillLevel(item.statLines.find((s) => s.type === STAT.SKILL_LEVEL_3RD.id)?.value),
    fourthJob: validateSkillLevel(item.statLines.find((s) => s.type === STAT.SKILL_LEVEL_4TH.id)?.value),
    allSkills: validateSkillLevel(item.statLines.find((s) => s.type === STAT.SKILL_LEVEL_ALL.id)?.value)
  };
  const hasSkillLevels = Object.values(skillLevelBonuses).some((v) => v > 0);
  if (!hasSkillLevels) {
    return {
      statChanges: {},
      breakdown: [],
      complexPassives: [],
      complexStatChanges: {}
    };
  }
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
function validateSkillLevel(value) {
  if (typeof value !== "number" || isNaN(value)) {
    return 0;
  }
  return Math.max(0, Math.min(50, Math.floor(value)));
}
export {
  calculatePassiveGainsForItem
};
//# sourceMappingURL=item-comparison.service.js.map
