# Inner Ability TypeScript Conversion Design

**Date:** 2025-01-24
**Status:** Validated ✅
**Author:** Claude (Brainstorming Session)

---

## Overview

Convert the Inner Ability tab from JavaScript to TypeScript, following the established patterns used in base-stats and weapon-levels. This conversion introduces a new `gearLabStore` for centralized data management and cleanly separates business logic from UI generation.

---

## Architecture

### Three-File Structure (plus Store)

**1. `src/ts/page/inner-ability/inner-ability.ts`** - Core business logic layer
- Pure calculation functions: `mapInnerAbilityStat()`, `applyInnerAbilityLines()`, `calculatePresetComparisons()`, `calculateTheoreticalBest()`, `calculateBestCombinations()`
- Uses `StatCalculationService` for all stat manipulations
- Returns data structures, never touches the DOM
- Imports data from `@data/inner-ability-data.ts` and store from `@ts/store/gear-lab-store.ts`

**2. `src/ts/page/inner-ability/inner-ability-ui.ts`** - UI generation and DOM manipulation
- All HTML generation: `renderPresetComparison()`, `renderTheoreticalBest()`, preset cards HTML
- DOM event handlers: tab switching, line breakdown toggles, table sorting
- Calls logic functions from `inner-ability.ts` to get data, then renders it
- Attaches event listeners and manages UI state
- Exposes functions to `window` for HTML `onclick` compatibility
- Merges functionality from current `presets-ui.js`

**3. `src/ts/page/inner-ability/inner-ability.types.ts`** - Feature-specific type definitions
- Interfaces used within the inner-ability feature
- Shared between logic and UI layers

**4. `src/ts/store/gear-lab-store.ts`** - Centralized data store
- Singleton pattern following `loadoutStore` exactly
- Manages Inner Ability presets (10 presets with 6 lines each)
- Handles migration from 'heroPowerPresets' localStorage
- Extensible for future Gear Lab features (cube strategies, scroll optimization, etc.)

---

## The gearLabStore Design

### Location
`src/ts/store/gear-lab-store.ts`

### Data Structure

```typescript
interface GearLabData {
  innerAbility: {
    presets: {
      [key: number]: {  // 1-10
        isEquipped: boolean;
        lines: InnerAbilityLine[];  // Up to 6 lines
      }
    };
    // Future: cubeStrategies, scrollOptimization, etc.
  };
}

const DEFAULT_GEAR_LAB_DATA: GearLabData = {
  innerAbility: {
    presets: {
      1: { isEquipped: false, lines: [] },
      2: { isEquipped: false, lines: [] },
      // ... up to 10
    }
  }
};
```

### Key Methods

**Initialization:**
- `async initialize(): Promise<void>` - Loads from 'gear-lab-data', migrates from 'heroPowerPresets' if needed
- `private migrateFromLegacy(): void` - Migrates old 'heroPowerPresets' format
- `private validateAndFillDefaults(): void` - Ensures all 10 presets exist

**Getters:**
- `getInnerAbilityPresets(): Record<number, InnerAbilityPreset>` - Returns all presets
- `getPreset(id: number): InnerAbilityPreset | null` - Returns single preset
- `getEquippedPresetId(): number | null` - Returns currently equipped preset

**Setters:**
- `updatePreset(id: number, data: Partial<InnerAbilityPreset>): void` - Updates preset and saves
- `setEquippedPreset(id: number): void` - Sets which preset is equipped (ensures only one)
- `updatePresetLine(presetId: number, lineIndex: number, line: InnerAbilityLine): void` - Updates single line

**Persistence:**
- `private saveDualWrite(): void` - Saves to 'gear-lab-data' localStorage key

### Migration Strategy

1. On first load, check for 'heroPowerPresets' key
2. If found, migrate data to new 'gear-lab-data' format
3. Validate and fill missing presets with defaults
4. Save to new 'gear-lab-data' key
5. Clean up old 'heroPowerPresets' key after successful migration

### Singleton Export

```typescript
export const gearLabStore = new GearLabStore();
```

---

## Type Definitions

### Location: `src/ts/types/page/gear-lab/gear-lab.types.ts`

**Core Interfaces:**

