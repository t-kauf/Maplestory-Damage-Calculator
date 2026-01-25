/**
 * Scrolling Optimizer Type Definitions
 */

/**
 * Scroll configuration
 */
export interface ScrollConfig {
    name: string;
    baseSuccess: number;
    cost: number;
    attack: number;
    damageAmp: number;
}

/**
 * Result of a single scroll attempt on a slot
 */
export interface SlotResult {
    slot: number;
    scrollType?: string;
    success: boolean;
    attack: number;
    damageAmp: number;
    successRate: number;
    unfunded: boolean;
}

/**
 * Result of a complete scroll run (all 10 slots)
 */
export interface ScrollRunResult {
    totalAttack: number;
    totalDamageAmp: number;
    successfulSlots: number;
    failedSlots: number;
    attemptCost: number;
    slotResults: SlotResult[];
    earlyReset: boolean;
}

/**
 * Scroll strategy definition
 */
export interface ScrollStrategy {
    id: string;
    name: string;
    description: string;
    selectScroll: (slot: number, successfulSlots: number, failedSlots: number, traceUsed: number, budget: number) => string;
    shouldResetEarly?: (slotResults: SlotResult[], currentSlot: number, successfulSlots: number, failedSlots: number) => boolean;
    shouldReset: (result: ScrollRunResult, traceUsed: number, budget: number) => boolean;
}

/**
 * Final simulation result with averages
 */
export interface SimulationResult {
    strategy: ScrollStrategy;
    attacks: number[];
    damageAmps: number[];
    successCounts: number[];
    resetCounts: number[];
    traceUsed: number[];
    avgAttack: number;
    avgDamageAmp: number;
    avgSuccess: number;
    avgResets: number;
    avgTraceUsed: number;
    dpsGain: number;
    baseDPS: number;
    newDPS: number;
    effectiveAttackIncrease: number;
    exampleResult: ScrollRunResult | null;
}

/**
 * Damage gain calculation result
 */
export interface DamageGainResult {
    baseDPS: number;
    newDPS: number;
    dpsGain: number;
    effectiveAttackIncrease: number;
}

/**
 * Scroll level type
 */
export type ScrollLevel = '65' | '85';

/**
 * Scroll type identifiers for Level 65
 */
export type L65ScrollType = 'L65_70' | 'L65_30';

/**
 * Scroll type identifiers for Level 85
 */
export type L85ScrollType = 'L85_70' | 'L85_30' | 'L85_15';

/**
 * All scroll type identifiers
 */
export type ScrollType = L65ScrollType | L85ScrollType;

/**
 * Enhancement bonus values
 */
export interface EnhancementBonus {
    premium: number;
    guild: number;
    total: number;
}
