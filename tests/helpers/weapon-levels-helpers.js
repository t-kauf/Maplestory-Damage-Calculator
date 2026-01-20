// Weapon Levels Test Helpers
// Helper functions for weapon levels UI testing
import { expect } from '@playwright/test';

/**
 * Clear localStorage and sessionStorage
 * @param {Page} page - Playwright page object
 */
export async function clearStorage(page) {
    await page.goto('http://localhost:8000');
    await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
    });
}

/**
 * Get weapon level from localStorage
 * @param {Page} page - Playwright page object
 * @param {string} rarity - Weapon rarity
 * @param {string} tier - Weapon tier
 * @returns {Promise<string>} Value from localStorage
 */
export async function getWeaponLevelFromStorage(page, rarity, tier) {
    return await page.evaluate((key) => {
        return localStorage.getItem(key);
    }, `level-${rarity}-${tier}`);
}

/**
 * Get weapon stars from localStorage
 * @param {Page} page - Playwright page object
 * @param {string} rarity - Weapon rarity
 * @param {string} tier - Weapon tier
 * @returns {Promise<string>} Value from localStorage
 */
export async function getWeaponStarsFromStorage(page, rarity, tier) {
    return await page.evaluate((key) => {
        return localStorage.getItem(key);
    }, `stars-${rarity}-${tier}`);
}

/**
 * Get equipped weapon from localStorage
 * @param {Page} page - Playwright page object
 * @returns {Promise<string>} Equipped weapon key
 */
export async function getEquippedWeaponFromStorage(page) {
    return await page.evaluate(() => {
        // Check for the actual equipped weapon by looking at localStorage
        // The equipped weapon is stored differently - we need to find which one has checked=true
        const rarities = ['normal', 'rare', 'epic', 'unique', 'legendary', 'mystic', 'ancient'];
        const tiers = ['t1', 't2', 't3', 't4'];

        for (const rarity of rarities) {
            for (const tier of tiers) {
                const key = `equipped-${rarity}-${tier}`;
                const isEquipped = localStorage.getItem(key);
                if (isEquipped === 'true') {
                    return `${rarity}-${tier}`;
                }
            }
        }
        return null;
    });
}

/**
 * Verify weapon stats match expected values
 * @param {Page} page - Playwright page object
 * @param {string} rarity - Weapon rarity
 * @param {string} tier - Weapon tier
 * @param {Object} expected - Expected values { level, stars, inventoryAttack, equippedAttack }
 */
export async function verifyWeaponStats(page, rarity, tier, expected) {
    // Verify level input
    const levelInput = page.locator(`#level-${rarity}-${tier}`);
    await expect(levelInput).toHaveValue(expected.level.toString());

    // Verify stars input (hidden field)
    const starsInput = page.locator(`#stars-${rarity}-${tier}`);
    await expect(starsInput).toHaveValue(expected.stars.toString());

    // Verify star visuals
    for (let i = 1; i <= 5; i++) {
        const starElement = page.locator(`#star-${rarity}-${tier}-${i}`);
        const shouldBeActive = i <= expected.stars;
        if (shouldBeActive) {
            await expect(starElement).toHaveClass(/active/);
        } else {
            await expect(starElement).not.toHaveClass(/active/);
        }
    }

    // Verify inventory attack display
    if (expected.inventoryAttack !== undefined) {
        const inventoryDisplay = page.locator(`#inventory-display-${rarity}-${tier}`);
        const expectedText = `${expected.inventoryAttack.toFixed(1)}% inventory attack`;
        await expect(inventoryDisplay).toHaveText(expectedText);
    }

    // Verify equipped display if weapon is equipped
    if (expected.equipped && expected.equippedAttack !== undefined) {
        const equippedDisplay = page.locator(`#equipped-display-${rarity}-${tier}`);
        await expect(equippedDisplay).toBeVisible();

        const equippedValue = page.locator(`#equipped-value-${rarity}-${tier}`);
        const expectedText = `${expected.equippedAttack.toFixed(1)}% equipped attack`;
        await expect(equippedValue).toHaveText(expectedText);
    }
}

/**
 * Verify summary stats match expected values
 * @param {Page} page - Playwright page object
 * @param {Object} expected - Expected values { totalInventory, equipped, total }
 */
export async function verifySummaryStats(page, expected) {
    const totalInventoryElement = page.locator('#total-inventory-attack');
    const equippedElement = page.locator('#equipped-weapon-attack-pct');
    const totalElement = page.locator('#total-weapon-attack');

    await expect(totalInventoryElement).toHaveText(expected.totalInventory.toString() + '%');
    await expect(equippedElement).toHaveText(expected.equipped.toString() + '%');
    await expect(totalElement).toHaveText(expected.total.toString() + '%');
}

