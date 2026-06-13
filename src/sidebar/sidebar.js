"use strict";

const DEFAULT_STORE_ID = "firefox-default";

const fallbackColors = {
  blue: "#37adff",
  turquoise: "#00c8d7",
  green: "#51cd00",
  yellow: "#ffcb00",
  orange: "#ff9f00",
  red: "#ff4b5c",
  pink: "#ff4bda",
  purple: "#af51f5",
  toolbar: "#7c7c7d"
};

const state = {
  collapsedGroups: {},
  containerError: "",
  currentWindowId: null,
  filter: "",
  identities: new Map(),
  identityOrder: [],
  tabs: []
};

const dragState = {
  groupId: "",
  tabId: null
};

const els = {
  filter: document.getElementById("filter-tabs"),
  groups: document.getElementById("groups"),
  groupTemplate: document.getElementById("group-template"),
  newTab: document.getElementById("new-tab"),
  newTabContainer: document.getElementById("new-tab-container"),
  refresh: document.getElementById("refresh-tabs"),
  status: document.getElementById("status-message"),
  summary: document.getElementById("tab-summary"),
  tabTemplate: document.getElementById("tab-template")
};

let refreshTimer = 0;

async function init() {
  const stored = await browser.storage.local.get({ collapsedGroups: {} });
  state.collapsedGroups = stored.collapsedGroups || {};

  bindUi();
  bindBrowserEvents();
  await refreshAll();
}

function bindUi() {
  els.filter.addEventListener("input", () => {
    state.filter = els.filter.value.trim().toLowerCase();
    render();
  });

  els.newTab.addEventListener("click", () => createTab(els.newTabContainer.value));
  els.refresh.addEventListener("click", refreshAll);

  els.groups.addEventListener("click", async (event) => {
    const actionEl = event.target.closest("[data-action]");
    if (!actionEl) return;

    const action = actionEl.dataset.action;
    const groupEl = event.target.closest(".group");
    const tabEl = event.target.closest(".tab-row");

    if (action === "toggle-group" && groupEl) {
      await toggleGroup(groupEl.dataset.groupId);
      return;
    }

    if (action === "new-tab-in-group" && groupEl) {
      await createTab(groupEl.dataset.groupId);
      return;
    }

    if (action === "activate-tab" && tabEl) {
      await activateTab(Number(tabEl.dataset.tabId));
      return;
    }

    if (action === "close-tab" && tabEl) {
      await closeTab(Number(tabEl.dataset.tabId));
    }
  });

  els.groups.addEventListener("keydown", async (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;

    const tabMain = event.target.closest('[data-action="activate-tab"]');
    if (!tabMain) return;

    event.preventDefault();
    const tabEl = tabMain.closest(".tab-row");
    await activateTab(Number(tabEl.dataset.tabId));
  });

  els.groups.addEventListener("auxclick", async (event) => {
    if (event.button !== 1) return;

    const tabEl = event.target.closest(".tab-row");
    if (!tabEl) return;

    event.preventDefault();
    await closeTab(Number(tabEl.dataset.tabId));
  });

  els.groups.addEventListener("dragstart", handleDragStart);
  els.groups.addEventListener("dragover", handleDragOver);
  els.groups.addEventListener("drop", handleDrop);
  els.groups.addEventListener("dragend", clearDragState);
}

function bindBrowserEvents() {
  const schedule = () => scheduleRefresh();
  const scheduleContainers = () => scheduleRefresh(true);

  browser.tabs.onActivated.addListener(schedule);
  browser.tabs.onAttached.addListener(schedule);
  browser.tabs.onCreated.addListener(schedule);
  browser.tabs.onDetached.addListener(schedule);
  browser.tabs.onMoved.addListener(schedule);
  browser.tabs.onRemoved.addListener(schedule);
  browser.tabs.onUpdated.addListener(schedule);
  browser.windows.onFocusChanged.addListener(schedule);

  if (browser.contextualIdentities) {
    browser.contextualIdentities.onCreated.addListener(scheduleContainers);
    browser.contextualIdentities.onRemoved.addListener(scheduleContainers);
    browser.contextualIdentities.onUpdated.addListener(scheduleContainers);
  }

  browser.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local" || !changes.collapsedGroups) return;
    state.collapsedGroups = changes.collapsedGroups.newValue || {};
    render();
  });
}

function scheduleRefresh(includeContainers = false) {
  window.clearTimeout(refreshTimer);
  refreshTimer = window.setTimeout(() => {
    if (includeContainers) {
      refreshAll();
    } else {
      refreshTabs().then(render).catch(showError);
    }
  }, 75);
}

async function refreshAll() {
  await Promise.all([refreshIdentities(), refreshTabs()]);
  render();
}

