/**
 * Stat Hub Page
 * Orchestration module for the Stat Hub page
 * Follows the pattern established by loadout-page.ts
 */

import { updateStatPredictions } from './stat-hub/stat-predictions-ui';
import { generateStatEquivalencyHTML } from './stat-hub/stat-equivalency-ui';
import { BasePage } from './base-page';
import { loadoutStore } from '@ts/store/loadout.store';
import { debounce } from '@ts/utils/event-emitter';
// Import stat-chart for side-effect of attaching toggleStatChart to window
import '@ts/utils/stat-chart';


class StatHubPage extends BasePage {
    private initialized: boolean = false;

    constructor() {
        super('predictions', 'stat-tables');
    }


    onPageVisible(tabName: string | null): void {
        // Call parent to handle tab switching
        super.onPageVisible(tabName);

        // Initialize page components on first visit
        if (!this.initialized) {
            this.initializeComponents();
            this.initialized = true;
        }
    }

    private async initializeComponents(): Promise<void> {
        const statWeightsContainer = document.getElementById('stat-weights');
        if (!statWeightsContainer) {
            console.warn('Stat predictions container not found');
        }

        const equivalencyContainer = document.getElementById('predictions-equivalency');
        if (equivalencyContainer) {
          this.updateEquivalency(equivalencyContainer);
        }

        updateStatPredictions();

            loadoutStore.on('stat:changed', debounce((_) => {
                this.updateEquivalency(equivalencyContainer);
            }, 3000));
    }

    private updateEquivalency(equivalencyContainer: HTMLElement): void
    {
            equivalencyContainer.innerHTML = generateStatEquivalencyHTML();
    }
}

// Export singleton instance for use by router and window
export const statHubPage = new StatHubPage();

// Expose switchToTab method to window for HTML onclick handlers
window.statHubPageSwitchToTab = (tabName: string) => statHubPage.switchToTab(tabName);

// Declare the window function for TypeScript
declare global {
    interface Window {
        statHubPageSwitchToTab: (tabName: string) => void;
    }
}