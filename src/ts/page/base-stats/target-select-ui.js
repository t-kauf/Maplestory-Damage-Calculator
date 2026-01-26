import { CONTENT_TYPE } from "@ts/types/constants.js";
import {
  getSubcategoryOptions,
  getFilteredStageEntries,
  formatStageLabel,
  requiresSubcategory
} from "./target-select.js";
import { loadoutStore } from "@ts/store/loadout.store.js";
const CONTENT_TYPES = [
  { id: CONTENT_TYPE.NONE, name: "None", icon: "\u{1F3AF}", title: "Training Dummy" },
  { id: CONTENT_TYPE.STAGE_HUNT, name: "Stage Hunt", icon: "\u{1F5FA}\uFE0F", title: "Stage Hunt" },
  { id: CONTENT_TYPE.CHAPTER_BOSS, name: "Chapter Boss", icon: "\u{1F451}", title: "Chapter Boss" },
  { id: CONTENT_TYPE.WORLD_BOSS, name: "World Boss", icon: "\u{1F30D}", title: "World Boss" },
  { id: CONTENT_TYPE.GROWTH_DUNGEON, name: "Growth Dungeon", icon: "\u{1F4C8}", title: "Growth Dungeon" }
];
if (typeof window !== "undefined") {
  window.selectContentType = selectContentType;
  window.onSubcategoryChange = onSubcategoryChange;
}
function selectContentType(contentType) {
  updateContentTypeSelectionUI(contentType);
  configureDropdownsForContentType(contentType);
  const updateData = { contentType };
  const stageSelect = document.getElementById("target-stage");
  if (contentType === CONTENT_TYPE.NONE) {
    updateData.subcategory = null;
    updateData.selectedStage = null;
  } else if (requiresSubcategory(contentType)) {
    const subcategorySelect = document.getElementById("target-subcategory");
    if (subcategorySelect && subcategorySelect.options.length > 0) {
      updateData.subcategory = subcategorySelect.options[0].value;
    }
    if (stageSelect && stageSelect.options.length > 0) {
      updateData.selectedStage = stageSelect.options[0].value;
    }
  } else if (stageSelect && stageSelect.options.length > 0) {
    updateData.selectedStage = stageSelect.options[0].value;
  }
  loadoutStore.updateTarget(updateData);
}
function onSubcategoryChange() {
  const subcategorySelect = document.getElementById("target-subcategory");
  const stageSelect = document.getElementById("target-stage");
  if (!subcategorySelect || !stageSelect) return;
  const subcategory = subcategorySelect.value;
  const target = loadoutStore.getTarget();
  if (target.contentType === CONTENT_TYPE.STAGE_HUNT) {
    const chapter = subcategory.replace("chapter-", "");
    populateStageDropdownFiltered(CONTENT_TYPE.STAGE_HUNT, chapter);
  } else if (target.contentType === CONTENT_TYPE.GROWTH_DUNGEON) {
    populateStageDropdownFiltered(CONTENT_TYPE.GROWTH_DUNGEON, subcategory);
  }
  stageSelect.style.display = "block";
  if (stageSelect.options.length > 0) {
    stageSelect.selectedIndex = 0;
    const firstStage = stageSelect.options[0].value;
    loadoutStore.updateTarget({ subcategory, selectedStage: firstStage });
  } else {
    loadoutStore.updateTarget({ subcategory });
  }
}
function loadTargetSelectUI() {
  const target = loadoutStore.getTarget();
  restoreSavedSelectionUI({ contentType: target.contentType, subcategory: target.subcategory, selectedStage: target.selectedStage });
}
function initializeWithDefaultState() {
  loadoutStore.updateTarget({ contentType: CONTENT_TYPE.NONE });
}
function restoreSavedSelectionUI(savedData) {
  const { contentType, subcategory, selectedStage } = savedData;
  updateContentTypeSelectionUI(contentType);
  const subcategorySelect = document.getElementById("target-subcategory");
  const stageSelect = document.getElementById("target-stage");
  if (subcategorySelect) subcategorySelect.style.display = "none";
  if (stageSelect) stageSelect.style.display = "none";
  if (contentType === CONTENT_TYPE.NONE) {
    if (stageSelect) stageSelect.value = "none";
    return;
  }
  if (subcategory && requiresSubcategory(contentType)) {
    if (subcategorySelect) {
      populateSubcategoryDropdown(contentType);
      subcategorySelect.value = subcategory;
      subcategorySelect.style.display = "block";
      if (contentType === CONTENT_TYPE.STAGE_HUNT) {
        const chapter = subcategory.replace("chapter-", "");
        populateStageDropdownFiltered(CONTENT_TYPE.STAGE_HUNT, chapter);
      } else if (contentType === CONTENT_TYPE.GROWTH_DUNGEON) {
        populateStageDropdownFiltered(CONTENT_TYPE.GROWTH_DUNGEON, subcategory);
      }
    }
    if (stageSelect) {
      stageSelect.style.display = "block";
    }
  } else {
    if (stageSelect) {
      stageSelect.style.display = "block";
      populateStageDropdown(contentType);
    }
  }
  if (selectedStage && stageSelect) {
    stageSelect.value = selectedStage;
  }
}
function updateContentTypeSelectionUI(contentType) {
  document.querySelectorAll(".content-type-selector").forEach((el) => {
    el.classList.remove("selected");
  });
  const selectedEl = document.getElementById(`content-${contentType}`);
  if (selectedEl) {
    selectedEl.classList.add("selected");
  }
  const subcategorySelect = document.getElementById("target-subcategory");
  const stageSelect = document.getElementById("target-stage");
  if (subcategorySelect) subcategorySelect.style.display = "none";
  if (stageSelect) stageSelect.style.display = "none";
}
function configureDropdownsForContentType(contentType) {
  const subcategorySelect = document.getElementById("target-subcategory");
  const stageSelect = document.getElementById("target-stage");
  if (!stageSelect) return;
  if (contentType === CONTENT_TYPE.NONE) {
    stageSelect.value = "none";
    return;
  }
  if (requiresSubcategory(contentType)) {
    populateSubcategoryDropdown(contentType);
    if (subcategorySelect) {
      subcategorySelect.style.display = "block";
      subcategorySelect.selectedIndex = 0;
      const firstSubcategory = subcategorySelect.value;
      if (contentType === CONTENT_TYPE.STAGE_HUNT) {
        const chapter = firstSubcategory.replace("chapter-", "");
        populateStageDropdownFiltered(CONTENT_TYPE.STAGE_HUNT, chapter);
      } else if (contentType === CONTENT_TYPE.GROWTH_DUNGEON) {
        populateStageDropdownFiltered(CONTENT_TYPE.GROWTH_DUNGEON, firstSubcategory);
      }
      if (stageSelect && stageSelect.options.length > 0) {
        stageSelect.selectedIndex = 0;
      }
    }
    stageSelect.style.display = "block";
  } else {
    stageSelect.style.display = "block";
    populateStageDropdown(contentType);
    if (stageSelect && stageSelect.options.length > 0) {
      stageSelect.selectedIndex = 0;
    }
  }
}
function populateSubcategoryDropdown(contentType) {
  const select = document.getElementById("target-subcategory");
  if (!select) return;
  select.innerHTML = "";
  const options = getSubcategoryOptions(contentType);
  options.forEach((opt) => {
    const option = document.createElement("option");
    option.value = opt.value;
    option.textContent = opt.label;
    select.appendChild(option);
  });
}
function populateStageDropdown(contentType) {
  const select = document.getElementById("target-stage");
  if (!select) return;
  select.innerHTML = "";
  const entries = getFilteredStageEntries(contentType, contentType);
  entries.forEach(({ entry, identifier, prefix }) => {
    const opt = document.createElement("option");
    opt.value = `${prefix}-${identifier}`;
    opt.textContent = formatStageLabel(entry, identifier, contentType);
    select.appendChild(opt);
  });
}
function populateStageDropdownFiltered(contentType, filter) {
  const select = document.getElementById("target-stage");
  if (!select) return;
  select.innerHTML = "";
  const entries = getFilteredStageEntries(contentType, filter);
  entries.forEach(({ entry, identifier, prefix }) => {
    const opt = document.createElement("option");
    opt.value = `${prefix}-${identifier}`;
    opt.textContent = formatStageLabel(entry, identifier, contentType);
    select.appendChild(opt);
  });
}
function attachContentTypeSelectorListeners() {
  CONTENT_TYPES.forEach((content) => {
    const element = document.getElementById(`content-${content.id}`);
    if (element) {
      element.addEventListener("click", () => selectContentType(content.id));
    }
  });
}
function attachTargetContentListeners() {
  const subcategorySelect = document.getElementById("target-subcategory");
  const stageSelect = document.getElementById("target-stage");
  if (subcategorySelect) {
    subcategorySelect.addEventListener("change", () => onSubcategoryChange());
  }
  if (stageSelect) {
    stageSelect.addEventListener("change", () => {
      const stageValue = stageSelect.value;
      loadoutStore.updateTarget({ selectedStage: stageValue });
    });
  }
}
function attachTargetSelectEventListeners() {
  attachContentTypeSelectorListeners();
  attachTargetContentListeners();
}
function generateContentTypeSelectorHTML() {
  return CONTENT_TYPES.map((content) => `
        <div id="content-${content.id}" class="content-type-selector bgstats-content-card" title="${content.title}">
            <span class="bgstats-content-icon">${content.icon}</span>
            <span class="bgstats-content-name">${content.name}</span>
        </div>
    `).join("");
}
export {
  attachTargetSelectEventListeners,
  generateContentTypeSelectorHTML,
  loadTargetSelectUI,
  onSubcategoryChange,
  selectContentType
};
//# sourceMappingURL=target-select-ui.js.map
