/**
 * Best Per Slot Dashboard
 * 
 * Reads DPS values directly from comparison results after the user calculates each slot.
 * User must visit each slot and click "Calculate All" to populate the dashboard.
 */

import { hasEquipmentViewerData, getItemCountsBySlot } from '../services/equipment-viewer-service.js';
import { formatNumber } from '@utils/formatters.js';
import { switchComparisonSlot, getCurrentSlot } from '@ui/comparison/slot-comparison.js';

// Current mode: 'boss', 'normal', or 'balance'
let currentMode = 'boss';

// Slot configuration
const SLOTS = [
    { id: 'head', name: 'Hat' },
    { id: 'chest', name: 'Top' },
    { id: 'legs', name: 'Bottom' },
    { id: 'shoulders', name: 'Shoulder' },
    { id: 'gloves', name: 'Gloves' },
    { id: 'boots', name: 'Boots' },
    { id: 'cape', name: 'Cape' },
    { id: 'belt', name: 'Belt' },
    { id: 'ring', name: 'Ring' },
    { id: 'neck', name: 'Necklace' },
    { id: 'eye-accessory', name: 'Eye' }
];

// Store calculated results per slot
const slotResults = new Map();

/**
 * Set the optimization mode
 */
export function setBestSlotMode(mode) {
    currentMode = mode;
    
    // Update UI buttons
    document.querySelectorAll('.best-mode-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.getElementById(`best-mode-${mode}`)?.classList.add('active');
    
    // Refresh the dashboard
    renderBestPerSlot();
}
window.setBestSlotMode = setBestSlotMode;

/**
 * Parse DPS from formatted string (e.g., "1,635,085,731" -> 1635085731)
 */
function parseDPS(dpsString) {
    if (!dpsString) return 0;
    return parseFloat(dpsString.replace(/,/g, '')) || 0;
}

/**
 * Collect results from the current comparison view's DOM
 * Called after calculate() runs
 */
export function collectCurrentSlotResults() {
    const currentSlot = getCurrentSlot();
    const resultsContainer = document.getElementById('results-container');
    
    console.log(`[BestPerSlot] ===== Collecting results for slot: ${currentSlot} =====`);
    
    if (!resultsContainer) {
        console.log('[BestPerSlot] Results container not found');
        return null;
    }
    
    // Debug: show a snippet of the results HTML
    const htmlSnippet = resultsContainer.innerHTML.substring(0, 500);
    console.log('[BestPerSlot] Results container HTML (first 500 chars):', htmlSnippet);
    
    const results = {
        equipped: null,
        items: []
    };
    
    // Find all result panels
    const panels = resultsContainer.querySelectorAll('.result-panel');
    console.log(`[BestPerSlot] Found ${panels.length} result panels`);
    
    panels.forEach((panel, index) => {
        const isEquipped = panel.classList.contains('equipped-item');
        const isNew = panel.classList.contains('new-item') || panel.dataset.isNew === 'true';
        
        // Get the name from the header (handle both old and new structure)
        const headerDiv = panel.querySelector('.result-panel-header');
        const nameEl = headerDiv ? headerDiv.querySelector('h3') : panel.querySelector('h3');
        // Remove the 🆕 emoji from the name if present
        let name = nameEl ? nameEl.textContent.trim() : 'Unknown';
        name = name.replace(/🆕\s*/g, '').trim();
        
        // Get DPS values
        const dpsBoxes = panel.querySelectorAll('.expected-damage');
        let bossDps = 0;
        let normalDps = 0;
        
        dpsBoxes.forEach(box => {
            const label = box.querySelector('.label')?.textContent || '';
            const valueEl = box.querySelector('.value');
            if (!valueEl) return;
            
            // Get the raw DPS number (without the percentage badge)
            // The value might have a badge span after it, so get first text node
            let valueText = '';
            for (const node of valueEl.childNodes) {
                if (node.nodeType === Node.TEXT_NODE) {
                    valueText = node.textContent.trim();
                    break;
                }
            }
            if (!valueText) {
                // Fallback: remove any badge span text
                const badge = valueEl.querySelector('.percent-change-badge');
                if (badge) {
                    valueText = valueEl.textContent.replace(badge.textContent, '').trim();
                } else {
                    valueText = valueEl.textContent.trim();
                }
            }
            
            const dps = parseDPS(valueText);
            
            if (label.includes('Boss')) {
                bossDps = dps;
            } else if (label.includes('Normal')) {
                normalDps = dps;
            }
        });
        
        console.log(`[BestPerSlot] Panel ${index}: "${name}" - Boss: ${bossDps}, Normal: ${normalDps}, Equipped: ${isEquipped}`);
        
        const itemData = {
            name,
            bossDps,
            normalDps,
            balanceDps: (bossDps + normalDps) / 2,
            isEquipped,
            isNew
        };
        
        if (isEquipped) {
            results.equipped = itemData;
        } else {
            results.items.push(itemData);
        }
    });
    
    // Store these results if we have any data
    if (results.equipped || results.items.length > 0) {
        slotResults.set(currentSlot, results);
        console.log(`[BestPerSlot] Stored results for ${currentSlot}:`, {
            equipped: results.equipped,
            itemCount: results.items.length,
            items: results.items.map(i => ({ name: i.name, boss: i.bossDps, normal: i.normalDps }))
        });
    }
    
    return results;
}

/**
 * Get the best item for a slot based on current mode
 */
function getBestItemForSlot(slotId) {
    const results = slotResults.get(slotId);
    if (!results) return null;
    
    // Combine equipped and comparison items
    const allItems = [];
    if (results.equipped) {
        allItems.push(results.equipped);
    }
    allItems.push(...results.items);
    
    if (allItems.length === 0) return null;
    
    // Sort by the selected mode
    const dpsKey = currentMode === 'boss' ? 'bossDps' : 
                   currentMode === 'normal' ? 'normalDps' : 'balanceDps';
    
    allItems.sort((a, b) => b[dpsKey] - a[dpsKey]);
    
    return {
        best: allItems[0],
        equipped: results.equipped
    };
}

/**
 * Render the Best Per Slot dashboard
 */
function renderBestPerSlot() {
    const grid = document.getElementById('best-slot-grid');
    if (!grid) return;
    
    const counts = hasEquipmentViewerData() ? getItemCountsBySlot() : {};
    
    let html = '';
    let hasAnyData = false;
    
    SLOTS.forEach(slot => {
        const slotData = getBestItemForSlot(slot.id);
        const itemCount = counts[slot.id] || 0;
        
        if (!slotData || !slotData.best) {
            // No data for this slot
            html += `
                <div class="best-slot-card best-slot-no-data-card" onclick="navigateToSlot('${slot.id}')">
                    <div class="best-slot-name">${slot.name}</div>
                    <div class="best-slot-item-name" style="color: var(--text-secondary); font-style: italic;">
                        ${itemCount > 0 ? 'Click to calculate' : 'No items'}
                    </div>
                </div>
            `;
            return;
        }
        
        hasAnyData = true;
        const best = slotData.best;
        const equipped = slotData.equipped;
        
        // Calculate gain vs equipped
        const dpsKey = currentMode === 'boss' ? 'bossDps' : 
                       currentMode === 'normal' ? 'normalDps' : 'balanceDps';
        
        let gainPercent = 0;
        if (equipped && equipped[dpsKey] > 0 && !best.isEquipped) {
            gainPercent = ((best[dpsKey] - equipped[dpsKey]) / equipped[dpsKey]) * 100;
        }
        
        const gainClass = gainPercent > 0.01 ? 'positive' : (gainPercent < -0.01 ? 'negative' : 'neutral');
        const gainSign = gainPercent >= 0 ? '+' : '';
        
        const isEquippedClass = best.isEquipped ? 'is-equipped' : '';
        
        const newBadge = best.isNew ? '<span class="new-item-badge" title="New item">🆕</span>' : '';
        
        html += `
            <div class="best-slot-card ${isEquippedClass}${best.isNew ? ' new-item' : ''}" onclick="navigateToSlot('${slot.id}')">
                <div class="best-slot-card-header">
                    <div>
                        <div class="best-slot-name">${slot.name}</div>
                        <div class="best-slot-item-name">${newBadge}${best.name}</div>
                    </div>
                    ${!best.isEquipped ? `<span class="best-slot-gain ${gainClass}">${gainSign}${gainPercent.toFixed(2)}%</span>` : ''}
                </div>
                <div class="best-slot-dps">
                    <div class="best-slot-dps-value boss">
                        <div class="best-slot-dps-label">Boss</div>
                        <div class="best-slot-dps-number">${formatNumber(best.bossDps)}</div>
                    </div>
                    <div class="best-slot-dps-value normal">
                        <div class="best-slot-dps-label">Normal</div>
                        <div class="best-slot-dps-number">${formatNumber(best.normalDps)}</div>
                    </div>
                </div>
            </div>
        `;
    });
    
    if (!hasAnyData) {
        html = `
            <div class="best-slot-no-data">
                <p>No comparison data available yet.</p>
                <p style="font-size: 0.85em; margin-top: 8px;">Navigate to each slot and click "Calculate All" to populate this dashboard.</p>
            </div>
        `;
    }
    
    grid.innerHTML = html;
}

/**
 * Refresh the Best Per Slot dashboard
 * Call this after calculate() runs
 */
export function refreshBestPerSlot() {
    const dashboard = document.getElementById('best-per-slot-dashboard');
    if (!dashboard) return;
    
    // Check if Equipment Viewer data exists
    if (!hasEquipmentViewerData()) {
        dashboard.style.display = 'none';
        return;
    }
    
    // Show dashboard
    dashboard.style.display = 'block';
    
    // Collect results from current slot's comparison view
    collectCurrentSlotResults();
    
    // Render the dashboard
    renderBestPerSlot();
}
window.refreshBestPerSlot = refreshBestPerSlot;

/**
 * Navigate to a specific slot in the comparison tool and auto-calculate
 */
export function navigateToSlot(slotId) {
    // Update the slot selector
    const selector = document.getElementById('comparison-slot-selector');
    if (selector) {
        selector.value = slotId;
    }
    
    // Switch to the slot
    switchComparisonSlot(slotId);
    
    // Scroll to comparison section
    const comparisonSection = document.querySelector('.comparison-container');
    if (comparisonSection) {
        comparisonSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    
    // Auto-run Calculate All after a short delay to let the slot switch complete
    setTimeout(() => {
        // Call calculate() directly (it's exposed on window from main.js)
        if (typeof window.calculate === 'function') {
            console.log('[BestPerSlot] Auto-triggering calculate() for slot:', slotId);
            window.calculate();
        } else {
            // Fallback: click the button by class
            const calculateBtn = document.querySelector('.comparison-calculate-btn');
            if (calculateBtn) {
                console.log('[BestPerSlot] Auto-clicking Calculate All button for slot:', slotId);
                calculateBtn.click();
            }
        }
    }, 150);
}
window.navigateToSlot = navigateToSlot;

/**
 * Initialize the dashboard when comparison tab loads
 */
export function initializeBestPerSlot() {
    // Check for Equipment Viewer data and show/hide dashboard
    if (hasEquipmentViewerData()) {
        const dashboard = document.getElementById('best-per-slot-dashboard');
        if (dashboard) {
            dashboard.style.display = 'block';
        }
        renderBestPerSlot();
    }
}

/**
 * Clear stored results (useful for testing)
 */
export function clearBestPerSlotResults() {
    slotResults.clear();
    renderBestPerSlot();
}
window.clearBestPerSlotResults = clearBestPerSlotResults;

// Export for module access
export { currentMode, slotResults };
