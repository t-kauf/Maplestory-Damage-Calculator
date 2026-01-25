// Results display functionality

import { formatNumber } from '@utils/formatters.js';
import { StatCalculationService, type DamageResult } from '@ts/services/stat-calculation-service.js';
import { BaseStats } from '@ts/types/loadout.js';
import { STAT } from '@ts/types/constants.js';
import { loadoutStore } from '@ts/store/loadout.store';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Damage values for equipped item comparison
 */
export interface EquippedDamageValues {
    dpsBoss: number;
    expectedDamageBoss: number;
    dpsNormal: number;
    expectedDamageNormal: number;
}

/**
 * Percent change badge result
 */
interface PercentChangeBadge {
    badge: string;
    valueClass: string;
}

// ============================================================================
// WINDOW GLOBALS
// ============================================================================

window.calculateEquipmentSlotDPS = calculateEquipmentSlotDPS;
window.toggleSubDetails = toggleSubDetails;
window.toggleDetails = toggleDetails;

// ============================================================================
// DISPLAY RESULTS
// ============================================================================

/**
 * Passive gains breakdown structure
 */
interface PassiveGainsData {
    statChanges: Record<string, number>;
    breakdown: Array<{
        passive: string;
        stat: string;
        statDisplay?: string;
        baseValue: number;
        bonusValue: number;
        gain: number;
        isPercent: boolean;
        note?: string;
    }>;
    complexPassives: Array<{
        passive: string;
        stat?: string;
        baseValue?: number;
        bonusValue?: number;
        gain?: number;
        isPercent?: boolean;
        note?: string;
    }>;
    complexStatChanges: Record<string, number>;
}

/**
 * Display damage calculation results as HTML
 */