```typescript
// Individual inner ability line
export interface InnerAbilityLine {
  stat: string;  // e.g., "Boss Monster Damage"
  value: number;  // e.g., 40
}

// A complete preset (1-10)
export interface InnerAbilityPreset {
  id: number;  // 1-10
  isEquipped: boolean;
  lines: InnerAbilityLine[];  // Up to 6 lines, can be empty
}

// Result from preset comparison calculation
export interface PresetComparisonResult {
  id: number;
  isEquipped: boolean;
  lines: InnerAbilityLine[];
  bossDPSGain: number;
  normalDPSGain: number;
  lineContributions: Array<{
    stat: string;
    value: number;
    dpsContribution: number;
  }>;
}

// Result from theoretical best calculation
export interface TheoreticalRollResult {
  stat: string;
  rarity: string;  // 'Mystic', 'Legendary', etc.
  roll: 'Min' | 'Mid' | 'Max';
  value: number;
  dpsGain: number;
  percentIncrease: number;
}

// Best combination result
export interface BestCombinationResult {
  lines: Array<{
    stat: string;
    rarity: string;
    value: number;
    dpsGain?: number;
  }>;
  totalDPS: number;
}

// Complete gear lab data structure
export interface GearLabData {
  innerAbility: {
    presets: Record<number, InnerAbilityPreset>;
  };
}
```

### Feature-Specific Types: `src/ts/page/inner-ability/inner-ability.types.ts`

Additional types used specifically within the inner-ability feature (not shared with store).

---

## Data Flow & Initialization

### Initialization Sequence (called when app loads)

**Step 1: Store Initialization**
```typescript
await gearLabStore.initialize();
```
- Loads from 'gear-lab-data' localStorage key
- Migrates from 'heroPowerPresets' if needed
- Validates and fills defaults

**Step 2: UI Generation**
```typescript
export function initializeInnerAbilityUI(): void {
  const container = document.getElementById('optimization-inner-ability');
  if (!container) {
    console.error('Inner ability container not found');
    return;
  }

  container.innerHTML = generateInnerAbilityHTML();
  attachInnerAbilityEventListeners();
  renderPresetComparison();  // Pre-render comparison tab
  renderTheoreticalBest();   // Pre-render theoretical tab
}
```
- Generates all HTML dynamically
- Attaches event listeners
- Pre-renders comparison tables

**Step 3: Data Loading**
```typescript
export function loadInnerAbilityFromStore(): void {
  const presets = gearLabStore.getInnerAbilityPresets();
  // Populate all preset inputs from store data
}
```
- Populates all preset inputs with saved values
- Restores equipped preset state

### User Interaction Flow

1. **User changes preset input:**
   - Event listener fires
   - Calls `gearLabStore.updatePreset()`
   - Store saves to localStorage automatically
   - Comparison tables re-render with new data

2. **User switches tabs:**
   - `switchInnerAbilityTab()` toggles visibility
   - Triggers render if needed (comparison/theoretical)

3. **User sorts table:**
   - Sort state updated
   - Table re-renders with new sort order

---

## File Organization

### New Files to Create

```
src/ts/page/inner-ability/
  ├── inner-ability.ts          (Core logic)
  ├── inner-ability-ui.ts       (UI generation + presets)
  └── inner-ability.types.ts    (Feature-specific types)

src/ts/store/
  └── gear-lab-store.ts         (Data store)

src/ts/types/page/gear-lab/
  └── gear-lab.types.ts         (Store types)

src/data/
  └── inner-ability-data.ts     (Convert from .js, add types)
```

### Files to Delete/Replace

- `src/core/features/inner-ability/inner-ability.js` → Replaced by TS versions
- `src/ui/presets-ui.js` → Merged into `inner-ability-ui.ts`
- `src/data/inner-ability-data.js` → Converted to `.ts`

### HTML Changes

The `#optimization-inner-ability` div in `index.html` will be simplified:

**Before:**
```html
<div id="optimization-inner-ability" class="optimization-tab-content">
  <div class="tab-navigation">...</div>
  <div id="inner-ability-my-ability-pages">...</div>
  <div id="inner-ability-preset-comparison">...</div>
  <div id="inner-ability-theoretical-best">...</div>
</div>
```

