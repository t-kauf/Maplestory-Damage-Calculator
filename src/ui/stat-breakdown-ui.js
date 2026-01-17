// Stat Breakdown UI - Shows where base stats come from (equipment and companions)
// REDESIGNED: Data-driven brutalism with intentional visual hierarchy
import { getContributedStats, onContributedStatsChange, getUnlockableStatConfigs, getUnlockableStat, updateUnlockableStat, updateUnlockableStatsContributions, getGuildBonusConfigs, getGuildBonus, updateGuildBonus, updateGuildBonusesContributions } from '@core/state.js';
import { getWeaponAttackBonus } from '@core/state.js';
import { saveToLocalStorage } from '@core/storage.js';

// ============================================================================
// CSS DESIGN SYSTEM - Injected once on initialization
// ============================================================================

const STAT_BREAKDOWN_STYLES = `
    /* ========================================
       STAT BREAKDOWN - DATA BRUTALISM DESIGN
       ======================================== */

    /* Typography Override for Numbers */
    @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap');

    /* Root Variables for Contribution Types */
    :root {
        --sb-font-display: 'Inter', -apple-system, sans-serif;
        --sb-font-mono: 'JetBrains Mono', 'SF Mono', monospace;

        /* Contribution Color Palette - Refined, Not Muted */
        --sb-base: #64748b;
        --sb-equipment: #10b981;
        --sb-scrolling: #3b82f6;
        --sb-cube: #f59e0b;
        --sb-companion: #a855f7;
        --sb-inner-ability: #ec4899;
        --sb-main-stat: #ef4444;
        --sb-unlockable: #14b8a6;
        --sb-guild: #8b5cf6;

        /* Surface Colors */
        --sb-surface-primary: rgba(15, 23, 42, 0.4);
        --sb-surface-secondary: rgba(30, 41, 59, 0.3);
        --sb-surface-tertiary: rgba(51, 65, 85, 0.2);

        /* Border System */
        --sb-border-subtle: rgba(148, 163, 184, 0.1);
        --sb-border-medium: rgba(148, 163, 184, 0.2);
        --sb-border-strong: rgba(148, 163, 184, 0.3);

        /* Spacing Scale */
        --sb-space-xs: 4px;
        --sb-space-sm: 8px;
        --sb-space-md: 12px;
        --sb-space-lg: 16px;
        --sb-space-xl: 24px;

        /* Animation Timing */
        --sb-ease-out: cubic-bezier(0.16, 1, 0.3, 1);
        --sb-duration: 200ms;
    }

    /* Container */
    .stat-breakdown-wrapper {
        font-family: var(--sb-font-display);
        animation: fadeIn 0.3s var(--sb-ease-out);
    }

    /* ========================================
       TAB SYSTEM - Editorial Magazine Style
       ======================================== */

    .stat-breakdown-tabs {
        display: flex;
        gap: 2px;
        padding: var(--sb-space-sm);
        background: var(--sb-surface-tertiary);
        border-radius: 12px;
        margin-bottom: var(--sb-space-lg);
    }

    .stat-tab-button {
        flex: 1;
        padding: 14px 20px;
        background: transparent;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-family: var(--sb-font-display);
        font-weight: 600;
        font-size: 0.875rem;
        letter-spacing: -0.01em;
        color: var(--text-secondary);
        transition: all var(--sb-duration) var(--sb-ease-out);
        position: relative;
        overflow: hidden;
    }

    .stat-tab-button::before {
        content: '';
        position: absolute;
        inset: 0;
        background: currentColor;
        opacity: 0;
        transition: opacity var(--sb-duration) var(--sb-ease-out);
    }

    .stat-tab-button:hover {
        color: var(--text-primary);
        transform: translateY(-1px);
    }

    .stat-tab-button:hover::before {
        opacity: 0.05;
    }

    .stat-tab-button.active {
        background: var(--sb-surface-primary);
        color: var(--text-primary);
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1),
                    inset 0 1px 0 rgba(255, 255, 255, 0.05);
    }

    /* Tab-specific active colors */
    .stat-tab-button[data-tab="special-stats"].active {
        color: #14b8a6;
    }

    .stat-tab-button[data-tab="guild-bonuses"].active {
        color: #a855f7;
    }

    .stat-tab-button[data-tab="level-stats"].active {
        color: #f97316;
    }

    .stat-tab-content {
        display: none;
    }

    .stat-tab-content.active {
        display: block;
        animation: slideUp 0.25s var(--sb-ease-out);
    }

    /* ========================================
       SPECIAL STATS CARD - Precision Design
       ======================================== */

    .unlockable-stats-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: var(--sb-space-md);
    }

    @media (max-width: 1200px) {
        .unlockable-stats-grid {
            grid-template-columns: repeat(2, 1fr);
        }
    }

    @media (max-width: 768px) {
        .unlockable-stats-grid {
            grid-template-columns: 1fr;
        }
    }

    .stat-card {
        background: var(--sb-surface-secondary);
        border: 1px solid var(--sb-border-subtle);
        border-radius: 10px;
        padding: var(--sb-space-md);
        transition: all var(--sb-duration) var(--sb-ease-out);
        position: relative;
        overflow: hidden;
    }

    .stat-card::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 2px;
        background: var(--sb-unlockable);
        opacity: 0;
        transition: opacity var(--sb-duration) var(--sb-ease-out);
    }

    .stat-card.unlocked::before {
        opacity: 1;
    }

    .stat-card.locked {
        opacity: 0.5;
        filter: grayscale(0.3);
    }

    .stat-card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: var(--sb-space-sm);
    }

    .stat-card-title {
        font-weight: 600;
        font-size: 0.875rem;
        color: var(--text-primary);
        letter-spacing: -0.02em;
    }

    .stat-card-value-row {
        display: flex;
        align-items: center;
        gap: var(--sb-space-sm);
    }

    .stat-card-value {
        font-family: var(--sb-font-mono);
        font-weight: 700;
        font-size: 1rem;
        font-variant-numeric: tabular-nums;
        letter-spacing: -0.03em;
    }

    .stat-card-value.unlocked {
        color: #14b8a6;
    }

    .stat-card-value.locked {
        color: var(--text-secondary);
    }

    /* Lock Toggle Button - Not an emoji */
    .stat-lock-toggle {
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: transparent;
        border: 1px solid var(--sb-border-medium);
        border-radius: 6px;
        cursor: pointer;
        transition: all var(--sb-duration) var(--sb-ease-out);
        color: var(--text-secondary);
        flex-shrink: 0;
    }

    .stat-lock-toggle:hover {
        background: var(--sb-surface-tertiary);
        border-color: var(--sb-border-strong);
        color: var(--text-primary);
        transform: scale(1.05);
    }

    .stat-lock-toggle:active {
        transform: scale(0.95);
    }

    .stat-lock-toggle svg {
        width: 16px;
        height: 16px;
        stroke-width: 2;
    }

    /* Slider Section */
    .stat-slider-section {
        margin-top: var(--sb-space-md);
        padding-top: var(--sb-space-md);
        border-top: 1px solid var(--sb-border-subtle);
    }

    .stat-slider-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: var(--sb-space-sm);
    }

    .stat-slider-label {
        font-size: 0.75rem;
        font-weight: 500;
        color: var(--text-secondary);
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }

    .stat-slider-value {
        font-family: var(--sb-font-mono);
        font-size: 0.875rem;
        font-weight: 600;
        color: var(--text-primary);
    }

    /* Custom Range Slider */
    .stat-range-slider {
        -webkit-appearance: none;
        appearance: none;
        width: 100%;
        height: 4px;
        background: var(--sb-surface-tertiary);
        border-radius: 2px;
        outline: none;
        cursor: pointer;
    }

    .stat-range-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 16px;
        height: 16px;
        background: #14b8a6;
        border: 2px solid white;
        border-radius: 50%;
        cursor: pointer;
        box-shadow: 0 2px 6px rgba(20, 184, 166, 0.4);
        transition: all var(--sb-duration) var(--sb-ease-out);
    }

    .stat-range-slider::-webkit-slider-thumb:hover {
        transform: scale(1.2);
        box-shadow: 0 3px 10px rgba(20, 184, 166, 0.5);
    }

    .stat-range-slider::-webkit-slider-thumb:active {
        transform: scale(1.1);
    }

    .stat-range-slider::-moz-range-thumb {
        width: 16px;
        height: 16px;
        background: #14b8a6;
        border: 2px solid white;
        border-radius: 50%;
        cursor: pointer;
        box-shadow: 0 2px 6px rgba(20, 184, 166, 0.4);
        transition: all var(--sb-duration) var(--sb-ease-out);
    }

    .stat-range-slider::-moz-range-thumb:hover {
        transform: scale(1.2);
        box-shadow: 0 3px 10px rgba(20, 184, 166, 0.5);
    }

    /* ========================================
       GUILD BONUS CARDS - Purple Variant
       ======================================== */

    .guild-bonuses-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: var(--sb-space-md);
    }

    @media (max-width: 768px) {
        .guild-bonuses-grid {
            grid-template-columns: 1fr;
        }
    }

    .guild-card .stat-card-value.unlocked {
        color: #a855f7;
    }

    .guild-card::before {
        background: #a855f7;
    }

    .guild-card .stat-range-slider::-webkit-slider-thumb {
        background: #a855f7;
        box-shadow: 0 2px 6px rgba(168, 85, 247, 0.4);
    }

    .guild-card .stat-range-slider::-webkit-slider-thumb:hover {
        box-shadow: 0 3px 10px rgba(168, 85, 247, 0.5);
    }

    .guild-card .stat-range-slider::-moz-range-thumb {
        background: #a855f7;
        box-shadow: 0 2px 6px rgba(168, 85, 247, 0.4);
    }

    .guild-card .stat-range-slider::-moz-range-thumb:hover {
        box-shadow: 0 3px 10px rgba(168, 85, 247, 0.5);
    }

    /* ========================================
       STAT BREAKDOWN GRID - Data Visualization
       ======================================== */

    .stat-breakdown-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
        gap: var(--sb-space-md);
        margin-top: var(--sb-space-xl);
    }

    @media (max-width: 768px) {
        .stat-breakdown-grid {
            grid-template-columns: 1fr;
        }
    }

    .breakdown-card {
        background: var(--sb-surface-secondary);
        border: 1px solid var(--sb-border-subtle);
        border-radius: 10px;
        padding: var(--sb-space-md);
        transition: all var(--sb-duration) var(--sb-ease-out);
    }

    .breakdown-card:hover {
        border-color: var(--sb-border-medium);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    .breakdown-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: var(--sb-space-sm);
        padding-bottom: var(--sb-space-sm);
        border-bottom: 1px solid var(--sb-border-subtle);
    }

    .breakdown-title {
        font-weight: 600;
        font-size: 0.875rem;
        color: var(--accent-primary);
        letter-spacing: -0.02em;
    }

    .breakdown-total {
        font-family: var(--sb-font-mono);
        font-weight: 700;
        font-size: 1rem;
        color: var(--accent-primary);
        font-variant-numeric: tabular-nums;
        letter-spacing: -0.03em;
    }

    /* Weapon Bonus Note */
    .breakdown-weapon-note {
        font-size: 0.75rem;
        color: #f59e0b;
        margin-bottom: var(--sb-space-sm);
        font-family: var(--sb-font-mono);
        font-variant-numeric: tabular-nums;
    }

    /* Contribution List */
    .contribution-list {
        display: flex;
        flex-direction: column;
        gap: var(--sb-space-xs);
    }

    .contribution-item {
        display: grid;
        grid-template-columns: 1fr auto;
        gap: var(--sb-space-sm);
        padding: var(--sb-space-sm);
        background: var(--sb-surface-tertiary);
        border-left: 3px solid;
        border-radius: 0 6px 6px 0;
        transition: all var(--sb-duration) var(--sb-ease-out);
    }

    .contribution-item:hover {
        background: rgba(255, 255, 255, 0.05);
        transform: translateX(2px);
    }

    .contribution-name {
        font-size: 0.8rem;
        color: var(--text-secondary);
        font-weight: 500;
    }

    .contribution-value {
        font-family: var(--sb-font-mono);
        font-size: 0.875rem;
        font-weight: 600;
        color: var(--text-primary);
        font-variant-numeric: tabular-nums;
    }

    /* Contribution Type Colors */
    .contribution-item[data-type="base"] { border-left-color: var(--sb-base); }
    .contribution-item[data-type="equipment"] { border-left-color: var(--sb-equipment); }
    .contribution-item[data-type="scrolling"] { border-left-color: var(--sb-scrolling); }
    .contribution-item[data-type="cube"] { border-left-color: var(--sb-cube); }
    .contribution-item[data-type="companion"] { border-left-color: var(--sb-companion); }
    .contribution-item[data-type="innerAbility"] { border-left-color: var(--sb-inner-ability); }
    .contribution-item[data-type="mainStat"] { border-left-color: var(--sb-main-stat); }
    .contribution-item[data-type="unlockable"] { border-left-color: var(--sb-unlockable); }
    .contribution-item[data-type="guild"] { border-left-color: var(--sb-guild); }
    .contribution-item[data-type="unaccounted"] {
        border-left-color: #ef4444;
        background: rgba(239, 68, 68, 0.1);
    }

    /* Empty State */
    .breakdown-empty {
        text-align: center;
        color: var(--text-secondary);
        font-size: 0.875rem;
        padding: var(--sb-space-xl);
        font-style: italic;
        opacity: 0.7;
    }

    /* ========================================
       ANIMATIONS
       ======================================== */

    @keyframes fadeIn {
        from {
            opacity: 0;
        }
        to {
            opacity: 1;
        }
    }

    @keyframes slideUp {
        from {
            opacity: 0;
            transform: translateY(8px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }

    /* Dark mode adjustments */
    .dark .stat-breakdown-wrapper {
        --sb-surface-primary: rgba(15, 23, 42, 0.6);
        --sb-surface-secondary: rgba(30, 41, 59, 0.5);
        --sb-surface-tertiary: rgba(51, 65, 85, 0.4);
        --sb-border-subtle: rgba(148, 163, 184, 0.08);
        --sb-border-medium: rgba(148, 163, 184, 0.15);
        --sb-border-strong: rgba(148, 163, 184, 0.25);
    }

    /* Focus states for accessibility */
    .stat-tab-button:focus-visible,
    .stat-lock-toggle:focus-visible {
        outline: 2px solid var(--accent-primary);
        outline-offset: 2px;
    }

    .stat-range-slider:focus-visible {
        outline: 2px solid var(--accent-primary);
        outline-offset: 2px;
    }
`;

