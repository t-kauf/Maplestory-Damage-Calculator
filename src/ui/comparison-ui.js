// Comparison items UI functionality - Enhanced UI/UX Version
import { saveToLocalStorage } from '@core/storage.js';
import { availableStats } from '@core/constants.js';
import { calculate } from '@core/main.js';
import { equipItemFromComparison, getCurrentSlot } from '@ui/comparison/slot-comparison.js';

// Track active comparison item
let activeComparisonItemId = null;

// Configuration object for magic numbers
const COMPARISON_CONFIG = {
    MAX_STATS_PER_ITEM: 6,
    DEBOUNCE_DELAY_MS: 300,
    ANIMATION_DURATION_MS: 200,
    MIN_TOUCH_TARGET_SIZE: 44 // px
};

// Generate simple GUID
function generateGuid() {
    return 'item-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

// Debounce utility for performance optimization
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Save single item data (debounced version)
const debouncedSaveSlotItemData = debounce((guid) => {
    _saveSlotItemData(guid);
}, COMPARISON_CONFIG.DEBOUNCE_DELAY_MS);

// Internal save implementation
function _saveSlotItemData(guid) {
    const currentSlot = getCurrentSlot();
    const itemDiv = document.querySelector(`div[data-guid="${guid}"]`);
    if (!itemDiv) return;

    const itemId = itemDiv.id.replace(`comparison-item-${currentSlot}-`, '');
    const nameInput = document.getElementById(`item-${currentSlot}-${itemId}-name`);
    const attackInput = document.getElementById(`item-${currentSlot}-${itemId}-attack`);
    const statsContainer = document.getElementById(`item-${currentSlot}-${itemId}-stats-container`);

    if (!nameInput || !attackInput || !statsContainer) return;

    const stats = [];
    if (statsContainer) {
        statsContainer.querySelectorAll('[id^="item-' + currentSlot + '-' + itemId + '-stat-"]').forEach(statDiv => {
            const typeInput = statDiv.querySelector('[id$="-type"]');
            const valueInput = statDiv.querySelector('[id$="-value"]');
            if (typeInput && valueInput) {
                stats.push({ type: typeInput.value, value: valueInput.value });
            }
        });
    }

    const itemData = {
        guid: guid,
        name: nameInput.value,
        attack: attackInput.value,
        stats: stats
    };

    const storageKey = `comparisonItems.${currentSlot}`;
    const slotItems = JSON.parse(localStorage.getItem(storageKey) || '[]');

    const existingIndex = slotItems.findIndex(item => item.guid === guid);
    if (existingIndex >= 0) {
        slotItems[existingIndex] = itemData;
    } else {
        slotItems.push(itemData);
    }

    localStorage.setItem(storageKey, JSON.stringify(slotItems));
}

// Global save function (debounced)
window.saveSlotItemData = function(guid) {
    debouncedSaveSlotItemData(guid);
};

// Save all items in current slot
function saveCurrentSlotItems() {
    const currentSlot = getCurrentSlot();
    const tabs = document.querySelectorAll('[id^="comparison-tab-' + currentSlot + '-"]');
    const items = [];

    tabs.forEach(tab => {
        const guid = tab.dataset.guid;
        if (!guid || tab.onclick.toString().includes('addComparisonItem')) return;

        const itemId = tab.id.replace(`comparison-tab-${currentSlot}-`, '');
        const nameInput = document.getElementById(`item-${currentSlot}-${itemId}-name`);
        const attackInput = document.getElementById(`item-${currentSlot}-${itemId}-attack`);
        const statsContainer = document.getElementById(`item-${currentSlot}-${itemId}-stats-container`);

        const stats = [];
        statsContainer.querySelectorAll('[id^="item-' + currentSlot + '-' + itemId + '-stat-"]').forEach(statDiv => {
            const typeInput = statDiv.querySelector('[id$="-type"]');
            const valueInput = statDiv.querySelector('[id$="-value"]');
            if (typeInput && valueInput) {
                stats.push({ type: typeInput.value, value: valueInput.value });
            }
        });

        items.push({
            guid: guid,
            name: nameInput ? nameInput.value : '',
            attack: attackInput ? attackInput.value : 0,
            stats: stats
        });
    });

    localStorage.setItem(`comparisonItems.${currentSlot}`, JSON.stringify(items));
}

// Load items for a specific slot
window.loadSlotItems = function(slotId) {
    const tabsContainer = document.getElementById('comparison-tabs-container');
    const itemsContainer = document.getElementById('comparison-items-container');

    if (tabsContainer) {
        const addButton = tabsContainer.querySelector('button[onclick="addComparisonItem()"]');
        const addButtonClone = addButton ? addButton.cloneNode(true) : null;
        tabsContainer.innerHTML = '';
        if (addButtonClone) tabsContainer.appendChild(addButtonClone);
    }
    if (itemsContainer) {
        itemsContainer.innerHTML = '';
    }

    const storageKey = `comparisonItems.${slotId}`;
    const saved = localStorage.getItem(storageKey);
    if (!saved) return;

    const items = JSON.parse(saved);
    items.forEach((itemData, index) => {
        const currentSlot = getCurrentSlot();
        const itemId = index + 1;
        const guid = itemData.guid;

        const tabButton = createComparisonTab(currentSlot, itemId, guid, itemData.name);

        const tabsContainer = document.getElementById('comparison-tabs-container');
        const addButton = tabsContainer.querySelector('button[onclick="addComparisonItem()"]');
        tabsContainer.insertBefore(tabButton, addButton);

        const itemDiv = createComparisonItemCard(currentSlot, itemId, guid, itemData);
        document.getElementById('comparison-items-container').appendChild(itemDiv);

        const statsContainer = document.getElementById(`item-${currentSlot}-${itemId}-stats-container`);
        if (itemData.stats && itemData.stats.length > 0) {
            statsContainer.innerHTML = '';
            itemData.stats.forEach((statData, index) => {
                addComparisonItemStat(itemId);
                const statId = index + 1;
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

        switchComparisonItemTab(itemId);
    });
};

// Export for global access
window.saveCurrentSlotItems = saveCurrentSlotItems;

// Get current slot's item count
function getSlotItemCount() {
    const currentSlot = getCurrentSlot();
    const tabsContainer = document.getElementById('comparison-tabs-container');
    if (!tabsContainer) return 0;

    const slotTabs = tabsContainer.querySelectorAll(`[id^="comparison-tab-${currentSlot}-"]`);
    return slotTabs.length;
}

// Update item name in tab when name input changes
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

// Switch to a specific comparison item tab
export function switchComparisonItemTab(itemId) {
    const currentSlot = getCurrentSlot();

    const allItems = document.querySelectorAll(`[id^="comparison-item-${currentSlot}-"]`);
    allItems.forEach(item => {
        item.style.display = 'none';
    });

    const allTabs = document.querySelectorAll(`[id^="comparison-tab-${currentSlot}-"]`);
    allTabs.forEach(tab => {
        tab.classList.remove('active');
        tab.setAttribute('aria-selected', 'false');
    });

    const selectedItem = document.getElementById(`comparison-item-${currentSlot}-${itemId}`);
    if (selectedItem) {
        selectedItem.style.display = 'block';
        activeComparisonItemId = itemId;
    }

    const selectedTab = document.getElementById(`comparison-tab-${currentSlot}-${itemId}`);
    if (selectedTab) {
        selectedTab.classList.add('active');
        selectedTab.setAttribute('aria-selected', 'true');
    }
}
window.switchComparisonItemTab = switchComparisonItemTab;

// Create a comparison tab button with enhanced accessibility
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

// Create a comparison item card with enhanced design
function createComparisonItemCard(currentSlot, itemId, guid, itemData = { name: '', attack: 0, stats: [] }) {
    const itemDiv = document.createElement('div');
    itemDiv.id = `comparison-item-${currentSlot}-${itemId}`;
    itemDiv.dataset.guid = guid;
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

export function addComparisonItem() {
    const currentSlot = getCurrentSlot();
    const itemId = getSlotItemCount() + 1;
    const guid = generateGuid();
    const tabsContainer = document.getElementById('comparison-tabs-container');

    const tabButton = createComparisonTab(currentSlot, itemId, guid, `Item ${itemId}`);

    const addButton = tabsContainer.querySelector('button[onclick="addComparisonItem()"]');
    tabsContainer.insertBefore(tabButton, addButton);

    const itemDiv = createComparisonItemCard(currentSlot, itemId, guid);
    document.getElementById('comparison-items-container').appendChild(itemDiv);

    switchComparisonItemTab(itemId);
    saveCurrentSlotItems();
}
window.addComparisonItem = addComparisonItem;

export function removeComparisonItem(id) {
    const currentSlot = getCurrentSlot();
    const item = document.getElementById(`comparison-item-${currentSlot}-${id}`);
    const tab = document.getElementById(`comparison-tab-${currentSlot}-${id}`);

    if (item && tab) {
        // Animate out
        item.style.opacity = '0';
        tab.style.opacity = '0';

        setTimeout(() => {
            item.remove();
            tab.remove();

            if (activeComparisonItemId === id) {
                const remainingTabs = document.querySelectorAll(`[id^="comparison-tab-${currentSlot}-"]`);

                if (remainingTabs.length > 0) {
                    const firstTabId = remainingTabs[0].id.replace(`comparison-tab-${currentSlot}-`, '');
                    switchComparisonItemTab(parseInt(firstTabId));
                } else {
                    activeComparisonItemId = null;
                    showEmptyComparisonState();
                }
            }

            saveCurrentSlotItems();
            calculate();
        }, COMPARISON_CONFIG.ANIMATION_DURATION_MS);
    }
}
window.removeComparisonItem = removeComparisonItem;

// Show empty state when no comparison items exist
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

export function addComparisonItemStat(itemId) {
    const currentSlot = getCurrentSlot();
    const container = document.getElementById(`item-${currentSlot}-${itemId}-stats-container`);
    const currentStats = container.children.length;

    if (currentStats >= COMPARISON_CONFIG.MAX_STATS_PER_ITEM) {
        alert(`Maximum ${COMPARISON_CONFIG.MAX_STATS_PER_ITEM} stats allowed per item`);
        return;
    }

    const itemDiv = document.getElementById(`comparison-item-${currentSlot}-${itemId}`);
    const guid = itemDiv ? itemDiv.dataset.guid : null;

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

    if (guid) {
        typeInput.onchange = () => saveSlotItemData(guid);
        valueInput.onchange = () => saveSlotItemData(guid);
    }

    saveCurrentSlotItems();
}
window.addComparisonItemStat = addComparisonItemStat;

export function removeComparisonItemStat(itemId, statId) {
    const currentSlot = getCurrentSlot();
    const stat = document.getElementById(`item-${currentSlot}-${itemId}-stat-${statId}`);
    if (stat) {
        stat.style.opacity = '0';
        stat.style.transform = 'translateX(-20px)';
        setTimeout(() => {
            stat.remove();
            saveCurrentSlotItems();
        }, COMPARISON_CONFIG.ANIMATION_DURATION_MS);
    }
}
window.removeComparisonItemStat = removeComparisonItemStat;
