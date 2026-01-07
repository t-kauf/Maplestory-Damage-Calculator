// Cube Potential Calculator
// Allows comparing potential lines and ranking all possible combinations

import { slotNames, classMainStatMap, slotSpecificPotentials, rankingsPerPage, RARITY_UPGRADE_RATES, equipmentPotentialData } from './cube-potential-data.js';
import { rarities } from './constants.js';
import { calculateDamage, calculateMainStatPercentGain } from './calculations.js';
import { getSelectedClass, getStats } from './main.js';
import {
    getRarityColor,
    getMainStatForClass,
    lineExistsInRarity,
    potentialStatToDamageStat,
    calculateSetDPSGain,
    saveCubePotentialData as saveCubeData,
    loadCubePotentialData as loadCubeData,
    getPercentileForGain as getPercentileForGainLogic
} from './src/core/cube-logic.js';

// Global state
let currentCubeSlot = 'helm';
let currentPotentialType = 'regular'; // 'regular' or 'bonus'
let cubeSlotData = {}; // Stores data for all slots
let rankingsCache = {}; // Cache rankings by slot and rarity: rankingsCache[slotId][rarity]
let rankingsInProgress = {}; // Track which slot+rarity combinations are currently calculating

// Initialize cube potential system
export function initializeCubePotential() {
    // Initialize all slots with default data (both regular and bonus potential)
    slotNames.forEach(slot => {
        cubeSlotData[slot.id] = {
            regular: {
                rarity: 'normal',
                setA: {
                    line1: { stat: '', value: 0 },
                    line2: { stat: '', value: 0 },
                    line3: { stat: '', value: 0 }
                },
                setB: {
                    line1: { stat: '', value: 0 },
                    line2: { stat: '', value: 0 },
                    line3: { stat: '', value: 0 }
                }
            },
            bonus: {
                rarity: 'normal',
                setA: {
                    line1: { stat: '', value: 0 },
                    line2: { stat: '', value: 0 },
                    line3: { stat: '', value: 0 }
                },
                setB: {
                    line1: { stat: '', value: 0 },
                    line2: { stat: '', value: 0 },
                    line3: { stat: '', value: 0 }
                }
            }
        };
    });

    // Load saved data from localStorage
    loadCubePotentialData();

    // Set up slot selector (colors are applied during setup)
    setupCubeSlotSelector();

    // Set up tab switching
    setupCubeTabs();

    // Populate dropdowns for current slot
    updateCubePotentialUI();

    // Check if class is selected and show warning if not
    updateClassWarning();
}

// Switch between regular and bonus potential
export function switchPotentialType(type) {
    currentPotentialType = type;

    // Update button states
    document.getElementById('cube-regular-potential-btn').classList.toggle('active', type === 'regular');
    document.getElementById('cube-bonus-potential-btn').classList.toggle('active', type === 'bonus');

    // Update UI for current potential type
    updateCubePotentialUI();

    // Update rarity selector
    const raritySelector = document.getElementById('cube-rarity-selector');
    if (raritySelector) {
        raritySelector.value = cubeSlotData[currentCubeSlot][currentPotentialType].rarity;
    }

    // Update slot button colors based on current potential type
    updateSlotButtonColors();

    // If comparison tab is visible, recalculate
    const comparisonContent = document.getElementById('cube-comparison-content');
    if (comparisonContent && comparisonContent.style.display !== 'none') {
        calculateComparison();
    }

    // If rankings tab is visible, update rankings
    const rankingsContent = document.getElementById('cube-rankings-content');
    if (rankingsContent && rankingsContent.style.display !== 'none') {
        currentRankingsPage = 1;
        displayOrCalculateRankings();
    }
}

// Setup slot selector
export function setupCubeSlotSelector() {
    const slotSelector = document.getElementById('cube-slot-selector');
    if (!slotSelector) return;

    slotSelector.innerHTML = '';

    slotNames.forEach(slot => {
        const slotBtn = document.createElement('button');
        slotBtn.className = 'cube-slot-btn';
        slotBtn.textContent = slot.name;
        slotBtn.dataset.slot = slot.id;

        // Apply rarity color to border (based on current potential type)
        const slotRarity = cubeSlotData[slot.id]?.[currentPotentialType]?.rarity || 'normal';
        const rarityColor = getRarityColor(slotRarity);
        slotBtn.style.borderColor = rarityColor;

        // Apply active state and enhanced glow
        const isActive = slot.id === currentCubeSlot;
        if (isActive) {
            slotBtn.classList.add('active');
            slotBtn.style.boxShadow = `0 4px 16px ${rarityColor}60, 0 0 0 2px ${rarityColor}`;
        } else {
            slotBtn.style.boxShadow = `0 2px 8px ${rarityColor}40`;
        }

        slotBtn.addEventListener('click', () => selectCubeSlot(slot.id));
        slotSelector.appendChild(slotBtn);
    });

    // Setup rarity selector (separate from slot selector now)
    setupRaritySelector();
}

// Update slot button colors (call this when rarity changes)
export function updateSlotButtonColors() {
    slotNames.forEach(slot => {
        const slotBtn = document.querySelector(`.cube-slot-btn[data-slot="${slot.id}"]`);
        if (!slotBtn) return;

        const slotRarity = cubeSlotData[slot.id]?.[currentPotentialType]?.rarity || 'normal';
        const rarityColor = getRarityColor(slotRarity);
        slotBtn.style.borderColor = rarityColor;

        // Apply enhanced glow for active slot, normal glow for others
        const isActive = slot.id === currentCubeSlot;
        if (isActive) {
            slotBtn.style.boxShadow = `0 4px 16px ${rarityColor}60, 0 0 0 2px ${rarityColor}`;
        } else {
            slotBtn.style.boxShadow = `0 2px 8px ${rarityColor}40`;
        }
    });
}

