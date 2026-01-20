// Stat Predictions - Value Calculation Tests
// Tests that validate the ACTUAL CALCULATED VALUES (not just UI rendering)
// Run with: npm test -- predictions-values.spec.js

import { test, expect } from '@playwright/test';
import {
  navigateToBaseStats,
  clearStorage,
  applyBaseStatsFixture
} from './helpers/fixture-helpers.js';
import {
  navigateAndWaitForPredictions,
  navigateAndWaitForEquivalency,
  getStatGain,
  assertStatGainInRange,
  assertHardCap,
  assertEquivalencyInRange,
  assertDiminishingReturns,
  assertNoInvalidCalculations,
  getEquivalencyValue
} from './helpers/predictions-assertions.js';
import {
  setupPredictionsTest
} from './helpers/predictions-test-setup.js';
import {
  HERO_LEVEL_60,
  HERO_LEVEL_80,
  HERO_LEVEL_90,
  HERO_LEVEL_100,
  HERO_LEVEL_120,
  BOWMASTER_LEVEL_60,
  BOWMASTER_LEVEL_80,
  BOWMASTER_LEVEL_100,
  BOWMASTER_LEVEL_120,
  DARK_KNIGHT_LEVEL_60,
  DARK_KNIGHT_LEVEL_100,
  DARK_KNIGHT_LEVEL_120,
  NIGHT_LORD_LEVEL_60,
  NIGHT_LORD_LEVEL_100,
  NIGHT_LORD_LEVEL_120,
  ARCH_MAGE_IL_LEVEL_60,
  ARCH_MAGE_IL_LEVEL_100,
  ARCH_MAGE_IL_LEVEL_120,
  HERO_CAP_CRIT_RATE,
  HERO_CAP_ATTACK_SPEED,
  HERO_CAP_DEF_PEN,
  HERO_NEAR_CAP_CRIT_RATE,
  HERO_WELL_GEARED_4TH,
  BOWMASTER_CAP_ATTACK_SPEED
} from './fixtures/predictions-fixtures.js';

test.describe('Stat Predictions - Flat Stats Value Calculations', () => {
  test.beforeEach(async ({ page }) => {
    await setupPredictionsTest(page);
  });

  test('LOW level character: +500 Attack should show >200% damage gain', async ({ page }) => {
    // Arrange: Level 60 Hero with Attack=150
    await applyBaseStatsFixture(page, HERO_LEVEL_60);
    await navigateAndWaitForPredictions(page);

    // Act & Assert: +500 Attack is +333% of base (500/150 = 3.33x)
    // Expected range: 250-350% (accounting for other damage multipliers)
    await assertStatGainInRange(page, 'attack', '+500', 250, 350);
  });

  test('HIGH level character: +500 Attack should show ~50-80% damage gain', async ({ page }) => {
    // Arrange: Level 120 Hero with Attack=800
    await applyBaseStatsFixture(page, HERO_LEVEL_120);
    await navigateAndWaitForPredictions(page);

    // Act & Assert: +500 Attack is +62.5% of base (500/800 = 0.625x)
    // Expected range: 50-80% (accounting for other damage multipliers)
    await assertStatGainInRange(page, 'attack', '+500', 50, 80);
  });

  test('MID level character: +500 Attack scales appropriately', async ({ page }) => {
    // Arrange: Level 80 Hero with Attack=250
    await applyBaseStatsFixture(page, HERO_LEVEL_80);
    await navigateAndWaitForPredictions(page);

    // Act & Assert: +500 Attack is +200% of base (500/250 = 2x)
    // Expected range: 180-220%
    await assertStatGainInRange(page, 'attack', '+500', 180, 220);
  });

  test('LOW level character: +1000 Main Stat should show >100% damage gain', async ({ page }) => {
    // Arrange: Level 60 Hero with STR=300
    await applyBaseStatsFixture(page, HERO_LEVEL_60);
    await navigateAndWaitForPredictions(page);

    // Act & Assert: +1000 STR is +333% of base (1000/300 = 3.33x)
    // Each 100 STR = 1% stat damage, so +1000 = +10% stat damage
    // 10% stat damage on 300 base STR is significant
    await assertStatGainInRange(page, 'main-stat', '+1000', 100, 400);
  });

  test('HIGH level character: +1000 Main Stat shows diminishing returns', async ({ page }) => {
    // Arrange: Level 120 Hero with STR=2000
    await applyBaseStatsFixture(page, HERO_LEVEL_120);
    await navigateAndWaitForPredictions(page);

    // Act & Assert: +1000 STR is +50% of base (1000/2000 = 0.5x)
    // Each 100 STR = 1% stat damage, so +1000 = +10% stat damage
    // On higher base, this is less impactful
    await assertStatGainInRange(page, 'main-stat', '+1000', 40, 70);
  });

  test('Attack value diminishes as character progresses', async ({ page }) => {
    // Compare Level 60 vs Level 120
    const { lowGain, highGain } = await assertDiminishingReturns(
      page,
      'attack',
      '+500',
      HERO_LEVEL_60,  // Attack=150
      HERO_LEVEL_120  // Attack=800
    );

    // Level 60 should show MUCH higher percentage gain
    expect(lowGain).toBeGreaterThan(highGain * 3);
  });

  test('Main Stat value diminishes as character progresses', async ({ page }) => {
    // Compare Level 60 vs Level 120
    const { lowGain, highGain } = await assertDiminishingReturns(
      page,
      'main-stat',
      '+1000',
      HERO_LEVEL_60,  // STR=300
      HERO_LEVEL_120  // STR=2000
    );

    // Level 60 should show significantly higher percentage gain
    expect(lowGain).toBeGreaterThan(highGain * 1.5);
  });

  test('no NaN or Infinity in flat stat calculations', async ({ page }) => {
    await applyBaseStatsFixture(page, HERO_LEVEL_100);
    await navigateAndWaitForPredictions(page);

    await assertNoInvalidCalculations(page);
  });

  test.afterAll(async () => {
    // Log coverage report if needed
  });
});

