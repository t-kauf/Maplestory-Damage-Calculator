// Pure state extraction - no UI, no calculations
import { stageData } from '@data/stage-data.js';
import { calculateWeaponAttacks } from '@core/weapon-levels/weapon-calculations.js';
import { itemStatProperties, allItemStatProperties, rarities, tiers } from '@core/constants.js';
// Handles reading DOM state into structured data

let currentContentType = 'none';
let selectedClass = null;
let selectedJobTier = '3rd';

export function getCurrentContentType() {
    return currentContentType;
}

export function setCurrentContentType(type) {
    currentContentType = type;
}

export function getSelectedClass() {
    return selectedClass;
}

export function setSelectedClass(className) {
    selectedClass = className;
}

export function setSelectedJobTier(jobTier) {
    selectedJobTier = jobTier;
}

export function getSelectedJobTier() {
    return selectedJobTier;
}

export function getStats(setup) {
    return {
        attack: parseFloat(document.getElementById(`attack-${setup}`).value) || 0,
        critRate: parseFloat(document.getElementById(`crit-rate-${setup}`).value) || 0,
        critDamage: parseFloat(document.getElementById(`crit-damage-${setup}`).value) || 0,
        statDamage: parseFloat(document.getElementById(`stat-damage-${setup}`).value) || 0,
        damage: parseFloat(document.getElementById(`damage-${setup}`).value) || 0,
        finalDamage: parseFloat(document.getElementById(`final-damage-${setup}`).value) || 0,
        damageAmp: parseFloat(document.getElementById(`damage-amp-${setup}`).value) || 0,
        attackSpeed: parseFloat(document.getElementById(`attack-speed-${setup}`).value) || 0,
        defPen: parseFloat(document.getElementById(`def-pen-${setup}`).value) || 0,
        bossDamage: parseFloat(document.getElementById(`boss-damage-${setup}`).value) || 0,
        normalDamage: parseFloat(document.getElementById(`normal-damage-${setup}`).value) || 0,
        skillCoeff: parseFloat(document.getElementById(`skill-coeff-${setup}`).value) || 0,
        skillMastery: parseFloat(document.getElementById(`skill-mastery-${setup}`).value) || 0,
        skillMasteryBoss: parseFloat(document.getElementById(`skill-mastery-boss-${setup}`).value) || 0,
        minDamage: parseFloat(document.getElementById(`min-damage-${setup}`).value) || 0,
        maxDamage: parseFloat(document.getElementById(`max-damage-${setup}`).value) || 0
    };
}

// Stage defense data - organized by content type
export const stageDefenses = {
    none: {
        label: "None / Training Dummy",
        defense: 0,
        damageReduction: 0,
        accuracy: 0
    },
    // Auto-generated data from game files
    stageHunts: stageData.stageHunts,
    chapterBosses: stageData.chapterBosses,
    worldBosses: stageData.worldBosses,
    growthDungeons: stageData.growthDungeons
};

export function getItemStats(prefix) {
    // Initialize stats object with all properties set to 0
    const stats = {
        name: document.getElementById(`${prefix}-name`)?.value || '',
        attack: parseFloat(document.getElementById(`${prefix}-attack`)?.value) || 0
    };

    // Initialize all stat properties to 0
    allItemStatProperties.forEach(prop => {
        if (prop !== 'attack') { // attack already handled above
            stats[prop] = 0;
        }
    });

    // Get stats from dropdown selections
    if (prefix === 'equipped') {
        // Get equipped item stats
        for (let i = 1; i <= 10; i++) {
            const typeElem = document.getElementById(`equipped-stat-${i}-type`);
            const valueElem = document.getElementById(`equipped-stat-${i}-value`);

            if (typeElem && valueElem) {
                const statType = typeElem.value;
                const value = parseFloat(valueElem.value) || 0;
                const propName = itemStatProperties[statType];

                if (propName) {
                    stats[propName] += value;
                }
            }
        }
    } else {
        // Get comparison item stats
        const itemId = prefix.split('-')[1];
        for (let i = 1; i <= 10; i++) {
            const typeElem = document.getElementById(`item-${itemId}-stat-${i}-type`);
            const valueElem = document.getElementById(`item-${itemId}-stat-${i}-value`);

            if (typeElem && valueElem) {
                const statType = typeElem.value;
                const value = parseFloat(valueElem.value) || 0;
                const propName = itemStatProperties[statType];

                if (propName) {
                    stats[propName] += value;
                }
            }
        }
    }

    return stats;
}