// Setup rarity selector for current slot
export function setupRaritySelector() {
    const raritySelector = document.getElementById('cube-rarity-selector');
    if (!raritySelector) return;

    // Clear existing options
    raritySelector.innerHTML = '';

    const rarities = ['normal', 'rare', 'epic', 'unique', 'legendary', 'mystic'];
    rarities.forEach(rarity => {
        const option = document.createElement('option');
        option.value = rarity;
        option.textContent = rarity.charAt(0).toUpperCase() + rarity.slice(1);
        raritySelector.appendChild(option);
    });

    raritySelector.value = cubeSlotData[currentCubeSlot][currentPotentialType].rarity;
    raritySelector.onchange = (e) => {
        cubeSlotData[currentCubeSlot][currentPotentialType].rarity = e.target.value;
        updateSlotButtonColors(); // Update slot button border colors
        updateCubePotentialUI(); // This will clear invalid lines
        saveCubePotentialData(); // Save after clearing invalid lines

        // If rankings tab is visible, update rankings display
        const rankingsContent = document.getElementById('cube-rankings-content');
        if (rankingsContent && rankingsContent.style.display !== 'none') {
            currentRankingsPage = 1; // Reset to page 1 when rarity changes
            displayOrCalculateRankings();
        }

        // If comparison tab is visible, recalculate comparison (which will trigger rankings load if needed)
        const comparisonContent = document.getElementById('cube-comparison-content');
        if (comparisonContent && comparisonContent.style.display !== 'none') {
            calculateComparison();
        }
    };
}

// Select a cube slot
export function selectCubeSlot(slotId) {
    currentCubeSlot = slotId;

    // Update active state on buttons
    document.querySelectorAll('.cube-slot-btn').forEach(btn => {
        const isActive = btn.dataset.slot === slotId;
        btn.classList.toggle('active', isActive);

        // Enhance glow for active slot
        if (isActive) {
            const slotRarity = cubeSlotData[slotId]?.[currentPotentialType]?.rarity || 'normal';
            const rarityColor = getRarityColor(slotRarity);
            btn.style.boxShadow = `0 4px 16px ${rarityColor}60, 0 0 0 2px ${rarityColor}`;
        } else {
            const slotRarity = cubeSlotData[btn.dataset.slot]?.[currentPotentialType]?.rarity || 'normal';
            const rarityColor = getRarityColor(slotRarity);
            btn.style.boxShadow = `0 2px 8px ${rarityColor}40`;
        }
    });

    // Update rarity selector
    const raritySelector = document.getElementById('cube-rarity-selector');
    if (raritySelector) {
        raritySelector.value = cubeSlotData[currentCubeSlot][currentPotentialType].rarity;
    }

    // Update UI for this slot
    updateCubePotentialUI();

    // If rankings tab is visible, update rankings display
    const rankingsContent = document.getElementById('cube-rankings-content');
    if (rankingsContent && rankingsContent.style.display !== 'none') {
        currentRankingsPage = 1; // Reset to page 1 when switching slots
        displayOrCalculateRankings();
    }

    // If comparison tab is visible, recalculate comparison (which will trigger rankings load if needed)
    const comparisonContent = document.getElementById('cube-comparison-content');
    if (comparisonContent && comparisonContent.style.display !== 'none') {
        calculateComparison();
    }
}

// Setup tab switching
export function setupCubeTabs() {
    // Main tabs
    const mainSummaryTab = document.getElementById('cube-main-tab-summary');
    const mainSelectedTab = document.getElementById('cube-main-tab-selected');
    const mainSimulationTab = document.getElementById('cube-main-tab-simulation');
    const mainSummaryContent = document.getElementById('cube-main-summary-content');
    const mainSelectedContent = document.getElementById('cube-main-selected-content');
    const mainSimulationContent = document.getElementById('cube-main-simulation-content');

    // Sub-tabs within Selected Slot
    const comparisonTab = document.getElementById('cube-tab-comparison');
    const rankingsTab = document.getElementById('cube-tab-rankings');
    const comparisonContent = document.getElementById('cube-comparison-content');
    const rankingsContent = document.getElementById('cube-rankings-content');

    // Setup main tab switching
    if (mainSummaryTab && mainSelectedTab && mainSimulationTab && mainSummaryContent && mainSelectedContent && mainSimulationContent) {
        mainSummaryTab.addEventListener('click', () => {
            mainSummaryTab.classList.add('active');
            mainSelectedTab.classList.remove('active');
            mainSimulationTab.classList.remove('active');
            mainSummaryContent.style.display = 'block';
            mainSelectedContent.style.display = 'none';
            mainSimulationContent.style.display = 'none';

            // Display summary and start loading any missing rankings
            displayAllSlotsSummary();
            loadAllRankingsForSummary();
        });

        mainSelectedTab.addEventListener('click', () => {
            mainSelectedTab.classList.add('active');
            mainSummaryTab.classList.remove('active');
            mainSimulationTab.classList.remove('active');
            mainSelectedContent.style.display = 'block';
            mainSummaryContent.style.display = 'none';
            mainSimulationContent.style.display = 'none';
        });

        mainSimulationTab.addEventListener('click', () => {
            mainSimulationTab.classList.add('active');
            mainSummaryTab.classList.remove('active');
            mainSelectedTab.classList.remove('active');
            mainSimulationContent.style.display = 'block';
            mainSummaryContent.style.display = 'none';
            mainSelectedContent.style.display = 'none';
        });
    }

    // Setup sub-tab switching within Selected Slot
    if (comparisonTab && rankingsTab && comparisonContent && rankingsContent) {
        comparisonTab.addEventListener('click', () => {
            comparisonTab.classList.add('active');
            rankingsTab.classList.remove('active');
            comparisonContent.style.display = 'block';
            rankingsContent.style.display = 'none';
        });

        rankingsTab.addEventListener('click', () => {
            rankingsTab.classList.add('active');
            comparisonTab.classList.remove('active');
            rankingsContent.style.display = 'block';
            comparisonContent.style.display = 'none';

            // Check if rankings are ready, if not show them (with loading if needed)
            displayOrCalculateRankings();
        });
    }
}

