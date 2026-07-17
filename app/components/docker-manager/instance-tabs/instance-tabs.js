import { instanceColorTone, instanceIconName } from "../card-visuals.js";
import { openHostAccessDialog } from "../host-access-dialog.js";
import { openInstanceAppearanceDialog } from "../instance-appearance-dialog.js";

let namesCollapsed = false;

function byId(id) {
  return document.getElementById(id);
}

function activeTab(snapshot) {
  const tabs = embeddedTabs(snapshot);
  return tabs.find((tab) => tab?.active) || tabs.find((tab) => tab?.id === snapshot?.activeTabId) || null;
}

function embeddedTabs(snapshot) {
  return (Array.isArray(snapshot?.tabs) ? snapshot.tabs : []).filter((tab) => tab?.detached !== true);
}

function instanceTabsFromState(state) {
  const snapshot = state?.instanceTabs && typeof state.instanceTabs === "object" ? state.instanceTabs : state;
  return snapshot && typeof snapshot === "object" ? snapshot : { tabs: [], activeTabId: "" };
}

function hostStatusLabel(state) {
  return {
    connecting: "Host access connecting",
    connected: "Host access connected",
    paused: "Host access paused",
    needs_action: "Host access needs action",
    error: "Host access error",
    disconnected: "Host access disconnected"
  }[state] || "Host access disconnected";
}

function saveTabAppearance(tab, appearance) {
  return tab?.kind === "remote"
    ? window.dockerManagerActions?.setRemoteInstanceAppearance?.(tab.instanceId || "", appearance)
    : window.dockerManagerActions?.setLocalInstanceAppearance?.(tab?.containerId || "", appearance);
}

function openTabAppearance(tab, title) {
  openInstanceAppearanceDialog({
    title: `${title} Colour/Icon`,
    currentColor: tab?.color || "",
    currentIcon: tab?.icon || "",
    onSave: (appearance) => saveTabAppearance(tab, appearance)
  });
}