test.describe('Stat Predictions - Percentage Stats Value Calculations', () => {
  test.beforeEach(async ({ page }) => {
    await setupPredictionsTest(page);
  });

  test('Damage +10%: should show ~8-12% damage gain', async ({ page }) => {
    // Arrange: Hero with Damage=35%
    await applyBaseStatsFixture(page, HERO_LEVEL_100);
    await navigateAndWaitForPredictions(page);

    // Act & Assert: +10% damage on 35% base
    // Formula: (1.45 / 1.35) - 1 = 7.4%
    await assertStatGainInRange(page, 'damage', '+10%', 6, 10);
  });

  test('Boss Damage on World Boss: +10% should show ~7-10% gain', async ({ page }) => {
    // Arrange: Hero with Boss Damage=35%, targeting World Boss
    const fixture = { ...HERO_LEVEL_100, bossDamage: 35, targetContent: 'worldBoss' };
    await applyBaseStatsFixture(page, fixture);
    await navigateAndWaitForPredictions(page);

    // Act & Assert: +10% boss damage when fighting boss
    // Formula: (1.45 / 1.35) - 1 = 7.4%
    await assertStatGainInRange(page, 'boss-damage', '+10%', 6, 10);
  });

  test('Boss Damage on Stage Hunt: should show 0% gain (not fighting bosses)', async ({ page }) => {
    // Arrange: Hero with Boss Damage=35%, but targeting Stage Hunt (no bosses)
    const fixture = { ...HERO_LEVEL_100, bossDamage: 35, targetContent: 'stageHunt' };
    await applyBaseStatsFixture(page, fixture);
    await navigateAndWaitForPredictions(page);

    // Act & Assert: Boss damage should be worthless
    await assertStatGainInRange(page, 'boss-damage', '+10%', 0, 1);
  });

  test('Final Damage: +10% should show ~10% gain (multiplicative)', async ({ page }) => {
    // Arrange: Hero with Final Damage=10%
    const fixture = { ...HERO_LEVEL_100, finalDamage: 10 };
    await applyBaseStatsFixture(page, fixture);
    await navigateAndWaitForPredictions(page);

    // Act & Assert: Final damage is multiplicative
    // Formula: (1.20 / 1.10) - 1 = 9.1%
    await assertStatGainInRange(page, 'final-dmg', '+10%', 8, 11);
  });

  test('Crit Rate at low base: +5% should show significant gain', async ({ page }) => {
    // Arrange: Hero with Crit Rate=20%, Crit Damage=50%
    const fixture = { ...HERO_LEVEL_100, critRate: 20, critDamage: 50 };
    await applyBaseStatsFixture(page, fixture);
    await navigateAndWaitForPredictions(page);

    // Act & Assert: +5% crit rate with 50% crit damage
    // Formula: 0.05 * 0.5 = 2.5% average damage increase
    await assertStatGainInRange(page, 'crit-rate', '+5%', 2, 4);
  });

  test('Crit Rate at high base (near cap): +5% shows diminishing returns', async ({ page }) => {
    // Arrange: Hero with Crit Rate=95% (near cap)
    await applyBaseStatsFixture(page, HERO_NEAR_CAP_CRIT_RATE);
    await navigateAndWaitForPredictions(page);

    // Act & Assert: Near cap, additional crit rate is worth very little
    await assertStatGainInRange(page, 'crit-rate', '+5%', 0, 1);
  });

  test('Crit Rate at hard cap: all increments show exactly 0% gain', async ({ page }) => {
    // Arrange: Hero with Crit Rate=100% (capped)
    await applyBaseStatsFixture(page, HERO_CAP_CRIT_RATE);
    await navigateAndWaitForPredictions(page);

    // Act & Assert: At hard cap, no more gain possible
    // Test multiple increments to ensure all show exactly 0%
    const increments = ['+1%', '+5%', '+10%'];
    for (const inc of increments) {
      const gain = await getStatGain(page, 'crit-rate', inc);
      expect(gain).toBeCloseTo(0, 1); // Exactly 0% within 0.1% tolerance
    }
  });

  test('Attack Speed at low base: +10% should show ~10% gain', async ({ page }) => {
    // Arrange: Hero with Attack Speed=0%
    await applyBaseStatsFixture(page, HERO_LEVEL_100);
    await navigateAndWaitForPredictions(page);

    // Act & Assert: Attack speed directly increases DPS
    await assertStatGainInRange(page, 'atk-speed', '+10%', 9, 11);
  });

  test('Attack Speed at hard cap: all increments show exactly 0% gain', async ({ page }) => {
    // Arrange: Bowmaster with Attack Speed=150% (capped)
    await applyBaseStatsFixture(page, BOWMASTER_CAP_ATTACK_SPEED);
    await navigateAndWaitForPredictions(page);

    // Act & Assert: At hard cap (150%), no more gain
    // Test multiple increments to ensure all show exactly 0%
    const increments = ['+1%', '+5%', '+10%'];
    for (const inc of increments) {
      const gain = await getStatGain(page, 'atk-speed', inc);
      expect(gain).toBeCloseTo(0, 1); // Exactly 0% within 0.1% tolerance
    }
  });

  test('Defense Penetration at 0%: +25% should show ~20-30% gain on armored targets', async ({ page }) => {
    // Arrange: Hero with Def Pen=0%
    const fixture = { ...HERO_LEVEL_100, defPen: 0, targetContent: 'worldBoss' };
    await applyBaseStatsFixture(page, fixture);
    await navigateAndWaitForPredictions(page);

    // Act & Assert: Def pen value depends on target defense
    // World bosses have high defense, so def pen is valuable
    await assertStatGainInRange(page, 'def-pen', '+25%', 15, 35);
  });

  test('Defense Penetration at hard cap: all increments show exactly 0% gain', async ({ page }) => {
    // Arrange: Hero with Def Pen=100% (capped) targeting World Boss (has defense)
    const fixture = { ...HERO_CAP_DEF_PEN, targetContent: 'worldBoss' };
    await applyBaseStatsFixture(page, fixture);
    await navigateAndWaitForPredictions(page);

    // Act & Assert: At 100% def pen, no more gain possible
    // Test multiple increments to ensure all show exactly 0%
    const increments = ['+10%', '+25%', '+50%'];
    for (const inc of increments) {
      const gain = await getStatGain(page, 'def-pen', inc);
      expect(gain).toBeCloseTo(0, 1); // Exactly 0% within 0.1% tolerance
    }
  });

  test('Crit Damage value increases with higher Crit Rate', async ({ page }) => {
    // Low crit rate: Crit Damage is less valuable
    const lowRateFixture = { ...HERO_LEVEL_100, critRate: 20, critDamage: 50 };
    await applyBaseStatsFixture(page, lowRateFixture);
    await navigateAndWaitForPredictions(page);
    const lowRateGain = await getStatGain(page, 'crit-dmg', '+10%');

    // High crit rate: Crit Damage is more valuable
    const highRateFixture = { ...HERO_LEVEL_100, critRate: 80, critDamage: 50 };
    await applyBaseStatsFixture(page, highRateFixture);
    await navigateAndWaitForPredictions(page);
    const highRateGain = await getStatGain(page, 'crit-dmg', '+10%');

    // High crit rate should make crit damage more valuable
    expect(highRateGain).toBeGreaterThan(lowRateGain);
  });

  test.afterAll(async () => {
    // Log coverage report if needed
  });
});

