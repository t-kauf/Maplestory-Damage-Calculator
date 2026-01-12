import { getCompanionEffects, getMaxCompanionLevel } from '@core/companions/index.js';
import { updateCompanion, getCompanionsState } from '@core/state.js';
import { saveToLocalStorage } from '@core/storage.js';

// Mapping of class names to display names
const CLASS_DISPLAY_NAMES = {
    'Hero': 'Hero',
    'DarkKnight': 'Dark Knight',
    'ArchMageIL': 'I/L Mage',
    'ArchMageFP': 'F/P Mage',
    'BowMaster': 'Bow Master',
    'Marksman': 'Marksman',
    'NightLord': 'Night Lord',
    'Shadower': 'Shadower'
};

// Class order for companions
const CLASS_ORDER = ['Hero', 'DarkKnight', 'ArchMageIL', 'ArchMageFP', 'BowMaster', 'Marksman', 'NightLord', 'Shadower'];

// Rarity configurations
const RARITY_CONFIG = {
    'Normal': {
        color: '#ffffff',
        borderColor: '#888888',
        count: 4,
        classes: ['Hero', 'ArchMageIL', 'BowMaster', 'Shadower'] // Only first 4 classes
    },
    'Rare': {
        color: '#00ccff',
        borderColor: '#5d87df',
        count: 8,
        classes: CLASS_ORDER // All 8 classes
    },
    'Epic': {
        color: '#bb77ff',
        borderColor: '#7e5ad4',
        count: 8,
        classes: CLASS_ORDER
    },
    'Unique': {
        color: '#ffaa00',
        borderColor: '#e8a019',
        count: 8,
        classes: CLASS_ORDER
    },
    'Legendary': {
        color: '#1fffca',
        borderColor: '#2dbd7a',
        count: 8,
        classes: CLASS_ORDER
    }
};

/**
 * Initialize the companions UI
 */
export function initializeCompanionsUI() {
    renderCompanionsGrid();
    updateSummary();
}

/**
 * Render the companions grid
 */
function renderCompanionsGrid() {
    const container = document.getElementById('companions-grid-container');
    if (!container) return;

    let html = '';

    // Render each rarity section
    Object.entries(RARITY_CONFIG).forEach(([rarity, config]) => {
        html += `
            <div class="companions-rarity-section" style="margin-bottom: 30px;">
                <h3 style="color: ${config.borderColor}; margin-bottom: 15px; font-size: 1.2em; font-weight: bold; border-bottom: 2px solid ${config.borderColor}; padding-bottom: 5px;">
                    ${rarity}
                </h3>
                <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px;">
                    ${config.classes.map(className => renderCompanionCard(className, rarity, config)).join('')}
                </div>
            </div>
        `;
    });

    container.innerHTML = html;

    // Attach event listeners
    attachCompanionEventListeners();
}

/**
 * Render a single companion card
 */
function renderCompanionCard(className, rarity, config) {
    const companionKey = `${className}-${rarity}`;
    const state = getCompanionsState();
    const companionData = state[companionKey] || { unlocked: false, level: 1, equipped: false };

    const displayName = CLASS_DISPLAY_NAMES[className];
    const isUnlocked = companionData.unlocked;
    const level = companionData.level || 1;
    const maxLevel = getMaxCompanionLevel();

    // Get companion effects
    let inventoryEffectText = '';
    let equipEffectText = '';

    if (isUnlocked) {
        const effects = getCompanionEffects(className, rarity, level);
        if (effects) {
            inventoryEffectText = formatEffects(effects.inventoryEffect);
            equipEffectText = formatEffects(effects.equipEffect);
        }
    }

    return `
        <div class="companion-card"
             data-companion="${companionKey}"
             style="
                background: ${isUnlocked ? 'var(--background)' : 'rgba(0, 0, 0, 0.5)'};
                border: 3px solid ${config.borderColor};
                border-radius: 12px;
                padding: 10px;
                position: relative;
                cursor: pointer;
                transition: all 0.3s ease;
                opacity: ${isUnlocked ? '1' : '0.5'};
                filter: ${isUnlocked ? 'none' : 'grayscale(80%)'};
             "
             onmouseover="this.style.transform='translateY(-5px)'; this.style.boxShadow='0 8px 16px rgba(0,0,0,0.3)';"
             onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none';">

            <!-- Lock/Unlock Icon -->
            <div style="position: absolute; top: 5px; right: 5px; font-size: 1.2em; z-index: 10;">
                ${isUnlocked ? '🔓' : '🔒'}
            </div>

            <!-- Level Badge -->
            <div style="position: absolute; top: 5px; left: 5px; background: rgba(0, 0, 0, 0.7); color: white; padding: 2px 6px; border-radius: 4px; font-size: 0.8em; font-weight: bold;">
                Lv.${level}
            </div>

            <!-- Companion Portrait Placeholder -->
            <div style="width: 100%; aspect-ratio: 1; background: linear-gradient(135deg, ${config.color}22, ${config.borderColor}33); border-radius: 8px; margin-bottom: 8px; display: flex; align-items: center; justify-content: center; font-size: 2em;">
                ${getClassEmoji(className)}
            </div>

            <!-- Companion Name -->
            <div style="text-align: center; font-weight: bold; color: var(--text-primary); margin-bottom: 5px; font-size: 0.9em;">
                ${displayName}
            </div>

            <!-- Level Input -->
            <div style="margin-bottom: 8px;">
                <input type="number"
                       class="companion-level-input"
                       data-companion="${companionKey}"
                       value="${level}"
                       min="1"
                       max="${maxLevel}"
                       ${!isUnlocked ? 'disabled' : ''}
                       style="width: 100%; padding: 5px; border: 1px solid ${config.borderColor}; border-radius: 4px; background: var(--input-bg); color: var(--text-primary); text-align: center; font-size: 0.9em;"
                       onclick="event.stopPropagation();"
                       onchange="handleLevelChange('${companionKey}', this.value)">
            </div>

            <!-- Level Progress -->
            <div style="text-align: center; font-size: 0.8em; color: var(--text-secondary); margin-bottom: 8px;">
                ${level} / ${maxLevel}
            </div>

            <!-- Effects Display -->
            ${isUnlocked ? `
                <div style="font-size: 0.75em; color: var(--text-secondary); border-top: 1px solid ${config.borderColor}; padding-top: 5px;">
                    ${inventoryEffectText ? `
                        <div style="margin-bottom: 3px;">
                            <strong style="color: ${config.borderColor};">Inventory:</strong>
                            <div style="margin-left: 5px;">${inventoryEffectText}</div>
                        </div>
                    ` : ''}
                    ${equipEffectText ? `
                        <div>
                            <strong style="color: ${config.borderColor};">Equip:</strong>
                            <div style="margin-left: 5px;">${equipEffectText}</div>
                        </div>
                    ` : ''}
                </div>
            ` : ''}
        </div>
    `;
}

