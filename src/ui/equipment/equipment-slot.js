// Equipment Slot Card Component
import { availableStats } from '@core/constants.js';

/**
 * Create an equipment slot card element
 * @param {Object} slot - Slot configuration { id, name, hasMainStat }
 * @returns {HTMLElement} The slot card element
 */
export function createEquipmentSlot(slot) {
    const card = document.createElement('div');
    card.id = `equipment-slot-${slot.id}`;
    card.className = 'equipment-slot-card';
    card.style.cssText = `
        background: linear-gradient(135deg, rgba(0, 122, 255, 0.1), rgba(88, 86, 214, 0.05));
        border: 1px solid var(--accent-primary);
        border-radius: 12px;
        padding: 12px;
        box-shadow: 0 4px 16px var(--shadow);
        min-width: 0;
        transition: transform 0.2s, box-shadow 0.2s;
    `;

    card.onmouseover = () => {
        card.style.transform = 'translateY(-2px)';
        card.style.boxShadow = '0 6px 20px var(--shadow)';
    };
    card.onmouseout = () => {
        card.style.transform = 'translateY(0)';
        card.style.boxShadow = '0 4px 16px var(--shadow)';
    };

    // Build slot HTML
    let html = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <div style="color: var(--accent-primary); font-weight: 600; font-size: 0.95em;">${slot.name}</div>
            <div style="display: flex; gap: 6px;">
                <button onclick="clearSlotData('${slot.id}')" class="bg-orange-500 hover:bg-orange-600 dark:bg-orange-600 dark:hover:bg-orange-700 text-white px-2 py-1 rounded cursor-pointer text-xs font-semibold transition-all" title="Clear slot">
                    Clear
                </button>
            </div>
        </div>


        <div style="display: grid; gap: 6px; margin-bottom: 10px;">
            <div class="input-group" style="min-width: 0;">
                <label style="font-size: 0.7em;">Attack</label>
                <input type="number" step="0.1" id="equipment-${slot.id}-attack" value="0" min="0" onchange="saveSlotData('${slot.id}'); notifyStatContributors();" style="width: 100%; font-size: 0.75em; padding: 4px; box-sizing: border-box;">
            </div>
    `;

    // Add Main Stat field for Ring, Neck, Eye Accessory
    if (slot.hasMainStat) {
        html += `
            <div class="input-group" style="min-width: 0;">
                <label style="font-size: 0.7em;">Main Stat</label>
                <input type="number" step="1" id="equipment-${slot.id}-main-stat" value="0" min="0" onchange="saveSlotData('${slot.id}'); notifyStatContributors();" style="width: 100%; font-size: 0.75em; padding: 4px; box-sizing: border-box;">
            </div>
        `;
    }

    html += `
        </div>

        <div style="margin-bottom: 10px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <label style="font-size: 0.75em; font-weight: 500;">Stat Lines</label>
                <button onclick="addStatLineToSlot('${slot.id}')" class="bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700 text-white px-2 py-1 rounded cursor-pointer text-xs font-semibold transition-all">
                    + Add Stat
                </button>
            </div>
            <div id="equipment-${slot.id}-stats-container">
                <!-- Stat lines will be added here -->
            </div>
        </div>
    `;

    card.innerHTML = html;

    // Mark this slot as needing initialization (will be checked by loadEquipmentData)
    card.dataset.needsInit = 'true';

    return card;
}
