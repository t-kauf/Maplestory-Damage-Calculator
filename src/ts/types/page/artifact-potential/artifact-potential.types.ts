/**
 * Artifact Potential Type Definitions
 * Shared types for the artifact-potential module
 */

import type { BaseStats } from '@ts/types/loadout';

/**
 * Artifact rarity tiers
 */
export type ArtifactRarity = 'Mystic' | 'Legendary' | 'Unique' | 'Epic' | 'Rare';

/**
 * All possible artifact potential stat names
 */
export const artifactPotentialStats = [
    'Main Stat %',
    'Damage Taken Decrease %',
    'Defense %',
    'Accuracy',
    'Critical Rate %',
    'Min Damage Multiplier %',
    'Max Damage Multiplier %',
    'Boss Monster Damage %',
    'Normal Monster Damage %',
    'Status Effect Damage %',
    'Damage %',
    'Defense Penetration %',
    'Main Stat % (prime)',
    'Damage Taken Decrease % (prime)',
    'Defense % (prime)',
    'Accuracy (prime)',
    'Critical Rate % (prime)',
    'Min Damage Multiplier % (prime)',
    'Max Damage Multiplier % (prime)',
    'Boss Monster Damage % (prime)',
    'Normal Monster Damage % (prime)',
    'Status Effect Damage % (prime)',
    'Damage % (prime)',
    'Defense Penetration % (prime)'
] as const;

export type ArtifactStatName = typeof artifactPotentialStats[number];

/**
 * Stats that don't affect damage (ignored in calculations)
 */
export const IGNORED_ARTIFACT_STATS: ArtifactStatName[] = [
    'Damage Taken Decrease %',
    'Damage Taken Decrease % (prime)',
    'Defense %',
    'Defense % (prime)',
    'Accuracy',
    'Accuracy (prime)',
    'Status Effect Damage %',
    'Status Effect Damage % (prime)'
] as const;

/**
 * Artifact potential data structure
 * Note: Different rarities have different stats (e.g., only Mystic has prime stats)
 */
export interface ArtifactPotentialData {
    [rarity: string]: Partial<Record<ArtifactStatName, number>>;
}

/**
 * Result of a single artifact stat calculation
 */
export interface ArtifactRankingResult {
    rarity: ArtifactRarity;
    stat: string;
    value: string;
    bossDPSGain: number;
    normalDPSGain: number;
    avgDPSGain: number;
    bossDPSPercentChange: number;
    normalDPSPercentChange: number;
    avgDPSPercentChange: number;
}

/**
 * Damage calculation result for baseline comparison
 */
export interface BaselineDamageResult {
    bossDPS: number;
    normalDPS: number;
}