async function refreshIdentities() {
  state.containerError = "";

  try {
    const identities = await browser.contextualIdentities.query({});
    state.identities = new Map(identities.map((identity) => [identity.cookieStoreId, identity]));
    state.identityOrder = identities.map((identity) => identity.cookieStoreId);
  } catch (error) {
    state.identities = new Map();
    state.identityOrder = [];
    state.containerError = error.message || String(error);
  }
}

async function refreshTabs() {
  const currentWindow = await browser.windows.getCurrent();
  state.currentWindowId = currentWindow.id;
  state.tabs = await browser.tabs.query({ windowId: currentWindow.id });
}

function render() {
  renderContainerPicker();

  const groups = buildGroups();
  const visibleTabCount = groups.reduce((count, group) => count + group.tabs.length, 0);
  const totalTabText = state.tabs.length === 1 ? "1 tab" : `${state.tabs.length} tabs`;
  els.summary.textContent = state.filter
    ? `${visibleTabCount} of ${totalTabText}`
    : `${totalTabText}`;

  els.groups.replaceChildren();

  if (state.containerError) {
    const warning = document.createElement("p");
    warning.className = "warning";
    warning.textContent = `Container API unavailable: ${state.containerError}`;
    els.groups.append(warning);
  }

  if (!groups.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = state.filter ? "No matching tabs." : "No tabs in this window.";
    els.groups.append(empty);
    return;
  }

  const fragment = document.createDocumentFragment();
  for (const group of groups) {
    fragment.append(renderGroup(group));
  }
  els.groups.append(fragment);
}

function renderContainerPicker() {
  const previousValue = els.newTabContainer.value || DEFAULT_STORE_ID;
  const fragment = document.createDocumentFragment();
  const defaultOption = document.createElement("option");

  defaultOption.value = DEFAULT_STORE_ID;
  defaultOption.textContent = "No Container";
  fragment.append(defaultOption);

  for (const groupId of state.identityOrder) {
    const identity = state.identities.get(groupId);
    if (!identity) continue;

    const option = document.createElement("option");
    option.value = identity.cookieStoreId;
    option.textContent = identity.name;
    fragment.append(option);
  }

  els.newTabContainer.replaceChildren(fragment);
  els.newTabContainer.value = state.identities.has(previousValue) || previousValue === DEFAULT_STORE_ID
    ? previousValue
    : DEFAULT_STORE_ID;
}

function buildGroups() {
  const groups = new Map();
  const filter = state.filter;

  for (const tab of state.tabs) {
    if (filter && !matchesFilter(tab, filter)) continue;

    const groupId = tab.cookieStoreId || DEFAULT_STORE_ID;
    if (!groups.has(groupId)) {
      groups.set(groupId, createGroup(groupId));
    }
    groups.get(groupId).tabs.push(tab);
  }

  const ordered = [];
  if (groups.has(DEFAULT_STORE_ID)) {
    ordered.push(groups.get(DEFAULT_STORE_ID));
  }

  for (const groupId of state.identityOrder) {
    if (groups.has(groupId)) {
      ordered.push(groups.get(groupId));
    }
  }

  const remaining = [...groups.values()].filter((group) => !ordered.includes(group));
  remaining.sort((a, b) => a.name.localeCompare(b.name));
  ordered.push(...remaining);

  for (const group of ordered) {
    group.tabs.sort((a, b) => a.index - b.index);
  }

  return ordered;
}

function createGroup(groupId) {
  const identity = state.identities.get(groupId);
  const isDefault = groupId === DEFAULT_STORE_ID;

  return {
    color: identity ? identity.colorCode || fallbackColors[identity.color] : "#8a8f98",
    id: groupId,
    isDefault,
    name: identity ? identity.name : isDefault ? "No Container" : groupId,
    tabs: []
  };
}

function renderGroup(group) {
  const node = els.groupTemplate.content.firstElementChild.cloneNode(true);
  const collapsed = Boolean(state.collapsedGroups[group.id]);
  const header = node.querySelector(".group-header");

  node.dataset.groupId = group.id;
  node.dataset.collapsed = String(collapsed);
  node.style.setProperty("--container-color", group.color);

  header.setAttribute("aria-expanded", String(!collapsed));
  node.querySelector(".group-name").textContent = group.name;
  node.querySelector(".group-count").textContent = String(group.tabs.length);

  const newButton = node.querySelector(".group-new-tab");
  newButton.title = group.isDefault ? "New tab" : `New tab in ${group.name}`;

  const list = node.querySelector(".tab-list");
  const fragment = document.createDocumentFragment();
  for (const tab of group.tabs) {
    fragment.append(renderTab(tab));
  }
  list.append(fragment);

  return node;
}

