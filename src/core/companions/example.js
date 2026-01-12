/**
 * Example usage of the companion system
 * Run with: node src/core/companions/example.js
 */

import {
  getCompanionEffects,
  getCompanionClasses,
  getCompanionRarities,
  getMaxCompanionLevel,
  calculateTotalCompanionEffects
} from './index.js';

console.log('=== Companion System Examples ===\n');

// Example 1: Get effects for a specific companion
console.log('Example 1: Level 3 Unique BowMaster');
const bowmaster = getCompanionEffects('BowMaster', 'Unique', 3);
console.log(JSON.stringify(bowmaster, null, 2));
console.log();

// Example 2: Compare rarities at same level
console.log('Example 2: Hero at Level 10 - All Rarities');
const rarities = getCompanionRarities();
rarities.forEach(rarity => {
  const hero = getCompanionEffects('Hero', rarity, 10);
  console.log(`${rarity}:`, JSON.stringify(hero.inventoryEffect, null, 2));
});
console.log();

// Example 3: See level progression
console.log('Example 3: Legendary NightLord - Levels 1, 5, 10, 20');
[1, 5, 10, 20].forEach(level => {
  const nl = getCompanionEffects('NightLord', 'Legendary', level);
  console.log(`Level ${level}:`, JSON.stringify(nl.inventoryEffect, null, 2));
});
console.log();

// Example 4: Calculate total effects from multiple companions
console.log('Example 4: Total Effects from Multiple Companions');
const myCompanions = [
  { className: 'Hero', rarity: 'Legendary', level: 15, equipped: true },
  { className: 'BowMaster', rarity: 'Unique', level: 10, equipped: false },
  { className: 'NightLord', rarity: 'Epic', level: 8, equipped: true },
  { className: 'ArchMageIL', rarity: 'Rare', level: 5, equipped: false }
];

const totals = calculateTotalCompanionEffects(myCompanions);
console.log('Total Inventory Effects (from all owned):');
console.log(JSON.stringify(totals.inventoryEffects, null, 2));
console.log('\nTotal Equip Effects (from equipped only):');
console.log(JSON.stringify(totals.equipEffects, null, 2));
console.log();

// Example 5: List all available classes
console.log('Example 5: All Available Classes');
console.log(getCompanionClasses());
console.log();

// Example 6: Get max level
console.log('Example 6: Max Companion Level');
console.log(`Max Level: ${getMaxCompanionLevel()}`);
