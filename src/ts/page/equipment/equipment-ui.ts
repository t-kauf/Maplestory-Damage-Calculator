/**
 * Equipment UI - HTML Generation and Event Handlers
 * Handles all UI rendering and user interactions for equipment slots
 */

import type {
    EquipmentSlotConfig,
    EquipmentSlotData,
    EquipmentSlotId,
    StatLineType,
    EquipmentAggregateStats,
    StatDisplayConfig,
} from '@ts/types/page/equipment/equipment.types';
import { STAT_KEY_MAP } from '@ts/types/page/equipment/equipment.types';
import {
    EQUIPMENT_SLOTS,
    getSlotConfig,
    getAvailableStats,
    setSlotData,
    loadAllEquipmentData,
    getAllEquipmentData,
    calculateAllContributions,
    isValidSlot,
} from './equipment';
import { STAT } from '@ts/types/constants';

/**
 * Mapping from camelCase STAT IDs to kebab-case StatLineType values
 * Used to bridge between STAT constant and equipment stat line types
 */
const STAT_ID_TO_LINE_TYPE: Record<string, StatLineType> = {
    attack: 'attack',
    mainStat: 'main-stat',
    defense: 'defense',
    critRate: 'crit-rate',
    critDamage: 'crit-damage',
    skillLevel1st: 'skill-level-1st',
    skillLevel2nd: 'skill-level-2nd',
    skillLevel3rd: 'skill-level-3rd',
    skillLevel4th: 'skill-level-4th',
    normalDamage: 'normal-damage',
    bossDamage: 'boss-damage',
    damage: 'damage',
    finalDamage: 'final-damage',
    minDamage: 'min-damage',
    maxDamage: 'max-damage',
} as const;

/**
 * Mapping from StatLineType to STAT keys
 */
const LINE_TYPE_TO_STAT_KEY: Record<StatLineType, keyof typeof STAT> = {
    'attack': 'ATTACK',
    'main-stat': 'MAIN_STAT_PCT', // Using MAIN_STAT_PCT for main stat %
    'defense': 'DEFENSE',
    'crit-rate': 'CRIT_RATE',
    'crit-damage': 'CRIT_DAMAGE',
    'skill-level-1st': 'SKILL_LEVEL_1ST',
    'skill-level-2nd': 'SKILL_LEVEL_2ND',
    'skill-level-3rd': 'SKILL_LEVEL_3RD',
    'skill-level-4th': 'SKILL_LEVEL_4TH',
    'skill-level-all': 'ATTACK_SPEED', // Fallback for now
    'normal-damage': 'NORMAL_DAMAGE',
    'boss-damage': 'BOSS_DAMAGE',
    'damage': 'DAMAGE',
    'damage-amp': 'DAMAGE_AMP',
    'final-damage': 'FINAL_DAMAGE',
    'min-damage': 'MIN_DAMAGE',
    'max-damage': 'MAX_DAMAGE',
} as const;

// ============================================================================
// WINDOW TYPE DECLARATIONS
// ============================================================================

declare global {
    interface Window {
        saveSlotData: (slotId: string) => void;
        addStatLineToSlot: (slotId: string) => void;
        removeStatLineFromSlot: (slotId: string, statId: number) => void;
        clearSlotData: (slotId: string) => void;
        loadEquipmentData: () => void;
        notifyStatContributors: () => void;
        equipmentAggregateStats?: EquipmentAggregateStats;
    }
}

// ============================================================================
// HTML GENERATION
// ============================================================================

/**
 * Generate HTML for a single equipment slot card
 */