/**
 * Verify sub-tab is active
 * @param {Page} page - Playwright page object
 * @param {string} tabName - Tab name ('weapons-grid' or 'upgrade-priority')
 */
export async function verifySubTabActive(page, tabName) {
    const subTab = page.locator(`#weapon-levels-${tabName}`);
    await expect(subTab).toBeVisible();
    await expect(subTab).toHaveClass(/active/);

    // Verify corresponding button is active
    const buttons = page.locator('#weapon-levels-subtab-button');
    const buttonCount = await buttons.count();

    for (let i = 0; i < buttonCount; i++) {
        const button = buttons.nth(i);
        const onClickAttr = await button.getAttribute('onclick');

        if (onClickAttr && onClickAttr.includes(tabName)) {
            await expect(button).toHaveClass(/active/);
        }
    }
}

/**
 * Get upgrade priority chain text
 * @param {Page} page - Playwright page object
 * @returns {Promise<string>} Priority chain HTML content
 */
export async function getPriorityChain(page) {
    const chainElement = page.locator('#upgrade-priority-chain');
    return await chainElement.innerHTML();
}

/**
 * Parse priority chain to extract upgrade sequence
 * @param {string} chainHTML - HTML content of priority chain
 * @returns {Array} Array of upgrade objects { rarity, tier, count }
 */
export function parsePriorityChain(chainHTML) {
    const upgrades = [];
    const items = chainHTML.match(/<span class="wl-priority-item"[^>]*>([^<]+)<\/span>/g);

    if (items) {
        items.forEach(item => {
            const match = item.match(/data-rarity="(\w+)">([^<]+)</);
            if (match) {
                const [, rarity, text] = match;
                // Parse "T4 N x15" format
                const textMatch = text.match(/([Tt][1234]) ([A-Z]) x(\d+)/);
                if (textMatch) {
                    upgrades.push({
                        rarity: rarity,
                        tier: textMatch[1].toLowerCase(),
                        count: parseInt(textMatch[3])
                    });
                }
            }
        });
    }

    return upgrades;
}

/**
 * Verify currency calculator results
 * @param {Page} page - Playwright page object
 * @param {Object} expected - Expected values
 */
export async function verifyCurrencyCalculator(page, expected) {
    const attackGain = page.locator('#currency-attack-gain');
    const dpsGain = page.locator('#currency-dps-gain');
    const resultsDiv = page.locator('#currency-upgrade-results');

    await expect(resultsDiv).toHaveClass(/visible/);
    await expect(attackGain).toContainText(expected.attackGain.toString());
    await expect(dpsGain).toContainText(expected.dpsGain.toString());
}

/**
 * Mark element as covered for tracking
 * @param {string} elementId - Element ID
 */
export function markElementCovered(elementId) {
    // This would integrate with a coverage tracking system
    // For now, it's a placeholder
    console.log(`Covered: ${elementId}`);
}

/**
 * Element coverage inventory for weapon levels tab
 * Track all interactive elements that need testing
 */
export const WEAPON_LEVELS_ELEMENTS = {
    subTabButtons: [
        'weapon-levels-subtab-button[weapons-grid]',
        'weapon-levels-subtab-button[upgrade-priority]'
    ],

    // Weapon cards (edge case focus - key rarities and tiers)
    weaponCards: [
        'weapon-normal-t4',
        'weapon-legendary-t4',
        'weapon-ancient-t4',
        'weapon-ancient-t1' // Disabled card
    ],

    // Star ratings (testing edge cases: 0, 1, 5 stars)
    starRatings: [
        'star-normal-t4-1', 'star-normal-t4-5',
        'star-legendary-t4-1', 'star-legendary-t4-5',
        'star-ancient-t4-1', 'star-ancient-t4-5'
    ],

    // Level inputs (edge cases: 0, max level for stars)
    levelInputs: [
        'level-normal-t4',
        'level-legendary-t4',
        'level-ancient-t4'
    ],

    // Equipped checkboxes
    equippedCheckboxes: [
        'equipped-checkbox-normal-t4',
        'equipped-checkbox-legendary-t4',
        'equipped-checkbox-ancient-t4'
    ],

    // Currency calculator
    currencyCalculator: [
        'upgrade-currency-input',
        'currency-attack-gain',
        'currency-dps-gain',
        'currency-upgrade-path',
        'apply-upgrade-path-btn'
    ],

    // Summary stats
    summaryStats: [
        'total-inventory-attack',
        'equipped-weapon-attack-pct',
        'total-weapon-attack'
    ],

    // Priority chain
    priorityChain: [
        'upgrade-priority-chain'
    ]
};

