# Testing Standards & Guidelines

**Last Updated:** 2026-01-19
**Purpose:** Establish consistent patterns for UI testing across the Maplestory Damage Calculator project

---

## Overview

This document defines the standards for writing UI tests to ensure comprehensive coverage, maintainability, and early detection of bugs—particularly around data persistence issues. All new tests should follow these patterns.

---

## 1. Test Organization

### Hybrid File Structure

Tests are organized using a **hybrid approach** that balances maintainability with comprehensive coverage:

**Main workflow files** contain user journey tests that read like stories:
- `base-stats-main.spec.js` - Character setup, class switching, configuration adjustments
- `equipment-main.spec.js` - Equipment management workflows
- (Other main feature files)

**Dedicated files for complex interactive sections:**
- `base-stats-mastery.spec.js` - Mastery tables with cascading visibility
- `base-stats-target-content.spec.js` - Dynamic dropdowns and content selection
- (Other complex UI sections)

**Coverage files** ensure element inventory tracking:
- `base-stats-coverage.spec.js` - Element inventory validation and edge cases

**Rationale:** Keeps tests focused while allowing complex sections to have appropriate test count without overwhelming main workflow files.

---

## 2. Test Data Fixtures

### Complete Character Configurations

Use **complete character configurations** at defined progression milestones. Fixtures contain ALL relevant values for a realistic character state.

**Progression Milestones:**
- **Level 60** - Base 3rd job starter (basic gear, minimal bonuses)
- **Level 80** - Mid 3rd job (some upgrades, few mastery bonuses)
- **Level 90** - Late 3rd job (well-geared, most 3rd job mastery)
- **Level 100** - Starter 4th job (transitioned, basic 4th job mastery)
- **Level 120** - Late 4th job (optimized, full 4th job mastery)

**Fixture Structure:**
```javascript
// tests/fixtures/base-stats.fixtures.js
export const HERO_LEVEL_60 = {
  class: 'hero',
  jobTier: '3rd',
  level: 60,
  attack: 150,
  defense: 0,
  critRate: 5,
  critDamage: 10,
  attackSpeed: 0,
  str: 300,
  dex: 50,
  int: 0,
  luk: 0,
  // ... all stat fields
  skillLevels: { 1st: 0, 2nd: 0, 3rd: 5, 4th: 0 },
  mainStatPct: 0,
  mastery: { '3rd-all-64': true, '3rd-all-68': true },
  targetContent: 'none'
};
```

**Usage:**
```javascript
import { applyBaseStatsFixture } from '@helpers/fixture-helpers.js';

test('configures warrior character', async ({ page }) => {
  await applyBaseStatsFixture(page, HERO_LEVEL_60);
  // Test continues...
});
```

**Rationale:** Fixtures are reusable across tabs for integration testing. Each milestone represents a realistic character state that can be used to test cross-tab functionality.

---

## 3. Assertion Patterns

### Three-Phase Testing: Direct + Side Effects + localStorage

Every test assertion must verify **three levels** of state:

**1. Direct state** - The immediate result of the action
```javascript
await expect(page.locator('#class-hero')).toHaveClass(/selected/);
```

**2. Visible side effects** - Any UI changes that result from the action
```javascript
await expect(page.locator('#str-row')).toBeVisible();
await expect(page.locator('#dex-row')).toBeVisible();
await expect(page.locator('#int-row')).toBeHidden();
await expect(page.locator('#luk-row')).toBeHidden();
```

**3. localStorage validation** - Verify persistence (critical for catching disappearing values bugs)
```javascript
const selectedClass = await page.evaluate(() => localStorage.getItem('selectedClass'));
expect(selectedClass).toBe('hero');
```

**Complete Example:**
```javascript
test('selecting hero class updates all state', async ({ page }) => {
  // Act
  await page.click('#class-hero');

  // Assert - Direct state
  await expect(page.locator('#class-hero')).toHaveClass(/selected/);
  await expect(page.locator('#class-dark-knight')).not.toHaveClass(/selected/);

  // Assert - Visible side effects
  await expect(page.locator('#str-row')).toBeVisible();
  await expect(page.locator('#dex-row')).toBeVisible();
  await expect(page.locator('#int-row')).toBeHidden();
  await expect(page.locator('#luk-row')).toBeHidden();

  // Assert - localStorage validation
  const selectedClass = await page.evaluate(() => localStorage.getItem('selectedClass'));
  expect(selectedClass).toBe('hero');
});
```

**Rationale:** This three-level approach catches bugs at the surface (UI), logic (side effects), and persistence (localStorage) layers.

---

## 4. Test Structure Pattern

All tests follow the **Arrange-Act-Assert** pattern with descriptive names:

```javascript
test.describe('Base Stats - Class Selection', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/#/setup/base-stats');
    await clearStorage(page);
  });

  test('switching from warrior to mage updates stat rows and preserves inputs', async ({ page }) => {
    // Arrange
    await applyBaseStatsFixture(page, HERO_LEVEL_80);

    // Act
    await page.click('#class-arch-mage-il');

    // Assert - Direct state
    await expect(page.locator('#class-arch-mage-il')).toHaveClass(/selected/);

    // Assert - Visible side effects
    await expect(page.locator('#int-row')).toBeVisible();
    await expect(page.locator('#luk-row')).toBeVisible();
    await expect(page.locator('#str-row')).toBeHidden();
    await expect(page.locator('#dex-row')).toBeHidden();

    // Assert - localStorage validation
    const selectedClass = await page.evaluate(() => localStorage.getItem('selectedClass'));
    expect(selectedClass).toBe('arch-mage-il');
  });
});
```

**Test Naming:** Use descriptive names that indicate:
- What is being tested
- What action is performed
- What outcome is expected

Example: `"switching from warrior to mage updates stat rows and preserves inputs"`

---

## 5. Coverage Tracking

### Combined Coverage Approach

Use **two complementary coverage metrics**:

#### 1. Code Coverage (JavaScript execution)

Configure in `playwright.config.js`:
```javascript
use: {
  coverage: 'v8'
}
```

Generate reports with NYC after test runs to identify uncovered JavaScript code paths.

#### 2. Element Coverage (UI interaction tracking)

Maintain an **element inventory manifest** that lists every interactive element:

```javascript
// tests/helpers/coverage-tracker.js
export const BASE_STATS_ELEMENTS = {
  classSelectors: [
    'class-hero', 'class-dark-knight', 'class-bowmaster', 'class-marksman',
    'class-night-lord', 'class-shadower', 'class-arch-mage-il', 'class-arch-mage-fp'
  ],
  jobTierButtons: ['job-tier-3rd', 'job-tier-4th'],
  statInputs: [
    'attack-base', 'defense-base', 'crit-rate-base', 'crit-damage-base',
    // ... all inputs
  ],
  masteryCheckboxes: [
    'mastery-3rd-all-64', 'mastery-3rd-all-68',
    // ... all checkboxes
  ],
  contentTypes: [
    'content-none', 'content-stageHunt', 'content-chapterBoss',
    'content-worldBoss', 'content-growthDungeon'
  ],
  dropdowns: ['target-subcategory', 'target-stage-base']
};
```

Track elements as they're tested:
```javascript
import { markElementCovered } from '@helpers/coverage-tracker.js';

test('hero class selector works', async ({ page }) => {
  await page.click('#class-hero');
  await expect(page.locator('#class-hero')).toHaveClass(/selected/);

  markElementCovered('class-hero');
});
```

Generate coverage report after tests:
```javascript
import { generateCoverageReport } from '@helpers/coverage-tracker.js';

test.afterAll(async () => {
  generateCoverageReport();
});
```

**Output:** Markdown report showing tested vs. untested elements

**Rationale:** Code coverage alone doesn't guarantee a button was clicked in a test. Element coverage ensures every interactive element has explicit test assertions.

---

## 6. Edge Cases and User Errors

### Focus on Realistic User Mistakes

Test **common user errors** rather than theoretical edge cases:

**Boundary Values:**
- Min/max inputs (level: 0, 200)
- Extreme values (99999 for stats)
- Decimal handling for percentage fields

**Common User Errors:**
- Clearing required fields
- Rapid clicking (double-clicks)
- Switching contexts mid-configuration
- Incompatible state combinations

**State Validation:**
- Apply fixture → refresh page → verify restoration
- Configure setup → navigate to other tabs → return → verify no data loss
- Manipulate localStorage directly → verify UI recovers gracefully

**Example:**
```javascript
test('refreshing page restores all configured values', async ({ page }) => {
  // Arrange
  await applyBaseStatsFixture(page, HERO_LEVEL_100);

  // Act
  await page.reload();

  // Assert - All values restored
  await expect(page.locator('#character-level')).toHaveValue('100');
  await expect(page.locator('#attack-base')).toHaveValue('450');
  await expect(page.locator('#class-hero')).toHaveClass(/selected/);

  // Assert - localStorage intact
  const level = await page.evaluate(() => localStorage.getItem('characterLevel'));
  expect(level).toBe('100');
});
```

**Rationale:** Focus testing on what actual users will encounter. This catches production bugs without test bloat.

---

## 7. Critical User Workflows

Every feature must test these three workflows:

### 1. Character Setup Workflow
User selects class → sets level → inputs stats → selects job tier → configures bonuses → chooses target content

**Tests:**
- First-time configuration with empty state
- Configuration progression (level 60 → 80 → 100)
- Target content selection and dropdown cascading

