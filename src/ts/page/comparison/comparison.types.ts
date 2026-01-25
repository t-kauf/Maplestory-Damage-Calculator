/**
 * Comparison Equipment UI Types
 *
 * UI-specific types for the comparison equipment feature.
 */

import type { ComparisonCalculationResult } from './comparison';

// ============================================================================
// UI STATE TYPES
// ============================================================================

/**
 * UI state for the comparison tab
 */
export interface ComparisonUIState {
    currentSlot: string;
    activeItemGuid: string | null;
    isCalculating: boolean;
    showResults: boolean;
}

/**
 * Tab button data
 */
export interface TabButtonData {
    guid: string;
    name: string;
    isActive: boolean;
}

/**
 * Item card display data
 */
export interface ItemCardDisplayData {
    guid: string;
    name: string;
    attack: number;
    statLinesCount: number;
    isActive: boolean;
}

// ============================================================================
// RESULTS DISPLAY TYPES
// ============================================================================

/**
 * Formatted calculation result for display
 */
export interface FormattedCalculationResult {
    guid: string;
    name: string;
    bossDPS: string;
    normalDPS: string;
    bossExpectedDamage: string;
    normalExpectedDamage: string;
    isEquipped: boolean;
}

// ============================================================================
// EVENT HANDLER TYPES
// ============================================================================

/**
 * Event handler function type
 */
export type EventHandler = (event: Event) => void;

/**
 * Slot change handler
 */
export type SlotChangeHandler = (slotId: string) => void;

/**
 * Item action handler
 */
export type ItemActionHandler = (guid: string) => void;

/**
 * Stat line action handler
 */
export type StatLineActionHandler = (guid: string, statIndex: number) => void;

// ============================================================================
// DOM ELEMENT REFERENCES
// ============================================================================

/**
 * Cached DOM element references
 */
export interface ComparisonDOMElements {
    container: HTMLElement | null;
    slotSelector: HTMLSelectElement | null;
    tabsContainer: HTMLElement | null;
    itemsContainer: HTMLElement | null;
    resultsContainer: HTMLElement | null;
    equippedNameInput: HTMLInputElement | null;
    equippedAttackInput: HTMLInputElement | null;
    equippedStatsContainer: HTMLElement | null;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Animation duration in milliseconds
 */
export const ANIMATION_DURATION_MS = 200;

/**
 * Auto-calculate debounce delay in milliseconds
 */
export const AUTO_CALCULATE_DELAY_MS = 500;

/**
 * Undo toast duration in milliseconds
 */
export const UNDO_DURATION_MS = 10000;

/**
 * Maximum number of stat lines per item
 */
export const MAX_STAT_LINES = 10;
