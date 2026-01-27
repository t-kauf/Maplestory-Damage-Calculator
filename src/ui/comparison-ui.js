/**
 * Comparison items UI functionality - Fixed Version
 *
 * This module handles the UI for comparison items while delegating all
 * state management to the centralized comparison-state module.
 *
 * KEY IMPROVEMENTS:
 * - No more silent data loss from race conditions
 * - Proper error handling and validation
 * - State-driven architecture (state → DOM, not DOM → state)
 * - Reliable persistence across tab switches, refreshes, etc.
 */

import { saveToLocalStorage } from '@core/state/storage.js';
import { availableStats } from '@core/constants.js';
import { calculate } from '@core/main.js';
import {
    updateItem,
    removeItem,
    loadSlot,
    getSlotItems,
    getItem
} from '@core/state/comparison-state.js';
import { equipItemFromComparison, getCurrentSlot } from '@ui/comparison/slot-comparison.js';
import { 
    hasEquipmentViewerData, 
    getItemsForSlot, 
    getItemCountsBySlot,
    getEquipmentViewerSlotName,
    getItemsForSlotSeparated,
    removeItemFromEquipmentViewer
} from '../services/equipment-viewer-service.js';
import { setSlotData, getSlotStats } from '@ui/equipment/equipment-tab.js';
import { initializeBestPerSlot, refreshBestPerSlot } from '@ui/best-per-slot.js';

// Track active comparison item
let activeComparisonItemId = null;

// Track current slot's items mapping (itemId -> guid)
// This allows us to find the guid from the UI itemId
const currentItemMapping = new Map(); // itemId -> guid

// Configuration object for magic numbers
const COMPARISON_CONFIG = {
    MAX_STATS_PER_ITEM: 6,
    ANIMATION_DURATION_MS: 200,
    MIN_TOUCH_TARGET_SIZE: 44 // px
};

// ============================================================================
// DATA COLLECTION FROM DOM
// ============================================================================

/**
 * Collect item data from DOM elements
 * @param {string} currentSlot - Current equipment slot
 * @param {number} itemId - UI item ID
 * @returns {Object|null} Item data or null if elements not found
 */
function collectItemDataFromDOM(currentSlot, itemId) {
    const nameInput = document.getElementById(`item-${currentSlot}-${itemId}-name`);
    const attackInput = document.getElementById(`item-${currentSlot}-${itemId}-attack`);
    const statsContainer = document.getElementById(`item-${currentSlot}-${itemId}-stats-container`);

    if (!nameInput || !attackInput || !statsContainer) {
        console.error(`[ComparisonUI] Missing DOM elements for item ${itemId}`);
        return null;
    }

    // Collect stats
    const stats = [];
    statsContainer.querySelectorAll(`[id^="item-${currentSlot}-${itemId}-stat-"]`).forEach(statDiv => {
        const typeInput = statDiv.querySelector('[id$="-type"]');
        const valueInput = statDiv.querySelector('[id$="-value"]');
        if (typeInput && valueInput) {
            stats.push({ type: typeInput.value, value: valueInput.value });
        }
    });

    return {
        name: nameInput.value,
        attack: parseFloat(attackInput.value) || 0,
        stats: stats
    };
}

/**
 * Collect guid from DOM element
 * @param {string} currentSlot - Current equipment slot
 * @param {number} itemId - UI item ID
 * @returns {string|null} Item GUID or null if not found
 */
function getGuidFromItemId(currentSlot, itemId) {
    const itemDiv = document.getElementById(`comparison-item-${currentSlot}-${itemId}`);
    if (!itemDiv) {
        console.error(`[ComparisonUI] Item div not found for ${itemId}`);
        return null;
    }
    return itemDiv.dataset.guid || null;
}

// ============================================================================
// SAVE OPERATIONS
// ============================================================================

/**
 * Save single item data from DOM to state
 * This replaces the old debounced save with reliable state management
 * @param {string} guid - Item GUID
 * @returns {Promise<boolean>} True if successful
 */
async function saveSlotItemData(guid) {
    try {
        const currentSlot = getCurrentSlot();

        // Find itemId from guid
        let itemId = null;
        for (const [uiItemId, itemGuid] of currentItemMapping.entries()) {
            if (itemGuid === guid) {
                itemId = uiItemId;
                break;
            }
        }

        if (itemId === null) {
            console.error(`[ComparisonUI] Could not find itemId for guid ${guid}`);
            return false;
        }

        // Collect data from DOM
        const itemData = collectItemDataFromDOM(currentSlot, itemId);
        if (!itemData) {
            return false;
        }

        // Update state (this handles queuing and persistence)
        const success = await updateItem(currentSlot, guid, itemData);

        if (!success) {
             console.error(`[ComparisonUI] Failed to save item ${guid}`);
        }

        return success;

    } catch (error) {
        console.error(`[ComparisonUI] Error saving item:`, error);
        return false;
    }
}

// Global save function
window.saveSlotItemData = function(guid) {
    saveSlotItemData(guid);
};

// ============================================================================
// LOAD OPERATIONS
// ============================================================================

/**
 * Load items for a specific slot from state
 * @param {string} slotId - Equipment slot ID
 * @returns {Promise<boolean>} True if successful
 */