// Update UI for current slot
export function updateCubePotentialUI() {
    const slotData = cubeSlotData[currentCubeSlot][currentPotentialType];
    const rarity = slotData.rarity;

    // Update dropdowns for Set A
    updatePotentialLineDropdowns('setA', rarity);

    // Update dropdowns for Set B
    updatePotentialLineDropdowns('setB', rarity);

    // Restore saved values
    restorePotentialLineValues('setA', slotData.setA);
    restorePotentialLineValues('setB', slotData.setB);

    // Recalculate comparison
    calculateComparison();
}

// Update potential line dropdowns based on rarity
export function updatePotentialLineDropdowns(setName, rarity) {
    const potentialData = equipmentPotentialData[rarity];
    if (!potentialData) return;

    for (let lineNum = 1; lineNum <= 3; lineNum++) {
        const statSelect = document.getElementById(`cube-${setName}-line${lineNum}-stat`);

        if (!statSelect) continue;

        // Clear existing options
        statSelect.innerHTML = '<option value="">-- Select Stat --</option>';

        // Get available stats for this line
        let lineData = [...(potentialData[`line${lineNum}`] || [])];

        // Add slot-specific lines if available (at the top)
        const slotId = currentCubeSlot;
        if (slotSpecificPotentials[slotId] && slotSpecificPotentials[slotId][rarity]) {
            const slotSpecificLines = slotSpecificPotentials[slotId][rarity][`line${lineNum}`];
            if (slotSpecificLines) {
                lineData = [...slotSpecificLines, ...lineData];
            }
        }

        if (!lineData || lineData.length === 0) continue;

        // Build unique stat list with values
        const statOptions = [];
        lineData.forEach(entry => {
            // Check if stat is percentage-based or flat
            const isPercentStat = entry.stat.includes('%');
            const valueSuffix = isPercentStat ? '%' : ''; // Add % only for percentage stats

            const displayText = entry.prime
                ? `${entry.stat} - ${entry.value}${valueSuffix} (Prime)`
                : `${entry.stat} - ${entry.value}${valueSuffix}`;

            statOptions.push({
                key: `${entry.stat}|${entry.value}|${entry.prime}`,
                text: displayText,
                stat: entry.stat,
                value: entry.value,
                prime: entry.prime
            });
        });

        // Add options to dropdown
        statOptions.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt.key;
            option.textContent = opt.text;
            option.dataset.stat = opt.stat;
            option.dataset.value = opt.value;
            option.dataset.prime = opt.prime;
            statSelect.appendChild(option);
        });

        // Add change listener
        statSelect.addEventListener('change', (e) => {
            const selectedOption = e.target.selectedOptions[0];
            if (selectedOption && selectedOption.dataset.value) {
                // Save to slot data
                const [stat, value, prime] = e.target.value.split('|');
                cubeSlotData[currentCubeSlot][currentPotentialType][setName][`line${lineNum}`] = {
                    stat: stat,
                    value: parseFloat(value),
                    prime: prime === 'true'
                };

                saveCubePotentialData();
                calculateComparison();
            } else {
                cubeSlotData[currentCubeSlot][currentPotentialType][setName][`line${lineNum}`] = {
                    stat: '',
                    value: 0,
                    prime: false
                };
                saveCubePotentialData();
                calculateComparison();
            }
        });
    }
}

// Restore saved values to dropdowns
export function restorePotentialLineValues(setName, setData) {
    for (let lineNum = 1; lineNum <= 3; lineNum++) {
        const lineData = setData[`line${lineNum}`];
        const statSelect = document.getElementById(`cube-${setName}-line${lineNum}-stat`);

        if (!statSelect) continue;

        if (!lineData || !lineData.stat) {
            // No saved data - just ensure dropdown is empty
            statSelect.value = '';
            continue;
        }

        // Find matching option
        const key = `${lineData.stat}|${lineData.value}|${lineData.prime}`;
        const option = Array.from(statSelect.options).find(opt => opt.value === key);

        if (option) {
            // Line exists in this rarity - restore it
            statSelect.value = key;
        } else {
            // Line doesn't exist in this rarity - just clear dropdown (don't touch saved data)
            statSelect.value = '';
        }
    }
}

// Get main stat for current class
export function getMainStatForClass() {
    if (!getSelectedClass()) return null;
    return classMainStatMap[getSelectedClass()];
}

