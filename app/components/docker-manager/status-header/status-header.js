function byId(id) { return document.getElementById(id); }

function render(state) {
  const contentVersion = byId("contentVersion");
  const appVersion = byId("appVersion");
  const openUiBtn = byId("openUiBtn");
  const banner = byId("banner");
  const panel = byId("progressPanel");
  const progressTitle = byId("progressTitle");
  const progressMessage = byId("progressMessage");

  if (contentVersion) contentVersion.textContent = state?.meta?.contentVersion || "";
  if (appVersion) appVersion.textContent = state?.meta?.appVersion || "";

  if (openUiBtn) {
    const enabled = !!state?.dockerAvailable && !!state?.uiUrl;
    openUiBtn.disabled = !enabled;
    openUiBtn.title = enabled ? "" : "Start Agent Zero to enable";
  }

  if (banner) {
    const type = state?.banner?.type || "";
    const message = state?.banner?.message || "";
    banner.classList.remove("error", "info", "hidden");
    if (!message) {
      banner.classList.add("hidden");
      banner.textContent = "";
    } else {
      banner.classList.add(type === "error" ? "error" : "info");
      banner.textContent = message;
    }
  }

  const progress = state?.progress || null;
  if (!panel || !progress || progress.status !== "running") {
    if (panel) panel.classList.add("hidden");
    return;
  }

  panel.classList.remove("hidden");
  if (progressTitle) progressTitle.textContent = progress.type || "operation";
  if (progressMessage) progressMessage.textContent = progress.message || "Working...";
}

function bindActions() {
  const refreshBtn = byId("refreshBtn");
  const openUiBtn = byId("openUiBtn");
  const homepageBtn = byId("homepageBtn");

  if (refreshBtn && !refreshBtn.dataset.bound) {
    refreshBtn.dataset.bound = "1";
    refreshBtn.addEventListener("click", () => window.dockerManagerActions?.refresh?.());
  }
  if (openUiBtn && !openUiBtn.dataset.bound) {
    openUiBtn.dataset.bound = "1";
    openUiBtn.addEventListener("click", () => window.dockerManagerActions?.openUi?.());
  }
  if (homepageBtn && !homepageBtn.dataset.bound) {
    homepageBtn.dataset.bound = "1";
    homepageBtn.addEventListener("click", () => window.dockerManagerActions?.openHomepage?.());
  }
}

window.addEventListener("dm:state", (e) => {
  bindActions();
  render(e.detail || {});
});

bindActions();
if (window.__dmLastState) render(window.__dmLastState);