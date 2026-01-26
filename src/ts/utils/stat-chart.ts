import { CumulativeStatCalculator, ChartPoint } from '@ts/services/stat-calculation-service';
import { loadoutStore } from '@ts/store/loadout.store.js';
import { Chart, ChartType, ChartData, ChartOptions } from 'chart.js/auto';
import { StatCalculationService } from '@ts/services/stat-calculation-service.js';

// Store chart instances with proper typing
const statWeightCharts: Record<string, Chart> = {};

// Toggle stat weight chart visibility
export function toggleStatChart(statKey: string, statLabel: string, isFlat: boolean = false): void {
    const chartId = `chart-${statKey}`;
    const rowId = `chart-row-${statKey}`;
    const chartRow = document.getElementById(rowId);

    if (!chartRow) return;

    // Toggle visibility
    if (chartRow.style.display === 'none') {
        chartRow.style.display = 'table-row';

        // Create chart if it doesn't exist
        if (!statWeightCharts[chartId]) {
            renderStatChart(statKey, statLabel, isFlat);
        }
    } else {
        chartRow.style.display = 'none';
    }
}

/**
 * Map legacy stat keys to proper STAT enum IDs
 * Converts old chart statKey format to standardized STAT IDs
 */
function mapStatKeyToStatId(statKey: string): string {
    const statKeyMap: Record<string, string> = {
        'attack': 'attack',
        'mainStat': 'mainStat',
        'statDamage': 'mainStatPct',
        'finalDamage': 'finalDamage',
        'attackSpeed': 'attackSpeed',
        'defPenMultiplier': 'defPen',
        'bossDamage': 'bossDamage',
        'normalDamage': 'normalDamage',
    };

    return statKeyMap[statKey] || statKey;
}

// Generate chart data for a stat
export function generateStatChartData(statKey: string, statLabel: string, isFlat: boolean): ChartPoint[] {
    const stats = loadoutStore.getBaseStats();
    const weaponAttackBonus = loadoutStore.getWeaponAttackBonus().totalAttack;
    const monsterType: 'boss' | 'normal' = statKey === 'bossDamage' ? 'boss' :
                       (statKey === 'normalDamage' ? 'normal' : 'boss');

    const calculator = new CumulativeStatCalculator();
    const numPoints = 50;
    const minIncrease = isFlat ? (statKey === 'attack' ? 500 : 100) : 1;
    const maxIncrease = isFlat ? (statKey === 'attack' ? 15000 : 7500) : 75;

    calculator.startSeries(stats, { weaponAttackBonus, monsterType });

    const dataPoints: ChartPoint[] = [];
    let cumulativeIncrease = 0;

    // Map legacy statKey to proper STAT enum ID
    const statId = mapStatKeyToStatId(statKey);

    // For flat stats, use fixed step size for uniform increments
    // For percentage stats, distribute evenly across the range
    const stepIncrease = isFlat
        ? (statKey === 'attack' ? 500 : 100)
        : (maxIncrease - minIncrease) / numPoints;

        let statCalculationService = calculator.statService;

    for (let i = 0; i <= numPoints; i++) {
        cumulativeIncrease += stepIncrease;

        // Stop if we exceed max increase for flat stats
        if (isFlat && cumulativeIncrease > maxIncrease) {
            break;
        }

        // Use new simplified API - no isFlat or currentStep needed
        const result = calculator.nextStep(statId, cumulativeIncrease, statCalculationService);
        statCalculationService = result.statCalculationService;
        dataPoints.push(result.point);
    }

    return dataPoints;
}

// Render stat weight chart
export function renderStatChart(statKey: string, statLabel: string, isFlat: boolean): void {
    const chartId = `chart-${statKey}`;
    const canvas = document.getElementById(chartId) as HTMLCanvasElement | null;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const data = generateStatChartData(statKey, statLabel, isFlat);

    // Destroy existing chart if it exists
    if (statWeightCharts[chartId]) {
        statWeightCharts[chartId].destroy();
    }

    // Get theme colors
    const isDark = document.documentElement.classList.contains('dark');
    const textColor = isDark ? '#e5e7eb' : '#1f2937';
    const gridColor = isDark ? '#374151' : '#d1d5db';

    // Determine the per-unit label based on stat type
    const perUnitLabel = isFlat ? (statKey === 'attack' ? '500' : '100') : '1%';

    // Create new chart
    statWeightCharts[chartId] = new Chart(ctx, {
        type: 'line' as ChartType,
        data: {
            datasets: [{
                label: `${statLabel} → DPS Gain per ${perUnitLabel}`,
                data: data,
                borderColor: '#007aff',
                backgroundColor: 'rgba(0, 122, 255, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.1,
                pointRadius: 0
            }]
        } as ChartData<'line'>,
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
                        label: function(context) {
                            const increase = context.parsed.x.toFixed(2);
                            const gainPerUnit = context.parsed.y.toFixed(2);
                            return `At +${increase}${isFlat ? '' : '%'}: ${gainPerUnit}% DPS per ${perUnitLabel} added`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    type: 'linear',
                    min: isFlat ? (statKey === 'attack' ? 500 : 100) : 1,
                    title: {
                        display: true,
                        text: `Total Increase in ${statLabel}${isFlat ? '' : ' (%)'}`,
                        color: textColor
                    },
                    ticks: {
                        color: textColor
                    },
                    grid: {
                        color: gridColor
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: `DPS Gain (%) per ${perUnitLabel} Added`,
                        color: textColor
                    },
                    ticks: {
                        color: textColor
                    },
                    grid: {
                        color: gridColor
                    }
                }
            }
        } as ChartOptions<'line'>
    });
}

/**
 * Clears all cached stat weight charts from memory
 * Destroys Chart.js instances and removes them from the cache
 * Called when stats change to force regeneration with updated data
 */
export function resetCachedCharts(): void {
    for (const chartId in statWeightCharts) {
        if (statWeightCharts[chartId]) {
            statWeightCharts[chartId].destroy();
            delete statWeightCharts[chartId];
        }
    }
}

// Expose to window for HTML onclick handlers
window.toggleStatChart = toggleStatChart;
window.resetCachedCharts = resetCachedCharts;