// Calculate comparison between Set A and Set B
export function calculateComparison() {
    if (!getSelectedClass()) {
        updateClassWarning();
        return;
    }

    const slotData = cubeSlotData[currentCubeSlot][currentPotentialType];
    const baseStats = getStats('base');

    // Calculate base DPS (no potential lines)
    const baseDPS = calculateDamage(baseStats, 'boss').dps;

    // Calculate Set A stats and DPS (base + Set A lines that exist in current rarity)
    const setAStats = { ...baseStats };
    let setAAccumulatedMainStatPct = 0; // Track accumulated main stat % for diminishing returns
    for (let lineNum = 1; lineNum <= 3; lineNum++) {
        const statSelect = document.getElementById(`cube-setA-line${lineNum}-stat`);
        if (!statSelect || !statSelect.value) continue;

        const line = slotData.setA[`line${lineNum}`];
        if (!line || !line.stat) continue;

        const mapped = potentialStatToDamageStat(line.stat, line.value, setAAccumulatedMainStatPct);
        if (mapped.stat) {
            setAStats[mapped.stat] = (setAStats[mapped.stat] || 0) + mapped.value;
            // Track if this was a main stat % line
            if (mapped.isMainStatPct) {
                setAAccumulatedMainStatPct += line.value;
            }
        }
    }
    const setADPS = calculateDamage(setAStats, 'boss').dps;

    // Calculate Set B stats and DPS (base + Set B lines that exist in current rarity)
    const setBStats = { ...baseStats };
    let setBAccumulatedMainStatPct = 0; // Track accumulated main stat % for diminishing returns
    for (let lineNum = 1; lineNum <= 3; lineNum++) {
        const statSelect = document.getElementById(`cube-setB-line${lineNum}-stat`);
        if (!statSelect || !statSelect.value) continue;

        const line = slotData.setB[`line${lineNum}`];
        if (!line || !line.stat) continue;

        const mapped = potentialStatToDamageStat(line.stat, line.value, setBAccumulatedMainStatPct);
        if (mapped.stat) {
            setBStats[mapped.stat] = (setBStats[mapped.stat] || 0) + mapped.value;
            // Track if this was a main stat % line
            if (mapped.isMainStatPct) {
                setBAccumulatedMainStatPct += line.value;
            }
        }
    }
    const setBDPS = calculateDamage(setBStats, 'boss').dps;

    // Calculate gains (both compared to base stats with no potential)
    const setAGain = ((setADPS - baseDPS) / baseDPS * 100);
    const setBGain = ((setBDPS - baseDPS) / baseDPS * 100);
    const deltaGain = setBGain - setAGain;

    // Display results
    displayComparisonResults(setAGain, setBGain, deltaGain, setAStats, setBStats);

    // Start loading rankings in the background if not already loaded
    const slotId = currentCubeSlot;
    const rarity = cubeSlotData[currentCubeSlot][currentPotentialType].rarity;
    if (!rankingsCache[slotId]?.[rarity]) {
        loadRankingsInBackground(slotId, rarity, setAGain, setBGain);
    }

    // If summary tab is visible, update it
    const summaryContent = document.getElementById('cube-summary-content');
    if (summaryContent && summaryContent.style.display !== 'none') {
        displayAllSlotsSummary();
    }
}