// Inject styles on module load
if (typeof document !== 'undefined') {
    const styleSheet = document.createElement('style');
    styleSheet.textContent = STAT_BREAKDOWN_STYLES;
    document.head.appendChild(styleSheet);
}

// ============================================================================
// STAT DEFINITIONS
// ============================================================================

const STAT_DEFINITIONS = {
    'mainStat': {
        displayName: 'Main Stat',
        inputId: 'primary-main-stat-base',
        isPercentage: false,
        companionKeys: ['MainStat']
    },
    'attack': {
        displayName: 'Attack',
        inputId: 'attack-base',
        isPercentage: false,
        needsDivision: true,
        companionKeys: ['Attack']
    },
    'defense': {
        displayName: 'Defense',
        inputId: 'defense-base',
        isPercentage: false
    },
    'critRate': {
        displayName: 'Critical Rate',
        inputId: 'crit-rate-base',
        isPercentage: true
    },
    'critDamage': {
        displayName: 'Critical Damage',
        inputId: 'crit-damage-base',
        isPercentage: true
    },
    'attackSpeed': {
        displayName: 'Attack Speed',
        inputId: 'attack-speed-base',
        isPercentage: true
    },
    'damage': {
        displayName: 'Damage',
        inputId: 'damage-base',
        isPercentage: true,
        companionKeys: ['AttackPower']
    },
    'damageAmp': {
        displayName: 'Damage Amplification',
        inputId: 'damage-amp-base',
        isPercentage: false
    },
    'defPen': {
        displayName: 'Defense Penetration',
        inputId: 'def-pen-base',
        isPercentage: true
    },
    'bossDamage': {
        displayName: 'Boss Monster Damage',
        inputId: 'boss-damage-base',
        isPercentage: true,
        companionKeys: ['AttackPowerToBoss']
    },
    'normalDamage': {
        displayName: 'Normal Monster Damage',
        inputId: 'normal-damage-base',
        isPercentage: true,
        companionKeys: ['AttackPowerExcludeBoss']
    },
    'minDamage': {
        displayName: 'Min Damage Multiplier',
        inputId: 'min-damage-base',
        isPercentage: true,
        companionKeys: ['MinDamageRatio']
    },
    'maxDamage': {
        displayName: 'Max Damage Multiplier',
        inputId: 'max-damage-base',
        isPercentage: true,
        companionKeys: ['MaxDamageRatio']
    },
    'finalDamage': {
        displayName: 'Final Damage',
        inputId: 'final-damage-base',
        isPercentage: true
    }
};