/**
 * Get all weapon combinations for testing
 * @returns {Array} Array of { rarity, tier } objects
 */
export function getAllWeaponCombinations() {
    const rarities = ['normal', 'rare', 'epic', 'unique', 'legendary', 'mystic', 'ancient'];
    const tiers = ['t1', 't2', 't3', 't4'];
    const combinations = [];

    rarities.forEach(rarity => {
        tiers.forEach(tier => {
            // Skip disabled cards
            if (rarity === 'ancient' && tier === 't1') return;
            combinations.push({ rarity, tier });
        });
    });

    return combinations;
}

/**
 * Get edge case weapon combinations for testing
 * @returns {Array} Array of { rarity, tier, description } objects
 */
export function getEdgeCaseWeapons() {
    return [
        { rarity: 'normal', tier: 't4', description: 'Normal T4 - most efficient upgrade' },
        { rarity: 'legendary', tier: 't4', description: 'Legendary T4 - high rarity' },
        { rarity: 'ancient', tier: 't4', description: 'Ancient T4 - highest rarity' },
        { rarity: 'ancient', tier: 't1', description: 'Ancient T1 - disabled card' },
        { rarity: 'normal', tier: 't4', stars: 5, level: 200, description: 'Max stars and level' },
        { rarity: 'legendary', tier: 't4', stars: 1, level: 50, description: 'Min stars (1), mid level' }
    ];
}

/**
 * Verify max level enforcement based on stars
 * @param {Page} page - Playwright page object
 * @param {string} rarity - Weapon rarity
 * @param {string} tier - Weapon tier
 * @param {number} stars - Number of stars
 * @param {number} expectedMaxLevel - Expected max level
 */
export async function verifyMaxLevelEnforcement(page, rarity, tier, stars, expectedMaxLevel) {
    const levelInput = page.locator(`#level-${rarity}-${tier}`);

    // Try to set a level higher than max
    await levelInput.fill((expectedMaxLevel + 10).toString());
    await page.waitForTimeout(500);

    // Should be capped at expectedMaxLevel
    const actualValue = await levelInput.inputValue();
    expect(parseInt(actualValue)).toBeLessThanOrEqual(expectedMaxLevel);

    // Verify the max attribute is set correctly
    const maxAttr = await levelInput.getAttribute('max');
    expect(parseInt(maxAttr)).toBe(expectedMaxLevel);
}

/**
 * Switch to a specific sub-tab on weapon levels page
 * @param {Page} page - Playwright page object
 * @param {string} tabName - Tab name ('weapons-grid' or 'upgrade-priority')
 */
export async function switchToSubTab(page, tabName) {
    const buttonText = tabName === 'upgrade-priority' ? 'Upgrade Priority' : 'Weapons Grid';
    await page.locator('#weapon-levels-subtab-button').filter({ hasText: buttonText }).click();
    await page.waitForTimeout(300);
}

/**
 * Set weapon stars directly (more reliable than clicking)
 * @param {Page} page - Playwright page object
 * @param {string} rarity - Weapon rarity
 * @param {string} tier - Weapon tier
 * @param {number} starCount - Number of stars to set (0-5)
 */
export async function setStars(page, rarity, tier, starCount) {
    // Get current stars value to determine if we need to toggle
    const starsInput = page.locator(`#stars-${rarity}-${tier}`);
    const currentStars = await starsInput.inputValue();
    const currentStarsInt = parseInt(currentStars) || 0;

    // For setting to 0, we need to click the current star twice (toggle behavior)
    // For other values, we click the target star
    if (starCount === 0 && currentStarsInt > 0) {
        // Toggle to 0 by clicking the current star again
        const starElement = page.locator(`#star-${rarity}-${tier}-${currentStarsInt}`);
        await starElement.click();
    } else if (starCount !== currentStarsInt) {
        // Click the target star to set to that value
        const starElement = page.locator(`#star-${rarity}-${tier}-${starCount}`);
        await starElement.click();
    }

    // Wait for the UI to update
    await page.waitForTimeout(300);
}

/**
 * Set weapon level and verify
 * @param {Page} page - Playwright page object
 * @param {string} rarity - Weapon rarity
 * @param {string} tier - Weapon tier
 * @param {number} level - Level to set
 */
export async function setWeaponLevel(page, rarity, tier, level) {
    const levelInput = page.locator(`#level-${rarity}-${tier}`);
    await levelInput.fill(level.toString());
    await page.waitForTimeout(200);
}

/**
 * Get upgrade gain text for a weapon
 * @param {Page} page - Playwright page object
 * @param {string} rarity - Weapon rarity
 * @param {string} tier - Weapon tier
 * @returns {Promise<string>} Upgrade gain text content
 */
