// Cache for simulation performance
let simCache = {
    baseStats: null,
    baseDPS: null,
    lineOptionsCache: {}, // Cache merged line options per slot+rarity
    weightCache: {}       // Cache total weights for line options
};

// Initialize simulation cache
export function initSimulationCache() {
    simCache.baseStats = getStats('base');
    simCache.baseDPS = calculateDamage(simCache.baseStats, 'boss').dps;
    simCache.lineOptionsCache = {};
    simCache.weightCache = {};

    // Pre-calculate line options and weights for all slot+rarity combinations
    slotNames.forEach(slotDef => {
        const slotId = slotDef.id;
        rarities.forEach(rarity => {
            const potentialData = equipmentPotentialData[rarity];
            if (!potentialData) return;

            const key = `${slotId}-${rarity}`;
            const cached = {
                line1: potentialData.line1 || [],
                line2: potentialData.line2 || [],
                line3: potentialData.line3 || []
            };

            // Add slot-specific lines
            if (slotSpecificPotentials[slotId]?.[rarity]) {
                const slotSpecific = slotSpecificPotentials[slotId][rarity];
                if (slotSpecific.line1) cached.line1 = [...cached.line1, ...slotSpecific.line1];
                if (slotSpecific.line2) cached.line2 = [...cached.line2, ...slotSpecific.line2];
                if (slotSpecific.line3) cached.line3 = [...cached.line3, ...slotSpecific.line3];
            }

            simCache.lineOptionsCache[key] = cached;

            // Pre-calculate total weights
            simCache.weightCache[`${key}-1`] = cached.line1.reduce((sum, opt) => sum + opt.weight, 0);
            simCache.weightCache[`${key}-2`] = cached.line2.reduce((sum, opt) => sum + opt.weight, 0);
            simCache.weightCache[`${key}-3`] = cached.line3.reduce((sum, opt) => sum + opt.weight, 0);
        });
    });
}

// Simulate using a single cube on a slot
export function simulateCubeOnSlot(slot, slotId) {
    // Try to upgrade rarity
    const upgradeData = RARITY_UPGRADE_RATES[slot.rarity];
    if (upgradeData && Math.random() < upgradeData.rate) {
        slot.rarity = upgradeData.next;
    }

    // Get cached line options
    const key = `${slotId}-${slot.rarity}`;
    const lineOptions = simCache.lineOptionsCache[key];
    if (!lineOptions) return;

    // Roll each line based on weight using cached options
    slot.lines = [
        rollPotentialLineCached(lineOptions.line1, simCache.weightCache[`${key}-1`]),
        rollPotentialLineCached(lineOptions.line2, simCache.weightCache[`${key}-2`]),
        rollPotentialLineCached(lineOptions.line3, simCache.weightCache[`${key}-3`])
    ];

    // Calculate DPS gain for this slot
    slot.dpsGain = calculateSlotDPSGainCached(slot);
}

// Roll a single potential line based on weights (optimized with cached total weight)
export function rollPotentialLineCached(options, totalWeight) {
    if (!options || options.length === 0) return null;

    let random = Math.random() * totalWeight;

    for (const option of options) {
        random -= option.weight;
        if (random <= 0) {
            // Return reference instead of spreading - we don't mutate these
            return option;
        }
    }

    return options[options.length - 1];
}

// Calculate DPS gain for a single slot (optimized with cached base stats)
export function calculateSlotDPSGainCached(slot) {
    const slotStats = { ...simCache.baseStats };
    let accumulatedMainStatPct = 0;
    if (slot.lines) {
        for (let i = 0; i < slot.lines.length; i++) {
            const line = slot.lines[i];
            if (!line) continue;
            const mapped = potentialStatToDamageStat(line.stat, line.value, accumulatedMainStatPct);
            if (mapped.stat) {
                slotStats[mapped.stat] = (slotStats[mapped.stat] || 0) + mapped.value;
                if (mapped.isMainStatPct) {
                    accumulatedMainStatPct += line.value;
                }
            }
        }
    }

    const slotDPS = calculateDamage(slotStats, 'boss').dps;
    return ((slotDPS - simCache.baseDPS) / simCache.baseDPS * 100);
}