export function displayResults(
    itemName: string,
    stats: BaseStats,
    uniqueId: string,
    isEquipped: boolean = false,
    equippedDamageValues: EquippedDamageValues | null = null,
    passiveGainsData?: PassiveGainsData
): string {
    // Extract passive gains breakdown from stats
    const passiveGainsBreakdown = passiveGainsData ? { comparison: passiveGainsData } : null;

    // Use StatCalculationService for consistent damage calculation
    const service = new StatCalculationService(stats);
    const bossResults: DamageResult = service.compute('boss');
    const normalResults: DamageResult = service.compute('normal');

    const itemClass = isEquipped ? 'equipped-item' : 'comparison-item';

    const getPercentChangeBadge = (currentValue: number, referenceValue: number): PercentChangeBadge => {
        if (!referenceValue || referenceValue === 0) return { badge: '', valueClass: '' };
        const changePercentage = ((currentValue - referenceValue) / referenceValue) * 100;
        const badgeClass = changePercentage >= 0 ? 'positive' : 'negative';
        const valueClass = changePercentage >= 0 ? 'positive' : 'negative';
        const changeSign = changePercentage >= 0 ? '+' : '';
        const badge = `<span class="percent-change-badge ${badgeClass}">${changeSign}${changePercentage.toFixed(2)}%</span>`;
        return { badge, valueClass };
    };

    const bossDpsChange = equippedDamageValues
        ? getPercentChangeBadge(bossResults.dps, equippedDamageValues.dpsBoss)
        : { badge: '', valueClass: '' };
    const normalDpsChange = equippedDamageValues
        ? getPercentChangeBadge(normalResults.dps, equippedDamageValues.dpsNormal)
        : { badge: '', valueClass: '' };
    const expectedBossDamagePercentChange = equippedDamageValues
        ? getPercentChangeBadge(bossResults.expectedDamage, equippedDamageValues.expectedDamageBoss).badge
        : '';
    const expectedNormalDamagePercentChange = equippedDamageValues
        ? getPercentChangeBadge(normalResults.expectedDamage, equippedDamageValues.expectedDamageNormal).badge
        : '';

    // Generate passive gains breakdown HTML
    let passiveGainsHTML = '';

    if (passiveGainsBreakdown && passiveGainsBreakdown.comparison) {
        const gains = passiveGainsBreakdown.comparison;

        // Mapping for friendly stat names
        const statDisplayNames: Record<string, string> = {
            'attackSpeed': 'Attack Speed',
            'minDamage': 'Min Damage',
            'maxDamage': 'Max Damage',
            'critRate': 'Critical Rate',
            'critDamage': 'Critical Damage',
            'statDamage': 'Stat Damage',
            'skillDamage': 'Skill Damage',
            'damage': 'Damage',
            'bossDamage': 'Boss Damage',
            'normalDamage': 'Normal Damage',
            'attack': 'Attack',
            'mainStat': 'Main Stat',
            'basicAttackDamage': 'Basic Attack Damage',
            'damageAmp': 'Damage Amplification',
            'finalDamage': 'Final Damage'
        };

        if (gains.breakdown && gains.breakdown.length > 0) {
            passiveGainsHTML = `
                <div class="damage-box">
                    <h3 onclick="toggleSubDetails('passive-gains-${uniqueId}')">Passive Skill Gains <span id="passive-gains-${uniqueId}-icon">▼</span></h3>
                    <div id="passive-gains-${uniqueId}" class="collapsible-section">
                        ${gains.breakdown.filter(item => item.gain !== 0).map(item => {
                            const statLabel = item.statDisplay || statDisplayNames[item.stat || ''] || item.stat || '';
                            const percentSign = item.isPercent ? '%' : '';
                            const gainSign = item.gain >= 0 ? '+' : '';
                            const fromTo = `${item.baseValue.toFixed(2)}${percentSign} → ${item.bonusValue.toFixed(2)}${percentSign}`;
                            const note = item.note ? ` <span style="color: var(--text-secondary); font-size: 0.85em;">(${item.note})</span>` : '';
                            return `<div class="damage-row">
                                <span class="damage-label">${item.passive}:</span>
                                <span class="damage-value">${gainSign}${item.gain.toFixed(2)}${percentSign} ${statLabel} (${fromTo})${note}</span>
                            </div>`;
                        }).join('')}
                    </div>
                </div>
            `;
        }

        if (gains.complexPassives && gains.complexPassives.length > 0) {
            passiveGainsHTML += `
                <div class="damage-box">
                    <h3 onclick="toggleSubDetails('complex-passives-${uniqueId}')">Complex Passives (Not in DPS) <span id="complex-passives-${uniqueId}-icon">▼</span></h3>
                    <div id="complex-passives-${uniqueId}" class="collapsible-section">
                        ${gains.complexPassives.filter(item => item.gain !== 0).map(item => {
                            // If we have gain data, format it with the stat changes
                            if (item.stat && item.gain !== undefined && item.baseValue !== undefined && item.bonusValue !== undefined) {
                                const statName = statDisplayNames[item.stat] || item.stat;
                                const percentSign = item.isPercent ? '%' : '';
                                const sign = item.gain >= 0 ? '+' : '';
                                const fromTo = `${item.baseValue.toFixed(2)}${percentSign} → ${item.bonusValue.toFixed(2)}${percentSign}`;
                                return `<div class="damage-row">
                                    <span class="damage-label">${item.passive}:</span>
                                    <span class="damage-value">${sign}${item.gain.toFixed(2)}${percentSign} ${statName} (${fromTo})</span>
                                </div>`;
                            } else {
                                // Otherwise just show the note
                                return `<div class="damage-row">
                                    <span class="damage-label">${item.passive}:</span>
                                    <span class="damage-value">${item.note || ''}</span>
                                </div>`;
                            }
                        }).join('')}
                    </div>
                </div>
            `;
        }
    }

    const html = `
        <div class="result-panel ${itemClass}">
            <h3>${itemName}</h3>

        <div class="expected-damage">
            <div class="label">DPS (Boss)</div>
            <div class="value ${bossDpsChange.valueClass}">${formatNumber(bossResults.dps)}${bossDpsChange.badge}</div>
        </div>

        <div class="expected-damage">
            <div class="label">DPS (Normal)</div>
            <div class="value ${normalDpsChange.valueClass}">${formatNumber(normalResults.dps)}${normalDpsChange.badge}</div>
        </div>

        <div class="toggle-details" onclick="toggleDetails('${uniqueId}', event)">
            Show Detailed Breakdown
        </div>

        <div id="details-${uniqueId}" class="collapsible-section">
            <div class="damage-box">
                <h3 onclick="toggleSubDetails('stats-${uniqueId}')">Stats Used <span id="stats-${uniqueId}-icon">▼</span></h3>
                <div id="stats-${uniqueId}" class="collapsible-section">
                    <div class="damage-row">
                        <span class="damage-label">Attack:</span>
                        <span class="damage-value">${formatNumber(stats.ATTACK)}</span>
                    </div>
                    <div class="damage-row">
                        <span class="damage-label">Critical Rate:</span>
                        <span class="damage-value">${stats.CRIT_RATE.toFixed(2)}%</span>
                    </div>
                    <div class="damage-row">
                        <span class="damage-label">Critical Damage:</span>
                        <span class="damage-value">${stats.CRIT_DAMAGE.toFixed(2)}%</span>
                    </div>
                    <div class="damage-row">
                        <span class="damage-label">Stat Damage:</span>
                        <span class="damage-value">${stats.STAT_DAMAGE.toFixed(2)}%</span>
                    </div>
                    <div class="damage-row">
                        <span class="damage-label">Damage:</span>
                        <span class="damage-value">${stats.DAMAGE.toFixed(2)}%</span>
                    </div>
                    <div class="damage-row">
                        <span class="damage-label">Boss Monster Damage:</span>
                        <span class="damage-value">${stats.BOSS_DAMAGE.toFixed(2)}%</span>
                    </div>
                    <div class="damage-row">
                        <span class="damage-label">Normal Monster Damage:</span>
                        <span class="damage-value">${stats.NORMAL_DAMAGE.toFixed(2)}%</span>
                    </div>
                    <div class="damage-row">
                        <span class="damage-label">Final Damage:</span>
                        <span class="damage-value">${stats.FINAL_DAMAGE.toFixed(2)}%</span>
                    </div>
                    <div class="damage-row">
                        <span class="damage-label">Damage Amplification:</span>
                        <span class="damage-value">${stats.DAMAGE_AMP.toFixed(2)}</span>
                    </div>
                    <div class="damage-row" style="display: none;">
                        <span class="damage-label">Defense Penetration:</span>
                        <span class="damage-value">${stats.DEF_PEN.toFixed(2)}%</span>
                    </div>
                    <div class="damage-row">
                        <span class="damage-label">Skill Coefficient:</span>
                        <span class="damage-value">${stats.SKILL_COEFFICIENT.toFixed(2)}%</span>
                    </div>
                    <div class="damage-row">
                        <span class="damage-label">Skill Mastery:</span>
                        <span class="damage-value">${stats.MASTERY.toFixed(2)}%</span>
                    </div>
                    <div class="damage-row">
                        <span class="damage-label">Skill Mastery (Boss Only):</span>
                        <span class="damage-value">${stats.BOSS_MASTERY.toFixed(2)}%</span>
                    </div>
                    <div class="damage-row">
                        <span class="damage-label">Attack Speed:</span>
                        <span class="damage-value">${stats.ATTACK_SPEED.toFixed(2)}%</span>
                    </div>
                    <div class="damage-row">
                        <span class="damage-label">Min Damage Multiplier:</span>
                        <span class="damage-value">${stats.MIN_DAMAGE.toFixed(2)}%</span>
                    </div>
                    <div class="damage-row">
                        <span class="damage-label">Max Damage Multiplier:</span>
                        <span class="damage-value">${stats.MAX_DAMAGE.toFixed(2)}%</span>
                    </div>
                </div>
            </div>

            ${passiveGainsHTML}

            <div class="damage-box">
                <h3 onclick="toggleSubDetails('multipliers-${uniqueId}')">Multipliers Applied <span id="multipliers-${uniqueId}-icon">▼</span></h3>
                <div id="multipliers-${uniqueId}" class="collapsible-section">
                    <div class="damage-row">
                        <span class="damage-label">Damage Amp Multiplier:</span>
                        <span class="damage-value">${bossResults.damageAmpMultiplier.toFixed(4)}x</span>
                    </div>
                    <div class="damage-row">
                        <span class="damage-label">Attack Speed Multiplier:</span>
                        <span class="damage-value">${bossResults.attackSpeedMultiplier.toFixed(4)}x</span>
                    </div>
                </div>
            </div>

            <div class="damage-box">
                <h3 onclick="toggleSubDetails('boss-${uniqueId}')">VS Boss Monsters <span id="boss-${uniqueId}-icon">▼</span></h3>
                <div id="boss-${uniqueId}" class="collapsible-section">
                <div class="damage-row">
                    <span class="damage-label">Expected Damage:</span>
                    <span class="damage-value">${formatNumber(bossResults.expectedDamage)}</span>
                </div>
                <div class="damage-row">
                    <span class="damage-label">Base Damage:</span>
                    <span class="damage-value">${formatNumber(bossResults.baseDamage)}</span>
                </div>
                <div class="damage-row">
                    <span class="damage-label">Non-Crit MIN:</span>
                    <span class="damage-value">${formatNumber(bossResults.nonCritMin)}</span>
                </div>
                <div class="damage-row">
                    <span class="damage-label">Non-Crit AVG:</span>
                    <span class="damage-value">${formatNumber(bossResults.nonCritAvg)}</span>
                </div>
                <div class="damage-row">
                    <span class="damage-label">Non-Crit MAX:</span>
                    <span class="damage-value">${formatNumber(bossResults.nonCritMax)}</span>
                </div>
                <div class="damage-row">
                    <span class="damage-label">Crit MIN:</span>
                    <span class="damage-value">${formatNumber(bossResults.critMin)}</span>
                </div>
                <div class="damage-row">
                    <span class="damage-label">Crit AVG:</span>
                    <span class="damage-value">${formatNumber(bossResults.critAvg)}</span>
                </div>
                <div class="damage-row">
                    <span class="damage-label">Crit MAX:</span>
                    <span class="damage-value">${formatNumber(bossResults.critMax)}</span>
                </div>
            </div>
            </div>

            <div class="damage-box">
                <h3 onclick="toggleSubDetails('normal-${uniqueId}')">VS Normal Monsters <span id="normal-${uniqueId}-icon">▼</span></h3>
                <div id="normal-${uniqueId}" class="collapsible-section">
                <div class="damage-row">
                    <span class="damage-label">Expected Damage:</span>
                    <span class="damage-value">${formatNumber(normalResults.expectedDamage)}</span>
                </div>
                <div class="damage-row">
                    <span class="damage-label">Base Damage:</span>
                    <span class="damage-value">${formatNumber(normalResults.baseDamage)}</span>
                </div>
                <div class="damage-row">
                    <span class="damage-label">Non-Crit MIN:</span>
                    <span class="damage-value">${formatNumber(normalResults.nonCritMin)}</span>
                </div>
                <div class="damage-row">
                    <span class="damage-label">Non-Crit AVG:</span>
                    <span class="damage-value">${formatNumber(normalResults.nonCritAvg)}</span>
                </div>
                <div class="damage-row">
                    <span class="damage-label">Non-Crit MAX:</span>
                    <span class="damage-value">${formatNumber(normalResults.nonCritMax)}</span>
                </div>
                <div class="damage-row">
                    <span class="damage-label">Crit MIN:</span>
                    <span class="damage-value">${formatNumber(normalResults.critMin)}</span>
                </div>
                <div class="damage-row">
                    <span class="damage-label">Crit AVG:</span>
                    <span class="damage-value">${formatNumber(normalResults.critAvg)}</span>
                </div>
                <div class="damage-row">
                    <span class="damage-label">Crit MAX:</span>
                    <span class="damage-value">${formatNumber(normalResults.critMax)}</span>
                </div>
                </div>
            </div>
        </div>
    </div>
    `;

    return html;
}