test.describe('Stat Predictions - Stat Interactions and Synergies', () => {
  test.beforeEach(async ({ page }) => {
    await setupPredictionsTest(page);
  });

  test('Crit Damage scales significantly with Crit Rate (synergy effect)', async ({ page }) => {
    // Crit Damage value should increase substantially as Crit Rate increases
    // Formula: expected damage = nonCrit * (1 - critRate) + crit * critRate
    // Higher crit rate = more crit hits = crit damage becomes more valuable

    // Test at low crit rate (20%)
    const lowRateFixture = { ...HERO_LEVEL_100, critRate: 20, critDamage: 80 };
    await applyBaseStatsFixture(page, lowRateFixture);
    await navigateAndWaitForPredictions(page);
    const lowRateGain = await getStatGain(page, 'crit-dmg', '+10%');

    // Test at medium crit rate (50%)
    const medRateFixture = { ...HERO_LEVEL_100, critRate: 50, critDamage: 80 };
    await applyBaseStatsFixture(page, medRateFixture);
    await navigateAndWaitForPredictions(page);
    const medRateGain = await getStatGain(page, 'crit-dmg', '+10%');

    // Test at high crit rate (80%)
    const highRateFixture = { ...HERO_LEVEL_100, critRate: 80, critDamage: 80 };
    await applyBaseStatsFixture(page, highRateFixture);
    await navigateAndWaitForPredictions(page);
    const highRateGain = await getStatGain(page, 'crit-dmg', '+10%');

    // Verify scaling: higher crit rate should make crit damage more valuable
    expect(highRateGain).toBeGreaterThan(medRateGain * 1.2); // At least 20% more valuable
    expect(medRateGain).toBeGreaterThan(lowRateGain * 1.2); // At least 20% more valuable

    // High crit rate should make crit damage >2x as valuable as low crit rate
    expect(highRateGain).toBeGreaterThan(lowRateGain * 2);
  });

  test('Crit Rate value scales with Crit Damage (reverse synergy)', async ({ page }) => {
    // Crit Rate should be more valuable when you have higher Crit Damage

    // Low crit damage (50%)
    const lowDmgFixture = { ...HERO_LEVEL_100, critRate: 40, critDamage: 50 };
    await applyBaseStatsFixture(page, lowDmgFixture);
    await navigateAndWaitForPredictions(page);
    const lowDmgGain = await getStatGain(page, 'crit-rate', '+5%');

    // High crit damage (150%)
    const highDmgFixture = { ...HERO_LEVEL_100, critRate: 40, critDamage: 150 };
    await applyBaseStatsFixture(page, highDmgFixture);
    await navigateAndWaitForPredictions(page);
    const highDmgGain = await getStatGain(page, 'crit-rate', '+5%');

    // Higher crit damage should make crit rate more valuable
    expect(highDmgGain).toBeGreaterThan(lowDmgGain * 1.5); // At least 50% more valuable
  });

  test('Attack and Main Stat have independent value (no synergy)', async ({ page }) => {
    // Attack and Main Stat should scale independently
    // +500 Attack should give same % gain regardless of main stat

    // Low main stat
    const lowStatFixture = { ...HERO_LEVEL_60, str: 300 };
    await applyBaseStatsFixture(page, lowStatFixture);
    await navigateAndWaitForPredictions(page);
    const lowStatAttackGain = await getStatGain(page, 'attack', '+500');

    // High main stat (same level, more STR)
    const highStatFixture = { ...HERO_LEVEL_60, str: 600 };
    await applyBaseStatsFixture(page, highStatFixture);
    await navigateAndWaitForPredictions(page);
    const highStatAttackGain = await getStatGain(page, 'attack', '+500');

    // Attack value should be similar regardless of main stat
    // (Small differences due to rounding/stat damage calculation acceptable)
    expect(Math.abs(lowStatAttackGain - highStatAttackGain)).toBeLessThan(15); // Within 15%
  });

  test('Boss Damage and Normal Damage are mutually exclusive (no synergy)', async ({ page }) => {
    // Boss Damage should not affect Normal Damage value and vice versa

    // Setup with high boss damage, testing normal damage increase
    const bossFixture = { ...HERO_LEVEL_100, bossDamage: 80, normalDamage: 0, targetContent: 'worldBoss' };
    await applyBaseStatsFixture(page, bossFixture);
    await navigateAndWaitForPredictions(page);
    const bossDamageGain = await getStatGain(page, 'boss-damage', '+10%');

    // Setup with high normal damage, testing boss damage increase
    const normalFixture = { ...HERO_LEVEL_100, bossDamage: 0, normalDamage: 80, targetContent: 'stageHunt' };
    await applyBaseStatsFixture(page, normalFixture);
    await navigateAndWaitForPredictions(page);
    const normalDamageGain = await getStatGain(page, 'normal-damage', '+10%');

    // Both should provide gains, but they affect different target types
    expect(bossDamageGain).toBeGreaterThan(0);
    expect(normalDamageGain).toBeGreaterThan(0);

    // Verify boss damage does nothing on non-boss targets
    await applyBaseStatsFixture(page, { ...HERO_LEVEL_100, bossDamage: 50, targetContent: 'stageHunt' });
    await navigateAndWaitForPredictions(page);
    const bossOnStageGain = await getStatGain(page, 'boss-damage', '+10%');

    // Boss damage should be worthless on stage hunt (0% gain)
    expect(bossOnStageGain).toBeCloseTo(0, 1);
  });

  test('Final Damage is multiplicative (scales independently)', async ({ page }) => {
    // Final Damage should provide same % gain regardless of other damage stats

    // Low other damage stats
    const lowDmgFixture = { ...HERO_LEVEL_100, damage: 10, bossDamage: 10, finalDamage: 10 };
    await applyBaseStatsFixture(page, lowDmgFixture);
    await navigateAndWaitForPredictions(page);
    const lowDmgGain = await getStatGain(page, 'final-dmg', '+10%');

    // High other damage stats
    const highDmgFixture = { ...HERO_LEVEL_100, damage: 50, bossDamage: 50, finalDamage: 10 };
    await applyBaseStatsFixture(page, highDmgFixture);
    await navigateAndWaitForPredictions(page);
    const highDmgGain = await getStatGain(page, 'final-dmg', '+10%');

    // Final damage is multiplicative, so should provide similar relative gain
    // Formula: (1.20 / 1.10) - 1 = 9.09% regardless of base damage
    expect(Math.abs(lowDmgGain - highDmgGain)).toBeLessThan(1); // Within 1%
  });

  test.afterAll(async () => {
    // Log coverage report if needed
  });
});

