/**
 * Gear Lab Page
 * Orchestration module for the Gear Lab page
 * Follows the pattern established by loadout-page.ts
 */

import { BasePage } from './base-page.js';
import { gearLabStore } from '@ts/store/gear-lab-store.js';
import { initializeInnerAbilityUI, loadInnerAbilityFromStore } from '@ts/page/inner-ability/inner-ability-ui.js';
import { initializeArtifactPotential } from './artifact-potential/artifact-potential-ui.js';
import { initializeCubePotentialUI } from '@ts/page/cube-potential/cube-potential-ui.js';
import { initializeScrollingUI } from '@ts/page/scrolling/scrolling-ui.js';
import { initializeComparisonUI, checkPendingSlotNavigation } from '@ts/page/comparison/comparison-ui.js';


class GearLabPage extends BasePage {
    private initialized: boolean = false;

    constructor() {
        super('optimization', 'item-comparison');
    }


    onPageVisible(tabName: string | null): void {
        // Call parent to handle tab switching
        super.onPageVisible(tabName);

        // Initialize page components on first visit
        if (!this.initialized) {
            this.initializeComponents();
            this.initialized = true;
        }

        // Check for pending slot navigation when item-comparison tab is shown
        // This must happen after initialization
        if (tabName === 'item-comparison') {
            checkPendingSlotNavigation();
        }
    }

    private async initializeComponents(): Promise<void> {
        // Initialize the gearLabStore (migrates from legacy data if needed)
        await gearLabStore.initialize();

        // Initialize the Inner Ability UI
        initializeInnerAbilityUI();
        initializeArtifactPotential();
        initializeCubePotentialUI();
        initializeScrollingUI();

        // Initialize the Comparison Equipment UI
        initializeComparisonUI();

        // Load saved presets from store
        loadInnerAbilityFromStore();
    }
}

// Export singleton instance for use by router and window
export const gearLabPage = new GearLabPage();

// Expose switchToTab method to window for HTML onclick handlers
window.gearLabPageSwitchToTab = (tabName: string) => gearLabPage.switchToTab(tabName);

// Declare the window function for TypeScript
declare global {
    interface Window {
        gearLabPageSwitchToTab: (tabName: string) => void;
    }
}