### 2. Class/Context Switching Workflow
User has one class configured → switches to different class → verifies state updates appropriately

**Tests:**
- Warrior to Mage (stat rows toggle correctly)
- 3rd job to 4th job (mastery tables switch)
- Content type changes (dropdowns show/hide)
- Persistence across switches

### 3. Configuration Adjustment Workflow
User tweaks individual values → toggles options → changes targets

**Tests:**
- Individual stat input changes
- Mastery checkbox interactions
- Target content re-selection
- Value updates and localStorage sync

### 4. Integration Workflows (Cross-Tab)
Apply basic fixture → navigate to other tabs → perform actions → return → verify persistence

**Tests:**
- Base stats → Equipment → back to Base stats
- Base stats → Any Gear Lab tab → back → verify no data loss
- Full workflow across multiple tabs

**Rationale:** These workflows represent how users actually use the application. Tests should mirror real usage patterns.

---

## 8. Cross-Tab Integration Testing

### Fixtures Enable Cross-Tab Tests

Use the same fixtures across multiple tabs:

```javascript
test('base stats persist when navigating to equipment tab', async ({ page }) => {
  // Arrange - Configure base stats
  await page.goto('/#/setup/base-stats');
  await applyBaseStatsFixture(page, BOWMASTER_LEVEL_90);

  // Act - Navigate to equipment
  await page.goto('/#/setup/equipment');
  await page.waitForTimeout(200);

  // Act - Return to base stats
  await page.goto('/#/setup/base-stats');
  await page.waitForTimeout(200);

  // Assert - All values preserved
  await expect(page.locator('#character-level')).toHaveValue('90');
  await expect(page.locator('#dex-base')).toHaveValue('800');
  await expect(page.locator('#class-bowmaster')).toHaveClass(/selected/);

  // Assert - localStorage intact
  const savedClass = await page.evaluate(() => localStorage.getItem('selectedClass'));
  expect(savedClass).toBe('bowmaster');
});
```

**Rationale:** Ensures data survives navigation between tabs—a common source of bugs in state management.

---

## 9. Test File Checklist

When creating a new test file, ensure it includes:

- [ ] `test.beforeEach` - Navigate to page, clear storage
- [ ] Descriptive `test.describe` blocks grouping related tests
- [ ] Descriptive test names following the pattern
- [ ] Arrange phase with fixtures or setup
- [ ] Act phase with clear user action
- [ ] Assert phase with all three levels (direct, side effects, localStorage)
- [ ] Edge case tests for boundaries
- [ ] State persistence tests (refresh, navigation)
- [ ] Element coverage tracking calls
- [ ] Clear comments explaining complex scenarios

---

## 10. Running Tests

### Command Structure

```bash
# Run all tests
npm test

# Run specific test file
npm test base-stats-main.spec.js

# Run with coverage
npm run test:coverage

# Run in debug mode
npm run test:debug
```

### CI/CD Integration

Tests must pass before merging. Coverage reports should be generated and reviewed for regressions.

---

## 11. Maintenance Guidelines

### When UI Changes

1. Update element inventory in `coverage-tracker.js`
2. Add new selectors to `selectors.js` if reusable
3. Add/update fixtures if new data structure
4. Run tests and update assertions to match new behavior
5. Update this document if patterns change

### When Tests Fail

1. Check if it's a code bug or test needs update
2. Verify all three assertion levels still make sense
3. Update fixture data if thresholds changed
4. Add edge case if new failure mode discovered

### Adding New Features

1. Create element inventory entries first
2. Add fixtures for realistic data
3. Write tests following the three-phase pattern
4. Verify coverage reports show new elements covered
5. Document any new patterns in this file

---

## Appendix: Quick Reference

### Import Pattern
```javascript
import { test, expect } from '@playwright/test';
import { applyBaseStatsFixture } from '@helpers/fixture-helpers.js';
import { clearStorage, markElementCovered } from '@helpers/coverage-tracker.js';
import { HERO_LEVEL_60, HERO_LEVEL_100 } from '@fixtures/base-stats.fixtures.js';
```

### Test Template
```javascript
test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/#/page/tab');
    await clearStorage(page);
  });

  test('descriptive name of what happens', async ({ page }) => {
    // Arrange
    await applyBaseStatsFixture(page, FIXTURE_NAME);

    // Act
    await page.click('#element-id');

    // Assert - Direct
    await expect(page.locator('#element-id')).toHaveClass(/selected/);

    // Assert - Side effects
    await expect(page.locator('#dependent-row')).toBeVisible();

    // Assert - localStorage
    const value = await page.evaluate(() => localStorage.getItem('key'));
    expect(value).toBe('expected');

    // Coverage
    markElementCovered('element-id');
  });
});
```

---

**Questions about these standards?** Refer to existing test files in `tests/` for examples, or update this document to clarify patterns as the project evolves.
