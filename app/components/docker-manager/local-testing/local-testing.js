function byId(id) { return document.getElementById(id); }

function render(state) {
  const list = byId("localList");
  if (!list) return;
  const containers = Array.isArray(state?.containers) ? state.containers : [];

  list.innerHTML = "";
  if (!containers.length) {
    list.innerHTML = '<div class="sv-subtitle">No containers found.</div>';
    return;
  }

  for (const c of containers) {
    const row = document.createElement("div");
    row.className = "item";
    const left = document.createElement("div");
    const title = document.createElement("div");
    title.className = "item-title";
    title.textContent = c?.containerName || c?.containerId || "container";
    const meta = document.createElement("div");
    meta.className = "item-meta";
    meta.textContent = `${c?.imageRef || "-"} - ${c?.state || "unknown"}`;
    left.appendChild(title);
    left.appendChild(meta);

    const actions = document.createElement("div");
    actions.className = "item-actions";
    const status = document.createElement("span");
    status.className = "status";
    status.textContent = c?.status || c?.state || "unknown";
    actions.appendChild(status);

    row.appendChild(left);
    row.appendChild(actions);
    list.appendChild(row);
  }
}

window.addEventListener("dm:state", (e) => render(e.detail || {}));
if (window.__dmLastState) render(window.__dmLastState);