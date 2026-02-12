function byId(id) { return document.getElementById(id); }

function fmtDate(v) {
  if (!v) return "";
  const n = Date.parse(v);
  if (!Number.isFinite(n)) return String(v);
  try { return new Date(n).toLocaleString(); } catch { return String(v); }
}

function render(state) {
  const subtitle = byId("officialSubtitle");
  const list = byId("officialList");
  if (!list) return;

  const images = Array.isArray(state?.images) ? state.images : [];
  if (subtitle) subtitle.textContent = `${images.length} image(s) detected`;

  list.innerHTML = "";
  if (!images.length) {
    list.innerHTML = '<div class="sv-subtitle">No local images found.</div>';
    return;
  }

  for (const img of images) {
    const row = document.createElement("div");
    row.className = "item";
    const left = document.createElement("div");
    const title = document.createElement("div");
    title.className = "item-title";
    title.textContent = img?.imageRef || img?.tag || "unknown";
    const meta = document.createElement("div");
    meta.className = "item-meta";
    meta.textContent = `Tag: ${img?.tag || "-"}${img?.createdAt ? ` - Created: ${fmtDate(img.createdAt)}` : ""}`;
    left.appendChild(title);
    left.appendChild(meta);
    row.appendChild(left);
    list.appendChild(row);
  }
}

window.addEventListener("dm:state", (e) => render(e.detail || {}));
if (window.__dmLastState) render(window.__dmLastState);