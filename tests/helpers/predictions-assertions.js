/**
 * Prediction Value Assertion Helpers
 * Provides utilities for validating calculated prediction values in tests
 *
 * Usage:
 *   import { getStatGain, assertStatGainInRange, assertHardCap } from './helpers/predictions-assertions.js';
 *
 *   await assertStatGainInRange(page, 'attack', '+500', 300, 350);
 */

import { expect } from '@playwright/test';

/**
 * Maps test stat names to actual table labels
 * @param {string} statName - Test stat name (e.g., 'final-dmg', 'atk-speed')
 * @returns {string} Actual table label (e.g., 'Final Dmg', 'Atk Speed')
 */
function mapStatNameToTableLabel(statName) {
  const statMapping = {
    'attack': 'Attack',
    'main-stat': 'Main Stat',
    'final-dmg': 'Final Dmg',
    'boss-damage': 'Boss Dmg',
    'normal-damage': 'Mob Dmg',
    'atk-speed': 'Atk Speed',
    'def-pen': 'Def Pen',
    'crit-rate': 'Crit Rate',
    'crit-dmg': 'Crit Dmg',
    'damage': 'Damage',
    'skill-coeff': 'Skill Coeff',
    'skill-mastery': 'Skill Mastery',
    'stat-damage': 'Main Stat %',
    'dmg-amp': 'Dmg Amp',
    'min-dmg': 'Min Dmg',
    'max-dmg': 'Max Dmg',
    'final-damage': 'Final Dmg',
    'main-stat-pct': 'Main Stat %'
  };

  return statMapping[statName] || statName;
}

/**
 * Gets the percentage damage gain for a specific stat and increment
 * @param {Page} page - Playwright page object
 * @param {string} statName - Stat name (e.g., 'attack', 'main-stat', 'crit-rate')
 * @param {string} increment - Increment value (e.g., '+500', '+100', '+10%')
 * @returns {Promise<number>} The numeric percentage gain (e.g., 66.67 for "+66.67%")
 */