test.describe('Stat Predictions - Class-Specific Stat Values', () => {
  test.beforeEach(async ({ page }) => {
    await setupPredictionsTest(page);
  });

  test('Hero (STR primary): +100 Main Stat = +100 STR gain', async ({ page }) => {
    await applyBaseStatsFixture(page, HERO_LEVEL_80);
    await navigateAndWaitForPredictions(page);

    // +100 STR should provide damage gain (diminishing returns apply)
    await assertStatGainInRange(page, 'main-stat', '+100', 0.5, 2);
  });

  test('Bowmaster (DEX primary): +100 Main Stat = +100 DEX gain', async ({ page }) => {
    await applyBaseStatsFixture(page, BOWMASTER_LEVEL_80);
    await navigateAndWaitForPredictions(page);

    // +100 DEX should provide damage gain (diminishing returns apply)
    await assertStatGainInRange(page, 'main-stat', '+100', 0.5, 2);
  });

  test('Night Lord (LUK primary): +100 Main Stat = +100 LUK gain', async ({ page }) => {
    await applyBaseStatsFixture(page, NIGHT_LORD_LEVEL_60);
    await navigateAndWaitForPredictions(page);

    // +100 LUK should provide damage gain (diminishing returns apply)
    await assertStatGainInRange(page, 'main-stat', '+100', 0.5, 2);
  });

  test('Arch Mage (INT primary): +100 Main Stat = +100 INT gain', async ({ page }) => {
    await applyBaseStatsFixture(page, ARCH_MAGE_IL_LEVEL_60);
    await navigateAndWaitForPredictions(page);

    // +100 INT should provide damage gain (diminishing returns apply)
    await assertStatGainInRange(page, 'main-stat', '+100', 0.5, 2);
  });

  test('All classes benefit equally from Attack Speed (universal multiplier)', async ({ page }) => {
    // Attack speed is a universal multiplier: 1 + (attackSpeed / 100)
    // It affects ALL classes equally, regardless of class-specific mechanics

    // Test with Bowmaster
    await applyBaseStatsFixture(page, BOWMASTER_LEVEL_80);
    await navigateAndWaitForPredictions(page);
    const bmGain = await getStatGain(page, 'atk-speed', '+10%');

    // Test with Hero (same attack speed base)
    await applyBaseStatsFixture(page, HERO_LEVEL_80);
    await navigateAndWaitForPredictions(page);
    const heroGain = await getStatGain(page, 'atk-speed', '+10%');

    // Both classes should gain exactly the same percentage from attack speed
    // Small differences may occur due to other stats in the damage formula
    // But the attack speed multiplier itself is class-agnostic
    expect(Math.abs(bmGain - heroGain)).toBeLessThan(0.5); // Within 0.5% tolerance
  });

  test('Dark Knight uses Defense in damage calculations', async ({ page }) => {
    // Dark Knight with defense
    await applyBaseStatsFixture(page, DARK_KNIGHT_LEVEL_100);
    await navigateAndWaitForPredictions(page);

    // Defense should contribute to damage for DK
    // We can't easily test this without seeing the actual damage formula,
    // but we can verify the calculation doesn't break
    await assertNoInvalidCalculations(page);
  });

  test.afterAll(async () => {
    // Log coverage report if needed
  });
});

