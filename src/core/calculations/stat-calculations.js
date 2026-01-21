// Calculate stat damage gain from main stat % increase
// This is the canonical implementation used by both the predicted damage table and cube potential
export function calculateMainStatPercentGain(mainStatPctIncrease, currentMainStatPct, primaryMainStat, defense, selectedClass) {
    let defenseToMainStat = 0;
    if (selectedClass === 'dark-knight') {
        defenseToMainStat = defense * 0.127;
    }

    const currentMultiplier = 1 + currentMainStatPct / 100;
    const baseMainStat = (primaryMainStat - defenseToMainStat) / currentMultiplier;

    // Now calculate the new total with the increased main stat %
    const newMultiplier = 1 + (currentMainStatPct + mainStatPctIncrease) / 100;
    const newTotalMainStat = (baseMainStat * newMultiplier) + defenseToMainStat;

    // Calculate the gain in main stat
    const mainStatGain = newTotalMainStat - primaryMainStat;
    return mainStatGain;
}