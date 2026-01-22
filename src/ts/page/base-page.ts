/**
 * BasePage - Reusable page lifecycle pattern
 *
 * All pages should extend this class to get consistent:
 * - Lifecycle hooks (onBeforePageVisible, onPageVisible)
 * - Tab management (activateTab, updateSubmenuStates)
 * - URL navigation helpers
 *
 * Usage:
 * class LoadoutPage extends BasePage {
 *   constructor() {
 *     super('setup', 'base-stats');
 *   }
 * }
 */

export abstract class BasePage {
    protected currentTab: string | null = null;
    protected readonly pageId: string;
    protected readonly defaultTab: string;

    constructor(pageId: string, defaultTab: string) {
        this.pageId = pageId;
        this.defaultTab = defaultTab;
    }

    /**
     * Lifecycle: Called before page is visible (prevents flash of unstyled content)
     * Set CSS classes and states BEFORE the page renders
     */
    onBeforePageVisible(tabName: string | null): void {
        const targetTab = tabName || this.defaultTab;

        // Set active class on sidebar nav item
        const navItem = document.querySelector(`[data-page="${this.pageId}"]`);
        navItem?.classList.add('active');

        // Expand submenu if on mobile
        this.expandSubmenuIfNeeded();

        // Update submenu active states
        this.updateSubmenuActiveStates(targetTab);
    }

    /**
     * Lifecycle: Called after page is visible
     * Initialize tab, load data, attach listeners
     */
    onPageVisible(tabName: string | null): void {
        const targetTab = tabName || this.defaultTab;
        this.currentTab = targetTab;

        // Activate the tab (update UI)
        this.activateTab(targetTab);
    }

    /**
     * Switch to a specific tab (called by tab button onclick)
     * Updates URL via router, which triggers lifecycle hooks
     */
    switchToTab(tabName: string): void {
        // Update URL via router (router handles the hash and calls us back)
        if (window.navigateToTab) {
            window.navigateToTab(this.pageId, tabName);
        }
    }

    /**
     * Activate a tab UI without changing URL
     * Internal method called by onPageVisible
     */
    protected activateTab(tabName: string): void {
        const tabClassPattern = `${this.pageId}-tab-content`;
        const buttonClassPattern = `${this.pageId}-tab-button`;

        // Hide all tab content for this page
        document.querySelectorAll(`[class^="${tabClassPattern}"]`).forEach(el => {
            el.classList.remove('active');
        });

        // Show target tab content
        const targetTab = document.getElementById(`${this.pageId}-${tabName}`);
        targetTab?.classList.add('active');

        // Update button states
        document.querySelectorAll(`[class^="${buttonClassPattern}"]`).forEach(btn => {
            btn.classList.remove('active');
            const onclickAttr = btn.getAttribute('onclick');
            if (onclickAttr && onclickAttr.includes(`'${tabName}'`)) {
                btn.classList.add('active');
            }
        });

        // Update submenu active states
        this.updateSubmenuActiveStates(tabName);
    }

    /**
     * Update submenu item active states for the current page
     */
    protected updateSubmenuActiveStates(tabName: string): void {
        // Remove active from ALL submenu items across all pages
        document.querySelectorAll('.sidebar-submenu-item').forEach(item => {
            item.classList.remove('active');
        });

        // Activate the specific submenu item for the current page/tab
        const submenu = document.getElementById(`submenu-${this.pageId}`);
        if (!submenu) return;

        const items = submenu.querySelectorAll('.sidebar-submenu-item');
        items.forEach(item => {
            const onclickAttr = item.getAttribute('onclick');
            if (onclickAttr && onclickAttr.includes(`'${tabName}'`)) {
                item.classList.add('active');
            }
        });
    }

    /**
     * Expand submenu if on mobile (width < 1024px)
     */
    protected expandSubmenuIfNeeded(): void {
        const isMobile = window.innerWidth < 1024;

        if (isMobile) {
            const submenu = document.getElementById(`submenu-${this.pageId}`);
            const navItem = document.querySelector(`[data-page="${this.pageId}"]`);

            submenu?.classList.add('expanded');
            navItem?.classList.add('expanded');
        }
    }

    /**
     * Get the current tab name
     */
    getCurrentTab(): string | null {
        return this.currentTab;
    }

    /**
     * Get the page ID
     */
    getPageId(): string {
        return this.pageId;
    }

    /**
     * Get the default tab name
     */
    getDefaultTab(): string {
        return this.defaultTab;
    }
}
