const EMPTY_POTENTIAL_LINE = {
  stat: "",
  value: 0,
  prime: false
};
const EMPTY_POTENTIAL_SET = {
  line1: { ...EMPTY_POTENTIAL_LINE },
  line2: { ...EMPTY_POTENTIAL_LINE },
  line3: { ...EMPTY_POTENTIAL_LINE }
};
const VALID_EQUIPMENT_SLOTS = ["head", "cape", "chest", "shoulders", "legs", "belt", "gloves", "boots", "ring", "neck", "eye-accessory"];
const DEFAULT_POTENTIAL_TYPE_DATA = {
  rarity: "normal",
  rollCount: 0,
  setA: { ...EMPTY_POTENTIAL_SET },
  setB: { ...EMPTY_POTENTIAL_SET }
};
const DEFAULT_CUBE_SLOT_DATA = {
  regular: { ...DEFAULT_POTENTIAL_TYPE_DATA },
  bonus: { ...DEFAULT_POTENTIAL_TYPE_DATA }
};
const createDefaultCubeSlotData = () => ({
  helm: { ...DEFAULT_CUBE_SLOT_DATA },
  cape: { ...DEFAULT_CUBE_SLOT_DATA },
  chest: { ...DEFAULT_CUBE_SLOT_DATA },
  shoulder: { ...DEFAULT_CUBE_SLOT_DATA },
  legs: { ...DEFAULT_CUBE_SLOT_DATA },
  belt: { ...DEFAULT_CUBE_SLOT_DATA },
  gloves: { ...DEFAULT_CUBE_SLOT_DATA },
  boots: { ...DEFAULT_CUBE_SLOT_DATA },
  ring: { ...DEFAULT_CUBE_SLOT_DATA },
  necklace: { ...DEFAULT_CUBE_SLOT_DATA },
  "eye-accessory": { ...DEFAULT_CUBE_SLOT_DATA }
});
const createDefaultEquipmentSlotData = () => ({
  head: { attack: 0, mainStat: 0, damageAmp: 0 },
  cape: { attack: 0, mainStat: 0, damageAmp: 0 },
  chest: { attack: 0, mainStat: 0, damageAmp: 0 },
  shoulders: { attack: 0, mainStat: 0, damageAmp: 0 },
  legs: { attack: 0, mainStat: 0, damageAmp: 0 },
  belt: { attack: 0, mainStat: 0, damageAmp: 0 },
  gloves: { attack: 0, mainStat: 0, damageAmp: 0 },
  boots: { attack: 0, mainStat: 0, damageAmp: 0 },
  ring: { attack: 0, mainStat: 0, damageAmp: 0 },
  neck: { attack: 0, mainStat: 0, damageAmp: 0 },
  "eye-accessory": { attack: 0, mainStat: 0, damageAmp: 0 }
});
const createDefaultComparisonEquipment = () => ({
  head: [],
  cape: [],
  chest: [],
  shoulders: [],
  legs: [],
  belt: [],
  gloves: [],
  boots: [],
  ring: [],
  neck: [],
  "eye-accessory": []
});
const DEFAULT_GEAR_LAB_DATA = {
  innerAbility: {
    presets: {
      1: { id: 1, isEquipped: false, lines: [] },
      2: { id: 2, isEquipped: false, lines: [] },
      3: { id: 3, isEquipped: false, lines: [] },
      4: { id: 4, isEquipped: false, lines: [] },
      5: { id: 5, isEquipped: false, lines: [] },
      6: { id: 6, isEquipped: false, lines: [] },
      7: { id: 7, isEquipped: false, lines: [] },
      8: { id: 8, isEquipped: false, lines: [] },
      9: { id: 9, isEquipped: false, lines: [] },
      10: { id: 10, isEquipped: false, lines: [] }
    }
  },
  cubePotential: createDefaultCubeSlotData(),
  equipmentSlots: createDefaultEquipmentSlotData(),
  comparisonEquipment: createDefaultComparisonEquipment()
};
export {
  DEFAULT_GEAR_LAB_DATA,
  EMPTY_POTENTIAL_LINE,
  EMPTY_POTENTIAL_SET,
  VALID_EQUIPMENT_SLOTS
};
//# sourceMappingURL=gear-lab.types.js.map
