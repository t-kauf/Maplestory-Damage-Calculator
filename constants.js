// Weapon rates per level calculated from provided data
const weaponRatesPerLevel = {
    'normal': { 't1': 0.0755, 't2': 0.064, 't3': 0.054, 't4': 0.0455 },
    'rare': { 't1': 0.1952, 't2': 0.1535, 't3': 0.1221, 't4': 0.0959 },
    'epic': { 't1': 0.5144, 't2': 0.6015, 't3': 0.4308, 't4': 0.3033 },
    'unique': { 't1': 1.5573, 't2': 2.7395, 't3': 0.8850, 't4': 0.6686 },
    'legendary': { 't1': 3.9490, 't2': 2.7297, 't3': 3.1824, 't4': 2.5734 },
    'mystic': { 't1': 5.5, 't2': 4.2, 't3': 4.8, 't4': 4.9322 },
    'ancient': { 't1': 6.5, 't2': 5.0, 't3': 5.5, 't4': 6.2 }
};

const tiers = ['t4', 't3', 't2', 't1'];
const rarities = ['normal', 'rare', 'epic', 'unique', 'legendary', 'mystic', 'ancient'];

const availableStats = [
    { value: 'attack', label: 'Attack' },
    { value: 'crit-rate', label: 'Critical Rate (%)' },
    { value: 'crit-damage', label: 'Critical Damage (%)' },
    { value: 'skill-level', label: '3rd Job Skill Level (1 lvl = 0.3% Skill Coeff)' },
    { value: 'normal-damage', label: 'Normal Monster Damage (%)' },
    { value: 'boss-damage', label: 'Boss Monster Damage (%)' },
    { value: 'damage', label: 'Damage (%)' }
];

// Inner abilities stat names (extracted from inner_abilities.json)
const innerAbilityStats = [
    'Accuracy',
    'Attack Speed',
    'Boss Monster Damage',
    'Critical Rate',
    'Critical Resistance',
    'Damage',
    'Damage Taken Decrease',
    'Damage Tolerance',
    'Debuff Tolerance',
    'Defense Penetration',
    'EXP Gain',
    'Evasion',
    'Main Stat',
    'Max Damage Multiplier',
    'Max HP',
    'Max MP',
    'Meso Drop',
    'Min Damage Multiplier',
    'MP Recovery Per Sec',
    'Normal Monster Damage'
];

// Inner abilities data with min/max values per rarity
const innerAbilitiesData = {
    "Legendary": {
        "Meso Drop": { "min": 5, "max": 8 },
        "EXP Gain": { "min": 5, "max": 8 },
        "Defense Penetration": { "min": 8, "max": 12 },
        "Boss Monster Damage": { "min": 18, "max": 25 },
        "Normal Monster Damage": { "min": 18, "max": 25 },
        "Attack Speed": { "min": 10, "max": 14 },
        "Damage Taken Decrease": { "min": 4, "max": 6 },
        "Min Damage Multiplier": { "min": 18, "max": 25 },
        "Max Damage Multiplier": { "min": 18, "max": 25 },
        "Critical Rate": { "min": 10, "max": 14 },
        "Critical Resistance": { "min": 15, "max": 21 },
        "Damage": { "min": 18, "max": 25 },
        "Debuff Tolerance": { "min": 14, "max": 16 },
        "Main Stat": { "min": 800, "max": 1200 },
        "Max HP": { "min": 35000, "max": 65000 },
        "Max MP": { "min": 500, "max": 800 },
        "Accuracy": { "min": 14, "max": 16 },
        "Evasion": { "min": 14, "max": 16 },
        "MP Recovery Per Sec": { "min": 40, "max": 60 }
    },
    "Unique": {
        "Attack Speed": { "min": 7, "max": 9 },
        "Damage Taken Decrease": { "min": 2, "max": 3 },
        "Min Damage Multiplier": { "min": 12, "max": 15 },
        "Max Damage Multiplier": { "min": 12, "max": 15 },
        "Critical Rate": { "min": 7, "max": 9 },
        "Critical Resistance": { "min": 10.5, "max": 13.5 },
        "Damage": { "min": 12, "max": 15 },
        "Debuff Tolerance": { "min": 10, "max": 12 },
        "Main Stat": { "min": 400, "max": 700 },
        "Max HP": { "min": 15000, "max": 30000 },
        "Max MP": { "min": 200, "max": 400 },
        "Accuracy": { "min": 10, "max": 12 },
        "Evasion": { "min": 10, "max": 12 },
        "MP Recovery Per Sec": { "min": 21, "max": 30 }
    },
    "Epic": {
        "Min Damage Multiplier": { "min": 7, "max": 10 },
        "Max Damage Multiplier": { "min": 7, "max": 10 },
        "Critical Rate": { "min": 3, "max": 6 },
        "Critical Resistance": { "min": 4.5, "max": 9 },
        "Damage": { "min": 7, "max": 10 },
        "Debuff Tolerance": { "min": 6, "max": 8 },
        "Main Stat": { "min": 200, "max": 300 },
        "Max HP": { "min": 4500, "max": 9000 },
        "Max MP": { "min": 100, "max": 150 },
        "Accuracy": { "min": 6, "max": 8 },
        "Evasion": { "min": 6, "max": 8 },
        "MP Recovery Per Sec": { "min": 11, "max": 20 }
    },
    "Rare": {
        "Damage": { "min": 3, "max": 5 },
        "Damage Tolerance": { "min": 4, "max": 5 },
        "Main Stat": { "min": 100, "max": 150 },
        "Max HP": { "min": 1800, "max": 3000 },
        "Max MP": { "min": 50, "max": 70 },
        "Accuracy": { "min": 4, "max": 5 },
        "Evasion": { "min": 4, "max": 5 },
        "MP Recovery Per Sec": { "min": 6, "max": 10 }
    },
    "Normal": {
        "Main Stat": { "min": 40, "max": 60 },
        "Max HP": { "min": 1200, "max": 1500 },
        "Max MP": { "min": 30, "max": 40 },
        "Accuracy": { "min": 2, "max": 3 },
        "Evasion": { "min": 2, "max": 3 },
        "MP Recovery Per Sec": { "min": 3, "max": 5 }
    }
};

