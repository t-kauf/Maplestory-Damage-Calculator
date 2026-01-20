// Weapon Levels Edge Cases & Coverage Tests
//
// PURPOSE: Tests edge cases, boundary conditions, and disabled elements
// COVERAGE:
//   - Max level enforcement based on star count
//   - Disabled cards (Ancient T1)
//   - Boundary values (0, 1, max-1, max level)
//   - Star interaction edge cases (toggle, rapid clicking, hover)
//   - Equipped weapon edge cases
//   - Element coverage inventory (all UI elements)
//   - Rarity-specific default behaviors
//
// User workflow tests are in:
//   - weapon-levels-main.spec.js
// Algorithm functionality tests are in:
//   - weapon-levels-priority.spec.js
// Regression tests are in:
//   - weapon-levels-regression.spec.js
//
// Run with: npm test weapon-levels-coverage.spec.js

import { test, expect } from '@playwright/test';
import {
    clearStorage,
    verifyMaxLevelEnforcement,
    markElementCovered,
    WEAPON_LEVELS_ELEMENTS,
    getAllWeaponCombinations,
    getEdgeCaseWeapons,
    switchToSubTab,
    setupWeapon,
    waitForCalculations,
    verifyUpgradeGainVisible,
    setStars,
    setWeaponLevel,
    verifyStarStates
} from './helpers/weapon-levels-helpers.js';
import {
    WEAPON_LEVELS_MAXED,
    WEAPON_LEVELS_DISABLED_TEST,
    WEAPON_LEVELS_HIGH_STARS_LOW_LEVEL,
    WEAPON_LEVELS_SINGLE
} from './fixtures/weapon-levels.fixtures.js';

const BASE_URL = 'http://localhost:8000';