window.loadSlotItems = async function(slotId) {
    try {
        // Clear current mapping
        currentItemMapping.clear();

        // Clear UI
        const tabsContainer = document.getElementById('comparison-tabs-container');
        const itemsContainer = document.getElementById('comparison-items-container');

        if (tabsContainer) {
            // Preserve the add button, import button, and refresh button
            const addButton = tabsContainer.querySelector('button[data-type="add-button"]');
            const importButton = tabsContainer.querySelector('button[data-type="import-button"]');
            const refreshButton = tabsContainer.querySelector('button[data-type="refresh-button"]');
            const addButtonClone = addButton ? addButton.cloneNode(true) : null;
            const importButtonClone = importButton ? importButton.cloneNode(true) : null;
            const refreshButtonClone = refreshButton ? refreshButton.cloneNode(true) : null;
            tabsContainer.innerHTML = '';
            if (addButtonClone) {
                tabsContainer.appendChild(addButtonClone);
            }
            if (importButtonClone) {
                tabsContainer.appendChild(importButtonClone);
            }
            if (refreshButtonClone) {
                tabsContainer.appendChild(refreshButtonClone);
            }
        }

        if (itemsContainer) {
            itemsContainer.innerHTML = '';
        }

        // Load items from state
        const items = await loadSlot(slotId);

        if (items.length === 0) {
            showEmptyComparisonState();
            return true;
        }

        hideEmptyComparisonState();

        const currentSlot = getCurrentSlot();

        // Create UI for each item
        items.forEach((itemData, index) => {
            const itemId = index + 1;
            const guid = itemData.guid;

            // Store mapping
            currentItemMapping.set(itemId, guid);

            // Create tab
            const tabButton = createComparisonTab(currentSlot, itemId, guid, itemData.name);
            const tabsContainer = document.getElementById('comparison-tabs-container');
            const addButton = tabsContainer.querySelector('button[data-type="add-button"]');
            tabsContainer.insertBefore(tabButton, addButton);

            // Create item card
            const itemDiv = createComparisonItemCard(currentSlot, itemId, guid, itemData);
            document.getElementById('comparison-items-container').appendChild(itemDiv);

            // Load stats
            const statsContainer = document.getElementById(`item-${currentSlot}-${itemId}-stats-container`);
            if (itemData.stats && itemData.stats.length > 0) {
                statsContainer.innerHTML = '';
                itemData.stats.forEach((statData, statIndex) => {
                    addComparisonItemStat(itemId);
                    const statId = statIndex + 1;
                    const typeInput = document.getElementById(`item-${currentSlot}-${itemId}-stat-${statId}-type`);
                    const valueInput = document.getElementById(`item-${currentSlot}-${itemId}-stat-${statId}-value`);
                    if (typeInput) {
                        typeInput.value = statData.type;
                        typeInput.setAttribute('onchange', `saveSlotItemData('${guid}')`);
                    }
                    if (valueInput) {
                        valueInput.value = statData.value;
                        valueInput.setAttribute('onchange', `saveSlotItemData('${guid}')`);
                    }
                });
            }

            // Select first item by default
            if (index === 0) {
                switchComparisonItemTab(itemId);
            }
        });

        return true;

    } catch (error) {
        console.error(`[ComparisonUI] Failed to load slot ${slotId}:`, error);
        showEmptyComparisonState();
        return false;
    }
};

// ============================================================================
// UI HELPERS
// ============================================================================

/**
 * Get current slot's item count from UI
 * @returns {number} Number of items
 */
function getSlotItemCount() {
    return currentItemMapping.size;
}

/**
 * Update item name in tab when name input changes
 * @param {number} itemId - UI item ID
 */
export function updateComparisonItemTabName(itemId) {
    const currentSlot = getCurrentSlot();
    const nameInput = document.getElementById(`item-${currentSlot}-${itemId}-name`);
    const tabButton = document.getElementById(`comparison-tab-${currentSlot}-${itemId}`);

    if (nameInput && tabButton) {
        const nameSpan = tabButton.querySelector('.tab-item-name');
        if (nameSpan) {
            nameSpan.textContent = nameInput.value || `Item ${itemId}`;
        }
    }

    saveToLocalStorage();
}
window.updateComparisonItemTabName = updateComparisonItemTabName;

/**
 * Switch to a specific comparison item tab
 * @param {number} itemId - UI item ID
 */
export function switchComparisonItemTab(itemId) {
    const currentSlot = getCurrentSlot();

    // Hide all items
    const allItems = document.querySelectorAll(`[id^="comparison-item-${currentSlot}-"]`);
    allItems.forEach(item => {
        item.style.display = 'none';
    });

    // Deactivate all tabs
    const allTabs = document.querySelectorAll(`[id^="comparison-tab-${currentSlot}-"]`);
    allTabs.forEach(tab => {
        tab.classList.remove('active');
        tab.setAttribute('aria-selected', 'false');
    });

    // Show selected item
    const selectedItem = document.getElementById(`comparison-item-${currentSlot}-${itemId}`);
    if (selectedItem) {
        selectedItem.style.display = 'block';
        activeComparisonItemId = itemId;
    }

    // Activate selected tab
    const selectedTab = document.getElementById(`comparison-tab-${currentSlot}-${itemId}`);
    if (selectedTab) {
        selectedTab.classList.add('active');
        selectedTab.setAttribute('aria-selected', 'true');
    }
}
window.switchComparisonItemTab = switchComparisonItemTab;

// ============================================================================
// DOM CREATION
// ============================================================================

/**
 * Generate a unique GUID for a new item
 * @returns {string} GUID
 */