function generateSlotCardHTML(slot: EquipmentSlotConfig): string {
    const mainStatInput = slot.hasMainStat ? `
        <div class="equipment-input-group">
            <label class="equipment-input-label" for="equipment-${slot.id}-main-stat">Main Stat</label>
            <input type="number" step="1" id="equipment-${slot.id}-main-stat" value="0" min="0" class="equipment-input-field">
        </div>
    ` : '';

    return `
        <div id="equipment-slot-${slot.id}" class="equipment-slot-card" data-needs-init="true">
            <div class="equipment-slot-header">
                <div class="equipment-slot-name">${slot.name}</div>
            </div>

            <div class="equipment-inputs-grid">
                <div class="equipment-input-group">
                    <label class="equipment-input-label" for="equipment-${slot.id}-attack">${STAT.ATTACK.label}</label>
                    <input type="number" step="0.1" id="equipment-${slot.id}-attack" value="0" min="0" class="equipment-input-field">
                </div>
                ${mainStatInput}
            </div>

            <div class="equipment-stats-section">
                <div class="equipment-stats-header">
                    <label class="equipment-stats-label">Additional Stats</label>
                    <button data-slot="${slot.id}" class="equipment-action-btn equipment-btn-add">
                        + Add Stat
                    </button>
                </div>
                <div id="equipment-${slot.id}-stats-container" class="equipment-stats-container">
                    <!-- Stat lines will be added here -->
                </div>
            </div>
        </div>
    `;
}

/**
 * Generate HTML for a stat line
 */
function generateStatLineHTML(slotId: string, statIndex: number): string {
    const optionsHTML = getAvailableStats()
        .map(stat => `<option value="${stat.value}">${stat.label}</option>`)
        .join('');

    return `
        <div id="equipment-${slotId}-stat-${statIndex}" class="equipment-stat-line">
            <div class="equipment-input-group equipment-stat-type-select">
                <select id="equipment-${slotId}-stat-${statIndex}-type" class="equipment-input-field equipment-select-field">
                    ${optionsHTML}
                </select>
            </div>
            <div class="equipment-input-group">
                <input type="number" step="0.1" id="equipment-${slotId}-stat-${statIndex}-value" value="0" class="equipment-input-field equipment-stat-value-input">
            </div>
            <button data-slot="${slotId}" data-stat="${statIndex}" class="equipment-btn-delete equipment-stat-delete-btn" title="Remove stat line">✕</button>
        </div>
    `;
}

/**
 * Generate the complete HTML for all equipment slots
 */
export function generateEquipmentHTML(): string {
    return `
        <div id="equipment-summary-container" class="mb-8">
            <div class="equipment-summary-header">Equipment Summary</div>
            <div id="equipment-summary-content" class="equipment-summary-content">
                <span class="equipment-summary-empty">No equipment configured</span>
            </div>
        </div>

        <div id="equipment-slots-container" class="equipment-slots-grid">
            ${EQUIPMENT_SLOTS.map(generateSlotCardHTML).join('')}
        </div>       
    `;
}

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initialize the equipment UI - generates HTML only
 */
export function initializeEquipmentUI(): void {
    const container = document.getElementById('setup-equipment');
    if (!container) {
        console.error('Equipment container not found');
        return;
    }

    // Generate HTML
    container.innerHTML = generateEquipmentHTML();
}

/**
 * Load equipment data from localStorage and populate UI
 */
export function loadEquipmentUI(): void {
    loadAllEquipmentData();

    const equipmentData = getAllEquipmentData();

    EQUIPMENT_SLOTS.forEach(slot => {
        const slotElement = document.getElementById(`equipment-slot-${slot.id}`);
        const slotData = equipmentData[slot.id];

        if (!slotElement) return;

        // Clear init flag
        slotElement.dataset.needsInit = 'false';

        if (slotData) {
            populateSlotWithData(slot.id, slotData);
        } else {
            // Initialize with empty stat lines
            const statsContainer = document.getElementById(`equipment-${slot.id}-stats-container`);
            if (statsContainer && statsContainer.children.length === 0) {
                for (let i = 0; i < 3; i++) {
                    addStatLineToSlot(slot.id);
                }
            }
        }
    });

    // Update summary after loading
    updateEquipmentSummary();
}

/**
 * Populate a slot with saved data
 */