// ============================================================================
// TOGGLE FUNCTIONS
// ============================================================================

/**
 * Toggle sub-details sections
 */
export function toggleSubDetails(id: string): void {
    const section = document.getElementById(id);
    const icon = document.getElementById(`${id}-icon`);
    const header = icon?.parentElement;

    if (section?.classList.contains('expanded')) {
        section.classList.remove('expanded');
        if (header) header.classList.remove('expanded');
    } else {
        section?.classList.add('expanded');
        if (header) header.classList.add('expanded');
    }
}

/**
 * Toggle details sections
 */
export function toggleDetails(id: string, event?: Event): void {
    const detailsSection = document.getElementById(`details-${id}`);
    const toggleButton = event?.target as HTMLElement;

    if (detailsSection?.classList.contains('expanded')) {
        detailsSection.classList.remove('expanded');
        if (toggleButton) {
            toggleButton.classList.remove('expanded');
            toggleButton.textContent = 'Show Detailed Breakdown';
        }
    } else {
        detailsSection?.classList.add('expanded');
        if (toggleButton) {
            toggleButton.classList.add('expanded');
            toggleButton.textContent = 'Hide Detailed Breakdown';
        }
    }
}

// ============================================================================
// CALCULATE EQUIPMENT SLOT DPS
// ============================================================================