// Calculate total DPS gain from all slots (optimized with cached base stats)
export function calculateTotalDPSGain(slots) {
    const totalStats = { ...simCache.baseStats };
    let accumulatedMainStatPct = 0;
    for (let i = 0; i < slots.length; i++) {
        const slot = slots[i];
        if (!slot.lines) continue;

        for (let j = 0; j < slot.lines.length; j++) {
            const line = slot.lines[j];
            if (!line) continue;
            const mapped = potentialStatToDamageStat(line.stat, line.value, accumulatedMainStatPct);
            if (mapped.stat) {
                totalStats[mapped.stat] = (totalStats[mapped.stat] || 0) + mapped.value;
                if (mapped.isMainStatPct) {
                    accumulatedMainStatPct += line.value;
                }
            }
        }
    }

    const totalDPS = calculateDamage(totalStats, 'boss').dps;
    return ((totalDPS - simCache.baseDPS) / simCache.baseDPS * 100);
}

// Get top 25% percentile threshold for a slot and rarity
export async function getTop25PercentileThreshold(slotId, rarity) {
    // Ensure rankings are calculated for this slot and rarity
    if (!rankingsCache[slotId]?.[rarity]) {
        await calculateRankingsForRarity(rarity, slotId);
    }

    const rankings = rankingsCache[slotId]?.[rarity];
    if (!rankings || rankings.length === 0) return 0;

    // Top 25% means we want to be in the top quartile
    const index = Math.floor(rankings.length * 0.25);
    return rankings[index].dpsGain;
}

// Pre-load all rankings needed for simulation
export async function preloadRankingsForSimulation() {
    const rarities = ['rare', 'epic', 'unique', 'legendary', 'mystic'];
    const progressText = document.getElementById('cube-simulation-progress-text');

    // Create list of all slot-rarity combinations that need loading
    const toLoad = [];
    for (const slot of slotNames) {
        for (const rarity of rarities) {
            if (!rankingsCache[slot.id]?.[rarity]) {
                toLoad.push({ slot, rarity });
            }
        }
    }

    const total = toLoad.length;
    let loaded = 0;

    // Process in batches of 10
    const batchSize = 10;
    for (let i = 0; i < toLoad.length; i += batchSize) {
        const batch = toLoad.slice(i, i + batchSize);

        // Run batch in parallel
        await Promise.all(batch.map(async ({ slot, rarity }) => {
            await calculateRankingsForRarity(rarity, slot.id);
            loaded++;
            if (progressText) {
                progressText.textContent = `Pre-loading rankings: ${loaded}/${total} complete`;
            }
        }));
    }
}

