import { updateStatPredictions } from "./stat-hub/stat-predictions-ui.js";
import { generateStatEquivalencyHTML } from "./stat-hub/stat-equivalency-ui.js";
import { BasePage } from "./base-page.js";
import { loadoutStore } from "@ts/store/loadout.store.js";
import { debounce } from "@ts/utils/event-emitter.js";
import "@ts/utils/stat-chart.js";
class StatHubPage extends BasePage {
  constructor() {
    super("predictions", "stat-tables");
    this.initialized = false;
  }
  onPageVisible(tabName) {
    super.onPageVisible(tabName);
    if (!this.initialized) {
      this.initializeComponents();
      this.initialized = true;
    }
  }
  async initializeComponents() {
    const statWeightsContainer = document.getElementById("stat-weights");
    if (!statWeightsContainer) {
      console.warn("Stat predictions container not found");
    }
    const equivalencyContainer = document.getElementById("predictions-equivalency");
    if (equivalencyContainer) {
      this.updateEquivalency(equivalencyContainer);
    }
    updateStatPredictions();
    loadoutStore.on("stat:changed", debounce((_) => {
      this.updateEquivalency(equivalencyContainer);
    }, 3e3));
  }
  updateEquivalency(equivalencyContainer) {
    equivalencyContainer.innerHTML = generateStatEquivalencyHTML();
  }
}
const statHubPage = new StatHubPage();
window.statHubPageSwitchToTab = (tabName) => statHubPage.switchToTab(tabName);
export {
  statHubPage
};
//# sourceMappingURL=stat-hub-page.js.map