function populateSlotWithData(slotId: string, data: EquipmentSlotData): void {
    // Set attack
    const attackInput = document.getElementById(`equipment-${slotId}-attack`) as HTMLInputElement;
    if (attackInput) attackInput.value = (data.attack || 0).toString();

    // Set main stat if applicable
    const mainStatInput = document.getElementById(`equipment-${slotId}-main-stat`) as HTMLInputElement;
    if (mainStatInput && data.mainStat !== undefined) {
        mainStatInput.value = data.mainStat.toString();
    }

    // Clear and rebuild stat lines
    const statsContainer = document.getElementById(`equipment-${slotId}-stats-container`);
    if (statsContainer) {
        statsContainer.innerHTML = '';

        if (data.statLines && Array.isArray(data.statLines)) {
            data.statLines.forEach(statLine => {
                addStatLineToSlot(slotId);
                const statCount = statsContainer.children.length;
                const typeInput = document.getElementById(`equipment-${slotId}-stat-${statCount}-type`) as HTMLSelectElement;
                const valueInput = document.getElementById(`equipment-${slotId}-stat-${statCount}-value`) as HTMLInputElement;
                if (typeInput) typeInput.value = statLine.type;
                if (valueInput) valueInput.value = statLine.value.toString();
            });
        }
    }
}

// ============================================================================
// EVENT HANDLERS
// ============================================================================

/**
 * Debounce utility function
 */