test.describe('Weapon Levels - Edge Cases & Coverage', () => {
    test.beforeEach(async ({ page }) => {
        await clearStorage(page);
    });

    // =========================================================================
    // MAX LEVEL ENFORCEMENT
    // =========================================================================

    test.describe('Max Level Enforcement Based on Stars', () => {

        // Parameterized test for max level enforcement
        const maxLevelCases = [
            { stars: 5, maxLevel: 200, description: '5 stars allows max level 200' },
            { stars: 4, maxLevel: 180, description: '4 stars allows max level 180' },
            { stars: 3, maxLevel: 160, description: '3 stars allows max level 160' },
            { stars: 2, maxLevel: 140, description: '2 stars allows max level 140' },
            { stars: 1, maxLevel: 120, description: '1 star allows max level 120' },
            { stars: 0, maxLevel: 100, description: '0 stars allows max level 100' }
        ];

        for (const testCase of maxLevelCases) {
            test(testCase.description, async ({ page }) => {
                // Arrange
                await page.goto(`${BASE_URL}/#/setup/weapon-levels`);
                await waitForCalculations(page, 200);

                // Act - Set specific star count
                if (testCase.stars === 0) {
                    // Toggle to 0 stars
                    await setStars(page, 'normal', 't4', 3);
                    await setStars(page, 'normal', 't4', 0);
                } else {
                    await setStars(page, 'normal', 't4', testCase.stars);
                }

                // Assert - Max level should match expected
                if (testCase.stars === 0) {
                    // Special case for 0 stars - just check max attribute
                    const levelInput = page.locator('#level-normal-t4');
                    const maxAttr = await levelInput.getAttribute('max');
                    expect(parseInt(maxAttr)).toBe(testCase.maxLevel);
                } else {
                    await verifyMaxLevelEnforcement(page, 'normal', 't4', testCase.stars, testCase.maxLevel);
                }

                markElementCovered(`max-level-${testCase.stars}-stars`);
            });
        }

        test('level auto-corrects when stars decrease', async ({ page }) => {
            // Arrange
            await page.goto(`${BASE_URL}/#/setup/weapon-levels`);
            await waitForCalculations(page, 200);

            // Set 5 stars and high level using new helper
            await setStars(page, 'normal', 't4', 5);
            await setWeaponLevel(page, 'normal', 't4', 200);
            await waitForCalculations(page, 200);
            await expect(page.locator('#level-normal-t4')).toHaveValue('200');

            // Act - Reduce to 1 star (max level 120)
            await setStars(page, 'normal', 't4', 1);

            // Assert - Level should auto-correct to 120
            await expect(page.locator('#level-normal-t4')).toHaveValue('120');

            markElementCovered('auto-correct-level-stars-decrease');
        });

        test('legendary weapon defaults to 1 star', async ({ page }) => {
            // Arrange - Clear storage first to ensure default state
            await clearStorage(page);
            await page.goto(`${BASE_URL}/#/setup/weapon-levels`);
            await waitForCalculations(page, 800);

            // Assert - Legendary should start with 1 star active
            await expect(page.locator('#star-legendary-t4-1')).toHaveClass(/active/);
            await expect(page.locator('#star-legendary-t4-2')).not.toHaveClass(/active/);

            // Assert - Max level should be 120 (1 star)
            const levelInput = page.locator('#level-legendary-t4');
            const maxAttr = await levelInput.getAttribute('max');
            expect(parseInt(maxAttr)).toBe(120);

            markElementCovered('legendary-default-1-star');
        });

        test('ancient weapon defaults to 1 star', async ({ page }) => {
            // Arrange
            await page.goto(`${BASE_URL}/#/setup/weapon-levels`);
            await waitForCalculations(page, 200);

            // Assert - Ancient should start with 1 star active
            await expect(page.locator('#star-ancient-t4-1')).toHaveClass(/active/);
            await expect(page.locator('#star-ancient-t4-2')).not.toHaveClass(/active/);

            markElementCovered('ancient-default-1-star');
        });
    });

    // =========================================================================
    // DISABLED CARDS
    // =========================================================================

    test.describe('Disabled Cards (Ancient T1)', () => {
        test('other ancient tiers are enabled', async ({ page }) => {
            // Arrange
            await page.goto(`${BASE_URL}/#/setup/weapon-levels`);
            await page.waitForTimeout(200);

            // Assert - Ancient T2, T3, T4 should not be disabled
            await expect(page.locator('#weapon-ancient-t4')).not.toHaveClass(/weapon-card--disabled/);
            await expect(page.locator('#weapon-ancient-t3')).not.toHaveClass(/weapon-card--disabled/);
            await expect(page.locator('#weapon-ancient-t2')).not.toHaveClass(/weapon-card--disabled/);

            // Assert - Should have interactive elements
            await expect(page.locator('#level-ancient-t4')).toBeAttached();
            await expect(page.locator('#star-ancient-t4-1')).toBeAttached();

            markElementCovered('enabled-ancient-tiers');
        });
    });

    // =========================================================================
    // BOUNDARY VALUE TESTS
    // =========================================================================

    test.describe('Boundary Values', () => {

        test('level 0 hides upgrade gain display', async ({ page }) => {
            // Arrange
            await page.goto(`${BASE_URL}/#/setup/weapon-levels`);
            await waitForCalculations(page, 200);

            // Set up stars but level 0
            await setupWeapon(page, 'normal', 't4', 0, 5);

            // Assert - Upgrade gain should not be visible
            await verifyUpgradeGainVisible(page, 'normal', 't4', false);

            markElementCovered('boundary-level-0');
        });

        test('level 1 shows upgrade gain', async ({ page }) => {
            // Arrange
            await page.goto(`${BASE_URL}/#/setup/weapon-levels`);
            await waitForCalculations(page, 200);

            // Set to level 1
            await setupWeapon(page, 'normal', 't4', 1, 5);

            // Assert - Upgrade gain should be visible
            await verifyUpgradeGainVisible(page, 'normal', 't4', true);

            markElementCovered('boundary-level-1');
        });

        test('max level (200) hides upgrade gain', async ({ page }) => {
            // Arrange
            await page.goto(`${BASE_URL}/#/setup/weapon-levels`);
            await waitForCalculations(page, 200);

            // Set to max level
            await setupWeapon(page, 'normal', 't4', 200, 5);

            // Assert - Upgrade gain should not be visible
            await verifyUpgradeGainVisible(page, 'normal', 't4', false);

            markElementCovered('boundary-max-level');
        });

        test('max level minus 1 shows upgrade gain', async ({ page }) => {
            // Arrange
            await page.goto(`${BASE_URL}/#/setup/weapon-levels`);
            await waitForCalculations(page, 200);

            // Set to max level minus 1
            await setupWeapon(page, 'normal', 't4', 199, 5);

            // Assert - Upgrade gain should be visible
            await verifyUpgradeGainVisible(page, 'normal', 't4', true);

            markElementCovered('boundary-max-minus-1');
        });

        test('very large level is capped at max', async ({ page }) => {
            // Arrange
            await page.goto(`${BASE_URL}/#/setup/weapon-levels`);
            await waitForCalculations(page, 200);

            // Set 5 stars (max level 200)
            await setStars(page, 'normal', 't4', 5);

            // Act - Try to enter very large level
            const levelInput = page.locator('#level-normal-t4');
            await levelInput.fill('99999');
            await waitForCalculations(page, 200);

            // Assert - Should be capped at 200
            await expect(levelInput).toHaveValue('200');

            markElementCovered('boundary-large-input');
        });
    });

    // =========================================================================
    // STAR INTERACTION EDGE CASES
    // =========================================================================

    test.describe('Star Interaction Edge Cases', () => {

        test('single click sets stars to clicked value', async ({ page }) => {
            // Arrange
            await page.goto(`${BASE_URL}/#/setup/weapon-levels`);
            await waitForCalculations(page, 200);

            // Act - Click 3rd star
            await page.locator('#star-normal-t4-3').click();
            await waitForCalculations(page, 200);

            // Assert - Stars 1-3 should be active
            await verifyStarStates(page, 'normal', 't4', 3);

            markElementCovered('star-click-single');
        });

        test('clicking same star toggles to 0 stars', async ({ page }) => {
            // Arrange
            await page.goto(`${BASE_URL}/#/setup/weapon-levels`);
            await waitForCalculations(page, 200);

            // Set to 3 stars first
            await setStars(page, 'normal', 't4', 3);
            await verifyStarStates(page, 'normal', 't4', 3);

            // Act - Click the same star (3rd) again to toggle to 0
            await page.locator('#star-normal-t4-3').click();
            await waitForCalculations(page, 200);

            // Assert - All stars should be inactive
            await verifyStarStates(page, 'normal', 't4', 0);

            // Assert - Max level should be 100 (0 stars defaults to max level 100)
            const levelInput = page.locator('#level-normal-t4');
            const maxAttr = await levelInput.getAttribute('max');
            expect(parseInt(maxAttr)).toBe(100);

            markElementCovered('star-toggle-to-zero');
        });

        test('rapid star clicking settles on final value', async ({ page }) => {
            // Arrange
            await page.goto(`${BASE_URL}/#/setup/weapon-levels`);
            await waitForCalculations(page, 200);

            // Act - Rapidly set multiple stars
            await setStars(page, 'normal', 't4', 1);
            await setStars(page, 'normal', 't4', 3);
            await setStars(page, 'normal', 't4', 5);
            await waitForCalculations(page, 300);

            // Assert - Should settle on final state (5 stars)
            await verifyStarStates(page, 'normal', 't4', 5);

            // Assert - Max level should be 200
            const maxAttr = await page.locator('#level-normal-t4').getAttribute('max');
            expect(parseInt(maxAttr)).toBe(200);

            markElementCovered('rapid-star-clicking');
        });

        test('clicking star with level at max auto-corrects level', async ({ page }) => {
            // Arrange
            await page.goto(`${BASE_URL}/#/setup/weapon-levels`);
            await waitForCalculations(page, 200);

            // Set 5 stars and max level
            await setupWeapon(page, 'normal', 't4', 200, 5);
            await expect(page.locator('#level-normal-t4')).toHaveValue('200');

            // Act - Change to 3 stars (max level 160)
            await setStars(page, 'normal', 't4', 3);

            // Assert - Level should auto-correct to 160
            await expect(page.locator('#level-normal-t4')).toHaveValue('160');

            // Assert - Max attribute should be 160
            const levelInput = page.locator('#level-normal-t4');
            const maxAttr = await levelInput.getAttribute('max');
            expect(parseInt(maxAttr)).toBe(160);

            markElementCovered('star-change-at-max-level');
        });

        test('star hover preview resets correctly', async ({ page }) => {
            // Arrange
            await page.goto(`${BASE_URL}/#/setup/weapon-levels`);
            await waitForCalculations(page, 200);

            // Set to 2 stars
            await setStars(page, 'normal', 't4', 2);

            // Act - Hover over 4th star
            const star4 = page.locator('#star-normal-t4-4');
            await star4.hover();
            await page.waitForTimeout(100);

            // Preview should show stars 1-4 as active (visual preview)
            // This is hard to test with Playwright, so we'll just verify no errors

            // Act - Move mouse away
            await page.locator('#weapons-grid').hover();
            await page.waitForTimeout(100);

            // Assert - Should still be at 2 stars
            await verifyStarStates(page, 'normal', 't4', 2);

            markElementCovered('star-hover-preview');
        });
    });

    // =========================================================================
    // EQUIPPED WEAPON EDGE CASES
    // =========================================================================

    test.describe('Equipped Weapon Edge Cases', () => {

        test('unchecking equipped checkbox hides display', async ({ page }) => {
            // Arrange
            await page.goto(`${BASE_URL}/#/setup/weapon-levels`);
            await page.waitForTimeout(200);

            // Set up and equip weapon
            await page.locator('#level-normal-t4').fill('50');
            await page.locator('#equipped-label-normal-t4').click();
            await page.waitForTimeout(200);
            await expect(page.locator('#equipped-display-normal-t4')).toBeVisible();

            // Act - Uncheck
            await page.locator('#equipped-label-normal-t4').click();
            await page.waitForTimeout(200);

            // Assert - Display should be hidden
            await expect(page.locator('#equipped-display-normal-t4')).not.toBeVisible();

            // Assert - Card should not have equipped class
            await expect(page.locator('#weapon-normal-t4')).not.toHaveClass(/equipped/);

            // Assert - Indicator should be visible
            await expect(page.locator('#no-weapon-equipped-indicator')).toBeVisible();

            markElementCovered('uncheck-equipped');
        });

        test('switching equipped weapon updates summary stats', async ({ page }) => {
            // Arrange
            await page.goto(`${BASE_URL}/#/setup/weapon-levels`);
            await page.waitForTimeout(200);

            // Set up and equip Normal T4
            await page.locator('#level-normal-t4').fill('100');
            await page.locator('#equipped-label-normal-t4').click();
            await page.waitForTimeout(200);

            const initialEquipped = await page.locator('#equipped-weapon-attack-pct').textContent();

            // Act - Set up and equip Rare T4
            await page.locator('#level-rare-t4').fill('50');
            await page.locator('#equipped-label-rare-t4').click();
            await page.waitForTimeout(200);

            const newEquipped = await page.locator('#equipped-weapon-attack-pct').textContent();

            // Assert - Equipped stat should be different
            expect(newEquipped).not.toBe(initialEquipped);

            markElementCovered('switch-equipped-updates-stats');
        });

        test('changing level of equipped weapon updates display', async ({ page }) => {
            // Arrange
            await page.goto(`${BASE_URL}/#/setup/weapon-levels`);
            await page.waitForTimeout(200);

            // Set up and equip weapon
            await page.locator('#level-normal-t4').fill('50');
            await page.locator('#equipped-label-normal-t4').click();
            await page.waitForTimeout(200);

            const initialEquipped = await page.locator('#equipped-value-normal-t4').textContent();

            // Act - Change level
            await page.locator('#level-normal-t4').fill('100');
            await page.waitForTimeout(300);

            const newEquipped = await page.locator('#equipped-value-normal-t4').textContent();

            // Assert - Display should be updated
            expect(newEquipped).not.toBe(initialEquipped);

            markElementCovered('change-equipped-level');
        });
    });

    // =========================================================================
    // ELEMENT COVERAGE INVENTORY
    // =========================================================================

    test.describe('Element Coverage Inventory', () => {

        test('all sub-tab buttons are present and interactive', async ({ page }) => {
            // Arrange
            await page.goto(`${BASE_URL}/#/setup/weapon-levels`);
            await waitForCalculations(page, 200);

            // Assert - Both sub-tab buttons should exist
            const buttons = page.locator('#weapon-levels-subtab-button');
            await expect(buttons).toHaveCount(2);

            // Assert - Should be able to click both using helper
            await switchToSubTab(page, 'upgrade-priority');
            await expect(page.locator('#weapon-levels-upgrade-priority')).toBeVisible();

            await switchToSubTab(page, 'weapons-grid');
            await expect(page.locator('#weapon-levels-weapons-grid')).toBeVisible();

            markElementCovered('subtab-buttons');
        });

        test('summary stat elements exist and update', async ({ page }) => {
            // Arrange
            await page.goto(`${BASE_URL}/#/setup/weapon-levels`);
            await waitForCalculations(page, 200);

            // Assert - All summary stats should exist
            await expect(page.locator('#total-inventory-attack')).toBeVisible();
            await expect(page.locator('#equipped-weapon-attack-pct')).toBeVisible();
            await expect(page.locator('#total-weapon-attack')).toBeVisible();

            // Act - Set a weapon level
            await setWeaponLevel(page, 'normal', 't4', 50);
            await waitForCalculations(page, 300);

            // Assert - All should have non-zero values
            await expect(page.locator('#total-inventory-attack')).not.toHaveText('0%');

            markElementCovered('summary-stats');
        });

        test('edge case weapon cards exist', async ({ page }) => {
            // Arrange
            await page.goto(`${BASE_URL}/#/setup/weapon-levels`);
            await waitForCalculations(page, 200);

            // Assert - Key edge case cards should exist (Ancient T1 is not rendered)
            await expect(page.locator('#weapon-normal-t4')).toBeVisible();
            await expect(page.locator('#weapon-legendary-t4')).toBeVisible();
            await expect(page.locator('#weapon-ancient-t4')).toBeVisible();
            // Ancient T1 card is disabled and not rendered to DOM

            markElementCovered('edge-case-cards');
        });

        test('edge case star ratings exist', async ({ page }) => {
            // Arrange
            await page.goto(`${BASE_URL}/#/setup/weapon-levels`);
            await waitForCalculations(page, 200);

            // Assert - Edge case stars should exist
            await expect(page.locator('#star-normal-t4-1')).toBeVisible();
            await expect(page.locator('#star-normal-t4-5')).toBeVisible();
            await expect(page.locator('#star-legendary-t4-1')).toBeVisible();
            await expect(page.locator('#star-ancient-t4-5')).toBeVisible();

            markElementCovered('edge-case-stars');
        });

        test('currency calculator elements exist', async ({ page }) => {
            // Arrange
            await page.goto(`${BASE_URL}/#/setup/weapon-levels`);
            await waitForCalculations(page, 200);

            // Switch to priority tab using helper
            await switchToSubTab(page, 'upgrade-priority');

            // Assert - All calculator elements should exist
            await expect(page.locator('#upgrade-currency-input')).toBeVisible();
            // The following elements might not be visible until currency is entered, but they should exist
            await expect(page.locator('#currency-attack-gain')).toBeAttached();
            await expect(page.locator('#currency-dps-gain')).toBeAttached();
            await expect(page.locator('#currency-upgrade-path')).toBeAttached();

            markElementCovered('currency-calculator-elements');
        });

        test('priority chain element exists', async ({ page }) => {
            // Arrange
            await page.goto(`${BASE_URL}/#/setup/weapon-levels`);
            await waitForCalculations(page, 200);

            // Switch to priority tab using helper
            await switchToSubTab(page, 'upgrade-priority');

            // Assert - Priority chain should exist
            await expect(page.locator('#upgrade-priority-chain')).toBeVisible();

            markElementCovered('priority-chain-element');
        });
    });

    // =========================================================================
    // RARITY-SPECIFIC BEHAVIORS
    // =========================================================================

    test.describe('Rarity-Specific Behaviors', () => {

        test('normal rare epic unique default to 5 stars', async ({ page }) => {
            // Arrange
            await page.goto(`${BASE_URL}/#/setup/weapon-levels`);
            await page.waitForTimeout(200);

            // Assert - Normal, Rare, Epic, Unique should start with 5 stars
            const raritiesToCheck = ['normal', 'rare', 'epic', 'unique'];

            for (const rarity of raritiesToCheck) {
                await expect(page.locator(`#star-${rarity}-t4-5`)).toHaveClass(/active/);
            }

            markElementCovered('default-5-stars-rarities');
        });

        test('legendary mystic ancient default to 1 star', async ({ page }) => {
            // Arrange
            await page.goto(`${BASE_URL}/#/setup/weapon-levels`);
            await page.waitForTimeout(200);

            // Assert - Legendary, Mystic, Ancient should start with 1 star
            const raritiesToCheck = ['legendary', 'mystic', 'ancient'];

            for (const rarity of raritiesToCheck) {
                await expect(page.locator(`#star-${rarity}-t4-1`)).toHaveClass(/active/);
                await expect(page.locator(`#star-${rarity}-t4-2`)).not.toHaveClass(/active/);
            }

            markElementCovered('default-1-star-rarities');
        });
    });
});
