import { slotNames, rankingsPerPage } from '../cube-potential-data.js';
import { calculateDamage } from '../calculations.js';
import { getSelectedClass, getStats } from '../main.js';
import { lineExistsInRarity, potentialStatToDamageStat } from '../core/cube-logic.js';

// Note: These variables are imported from cube-potential.js when this module is used
// cubeSlotData, currentCubeSlot, currentPotentialType, rankingsCache, rankingsInProgress
// These are passed in or accessed via the parent module

// Global state for summary sorting
let summarySortColumn = 'regular'; // 'regular' or 'bonus'
let summarySortDescending = true;

// Display rankings with pagination
let currentRankingsPage = 1;

export function displayRankings(rankings, rarity) {
    const resultsDiv = document.getElementById('cube-rankings-results');
    if (!resultsDiv) return;

    const totalPages = Math.ceil(rankings.length / rankingsPerPage);
    const startIdx = (currentRankingsPage - 1) * rankingsPerPage;
    const endIdx = Math.min(startIdx + rankingsPerPage, rankings.length);
    const pageRankings = rankings.slice(startIdx, endIdx);

    let html = `
        <div style="margin-bottom: 20px;">
            <h3 style="color: var(--accent-primary); margin-bottom: 10px;">
                Top Potential Combinations for ${rarity.charAt(0).toUpperCase() + rarity.slice(1)} Rarity
            </h3>
            <p style="color: var(--text-secondary); font-size: 0.9em;">
                Showing ${startIdx + 1}-${endIdx} of ${rankings.length} unique combinations
            </p>
        </div>
        <table class="stat-weight-table">
            <thead>
                <tr>
                    <th>Rank</th>
                    <th style="text-align: center;">Line 1</th>
                    <th style="text-align: center;">Line 2</th>
                    <th style="text-align: center;">Line 3</th>
                    <th>DPS Gain</th>
                </tr>
            </thead>
            <tbody>
    `;

    pageRankings.forEach((combo, idx) => {
        const rank = startIdx + idx + 1;
        const formatLine = (line) => {
            const primeTag = line.prime ? ' <span style="color: var(--accent-primary); font-weight: 600;">(Prime)</span>' : '';
            // Check if stat is percentage-based or flat
            const isPercentStat = line.stat.includes('%');
            const valueSuffix = isPercentStat ? '%' : '';
            return `${line.stat}: ${line.value}${valueSuffix}${primeTag}`;
        };

        html += `
            <tr>
                <td style="font-weight: 700; color: var(--accent-primary);">#${rank}</td>
                <td style="text-align: center;">${formatLine(combo.line1)}</td>
                <td style="text-align: center;">${formatLine(combo.line2)}</td>
                <td style="text-align: center;">${formatLine(combo.line3)}</td>
                <td><span class="gain-positive">+${combo.dpsGain.toFixed(2)}%</span></td>
            </tr>
        `;
    });

    html += `
            </tbody>
        </table>
        <div style="display: flex; justify-content: center; align-items: center; gap: 10px; margin-top: 20px;">
            <button onclick="changeRankingsPage(${currentRankingsPage - 1})"
                    ${currentRankingsPage === 1 ? 'disabled' : ''}
                    class="btn-primary">Previous</button>
            <span style="color: var(--text-secondary);">Page ${currentRankingsPage} of ${totalPages}</span>
            <button onclick="changeRankingsPage(${currentRankingsPage + 1})"
                    ${currentRankingsPage === totalPages ? 'disabled' : ''}
                    class="btn-primary">Next</button>
        </div>
    `;

    resultsDiv.innerHTML = html;
}

export function changeRankingsPage(newPage) {
    const slotId = currentCubeSlot;
    const rarity = cubeSlotData[currentCubeSlot][currentPotentialType].rarity;
    const rankings = rankingsCache[slotId]?.[rarity];
    if (!rankings) return;

    const totalPages = Math.ceil(rankings.length / rankingsPerPage);
    if (newPage < 1 || newPage > totalPages) return;

    currentRankingsPage = newPage;
    displayRankings(rankings, rarity);
}