function generateGuid() {
    return 'item-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

/**
 * Create a comparison tab button
 * @param {string} currentSlot - Current equipment slot
 * @param {number} itemId - UI item ID
 * @param {string} guid - Item GUID
 * @param {string} name - Item name
 * @returns {HTMLElement} Tab button element
 */
function createComparisonTab(currentSlot, itemId, guid, name) {
    const tabButton = document.createElement('button');
    tabButton.id = `comparison-tab-${currentSlot}-${itemId}`;
    tabButton.dataset.guid = guid;
    tabButton.className = 'comparison-tab-button';
    tabButton.setAttribute('role', 'tab');
    tabButton.setAttribute('aria-selected', 'false');
    tabButton.setAttribute('aria-controls', `comparison-item-${currentSlot}-${itemId}`);
    tabButton.onclick = () => switchComparisonItemTab(itemId);

    const nameSpan = document.createElement('span');
    nameSpan.className = 'tab-item-name';
    nameSpan.textContent = name || `Item ${itemId}`;

    const removeButton = document.createElement('button');
    removeButton.className = 'comparison-tab-remove';
    removeButton.setAttribute('aria-label', `Remove ${name || `Item ${itemId}`}`);
    removeButton.onclick = (e) => {
        e.stopPropagation();
        removeComparisonItem(itemId);
    };
    removeButton.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
        </svg>
    `;

    tabButton.appendChild(nameSpan);
    tabButton.appendChild(removeButton);

    return tabButton;
}

/**
 * Create a comparison item card
 * @param {string} currentSlot - Current equipment slot
 * @param {number} itemId - UI item ID
 * @param {string} guid - Item GUID
 * @param {Object} itemData - Item data
 * @returns {HTMLElement} Item card element
 */
function createComparisonItemCard(currentSlot, itemId, guid, itemData = { name: '', attack: 0, stats: [], isNew: false }) {
    const itemDiv = document.createElement('div');
    itemDiv.id = `comparison-item-${currentSlot}-${itemId}`;
    itemDiv.dataset.guid = guid;
    itemDiv.dataset.isNew = itemData.isNew ? 'true' : 'false'; // Store isNew flag for retrieval
    itemDiv.className = 'comparison-item-card';
    itemDiv.style.display = 'none';
    itemDiv.setAttribute('role', 'tabpanel');
    itemDiv.setAttribute('aria-labelledby', `comparison-tab-${currentSlot}-${itemId}`);

    itemDiv.innerHTML = `
        <div class="comparison-card-inner">
            <div class="comparison-card-header">
                <div class="comparison-inputs-row">
                    <div class="input-group comparison-input-group">
                        <label for="item-${currentSlot}-${itemId}-name">Name</label>
                        <input type="text" id="item-${currentSlot}-${itemId}-name" value="${itemData.name || `Item ${itemId}`}"
                            maxlength="50"
                            onchange="updateComparisonItemTabName(${itemId}); saveSlotItemData('${guid}')"
                            aria-label="Item name" />
                    </div>
                    <div class="input-group comparison-input-group">
                        <label for="item-${currentSlot}-${itemId}-attack">Attack</label>
                        <input type="number" id="item-${currentSlot}-${itemId}-attack" value="${itemData.attack || 0}"
                            onchange="saveSlotItemData('${guid}')"
                            aria-label="Item attack value" />
                    </div>
                </div>
            </div>

            <div id="item-${currentSlot}-${itemId}-stats-container" class="comparison-stats-container"></div>

            <div class="comparison-card-actions">
                <button onclick="addComparisonItemStat(${itemId})" class="comparison-action-btn comparison-action-btn--add" aria-label="Add stat to item">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                        <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
                    </svg>
                    <span>Add Stat</span>
                </button>
                <button onclick="equipItem(${itemId})" class="comparison-action-btn comparison-action-btn--equip" aria-label="Equip this item">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                        <path d="M10.97 4.97a.75.75 0 0 1 1.07 1.05l-3.99 4.99a.75.75 0 0 1-1.08.02L4.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093 3.473-4.425a.267.267 0 0 1 .02-.022z"/>
                    </svg>
                    <span>Equip</span>
                </button>
            </div>
        </div>
    `;

    return itemDiv;
}

// ============================================================================
// ITEM OPERATIONS
// ============================================================================

/**
 * Add a new comparison item
 */
export async function addComparisonItem() {
    try {
        const currentSlot = getCurrentSlot();
        const itemId = getSlotItemCount() + 1;
        const guid = generateGuid();

        hideEmptyComparisonState();

        // Create UI
        const tabsContainer = document.getElementById('comparison-tabs-container');
        const tabButton = createComparisonTab(currentSlot, itemId, guid, `Item ${itemId}`);

        const addButton = tabsContainer.querySelector('button[data-type="add-button"]');
        tabsContainer.insertBefore(tabButton, addButton);

        const itemDiv = createComparisonItemCard(currentSlot, itemId, guid);
        document.getElementById('comparison-items-container').appendChild(itemDiv);

        // Update mapping
        currentItemMapping.set(itemId, guid);

        // Save to state
        await updateItem(currentSlot, guid, {
            name: `Item ${itemId}`,
            attack: 0,
            stats: []
        });

        switchComparisonItemTab(itemId);

    } catch (error) {
        console.error('[ComparisonUI] Failed to add comparison item:', error);
    }
}
window.addComparisonItem = addComparisonItem;

/**
 * Remove a comparison item
 * @param {number} itemId - UI item ID
 * @param {boolean} skipConfirmation - If true, skip the Equipment Viewer removal confirmation
 */
export async function removeComparisonItem(itemId, skipConfirmation = false) {
    try {
        const currentSlot = getCurrentSlot();
        const guid = getGuidFromItemId(currentSlot, itemId);

        if (!guid) {
            console.error(`[ComparisonUI] Could not find guid for item ${itemId}`);
            return;
        }

        const item = document.getElementById(`comparison-item-${currentSlot}-${itemId}`);
        const tab = document.getElementById(`comparison-tab-${currentSlot}-${itemId}`);

        if (item && tab) {
            // Get item name and attack before removing (for Equipment Viewer removal)
            const nameInput = document.getElementById(`item-${currentSlot}-${itemId}-name`);
            const attackInput = document.getElementById(`item-${currentSlot}-${itemId}-attack`);
            const itemName = nameInput ? nameInput.value : '';
            const itemAttack = attackInput ? parseFloat(attackInput.value) || 0 : 0;
            
            // Check if Equipment Viewer has data and ask if they want to remove from there too
            let removeFromViewer = false;
            if (!skipConfirmation && hasEquipmentViewerData() && itemName) {
                removeFromViewer = confirm(
                    `Remove "${itemName}" from comparison?\n\n` +
                    `Click OK to also remove from Equipment Viewer.\n` +
                    `Click Cancel to only remove from comparison (keep in Equipment Viewer).`
                );
            }
            
            // Animate out
            item.style.opacity = '0';
            tab.style.opacity = '0';

            setTimeout(async () => {
                item.remove();
                tab.remove();
                currentItemMapping.delete(itemId);

                // Update state
                await removeItem(currentSlot, guid);
                
                // Remove from Equipment Viewer if confirmed
                if (removeFromViewer && itemName) {
                    const removed = removeItemFromEquipmentViewer(currentSlot, itemName, itemAttack);
                    if (removed) {
                        console.log('[ComparisonUI] Item also removed from Equipment Viewer');
                        // Update button counts
                        updateEquipmentViewerButton();
                    } else {
                        console.log('[ComparisonUI] Item not found in Equipment Viewer (may have been added manually)');
                    }
                }

                if (activeComparisonItemId === itemId) {
                    const remainingTabs = document.querySelectorAll(`[id^="comparison-tab-${currentSlot}-"]`);

                    if (remainingTabs.length > 0) {
                        const firstTabId = parseInt(remainingTabs[0].id.replace(`comparison-tab-${currentSlot}-`, ''));
                        switchComparisonItemTab(firstTabId);
                    } else {
                        activeComparisonItemId = null;
                        showEmptyComparisonState();
                    }
                }

                calculate();
            }, COMPARISON_CONFIG.ANIMATION_DURATION_MS);
        }

    } catch (error) {
        console.error('[ComparisonUI] Failed to remove comparison item:', error);
    }
}
window.removeComparisonItem = removeComparisonItem;

/**
 * Add a stat to a comparison item
 * @param {number} itemId - UI item ID
 */
export async function addComparisonItemStat(itemId) {
    try {
        const currentSlot = getCurrentSlot();
        const container = document.getElementById(`item-${currentSlot}-${itemId}-stats-container`);
        const currentStats = container.children.length;

        if (currentStats >= COMPARISON_CONFIG.MAX_STATS_PER_ITEM) {
            alert(`Maximum ${COMPARISON_CONFIG.MAX_STATS_PER_ITEM} stats allowed per item`);
            return;
        }

        const guid = getGuidFromItemId(currentSlot, itemId);
        if (!guid) {
            console.error(`[ComparisonUI] Could not find guid for item ${itemId}`);
            return;
        }

        let statId = 1;
        while (document.getElementById(`item-${currentSlot}-${itemId}-stat-${statId}`)) {
            statId++;
        }

        const statDiv = document.createElement('div');
        statDiv.id = `item-${currentSlot}-${itemId}-stat-${statId}`;
        statDiv.className = 'comparison-stat-row';
        statDiv.style.cssText = '--animation-order: ' + statId;

        let optionsHTML = '';
        availableStats.forEach(stat => {
            optionsHTML += `<option value="${stat.value}">${stat.label}</option>`;
        });

        statDiv.innerHTML = `
            <div class="input-group comparison-stat-group">
                <label for="item-${currentSlot}-${itemId}-stat-${statId}-type" class="comparison-stat-label">Stat Type</label>
                <select id="item-${currentSlot}-${itemId}-stat-${statId}-type" aria-label="Stat type">
                    ${optionsHTML}
                </select>
            </div>
            <div class="input-group comparison-stat-group">
                <label for="item-${currentSlot}-${itemId}-stat-${statId}-value" class="comparison-stat-label">Value</label>
                <input type="number" step="0.1" id="item-${currentSlot}-${itemId}-stat-${statId}-value" value="0" aria-label="Stat value">
            </div>
            <button onclick="removeComparisonItemStat(${itemId}, ${statId})" class="comparison-stat-remove" aria-label="Remove stat">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                    <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
                </svg>
            </button>
        `;

        container.appendChild(statDiv);

        const typeInput = document.getElementById(`item-${currentSlot}-${itemId}-stat-${statId}-type`);
        const valueInput = document.getElementById(`item-${currentSlot}-${itemId}-stat-${statId}-value`);

        typeInput.onchange = () => saveSlotItemData(guid);
        valueInput.onchange = () => saveSlotItemData(guid);

        // Save after adding stat
        await saveSlotItemData(guid);

    } catch (error) {
        console.error('[ComparisonUI] Failed to add comparison item stat:', error);
    }
}
window.addComparisonItemStat = addComparisonItemStat;

/**
 * Remove a stat from a comparison item
 * @param {number} itemId - UI item ID
 * @param {number} statId - Stat ID
 */
export async function removeComparisonItemStat(itemId, statId) {
    try {
        const currentSlot = getCurrentSlot();
        const guid = getGuidFromItemId(currentSlot, itemId);

        if (!guid) {
            console.error(`[ComparisonUI] Could not find guid for item ${itemId}`);
            return;
        }

        const stat = document.getElementById(`item-${currentSlot}-${itemId}-stat-${statId}`);
        if (stat) {
            stat.style.opacity = '0';
            stat.style.transform = 'translateX(-20px)';
            setTimeout(async () => {
                stat.remove();
                // Save after removing stat
                await saveSlotItemData(guid);
            }, COMPARISON_CONFIG.ANIMATION_DURATION_MS);
        }

    } catch (error) {
        console.error('[ComparisonUI] Failed to remove comparison item stat:', error);
    }
}
window.removeComparisonItemStat = removeComparisonItemStat;

// ============================================================================
// EMPTY STATE
// ============================================================================

/**
 * Show empty state when no comparison items exist
 */
function showEmptyComparisonState() {
    const container = document.getElementById('comparison-items-container');
    if (container && container.children.length === 0) {
        const emptyState = document.createElement('div');
        emptyState.className = 'comparison-empty-state';
        emptyState.innerHTML = `
            <div class="comparison-empty-icon">
                <svg width="48" height="48" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                    <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
                    <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
                </svg>
            </div>
            <p class="comparison-empty-text">No comparison items yet</p>
            <p class="comparison-empty-subtext">Add items to compare with your equipped gear</p>
        `;
        container.appendChild(emptyState);
    }
}

/**
 * Remove empty state when items are added
 */
function hideEmptyComparisonState() {
    const container = document.getElementById('comparison-items-container');
    if (container) {
        const emptyStates = container.querySelectorAll('.comparison-empty-state');
        emptyStates.forEach(state => state.remove());
    }
}

// ============================================================================
// EQUIPMENT VIEWER INTEGRATION
// ============================================================================

// Track selected items for import
let viewerItemsForImport = [];
let selectedViewerItemIndices = new Set();

/**
 * Update the import and refresh button visibility based on Equipment Viewer data availability
 * @param {number} retryCount - Number of retries remaining (for deferred execution)
 */
export function updateEquipmentViewerButton(retryCount = 3) {
    console.log('[ComparisonUI] updateEquipmentViewerButton called, retries left:', retryCount);
    const importBtn = document.getElementById('import-from-viewer-btn');
    const refreshBtn = document.getElementById('refresh-from-viewer-btn');
    
    // At minimum need the import button
    if (!importBtn) {
        console.log('[ComparisonUI] Import button not found in DOM');
        // Retry after a delay if button not found yet (tab might not be rendered)
        if (retryCount > 0) {
            setTimeout(() => updateEquipmentViewerButton(retryCount - 1), 500);
        }
        return;
    }
    
    const currentSlot = getCurrentSlot();
    console.log('[ComparisonUI] Current slot:', currentSlot);
    const hasData = hasEquipmentViewerData();
    console.log('[ComparisonUI] Has equipment viewer data:', hasData);
    
    if (hasData) {
        const counts = getItemCountsBySlot();
        console.log('[ComparisonUI] Item counts by slot:', counts);
        const slotCount = counts[currentSlot] || 0;
        console.log('[ComparisonUI] Slot count for', currentSlot, ':', slotCount);
        
        if (slotCount > 0) {
            importBtn.style.display = 'flex';
            if (refreshBtn) refreshBtn.style.display = 'flex';
            const countSpan = document.getElementById('viewer-item-count');
            if (countSpan) {
                countSpan.textContent = slotCount.toString();
            }
            console.log('[ComparisonUI] Import and Refresh buttons shown');
        } else {
            importBtn.style.display = 'none';
            if (refreshBtn) refreshBtn.style.display = 'none';
            console.log('[ComparisonUI] Buttons hidden (no items for slot)');
        }
        // Initialize Best Per Slot dashboard when viewer data is available
        initializeBestPerSlot();
    } else {
        importBtn.style.display = 'none';
        if (refreshBtn) refreshBtn.style.display = 'none';
        console.log('[ComparisonUI] Buttons hidden (no data)');
    }
}

/**
 * Open the Equipment Viewer import modal
 */
export function openEquipmentViewerImport() {
    const currentSlot = getCurrentSlot();
    const viewerSlotName = getEquipmentViewerSlotName(currentSlot);
    
    // Get items for current slot
    viewerItemsForImport = getItemsForSlot(currentSlot);
    selectedViewerItemIndices.clear();
    
    // Update modal info text
    const infoEl = document.getElementById('ev-modal-slot-info');
    if (infoEl) {
        infoEl.textContent = `Select items to import for ${viewerSlotName || currentSlot}:`;
    }
    
    // Populate items list
    const listEl = document.getElementById('ev-modal-items-list');
    const emptyEl = document.getElementById('ev-modal-empty');
    
    if (listEl) {
        listEl.innerHTML = '';
        
        if (viewerItemsForImport.length === 0) {
            listEl.style.display = 'none';
            if (emptyEl) emptyEl.style.display = 'block';
        } else {
            listEl.style.display = 'flex';
            if (emptyEl) emptyEl.style.display = 'none';
            
            viewerItemsForImport.forEach((item, index) => {
                const itemEl = createViewerItemElement(item, index);
                listEl.appendChild(itemEl);
            });
        }
    }
    
    // Update selected count
    updateSelectedCount();
    
    // Show modal
    const modal = document.getElementById('equipment-viewer-modal');
    if (modal) {
        modal.style.display = 'flex';
    }
}
window.openEquipmentViewerImport = openEquipmentViewerImport;

/**
 * Create DOM element for a viewer item in the import modal
 */
function createViewerItemElement(item, index) {
    const div = document.createElement('div');
    div.className = 'ev-modal-item';
    div.dataset.index = index;
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'ev-modal-item-checkbox';
    checkbox.id = `ev-item-${index}`;
    checkbox.addEventListener('change', () => {
        if (checkbox.checked) {
            selectedViewerItemIndices.add(index);
            div.classList.add('selected');
        } else {
            selectedViewerItemIndices.delete(index);
            div.classList.remove('selected');
        }
        updateSelectedCount();
    });
    
    const details = document.createElement('div');
    details.className = 'ev-modal-item-details';
    
    const name = document.createElement('div');
    name.className = 'ev-modal-item-name';
    name.textContent = item.name || `Item ${index + 1}`;
    
    const statsDiv = document.createElement('div');
    statsDiv.className = 'ev-modal-item-stats';
    
    // Add attack stat
    if (item.attack) {
        const attackSpan = document.createElement('span');
        attackSpan.className = 'ev-modal-item-stat ev-modal-item-stat--attack';
        attackSpan.textContent = `ATK: ${item.attack}`;
        statsDiv.appendChild(attackSpan);
    }
    
    // Add other stats (limit to first 4)
    const displayStats = (item.stats || []).slice(0, 4);
    displayStats.forEach(stat => {
        const statLabel = availableStats.find(s => s.value === stat.type)?.label || stat.type;
        const shortLabel = statLabel.replace(' (%)', '').replace(' Monster Damage', '');
        const statSpan = document.createElement('span');
        statSpan.className = 'ev-modal-item-stat';
        statSpan.textContent = `${shortLabel}: ${stat.value}`;
        statsDiv.appendChild(statSpan);
    });
    
    if ((item.stats || []).length > 4) {
        const moreSpan = document.createElement('span');
        moreSpan.className = 'ev-modal-item-stat';
        moreSpan.textContent = `+${item.stats.length - 4} more`;
        statsDiv.appendChild(moreSpan);
    }
    
    details.appendChild(name);
    details.appendChild(statsDiv);
    
    div.appendChild(checkbox);
    div.appendChild(details);
    
    // Make entire row clickable
    div.addEventListener('click', (e) => {
        if (e.target !== checkbox) {
            checkbox.checked = !checkbox.checked;
            checkbox.dispatchEvent(new Event('change'));
        }
    });
    
    return div;
}

/**
 * Update the selected count in the modal
 */
function updateSelectedCount() {
    const countEl = document.getElementById('ev-selected-count');
    if (countEl) {
        countEl.textContent = selectedViewerItemIndices.size.toString();
    }
    
    // Enable/disable import button
    const importBtn = document.querySelector('.ev-modal-btn--primary');
    if (importBtn) {
        importBtn.disabled = selectedViewerItemIndices.size === 0;
    }
}

/**
 * Close the Equipment Viewer import modal
 */
export function closeEquipmentViewerModal() {
    const modal = document.getElementById('equipment-viewer-modal');
    if (modal) {
        modal.style.display = 'none';
    }
    viewerItemsForImport = [];
    selectedViewerItemIndices.clear();
}
window.closeEquipmentViewerModal = closeEquipmentViewerModal;

/**
 * Import selected items from the Equipment Viewer
 */
export async function importSelectedViewerItems() {
    if (selectedViewerItemIndices.size === 0) return;
    
    const currentSlot = getCurrentSlot();
    
    try {
        hideEmptyComparisonState();
        
        // Import each selected item
        for (const index of selectedViewerItemIndices) {
            const viewerItem = viewerItemsForImport[index];
            if (!viewerItem) continue;
            
            // Get next item ID
            const itemId = getSlotItemCount() + 1;
            const guid = generateGuid();
            
            // Create UI
            const tabsContainer = document.getElementById('comparison-tabs-container');
            const tabButton = createComparisonTab(currentSlot, itemId, guid, viewerItem.name);
            
            const addButton = tabsContainer.querySelector('button[data-type="add-button"]');
            tabsContainer.insertBefore(tabButton, addButton);
            
            const itemDiv = createComparisonItemCard(currentSlot, itemId, guid, {
                name: viewerItem.name,
                attack: viewerItem.attack,
                stats: []
            });
            document.getElementById('comparison-items-container').appendChild(itemDiv);
            
            // Update mapping
            currentItemMapping.set(itemId, guid);
            
            // Add stats to the UI
            const statsContainer = document.getElementById(`item-${currentSlot}-${itemId}-stats-container`);
            if (viewerItem.stats && viewerItem.stats.length > 0 && statsContainer) {
                for (let i = 0; i < viewerItem.stats.length; i++) {
                    const stat = viewerItem.stats[i];
                    await addComparisonItemStat(itemId);
                    
                    const statId = i + 1;
                    const typeInput = document.getElementById(`item-${currentSlot}-${itemId}-stat-${statId}-type`);
                    const valueInput = document.getElementById(`item-${currentSlot}-${itemId}-stat-${statId}-value`);
                    
                    if (typeInput) {
                        typeInput.value = stat.type;
                        typeInput.setAttribute('onchange', `saveSlotItemData('${guid}')`);
                    }
                    if (valueInput) {
                        valueInput.value = stat.value;
                        valueInput.setAttribute('onchange', `saveSlotItemData('${guid}')`);
                    }
                }
            }
            
            // Save to state
            await updateItem(currentSlot, guid, {
                name: viewerItem.name,
                attack: viewerItem.attack,
                stats: viewerItem.stats || []
            });
        }
        
        // Switch to the first newly imported item
        const firstNewItemId = getSlotItemCount() - selectedViewerItemIndices.size + 1;
        switchComparisonItemTab(firstNewItemId);
        
        // Close modal
        closeEquipmentViewerModal();
        
        // Recalculate
        calculate();
        
    } catch (error) {
        console.error('[ComparisonUI] Failed to import viewer items:', error);
        alert('Failed to import some items. Please try again.');
    }
}
window.importSelectedViewerItems = importSelectedViewerItems;

// ============================================================================
// AUTO-POPULATE FROM EQUIPMENT VIEWER
// ============================================================================

/**
 * Auto-populate the equipped item and comparison items from Equipment Viewer data
 * @param {string} slotId - Calculator slot ID (e.g., 'head', 'chest')
 */
export async function autoPopulateFromEquipmentViewer(slotId) {
    console.log('[ComparisonUI] autoPopulateFromEquipmentViewer called for slot:', slotId);
    
    if (!hasEquipmentViewerData()) {
        console.log('[ComparisonUI] No equipment viewer data available');
        return;
    }
    
    const { equippedItem, comparisonItems } = getItemsForSlotSeparated(slotId);
    console.log('[ComparisonUI] Found:', { equippedItem: !!equippedItem, comparisonCount: comparisonItems.length });
    
    // Set the equipped item in the Equipment tab
    if (equippedItem) {
        // Convert to the format expected by setSlotData
        const statLines = (equippedItem.stats || []).map(stat => ({
            type: stat.type,
            value: parseFloat(stat.value) || 0
        }));
        
        setSlotData(slotId, {
            name: equippedItem.name,
            attack: equippedItem.attack || 0,
            mainStat: 0,
            statLines: statLines
        });
        
        // Update the equipped display in the comparison UI
        updateEquippedDisplay(slotId, equippedItem);
        console.log('[ComparisonUI] Set equipped item:', equippedItem.name);
    }
    
    // Add comparison items
    if (comparisonItems.length > 0) {
        // Check how many items are already loaded
        const existingCount = getSlotItemCount();
        console.log('[ComparisonUI] Existing comparison items:', existingCount);
        
        // Only add items if there are none already
        if (existingCount === 0) {
            for (const viewerItem of comparisonItems) {
                await addComparisonItemFromViewer(viewerItem);
            }
            
            // Switch to first item tab if any were added
            if (comparisonItems.length > 0) {
                switchComparisonItemTab(1);
            }
            console.log('[ComparisonUI] Added', comparisonItems.length, 'comparison items');
        }
    }
}

/**
 * Clear all comparison items for the current slot
 */
export async function clearAllComparisonItems() {
    const currentSlot = getCurrentSlot();
    console.log('[ComparisonUI] Clearing all comparison items for slot:', currentSlot);
    
    // Get all item IDs from the mapping
    const itemIds = Array.from(currentItemMapping.keys());
    
    // Remove each item (without animation for speed)
    for (const itemId of itemIds) {
        const guid = currentItemMapping.get(itemId);
        const item = document.getElementById(`comparison-item-${currentSlot}-${itemId}`);
        const tab = document.getElementById(`comparison-tab-${currentSlot}-${itemId}`);
        
        if (item) item.remove();
        if (tab) tab.remove();
        
        currentItemMapping.delete(itemId);
        
        // Remove from state
        if (guid) {
            await removeItem(currentSlot, guid);
        }
    }
    
    // Show empty state
    showEmptyComparisonState();
    
    console.log('[ComparisonUI] Cleared all comparison items');
}
window.clearAllComparisonItems = clearAllComparisonItems;

/**
 * Refresh comparison items from Equipment Viewer (clear and re-pull)
 */
export async function refreshFromEquipmentViewer() {
    const currentSlot = getCurrentSlot();
    console.log('[ComparisonUI] Refreshing from Equipment Viewer for slot:', currentSlot);
    
    if (!hasEquipmentViewerData()) {
        alert('No Equipment Viewer data available. Please load data in the Equipment Viewer first.');
        return;
    }
    
    // Clear existing items
    await clearAllComparisonItems();
    
    // Re-populate from equipment viewer
    const { equippedItem, comparisonItems } = getItemsForSlotSeparated(currentSlot);
    console.log('[ComparisonUI] Found:', { equippedItem: !!equippedItem, comparisonCount: comparisonItems.length });
    
    // Set the equipped item
    if (equippedItem) {
        const statLines = (equippedItem.stats || []).map(stat => ({
            type: stat.type,
            value: parseFloat(stat.value) || 0
        }));
        
        setSlotData(currentSlot, {
            name: equippedItem.name,
            attack: equippedItem.attack || 0,
            mainStat: 0,
            statLines: statLines
        });
        
        updateEquippedDisplay(currentSlot, equippedItem);
        console.log('[ComparisonUI] Set equipped item:', equippedItem.name);
    }
    
    // Add comparison items
    for (const viewerItem of comparisonItems) {
        await addComparisonItemFromViewer(viewerItem);
    }
    
    // Switch to first item tab if any were added
    if (comparisonItems.length > 0) {
        switchComparisonItemTab(1);
    }
    
    console.log('[ComparisonUI] Refreshed', comparisonItems.length, 'comparison items from Equipment Viewer');
    
    // Recalculate
    calculate();
    
    // Refresh the Best Per Slot dashboard
    refreshBestPerSlot();
}
window.refreshFromEquipmentViewer = refreshFromEquipmentViewer;

/**
 * Update the equipped item display with data from Equipment Viewer
 */
function updateEquippedDisplay(slotId, equippedItem) {
    const nameInput = document.getElementById('equipped-name');
    const attackInput = document.getElementById('equipped-attack');
    const statsContainer = document.getElementById('equipped-stats-container');
    
    if (nameInput) {
        nameInput.value = equippedItem.name || '';
    }
    if (attackInput) {
        attackInput.value = equippedItem.attack || 0;
    }
    
    // Clear and rebuild stats
    if (statsContainer && equippedItem.stats) {
        statsContainer.innerHTML = '';
        equippedItem.stats.forEach((stat, index) => {
            addStatLineToEquippedDisplay(stat.type, stat.value, index + 1);
        });
    }
}

/**
 * Add a stat line to the equipped display
 */
function addStatLineToEquippedDisplay(type, value, statId) {
    const container = document.getElementById('equipped-stats-container');
    if (!container) return;
    
    let optionsHTML = '';
    availableStats.forEach(stat => {
        const selected = stat.value === type ? 'selected' : '';
        optionsHTML += `<option value="${stat.value}" ${selected}>${stat.label}</option>`;
    });
    
    const statDiv = document.createElement('div');
    statDiv.id = `equipped-stat-${statId}`;
    statDiv.style.cssText = 'display: grid; grid-template-columns: 1fr 80px; gap: 8px; margin-bottom: 6px; align-items: end;';
    
    statDiv.innerHTML = `
        <div class="input-group">
            <label style="font-size: 0.8em;">Stat</label>
            <select id="equipped-stat-${statId}-type" style="opacity: 0.9;">
                ${optionsHTML}
            </select>
        </div>
        <div class="input-group">
            <label style="font-size: 0.8em;">Value</label>
            <input type="number" step="0.1" id="equipped-stat-${statId}-value" value="${value}" style="opacity: 0.9;">
        </div>
    `;
    
    container.appendChild(statDiv);
}

/**
 * Add a comparison item from Equipment Viewer data
 */
async function addComparisonItemFromViewer(viewerItem) {
    try {
        const currentSlot = getCurrentSlot();
        const itemId = getSlotItemCount() + 1;
        const guid = generateGuid();
        
        hideEmptyComparisonState();
        
        // Create UI
        const tabsContainer = document.getElementById('comparison-tabs-container');
        const tabButton = createComparisonTab(currentSlot, itemId, guid, viewerItem.name);
        
        const addButton = tabsContainer.querySelector('button[data-type="add-button"]');
        tabsContainer.insertBefore(tabButton, addButton);
        
        const itemDiv = createComparisonItemCard(currentSlot, itemId, guid, {
            name: viewerItem.name,
            attack: viewerItem.attack,
            stats: [],
            isNew: viewerItem.isNew || false
        });
        document.getElementById('comparison-items-container').appendChild(itemDiv);
        
        // Update mapping
        currentItemMapping.set(itemId, guid);
        
        // Add stats to the UI
        const statsContainer = document.getElementById(`item-${currentSlot}-${itemId}-stats-container`);
        if (viewerItem.stats && viewerItem.stats.length > 0 && statsContainer) {
            for (let i = 0; i < viewerItem.stats.length; i++) {
                const stat = viewerItem.stats[i];
                await addComparisonItemStat(itemId);
                
                const statId = i + 1;
                const typeInput = document.getElementById(`item-${currentSlot}-${itemId}-stat-${statId}-type`);
                const valueInput = document.getElementById(`item-${currentSlot}-${itemId}-stat-${statId}-value`);
                
                if (typeInput) {
                    typeInput.value = stat.type;
                    typeInput.setAttribute('onchange', `saveSlotItemData('${guid}')`);
                }
                if (valueInput) {
                    valueInput.value = stat.value;
                    valueInput.setAttribute('onchange', `saveSlotItemData('${guid}')`);
                }
            }
        }
        
        // Save to state (include isNew flag from viewer)
        await updateItem(currentSlot, guid, {
            name: viewerItem.name,
            attack: viewerItem.attack,
            stats: viewerItem.stats || [],
            isNew: viewerItem.isNew || false
        });
        
    } catch (error) {
        console.error('[ComparisonUI] Failed to add comparison item from viewer:', error);
    }
}