const SLOT_DISPLAY_NAMES = {
    'head': 'Head',
    'cape': 'Cape',
    'chest': 'Chest',
    'shoulders': 'Shoulders',
    'legs': 'Legs',
    'belt': 'Belt',
    'gloves': 'Gloves',
    'boots': 'Boots',
    'ring': 'Ring',
    'neck': 'Neck',
    'eye-accessory': 'Eye Accessory'
};

// ============================================================================
// ICON SYSTEM (SVG)
// ============================================================================

const ICONS = {
    lock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>`,
    unlock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 9.9-1"></path></svg>`
};

// ============================================================================
// RENDER FUNCTIONS - Special Stats
// ============================================================================

function renderUnlockableStatCard(unlockableKey, config) {
    const statData = getUnlockableStat(unlockableKey);
    const isUnlocked = statData.unlocked;
    const currentLevel = statData.level || 0;
    const currentValue = config.base + (currentLevel * config.increment);

    const cardClass = isUnlocked ? 'stat-card unlocked' : 'stat-card locked';
    const valueClass = isUnlocked ? 'stat-card-value unlocked' : 'stat-card-value locked';
    const lockIcon = isUnlocked ? ICONS.unlock : ICONS.lock;
    const lockTitle = isUnlocked ? 'Lock this stat' : 'Unlock this stat';

    let html = `
        <div class="${cardClass}" data-stat="${unlockableKey}">
            <div class="stat-card-header">
                <span class="stat-card-title">${config.displayName}</span>
                <div class="stat-card-value-row">
                    <span id="unlockable-value-${unlockableKey}" class="${valueClass}">
                        ${formatValue(currentValue, config.isPercentage)}
                    </span>
                    <button
                        class="stat-lock-toggle"
                        onclick="event.stopPropagation(); toggleUnlockableStat('${unlockableKey}')"
                        title="${lockTitle}"
                        aria-label="${lockTitle}"
                    >
                        ${lockIcon}
                    </button>
                </div>
            </div>
    `;

    if (isUnlocked) {
        html += `
            <div class="stat-slider-section">
                <div class="stat-slider-header">
                    <span class="stat-slider-label">Level</span>
                    <span id="unlockable-level-display-${unlockableKey}" class="stat-slider-value">${currentLevel}</span>
                </div>
                <input
                    type="range"
                    id="unlockable-slider-${unlockableKey}"
                    class="stat-range-slider"
                    min="0"
                    max="${config.maxLevel}"
                    value="${currentLevel}"
                    oninput="updateUnlockableStatLevelPreview('${unlockableKey}')"
                    onchange="updateUnlockableStatLevel('${unlockableKey}')"
                    aria-label="${config.displayName} level"
                >
            </div>
        `;
    }

    html += '</div>';
    return html;
}