export async function getUpgradeGainText(page, rarity, tier) {
    const upgradeGain = page.locator(`#upgrade-gain-${rarity}-${tier}`);
    return await upgradeGain.textContent();
}

/**
 * Extract efficiency value from upgrade gain text
 * @param {string} upgradeGainText - Text from upgrade gain element
 * @returns {number|null} Efficiency percentage value or null
 */
export function extractEfficiency(upgradeGainText) {
    const match = upgradeGainText.match(/([\d.]+)%/);
    return match ? parseFloat(match[1]) : null;
}

/**
 * Verify upgrade gain visibility
 * @param {Page} page - Playwright page object
 * @param {string} rarity - Weapon rarity
 * @param {string} tier - Weapon tier
 * @param {boolean} shouldBeVisible - Whether upgrade gain should be visible
 */
export async function verifyUpgradeGainVisible(page, rarity, tier, shouldBeVisible) {
    const upgradeGainContainer = page.locator(`#upgrade-gain-container-${rarity}-${tier}`);
    if (shouldBeVisible) {
        await expect(upgradeGainContainer).toHaveClass(/visible/);
    } else {
        await expect(upgradeGainContainer).not.toHaveClass(/visible/);
    }
}

/**
 * Verify star states for a weapon
 * @param {Page} page - Playwright page object
 * @param {string} rarity - Weapon rarity
 * @param {string} tier - Weapon tier
 * @param {number} activeCount - Number of stars that should be active (0-5)
 */
export async function verifyStarStates(page, rarity, tier, activeCount) {
    for (let i = 1; i <= 5; i++) {
        const star = page.locator(`#star-${rarity}-${tier}-${i}`);
        if (i <= activeCount) {
            await expect(star).toHaveClass(/active/);
        } else {
            await expect(star).not.toHaveClass(/active/);
        }
    }
}

/**
 * Set up weapon with level and stars
 * @param {Page} page - Playwright page object
 * @param {string} rarity - Weapon rarity
 * @param {string} tier - Weapon tier
 * @param {number} level - Level to set
 * @param {number} stars - Stars to set
 */
export async function setupWeapon(page, rarity, tier, level, stars) {
    await setStars(page, rarity, tier, stars);
    await setWeaponLevel(page, rarity, tier, level);
    await page.waitForTimeout(300);
}

/**
 * Navigate to a tab and back to weapon levels, then verify preservation
 * @param {Page} page - Playwright page object
 * @param {string} targetUrl - URL to navigate to
 * @param {string} pageId - Expected page element ID to verify navigation
 * @returns {Promise<Object>} Snapshot of stats before navigation
 */
export async function testCrossTabPersistence(page, targetUrl, pageId) {
    // Get initial stats
    const initialStats = {
        totalInventory: await page.locator('#total-inventory-attack').textContent(),
        equipped: await page.locator('#equipped-weapon-attack-pct').textContent()
    };

    // Navigate away
    await page.goto(targetUrl);
    await page.waitForTimeout(200);
    await expect(page.locator(`#${pageId}`)).toBeVisible();

    // Navigate back
    await page.goto('http://localhost:8000/#/setup/weapon-levels');
    await page.waitForTimeout(200);

    // Verify preservation
    await expect(page.locator('#total-inventory-attack')).toHaveText(initialStats.totalInventory);
    await expect(page.locator('#equipped-weapon-attack-pct')).toHaveText(initialStats.equipped);

    return initialStats;
}

/**
 * Wait for calculations to complete
 * @param {Page} page - Playwright page object
 * @param {number} ms - Milliseconds to wait (default 300)
 */
export async function waitForCalculations(page, ms = 300) {
    await page.waitForTimeout(ms);
}

/**
 * Get all visible upgrade gain texts from weapon grid
 * @param {Page} page - Playwright page object
 * @returns {Promise<Map>} Map of weapon key to upgrade gain text
 */
export async function getAllUpgradeGains(page) {
    const weaponKeys = [
        'normal-t4', 'normal-t3', 'normal-t2',
        'rare-t4', 'rare-t3', 'rare-t2',
        'epic-t4', 'epic-t3', 'epic-t2',
        'unique-t4', 'unique-t3',
        'legendary-t4', 'legendary-t3',
        'mystic-t4', 'mystic-t3',
        'ancient-t4', 'ancient-t3', 'ancient-t2'
    ];

    const upgradeGains = new Map();

    for (const key of weaponKeys) {
        try {
            const text = await getUpgradeGainText(page, key.split('-')[0], key.split('-')[1]);
            if (text && text.trim() !== '') {
                upgradeGains.set(key, text);
            }
        } catch (e) {
            // Element might not exist or be visible
        }
    }

    return upgradeGains;
}
