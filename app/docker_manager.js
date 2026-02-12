import { dockerManagerStore as store } from "./components/docker-manager/docker-manager-store.js";

function isErrorResponse(obj) {
  return !!obj && typeof obj === "object" && typeof obj.message === "string";
}

function snapshot() {
  return {
    loading: !!store.loading,
    banner: store.banner || { type: "", message: "" },
    meta: store.meta || { appVersion: "", contentVersion: "" },
    dockerAvailable: !!store.dockerAvailable,
    uiUrl: store.uiUrl || "",
    error: store.error || "",
    environment: store.environment || null,
    images: Array.isArray(store.images) ? store.images : [],
    containers: Array.isArray(store.containers) ? store.containers : [],
    volumes: Array.isArray(store.volumes) ? store.volumes : [],
    progress: store.progress || null
  };
}

function emitState() {
  const next = snapshot();
  window.__dmLastState = next;
  window.dispatchEvent(new CustomEvent("dm:state", { detail: next }));
}

function setBanner(type, message) {
  store.setBanner(type || "", message || "");
  emitState();
}

async function loadMeta() {
  try {
    const v = await window.electronAPI?.getContentVersion?.();
    store.meta.contentVersion = v ? `Content: ${v}` : "";
  } catch {
    store.meta.contentVersion = "";
  }

  try {
    const v = await window.electronAPI?.getAppVersion?.();
    store.meta.appVersion = v ? `App: ${v}` : "";
  } catch {
    store.meta.appVersion = "";
  }
}

async function loadHeaderLogo() {
  const img = document.getElementById("headerLogo");
  if (!img) return;
  try {
    const dataUrl = await window.electronAPI?.getShellIconDataUrl?.();
    if (typeof dataUrl === "string" && dataUrl.startsWith("data:image/")) {
      img.src = dataUrl;
      img.classList.remove("hidden");
    }
  } catch {
    // ignore
  }
}

async function refresh() {
  const api = window.dockerManagerAPI;
  if (!api) {
    store.error = "Agent Zero controls are not available.";
    store.dockerAvailable = false;
    setBanner("error", store.error);
    return;
  }

  store.loading = true;
  store.error = "";
  emitState();

  try {
    const [inventory, state] = await Promise.all([
      typeof api.getInventory === "function" ? api.getInventory() : null,
      typeof api.getState === "function" ? api.getState() : null
    ]);

    if (isErrorResponse(inventory)) {
      store.error = inventory.message;
      store.dockerAvailable = false;
      setBanner("error", inventory.message);
      store.loading = false;
      emitState();
      return;
    }

    if (isErrorResponse(state)) {
      store.error = state.message;
      setBanner("error", state.message);
    } else {
      store.uiUrl = state?.uiUrl || "";
      if (!store.error) setBanner("", "");
    }

    store.dockerAvailable = !!inventory?.dockerAvailable;
    store.environment = inventory?.environment || null;
    store.images = Array.isArray(inventory?.images) ? inventory.images : [];
    store.containers = Array.isArray(inventory?.containers) ? inventory.containers : [];
    store.volumes = Array.isArray(inventory?.volumes) ? inventory.volumes : [];
  } catch (e) {
    store.error = e?.message || "Failed to load Docker inventory.";
    store.dockerAvailable = false;
    setBanner("error", store.error);
  } finally {
    store.loading = false;
    emitState();
  }
}

async function openUi() {
  const api = window.dockerManagerAPI;
  if (!api || typeof api.openUi !== "function") return;
  try {
    const res = await api.openUi();
    if (isErrorResponse(res)) setBanner("error", res.message);
  } catch (e) {
    setBanner("error", e?.message || "Unable to open UI");
  }
}

async function openHomepage() {
  const api = window.dockerManagerAPI;
  if (!api || typeof api.openHomepage !== "function") return;
  try {
    const res = await api.openHomepage();
    if (isErrorResponse(res)) setBanner("error", res.message);
  } catch (e) {
    setBanner("error", e?.message || "Unable to open homepage");
  }
}

async function removeVolume(volumeName) {
  const api = window.dockerManagerAPI;
  if (!api || typeof api.removeVolume !== "function") return;
  if (!volumeName) return;
  try {
    const res = await api.removeVolume(volumeName);
    if (isErrorResponse(res)) {
      setBanner("error", res.message);
      return;
    }
    setBanner("info", `Removed volume ${volumeName}`);
    await refresh();
  } catch (e) {
    setBanner("error", e?.message || "Failed to remove volume");
  }
}

async function pruneVolumes() {
  const api = window.dockerManagerAPI;
  if (!api || typeof api.pruneVolumes !== "function") return;
  try {
    const res = await api.pruneVolumes();
    if (isErrorResponse(res)) {
      setBanner("error", res.message);
      return;
    }
    setBanner("info", "Prune requested.");
    await refresh();
  } catch (e) {
    setBanner("error", e?.message || "Failed to prune volumes");
  }
}

async function openDockerDownload() {
  const api = window.dockerManagerAPI;
  if (api && typeof api.installDocker === "function") {
    try {
      const res = await api.installDocker();
      if (isErrorResponse(res)) {
        setBanner("error", res.message);
        return;
      }
      setBanner("info", "Docker installer opened.");
      return;
    } catch (e) {
      setBanner("error", e?.message || "Unable to start Docker installer");
      return;
    }
  }
  window.open("https://www.docker.com/products/docker-desktop/", "_blank");
}

window.dockerManagerActions = {
  refresh,
  openUi,
  openHomepage,
  removeVolume,
  pruneVolumes,
  openDockerDownload
};

function initSubscriptions() {
  const api = window.dockerManagerAPI;
  if (!api) return;

  if (typeof api.onStateChange === "function") {
    api.onStateChange((state) => {
      if (!isErrorResponse(state)) {
        store.uiUrl = state?.uiUrl || "";
        emitState();
      }
    });
  }

  if (typeof api.onProgress === "function") {
    api.onProgress((progress) => {
      store.progress = progress && typeof progress === "object" ? progress : null;
      emitState();
    });
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  await loadMeta();
  await loadHeaderLogo();
  emitState();
  initSubscriptions();
  await refresh();
});