// Format slot details for display
export function formatSlotDetails(slots) {
    return slots.map((slot) => {
        const linesHTML = slot.lines && slot.lines.length > 0
            ? slot.lines.map((line, i) => {
                if (!line) return '';
                const isPercentStat = line.stat.includes('%');
                const valueSuffix = isPercentStat ? '%' : '';
                const primeTag = line.prime ? ' <span style="color: var(--accent-primary); font-weight: 600;">(P)</span>' : '';
                return `L${i+1}: ${line.stat} ${line.value}${valueSuffix}${primeTag}`;
            }).join('<br>')
            : 'No lines';

        return `
            <div style="background: rgba(255, 255, 255, 0.5); border-radius: 8px; padding: 10px; font-size: 0.85em;">
                <div style="font-weight: 700; color: var(--accent-primary); margin-bottom: 5px;">
                    ${slot.name} [${slot.rarity.toUpperCase()}]
                </div>
                <div style="color: var(--text-secondary); line-height: 1.5; margin-bottom: 5px;">
                    ${linesHTML}
                </div>
                <div style="color: var(--accent-success); font-weight: 600;">
                    DPS Gain: +${slot.dpsGain.toFixed(2)}%
                </div>
            </div>
        `;
    }).join('');
}

// Create distribution chart
export function createSimulationDistributionChart(canvasId, gains, label) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) {
        setTimeout(() => createSimulationDistributionChart(canvasId, gains, label), 50);
        return;
    }

    // Create histogram
    const sorted = [...gains].sort((a, b) => a - b);
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const bucketCount = 30;
    const bucketSize = (max - min) / bucketCount;

    const buckets = new Array(bucketCount).fill(0);
    const bucketLabels = [];

    for (let i = 0; i < bucketCount; i++) {
        const bucketStart = min + (i * bucketSize);
        bucketLabels.push(bucketStart.toFixed(2));
    }

    sorted.forEach(gain => {
        const bucketIndex = Math.min(
            Math.floor((gain - min) / bucketSize),
            bucketCount - 1
        );
        buckets[bucketIndex]++;
    });

    // Get theme colors
    const isDark = document.documentElement.classList.contains('dark');
    const textColor = isDark ? '#e5e7eb' : '#1f2937';
    const gridColor = isDark ? 'rgba(55, 65, 81, 0.5)' : 'rgba(209, 213, 219, 0.5)';

    new Chart(canvas, {
        type: 'bar',
        data: {
            labels: bucketLabels,
            datasets: [{
                label: 'Simulations',
                data: buckets,
                backgroundColor: 'rgba(59, 130, 246, 0.6)',
                borderColor: 'rgba(59, 130, 246, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            aspectRatio: 2.5,
            plugins: {
                legend: { display: false },
                title: {
                    display: true,
                    text: `${label} - DPS Gain Distribution`,
                    color: textColor,
                    font: { size: 14, weight: 'bold' }
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
                            return `${count} simulations (${percentage}%)`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    display: false,
                    grid: { display: false }
                },
                y: {
                    ticks: {
                        color: textColor,
                        font: { size: 10 }
                    },
                    grid: { color: gridColor }
                }
            }
        }
    });
}

// Display simulation results
export function displaySimulationResults(results, cubeBudget, simulationCount) {
    const resultsDiv = document.getElementById('cube-simulation-results');
    if (!resultsDiv) return;

    // Find best strategy
    let bestStrategy = Object.keys(results)[0];
    let bestAvg = results[bestStrategy].avgGain;

    Object.keys(results).forEach(strategy => {
        if (results[strategy].avgGain > bestAvg) {
            bestStrategy = strategy;
            bestAvg = results[strategy].avgGain;
        }
    });

    const formatStrategy = (strategyKey, name, data, isBest) => {
        const gains = [...data.totalGains].sort((a, b) => a - b);
        const min = gains[0];
        const max = gains[gains.length - 1];
        const median = gains[Math.floor(gains.length / 2)];
        const p25 = gains[Math.floor(gains.length * 0.25)];
        const p75 = gains[Math.floor(gains.length * 0.75)];

        // Find simulations for each percentile
        const minSimIdx = data.simulations.findIndex(s => s.totalGain === min);
        const p25SimIdx = data.simulations.findIndex(s => Math.abs(s.totalGain - p25) < 0.01);
        const medianSimIdx = data.simulations.findIndex(s => Math.abs(s.totalGain - median) < 0.01);
        const p75SimIdx = data.simulations.findIndex(s => Math.abs(s.totalGain - p75) < 0.01);
        const maxSimIdx = data.simulations.findIndex(s => s.totalGain === max);

        const detailsId = `sim-details-${strategyKey}`;
        const chartCanvasId = `sim-chart-${strategyKey}`;

        return `
            <details style="background: linear-gradient(135deg, ${isBest ? 'rgba(52, 199, 89, 0.1), rgba(0, 122, 255, 0.05)' : 'rgba(59, 130, 246, 0.1), rgba(147, 51, 234, 0.05)'}); border: 2px solid ${isBest ? 'var(--accent-success)' : 'rgba(59, 130, 246, 0.3)'}; border-radius: 12px; margin-bottom: 12px; transition: all 0.3s;">
                <summary style="cursor: pointer; padding: 16px 20px; user-select: none; list-style: none; display: flex; align-items: center; justify-content: space-between; gap: 15px;">
                    <div style="display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0;">
                        <span style="color: ${isBest ? 'var(--accent-success)' : 'var(--accent-primary)'}; font-size: 1.05em; font-weight: 700;">
                            ${isBest ? '⭐ ' : ''}${name}
                        </span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 20px; font-size: 0.95em; flex-shrink: 0;">
                        <div style="text-align: right;">
                            <span style="color: var(--text-secondary); font-size: 0.85em;">Avg:</span>
                            <span style="color: ${isBest ? 'var(--accent-success)' : 'var(--accent-primary)'}; font-weight: 700; margin-left: 6px;">+${data.avgGain.toFixed(2)}%</span>
                        </div>
                        <div style="text-align: right;">
                            <span style="color: var(--text-secondary); font-size: 0.85em;">Range:</span>
                            <span style="color: var(--text-primary); font-weight: 600; margin-left: 6px;">+${min.toFixed(2)}% - +${max.toFixed(2)}%</span>
                        </div>
                    </div>
                </summary>

                <div style="padding: 0 20px 20px 20px; border-top: 1px solid rgba(0, 0, 0, 0.1); margin-top: -5px; padding-top: 20px;">
                    <!-- Stats Grid -->
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin-bottom: 15px;">
                        <div style="text-align: center; padding: 12px; background: rgba(255, 255, 255, 0.5); border-radius: 8px;">
                            <div style="font-size: 0.85em; color: var(--text-secondary); margin-bottom: 4px;">Average Gain</div>
                            <div style="font-size: 1.5em; font-weight: 700; color: var(--accent-primary);">+${data.avgGain.toFixed(2)}%</div>
                        </div>
                        <div style="text-align: center; padding: 12px; background: rgba(255, 255, 255, 0.5); border-radius: 8px;">
                            <div style="font-size: 0.85em; color: var(--text-secondary); margin-bottom: 4px;">Median</div>
                            <div style="font-size: 1.3em; font-weight: 700; color: var(--text-primary);">+${median.toFixed(2)}%</div>
                        </div>
                        <div style="text-align: center; padding: 12px; background: rgba(255, 255, 255, 0.5); border-radius: 8px;">
                            <div style="font-size: 0.85em; color: var(--text-secondary); margin-bottom: 4px;">Min / Max</div>
                            <div style="font-size: 1.1em; font-weight: 600; color: var(--text-primary);">+${min.toFixed(2)}% / +${max.toFixed(2)}%</div>
                        </div>
                        <div style="text-align: center; padding: 12px; background: rgba(255, 255, 255, 0.5); border-radius: 8px;">
                            <div style="font-size: 0.85em; color: var(--text-secondary); margin-bottom: 4px;">P25 / P75</div>
                            <div style="font-size: 1.1em; font-weight: 600; color: var(--text-primary);">+${p25.toFixed(2)}% / +${p75.toFixed(2)}%</div>
                        </div>
                    </div>

                    <!-- Detailed Results Dropdown -->
                    <details style="background: rgba(0, 0, 0, 0.05); border-radius: 8px; padding: 10px; margin-top: 10px;">
                        <summary style="cursor: pointer; font-weight: 600; color: var(--accent-primary); user-select: none; font-size: 0.95em;">
                            View Detailed Results (Slot Stats & Distribution)
                        </summary>
                        <div id="${detailsId}" style="margin-top: 15px;">
                        <!-- Sub-tabs -->
                        <div style="display: flex; gap: 10px; margin-bottom: 15px; border-bottom: 2px solid rgba(0, 0, 0, 0.1); padding-bottom: 0;">
                            <button class="sim-detail-tab active" data-strategy="${strategyKey}" data-tab="distribution" onclick="switchSimDetailTab('${strategyKey}', 'distribution')" style="padding: 8px 16px; background: none; border: none; border-bottom: 3px solid transparent; cursor: pointer; font-weight: 600; color: var(--text-primary); transition: all 0.3s;">Distribution</button>
                            <button class="sim-detail-tab" data-strategy="${strategyKey}" data-tab="min" onclick="switchSimDetailTab('${strategyKey}', 'min')" style="padding: 8px 16px; background: none; border: none; border-bottom: 3px solid transparent; cursor: pointer; font-weight: 600; color: var(--text-primary); transition: all 0.3s;">Min (+${min.toFixed(2)}%)</button>
                            <button class="sim-detail-tab" data-strategy="${strategyKey}" data-tab="p25" onclick="switchSimDetailTab('${strategyKey}', 'p25')" style="padding: 8px 16px; background: none; border: none; border-bottom: 3px solid transparent; cursor: pointer; font-weight: 600; color: var(--text-primary); transition: all 0.3s;">P25 (+${p25.toFixed(2)}%)</button>
                            <button class="sim-detail-tab" data-strategy="${strategyKey}" data-tab="median" onclick="switchSimDetailTab('${strategyKey}', 'median')" style="padding: 8px 16px; background: none; border: none; border-bottom: 3px solid transparent; cursor: pointer; font-weight: 600; color: var(--text-primary); transition: all 0.3s;">Median (+${median.toFixed(2)}%)</button>
                            <button class="sim-detail-tab" data-strategy="${strategyKey}" data-tab="p75" onclick="switchSimDetailTab('${strategyKey}', 'p75')" style="padding: 8px 16px; background: none; border: none; border-bottom: 3px solid transparent; cursor: pointer; font-weight: 600; color: var(--text-primary); transition: all 0.3s;">P75 (+${p75.toFixed(2)}%)</button>
                            <button class="sim-detail-tab" data-strategy="${strategyKey}" data-tab="max" onclick="switchSimDetailTab('${strategyKey}', 'max')" style="padding: 8px 16px; background: none; border: none; border-bottom: 3px solid transparent; cursor: pointer; font-weight: 600; color: var(--text-primary); transition: all 0.3s;">Max (+${max.toFixed(2)}%)</button>
                        </div>

                        <!-- Distribution Tab -->
                        <div class="sim-detail-content" data-strategy="${strategyKey}" data-tab="distribution" style="display: block;">
                            <canvas id="${chartCanvasId}" style="max-height: 300px;"></canvas>
                        </div>

                        <!-- Min Tab -->
                        <div class="sim-detail-content" data-strategy="${strategyKey}" data-tab="min" style="display: none;">
                            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px;">
                                ${minSimIdx >= 0 ? formatSlotDetails(data.simulations[minSimIdx].slots) : 'No data'}
                            </div>
                        </div>

                        <!-- P25 Tab -->
                        <div class="sim-detail-content" data-strategy="${strategyKey}" data-tab="p25" style="display: none;">
                            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px;">
                                ${p25SimIdx >= 0 ? formatSlotDetails(data.simulations[p25SimIdx].slots) : 'No data'}
                            </div>
                        </div>

                        <!-- Median Tab -->
                        <div class="sim-detail-content" data-strategy="${strategyKey}" data-tab="median" style="display: none;">
                            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px;">
                                ${medianSimIdx >= 0 ? formatSlotDetails(data.simulations[medianSimIdx].slots) : 'No data'}
                            </div>
                        </div>

                        <!-- P75 Tab -->
                        <div class="sim-detail-content" data-strategy="${strategyKey}" data-tab="p75" style="display: none;">
                            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px;">
                                ${p75SimIdx >= 0 ? formatSlotDetails(data.simulations[p75SimIdx].slots) : 'No data'}
                            </div>
                        </div>

                        <!-- Max Tab -->
                        <div class="sim-detail-content" data-strategy="${strategyKey}" data-tab="max" style="display: none;">
                            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px;">
                                ${maxSimIdx >= 0 ? formatSlotDetails(data.simulations[maxSimIdx].slots) : 'No data'}
                            </div>
                        </div>
                        </div>
                    </details>
                </div>
            </details>
        `;
    };

    // Strategy names and descriptions
    const strategyInfo = {
        worstFirst: { name: 'Worst First', desc: 'Always upgrades the slot currently providing the least DPS gain with a single cube at a time.' },
        balancedThreshold: { name: 'Balanced Threshold', desc: 'Keeps all slots within a certain DPS gain range of each other, preventing over-investment in terrible slots.' },
        hybridFastRarity: { name: 'Hybrid: Fast Rarity + Worst First', desc: 'First rushes all slots to Epic rarity, then switches to Worst First strategy for remaining cubes.' },
        rarityWeightedWorstFirst: { name: 'Rarity-Weighted Worst First', desc: 'Like Worst First but factors in how close a slot is to its next rarity upgrade, prioritizing slots near upgrade thresholds.' }
    };

    // Sort strategies by average gain (best first)
    const sortedStrategies = Object.keys(results).sort((a, b) => results[b].avgGain - results[a].avgGain);

    resultsDiv.innerHTML = `
        <div style="margin-bottom: 20px;">
            <h3 style="color: var(--accent-primary); margin-bottom: 10px; font-size: 1.2em; font-weight: 600;">
                Simulation Results
            </h3>
            <p style="color: var(--text-secondary); font-size: 0.9em;">
                Cube Budget: ${cubeBudget} | Simulations: ${simulationCount}
            </p>
        </div>

        ${sortedStrategies.map(strategyKey => {
            const info = strategyInfo[strategyKey];
            return formatStrategy(strategyKey, info.name, results[strategyKey], strategyKey === bestStrategy);
        }).join('')}

        <div style="background: linear-gradient(135deg, rgba(138, 43, 226, 0.1), rgba(75, 0, 130, 0.05)); border: 2px solid rgba(138, 43, 226, 0.3); border-radius: 12px; padding: 20px; margin-top: 20px;">
            <h4 style="color: var(--accent-primary); margin-bottom: 10px;">Strategy Descriptions</h4>
            <div style="color: var(--text-secondary); font-size: 0.9em; line-height: 1.6;">
                ${Object.keys(strategyInfo).map(key => `
                    <p style="margin-top: 8px;"><strong>${strategyInfo[key].name}:</strong> ${strategyInfo[key].desc}</p>
                `).join('')}
            </div>
        </div>
    `;

    // Create charts after DOM is updated
    setTimeout(() => {
        sortedStrategies.forEach(strategyKey => {
            const info = strategyInfo[strategyKey];
            createSimulationDistributionChart(`sim-chart-${strategyKey}`, results[strategyKey].totalGains, info.name);
        });
    }, 100);
}

// Switch between detail tabs
export function switchSimDetailTab(strategy, tab) {
    // Update tab buttons
    document.querySelectorAll(`.sim-detail-tab[data-strategy="${strategy}"]`).forEach(btn => {
        if (btn.dataset.tab === tab) {
            btn.classList.add('active');
            btn.style.borderBottomColor = 'var(--accent-primary)';
        } else {
            btn.classList.remove('active');
            btn.style.borderBottomColor = 'transparent';
        }
    });

    // Update content visibility
    document.querySelectorAll(`.sim-detail-content[data-strategy="${strategy}"]`).forEach(content => {
        content.style.display = content.dataset.tab === tab ? 'block' : 'none';
    });
}

// Sort summary table by column
export function sortSummaryBy(column) {
    if (summarySortColumn === column) {
        // Same column - toggle direction
        summarySortDescending = !summarySortDescending;
    } else {
        // Different column - set new column and default to descending
        summarySortColumn = column;
        summarySortDescending = true;
    }
    displayAllSlotsSummary();
}

// Display summary of all slots
export function displayAllSlotsSummary() {
    const resultsDiv = document.getElementById('cube-summary-results');
    if (!resultsDiv) return;

    if (!getSelectedClass()) {
        resultsDiv.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">Please select a class to view summary.</p>';
        return;
    }

    const baseStats = getStats('base');
    const baseDPS = calculateDamage(baseStats, 'boss').dps;

    // Calculate DPS gain for each slot + potential type
    const summaryData = [];

    slotNames.forEach(slot => {
        // Regular Potential
        const regularData = cubeSlotData[slot.id].regular;
        const regularStats = { ...baseStats };
        let regularAccumulatedMainStatPct = 0;
        for (let lineNum = 1; lineNum <= 3; lineNum++) {
            const line = regularData.setA[`line${lineNum}`];
            if (!line || !line.stat) continue;

            // Only apply line if it exists in the current rarity for this slot
            if (!lineExistsInRarity(slot.id, regularData.rarity, lineNum, line.stat, line.value, line.prime)) continue;

            const mapped = potentialStatToDamageStat(line.stat, line.value, regularAccumulatedMainStatPct);
            if (mapped.stat) {
                regularStats[mapped.stat] = (regularStats[mapped.stat] || 0) + mapped.value;
                if (mapped.isMainStatPct) {
                    regularAccumulatedMainStatPct += line.value;
                }
            }
        }
        const regularDPS = calculateDamage(regularStats, 'boss').dps;
        const regularGain = ((regularDPS - baseDPS) / baseDPS * 100);

        // Bonus Potential
        const bonusData = cubeSlotData[slot.id].bonus;
        const bonusStats = { ...baseStats };
        let bonusAccumulatedMainStatPct = 0;
        for (let lineNum = 1; lineNum <= 3; lineNum++) {
            const line = bonusData.setA[`line${lineNum}`];
            if (!line || !line.stat) continue;

            // Only apply line if it exists in the current rarity for this slot
            if (!lineExistsInRarity(slot.id, bonusData.rarity, lineNum, line.stat, line.value, line.prime)) continue;

            const mapped = potentialStatToDamageStat(line.stat, line.value, bonusAccumulatedMainStatPct);
            if (mapped.stat) {
                bonusStats[mapped.stat] = (bonusStats[mapped.stat] || 0) + mapped.value;
                if (mapped.isMainStatPct) {
                    bonusAccumulatedMainStatPct += line.value;
                }
            }
        }
        const bonusDPS = calculateDamage(bonusStats, 'boss').dps;
        const bonusGain = ((bonusDPS - baseDPS) / baseDPS * 100);

        summaryData.push({
            slotId: slot.id,
            slotName: slot.name,
            regularGain,
            regularRarity: regularData.rarity,
            bonusGain,
            bonusRarity: bonusData.rarity
        });
    });

    // Sort by selected column
    if (summarySortColumn === 'regular') {
        summaryData.sort((a, b) => summarySortDescending ? b.regularGain - a.regularGain : a.regularGain - b.regularGain);
    } else {
        summaryData.sort((a, b) => summarySortDescending ? b.bonusGain - a.bonusGain : a.bonusGain - b.bonusGain);
    }

    // Build HTML table with sortable headers
    const regularSortIndicator = summarySortColumn === 'regular' ? (summarySortDescending ? ' ▼' : ' ▲') : '';
    const bonusSortIndicator = summarySortColumn === 'bonus' ? (summarySortDescending ? ' ▼' : ' ▲') : '';

    let html = `
        <table class="stat-weight-table">
            <thead>
                <tr>
                    <th style="text-align: center;">Slot</th>
                    <th style="text-align: center; cursor: pointer; user-select: none;" onclick="sortSummaryBy('regular')">
                        Regular Potential${regularSortIndicator}<br>
                        <span style="font-size: 0.8em; font-weight: 400;">(Set A Gain)</span>
                    </th>
                    <th style="text-align: center; cursor: pointer; user-select: none;" onclick="sortSummaryBy('bonus')">
                        Bonus Potential${bonusSortIndicator}<br>
                        <span style="font-size: 0.8em; font-weight: 400;">(Set A Gain)</span>
                    </th>
                </tr>
            </thead>
            <tbody>
    `;

    summaryData.forEach((data) => {
        // Get percentile for regular and bonus
        const regularPercentile = getPercentileForGain(data.slotId, data.regularRarity, data.regularGain);
        const bonusPercentile = getPercentileForGain(data.slotId, data.bonusRarity, data.bonusGain);

        html += `
            <tr>
                <td style="font-weight: 600; text-align: center;">${data.slotName}</td>
                <td style="text-align: center;">
                    <div style="color: ${data.regularGain >= 0 ? '#4ade80' : '#f87171'}; font-weight: 600; margin-bottom: 4px;">
                        ${data.regularGain >= 0 ? '+' : ''}${data.regularGain.toFixed(2)}%
                    </div>
                    <div style="font-size: 0.8em; color: var(--text-secondary);">
                        ${data.regularRarity.charAt(0).toUpperCase() + data.regularRarity.slice(1)}
                        ${regularPercentile}
                    </div>
                </td>
                <td style="text-align: center;">
                    <div style="color: ${data.bonusGain >= 0 ? '#4ade80' : '#f87171'}; font-weight: 600; margin-bottom: 4px;">
                        ${data.bonusGain >= 0 ? '+' : ''}${data.bonusGain.toFixed(2)}%
                    </div>
                    <div style="font-size: 0.8em; color: var(--text-secondary);">
                        ${data.bonusRarity.charAt(0).toUpperCase() + data.bonusRarity.slice(1)}
                        ${bonusPercentile}
                    </div>
                </td>
            </tr>
        `;
    });

    html += `
            </tbody>
        </table>
    `;

    // Calculate total DPS gain from all current potential lines
    const totalStats = { ...baseStats };
    let totalAccumulatedMainStatPct = 0;

    // Add all regular potential stats
    slotNames.forEach(slot => {
        const regularData = cubeSlotData[slot.id].regular;
        for (let lineNum = 1; lineNum <= 3; lineNum++) {
            const line = regularData.setA[`line${lineNum}`];
            if (!line || !line.stat) continue;
            if (!lineExistsInRarity(slot.id, regularData.rarity, lineNum, line.stat, line.value, line.prime)) continue;

            const mapped = potentialStatToDamageStat(line.stat, line.value, totalAccumulatedMainStatPct);
            if (mapped.stat) {
                totalStats[mapped.stat] = (totalStats[mapped.stat] || 0) + mapped.value;
                if (mapped.isMainStatPct) {
                    totalAccumulatedMainStatPct += line.value;
                }
            }
        }

        // Add all bonus potential stats
        const bonusData = cubeSlotData[slot.id].bonus;
        for (let lineNum = 1; lineNum <= 3; lineNum++) {
            const line = bonusData.setA[`line${lineNum}`];
            if (!line || !line.stat) continue;
            if (!lineExistsInRarity(slot.id, bonusData.rarity, lineNum, line.stat, line.value, line.prime)) continue;

            const mapped = potentialStatToDamageStat(line.stat, line.value, totalAccumulatedMainStatPct);
            if (mapped.stat) {
                totalStats[mapped.stat] = (totalStats[mapped.stat] || 0) + mapped.value;
                if (mapped.isMainStatPct) {
                    totalAccumulatedMainStatPct += line.value;
                }
            }
        }
    });

    const totalDPS = calculateDamage(totalStats, 'boss').dps;
    const totalGain = ((totalDPS - baseDPS) / baseDPS * 100);

    html += `
        <div style="background: linear-gradient(135deg, rgba(0, 122, 255, 0.1), rgba(88, 86, 214, 0.05)); border: 2px solid rgba(0, 122, 255, 0.3); border-radius: 12px; padding: 20px; margin-top: 20px;">
            <h4 style="color: var(--accent-primary); margin-bottom: 15px; font-size: 1.1em; font-weight: 600;">
                Total Potential DPS Gain
            </h4>
            <div style="text-align: center; padding: 20px; background: rgba(255, 255, 255, 0.5); border-radius: 8px;">
                <div style="font-size: 0.9em; color: var(--text-secondary); margin-bottom: 8px;">
                    Combined DPS gain from all Regular & Bonus Potential lines
                </div>
                <div style="font-size: 2.5em; font-weight: 700; color: ${totalGain >= 0 ? 'var(--accent-success)' : '#f87171'};">
                    ${totalGain >= 0 ? '+' : ''}${totalGain.toFixed(2)}%
                </div>
                <div style="margin-top: 15px; font-size: 0.85em; color: var(--text-secondary); line-height: 1.6;">
                    This represents the total DPS increase from all current potential lines across all equipment slots,
                    calculated from your base stats (without any potential lines applied).
                </div>
            </div>
        </div>
    `;

    resultsDiv.innerHTML = html;
}