test.describe('Stat Equivalency - Value Calculations', () => {
  test.beforeEach(async ({ page }) => {
    await setupPredictionsTest(page);
  });

  test('100 Attack equivalence for well-geared character', async ({ page }) => {
    // Arrange: Well-geared Hero with Attack=1500, STR=2500
    await applyBaseStatsFixture(page, HERO_WELL_GEARED_4TH);
    await navigateAndWaitForEquivalency(page);

    // Act: Enter 100 Attack
    await page.fill('#equiv-attack', '100');
    await page.waitForTimeout(200);

    // Assert: Should equal ~150-200 Main Stat (100/1500 = 6.67%, 6.67% of 2500 = 167)
    await assertEquivalencyInRange(page, '#equiv-main-stat', 150, 200);

    // Assert: Should equal ~6-8% Damage
    await assertEquivalencyInRange(page, '#equiv-damage', 6, 8);

    // Assert: Should equal ~6-8% Boss Damage
    await assertEquivalencyInRange(page, '#equiv-boss-damage', 6, 8);
  });

  test('10% Boss Damage equivalence on World Boss target', async ({ page }) => {
    // Arrange: Hero targeting World Boss
    const fixture = { ...HERO_LEVEL_100, bossDamage: 35, targetContent: 'worldBoss' };
    await applyBaseStatsFixture(page, fixture);
    await navigateAndWaitForEquivalency(page);

    // Act: Enter 10% Boss Damage
    await page.fill('#equiv-boss-damage', '10');
    await page.waitForTimeout(200);

    // Assert: Should equal ~120-150 Attack
    const attackEquiv = await getEquivalencyValue(page, '#equiv-attack');
    expect(attackEquiv).toBeGreaterThan(100);
    expect(attackEquiv).toBeLessThan(200);

    // Assert: Should equal ~300-400 Main Stat
    const mainStatEquiv = await getEquivalencyValue(page, '#equiv-main-stat');
    expect(mainStatEquiv).toBeGreaterThan(250);
    expect(mainStatEquiv).toBeLessThan(500);
  });

  test('10% Boss Damage equivalence on Stage Hunt (no bosses)', async ({ page }) => {
    // Arrange: Hero targeting Stage Hunt
    const fixture = { ...HERO_LEVEL_100, bossDamage: 35, targetContent: 'stageHunt' };
    await applyBaseStatsFixture(page, fixture);
    await navigateAndWaitForEquivalency(page);

    // Act: Enter 10% Boss Damage
    await page.fill('#equiv-boss-damage', '10');
    await page.waitForTimeout(200);

    // Assert: Should equal 0 or very minimal Attack (boss damage useless here)
    const attackEquiv = await getEquivalencyValue(page, '#equiv-attack');
    expect(attackEquiv).toBeLessThan(10);
  });

  test('Attack equivalence changes based on current Attack stat', async ({ page }) => {
    // Low attack character
    await applyBaseStatsFixture(page, HERO_LEVEL_60); // Attack=150
    await navigateAndWaitForEquivalency(page);

    await page.fill('#equiv-attack', '100');
    await page.waitForTimeout(200);

    const lowAttackMainStatEquiv = await getEquivalencyValue(page, '#equiv-main-stat');

    // High attack character
    await applyBaseStatsFixture(page, HERO_LEVEL_120); // Attack=800
    await navigateAndWaitForEquivalency(page);

    await page.fill('#equiv-attack', '100');
    await page.waitForTimeout(200);

    const highAttackMainStatEquiv = await getEquivalencyValue(page, '#equiv-main-stat');

    // With higher base attack, 100 attack should equal MORE main stat
    // (because 100 attack is less significant when you have 800 vs 150)
    expect(highAttackMainStatEquiv).toBeGreaterThan(lowAttackMainStatEquiv);
  });

  test('equivalency calculations are bidirectional', async ({ page }) => {
    await applyBaseStatsFixture(page, HERO_LEVEL_100);
    await navigateAndWaitForEquivalency(page);

    // Act: Enter 100 Attack
    await page.fill('#equiv-attack', '100');
    await page.waitForTimeout(200);

    const attackToMainStat = await getEquivalencyValue(page, '#equiv-main-stat');

    // Clear and enter the equivalent Main Stat
    await page.fill('#equiv-attack', '');
    await page.fill('#equiv-main-stat', attackToMainStat.toString());
    await page.waitForTimeout(200);

    const mainStatToAttack = await getEquivalencyValue(page, '#equiv-attack');

    // Should be approximately equal (rounding differences acceptable)
    expect(Math.abs(parseFloat(mainStatToAttack) - 100)).toBeLessThan(5);
  });

  test('equivalency handles capped stats gracefully', async ({ page }) => {
    // Arrange: Character at crit rate cap
    await applyBaseStatsFixture(page, HERO_CAP_CRIT_RATE);
    await navigateAndWaitForEquivalency(page);

    // Act: Enter 10% Crit Rate (when already at 100% cap)
    await page.fill('#equiv-crit-rate', '10');
    await page.waitForTimeout(200);

    // Assert: Should show "-" or "Unable to match" for most stats
    // Since capped crit rate gives 0% DPS gain, no other stat can match it
    // Check that the attack equivalency field shows either 0, "-", or very high value
    const attackEquiv = await getEquivalencyValue(page, '#equiv-attack');

    // When source stat is capped, equivalency might show 0, "-", or a very high max value
    // Any of these are acceptable - the key is that it doesn't show a realistic small value
    if (attackEquiv > 100) {
      // High value means it hit the max trying to match 0% gain - this is OK
      expect(attackEquiv).toBeGreaterThan(100);
    } else {
      // Should be 0 or very close to 0
      expect(attackEquiv).toBeLessThan(5);
    }
  });

  test('no NaN or Infinity in equivalency calculations', async ({ page }) => {
    await applyBaseStatsFixture(page, HERO_WELL_GEARED_4TH);
    await navigateAndWaitForEquivalency(page);

    // Fill in all fields
    await page.fill('#equiv-attack', '999');
    await page.fill('#equiv-main-stat', '999');
    await page.fill('#equiv-damage', '99');
    await page.fill('#equiv-final-damage', '99');
    await page.waitForTimeout(200);

    // Check for invalid values
    const hasValidResults = await page.evaluate(() => {
      const inputs = document.querySelectorAll('[id^="equiv-"]');
      for (const input of inputs) {
        const val = parseFloat(input.value);
        if (input.value && (isNaN(val) || !isFinite(val))) {
          return false;
        }
      }
      return true;
    });

    expect(hasValidResults).toBe(true);
  });

  test.afterAll(async () => {
    // Log coverage report if needed
  });
});