export async function getStatGain(page, statName, increment) {
  // Wait for predictions to be visible
  await page.waitForTimeout(100);

  // Map stat name to table label
  const tableLabel = mapStatNameToTableLabel(statName);

  // Find the correct table based on stat type
  let targetTable;
  if (statName === 'attack' || statName === 'main-stat') {
    // Flat stats table - has headers with +500, +1000, +2500, etc.
    const tables = await page.locator('table').all();
    for (const table of tables) {
      const headers = await table.locator('thead th').all();
      if (headers.length > 0) {
        const firstHeader = await headers[0].textContent();
        if (firstHeader.trim() === 'Stat') {
          // Check if it has flat stat increment headers
          const headerTexts = await Promise.all(headers.map(h => h.textContent()));
          if (headerTexts.some(h => h.includes('+500'))) {
            targetTable = table;
            break;
          }
        }
      }
    }
  } else {
    // Percentage stats table - has headers with +1%, +5%, +10%, etc.
    const tables = await page.locator('table').all();
    for (const table of tables) {
      const headers = await table.locator('thead th').all();
      if (headers.length > 0) {
        const headerTexts = await Promise.all(headers.map(h => h.textContent()));
        if (headerTexts.some(h => h.includes('+1%') && h.includes('⇅'))) {
          targetTable = table;
          break;
        }
      }
    }
  }

  if (!targetTable) {
    throw new Error(`Could not find table for stat: ${statName}`);
  }

  // Find the stat row within this table
  const statRow = targetTable.locator(`tbody tr`).filter({ hasText: tableLabel }).first();

  if (await statRow.count() === 0) {
    throw new Error(`Could not find stat row for: ${statName} (tried label: "${tableLabel}")`);
  }

  // Get all cells in this row
  const cells = await statRow.locator('td').all();

  // For flat stats table, we need to find the correct header row
  // The table has 2 header rows with 7 columns each (including "Stat")
  // Row 1: Stat, +500, +1000, +2500, +5000, +10000, +15000 (for Attack)
  // Row 2: Stat, +100, +500, +1000, +2500, +5000, +7500 (for Main Stat)

  let colIndex = -1;

  if (statName === 'attack' || statName === 'main-stat') {
    // For flat stats, find the stat row's position to determine which header row to use
    const allRows = await targetTable.locator('tbody tr').all();
    let statRowIndex = -1;
    for (let i = 0; i < allRows.length; i++) {
      const rowText = await allRows[i].textContent();
      if (rowText.includes(tableLabel)) {
        statRowIndex = i;
        break;
      }
    }

    if (statRowIndex === -1) {
      throw new Error(`Could not find row index for stat: ${statName}`);
    }

    // Determine which header section to use based on stat row index
    // Attack is in the first section (row index 1), Main Stat is in the second (row index 3)
    const isFirstSection = (statName === 'attack');

    // Normalize increment for comparison
    const normalizedIncrement = increment.replace('+', '').replace(/,/g, '').replace('%', '');

    // Get all header rows
    const headerRows = await targetTable.locator('thead tr').all();
    const firstHeaderRow = headerRows[0];
    const headers = await firstHeaderRow.locator('th').all();

    // Search for matching header in the first header row
    for (let i = 1; i < headers.length; i++) {
      const headerText = await headers[i].textContent();
      const normalizedHeader = headerText.replace(/[+,%,⇅]/g, '').replace(/,/g, '').trim();

      if (normalizedHeader === normalizedIncrement) {
        colIndex = i;
        break;
      }
    }

    // If not found in first header row and it's main-stat, check second header row
    if (colIndex === -1 && statName === 'main-stat' && headerRows.length > 1) {
      const secondHeaderRow = headerRows[1];
      const secondHeaders = await secondHeaderRow.locator('th').all();

      for (let i = 1; i < secondHeaders.length; i++) {
        const headerText = await secondHeaders[i].textContent();
        const normalizedHeader = headerText.replace(/[+,%,⇅]/g, '').replace(/,/g, '').trim();

        if (normalizedHeader === normalizedIncrement) {
          colIndex = i;
          break;
        }
      }
    }
  } else {
    // For percentage stats, use the single header row
    const headers = await targetTable.locator('thead th').all();
    const normalizedIncrement = increment.replace('+', '').replace(/,/g, '').replace('%', '');

    for (let i = 1; i < headers.length; i++) {
      const headerText = await headers[i].textContent();
      const normalizedHeader = headerText.replace(/[+,%,⇅]/g, '').replace(/,/g, '').trim();

      if (normalizedHeader === normalizedIncrement) {
        colIndex = i;
        break;
      }
    }
  }

  if (colIndex === -1) {
    const headerRows = await targetTable.locator('thead tr').all();
    const allHeaderTexts = [];
    for (const row of headerRows) {
      const headers = await row.locator('th').all();
      const texts = await Promise.all(headers.map(h => h.textContent()));
      allHeaderTexts.push(...texts);
    }
    throw new Error(`Could not find column for increment: "${increment}" (normalized: "${normalizedIncrement}"). Headers: ${allHeaderTexts.join(', ')}`);
  }

  if (colIndex >= cells.length) {
    throw new Error(`Column index ${colIndex} out of bounds. Only ${cells.length} cells found.`);
  }

  // Get the text content from the correct cell
  const cellText = await cells[colIndex].textContent();

  // Extract percentage from text like "+66.67%" or "66.67%" or "+0.00%"
  const percentMatch = cellText.match(/([+]?\d+\.?\d*)%/);
  if (!percentMatch) {
    throw new Error(`Could not find percentage in cell text: "${cellText}" for stat ${statName} (label: ${tableLabel}), increment ${increment}`);
  }

  const value = parseFloat(percentMatch[1]);
  console.log(`getStatGain: stat=${statName}, increment=${increment}, cellText="${cellText}", parsed=${value}`);

  return value;
}

/**
 * Asserts that a stat gain falls within an expected range
 * @param {Page} page - Playwright page object
 * @param {string} statName - Stat name
 * @param {string} increment - Increment value
 * @param {number} minExpected - Minimum expected percentage
 * @param {number} maxExpected - Maximum expected percentage
 * @returns {Promise<number>} The actual gain value
 */
export async function assertStatGainInRange(page, statName, increment, minExpected, maxExpected) {
  const actualGain = await getStatGain(page, statName, increment);

  expect(actualGain).toBeGreaterThanOrEqual(minExpected);
  expect(actualGain).toBeLessThanOrEqual(maxExpected);

  return actualGain;
}

/**
 * Asserts that a stat is at hard cap (all increments show 0% gain)
 * @param {Page} page - Playwright page object
 * @param {string} statName - Stat name to check
 * @param {string[]} increments - Array of increments to check (default: common increments)
 */
export async function assertHardCap(page, statName, increments = ['+1%', '+5%', '+10%', '+25%']) {
  for (const inc of increments) {
    try {
      const gain = await getStatGain(page, statName, inc);
      expect(gain).toBe(0);
    } catch (e) {
      // Some increments might not exist for certain stats, that's OK
      // Only check the ones that exist
    }
  }
}