function renderTab(tab) {
  const node = els.tabTemplate.content.firstElementChild.cloneNode(true);
  const favicon = node.querySelector(".favicon");
  const title = tab.title || tab.url || "Untitled tab";
  const flags = [];

  node.draggable = true;
  node.dataset.tabId = String(tab.id);
  node.dataset.active = String(Boolean(tab.active));
  node.dataset.groupId = getTabGroupId(tab);
  node.title = title;

  favicon.dataset.empty = "true";
  favicon.addEventListener("load", () => {
    delete favicon.dataset.empty;
  }, { once: true });
  if (tab.favIconUrl) {
    favicon.src = tab.favIconUrl;
  }
  favicon.addEventListener("error", () => {
    favicon.removeAttribute("src");
    favicon.dataset.empty = "true";
  }, { once: true });

  if (tab.pinned) flags.push("P");
  if (tab.audible) flags.push(tab.mutedInfo && tab.mutedInfo.muted ? "M" : "A");
  if (tab.discarded) flags.push("S");

  node.querySelector(".tab-title").textContent = title;
  node.querySelector(".tab-flags").textContent = flags.join(" ");

  return node;
}

function matchesFilter(tab, filter) {
  const title = tab.title || "";
  const url = tab.url || "";
  return title.toLowerCase().includes(filter) || url.toLowerCase().includes(filter);
}

async function toggleGroup(groupId) {
  const next = { ...state.collapsedGroups };
  if (next[groupId]) {
    delete next[groupId];
  } else {
    next[groupId] = true;
  }

  state.collapsedGroups = next;
  await browser.storage.local.set({ collapsedGroups: next });
  render();
}

async function activateTab(tabId) {
  const tab = state.tabs.find((item) => item.id === tabId);
  await browser.tabs.update(tabId, { active: true });

  if (tab && tab.windowId) {
    await browser.windows.update(tab.windowId, { focused: true });
  }
}

async function closeTab(tabId) {
  await browser.tabs.remove(tabId);
}

function handleDragStart(event) {
  if (event.target.closest(".tab-close")) {
    event.preventDefault();
    return;
  }

  const tabEl = event.target.closest(".tab-row");
  const groupEl = event.target.closest(".group");
  if (!tabEl || !groupEl) {
    event.preventDefault();
    return;
  }

  dragState.tabId = Number(tabEl.dataset.tabId);
  dragState.groupId = groupEl.dataset.groupId;
  tabEl.dataset.dragging = "true";

  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", tabEl.dataset.tabId);
  }
}

function handleDragOver(event) {
  if (dragState.tabId === null) return;

  const dropTarget = getDropTarget(event);
  clearDropIndicators();

  if (!dropTarget) {
    if (event.dataTransfer) event.dataTransfer.dropEffect = "none";
    return;
  }

  event.preventDefault();
  if (event.dataTransfer) event.dataTransfer.dropEffect = "move";

  dropTarget.tabEl.dataset.dropPosition = dropTarget.position;
}

async function handleDrop(event) {
  if (dragState.tabId === null) return;

  const dropTarget = getDropTarget(event);
  clearDropIndicators();

  if (!dropTarget) {
    if (isSameGroupDrop(event)) {
      event.preventDefault();
      setStatus("Tabs can only be dropped on another tab in the same Container group.", "error");
    }
    clearDragState();
    return;
  }

  event.preventDefault();
  const targetTabId = Number(dropTarget.tabEl.dataset.tabId);
  await moveTabWithinGroup(dragState.tabId, targetTabId, dropTarget.position);
  clearDragState();
}

function getDropTarget(event) {
  if (!isSameGroupDrop(event)) return null;

  const tabEl = event.target.closest(".tab-row");
  if (tabEl) {
    if (Number(tabEl.dataset.tabId) === dragState.tabId) return null;

    return {
      position: getDropPosition(event, tabEl),
      tabEl
    };
  }

  const listEl = event.target.closest(".tab-list");
  if (!listEl) return null;

  const rows = [...listEl.querySelectorAll(".tab-row")]
    .filter((row) => Number(row.dataset.tabId) !== dragState.tabId);
  const lastRow = rows[rows.length - 1];
  if (!lastRow) return null;

  return {
    position: "after",
    tabEl: lastRow
  };
}

function isSameGroupDrop(event) {
  const groupEl = event.target.closest(".group");
  return Boolean(groupEl && groupEl.dataset.groupId === dragState.groupId);
}

function getDropPosition(event, tabEl) {
  const rect = tabEl.getBoundingClientRect();
  return event.clientY < rect.top + rect.height / 2 ? "before" : "after";
}

function clearDragState() {
  const draggingEl = els.groups.querySelector('.tab-row[data-dragging="true"]');
  if (draggingEl) {
    delete draggingEl.dataset.dragging;
  }

  clearDropIndicators();
  dragState.tabId = null;
  dragState.groupId = "";
}

function clearDropIndicators() {
  for (const tabEl of els.groups.querySelectorAll(".tab-row[data-drop-position]")) {
    delete tabEl.dataset.dropPosition;
  }
}

