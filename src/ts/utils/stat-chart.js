import { CumulativeStatCalculator } from "@ts/services/stat-calculation-service.js";
import { loadoutStore } from "@ts/store/loadout.store.js";
import { Chart } from "chart.js/auto";
const statWeightCharts = {};
function toggleStatChart(statKey, statLabel, isFlat = false) {
  const chartId = `chart-${statKey}`;
  const rowId = `chart-row-${statKey}`;
  const chartRow = document.getElementById(rowId);
  if (!chartRow) return;
  if (chartRow.style.display === "none") {
    chartRow.style.display = "table-row";
    if (!statWeightCharts[chartId]) {
      renderStatChart(statKey, statLabel, isFlat);
    }
  } else {
    chartRow.style.display = "none";
  }
}
function mapStatKeyToStatId(statKey) {
  const statKeyMap = {
    "attack": "attack",
    "mainStat": "mainStat",
    "statDamage": "mainStatPct",
    "finalDamage": "finalDamage",
    "attackSpeed": "attackSpeed",
    "defPenMultiplier": "defPen",
    "bossDamage": "bossDamage",
    "normalDamage": "normalDamage"
  };
  return statKeyMap[statKey] || statKey;
}
function generateStatChartData(statKey, statLabel, isFlat) {
  const stats = loadoutStore.getBaseStats();
  const weaponAttackBonus = loadoutStore.getWeaponAttackBonus().totalAttack;
  const monsterType = statKey === "bossDamage" ? "boss" : statKey === "normalDamage" ? "normal" : "boss";
  const calculator = new CumulativeStatCalculator();
  const numPoints = 50;
  const minIncrease = isFlat ? statKey === "attack" ? 500 : 100 : 1;
  const maxIncrease = isFlat ? statKey === "attack" ? 15e3 : 7500 : 75;
  calculator.startSeries(stats, { weaponAttackBonus, monsterType });
  const dataPoints = [];
  let cumulativeIncrease = 0;
  const statId = mapStatKeyToStatId(statKey);
  const stepIncrease = isFlat ? statKey === "attack" ? 500 : 100 : (maxIncrease - minIncrease) / numPoints;
  let statCalculationService = calculator.statService;
  for (let i = 0; i <= numPoints; i++) {
    cumulativeIncrease += stepIncrease;
    if (isFlat && cumulativeIncrease > maxIncrease) {
      break;
    }
    const result = calculator.nextStep(statId, cumulativeIncrease, statCalculationService);
    statCalculationService = result.statCalculationService;
    dataPoints.push(result.point);
  }
  return dataPoints;
}
function renderStatChart(statKey, statLabel, isFlat) {
  const chartId = `chart-${statKey}`;
  const canvas = document.getElementById(chartId);
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const data = generateStatChartData(statKey, statLabel, isFlat);
  if (statWeightCharts[chartId]) {
    statWeightCharts[chartId].destroy();
  }
  const isDark = document.documentElement.classList.contains("dark");
  const textColor = isDark ? "#e5e7eb" : "#1f2937";
  const gridColor = isDark ? "#374151" : "#d1d5db";
  const perUnitLabel = isFlat ? statKey === "attack" ? "500" : "100" : "1%";
  statWeightCharts[chartId] = new Chart(ctx, {
    type: "line",
    data: {
      datasets: [{
        label: `${statLabel} \u2192 DPS Gain per ${perUnitLabel}`,
        data,
        borderColor: "#007aff",
        backgroundColor: "rgba(0, 122, 255, 0.1)",
        borderWidth: 2,
        fill: true,
        tension: 0.1,
        pointRadius: 0
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
            label: function(context) {
              const increase = context.parsed.x.toFixed(2);
              const gainPerUnit = context.parsed.y.toFixed(2);
              return `At +${increase}${isFlat ? "" : "%"}: ${gainPerUnit}% DPS per ${perUnitLabel} added`;
            }
          }
        }
      },
      scales: {
        x: {
          type: "linear",
          min: isFlat ? statKey === "attack" ? 500 : 100 : 1,
          title: {
            display: true,
            text: `Total Increase in ${statLabel}${isFlat ? "" : " (%)"}`,
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
    }
  });
}
function resetCachedCharts() {
  for (const chartId in statWeightCharts) {
    if (statWeightCharts[chartId]) {
      statWeightCharts[chartId].destroy();
      delete statWeightCharts[chartId];
    }
  }
}
window.toggleStatChart = toggleStatChart;
window.resetCachedCharts = resetCachedCharts;
export {
  generateStatChartData,
  renderStatChart,
  resetCachedCharts,
  toggleStatChart
};
//# sourceMappingURL=stat-chart.js.map