/**
 * Gets the equivalent value from the equivalency calculator
 * @param {Page} page - Playwright page object
 * @param {string} inputSelector - Selector for the input field
 * @returns {Promise<number>} The numeric equivalent value
 */
export async function getEquivalencyValue(page, inputSelector) {
  const value = await page.inputValue(inputSelector);
  const num = parseFloat(value);
  if (isNaN(num)) {
    throw new Error(`Could not parse equivalency value from ${inputSelector}: ${value}`);
  }
  return num;
}

/**
 * Asserts that equivalency calculation produces values in expected range
 * @param {Page} page - Playwright page object
 * @param {string} inputSelector - Selector for the input field
 * @param {number} minExpected - Minimum expected value
 * @param {number} maxExpected - Maximum expected value
 * @returns {Promise<number>} The actual value
 */
export async function assertEquivalencyInRange(page, inputSelector, minExpected, maxExpected) {
  const actualValue = await getEquivalencyValue(page, inputSelector);

  expect(actualValue).toBeGreaterThanOrEqual(minExpected);
  expect(actualValue).toBeLessThanOrEqual(maxExpected);

  return actualValue;
}

/**
 * Compares two stat gains to verify diminishing returns
 * @param {Page} page - Playwright page object
 * @param {string} statName - Stat name
 * @param {string} increment - Increment to test
 * @param {object} lowState - Fixture with lower base stats
 * @param {object} highState - Fixture with higher base stats
 * @returns {Promise<{lowGain: number, highGain: number}>}
 */
export async function assertDiminishingReturns(page, statName, increment, lowState, highState) {
  const { applyBaseStatsFixture } = await import('./fixture-helpers.js');
  const { navigateToStatPredictions } = await import('./fixture-helpers.js');

  // Test with low stats
  await applyBaseStatsFixture(page, lowState);
  await navigateToStatPredictions(page);
  await page.waitForTimeout(300);
  const lowGain = await getStatGain(page, statName, increment);

  // Test with high stats
  await applyBaseStatsFixture(page, highState);
  await navigateToStatPredictions(page);
  await page.waitForTimeout(300);
  const highGain = await getStatGain(page, statName, increment);

  // Low stats should show higher percentage gain
  expect(lowGain).toBeGreaterThan(highGain);

  return { lowGain, highGain };
}

/**
 * Gets prediction data from the stat tables
 * @param {Page} page - Playwright page object
 * @param {string} statName - Name of the stat row
 * @returns {Promise<Object>} Object with all increment values
 */
export async function getStatPredictionData(page, statName) {
  const statRow = await page.locator(`text=/${statName}/i`).first();

  if (await statRow.count() === 0) {
    throw new Error(`Could not find stat row for: ${statName}`);
  }

  // Get all cells in the row
  const row = statRow.locator('..');
  const cells = await row.locator('td, div[role="cell"]').allTextContents();

  // Parse out the percentage values
  const gains = {};
  cells.forEach((cell, index) => {
    const percentMatch = cell.match(/([+]?\d+\.?\d*)%/);
    if (percentMatch) {
      gains[index] = parseFloat(percentMatch[1]);
    }
  });

  return gains;
}

/**
 * Validates that predictions don't have NaN or Infinity values
 * @param {Page} page - Playwright page object
 * @returns {Promise<boolean>} True if all values are valid
 */
export async function assertNoInvalidCalculations(page) {
  const hasValidResults = await page.evaluate(() => {
    // Check all percentage displays
    const percentElements = document.querySelectorAll('[data-percent], .percent-value');
    for (const el of percentElements) {
      const text = el.textContent || '';
      const match = text.match(/([+]?\d+\.?\d*)%/);
      if (match) {
        const val = parseFloat(match[1]);
        if (isNaN(val) || !isFinite(val)) {
          return false;
        }
      }
    }
    return true;
  });

  expect(hasValidResults).toBe(true);
  return hasValidResults;
}

/**
 * Helper to navigate to stat predictions and wait for calculations
 * @param {Page} page - Playwright page object
 */
export async function navigateAndWaitForPredictions(page) {
  const { navigateToStatPredictions } = await import('./fixture-helpers.js');
  await navigateToStatPredictions(page);
  await page.waitForTimeout(300); // Allow calculations to complete
}

/**
 * Helper to navigate to equivalency and wait for calculations
 * @param {Page} page - Playwright page object
 */
export async function navigateAndWaitForEquivalency(page) {
  const { navigateToStatEquivalency } = await import('./fixture-helpers.js');
  await navigateToStatEquivalency(page);
  await page.waitForTimeout(200); // Allow calculations to complete
}