// Run simulation
export async function runCubeSimulation() {
    if (!getSelectedClass()) {
        alert('Please select a class in the Character Setup section first.');
        return;
    }

    const cubeBudget = parseInt(document.getElementById('simulation-cube-budget').value);
    const simulationCount = parseInt(document.getElementById('simulation-count').value);

    const progressBar = document.getElementById('cube-simulation-progress');
    const progressFill = document.getElementById('cube-simulation-progress-fill');
    const progressText = document.getElementById('cube-simulation-progress-text');
    const runBtn = document.getElementById('cube-simulation-run-btn');

    // Disable button and show progress
    runBtn.disabled = true;
    progressBar.style.display = 'block';
    progressFill.style.width = '0%';
    progressText.textContent = 'Starting simulation...';

    // Results storage
    const results = {
        worstFirst: { totalGains: [], simulations: [], avgGain: 0, slotDistribution: {} },
        balancedThreshold: { totalGains: [], simulations: [], avgGain: 0, slotDistribution: {} },
        hybridFastRarity: { totalGains: [], simulations: [], avgGain: 0, slotDistribution: {} },
        rarityWeightedWorstFirst: { totalGains: [], simulations: [], avgGain: 0, slotDistribution: {} }
    };

    try {
        // Initialize simulation cache for performance
        progressText.textContent = 'Initializing simulation cache...';
        initSimulationCache();

        // Run all strategies in parallel
        progressText.textContent = 'Running all strategies in parallel...';
        progressFill.style.width = '0%';
        const batchSize = 50;

        // Track completion for all strategies
        const strategyProgress = {
            worstFirst: 0,
            balancedThreshold: 0,
            hybridFastRarity: 0,
            rarityWeightedWorstFirst: 0
        };

        // Run all simulations for all strategies in parallel
        const allPromises = [];

        // Create all simulation promises for all strategies
        for (let i = 0; i < simulationCount; i++) {
            // Worst First
            allPromises.push(
                new Promise(resolve => {
                    const slots = runWorstFirstStrategy(cubeBudget);
                    const totalGain = calculateTotalDPSGain(slots);
                    resolve({ strategy: 'worstFirst', slots, totalGain });
                })
            );

            // Balanced Threshold
            allPromises.push(
                new Promise(resolve => {
                    const slots = runBalancedThresholdStrategy(cubeBudget);
                    const totalGain = calculateTotalDPSGain(slots);
                    resolve({ strategy: 'balancedThreshold', slots, totalGain });
                })
            );

            // Hybrid Fast Rarity
            allPromises.push(
                (async () => {
                    const slots = await runHybridFastRarityStrategy(cubeBudget);
                    const totalGain = calculateTotalDPSGain(slots);
                    return { strategy: 'hybridFastRarity', slots, totalGain };
                })()
            );

            // Rarity-Weighted Worst First
            allPromises.push(
                new Promise(resolve => {
                    const slots = runRarityWeightedWorstFirstStrategy(cubeBudget);
                    const totalGain = calculateTotalDPSGain(slots);
                    resolve({ strategy: 'rarityWeightedWorstFirst', slots, totalGain });
                })
            );
        }

        // Process all promises in batches to avoid overwhelming the browser
        const totalSimulations = allPromises.length;
        let completedSimulations = 0;

        for (let i = 0; i < totalSimulations; i += batchSize) {
            const batch = allPromises.slice(i, Math.min(i + batchSize, totalSimulations));
            const batchResults = await Promise.all(batch);

            // Distribute results to appropriate strategy
            batchResults.forEach(result => {
                const strategy = result.strategy;
                if (results[strategy]) {
                    results[strategy].totalGains.push(result.totalGain);
                    results[strategy].simulations.push(result);
                    strategyProgress[strategy]++;
                }
            });

            completedSimulations += batch.length;
            const progress = (completedSimulations / totalSimulations) * 100;
            progressFill.style.width = `${progress}%`;
            progressText.textContent = `Running all strategies: ${completedSimulations}/${totalSimulations} completed`;
            await new Promise(resolve => setTimeout(resolve, 0));
        }

        // Calculate averages for all strategies
        Object.keys(results).forEach(strategy => {
            results[strategy].avgGain = results[strategy].totalGains.reduce((a, b) => a + b, 0) / simulationCount;
        });

        // Hide progress
        progressFill.style.width = '100%';
        setTimeout(() => {
            progressBar.style.display = 'none';
        }, 500);

        // Display results
        displaySimulationResults(results, cubeBudget, simulationCount);

    } catch (error) {
        console.error('Error running simulation:', error);
        alert('Error running simulation. Check console for details.');
    } finally {
        runBtn.disabled = false;
    }
}


// Strategy: Worst First - always upgrade the slot with lowest DPS
export function runWorstFirstStrategy(cubeBudget) {
    // Initialize all slots to normal with no lines
    const slots = slotNames.map(slotDef => ({
        id: slotDef.id,
        name: slotDef.name,
        rarity: 'normal',
        lines: [],
        dpsGain: 0
    }));

    // Use all cubes
    for (let i = 0; i < cubeBudget; i++) {
        // Find slot with lowest DPS gain
        let worstSlot = slots[0];
        for (const slot of slots) {
            if (slot.dpsGain < worstSlot.dpsGain) {
                worstSlot = slot;
            }
        }

        // Use cube on worst slot
        simulateCubeOnSlot(worstSlot, worstSlot.id);
    }

    return slots;
}