export function getSelectedStageDefense() {
    // If none is selected, return early
    if (currentContentType === 'none') {
        return { defense: 0, damageReduction: 0 };
    }

    const select = document.getElementById('target-stage-base');
    if (!select) return { defense: 0, damageReduction: 0 };

    const value = select.value;

    if (value === 'none') {
        return { defense: 0, damageReduction: 0 };
    }

    const [category, ...rest] = value.split('-');
    const identifier = rest.join('-'); // Handle identifiers with dashes like "1000-1"

    if (category === 'stageHunt') {
        const entry = stageDefenses.stageHunts.find(e => e.stage === identifier);
        return entry ? { defense: entry.defense * 100, damageReduction: entry.damageReduction || 0 } : { defense: 0, damageReduction: 0 };
    } else if (category === 'chapterBoss') {
        const entry = stageDefenses.chapterBosses.find(e => e.chapter === identifier);
        return entry ? { defense: entry.defense * 100, damageReduction: entry.damageReduction || 0 } : { defense: 0, damageReduction: 0 };
    } else if (category === 'worldBoss') {
        const entry = stageDefenses.worldBosses.find(e => e.stage === identifier);
        return entry ? { defense: entry.defense * 10, damageReduction: entry.damageReduction || 0 } : { defense: 0, damageReduction: 0 };
    } else if (category === 'growthDungeon') {
        const entry = stageDefenses.growthDungeons.find(e => e.stage === identifier);
        return entry ? { defense: entry.defense * 100, damageReduction: entry.damageReduction || 0 } : { defense: 0, damageReduction: 0 };
    }

    return { defense: 0, damageReduction: 0 };
}

// Companions state
let companionsState = {};

/**
 * Get all companions state
 */
export function getCompanionsState() {
    return companionsState;
}

/**
 * Set companions state (used for loading saved data)
 */
export function setCompanionsState(state) {
    companionsState = state || {};
}

/**
 * Update a specific companion
 */
export function updateCompanion(companionKey, data) {
    companionsState[companionKey] = data;
}

/**
 * Get a specific companion's data
 * Normal, Rare, and Epic rarities default to unlocked
 */
export function getCompanion(companionKey) {
    if (companionsState[companionKey]) {
        return companionsState[companionKey];
    }

    // Default to unlocked for Normal, Rare, and Epic rarities
    const rarity = companionKey.split('-')[1];
    const defaultUnlocked = ['Normal', 'Rare', 'Epic'].includes(rarity);

    return { unlocked: defaultUnlocked, level: 1, equipped: false };
}

// Presets state
let presetsState = {};
let selectedPreset = null;
let selectedSlot = null; // { type: 'main' | 'sub', index: 0-5 }

/**
 * Initialize empty presets
 */
function initializePresets() {
    if (Object.keys(presetsState).length === 0) {
        for (let i = 1; i <= 10; i++) {
            presetsState[`preset${i}`] = {
                main: null,
                subs: [null, null, null, null, null, null]
            };
        }
    }
}

/**
 * Get all presets
 */
export function getPresets() {
    initializePresets();
    return presetsState;
}

/**
 * Get a specific preset
 */
export function getPreset(presetId) {
    initializePresets();
    return presetsState[presetId] || { main: null, subs: [null, null, null, null, null, null] };
}

/**
 * Set presets state (used for loading saved data)
 */
export function setPresetsState(state) {
    presetsState = state || {};
    initializePresets();
}

/**
 * Set a companion to a preset slot
 */