/**
 * Get emoji representation for class
 */
function getClassEmoji(className) {
    const emojis = {
        'Hero': '⚔️',
        'DarkKnight': '🛡️',
        'ArchMageIL': '❄️',
        'ArchMageFP': '🔥',
        'BowMaster': '🏹',
        'Marksman': '🎯',
        'NightLord': '🗡️',
        'Shadower': '💀'
    };
    return emojis[className] || '❓';
}

/**
 * Format effects for display
 */
function formatEffects(effects) {
    if (!effects || Object.keys(effects).length === 0) return '';

    return Object.entries(effects)
        .map(([stat, value]) => {
            const formattedValue = typeof value === 'number' ?
                (Number.isInteger(value) ? value : value.toFixed(1)) : value;
            return `${stat}: +${formattedValue}`;
        })
        .join('<br>');
}

/**
 * Attach event listeners to companion cards
 */
function attachCompanionEventListeners() {
    // Card click to unlock/lock
    document.querySelectorAll('.companion-card').forEach(card => {
        card.addEventListener('click', (e) => {
            // Don't trigger if clicking on input
            if (e.target.classList.contains('companion-level-input')) return;

            const companionKey = card.dataset.companion;
            toggleCompanionLock(companionKey);
        });
    });
}

/**
 * Toggle companion lock status
 */
function toggleCompanionLock(companionKey) {
    const state = getCompanionsState();
    const current = state[companionKey] || { unlocked: false, level: 1, equipped: false };

    updateCompanion(companionKey, {
        ...current,
        unlocked: !current.unlocked
    });

    renderCompanionsGrid();
    updateSummary();
    saveToLocalStorage();
}

/**
 * Handle level change
 */
window.handleLevelChange = function(companionKey, newLevel) {
    const level = parseInt(newLevel);
    const maxLevel = getMaxCompanionLevel();

    if (isNaN(level) || level < 1 || level > maxLevel) {
        return;
    }

    const state = getCompanionsState();
    const current = state[companionKey] || { unlocked: true, level: 1, equipped: false };

    updateCompanion(companionKey, {
        ...current,
        level: level
    });

    renderCompanionsGrid();
    updateSummary();
    saveToLocalStorage();
};

/**
 * Update the summary section
 */
function updateSummary() {
    const container = document.getElementById('companions-summary-content');
    if (!container) return;

    const state = getCompanionsState();
    const totalEffects = {};

    // Calculate total inventory effects from all unlocked companions
    Object.entries(state).forEach(([companionKey, data]) => {
        if (!data.unlocked) return;

        const [className, rarity] = companionKey.split('-');
        const effects = getCompanionEffects(className, rarity, data.level);

        if (effects && effects.inventoryEffect) {
            Object.entries(effects.inventoryEffect).forEach(([stat, value]) => {
                totalEffects[stat] = (totalEffects[stat] || 0) + value;
            });
        }
    });

    // Render summary
    if (Object.keys(totalEffects).length === 0) {
        container.innerHTML = '<div style="color: var(--text-secondary); text-align: center;">No unlocked companions</div>';
        return;
    }

    container.innerHTML = Object.entries(totalEffects)
        .map(([stat, value]) => {
            const formattedValue = typeof value === 'number' ?
                (Number.isInteger(value) ? value : value.toFixed(1)) : value;
            return `
                <div style="background: rgba(0, 122, 255, 0.1); padding: 8px 12px; border-radius: 6px; border: 1px solid var(--border-color);">
                    <div style="font-weight: bold; color: var(--accent-primary);">${stat}</div>
                    <div style="font-size: 1.2em; color: var(--text-primary);">+${formattedValue}</div>
                </div>
            `;
        })
        .join('');
}

/**
 * Refresh the companions UI
 */
export function refreshCompanionsUI() {
    renderCompanionsGrid();
    updateSummary();
}
