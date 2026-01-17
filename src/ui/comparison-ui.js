// Comparison items UI functionality
import { saveToLocalStorage } from '@core/storage.js';
import { availableStats } from '@core/constants.js';
import { calculate } from '@core/main.js';
import { equipItemFromComparison, getCurrentSlot } from '@ui/comparison/slot-comparison.js';

// Track active comparison item
let activeComparisonItemId = null;

// Generate simple GUID
function generateGuid() {
    return 'item-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

// Save single item data (called on input changes)
window.saveSlotItemData = function(guid) {
    const currentSlot = getCurrentSlot();
    // Find the item div (not the tab) by looking for id starting with "comparison-item-"
    const itemDiv = document.querySelector(`div[data-guid="${guid}"]`);
    if (!itemDiv) return;

    const itemId = itemDiv.id.replace(`comparison-item-${currentSlot}-`, '');
    const nameInput = document.getElementById(`item-${currentSlot}-${itemId}-name`);
    const attackInput = document.getElementById(`item-${currentSlot}-${itemId}-attack`);
    const statsContainer = document.getElementById(`item-${currentSlot}-${itemId}-stats-container`);

    if (!nameInput || !attackInput || !statsContainer) return;

    // Build item data
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

    // Get all items for current slot from localStorage
    const storageKey = `comparisonItems.${currentSlot}`;
    const slotItems = JSON.parse(localStorage.getItem(storageKey) || '[]');

    // Find and update this item, or add it if new
    const existingIndex = slotItems.findIndex(item => item.guid === guid);
    if (existingIndex >= 0) {
        slotItems[existingIndex] = itemData;
    } else {
        slotItems.push(itemData);
    }

    // Save back to localStorage
    localStorage.setItem(storageKey, JSON.stringify(slotItems));
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
    // Clear existing items first
    const tabsContainer = document.getElementById('comparison-tabs-container');
    const itemsContainer = document.getElementById('comparison-items-container');
    if (tabsContainer) {
        // Clone the add button before clearing to preserve it
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

        // Create tab
        const tabButton = document.createElement('button');
        tabButton.id = `comparison-tab-${currentSlot}-${itemId}`;
        tabButton.dataset.guid = guid;
        tabButton.className = 'tab-button px-6 py-3 text-base font-semibold cursor-pointer transition-all duration-300 border-b-[3px] border-transparent -mb-0.5 rounded-t-lg';
        tabButton.onclick = () => switchComparisonItemTab(itemId);
        tabButton.innerHTML = `
            <span class="tab-item-name">${itemData.name}</span>
            <button onclick="event.stopPropagation(); removeComparisonItem(${itemId})" class="ml-2 text-orange-500 hover:text-orange-600 dark:text-orange-400 dark:hover:text-orange-500 font-bold">✕</button>
        `;

        const tabsContainer = document.getElementById('comparison-tabs-container');
        const addButton = tabsContainer.querySelector('button[onclick="addComparisonItem()"]');
        tabsContainer.insertBefore(tabButton, addButton);

        // Create item content
        const itemDiv = document.createElement('div');
        itemDiv.id = `comparison-item-${currentSlot}-${itemId}`;
        itemDiv.dataset.guid = guid;
        itemDiv.style.display = 'none';
        itemDiv.innerHTML = `
            <div class="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-500 dark:border-blue-400 rounded-xl p-4 shadow-lg">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-2.5">
                    <div class="input-group">
                        <label>Name</label>
                        <input type="text" id="item-${currentSlot}-${itemId}-name" value="${itemData.name}" onchange="updateComparisonItemTabName(${itemId}); saveSlotItemData('${guid}')">
                    </div>
                    <div class="input-group">
                        <label>Attack</label>
                        <input type="number" id="item-${currentSlot}-${itemId}-attack" value="${itemData.attack}" onchange="saveSlotItemData('${guid}')">
                    </div>
                </div>
                <div id="item-${currentSlot}-${itemId}-stats-container"></div>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                    <button onclick="addComparisonItemStat(${itemId})" class="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white px-4 py-2.5 rounded-lg cursor-pointer font-semibold text-sm shadow-md hover:shadow-lg transition-all">+ Add Stat</button>
                    <button onclick="equipItem(${itemId})" class="bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 text-white px-4 py-2.5 rounded-lg cursor-pointer font-semibold text-sm shadow-md hover:shadow-lg transition-all">Equip</button>
                </div>
            </div>
        `;

        document.getElementById('comparison-items-container').appendChild(itemDiv);

        // Load stats
        const statsContainer = document.getElementById(`item-${currentSlot}-${itemId}-stats-container`);
        if (itemData.stats && itemData.stats.length > 0) {
            statsContainer.innerHTML = ''; // Clear default
            itemData.stats.forEach((statData, index) => {
                addComparisonItemStat(itemId);
                // Get the statId that was just created (same as index + 1)
                const statId = index + 1;
                const typeInput = document.getElementById(`item-${currentSlot}-${itemId}-stat-${statId}-type`);
                const valueInput = document.getElementById(`item-${currentSlot}-${itemId}-stat-${statId}-value`);
                if (typeInput) {
                    typeInput.value = statData.type;
                    // Add onchange handler for loaded stats
                    typeInput.setAttribute('onchange', `saveSlotItemData('${guid}')`);
                }
                if (valueInput) {
                    valueInput.value = statData.value;
                    // Add onchange handler for loaded stats
                    valueInput.setAttribute('onchange', `saveSlotItemData('${guid}')`);
                }
            });
        }

        // Switch to this item
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

    // Count tabs for current slot
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

    // Hide all comparison items for current slot
    const allItems = document.querySelectorAll(`[id^="comparison-item-${currentSlot}-"]`);
    allItems.forEach(item => {
        item.style.display = 'none';
    });

    // Remove active class from all tabs for current slot
    const allTabs = document.querySelectorAll(`[id^="comparison-tab-${currentSlot}-"]`);
    allTabs.forEach(tab => {
        tab.classList.remove('active');
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
    }
}
window.switchComparisonItemTab = switchComparisonItemTab;

export function addComparisonItem() {
    const currentSlot = getCurrentSlot();
    const itemId = getSlotItemCount() + 1;
    const guid = generateGuid(); // Generate unique ID for this item
    const container = document.getElementById('comparison-items-container');
    const tabsContainer = document.getElementById('comparison-tabs-container');

    // Create tab button
    const tabButton = document.createElement('button');
    tabButton.id = `comparison-tab-${currentSlot}-${itemId}`;
    tabButton.dataset.guid = guid; // Store GUID on the tab
    tabButton.className = 'tab-button px-6 py-3 text-base font-semibold cursor-pointer transition-all duration-300 border-b-[3px] border-transparent -mb-0.5 rounded-t-lg';
    tabButton.onclick = () => switchComparisonItemTab(itemId);
    tabButton.innerHTML = `
        <span class="tab-item-name">Item ${itemId}</span>
        <button onclick="event.stopPropagation(); removeComparisonItem(${itemId})" class="ml-2 text-orange-500 hover:text-orange-600 dark:text-orange-400 dark:hover:text-orange-500 font-bold">✕</button>
    `;

    // Insert tab before "+ Add Item" button
    const addButton = tabsContainer.querySelector('button[onclick="addComparisonItem()"]');
    tabsContainer.insertBefore(tabButton, addButton);

    // Create item content
    const itemDiv = document.createElement('div');
    itemDiv.id = `comparison-item-${currentSlot}-${itemId}`;
    itemDiv.dataset.guid = guid; // Store GUID on the item div
    itemDiv.style.display = 'none'; // Hidden by default
    itemDiv.innerHTML = `
        <div class="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-500 dark:border-blue-400 rounded-xl p-4 shadow-lg">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-2.5">
                <div class="input-group">
                    <label>Name</label>
                    <input type="text" id="item-${currentSlot}-${itemId}-name" value="Item ${itemId}" onchange="updateComparisonItemTabName(${itemId}); saveSlotItemData('${guid}')">
                </div>
                <div class="input-group">
                    <label>Attack</label>
                    <input type="number" id="item-${currentSlot}-${itemId}-attack" value="0" onchange="saveSlotItemData('${guid}')">
                </div>
            </div>
            <div id="item-${currentSlot}-${itemId}-stats-container"></div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                <button onclick="addComparisonItemStat(${itemId})" class="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white px-4 py-2.5 rounded-lg cursor-pointer font-semibold text-sm shadow-md hover:shadow-lg transition-all">+ Add Stat</button>
                <button onclick="equipItem(${itemId})" class="bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 text-white px-4 py-2.5 rounded-lg cursor-pointer font-semibold text-sm shadow-md hover:shadow-lg transition-all">Equip</button>
            </div>
        </div>
    `;

    container.appendChild(itemDiv);

    // Auto-switch to the newly created item
    switchComparisonItemTab(itemId);

    // Save to per-slot storage
    saveCurrentSlotItems();
}
window.addComparisonItem = addComparisonItem;

export function removeComparisonItem(id) {
    const currentSlot = getCurrentSlot();
    const item = document.getElementById(`comparison-item-${currentSlot}-${id}`);
    const tab = document.getElementById(`comparison-tab-${currentSlot}-${id}`);

    if (item && tab) {
        // Remove the item content and tab
        item.remove();
        tab.remove();

        // If we removed the active item, switch to another item
        if (activeComparisonItemId === id) {
            // Find remaining tabs for current slot
            const remainingTabs = document.querySelectorAll(`[id^="comparison-tab-${currentSlot}-"]`);

            if (remainingTabs.length > 0) {
                // Switch to the first remaining tab
                const firstTabId = remainingTabs[0].id.replace(`comparison-tab-${currentSlot}-`, '');
                switchComparisonItemTab(parseInt(firstTabId));
            } else {
                // No items left
                activeComparisonItemId = null;
            }
        }

        saveCurrentSlotItems();
        calculate();
    }
}
window.removeComparisonItem = removeComparisonItem;

export function addComparisonItemStat(itemId) {
    const currentSlot = getCurrentSlot();
    const container = document.getElementById(`item-${currentSlot}-${itemId}-stats-container`);
    const currentStats = container.children.length;

    if (currentStats >= 6) {
        alert('Maximum 6 optional stats allowed');
        return;
    }

    // Get the item's GUID from the item div
    const itemDiv = document.getElementById(`comparison-item-${currentSlot}-${itemId}`);
    const guid = itemDiv ? itemDiv.dataset.guid : null;

    // Find the next available stat ID (handles gaps from removed stats)
    let statId = 1;
    while (document.getElementById(`item-${currentSlot}-${itemId}-stat-${statId}`)) {
        statId++;
    }
    const statDiv = document.createElement('div');
    statDiv.id = `item-${currentSlot}-${itemId}-stat-${statId}`;
    statDiv.style.cssText = 'display: grid; grid-template-columns: 1fr 60px 24px; gap: 6px; margin-bottom: 6px; align-items: end;';

    let optionsHTML = '';
    availableStats.forEach(stat => {
        optionsHTML += `<option value="${stat.value}">${stat.label}</option>`;
    });

    statDiv.innerHTML = `
        <div class="input-group">
            <label style="font-size: 0.8em;">Stat</label>
            <select id="item-${currentSlot}-${itemId}-stat-${statId}-type">
                ${optionsHTML}
            </select>
        </div>
        <div class="input-group">
            <label style="font-size: 0.8em;">Value</label>
            <input type="number" step="0.1" id="item-${currentSlot}-${itemId}-stat-${statId}-value" value="0">
        </div>
        <button onclick="removeComparisonItemStat(${itemId}, ${statId})" class="bg-orange-500 hover:bg-orange-600 dark:bg-orange-600 dark:hover:bg-orange-700 text-white px-2 py-1.5 rounded cursor-pointer text-sm font-semibold transition-all" style="height: 32px;">✕</button>
    `;

    container.appendChild(statDiv);

    // Attach onchange handlers after appending to DOM
    const typeInput = document.getElementById(`item-${currentSlot}-${itemId}-stat-${statId}-type`);
    const valueInput = document.getElementById(`item-${currentSlot}-${itemId}-stat-${statId}-value`);

    if (guid) {
        typeInput.onchange = () => saveSlotItemData(guid);
        valueInput.onchange = () => saveSlotItemData(guid);
    }

    // Save to per-slot storage
    saveCurrentSlotItems();
}
window.addComparisonItemStat = addComparisonItemStat;

export function removeComparisonItemStat(itemId, statId) {
    const currentSlot = getCurrentSlot();
    const stat = document.getElementById(`item-${currentSlot}-${itemId}-stat-${statId}`);
    if (stat) {
        stat.remove();
        saveCurrentSlotItems();
    }
}
window.removeComparisonItemStat = removeComparisonItemStat;