// Artifact Potential data with values per rarity
const artifactPotentialData = {
    "Mystic": {
        "Main Stat %": 10,
        "Damage Taken Decrease %": 5,
        "Defense %": 10,
        "Accuracy": 10,
        "Critical Rate %": 10,
        "Min Damage Multiplier %": 10,
        "Max Damage Multiplier %": 10,
        "Boss Monster Damage %": 20,
        "Normal Monster Damage %": 20,
        "Status Effect Damage %": 20,
        "Damage %": 20,
        "Defense Penetration %": 10,
        "Main Stat % (prime)": 12,
        "Damage Taken Decrease % (prime)": 6,
        "Defense % (prime)": 12,
        "Accuracy (prime)": 12,
        "Critical Rate % (prime)": 12,
        "Min Damage Multiplier % (prime)": 12,
        "Max Damage Multiplier % (prime)": 12,
        "Boss Monster Damage % (prime)": 24,
        "Normal Monster Damage % (prime)": 24,
        "Status Effect Damage % (prime)": 24,
        "Damage % (prime)": 24,
        "Defense Penetration % (prime)": 12
    },
    "Legendary": {
        "Main Stat %": 7,
        "Damage Taken Decrease %": 3.5,
        "Defense %": 7,
        "Accuracy": 7,
        "Critical Rate %": 7,
        "Min Damage Multiplier %": 7,
        "Max Damage Multiplier %": 7,
        "Boss Monster Damage %": 14,
        "Normal Monster Damage %": 14,
        "Status Effect Damage %": 14,
        "Damage %": 14,
        "Defense Penetration %": 7
    },
    "Unique": {
        "Main Stat %": 4.5,
        "Damage Taken Decrease %": 2.3,
        "Defense %": 4.5,
        "Accuracy": 4,
        "Critical Rate %": 4.5,
        "Min Damage Multiplier %": 4.5,
        "Max Damage Multiplier %": 4.5,
        "Boss Monster Damage %": 9,
        "Normal Monster Damage %": 9,
        "Status Effect Damage %": 9,
        "Damage %": 9,
        "Defense Penetration %": 4.5
    },
    "Epic": {
        "Main Stat %": 3,
        "Damage Taken Decrease %": 1.5,
        "Defense %": 3,
        "Accuracy": 3,
        "Critical Rate %": 3,
        "Min Damage Multiplier %": 3,
        "Max Damage Multiplier %": 3,
        "Boss Monster Damage %": 6,
        "Normal Monster Damage %": 6,
        "Status Effect Damage %": 6,
        "Damage %": 6,
        "Defense Penetration %": 3
    },
    "Rare": {
        "Main Stat %": 2,
        "Damage Taken Decrease %": 1,
        "Defense %": 2,
        "Accuracy": 2,
        "Critical Rate %": 2,
        "Min Damage Multiplier %": 2,
        "Max Damage Multiplier %": 2,
        "Boss Monster Damage %": 4,
        "Normal Monster Damage %": 4,
        "Status Effect Damage %": 4,
        "Damage %": 4,
        "Defense Penetration %": 2
    }
};

// Rarity colors
const rarityColors = {
    'Legendary': '#33ce85',
    'Unique': '#ffd26d',
    'Epic': '#9966ff',
    'Rare': '#6699ff',
    'Normal': '#ffffff',
    'Mystic': '#ff3f42',
    'Ancient': '#3882ff'
};

// Global state variables
let comparisonItemCount = 0;
let equippedStatCount = 0;
