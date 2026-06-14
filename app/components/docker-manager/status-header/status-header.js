function byId(id) { return document.getElementById(id); }

function render(state) {
  const contentVersion = byId("contentVersion");
  const appVersion = byId("appVersion");
  const panel = byId("progressPanel");
  const progressTitle = byId("progressTitle");
  const progressMessage = byId("progressMessage");

  if (contentVersion) contentVersion.textContent = state?.meta?.contentVersion || "";
  if (appVersion) appVersion.textContent = state?.meta?.appVersion || "";

  const progress = state?.progress || null;
  const status = typeof progress?.status === "string" ? progress.status : "";
  const shouldShow = status === "running" || status === "failed" || status === "canceled";
  if (!panel || !progress || !shouldShow) {
    if (panel) panel.classList.add("hidden");
    return;
  }

  panel.classList.remove("hidden");
  const type = progress.type || "operation";
  if (progressTitle) {
    progressTitle.textContent = status === "failed"
      ? `${type} failed`
      : status === "canceled" ? `${type} canceled` : type;
  }
  if (progressMessage) {
    progressMessage.textContent = status === "failed"
      ? (progress.error || progress.message || "Operation failed.")
      : status === "canceled" ? (progress.error || progress.message || "Canceled.") : (progress.message || "Working...");
    progressMessage.classList.toggle("error", status === "failed");
  }
}

function bindActions() {
  const refreshBtn = byId("refreshBtn");
  const homepageBtn = byId("homepageBtn");

  if (refreshBtn && !refreshBtn.dataset.bound) {
    refreshBtn.dataset.bound = "1";
    refreshBtn.addEventListener("click", () => window.dockerManagerActions?.refresh?.());
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