function renderSpecialStatsContent() {
    const configs = getUnlockableStatConfigs();
    const configKeys = Object.keys(configs);

    const column1 = configKeys.slice(0, 4);
    const column2 = configKeys.slice(4, 8);
    const column3 = configKeys.slice(8);

    let html = '<div class="unlockable-stats-grid">';

    [column1, column2, column3].forEach(column => {
        html += '<div style="display: flex; flex-direction: column; gap: var(--sb-space-md);">';
        column.forEach(key => {
            html += renderUnlockableStatCard(key, configs[key]);
        });
        html += '</div>';
    });

    html += '</div>';
    return html;
}

// ============================================================================
// RENDER FUNCTIONS - Guild Bonuses
// ============================================================================

function renderGuildBonusCard(guildKey, config) {
    const bonusData = getGuildBonus(guildKey);
    const isUnlocked = bonusData.unlocked;
    const currentLevel = bonusData.level || 0;

    let currentValue;
    if (config.customValues) {
        currentValue = isUnlocked && currentLevel > 0 ? (config.customValues[currentLevel - 1] || 0) : 0;
    } else {
        currentValue = config.base + (currentLevel * config.increment);
    }

    const cardClass = isUnlocked ? 'stat-card guild-card unlocked' : 'stat-card guild-card locked';
    const valueClass = isUnlocked ? 'stat-card-value unlocked' : 'stat-card-value locked';
    const lockIcon = isUnlocked ? ICONS.unlock : ICONS.lock;
    const lockTitle = isUnlocked ? 'Lock this bonus' : 'Unlock this bonus';

    let html = `
        <div class="${cardClass}" data-stat="${guildKey}">
            <div class="stat-card-header">
                <span class="stat-card-title">${config.displayName}</span>
                <div class="stat-card-value-row">
                    <span id="guild-value-${guildKey}" class="${valueClass}">
                        ${formatValue(currentValue, config.isPercentage)}
                    </span>
                    <button
                        class="stat-lock-toggle"
                        onclick="event.stopPropagation(); toggleGuildBonus('${guildKey}')"
                        title="${lockTitle}"
                        aria-label="${lockTitle}"
                    >
                        ${lockIcon}
                    </button>
                </div>
            </div>
    `;

    if (isUnlocked) {
        html += `
            <div class="stat-slider-section">
                <div class="stat-slider-header">
                    <span class="stat-slider-label">Rank</span>
                    <span id="guild-rank-display-${guildKey}" class="stat-slider-value">${currentLevel}</span>
                </div>
                <input
                    type="range"
                    id="guild-slider-${guildKey}"
                    class="stat-range-slider"
                    min="0"
                    max="${config.maxLevel}"
                    value="${currentLevel}"
                    oninput="updateGuildBonusRankPreview('${guildKey}')"
                    onchange="updateGuildBonusRank('${guildKey}')"
                    aria-label="${config.displayName} rank"
                >
            </div>
        `;
    }

    html += '</div>';
    return html;
}