function render(state = window.__dmLastState || { instanceTabs: { tabs: [], activeTabId: "" } }) {
  const snapshot = instanceTabsFromState(state);
  const section = document.querySelector(".dm-instance-tabs");
  const strip = byId("dmInstanceTabStrip");
  const empty = byId("dmInstanceTabEmpty");
  const viewport = byId("dmInstanceTabViewport");
  if (!strip || !viewport) return;

  const tabs = embeddedTabs(snapshot);
  const selected = activeTab(snapshot);
  const homeActive = !selected;
  strip.innerHTML = "";

  if (!tabs.length) {
    // No tabs: the overlay collapses out of layout entirely so the launcher
    // shell behind it stays scrollable and clickable.
    if (section) section.classList.remove("has-tabs");
    if (section) section.classList.remove("home-active");
    if (section) section.classList.remove("names-collapsed");
    document.body.classList.remove("dm-instance-home-active");
    viewport.classList.remove("has-tab");
    if (empty) empty.classList.remove("hidden");
    window.dockerManagerActions?.syncInstanceTabBounds?.();
    return;
  }

  if (section) section.classList.add("has-tabs");
  if (section) section.classList.toggle("home-active", homeActive);
  if (section) section.classList.toggle("names-collapsed", namesCollapsed);
  document.body.classList.toggle("dm-instance-home-active", homeActive);
  viewport.classList.toggle("has-tab", !homeActive);
  if (empty) empty.classList.add("hidden");

  const home = document.createElement("button");
  home.type = "button";
  home.className = `dm-instance-tab dm-instance-home-tab${homeActive ? " active" : ""}`;
  home.title = "Launcher";
  home.setAttribute("aria-label", "Show launcher");
  home.addEventListener("click", () => window.dockerManagerActions?.selectInstanceHome?.());

  const homeIcon = document.createElement("span");
  homeIcon.className = "material-symbols-outlined";
  homeIcon.setAttribute("aria-hidden", "true");
  homeIcon.textContent = "home";

  const homeLabel = document.createElement("span");
  homeLabel.className = "dm-instance-tab-title";
  homeLabel.textContent = "Launcher";

  home.appendChild(homeIcon);
  home.appendChild(homeLabel);
  strip.appendChild(home);

  for (const tab of tabs) {
    const tabTitle = tab?.title || "Agent Zero";
    const isActive = tab?.id === selected?.id;
    const item = document.createElement("div");
    item.className = `dm-instance-tab${isActive ? " active" : ""}`;
    item.setAttribute("role", "tab");
    item.setAttribute("aria-selected", String(isActive));

    const icon = document.createElement("button");
    icon.type = "button";
    icon.className = "dm-instance-tab-icon";
    icon.title = isActive ? `Change ${tabTitle} Colour/Icon` : `Show ${tabTitle}`;
    icon.setAttribute("aria-label", icon.title);
    icon.innerHTML = `<span class="material-symbols-outlined" aria-hidden="true">${tab?.loading ? "progress_activity" : instanceIconName(tab?.icon)}</span>`;
    const tone = instanceColorTone(tab?.color);
    if (tone && !tab?.loading) icon.style.color = tone.fg;
    icon.addEventListener("click", () => {
      if (isActive) openTabAppearance(tab, tabTitle);
      else window.dockerManagerActions?.selectInstanceTab?.(tab.id);
    });

    const select = document.createElement("button");
    select.type = "button";
    select.className = "dm-instance-tab-select";
    select.title = tabTitle;
    select.setAttribute("aria-label", `Show ${tabTitle}`);
    select.addEventListener("click", () => window.dockerManagerActions?.selectInstanceTab?.(tab.id));

    const copy = document.createElement("span");
    copy.className = "dm-instance-tab-copy";

    const label = document.createElement("span");
    label.className = "dm-instance-tab-title";
    label.textContent = tabTitle;

    const hostState = String(tab?.hostAccess?.state || "disconnected");
    const hostAccess = document.createElement("button");
    hostAccess.type = "button";
    hostAccess.className = `dm-instance-tab-host${hostState === "connected" ? " connected" : ""}`;
    hostAccess.title = hostStatusLabel(hostState);
    hostAccess.setAttribute("aria-label", `${hostStatusLabel(hostState)}. Open settings.`);
    hostAccess.innerHTML = '<span class="material-symbols-outlined" aria-hidden="true">computer</span>';
    hostAccess.addEventListener("click", () => openHostAccessDialog(tab, window.__dmLastState || state));

    const close = document.createElement("button");
    close.type = "button";
    close.className = "dm-instance-tab-close";
    close.title = `Close ${tabTitle}`;
    close.setAttribute("aria-label", `Close ${tabTitle}`);
    close.innerHTML = '<span class="material-symbols-outlined" aria-hidden="true">close</span>';
    close.addEventListener("click", () => window.dockerManagerActions?.closeInstanceTab?.(tab.id));

    copy.appendChild(label);
    select.appendChild(copy);
    item.appendChild(icon);
    item.appendChild(select);
    item.appendChild(hostAccess);
    item.appendChild(close);
    strip.appendChild(item);
  }

  const controls = document.createElement("div");
  controls.className = "dm-instance-tab-controls";

  const reload = document.createElement("button");
  reload.type = "button";
  reload.className = "button icon-button dm-icon-button";
  reload.title = "Reload";
  reload.setAttribute("aria-label", "Reload active instance UI");
  reload.disabled = !selected;
  reload.innerHTML = '<span class="material-symbols-outlined" aria-hidden="true">refresh</span>';
  reload.addEventListener("click", () => window.dockerManagerActions?.reloadInstanceTab?.(selected?.id || ""));

  const collapse = document.createElement("button");
  collapse.type = "button";
  collapse.className = "button icon-button dm-icon-button";
  collapse.title = namesCollapsed ? "Show tab names" : "Hide tab names";
  collapse.setAttribute("aria-label", collapse.title);
  collapse.innerHTML = `<span class="material-symbols-outlined" aria-hidden="true">${namesCollapsed ? "label" : "label_off"}</span>`;
  collapse.addEventListener("click", () => {
    namesCollapsed = !namesCollapsed;
    render(window.__dmLastState || state);
  });

  const detach = document.createElement("button");
  detach.type = "button";
  detach.className = "button icon-button dm-icon-button";
  detach.title = "Detach";
  detach.setAttribute("aria-label", "Detach active instance UI");
  detach.disabled = !selected;
  detach.innerHTML = '<span class="material-symbols-outlined" aria-hidden="true">open_in_new</span>';
  detach.addEventListener("click", () => window.dockerManagerActions?.detachInstanceTab?.(selected?.id || ""));

  controls.appendChild(collapse);
  controls.appendChild(reload);
  controls.appendChild(detach);
  strip.appendChild(controls);
  if (!homeActive) window.dockerManagerActions?.syncInstanceTabBounds?.();
}

window.addEventListener("dm:state", (event) => render(event.detail));
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => render());
} else {
  render();
}
