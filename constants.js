// Weapon rates per level calculated from provided data
const weaponRatesPerLevel = {
    'normal': { 't1': 0.0755, 't2': 0.064, 't3': 0.054, 't4': 0.0455 },
    'rare': { 't1': 0.1952, 't2': 0.1535, 't3': 0.1221, 't4': 0.0959 },
    'epic': { 't1': 0.5144, 't2': 0.6015, 't3': 0.4308, 't4': 0.3033 },
    'unique': { 't1': 1.5573, 't2': 2.7395, 't3': 0.8850, 't4': 0.6686 },
    'legendary': { 't1': 3.9490, 't2': 2.7297, 't3': 3.1824, 't4': 2.5734 },
    'mystic': { 't1': null, 't2': null, 't3': null, 't4': 4.9322 }
};

const tiers = ['t4', 't3', 't2', 't1'];
const rarities = ['normal', 'rare', 'epic', 'unique', 'legendary', 'mystic'];

const availableStats = [
    { value: 'attack', label: 'Attack' },
    { value: 'crit-rate', label: 'Critical Rate (%)' },
    { value: 'crit-damage', label: 'Critical Damage (%)' },
    { value: 'skill-level', label: '3rd Job Skill Level' },
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

// Rarity colors
const rarityColors = {
    'Legendary': '#33ce85',
    'Unique': '#ffd26d',
    'Epic': '#9966ff',
    'Rare': '#6699ff',
    'Normal': '#ffffff',
    'Mystic': '#ff3f42'
};

// Global state variables
let comparisonItemCount = 0;
let equippedStatCount = 0;