function renderGuildBonusesContent() {
    const configs = getGuildBonusConfigs();
    const configKeys = Object.keys(configs);

    let html = '<div class="guild-bonuses-grid">';
    configKeys.forEach(key => {
        html += renderGuildBonusCard(key, configs[key]);
    });
    html += '</div>';

    return html;
}

// ============================================================================
// RENDER FUNCTIONS - Level Stats
// ============================================================================

function renderLevelStatsContent() {
    return `
        <div class="breakdown-empty" style="background: var(--sb-surface-tertiary); border: 1px solid var(--sb-border-medium); border-radius: 10px;">
            <div style="font-size: 2rem; margin-bottom: var(--sb-space-sm);">🚧</div>
            Level stats coming soon...
        </div>
    `;
}

// ============================================================================
// TAB SYSTEM
// ============================================================================

function createTabsStructure() {
    return `
        <div class="stat-breakdown-tabs">
            <button class="stat-tab-button active" data-tab="special-stats" onclick="switchExtraStatsTab('special-stats')">
                Special Stats
            </button>
            <button class="stat-tab-button" data-tab="guild-bonuses" onclick="switchExtraStatsTab('guild-bonuses')">
                Guild Bonuses
            </button>
            <button class="stat-tab-button" data-tab="level-stats" onclick="switchExtraStatsTab('level-stats')">
                Level Stats
            </button>
        </div>
        <div class="stat-tab-content active" id="special-stats-content">
            ${renderSpecialStatsContent()}
        </div>
        <div class="stat-tab-content" id="guild-bonuses-content">
            ${renderGuildBonusesContent()}
        </div>
        <div class="stat-tab-content" id="level-stats-content">
            ${renderLevelStatsContent()}
        </div>
    `;
}

// ============================================================================
// STAT BREAKDOWN GRID
// ============================================================================

function renderStatSection(statKey, statDef, inputValue, displayValue, contributions, weaponAttackBonus) {
    const totalContributed = contributions.reduce((sum, c) => sum + c.value, 0);
    const unaccounted = displayValue - totalContributed;

    let html = `
        <div class="breakdown-card" data-stat="${statKey}">
            <div class="breakdown-header">
                <span class="breakdown-title">${statDef.displayName}</span>
                <span class="breakdown-total">${formatValue(inputValue, statDef.isPercentage)}</span>
            </div>
    `;

    if (statDef.needsDivision && weaponAttackBonus > 1) {
        html += `
            <div class="breakdown-weapon-note">
                ÷${weaponAttackBonus.toFixed(3)} (${((weaponAttackBonus - 1) * 100).toFixed(1)}% bonus) = <strong>${formatValue(displayValue, false)}</strong> base
            </div>
        `;
    }

    if (contributions.length > 0 || unaccounted > 0.01) {
        html += '<div class="contribution-list">';

        contributions.forEach(contribution => {
            const type = contribution.type;
            html += `
                <div class="contribution-item" data-type="${type}">
                    <span class="contribution-name">${contribution.name}</span>
                    <span class="contribution-value">+${formatValue(contribution.value, statDef.isPercentage)}</span>
                </div>
            `;
        });

        if (unaccounted > 0.01) {
            html += `
                <div class="contribution-item" data-type="unaccounted">
                    <span class="contribution-name">Unaccounted</span>
                    <span class="contribution-value">${formatValue(unaccounted, statDef.isPercentage)}</span>
                </div>
            `;
        }

        html += '</div>';
    } else {
        html += `<div class="breakdown-empty">No contributions</div>`;
    }

    html += '</div>';
    return html;
}