export function setPresetSlot(presetId, slotType, slotIndex, companionKey) {
    initializePresets();
    if (slotType === 'main') {
        presetsState[presetId].main = companionKey;
    } else if (slotType === 'sub') {
        presetsState[presetId].subs[slotIndex] = companionKey;
    }
}

/**
 * Clear a preset slot
 */
export function clearPresetSlot(presetId, slotType, slotIndex) {
    initializePresets();
    if (slotType === 'main') {
        presetsState[presetId].main = null;
    } else if (slotType === 'sub') {
        presetsState[presetId].subs[slotIndex] = null;
    }
}

/**
 * Get currently selected slot info
 */
export function getSelectedSlotInfo() {
    if (selectedPreset && selectedSlot) {
        return { presetId: selectedPreset, ...selectedSlot };
    }
    return null;
}

/**
 * Set the selected slot
 */
export function setSelectedSlot(presetId, slotType, slotIndex) {
    selectedPreset = presetId;
    selectedSlot = { type: slotType, index: slotIndex };
}

/**
 * Clear the selected slot
 */
export function clearSelectedSlot() {
    selectedPreset = null;
    selectedSlot = null;
}

// Contributed stats tracking
let ContributedStats = {
    Companion: {} // Will be populated with companion equip effects
};

// Equipped preset tracking
let equippedPresetId = 'preset1'; // Default to preset #1

/**
 * Get ContributedStats dictionary
 */
export function getContributedStats() {
    return ContributedStats;
}

/**
 * Set ContributedStats (used for loading saved data)
 */
export function setContributedStats(stats) {
    ContributedStats = stats || { Companion: {} };
}

/**
 * Get currently equipped preset ID
 */
export function getEquippedPresetId() {
    return equippedPresetId;
}

/**
 * Set equipped preset ID
 */
export function setEquippedPresetId(presetId) {
    equippedPresetId = presetId;
}

// Preset DPS comparison toggle state
let showPresetDpsComparison = false;

/**
 * Get whether to show DPS comparison for presets
 */
export function getShowPresetDpsComparison() {
    return showPresetDpsComparison;
}

/**
 * Set whether to show DPS comparison for presets
 */
export function setShowPresetDpsComparison(show) {
    showPresetDpsComparison = show;
}

// Locked main companion state for optimal presets
let lockedMainForOptimalBoss = null;
let lockedMainForOptimalNormal = null;

/**
 * Get locked main companion for optimal preset
 * @param {string} optimalType - 'optimal-boss' or 'optimal-normal'
 */
export function getLockedMainCompanion(optimalType) {
    if (optimalType === 'optimal-boss') {
        return lockedMainForOptimalBoss;
    } else if (optimalType === 'optimal-normal') {
        return lockedMainForOptimalNormal;
    }
    return null;
}

/**
 * Set locked main companion for optimal preset
 * @param {string} optimalType - 'optimal-boss' or 'optimal-normal'
 * @param {string|null} companionKey - Companion key or null to clear
 */
export function setLockedMainCompanion(optimalType, companionKey) {
    if (optimalType === 'optimal-boss') {
        lockedMainForOptimalBoss = companionKey;
    } else if (optimalType === 'optimal-normal') {
        lockedMainForOptimalNormal = companionKey;
    }
}

export function getWeaponAttackBonus() {
    let totalInventory = 0;
    let equippedBonus = 0;

    rarities.forEach(rarity => {
        tiers.forEach(tier => {
            const levelInput = document.getElementById(`level-${rarity}-${tier}`);
            const equippedDisplay = document.getElementById(`equipped-display-${rarity}-${tier}`);
            if (!levelInput) return;

            const level = parseInt(levelInput.value) || 0;
            if (level === 0) return;

            const { inventoryAttack, equippedAttack } = calculateWeaponAttacks(rarity, tier, level);
            totalInventory += inventoryAttack;

            if (equippedDisplay && equippedDisplay.style.display !== 'none') {
                equippedBonus = equippedAttack;
            }
        });
    });

    return totalInventory + equippedBonus;
}
