// Equipment Summary Widget - Aggregate stats display
import { getAllEquipmentData } from './equipment-tab.js';

/**
 * Update the equipment summary with aggregate stats
 */
export function updateEquipmentSummary() {
    const equipmentData = getAllEquipmentData();
    const totals = calculateAggregateStats(equipmentData);

    // Update summary display
    updateSummaryDisplay(totals);
}

/**
 * Calculate aggregate stats across all equipment
 */
function calculateAggregateStats(equipmentData) {
    const totals = {
        attack: 0,
        mainStat: 0,
        defense: 0,
        critRate: 0,
        critDamage: 0,
        bossDamage: 0,
        normalDamage: 0,
        damage: 0,
        finalDamage: 0,
        minDamage: 0,
        maxDamage: 0,
        skillLevel1st: 0,
        skillLevel2nd: 0,
        skillLevel3rd: 0,
        skillLevel4th: 0,
        skillLevelAll: 0
    };

    Object.values(equipmentData).forEach(slotData => {
        if (!slotData) return;

        // Add attack
        if (slotData.attack) {
            totals.attack += slotData.attack;
        }

        // Add main stat
        if (slotData.mainStat) {
            totals.mainStat += slotData.mainStat;
        }

        // Add stat lines
        if (slotData.statLines && Array.isArray(slotData.statLines)) {
            slotData.statLines.forEach(statLine => {
                const statKey = getStatKey(statLine.type);
                if (statKey && totals.hasOwnProperty(statKey)) {
                    totals[statKey] += statLine.value;
                }
            });
        }
    });

    return totals;
}

/**
 * Convert stat type string to property key
 */
function getStatKey(statType) {
    const statMap = {
        'attack': 'attack',
        'main-stat': 'mainStat',
        'defense': 'defense',
        'crit-rate': 'critRate',
        'crit-damage': 'critDamage',
        'skill-level-1st': 'skillLevel1st',
        'skill-level-2nd': 'skillLevel2nd',
        'skill-level-3rd': 'skillLevel3rd',
        'skill-level-4th': 'skillLevel4th',
        'skill-level-all': 'skillLevelAll',
        'normal-damage': 'normalDamage',
        'boss-damage': 'bossDamage',
        'damage': 'damage',
        'final-damage': 'finalDamage',
        'min-damage': 'minDamage',
        'max-damage': 'maxDamage'
    };
    return statMap[statType];
}

/**
 * Update the summary display
 */
function updateSummaryDisplay(totals) {
    const summaryElement = document.getElementById('equipment-summary-content');
    if (!summaryElement) return;

    const parts = [];

    if (totals.attack > 0) {
        parts.push(`<span style="color: var(--accent-success); font-weight: 600;">+${totals.attack}</span> Attack`);
    }

    if (totals.mainStat > 0) {
        parts.push(`<span style="color: var(--accent-success); font-weight: 600;">+${totals.mainStat}</span> Main Stat`);
    }

    if (totals.defense > 0) {
        parts.push(`<span style="color: var(--accent-success); font-weight: 600;">+${totals.defense}</span> Defense`);
    }

    if (totals.critRate > 0) {
        parts.push(`<span style="color: var(--accent-success); font-weight: 600;">+${totals.critRate}%</span> Crit Rate`);
    }

    if (totals.critDamage > 0) {
        parts.push(`<span style="color: var(--accent-success); font-weight: 600;">+${totals.critDamage}%</span> Crit Damage`);
    }

    if (totals.bossDamage > 0) {
        parts.push(`<span style="color: var(--accent-success); font-weight: 600;">+${totals.bossDamage}%</span> Boss Damage`);
    }

    if (totals.damage > 0) {
        parts.push(`<span style="color: var(--accent-success); font-weight: 600;">+${totals.damage}%</span> Damage`);
    }

    if (totals.normalDamage > 0) {
        parts.push(`<span style="color: var(--accent-success); font-weight: 600;">+${totals.normalDamage}%</span> Normal Damage`);
    }

    if (totals.finalDamage > 0) {
        parts.push(`<span style="color: var(--accent-success); font-weight: 600;">+${totals.finalDamage}%</span> Final Damage`);
    }

    if (totals.minDamage > 0) {
        parts.push(`<span style="color: var(--accent-success); font-weight: 600;">+${totals.minDamage}%</span> Min Damage`);
    }

    if (totals.maxDamage > 0) {
        parts.push(`<span style="color: var(--accent-success); font-weight: 600;">+${totals.maxDamage}%</span> Max Damage`);
    }

    if (totals.skillLevel1st > 0) {
        parts.push(`<span style="color: var(--accent-success); font-weight: 600;">+${totals.skillLevel1st}</span> 1st Job Skill`);
    }

    if (totals.skillLevel2nd > 0) {
        parts.push(`<span style="color: var(--accent-success); font-weight: 600;">+${totals.skillLevel2nd}</span> 2nd Job Skill`);
    }

    if (totals.skillLevel3rd > 0) {
        parts.push(`<span style="color: var(--accent-success); font-weight: 600;">+${totals.skillLevel3rd}</span> 3rd Job Skill`);
    }

    if (totals.skillLevel4th > 0) {
        parts.push(`<span style="color: var(--accent-success); font-weight: 600;">+${totals.skillLevel4th}</span> 4th Job Skill`);
    }

    if (totals.skillLevelAll > 0) {
        parts.push(`<span style="color: var(--accent-success); font-weight: 600;">+${totals.skillLevelAll}</span> All Job Skills`);
    }

    if (parts.length === 0) {
        summaryElement.innerHTML = '<span style="color: var(--text-secondary);">No equipment stats</span>';
    } else {
        summaryElement.innerHTML = parts.join('<span style="color: var(--text-secondary); margin: 0 6px;">•</span>');
    }

    // Store totals for potential future use
    window.equipmentAggregateStats = totals;
}
