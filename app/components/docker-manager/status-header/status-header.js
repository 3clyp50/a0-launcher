function byId(id) { return document.getElementById(id); }

function isDockerHubRateLimit(progress) {
  const errorCode = typeof progress?.errorCode === "string" ? progress.errorCode : "";
  const message = `${progress?.error || ""} ${progress?.detail || ""} ${progress?.message || ""}`.trim();
  return errorCode === "DOCKER_PULL_RATE_LIMIT" || /docker hub pull limit reached/i.test(message);
}

function progressActionsForState(state) {
  const progress = state?.progress || null;
  if (progress?.status !== "failed") return [];
  if (isDockerHubRateLimit(progress)) {
    return [
      { id: "docker-login", label: "Docker Login", emphasis: "primary" },
      { id: "retry-install", label: "Retry", emphasis: "secondary", disabled: !progress?.targetTag }
    ];
  }
  return [];
}

function render(state) {
  const contentVersion = byId("contentVersion");
  const appVersion = byId("appVersion");

  if (contentVersion) contentVersion.textContent = state?.meta?.contentVersion || "";
  if (appVersion) appVersion.textContent = state?.meta?.appVersion || "";
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

if (typeof window !== "undefined" && typeof document !== "undefined") {
  window.addEventListener("dm:state", (e) => {
    bindActions();
    render(e.detail || {});
  });

  bindActions();
  if (window.__dmLastState) render(window.__dmLastState);
}

export {
  isDockerHubRateLimit,
  progressActionsForState
};
