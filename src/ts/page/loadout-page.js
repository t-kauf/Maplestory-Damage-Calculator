import { BasePage } from "./base-page.js";
import {
  initializeBaseStatsUI,
  loadBaseStatsUI,
  attachBaseStatsEventListeners
} from "./base-stats/base-stats-ui.js";
import {
  loadClassSelectUI,
  attachClassSelectEventListeners
} from "./base-stats/class-select-ui.js";
import {
  loadTargetSelectUI,
  attachTargetSelectEventListeners
} from "./base-stats/target-select-ui.js";
import {
  loadMasteryBonusesUI,
  attachMasteryEventListeners
} from "./base-stats/mastery-bonus-ui.js";
import {
  initializeWeaponsUI,
  loadWeaponsUI,
  attachWeaponEventListeners
} from "./weapon-levels/weapon-ui.js";
import {
  initializeWeaponPriorityUI
} from "./weapon-levels/weapon-priority-ui.js";
import { loadoutStore } from "@ts/store/loadout.store.js";
import { skillCoefficientManager } from "@ts/services/skill-coefficient-manager.js";
import { attachCompanionsEventListeners, initializeCompanionsUI, loadCompanionsUI } from "./companions/companions-ui.js";
import { attachEquipmentEventListeners, initializeEquipmentUI, loadEquipmentUI } from "./equipment/equipment-ui.js";
class LoadoutPage extends BasePage {
  constructor() {
    super("setup", "base-stats");
    this.initialized = false;
  }
  /**
   * Lifecycle: Called after page is visible
   * Initialize the page on first visit, switch tabs on subsequent visits
   */
  onPageVisible(tabName) {
    super.onPageVisible(tabName);
    if (!this.initialized) {
      this.initializeComponents();
      this.initialized = true;
    }
  }
  /**
   * Initialize all page components (HTML, state, event listeners)
   * Called once on first page visit
   */
  async initializeComponents() {
    await loadoutStore.initialize();
    skillCoefficientManager.initialize();
    initializeBaseStatsUI();
    initializeWeaponsUI();
    initializeWeaponPriorityUI();
    initializeCompanionsUI();
    initializeEquipmentUI();
    loadBaseStatsUI();
    loadClassSelectUI();
    loadTargetSelectUI();
    loadMasteryBonusesUI();
    loadWeaponsUI();
    loadCompanionsUI();
    loadEquipmentUI();
    attachBaseStatsEventListeners();
    attachWeaponEventListeners();
    attachClassSelectEventListeners();
    attachTargetSelectEventListeners();
    attachMasteryEventListeners();
    attachCompanionsEventListeners();
    attachEquipmentEventListeners();
  }
}
const loadoutPage = new LoadoutPage();
window.loadoutSwitchToTab = (tabName) => loadoutPage.switchToTab(tabName);
export {
  loadoutPage
};
//# sourceMappingURL=loadout-page.js.map