// ============================================================================
// UPDATE FUNCTIONS
// ============================================================================

export function updateStatBreakdown() {
    const container = document.getElementById('stat-breakdown-content');
    if (!container) return;

    const contributedStats = getContributedStats();
    const {
        base = {},
        equipment = {},
        Companion = {},
        CompanionInventory = {},
        InnerAbility = {},
        MainStat = {},
        scrolling = {},
        cubePotential = {},
        UnlockableStats = {},
        GuildBonuses = {}
    } = contributedStats;

    const tabsExist = document.querySelector('.stat-tab-button');
    const gridExists = document.getElementById('stat-breakdown-grid');

    if (!tabsExist || !gridExists) {
        // Full render
        let html = '<div class="stat-breakdown-wrapper">' + createTabsStructure();

        const statData = [];

        Object.entries(STAT_DEFINITIONS).forEach(([statKey, statDef]) => {
            const inputValue = getInputValue(statDef.inputId);
            if (inputValue === null) return;

            let displayValue = inputValue;
            let weaponAttackBonus = 1;

            if (statDef.needsDivision) {
                const bonus = getWeaponAttackBonus();
                weaponAttackBonus = (bonus.totalAttack / 100) + 1;
                displayValue = inputValue / weaponAttackBonus;
            }

            const contributions = gatherContributions(
                statKey, statDef, base, equipment, Companion, CompanionInventory,
                InnerAbility, MainStat, scrolling, cubePotential, UnlockableStats, GuildBonuses,
                displayValue
            );

            statData.push({ statKey, statDef, inputValue, displayValue, contributions, weaponAttackBonus });
        });

        if (statData.length === 0) {
            html += '<div class="breakdown-empty">No stat data available</div>';
        } else {
            html += '<div id="stat-breakdown-grid" class="stat-breakdown-grid">';
            statData.forEach(({ statKey, statDef, inputValue, displayValue, contributions, weaponAttackBonus }) => {
                html += renderStatSection(statKey, statDef, inputValue, displayValue, contributions, weaponAttackBonus);
            });
            html += '</div>';
        }

        html += '</div>';
        container.innerHTML = html;
    } else {
        updateActiveTabContent();
        updateBreakdownGrid();
    }
}

function updateActiveTabContent() {
    const activeButton = document.querySelector('.stat-tab-button.active');
    if (!activeButton) return;

    const tabName = activeButton.getAttribute('data-tab');
    const contentContainer = document.getElementById(`${tabName}-content`);
    if (!contentContainer) return;

    let newContent = '';
    switch (tabName) {
        case 'special-stats':
            newContent = renderSpecialStatsContent();
            break;
        case 'guild-bonuses':
            newContent = renderGuildBonusesContent();
            break;
        case 'level-stats':
            newContent = renderLevelStatsContent();
            break;
    }

    contentContainer.innerHTML = newContent;
}