/**
 * Calculate DPS for each equipment slot
 */
export function calculateEquipmentSlotDPS(): void {
    const baseStats = loadoutStore.getBaseStats();
    const slotNames = ['head', 'cape', 'chest', 'shoulders', 'legs', 'belt', 'gloves', 'boots', 'ring', 'neck', 'eye-accessory'];

    // Use StatCalculationService for consistent calculations (auto-fetches weaponAttackBonus from state)
    const baseService = new StatCalculationService(baseStats);
    const baselineDPS = baseService.computeDPS('boss');

    // Track total stats from all slots for total DPS calculation
    let totalAttackFromSlots = 0;
    let totalStatDamageFromSlots = 0;
    let totalDamageAmpFromSlots = 0;

    slotNames.forEach(slotId => {
        const attackInput = document.getElementById(`slot-${slotId}-attack`) as HTMLInputElement;
        const mainStatInput = document.getElementById(`slot-${slotId}-main-stat`) as HTMLInputElement;
        const damageAmpInput = document.getElementById(`slot-${slotId}-damage-amp`) as HTMLInputElement;

        const slotAttack = parseFloat(attackInput?.value) || 0;
        const slotMainStat = parseFloat(mainStatInput?.value) || 0;
        const slotDamageAmp = parseFloat(damageAmpInput?.value) || 0;

        // Convert main stat to stat damage (100:1 ratio)
        const statDamageFromMainStat = slotMainStat / 100;

        // Add to totals
        totalAttackFromSlots += slotAttack;
        totalStatDamageFromSlots += statDamageFromMainStat;
        totalDamageAmpFromSlots += slotDamageAmp;

        // Use StatCalculationService chaining API to calculate DPS without this slot
        // The service handles weapon attack bonus automatically
        const withoutSlotDPS = new StatCalculationService(baseStats)
            .subtract(STAT.ATTACK.id, slotAttack)
            .subtract(STAT.STAT_DAMAGE.id, statDamageFromMainStat)
            .subtract(STAT.DAMAGE_AMP.id, slotDamageAmp)
            .computeDPS('boss');

        // Calculate percentage gain
        const dpsGainPct = ((baselineDPS - withoutSlotDPS) / baselineDPS * 100);

        // Display results
        const dpsDisplay = document.getElementById(`slot-${slotId}-dps`);
        if (dpsDisplay) dpsDisplay.textContent = `+${dpsGainPct.toFixed(2)}%`;
    });

    // Calculate total DPS gain from all slots using chaining API
    const withoutAllSlotsDPS = new StatCalculationService(baseStats)
        .subtract(STAT.ATTACK.id, totalAttackFromSlots)
        .subtract(STAT.STAT_DAMAGE.id, totalStatDamageFromSlots)
        .subtract(STAT.DAMAGE_AMP.id, totalDamageAmpFromSlots)
        .computeDPS('boss');

    const totalDPSGainPct = ((baselineDPS - withoutAllSlotsDPS) / baselineDPS * 100);

    // Display total DPS gain
    const totalDPSDisplay = document.getElementById('total-slots-dps');
    if (totalDPSDisplay) totalDPSDisplay.textContent = `+${totalDPSGainPct.toFixed(2)}%`;
}

// ============================================================================
// TYPE AUGMENTATION
// ============================================================================

declare global {
    interface Window {
        calculateEquipmentSlotDPS: typeof calculateEquipmentSlotDPS;
        toggleSubDetails: typeof toggleSubDetails;
        toggleDetails: typeof toggleDetails;
    }
}