// Display comparison results
export function displayComparisonResults(setAGain, setBGain, deltaGain, setAStats, setBStats) {
    const resultsDiv = document.getElementById('cube-comparison-results');
    if (!resultsDiv) return;

    // Get ranking comparison for Set A and Set B
    const slotId = currentCubeSlot;
    const rarity = cubeSlotData[currentCubeSlot][currentPotentialType].rarity;
    const rankingsReady = rankingsCache[slotId]?.[rarity];

    const setAComparison = rankingsReady ? getRankingComparison(setAGain, rarity) : { percentile: getLoadingPlaceholder(), details: null, chartData: null };
    const setBComparison = rankingsReady ? getRankingComparison(setBGain, rarity) : { percentile: getLoadingPlaceholder(), details: null, chartData: null };

    // Format stats for display
    const formatStats = (stats) => {
        if (!stats) return '';
        return `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 0.85em; text-align: left;">
                <div><strong>Attack:</strong> ${stats.attack.toFixed(2)}</div>
                <div><strong>Crit Rate:</strong> ${stats.critRate.toFixed(2)}%</div>
                <div><strong>Crit Damage:</strong> ${stats.critDamage.toFixed(2)}%</div>
                <div><strong>Stat Damage:</strong> ${stats.statDamage.toFixed(2)}%</div>
                <div><strong>Damage:</strong> ${stats.damage.toFixed(2)}%</div>
                <div><strong>Final Damage:</strong> ${stats.finalDamage.toFixed(2)}%</div>
                <div><strong>Boss Damage:</strong> ${stats.bossDamage.toFixed(2)}%</div>
                <div><strong>Normal Damage:</strong> ${stats.normalDamage.toFixed(2)}%</div>
                <div><strong>Damage Amp:</strong> ${stats.damageAmp.toFixed(2)}%</div>
                <div><strong>Attack Speed:</strong> ${stats.attackSpeed.toFixed(2)}%</div>
                <div><strong>Def Pen:</strong> ${stats.defPen.toFixed(2)}%</div>
                <div><strong>Skill Coeff:</strong> ${stats.skillCoeff.toFixed(2)}%</div>
                <div><strong>Skill Mastery:</strong> ${stats.skillMastery.toFixed(2)}%</div>
                <div><strong>Skill Mastery Boss:</strong> ${stats.skillMasteryBoss.toFixed(2)}%</div>
                <div><strong>Min Damage:</strong> ${stats.minDamage.toFixed(2)}%</div>
                <div><strong>Max Damage:</strong> ${stats.maxDamage.toFixed(2)}%</div>
            </div>
        `;
    };

    resultsDiv.innerHTML = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px;">
            <div style="background: linear-gradient(135deg, rgba(52, 199, 89, 0.1), rgba(0, 122, 255, 0.05)); border: 2px solid var(--accent-success); border-radius: 12px; padding: 20px; box-shadow: 0 4px 16px var(--shadow); text-align: center;">
                <div style="font-size: 0.9em; color: var(--text-secondary); margin-bottom: 8px;">Set A Gain</div>
                <div style="font-size: 1.8em; font-weight: 700; color: ${setAGain >= 0 ? '#4ade80' : '#f87171'};">
                    ${setAGain >= 0 ? '+' : ''}${setAGain.toFixed(2)}%
                </div>
                ${setAComparison.percentile || ''}
                ${setAStats ? `
                    <details style="margin-top: 15px; text-align: left;">
                        <summary style="cursor: pointer; color: var(--accent-primary); font-weight: 600; font-size: 0.9em;">View Stats Used</summary>
                        <div style="margin-top: 10px; padding: 10px; background: rgba(0, 0, 0, 0.1); border-radius: 8px;">
                            ${formatStats(setAStats)}
                        </div>
                    </details>
                ` : ''}
            </div>
            <div style="background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(147, 51, 234, 0.05)); border: 2px solid #3b82f6; border-radius: 12px; padding: 20px; box-shadow: 0 4px 16px var(--shadow); text-align: center;">
                <div style="font-size: 0.9em; color: var(--text-secondary); margin-bottom: 8px;">Set B Gain</div>
                <div style="font-size: 1.8em; font-weight: 700; color: ${setBGain >= 0 ? '#4ade80' : '#f87171'};">
                    ${setBGain >= 0 ? '+' : ''}${setBGain.toFixed(2)}%
                </div>
                ${setBComparison.percentile || ''}
                ${setBStats ? `
                    <details style="margin-top: 15px; text-align: left;">
                        <summary style="cursor: pointer; color: var(--accent-primary); font-weight: 600; font-size: 0.9em;">View Stats Used</summary>
                        <div style="margin-top: 10px; padding: 10px; background: rgba(0, 0, 0, 0.1); border-radius: 8px;">
                            ${formatStats(setBStats)}
                        </div>
                    </details>
                ` : ''}
            </div>
        </div>

        ${setAComparison.details || setBComparison.details ? `
            <div style="margin-top: 20px;">
                <details style="background: linear-gradient(135deg, rgba(0, 122, 255, 0.05), rgba(88, 86, 214, 0.03)); border: 1px solid var(--border-color); border-radius: 12px; padding: 15px; cursor: pointer;">
                    <summary style="font-weight: 600; color: var(--accent-primary); font-size: 1.05em; cursor: pointer; user-select: none;">
                        View Detailed Ranking Comparison
                    </summary>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 15px;">
                        ${setAComparison.details ? `
                            <div>
                                <div style="font-weight: 600; margin-bottom: 10px; color: var(--text-primary);">Set A vs Rankings:</div>
                                ${setAComparison.details}
                            </div>
                        ` : ''}
                        ${setBComparison.details ? `
                            <div>
                                <div style="font-weight: 600; margin-bottom: 10px; color: var(--text-primary);">Set B vs Rankings:</div>
                                ${setBComparison.details}
                            </div>
                        ` : ''}
                    </div>
                </details>
            </div>
        ` : ''}
    `;

    // Create distribution charts after DOM is updated
    if (setAComparison.chartData) {
        createDistributionChart(
            setAComparison.chartData.canvasId,
            setAComparison.chartData.dpsGain,
            setAComparison.chartData.rankings
        );
    }
    if (setBComparison.chartData) {
        createDistributionChart(
            setBComparison.chartData.canvasId,
            setBComparison.chartData.dpsGain,
            setBComparison.chartData.rankings
        );
    }
}

// Get loading placeholder for percentile display
export function getLoadingPlaceholder() {
    return `
        <div style="text-align: center; padding: 12px; background: rgba(0, 122, 255, 0.08); border-radius: 8px; margin-top: 10px;">
            <div style="font-size: 0.85em; color: var(--text-secondary); margin-bottom: 4px;">Calculating Rankings...</div>
            <div style="font-size: 1.2em; font-weight: 600; color: var(--accent-primary);">
                <span style="opacity: 0.6;">Loading</span>
            </div>
        </div>
    `;
}

// Load rankings in background and update comparison when done
export async function loadRankingsInBackground(slotId, rarity) {
    // Calculate rankings
    await calculateRankingsForRarity(rarity, slotId);

    // After rankings are calculated, refresh the comparison display if still on same slot/rarity
    if (slotId === currentCubeSlot && rarity === cubeSlotData[currentCubeSlot][currentPotentialType].rarity) {
        // Recalculate comparison to show the new graphs/percentiles
        calculateComparison();
    }
}

// Create distribution chart showing where user's DPS gain falls
export function createDistributionChart(canvasId, dpsGain, rankings) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) {
        setTimeout(() => createDistributionChart(canvasId, dpsGain, rankings), 50);
        return;
    }

    // Create histogram buckets
    const bucketCount = 20;
    const allGains = rankings.map(r => r.dpsGain);
    const minGain = Math.min(...allGains);
    const maxGain = Math.max(...allGains);
    const bucketSize = (maxGain - minGain) / bucketCount;

    const buckets = new Array(bucketCount).fill(0);
    const bucketLabels = [];

    for (let i = 0; i < bucketCount; i++) {
        const bucketStart = minGain + (i * bucketSize);
        bucketLabels.push(bucketStart.toFixed(2));
    }

    // Count rankings in each bucket
    allGains.forEach(gain => {
        const bucketIndex = Math.min(
            Math.floor((gain - minGain) / bucketSize),
            bucketCount - 1
        );
        buckets[bucketIndex]++;
    });

    // Find which bucket the user's DPS gain falls into
    const userBucketIndex = Math.min(
        Math.floor((dpsGain - minGain) / bucketSize),
        bucketCount - 1
    );

    // Create gradient colors - highlight user's bucket
    const backgroundColors = buckets.map((_, idx) => {
        if (idx === userBucketIndex) {
            return 'rgba(251, 191, 36, 0.6)'; // Gold for user's bucket
        }
        return 'rgba(96, 165, 250, 0.4)'; // Blue for others
    });

    const borderColors = buckets.map((_, idx) => {
        if (idx === userBucketIndex) {
            return 'rgba(251, 191, 36, 1)';
        }
        return 'rgba(96, 165, 250, 0.8)';
    });

    // Create chart with logarithmic scale for better visibility of small values
    new Chart(canvas, {
        type: 'bar',
        data: {
            labels: bucketLabels,
            datasets: [{
                label: 'Combinations',
                data: buckets,
                backgroundColor: backgroundColors,
                borderColor: borderColors,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            aspectRatio: 3,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        title: function(context) {
                            const idx = context[0].dataIndex;
                            const start = parseFloat(bucketLabels[idx]);
                            const end = start + bucketSize;
                            return `${start.toFixed(2)}% - ${end.toFixed(2)}%`;
                        },
                        label: function(context) {
                            const count = buckets[context.dataIndex];
                            const total = buckets.reduce((a, b) => a + b, 0);
                            const percentage = ((count / total) * 100).toFixed(1);
                            return `${count} combinations (${percentage}%)`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    display: false, // Hide x-axis labels for cleaner look
                    grid: {
                        display: false
                    }
                },
                y: {
                    type: 'logarithmic',
                    display: true,
                    ticks: {
                        color: getComputedStyle(document.documentElement).getPropertyValue('--text-primary') || (document.documentElement.classList.contains('dark') ? '#e5e7eb' : '#1f2937'),
                        font: {
                            size: 10
                        },
                        callback: function(value) {
                            // Only show major tick marks (powers of 10)
                            if (value === 1 || value === 10 || value === 100 || value === 1000 || value === 10000) {
                                return value;
                            }
                            return null;
                        }
                    },
                    grid: {
                        color: document.documentElement.classList.contains('dark') ? 'rgba(55, 65, 81, 0.5)' : 'rgba(209, 213, 219, 0.5)'
                    }
                }
            }
        }
    });
}

// Get ranking comparison for a given DPS gain
export function getRankingComparison(dpsGain, rarity) {
    const slotId = currentCubeSlot;
    const rankings = rankingsCache[slotId]?.[rarity];
    if (!rankings || rankings.length === 0) {
        return { percentile: null, details: null, chartData: null };
    }

    const best = rankings[0].dpsGain;

    // Calculate percentile values (rankings are sorted descending)
    const getPercentile = (p) => {
        const index = Math.floor(rankings.length * (1 - p / 100));
        return rankings[Math.min(index, rankings.length - 1)].dpsGain;
    };

    const p99 = getPercentile(99);
    const p95 = getPercentile(95);
    const p90 = getPercentile(90);
    const p80 = getPercentile(80);
    const p70 = getPercentile(70);
    const p60 = getPercentile(60);
    const median = rankings[Math.floor(rankings.length / 2)].dpsGain;

    // Find percentile
    let percentile = 0;
    for (let i = 0; i < rankings.length; i++) {
        if (rankings[i].dpsGain <= dpsGain) {
            percentile = ((i / rankings.length) * 100).toFixed(1);
            break;
        }
    }
    if (percentile === 0 && dpsGain >= best) percentile = 0;
    if (percentile === 0 && dpsGain < rankings[rankings.length - 1].dpsGain) percentile = 100;

    const canvasId = `cube-distribution-chart-${Math.random().toString(36).substr(2, 9)}`;
    const percentileHTML = `
        <div style="text-align: center; padding: 12px; background: rgba(0, 122, 255, 0.08); border-radius: 8px; margin-top: 10px;">
            <div style="font-size: 0.85em; color: var(--text-secondary); margin-bottom: 4px;">Your Percentile</div>
            <div style="font-size: 1.5em; font-weight: 700; color: var(--accent-primary);">Top ${percentile}%</div>
            <div style="margin-top: 12px;">
                <canvas id="${canvasId}" style="max-height: 120px;"></canvas>
            </div>
        </div>
    `;

    const detailsHTML = `
        <div style="font-size: 0.85em; line-height: 1.8; color: var(--text-secondary); padding: 12px; background: rgba(0, 122, 255, 0.03); border-radius: 8px; margin-top: 10px;">
            <div><span style="font-weight: 600;">Best Possible:</span> +${best.toFixed(2)}% <span style="color: ${dpsGain >= best ? '#4ade80' : '#f87171'};">(${((dpsGain / best) * 100).toFixed(1)}%)</span></div>
            <div><span style="font-weight: 600;">P99:</span> +${p99.toFixed(2)}% <span style="color: ${dpsGain >= p99 ? '#4ade80' : '#f87171'};">(${((dpsGain / p99) * 100).toFixed(1)}%)</span></div>
            <div><span style="font-weight: 600;">P95:</span> +${p95.toFixed(2)}% <span style="color: ${dpsGain >= p95 ? '#4ade80' : '#f87171'};">(${((dpsGain / p95) * 100).toFixed(1)}%)</span></div>
            <div><span style="font-weight: 600;">P90:</span> +${p90.toFixed(2)}% <span style="color: ${dpsGain >= p90 ? '#4ade80' : '#f87171'};">(${((dpsGain / p90) * 100).toFixed(1)}%)</span></div>
            <div><span style="font-weight: 600;">P80:</span> +${p80.toFixed(2)}% <span style="color: ${dpsGain >= p80 ? '#4ade80' : '#f87171'};">(${((dpsGain / p80) * 100).toFixed(1)}%)</span></div>
            <div><span style="font-weight: 600;">P70:</span> +${p70.toFixed(2)}% <span style="color: ${dpsGain >= p70 ? '#4ade80' : '#f87171'};">(${((dpsGain / p70) * 100).toFixed(1)}%)</span></div>
            <div><span style="font-weight: 600;">P60:</span> +${p60.toFixed(2)}% <span style="color: ${dpsGain >= p60 ? '#4ade80' : '#f87171'};">(${((dpsGain / p60) * 100).toFixed(1)}%)</span></div>
            <div><span style="font-weight: 600;">Median (P50):</span> +${median.toFixed(2)}% <span style="color: ${dpsGain >= median ? '#4ade80' : '#f87171'};">(${((dpsGain / median) * 100).toFixed(1)}%)</span></div>
        </div>
    `;

    return {
        percentile: percentileHTML,
        details: detailsHTML,
        chartData: {
            canvasId: canvasId,
            dpsGain: dpsGain,
            rankings: rankings
        }
    };
}

// Display rankings or calculate them if not ready
export async function displayOrCalculateRankings() {
    const slotId = currentCubeSlot;
    const rarity = cubeSlotData[currentCubeSlot][currentPotentialType].rarity;
    const key = `${slotId}-${rarity}`;

    // If already calculated, display immediately
    if (rankingsCache[slotId]?.[rarity]) {
        displayRankings(rankingsCache[slotId][rarity], rarity);
        return;
    }

    // If calculation is in progress, show progress bar and wait
    if (rankingsInProgress[key]) {
        const progressBar = document.getElementById('cube-rankings-progress');
        if (progressBar) progressBar.style.display = 'block';

        // Poll until calculation is complete (with timeout after 60 seconds)
        let pollCount = 0;
        const maxPolls = 600; // 60 seconds at 100ms intervals
        const checkInterval = setInterval(() => {
            pollCount++;

            if (rankingsCache[slotId]?.[rarity]) {
                clearInterval(checkInterval);
                displayRankings(rankingsCache[slotId][rarity], rarity);
            } else if (!rankingsInProgress[key]) {
                // Calculation failed or was cancelled, try again
                clearInterval(checkInterval);
                calculateRankings();
            } else if (pollCount >= maxPolls) {
                // Timeout - something went wrong, stop polling
                clearInterval(checkInterval);
                console.error('Rankings calculation timeout');
                if (progressBar) progressBar.style.display = 'none';
            }
        }, 100);
    } else {
        // Not calculated and not in progress, start calculation
        await calculateRankings();
    }
}

// Calculate rankings for current slot's rarity
export async function calculateRankings() {
    const slotId = currentCubeSlot;
    const rarity = cubeSlotData[currentCubeSlot][currentPotentialType].rarity;
    await calculateRankingsForRarity(rarity, slotId);
    displayRankings(rankingsCache[slotId][rarity], rarity);
}

// Calculate rankings for a specific rarity and slot
export async function calculateRankingsForRarity(rarity, slotId = currentCubeSlot) {
    const key = `${slotId}-${rarity}`;
    const isCurrentSlot = slotId === currentCubeSlot;

    try {
        // Initialize slot cache if needed
        if (!rankingsCache[slotId]) {
            rankingsCache[slotId] = {};
        }

        // Check if already calculated for this slot and rarity
        if (rankingsCache[slotId][rarity]) {
            return;
        }

        // Check if already calculating this combination
        if (rankingsInProgress[key]) {
            return; // Already calculating, skip
        }

        // Mark as in progress
        rankingsInProgress[key] = true;

        // Check if class is selected
        if (!getSelectedClass()) {
            updateClassWarning();
            delete rankingsInProgress[key];
            return;
        }

        const progressBar = document.getElementById('cube-rankings-progress');
        const progressFill = document.getElementById('cube-rankings-progress-fill');
        const progressText = document.getElementById('cube-rankings-progress-text');
        const resultsDiv = document.getElementById('cube-rankings-results');

        // Only show progress bar if calculating for the currently visible slot
        
        if (isCurrentSlot) {
            if (progressBar) progressBar.style.display = 'block';
            if (progressFill) progressFill.style.width = '0%';
            if (progressText) progressText.textContent = 'Calculating... 0%';
            if (resultsDiv) resultsDiv.innerHTML = '';
        }

        const potentialData = equipmentPotentialData[rarity];
        if (!potentialData) {
            if (progressBar) progressBar.style.display = 'none';
            delete rankingsInProgress[key];
            return;
        }

        // Get base potential lines
        let line1Options = [...(potentialData.line1 || [])];
        let line2Options = [...(potentialData.line2 || [])];
        let line3Options = [...(potentialData.line3 || [])];

        // Add slot-specific lines if available for current slot
        if (slotSpecificPotentials[slotId] && slotSpecificPotentials[slotId][rarity]) {
            const slotSpecific = slotSpecificPotentials[slotId][rarity];
            if (slotSpecific.line1) {
                line1Options = [...line1Options, ...slotSpecific.line1];
            }
            if (slotSpecific.line2) {
                line2Options = [...line2Options, ...slotSpecific.line2];
            }
            if (slotSpecific.line3) {
                line3Options = [...line3Options, ...slotSpecific.line3];
            }
        }

        const totalCombinations = line1Options.length * line2Options.length * line3Options.length;
        const rankings = [];
        const baseStats = getStats('base');
        const baseDPS = calculateDamage(baseStats, 'boss').dps;

        let processedCount = 0;
        const batchSize = 50; // Smaller batch for more frequent UI updates

        // Process in batches
        for (let i = 0; i < line1Options.length; i++) {
            for (let j = 0; j < line2Options.length; j++) {
                for (let k = 0; k < line3Options.length; k++) {
                    const combo = {
                        line1: line1Options[i],
                        line2: line2Options[j],
                        line3: line3Options[k]
                    };

                    // Calculate stats for this combination
                    const comboStats = { ...baseStats };
                    let accumulatedMainStatPct = 0;

                    [combo.line1, combo.line2, combo.line3].forEach(line => {
                        const mapped = potentialStatToDamageStat(line.stat, line.value, accumulatedMainStatPct);
                        if (mapped.stat) {
                            comboStats[mapped.stat] = (comboStats[mapped.stat] || 0) + mapped.value;
                            if (mapped.isMainStatPct) {
                                accumulatedMainStatPct += line.value;
                            }
                        }
                    });

                    const comboDPS = calculateDamage(comboStats, 'boss').dps;
                    const gain = ((comboDPS - baseDPS) / baseDPS * 100);

                    rankings.push({
                        line1: combo.line1,
                        line2: combo.line2,
                        line3: combo.line3,
                        dpsGain: gain
                    });

                    processedCount++;

                    // Update progress periodically
                    if (processedCount % batchSize === 0) {
                        const progress = (processedCount / totalCombinations * 100);

                        // Check if user is now viewing this slot's rankings
                        const nowCurrentSlot = slotId === currentCubeSlot;
                        const rankingsContent = document.getElementById('cube-rankings-content');
                        const shouldShowProgress = nowCurrentSlot && rankingsContent && rankingsContent.style.display !== 'none';

                        if (shouldShowProgress) {
                            const progressBar = document.getElementById('cube-rankings-progress');
                            const progressFill = document.getElementById('cube-rankings-progress-fill');
                            const progressText = document.getElementById('cube-rankings-progress-text');

                            if (progressBar) progressBar.style.display = 'block';
                            if (progressFill) progressFill.style.width = `${progress}%`;
                            if (progressText) progressText.textContent = `Calculating... ${Math.round(progress)}%`;
                        }

                        // Allow UI to update
                        await new Promise(resolve => setTimeout(resolve, 0));
                    }
                }
            }
        }

        // Sort by DPS gain descending
        rankings.sort((a, b) => b.dpsGain - a.dpsGain);

        // Deduplicate: keep only unique combinations of lines (order doesn't matter)
        const seen = new Set();
        const deduplicatedRankings = [];

        for (const combo of rankings) {
            // Create a signature by sorting the 3 lines alphabetically
            const signature = [combo.line1, combo.line2, combo.line3]
                .map(line => `${line.stat}|${line.value}|${line.prime}`)
                .sort()
                .join('||');

            if (!seen.has(signature)) {
                seen.add(signature);
                deduplicatedRankings.push(combo);
            }
        }

        // Filter out combinations with 0% or negligible DPS gain
        const filteredRankings = deduplicatedRankings.filter(combo => combo.dpsGain > 0.01);

        // Cache the filtered results for this slot and rarity
        rankingsCache[slotId][rarity] = filteredRankings;

        // If this is the current slot and rankings tab is visible, display results
        if (isCurrentSlot) {
            const rankingsContent = document.getElementById('cube-rankings-content');
            if (rankingsContent && rankingsContent.style.display !== 'none') {
                displayRankings(filteredRankings, rarity);
            }

            // Hide progress bar
            if (progressBar) {
                progressBar.style.display = 'none';
            }
        }
    } catch (error) {
        console.error('Error calculating rankings:', error);
        if (isCurrentSlot && progressBar) {
            progressBar.style.display = 'none';
        }
    } finally {
        // Always mark as complete and remove from in-progress tracker
        delete rankingsInProgress[key];
    }
}

// Update class warning banner
export function updateClassWarning() {
    const warningBanner = document.getElementById('cube-class-warning');
    if (!warningBanner) return;

    if (!getSelectedClass()) {
        warningBanner.style.display = 'block';
    } else {
        warningBanner.style.display = 'none';
    }
}

// Clear rankings cache and recalculate if needed (called when base stats change)
export function clearCubeRankingsCache() {
    // Clear all cached rankings
    rankingsCache = {};

    // Also clear in-progress trackers
    rankingsInProgress = {};

    // If comparison tab is visible, recalculate (which will reload rankings)
    const comparisonContent = document.getElementById('cube-comparison-content');
    if (comparisonContent && comparisonContent.style.display !== 'none') {
        calculateComparison();
    }

    // If rankings tab is visible, recalculate rankings
    const rankingsContent = document.getElementById('cube-rankings-content');
    if (rankingsContent && rankingsContent.style.display !== 'none') {
        currentRankingsPage = 1;
        displayOrCalculateRankings();
    }

    // If summary tab is visible, update summary
    const summaryContent = document.getElementById('cube-summary-content');
    if (summaryContent && summaryContent.style.display !== 'none') {
        displayAllSlotsSummary();
    }
}

// Load all rankings needed for summary
export async function loadAllRankingsForSummary() {
    if (!getSelectedClass()) return;

    // Collect all unique slot+rarity combinations that need ranking
    const rankingsToLoad = [];

    slotNames.forEach(slot => {
        // Regular potential
        const regularRarity = cubeSlotData[slot.id].regular.rarity;
        const regularKey = `${slot.id}-${regularRarity}`;
        if (!rankingsCache[slot.id]?.[regularRarity] && !rankingsInProgress[regularKey]) {
            rankingsToLoad.push({ slotId: slot.id, rarity: regularRarity, slotName: slot.name, type: 'Regular' });
        }

        // Bonus potential
        const bonusRarity = cubeSlotData[slot.id].bonus.rarity;
        const bonusKey = `${slot.id}-${bonusRarity}`;
        if (!rankingsCache[slot.id]?.[bonusRarity] && !rankingsInProgress[bonusKey]) {
            rankingsToLoad.push({ slotId: slot.id, rarity: bonusRarity, slotName: slot.name, type: 'Bonus' });
        }
    });

    // If nothing to load, we're done
    if (rankingsToLoad.length === 0) return;

    const progressBar = document.getElementById('cube-summary-progress');
    const progressFill = document.getElementById('cube-summary-progress-fill');
    const progressText = document.getElementById('cube-summary-progress-text');

    // Show progress bar
    if (progressBar) progressBar.style.display = 'block';

    const total = rankingsToLoad.length;

    // Calculate each ranking in sequence (to avoid overwhelming the browser)
    for (let i = 0; i < rankingsToLoad.length; i++) {
        const { slotId, rarity, slotName, type } = rankingsToLoad[i];

        // Update progress text
        if (progressText) {
            progressText.textContent = `Loading rankings for ${slotName} (${type} - ${rarity})... ${i + 1}/${total}`;
        }
        if (progressFill) {
            progressFill.style.width = `${((i / total) * 100)}%`;
        }

        await calculateRankingsForRarity(rarity, slotId);

        // Update summary display after each ranking is calculated
        const summaryContent = document.getElementById('cube-summary-content');
        if (summaryContent && summaryContent.style.display !== 'none') {
            displayAllSlotsSummary();
        }
    }

    // Hide progress bar
    if (progressFill) progressFill.style.width = '100%';
    setTimeout(() => {
        if (progressBar) progressBar.style.display = 'none';
    }, 500);
}

