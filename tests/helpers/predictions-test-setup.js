/**
 * Shared Test Utilities for Predictions Tests
 * Eliminates duplication across test files by providing common setup/teardown functions
 */

import {
  navigateToStatPredictions,
  navigateToStatEquivalency,
  navigateToBaseStats,
  clearStorage
} from './fixture-helpers.js';

/**
 * Standard beforeEach setup for predictions tests
 * Navigates to base stats and clears storage
 * @param {Page} page - Playwright page object
 */
export async function setupPredictionsTest(page) {
  await navigateToBaseStats(page);
  await clearStorage(page);
}

/**
 * Standard beforeEach setup for predictions tests with fixture
 * Applies fixture, navigates to predictions, waits for calculations
 * @param {Page} page - Playwright page object
 * @param {object} fixture - Base stats fixture to apply
 */
export async function setupPredictionsTestWithFixture(page, fixture) {
  await navigateToBaseStats(page);
  await clearStorage(page);

  // Import here to avoid circular dependency
  const { applyBaseStatsFixture } = await import('./fixture-helpers.js');
  await applyBaseStatsFixture(page, fixture);

  await navigateToStatPredictions(page);
  await page.waitForTimeout(300); // Allow predictions to calculate
}

/**
 * Standard afterEach cleanup - logs coverage report if desired
 * Usage: test.afterEach(logPredictionsCoverage);
 */
export function logPredictionsCoverage() {
  const { logPredictionsCoverageReport } = require('./predictions-coverage.js');
  logPredictionsCoverageReport();
}

/**
 * Helper to navigate to predictions and wait for calculations
 * @param {Page} page - Playwright page object
 */
export async function navigateAndWaitForPredictions(page) {
  await navigateToStatPredictions(page);
  await page.waitForTimeout(300); // Allow predictions to calculate
}

/**
 * Helper to navigate to equivalency and wait for calculations
 * @param {Page} page - Playwright page object
 */
export async function navigateAndWaitForEquivalency(page) {
  await navigateToStatEquivalency(page);
  await page.waitForTimeout(200); // Allow equivalency to calculate
}

/**
 * Creates a test.describe block with standard setup
 * @param {string} name - Describe block name
 * @param {Function} testDefinitions - Function containing test definitions
 * @param {object} options - Options { withFixture: boolean }
 */
export function describePredictionsTests(name, testDefinitions, options = {}) {
  test.describe(name, () => {
    if (options.withFixture) {
      // Test will call setupPredictionsTestWithFixture themselves
      testDefinitions();
    } else {
      test.beforeEach(async ({ page }) => {
        await setupPredictionsTest(page);
      });
      testDefinitions();
    }

    test.afterAll(() => {
      logPredictionsCoverage();
    });
  });
}