**After:**
```html
<div id="optimization-inner-ability" class="optimization-tab-content">
  <!-- All inner HTML generated dynamically by TypeScript -->
</div>
```

### Import Paths

```typescript
// Logic
import { mapInnerAbilityStat, calculatePresetComparisons } from '@ts/page/inner-ability/inner-ability';

// UI
import { initializeInnerAbilityUI } from '@ts/page/inner-ability/inner-ability-ui';

// Store
import { gearLabStore } from '@ts/store/gear-lab-store';

// Types
import type { InnerAbilityPreset, PresetComparisonResult } from '@ts/types/page/gear-lab/gear-lab.types';
```

---

## Error Handling & Edge Cases

### Store Initialization
- **localStorage corrupted** → Fall back to defaults, log error
- **Migration fails** → Keep old data, log error, don't delete 'heroPowerPresets'
- **Invalid preset data** → `validateAndFillDefaults()` ensures all 10 presets exist with empty arrays

### DOM Operations
- All DOM queries use null checks: `const container = document.getElementById('...'); if (!container) return;`
- Graceful degradation if containers missing
- Table renders show empty state messages: "No configured presets found"

### User Input Validation
- Stat values are parsed with `parseFloat()` → `NaN` becomes `0`
- Stat names validated against `innerAbilityStats` array
- Only one preset can be equipped → Store enforces this automatically
- Lines beyond 6 are ignored

### Calculation Edge Cases
- Division by zero protection in percent calculations
- Empty presets handled gracefully in comparison tables
- Baseline stats computed correctly even if no preset equipped
- Diminishing returns calculations use existing `StatCalculationService` safeguards

### Data Loss Prevention
- Old 'heroPowerPresets' key only deleted after successful migration
- Store saves immediately after any update (no delayed batching)
- Deep cloning on getters prevents accidental mutations

---

## Global Window Exports

To maintain compatibility with existing HTML `onclick` handlers, the following functions will be exported to `window` in `inner-ability-ui.ts`:

```typescript
window.switchInnerAbilityTab = switchInnerAbilityTab;
window.toggleLineBreakdown = toggleLineBreakdown;
window.sortPresetTable = sortPresetTable;
window.sortTheoreticalTable = sortTheoreticalTable;
window.switchPreset = switchPreset;
window.handlePresetEquipped = handlePresetEquipped;
```

---

## Implementation Checklist

- [ ] Convert `inner-ability-data.js` to TypeScript with proper types
- [ ] Create `src/ts/types/page/gear-lab/gear-lab.types.ts` with all store interfaces
- [ ] Create `src/ts/store/gear-lab-store.ts` following loadoutStore pattern
- [ ] Create `src/ts/page/inner-ability/inner-ability.types.ts`
- [ ] Create `src/ts/page/inner-ability/inner-ability.ts` with core logic
- [ ] Create `src/ts/page/inner-ability/inner-ability-ui.ts` with UI generation
- [ ] Update `index.html` to use simplified structure
- [ ] Update imports in main application files
- [ ] Remove old JS files (`inner-ability.js`, `presets-ui.js`, `inner-ability-data.js`)
- [ ] Run TypeScript compilation verification: `npx tsc --noEmit`
- [ ] Run build verification: `npm run build`
- [ ] Test preset creation, editing, and comparison
- [ ] Test migration from 'heroPowerPresets' to new format
- [ ] Verify all three sub-tabs work correctly

---

## Design Principles

1. **Follow established patterns** - Mirror base-stats and loadoutStore structure
2. **Separation of concerns** - Logic in `.ts`, UI in `-ui.ts`, data in store
3. **Type safety** - Leverage TypeScript for all data structures
4. **Maintain compatibility** - Keep HTML `onclick` working via window exports
5. **Future-proof** - gearLabStore designed to grow with other Gear Lab features
6. **Data safety** - Migration preserves existing user data
7. **YAGNI** - Only create what's needed, no premature abstractions

---

## References

- Current implementation: `src/core/features/inner-ability/inner-ability.js`
- Presets UI: `src/ui/presets-ui.js`
- Data: `src/data/inner-ability-data.js`
- Pattern reference: `src/ts/page/base-stats/`, `src/ts/store/loadout.store.ts`