function updateBreakdownGrid() {
    const grid = document.getElementById('stat-breakdown-grid');
    if (!grid) return;

    const contributedStats = getContributedStats();
    const {
        base = {},
        equipment = {},
        Companion = {},
        CompanionInventory = {},
        InnerAbility = {},
        MainStat = {},
        scrolling = {},
        cubePotential = {},
        UnlockableStats = {},
        GuildBonuses = {}
    } = contributedStats;

    const statData = [];

    Object.entries(STAT_DEFINITIONS).forEach(([statKey, statDef]) => {
        const inputValue = getInputValue(statDef.inputId);
        if (inputValue === null) return;

        let displayValue = inputValue;
        let weaponAttackBonus = 1;

        if (statDef.needsDivision) {
            const bonus = getWeaponAttackBonus();
            weaponAttackBonus = (bonus.totalAttack / 100) + 1;
            displayValue = inputValue / weaponAttackBonus;
        }

        const contributions = gatherContributions(
            statKey, statDef, base, equipment, Companion, CompanionInventory,
            InnerAbility, MainStat, scrolling, cubePotential, UnlockableStats, GuildBonuses,
            displayValue
        );

        statData.push({ statKey, statDef, inputValue, displayValue, contributions, weaponAttackBonus });
    });

    if (statData.length === 0) {
        grid.innerHTML = '<div class="breakdown-empty">No stat data available</div>';
        return;
    }

    let html = '';
    statData.forEach(({ statKey, statDef, inputValue, displayValue, contributions, weaponAttackBonus }) => {
        html += renderStatSection(statKey, statDef, inputValue, displayValue, contributions, weaponAttackBonus);
    });

    grid.innerHTML = html;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function getInputValue(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return null;
    return parseFloat(input.value) || 0;
}

function gatherContributions(statKey, statDef, baseStats, equipmentStats, companionStats, companionInventoryStats, innerAbilityStats, mainStatStats, scrollingStats, cubePotentialStats, unlockableStats, guildBonuses, targetValue) {
    const contributions = [];

    const baseValue = baseStats[statKey];
    if (baseValue && baseValue > 0) {
        contributions.push({ type: 'base', name: 'Base', value: baseValue });
    }

    const unlockableValue = unlockableStats[statKey];
    if (unlockableValue && unlockableValue > 0) {
        contributions.push({ type: 'unlockable', name: 'Special Stats', value: unlockableValue });
    }

    const guildValue = guildBonuses[statKey];
    if (guildValue && guildValue > 0) {
        contributions.push({ type: 'guild', name: 'Guild Bonuses', value: guildValue });
    }

    Object.entries(equipmentStats).forEach(([slotId, slotStats]) => {
        const value = getEquipmentStatValue(slotStats, statKey, statDef);
        if (value > 0) {
            contributions.push({
                type: 'equipment',
                name: SLOT_DISPLAY_NAMES[slotId] || slotId,
                value: value
            });
        }
    });

    const scrollingValue = scrollingStats[statKey];
    if (scrollingValue && scrollingValue > 0) {
        contributions.push({ type: 'scrolling', name: 'Scrolling', value: scrollingValue });
    }

    const cubeValue = cubePotentialStats[statKey];
    if (cubeValue && cubeValue > 0) {
        contributions.push({ type: 'cube', name: 'Cube Potential', value: cubeValue });
    }

    const companionKeys = statDef.companionKeys || [getCompanionKey(statKey)];
    Object.entries(companionStats).forEach(([companionKey, value]) => {
        if (companionKeys.includes(companionKey) && value > 0) {
            contributions.push({
                type: 'companion',
                name: formatCompanionKey(companionKey, 'equipped'),
                value: value
            });
        }
    });

    Object.entries(companionInventoryStats).forEach(([companionKey, value]) => {
        if (companionKeys.includes(companionKey) && value > 0) {
            contributions.push({
                type: 'companion',
                name: formatCompanionKey(companionKey, 'inventory'),
                value: value
            });
        }
    });

    const innerAbilityValue = innerAbilityStats[statKey];
    if (innerAbilityValue && innerAbilityValue > 0) {
        contributions.push({ type: 'innerAbility', name: 'Inner Ability', value: innerAbilityValue });
    }

    if (statKey === 'attack' && mainStatStats.attack) {
        contributions.push({ type: 'mainStat', name: 'Primary Stat (1:1)', value: mainStatStats.attack });
    }

    return contributions;
}

function getEquipmentStatValue(slotStats, statKey, statDef) {
    const statKeyMap = {
        'attack': 'attack',
        'mainStat': 'mainStat',
        'critRate': 'critRate',
        'critDamage': 'critDamage',
        'statDamage': 'statDamage',
        'damage': 'damage',
        'finalDamage': 'finalDamage',
        'bossDamage': 'bossDamage',
        'normalDamage': 'normalDamage',
        'minDamage': 'minDamage',
        'maxDamage': 'maxDamage',
        'attackSpeed': 'attackSpeed',
        'defPen': 'defPen',
        'damageAmp': 'damageAmp'
    };

    const mappedKey = statKeyMap[statKey];
    if (mappedKey && slotStats[mappedKey]) {
        return slotStats[mappedKey];
    }

    return 0;
}

function getCompanionKey(statKey) {
    const keyMap = {
        'bossDamage': 'AttackPowerToBoss',
        'normalDamage': 'AttackPowerExcludeBoss',
        'minDamage': 'MinDamageRatio',
        'maxDamage': 'MaxDamageRatio',
        'critRate': 'CriticalChance',
        'attackSpeed': 'AttackSpeed',
        'attack': 'Attack',
        'statDamage': 'MainStat'
    };
    return keyMap[statKey] || statKey;
}

function formatCompanionKey(companionKey, source = 'equipped') {
    const sourceLabel = source === 'inventory' ? '(Companions Inventory)' : '(Companions Equipped)';
    const displayNames = {
        'AttackPower': `Damage ${sourceLabel}`,
        'AttackPowerToBoss': `Boss Damage ${sourceLabel}`,
        'AttackPowerExcludeBoss': `Normal Monster Damage ${sourceLabel}`,
        'CriticalChance': `Critical Rate ${sourceLabel}`,
        'AttackSpeed': `Attack Speed ${sourceLabel}`,
        'MinDamageRatio': `Min Damage Multiplier ${sourceLabel}`,
        'MaxDamageRatio': `Max Damage Multiplier ${sourceLabel}`,
        'Attack': `Attack ${sourceLabel}`,
        'MainStat': `Main Stat ${sourceLabel}`
    };
    return displayNames[companionKey] || `${companionKey} ${sourceLabel}`;
}

function formatValue(value, isPercentage) {
    if (isPercentage) {
        return value.toFixed(1).replace(/\.0$/, '') + '%';
    }
    return value.toFixed(0);
}

// ============================================================================
// INITIALIZATION & EVENT HANDLERS
// ============================================================================

export function initializeStatBreakdown() {
    onContributedStatsChange((stats, source) => {
        const statBreakdownTab = document.getElementById('analysis-stat-breakdown');
        if (statBreakdownTab && statBreakdownTab.classList.contains('active')) {
            if (source === 'unlockable-stats' || source === 'guild-bonuses') {
                updateActiveTabContent();
                updateBreakdownGrid();
            } else {
                updateStatBreakdown();
            }
        }
    });

    setTimeout(() => {
        const statBreakdownTab = document.getElementById('analysis-stat-breakdown');
        if (statBreakdownTab && statBreakdownTab.classList.contains('active')) {
            updateStatBreakdown();
        }
    }, 0);
}

window.updateStatBreakdown = updateStatBreakdown;

window.toggleUnlockableStat = function(unlockableKey) {
    const current = getUnlockableStat(unlockableKey);
    updateUnlockableStat(unlockableKey, {
        unlocked: !current.unlocked,
        level: current.level || 0
    });
    updateUnlockableStatsContributions();
    saveToLocalStorage();
    updateActiveTabContent();
    updateBreakdownGrid();
};

window.updateUnlockableStatLevel = function(unlockableKey) {
    const slider = document.getElementById(`unlockable-slider-${unlockableKey}`);
    if (!slider) return;

    const level = parseInt(slider.value) || 0;
    const current = getUnlockableStat(unlockableKey);

    updateUnlockableStat(unlockableKey, {
        unlocked: current.unlocked,
        level: level
    });

    const configs = getUnlockableStatConfigs();
    const config = configs[unlockableKey];
    if (config) {
        const valueSpan = document.getElementById(`unlockable-value-${unlockableKey}`);
        if (valueSpan) {
            const currentValue = config.base + (level * config.increment);
            valueSpan.textContent = formatValue(currentValue, config.isPercentage);
        }
    }

    updateUnlockableStatsContributions();
    saveToLocalStorage();
};

window.updateUnlockableStatLevelPreview = function(unlockableKey) {
    const slider = document.getElementById(`unlockable-slider-${unlockableKey}`);
    const levelDisplay = document.getElementById(`unlockable-level-display-${unlockableKey}`);

    if (!slider || !levelDisplay) return;

    const level = parseInt(slider.value) || 0;
    levelDisplay.textContent = level;

    const configs = getUnlockableStatConfigs();
    const config = configs[unlockableKey];
    if (config) {
        const valueSpan = document.getElementById(`unlockable-value-${unlockableKey}`);
        if (valueSpan) {
            const currentValue = config.base + (level * config.increment);
            valueSpan.textContent = formatValue(currentValue, config.isPercentage);
        }
    }
};

window.switchExtraStatsTab = function(tabName) {
    const tabContents = document.querySelectorAll('.stat-tab-content');
    tabContents.forEach(content => {
        content.classList.remove('active');
    });

    const buttons = document.querySelectorAll('.stat-tab-button');
    buttons.forEach(button => {
        button.classList.remove('active');
    });

    const selectedTab = document.getElementById(`${tabName}-content`);
    if (selectedTab) {
        selectedTab.classList.add('active');
    }

    buttons.forEach(button => {
        if (button.getAttribute('onclick')?.includes(`'${tabName}'`)) {
            button.classList.add('active');
        }
    });
};

window.toggleGuildBonus = function(guildKey) {
    const current = getGuildBonus(guildKey);
    updateGuildBonus(guildKey, {
        unlocked: !current.unlocked,
        level: current.level || 0
    });
    updateGuildBonusesContributions();
    saveToLocalStorage();
    updateActiveTabContent();
    updateBreakdownGrid();
};

window.updateGuildBonusRank = function(guildKey) {
    const slider = document.getElementById(`guild-slider-${guildKey}`);
    if (!slider) return;

    const level = parseInt(slider.value) || 0;
    const current = getGuildBonus(guildKey);

    updateGuildBonus(guildKey, {
        unlocked: current.unlocked,
        level: level
    });

    const configs = getGuildBonusConfigs();
    const config = configs[guildKey];
    if (config) {
        const valueSpan = document.getElementById(`guild-value-${guildKey}`);
        if (valueSpan) {
            let currentValue;
            if (config.customValues) {
                currentValue = level > 0 ? (config.customValues[level - 1] || 0) : 0;
            } else {
                currentValue = config.base + (level * config.increment);
            }
            valueSpan.textContent = formatValue(currentValue, config.isPercentage);
        }
    }

    updateGuildBonusesContributions();
    saveToLocalStorage();
};

window.updateGuildBonusRankPreview = function(guildKey) {
    const slider = document.getElementById(`guild-slider-${guildKey}`);
    const rankDisplay = document.getElementById(`guild-rank-display-${guildKey}`);

    if (!slider || !rankDisplay) return;

    const rank = parseInt(slider.value) || 0;
    rankDisplay.textContent = rank;

    const configs = getGuildBonusConfigs();
    const config = configs[guildKey];
    if (config) {
        const valueSpan = document.getElementById(`guild-value-${guildKey}`);
        if (valueSpan) {
            let currentValue;
            if (config.customValues) {
                currentValue = rank > 0 ? (config.customValues[rank - 1] || 0) : 0;
            } else {
                currentValue = config.base + (rank * config.increment);
            }
            valueSpan.textContent = formatValue(currentValue, config.isPercentage);
        }
    }
};