async function moveTabWithinGroup(tabId, targetTabId, position) {
  const draggedTab = state.tabs.find((tab) => tab.id === tabId);
  const targetTab = state.tabs.find((tab) => tab.id === targetTabId);
  if (!draggedTab || !targetTab) return;

  if (getTabGroupId(draggedTab) !== getTabGroupId(targetTab)) {
    setStatus("Tabs can only be reordered inside the same Container group.", "error");
    return;
  }

  if (draggedTab.pinned !== targetTab.pinned) {
    setStatus("Pinned and unpinned tabs cannot be reordered across Firefox's pinned-tab boundary.", "error");
    return;
  }

  const index = getMoveIndex(tabId, targetTabId, position);
  if (!Number.isInteger(index) || index === draggedTab.index) return;

  try {
    await browser.tabs.move(tabId, { index });
    await refreshTabs();
    render();
    setStatus("Tab moved.", "ok");
  } catch (error) {
    await refreshTabs();
    render();
    setStatus(error.message || String(error), "error");
  }
}

function getMoveIndex(tabId, targetTabId, position) {
  const orderedTabIds = [...state.tabs]
    .sort((a, b) => a.index - b.index)
    .map((tab) => tab.id);
  const sourceIndex = orderedTabIds.indexOf(tabId);
  if (sourceIndex === -1 || !orderedTabIds.includes(targetTabId)) return null;

  orderedTabIds.splice(sourceIndex, 1);
  const targetIndex = orderedTabIds.indexOf(targetTabId);
  const insertIndex = position === "after" ? targetIndex + 1 : targetIndex;
  orderedTabIds.splice(insertIndex, 0, tabId);

  return orderedTabIds.indexOf(tabId);
}

function getTabGroupId(tab) {
  return tab.cookieStoreId || DEFAULT_STORE_ID;
}

async function createTab(groupId) {
  const requestedStoreId = groupId || DEFAULT_STORE_ID;
  let createdTab = null;

  setStatus("Creating tab...", "neutral");

  const props = {
    active: true
  };

  if (Number.isInteger(state.currentWindowId)) {
    props.windowId = state.currentWindowId;
  }

  try {
    if (requestedStoreId !== DEFAULT_STORE_ID) {
      const identity = await validateTargetIdentity(requestedStoreId);
      props.cookieStoreId = identity.cookieStoreId;
    }

    createdTab = await browser.tabs.create(props);
    const verifiedTab = await browser.tabs.get(createdTab.id);
    validateCreatedTabStore(verifiedTab, requestedStoreId);

    const label = getStoreLabel(requestedStoreId);
    setStatus(`Created and verified: ${label}.`, "ok");
    await refreshTabs();
    render();
  } catch (error) {
    if (createdTab && createdTab.id) {
      await cleanupUnverifiedTab(createdTab.id);
    }
    await refreshAll();
    setStatus(error.message || String(error), "error");
  }
}

function showError(error) {
  console.error(error);
  els.groups.replaceChildren();
  const message = document.createElement("p");
  message.className = "warning";
  message.textContent = error.message || String(error);
  els.groups.append(message);
}

async function validateTargetIdentity(cookieStoreId) {
  if (!browser.contextualIdentities || !browser.contextualIdentities.get) {
    throw new Error("Container API is unavailable; refusing to create an unverified container tab.");
  }

  let identity;
  try {
    identity = await browser.contextualIdentities.get(cookieStoreId);
  } catch (error) {
    throw new Error(`Container ${cookieStoreId} does not exist or is disabled; tab was not created.`);
  }

  if (!identity || identity.cookieStoreId !== cookieStoreId) {
    throw new Error(`Container validation failed before creation: expected ${cookieStoreId}.`);
  }

  return identity;
}

function validateCreatedTabStore(tab, expectedStoreId) {
  if (!tab || typeof tab.cookieStoreId !== "string") {
    throw new Error("Firefox did not expose the created tab's cookieStoreId; closed the unverified tab.");
  }

  if (tab.cookieStoreId !== expectedStoreId) {
    throw new Error(`Container validation failed after creation: expected ${expectedStoreId}, got ${tab.cookieStoreId}; closed the unverified tab.`);
  }
}

async function cleanupUnverifiedTab(tabId) {
  try {
    await browser.tabs.remove(tabId);
  } catch (error) {
    console.error("Unable to close unverified tab", error);
  }
}

function getStoreLabel(cookieStoreId) {
  if (cookieStoreId === DEFAULT_STORE_ID) {
    return "No Container";
  }

  const identity = state.identities.get(cookieStoreId);
  return identity ? identity.name : cookieStoreId;
}

function setStatus(message, tone) {
  els.status.textContent = message;
  els.status.dataset.tone = tone;
}

init().catch(showError);