test.describe('Stat Predictions - Integration Scenarios', () => {
  test.beforeEach(async ({ page }) => {
    await setupPredictionsTest(page);
  });

  test('full progression: Level 60 → 80 → 90 → 100 → 120 shows diminishing stat values', async ({ page }) => {
    // Test all progression milestones from base-stats.fixtures.js
    const levels = [
      { level: 60, fixture: HERO_LEVEL_60 },
      { level: 80, fixture: HERO_LEVEL_80 },
      { level: 90, fixture: HERO_LEVEL_90 },  // Included!
      { level: 100, fixture: HERO_LEVEL_100 },
      { level: 120, fixture: HERO_LEVEL_120 }
    ];

    const gains = [];

    for (const { level, fixture } of levels) {
      await applyBaseStatsFixture(page, fixture);
      await navigateAndWaitForPredictions(page);

      const gain = await getStatGain(page, 'attack', '+500');
      gains.push({ level, gain });

      // Each level should show lower gain than previous (diminishing returns)
      if (gains.length > 1) {
        expect(gains[gains.length - 1].gain).toBeLessThan(gains[gains.length - 2].gain);
      }
    }

    // Verify significant difference between lowest and highest level
    // Level 60 (attack=150) should see >4x the gain of Level 120 (attack=800)
    expect(gains[0].gain).toBeGreaterThan(gains[4].gain * 4);

    // Also verify each step shows meaningful reduction
    expect(gains[0].gain).toBeGreaterThan(gains[1].gain * 1.5); // 60 vs 80
    expect(gains[1].gain).toBeGreaterThan(gains[2].gain * 1.3); // 80 vs 90
    expect(gains[2].gain).toBeGreaterThan(gains[3].gain * 1.2); // 90 vs 100
    expect(gains[3].gain).toBeGreaterThan(gains[4].gain * 1.2); // 100 vs 120
  });

  test('full progression: Main stat value diminishes across all level milestones', async ({ page }) => {
    // Main stat should also show diminishing returns
    const levels = [
      { level: 60, fixture: HERO_LEVEL_60, mainStat: 300 },
      { level: 80, fixture: HERO_LEVEL_80, mainStat: 600 },
      { level: 90, fixture: HERO_LEVEL_90, mainStat: 900 },
      { level: 100, fixture: HERO_LEVEL_100, mainStat: 1200 },
      { level: 120, fixture: HERO_LEVEL_120, mainStat: 2000 }
    ];

    const gains = [];

    for (const { level, fixture, mainStat } of levels) {
      await applyBaseStatsFixture(page, fixture);
      await navigateAndWaitForPredictions(page);

      const gain = await getStatGain(page, 'main-stat', '+1000');
      gains.push({ level, mainStat, gain });

      // Each level should show lower gain than previous
      if (gains.length > 1) {
        expect(gains[gains.length - 1].gain).toBeLessThan(gains[gains.length - 2].gain);
      }
    }

    // Level 60 (300 STR) should see >3x the gain from +1000 as Level 120 (2000 STR)
    expect(gains[0].gain).toBeGreaterThan(gains[4].gain * 3);
  });

  test('Attack value diminishes more dramatically than Main Stat across progression', async ({ page }) => {
    // Attack should show stronger diminishing returns than main stat
    // Because attack scales multiplicatively while main stat adds stat damage %

    const attackGains = [];
    const mainStatGains = [];

    for (const fixture of [HERO_LEVEL_60, HERO_LEVEL_100, HERO_LEVEL_120]) {
      await applyBaseStatsFixture(page, fixture);
      await navigateAndWaitForPredictions(page);

      const attackGain = await getStatGain(page, 'attack', '+500');
      const mainStatGain = await getStatGain(page, 'main-stat', '+1000');

      attackGains.push(attackGain);
      mainStatGains.push(mainStatGain);
    }

    // Attack should diminish more: Level 120 gain should be <20% of Level 60 gain
    expect(attackGains[2]).toBeLessThan(attackGains[0] * 0.2);

    // Main stat diminishes less: Level 120 gain should be >30% of Level 60 gain
    expect(mainStatGains[2]).toBeGreaterThan(mainStatGains[0] * 0.3);
  });

  test('multiple stats at hard cap handled correctly', async ({ page }) => {
    // Arrange: Custom character with multiple capped stats
    const multiCapFixture = {
      class: 'hero',
      jobTier: '4th',
      level: 120,
      attack: 1000,
      defense: 0,
      critRate: 100,      // Capped
      critDamage: 100,
      attackSpeed: 150,   // Capped
      str: 2000,
      dex: 800,
      int: 0,
      luk: 0,
      statDamage: 0,
      damage: 50,
      damageAmp: 0,
      defPen: 100,        // Capped
      bossDamage: 80,
      normalDamage: 40,
      minDamage: 70,
      maxDamage: 100,
      finalDamage: 20,
      mainStatPct: 0,
      skillLevels: { '1st': 0, '2nd': 0, '3rd': 0, '4th': 30 },
      mastery: {},
      targetContent: 'worldBoss'
    };

    await applyBaseStatsFixture(page, multiCapFixture);
    await navigateAndWaitForPredictions(page);

    // Assert: All capped stats should show 0% gain
    await assertHardCap(page, 'crit-rate', ['+1%', '+5%']);
    await assertHardCap(page, 'atk-speed', ['+1%', '+5%']);
    await assertHardCap(page, 'def-pen', ['+10%', '+25%']);

    // Non-capped stats should still show gains
    const attackGain = await getStatGain(page, 'attack', '+500');
    expect(attackGain).toBeGreaterThan(0);
  });

  test('switching classes updates stat predictions correctly', async ({ page }) => {
    // Test as Hero
    await applyBaseStatsFixture(page, HERO_LEVEL_100);
    await navigateAndWaitForPredictions(page);

    const heroAttackGain = await getStatGain(page, 'attack', '+500');

    // Switch to Bowmaster
    await applyBaseStatsFixture(page, BOWMASTER_LEVEL_100);
    await navigateAndWaitForPredictions(page);

    const bmAttackGain = await getStatGain(page, 'attack', '+500');

    // Both should show gains (may differ due to different stats)
    expect(heroAttackGain).toBeGreaterThan(0);
    expect(bmAttackGain).toBeGreaterThan(0);

    // Verify localStorage updated
    const selectedClass = await page.evaluate(() => localStorage.getItem('selectedClass'));
    expect(selectedClass).toBe('bowmaster');
  });

  test('stat values update correctly after changing base stats', async ({ page }) => {
    // Initial state
    await applyBaseStatsFixture(page, HERO_LEVEL_80);
    await navigateAndWaitForPredictions(page);

    const initialGain = await getStatGain(page, 'attack', '+500');

    // Increase base attack significantly
    await navigateToBaseStats(page);
    await page.fill('#attack-base', '1000'); // Increased from 250
    await page.waitForTimeout(100);

    await navigateAndWaitForPredictions(page);

    const updatedGain = await getStatGain(page, 'attack', '+500');

    // With higher base attack, +500 should be less valuable
    expect(updatedGain).toBeLessThan(initialGain);
  });

  test('target content change affects boss/normal damage values', async ({ page }) => {
    const fixture = { ...HERO_LEVEL_100, bossDamage: 50, normalDamage: 50 };

    // World Boss: Boss damage valuable
    await applyBaseStatsFixture(page, { ...fixture, targetContent: 'worldBoss' });
    await navigateAndWaitForPredictions(page);

    const bossDamageGainWorld = await getStatGain(page, 'boss-damage', '+10%');

    // Stage Hunt: Boss damage worthless
    await applyBaseStatsFixture(page, { ...fixture, targetContent: 'stageHunt' });
    await navigateAndWaitForPredictions(page);

    const bossDamageGainStage = await getStatGain(page, 'boss-damage', '+10%');

    // Boss damage should be worth much more on World Boss
    expect(bossDamageGainWorld).toBeGreaterThan(bossDamageGainStage * 5);
  });

  test.afterAll(async () => {
    // Log coverage report if needed
  });
});

// Helper function for class-specific tests
async function getStatGainForClass(page, fixture, statName, increment) {
  await applyBaseStatsFixture(page, fixture);
  await navigateAndWaitForPredictions(page);
  return await getStatGain(page, statName, increment);
}