// Strategy: Balanced Threshold - keep all slots within a certain range of each other
export function runBalancedThresholdStrategy(cubeBudget) {
    // Initialize all slots to normal with no lines
    const slots = slotNames.map(slotDef => ({
        id: slotDef.id,
        name: slotDef.name,
        rarity: 'normal',
        lines: [],
        dpsGain: 0
    }));

    // Use all cubes
    for (let i = 0; i < cubeBudget; i++) {
        // Find the average DPS gain
        const avgDPS = slots.reduce((sum, slot) => sum + slot.dpsGain, 0) / slots.length;

        // Find slot that is furthest below average (but prioritize those below threshold)
        let targetSlot = slots[0];
        let maxDeficit = avgDPS - targetSlot.dpsGain;

        for (const slot of slots) {
            const deficit = avgDPS - slot.dpsGain;
            if (deficit > maxDeficit) {
                maxDeficit = deficit;
                targetSlot = slot;
            }
        }

        // Use cube on target slot
        simulateCubeOnSlot(targetSlot, targetSlot.id);
    }

    return slots;
}

// Strategy: Rarity-Weighted Worst First - considers proximity to rarity upgrades
export function runRarityWeightedWorstFirstStrategy(cubeBudget) {
    // Initialize all slots to normal with no lines
    const slots = slotNames.map(slotDef => ({
        id: slotDef.id,
        name: slotDef.name,
        rarity: 'normal',
        lines: [],
        dpsGain: 0,
        cubesAtCurrentRarity: 0
    }));

    const expectedCubesForUpgrade = {
        'normal': 1 / 0.06,      // ~16.7 cubes
        'rare': 1 / 0.03333,     // ~30 cubes
        'epic': 1 / 0.0167,      // ~60 cubes
        'unique': 1 / 0.006,     // ~167 cubes
        'legendary': 1 / 0.0021  // ~476 cubes
    };

    // Use all cubes
    for (let i = 0; i < cubeBudget; i++) {
        // Calculate weighted score for each slot
        let bestSlot = slots[0];
        let bestScore = Infinity;

        for (const slot of slots) {
            // Lower DPS is worse (want to improve it)
            let score = slot.dpsGain;

            // If slot is close to upgrading, reduce its score (make it more attractive)
            if (expectedCubesForUpgrade[slot.rarity]) {
                const upgradeProgress = slot.cubesAtCurrentRarity / expectedCubesForUpgrade[slot.rarity];
                // Bonus for being close to upgrade (up to 50% reduction in score)
                score = score * (1 - upgradeProgress * 0.5);
            }

            if (score < bestScore) {
                bestScore = score;
                bestSlot = slot;
            }
        }

        // Track cubes used at current rarity
        const oldRarity = bestSlot.rarity;
        simulateCubeOnSlot(bestSlot, bestSlot.id);

        if (bestSlot.rarity === oldRarity) {
            bestSlot.cubesAtCurrentRarity++;
        } else {
            bestSlot.cubesAtCurrentRarity = 0;
        }
    }

    return slots;
}

// Strategy: Hybrid Fast Rarity + Worst First
export async function runHybridFastRarityStrategy(cubeBudget) {
    // Initialize all slots to normal with no lines
    const slots = slotNames.map(slotDef => ({
        id: slotDef.id,
        name: slotDef.name,
        rarity: 'normal',
        lines: [],
        dpsGain: 0
    }));

    let cubesUsed = 0;
    const targetRarity = 'epic'; // Get all slots to epic first
    const rarityProgression = ['rare', 'epic', 'unique', 'legendary', 'mystic'];

    // Phase 1: Rush all slots to target rarity
    for (const slot of slots) {
        while (cubesUsed < cubeBudget && slot.rarity !== targetRarity) {
            simulateCubeOnSlot(slot, slot.id);
            cubesUsed++;

            // Check if we reached target
            const currentIndex = rarityProgression.indexOf(slot.rarity);
            const targetIndex = rarityProgression.indexOf(targetRarity);
            if (currentIndex >= targetIndex) break;
        }

        if (cubesUsed >= cubeBudget) break;
    }

    // Phase 2: Use remaining cubes with Worst First strategy
    while (cubesUsed < cubeBudget) {
        // Find slot with lowest DPS gain
        let worstSlot = slots[0];
        for (const slot of slots) {
            if (slot.dpsGain < worstSlot.dpsGain) {
                worstSlot = slot;
            }
        }

        simulateCubeOnSlot(worstSlot, worstSlot.id);
        cubesUsed++;
    }

    return slots;
}
