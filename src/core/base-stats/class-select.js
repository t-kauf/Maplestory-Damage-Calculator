import { saveToLocalStorage, updateAnalysisTabs } from '@core/storage.js';
import { updateClassWarning } from '@core/cube/cube-ui.js';
import { syncMainStatsToHidden, } from '../main.js';
import { updateSkillCoefficient } from './base-stats.js';
import { updateMasteryBonuses } from './mastery-bonus.js';
import {
    setSelectedClass,
    setSelectedJobTier
} from '@core/state.js';

export function loadSelectedJobTier() {
    try {
        const savedTier = localStorage.getItem('selectedJobTier');
        if (savedTier) {
            selectJobTier(savedTier);
        }
    } catch (error) {
        console.error('Error loading selected job tier:', error);
    }
} export function loadSelectedClass() {
    try {
        const savedClass = localStorage.getItem('selectedClass');
        if (savedClass) {
            selectClass(savedClass);
        }
    } catch (error) {
        console.error('Error loading selected class:', error);
    }
}
export function selectJobTier(tier) {
    document.querySelectorAll('.job-tier-btn').forEach(el => {
        el.classList.remove('active');
    });

    const tierElement = document.getElementById(`job-tier-${tier}`);
    if (tierElement) {
        tierElement.classList.add('active');
        setSelectedJobTier(tier);

        // Show/hide appropriate mastery table
        const mastery3rdTable = document.getElementById('mastery-table-3rd');
        const mastery4thTable = document.getElementById('mastery-table-4th');

        if (mastery3rdTable && mastery4thTable) {
            if (tier === '3rd') {
                mastery3rdTable.style.display = 'block';
                mastery4thTable.style.display = 'none';
            } else if (tier === '4th') {
                mastery3rdTable.style.display = 'none';
                mastery4thTable.style.display = 'block';
            }
        }

        // Update skill coefficient for the new tier
        updateSkillCoefficient();

        // Update mastery bonuses for the new tier
        updateMasteryBonuses();

        try {
            localStorage.setItem('selectedJobTier', tier);
        } catch (error) {
            console.error('Error saving selected job tier:', error);
        }

        saveToLocalStorage();
        updateAnalysisTabs();
    }
}

export function selectClass(className) {
    document.querySelectorAll('.class-selector').forEach(el => {
        el.classList.remove('selected');
    });

    const classElement = document.getElementById(`class-${className}`);
    if (classElement) {
        classElement.classList.add('selected');
        setSelectedClass(className);

        const defenseInputGroup = document.getElementById('defense-input-group');
        if (defenseInputGroup) {
            if (className === 'dark-knight') {
                defenseInputGroup.style.display = 'flex';
            } else {
                defenseInputGroup.style.display = 'none';
            }
        }

        // Show/hide main stats based on class
        const strRow = document.getElementById('str-row');
        const dexRow = document.getElementById('dex-row');
        const intRow = document.getElementById('int-row');
        const lukRow = document.getElementById('luk-row');

        // Hide all first
        if (strRow) strRow.style.display = 'none';
        if (dexRow) dexRow.style.display = 'none';
        if (intRow) intRow.style.display = 'none';
        if (lukRow) lukRow.style.display = 'none';

        // Show relevant stats based on class
        if (className === 'hero' || className === 'dark-knight') {
            // Warriors: STR (primary), DEX (secondary)
            if (strRow) strRow.style.display = 'flex';
            if (dexRow) dexRow.style.display = 'flex';
        } else if (className === 'bowmaster' || className === 'marksman') {
            // Archers: DEX (primary), STR (secondary)
            if (dexRow) dexRow.style.display = 'flex';
            if (strRow) strRow.style.display = 'flex';
        } else if (className === 'arch-mage-il' || className === 'arch-mage-fp') {
            // Mages: INT (primary), LUK (secondary)
            if (intRow) intRow.style.display = 'flex';
            if (lukRow) lukRow.style.display = 'flex';
        } else if (className === 'night-lord' || className === 'shadower') {
            // Thieves: LUK (primary), DEX (secondary)
            if (lukRow) lukRow.style.display = 'flex';
            if (dexRow) dexRow.style.display = 'flex';
        }

        // Sync new stat inputs with hidden primary/secondary fields
        syncMainStatsToHidden();

        try {
            localStorage.setItem('selectedClass', className);
        } catch (error) {
            console.error('Error saving selected class:', error);
        }

        // Update class warning in cube potential tab
        updateClassWarning();
    }
}
// Helper functions to determine class main stat types
export function isStrMainStatClass(className) {
    return className === 'hero' || className === 'dark-knight';
}
export function isDexMainStatClass(className) {
    return className === 'bowmaster' || className === 'marksman';
}
export function isIntMainStatClass(className) {
    return className === 'arch-mage-il' || className === 'arch-mage-fp';
}
export function isLukMainStatClass(className) {
    return className === 'night-lord' || className === 'shadower';
}
// Returns 'primary', 'secondary', or null based on className and statId
export function getStatType(className, statId) {
    if (isStrMainStatClass(className)) {
        if (statId === 'str-base') return 'primary';
        if (statId === 'dex-base') return 'secondary';
    } else if (isDexMainStatClass(className)) {
        if (statId === 'dex-base') return 'primary';
        if (statId === 'str-base') return 'secondary';
    } else if (isIntMainStatClass(className)) {
        if (statId === 'int-base') return 'primary';
        if (statId === 'luk-base') return 'secondary';
    } else if (isLukMainStatClass(className)) {
        if (statId === 'luk-base') return 'primary';
        if (statId === 'dex-base') return 'secondary';
    }
    return null;
}

