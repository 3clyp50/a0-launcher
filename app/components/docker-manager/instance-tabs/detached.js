import { openHostAccessDialog } from "../host-access-dialog.js";

const api = window.dockerManagerAPI;
const tabId = new URLSearchParams(window.location.search).get("tabId") || "";
let namesCollapsed = false;
let tab = null;

function isError(value) {
  return Boolean(value && typeof value === "object" && typeof value.message === "string");
}

function hostStatusLabel(state) {
  return state === "connected" ? "Host access connected" : "Host access disconnected";
}

function render(snapshot) {
  tab = (Array.isArray(snapshot?.tabs) ? snapshot.tabs : []).find((candidate) => candidate?.id === tabId) || null;
  if (!tab) return;
  window.__dmLastState = { instanceTabs: snapshot };

  const title = tab.title || "Agent Zero";
  const state = String(tab.hostAccess?.state || "disconnected");
  const name = document.getElementById("detachedInstanceName");
  const host = document.getElementById("detachedHostAccess");
  if (name) name.textContent = title;
  if (host) {
    host.classList.toggle("connected", state === "connected");
    host.title = hostStatusLabel(state);
    host.setAttribute("aria-label", `${hostStatusLabel(state)}. Open settings.`);
  }
}

window.dockerManagerActions = {
  chooseHostAccessFolder: (defaultPath) => api?.chooseHostAccessFolder?.(defaultPath),
  async setInstanceHostAccess(target, config) {
    const id = target?.kind === "remote" ? target?.instanceId : target?.containerId;
    const result = await api?.setInstanceHostAccess?.({ tabId: target?.id, kind: target?.kind, id }, config);
    return isError(result) ? false : result;
  },
  async retryHostGateway(id) {
    const result = await api?.retryHostGateway?.(id);
    return !isError(result);
  },
  async hostGatewayCommand(id, action) {
    const result = await api?.hostGatewayCommand?.(id, action);
    return isError(result) ? false : result;
  },
  hideInstanceTabView: () => api?.setDetachedInstanceContentVisible?.(tabId, false),
  syncInstanceTabBounds: () => api?.setDetachedInstanceContentVisible?.(tabId, true)
};

document.getElementById("detachedHostAccess")?.addEventListener("click", () => {
  if (tab) openHostAccessDialog(tab, window.__dmLastState || {});
});

document.getElementById("detachedCollapse")?.addEventListener("click", (event) => {
  namesCollapsed = !namesCollapsed;
  document.querySelector(".dm-detached-instance-tabs")?.classList.toggle("names-collapsed", namesCollapsed);
  const button = event.currentTarget;
  button.title = namesCollapsed ? "Show Instance name" : "Collapse Instance name";
  button.setAttribute("aria-label", button.title);
  button.querySelector(".material-symbols-outlined").textContent = namesCollapsed ? "chevron_right" : "chevron_left";
});

document.getElementById("detachedReload")?.addEventListener("click", () => api?.reloadInstanceTab?.(tabId));
document.getElementById("detachedReattach")?.addEventListener("click", () => api?.reattachInstanceTab?.(tabId));

api?.onInstanceTabsChange?.(render);
api?.getInstanceTabs?.().then((snapshot) => {
  if (!isError(snapshot)) render(snapshot);
});
