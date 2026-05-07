function byId(id) { return document.getElementById(id); }

function fmtUptime(started) {
  if (!started) return "";
  const ms = Date.now() - Date.parse(started);
  if (!Number.isFinite(ms) || ms < 0) return "";
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ${mins % 60}m`;
  return `${Math.floor(hrs / 24)}d ${hrs % 24}h`;
}

function render(state) {
  const list = byId("localList");
  const subtitle = byId("sessionsSubtitle");
  if (!list) return;
  const containers = Array.isArray(state?.containers) ? state.containers : [];

  if (subtitle) {
    const running = containers.filter(c => c?.state === "running").length;
    subtitle.textContent = running
      ? `${containers.length} instance(s), ${running} running`
      : `${containers.length} instance(s) detected`;
  }

  list.innerHTML = "";
  if (!containers.length) {
    list.innerHTML = '<div class="dm-empty">No instances found. Activate an install to create one.</div>';
    return;
  }

  const operationRunning = state?.progress?.status === "running";

  for (const c of containers) {
    const card = document.createElement("div");
    card.className = "dm-card";

    const visual = document.createElement("div");
    visual.className = "dm-card-visual";
    const logo = document.createElement("img");
    logo.className = "dm-card-logo";
    logo.src = "assets/darkSymbol.svg";
    logo.alt = "Agent Zero";
    visual.appendChild(logo);

    const body = document.createElement("div");
    body.className = "dm-card-body";
    const title = document.createElement("div");
    title.className = "dm-card-title";
    title.textContent = c?.instanceName || c?.containerName || c?.containerId?.slice(0, 12) || "instance";
    body.appendChild(title);

    const meta = document.createElement("div");
    meta.className = "dm-card-meta";
    const parts = [];
    if (c?.imageRef) parts.push(c.imageRef);
    if (c?.uiUrl) parts.push(c.uiUrl);
    const startedAt = c?.startedAt || c?.createdAt;
    if (c?.state === "running" && startedAt) {
      const up = fmtUptime(startedAt);
      if (up) parts.push("Up " + up);
    }
    if (c?.status) parts.push(c.status);
    meta.textContent = parts.join(" \u00B7 ");
    body.appendChild(meta);

    const footer = document.createElement("div");
    footer.className = "dm-card-footer";

    const statusEl = document.createElement("span");
    statusEl.className = "status";
    const st = (c?.state || "unknown").toLowerCase();
    if (st === "running") {
      statusEl.classList.add("status-running");
      statusEl.textContent = "Running";
    } else if (st === "exited" || st === "stopped") {
      statusEl.classList.add("status-exited");
      statusEl.textContent = "Stopped";
    } else {
      statusEl.textContent = c?.state || "Unknown";
    }
    footer.appendChild(statusEl);

    const actions = document.createElement("div");
    actions.className = "dm-card-actions";
    const isActiveInstance = c?.labels?.["a0.launcher.role"] === "active" || String(c?.containerName || "").includes("-active__");

    if (st === "running") {
      const openBtn = document.createElement("button");
      openBtn.className = "button confirm";
      openBtn.type = "button";
      openBtn.textContent = "Open UI";
      openBtn.addEventListener("click", () => {
        window.dockerManagerActions?.openUi?.(c?.containerId || "");
      });
      actions.appendChild(openBtn);

      if (isActiveInstance) {
        const stopBtn = document.createElement("button");
        stopBtn.className = "button cancel";
        stopBtn.type = "button";
        stopBtn.textContent = "Stop";
        stopBtn.disabled = operationRunning;
        stopBtn.addEventListener("click", () => {
          window.dockerManagerActions?.stopActive?.();
        });
        actions.appendChild(stopBtn);
      }
    } else if (isActiveInstance) {
      const startBtn = document.createElement("button");
      startBtn.className = "button confirm";
      startBtn.type = "button";
      startBtn.textContent = "Start";
      startBtn.disabled = operationRunning;
      startBtn.addEventListener("click", () => {
        window.dockerManagerActions?.startActive?.();
      });
      actions.appendChild(startBtn);
    }

    footer.appendChild(actions);

    card.appendChild(visual);
    card.appendChild(body);
    card.appendChild(footer);
    list.appendChild(card);
  }
}

window.addEventListener("dm:state", (e) => render(e.detail || {}));
if (window.__dmLastState) render(window.__dmLastState);