function debounce<T extends (...args: unknown[]) => void>(func: T, wait: number): (...args: Parameters<T>) => void {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    return function executedFunction(...args: Parameters<T>) {
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}

/**
 * Save data for a specific slot from DOM inputs
 */
function saveSlotDataFromDOM(slotId: string): void {
    // Type guard check
    if (!isValidSlot(slotId)) {
        console.warn(`Invalid slot ID: ${slotId}`);
        return;
    }

    // After type guard check, we can safely cast to EquipmentSlotId
    const validSlotId = slotId as EquipmentSlotId;

    const slotConfig = getSlotConfig(validSlotId);
    if (!slotConfig) return;

    // Get attack value
    const attackInput = document.getElementById(`equipment-${validSlotId}-attack`) as HTMLInputElement;
    const attack = attackInput ? parseFloat(attackInput.value) || 0 : 0;

    // Get main stat (if applicable)
    let mainStat: number | undefined;
    if (slotConfig.hasMainStat) {
        const mainStatInput = document.getElementById(`equipment-${validSlotId}-main-stat`) as HTMLInputElement;
        mainStat = mainStatInput ? parseFloat(mainStatInput.value) || 0 : undefined;
    }

    // Get stat lines
    const statLines: Array<{ type: StatLineType; value: number }> = [];
    const statsContainer = document.getElementById(`equipment-${validSlotId}-stats-container`);
    if (statsContainer) {
        const statElements = statsContainer.querySelectorAll(`[id^="equipment-${validSlotId}-stat-"]:not([id*="-type"]):not([id*="-value"])`);
        statElements.forEach(statElement => {
            const typeInput = statElement.querySelector('[id$="-type"]') as HTMLSelectElement;
            const valueInput = statElement.querySelector('[id$="-value"]') as HTMLInputElement;
            if (typeInput && valueInput && typeInput.value && valueInput.value) {
                statLines.push({
                    type: typeInput.value as StatLineType,
                    value: parseFloat(valueInput.value) || 0
                });
            }
        });
    }

    // Store the data
    const slotData: EquipmentSlotData = {
        name: '',
        attack,
        mainStat,
        statLines
    };

    setSlotData(validSlotId, slotData);
}

/**
 * Add a stat line to a slot
 */
function addStatLineToSlot(slotId: string): void {
    const statsContainer = document.getElementById(`equipment-${slotId}-stats-container`);
    if (!statsContainer) return;

    const currentCount = statsContainer.children.length;
    const statId = currentCount + 1;

    const statDiv = document.createElement('div');
    statDiv.innerHTML = generateStatLineHTML(slotId, statId);
    statsContainer.appendChild(statDiv.firstElementChild!);
}

/**
 * Remove a stat line from a slot
 */
function removeStatLineFromSlot(slotId: string, statId: number): void {
    const statElement = document.getElementById(`equipment-${slotId}-stat-${statId}`);
    if (statElement) {
        statElement.remove();
        saveSlotDataFromDOM(slotId);
        notifyStatContributors();
    }
}

/**
 * Notify that stats have changed
 * Updates ContributedStats and notifies all listeners
 */
function notifyStatContributors(): void {
    // Calculate equipment contributions
    const equipmentStats = calculateAllContributions();

    // Update the equipment summary display
    updateEquipmentSummary();
}

// ============================================================================
// EQUIPMENT SUMMARY
// ============================================================================

/**
 * Calculate aggregate stats across all equipment
 */
function calculateAggregateStats(equipmentData: ReturnType<typeof getAllEquipmentData>): EquipmentAggregateStats {
    const totals: EquipmentAggregateStats = {
        [STAT.ATTACK.id]: 0,
        mainStat: 0, // Equipment-specific key
        [STAT.DEFENSE.id]: 0,
        [STAT.CRIT_RATE.id]: 0,
        [STAT.CRIT_DAMAGE.id]: 0,
        [STAT.BOSS_DAMAGE.id]: 0,
        [STAT.NORMAL_DAMAGE.id]: 0,
        [STAT.DAMAGE.id]: 0,
        [STAT.DAMAGE_AMP.id]: 0,
        [STAT.FINAL_DAMAGE.id]: 0,
        [STAT.MIN_DAMAGE.id]: 0,
        [STAT.MAX_DAMAGE.id]: 0,
        [STAT.SKILL_LEVEL_1ST.id]: 0,
        [STAT.SKILL_LEVEL_2ND.id]: 0,
        [STAT.SKILL_LEVEL_3RD.id]: 0,
        [STAT.SKILL_LEVEL_4TH.id]: 0,
        skillLevelAll: 0 // Equipment-specific key (no STAT equivalent)
    };

    Object.values(equipmentData).forEach(slotData => {
        if (!slotData) return;

        // Add attack
        if (slotData.attack) {
            totals[STAT.ATTACK.id] += slotData.attack;
        }

        // Add main stat
        if (slotData.mainStat) {
            totals.mainStat += slotData.mainStat;
        }

        // Add stat lines
        if (slotData.statLines && Array.isArray(slotData.statLines)) {
            slotData.statLines.forEach(statLine => {
                const statKey = STAT_KEY_MAP[statLine.type];
                if (statKey && totals.hasOwnProperty(statKey)) {
                    totals[statKey] += statLine.value;
                }
            });
        }
    });

    return totals;
}

/**
 * Update the equipment summary with aggregate stats
 */
export function updateEquipmentSummary(): void {
    const equipmentData = getAllEquipmentData();
    const totals = calculateAggregateStats(equipmentData);
    updateSummaryDisplay(totals);
}

/**
 * Update the summary display with premium styling
 */
function updateSummaryDisplay(totals: EquipmentAggregateStats): void {
    const summaryElement = document.getElementById('equipment-summary-content');
    if (!summaryElement) return;

    const parts: string[] = [];

    // Define stat display configuration using STAT constant labels and IDs
    const statConfigs: StatDisplayConfig[] = [
        { key: STAT.ATTACK.id, label: STAT.ATTACK.label, isPercent: false },
        { key: 'mainStat', label: 'Main Stat', isPercent: false }, // Equipment-specific key
        { key: STAT.DEFENSE.id, label: STAT.DEFENSE.label, isPercent: false },
        { key: STAT.CRIT_RATE.id, label: STAT.CRIT_RATE.label.replace(' (%)', ''), isPercent: true },
        { key: STAT.CRIT_DAMAGE.id, label: STAT.CRIT_DAMAGE.label.replace(' (%)', ''), isPercent: true },
        { key: STAT.BOSS_DAMAGE.id, label: STAT.BOSS_DAMAGE.label.replace(' (%)', '').replace('Monster ', ''), isPercent: true },
        { key: STAT.DAMAGE.id, label: STAT.DAMAGE.label.replace(' (%)', ''), isPercent: true },
        { key: STAT.NORMAL_DAMAGE.id, label: STAT.NORMAL_DAMAGE.label.replace(' (%)', '').replace('Monster ', ''), isPercent: true },
        { key: STAT.FINAL_DAMAGE.id, label: STAT.FINAL_DAMAGE.label.replace(' (%)', ''), isPercent: true },
        { key: STAT.MIN_DAMAGE.id, label: STAT.MIN_DAMAGE.label.replace(' (%)', '').replace(' Multiplier', ''), isPercent: true },
        { key: STAT.MAX_DAMAGE.id, label: STAT.MAX_DAMAGE.label.replace(' (%)', '').replace(' Multiplier', ''), isPercent: true },
        { key: STAT.SKILL_LEVEL_1ST.id, label: STAT.SKILL_LEVEL_1ST.label, isPercent: false },
        { key: STAT.SKILL_LEVEL_2ND.id, label: STAT.SKILL_LEVEL_2ND.label, isPercent: false },
        { key: STAT.SKILL_LEVEL_3RD.id, label: STAT.SKILL_LEVEL_3RD.label, isPercent: false },
        { key: STAT.SKILL_LEVEL_4TH.id, label: STAT.SKILL_LEVEL_4TH.label, isPercent: false },
        { key: 'skillLevelAll', label: 'All Jobs', isPercent: false } // Equipment-specific key (no STAT equivalent)
    ];

    statConfigs.forEach(config => {
        const value = totals[config.key];
        // Round to 1 decimal place using Math.round
        const roundedValue = Math.round(value * 10) / 10;
        if (roundedValue > 0) {
            const formattedValue = config.isPercent ? `${roundedValue}%` : roundedValue;
            parts.push(`
                <span class="equipment-summary-stat">
                    <span class="equipment-summary-stat-value">+${formattedValue}</span>
                    ${config.label}
                </span>
            `);
        }
    });

    if (parts.length === 0) {
        summaryElement.innerHTML = '<span class="equipment-summary-empty">No equipment configured</span>';
    } else {
        summaryElement.innerHTML = parts.join('<span class="equipment-summary-divider">•</span>');
    }

    // Store totals for potential future use
    window.equipmentAggregateStats = totals;
}

// ============================================================================
// EVENT LISTENER ATTACHMENT
// ============================================================================

/**
 * Attach event listeners for the equipment UI
 */
export function attachEquipmentEventListeners(): void {
    // Attach listeners for each slot
    EQUIPMENT_SLOTS.forEach(slot => {
        const slotElement = document.getElementById(`equipment-slot-${slot.id}`);
        if (!slotElement) return;

        // Listen for input changes on all inputs
        const inputs = slotElement.querySelectorAll('input, select');
        inputs.forEach(input => {
            input.addEventListener('input', debounce(() => {
                saveSlotDataFromDOM(slot.id);
                notifyStatContributors();
            }, 300));
        });

        // Add stat button
        const addStatBtn = slotElement.querySelector('.equipment-btn-add');
        addStatBtn?.addEventListener('click', () => addStatLineToSlot(slot.id));

        // Delete stat buttons (delegation)
        slotElement.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            if (target.classList.contains('equipment-stat-delete-btn')) {
                const statId = target.getAttribute('data-stat');
                if (statId) {
                    removeStatLineFromSlot(slot.id, parseInt(statId));
                }
            }
        });
    });
}

// ============================================================================
// GLOBAL FUNCTIONS (for backward compatibility)
// ============================================================================

// Export functions for global access (needed for onclick handlers)
window.saveSlotData = (slotId: string) => {
    saveSlotDataFromDOM(slotId);
    notifyStatContributors();
};

window.addStatLineToSlot = addStatLineToSlot;

window.removeStatLineFromSlot = (slotId: string, statId: number) => {
    removeStatLineFromSlot(slotId, statId);
};

window.loadEquipmentData = loadEquipmentUI;

window.notifyStatContributors = notifyStatContributors;
