const SCOPE_FIELDS = Object.freeze([
  { key: "files", label: "Files read/write", hint: "Read and change files inside the selected folder." },
  { key: "code_execution", label: "Code execution", hint: "Run commands as the Launcher user. Commands are not sandboxed to the selected folder." },
  { key: "browser", label: "Personal browser", hint: "Use a detected Chromium-family profile without silently closing or relaunching it." },
  { key: "computer_use", label: "Computer Use", hint: "Control this computer after its platform permission is armed." }
]);

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizeScopes(value = {}) {
  const scopes = {
    files: value?.files !== false,
    code_execution: value?.code_execution !== false,
    browser: value?.browser !== false,
    computer_use: value?.computer_use !== false
  };
  if (!scopes.files) scopes.code_execution = false;
  return scopes;
}

function normalizeConfig(value = {}, fallback = {}, kind = "local") {
  const local = kind !== "remote";
  return {
    configured: typeof value?.configured === "boolean"
      ? value.configured
      : local && fallback?.configured !== false,
    masterEnabled: typeof value?.masterEnabled === "boolean"
      ? value.masterEnabled
      : fallback?.masterEnabled !== false,
    folder: String(value?.folder || (local ? fallback?.folder : "") || ""),
    folderSource: String(value?.folderSource || ""),
    scopes: normalizeScopes(value?.scopes || fallback?.scopes),
    browserSelection: String(value?.browserSelection || (local ? fallback?.browserSelection : "") || "")
  };
}

function instanceKey(target = {}) {
  const kind = target?.kind === "remote" ? "remote" : "local";
  const id = kind === "remote" ? target?.instanceId || target?.id : target?.containerId || target?.id;
  return id ? `${kind}:${id}` : "";
}

function configForTarget(state = {}, target = {}) {
  const hostAccess = state?.hostAccess || {};
  const defaults = normalizeConfig(hostAccess?.defaults, {}, "local");
  const key = instanceKey(target);
  const saved = key ? hostAccess?.instances?.[key] : null;
  const runtimeConfig = target?.hostAccess?.config;
  return normalizeConfig(runtimeConfig || saved, defaults, target?.kind);
}

function scopeFieldsHtml(prefix, scopes, { compact = false } = {}) {
  return `<div class="dm-host-access-scopes${compact ? " compact" : ""}">
    ${SCOPE_FIELDS.map(({ key, label, hint }) => `
      <label class="dm-host-access-scope">
        <input id="${prefix}-${key}" data-host-scope="${key}" type="checkbox"${scopes[key] ? " checked" : ""}>
        <span>
          <strong>${escapeHtml(label)}</strong>
          ${compact ? "" : `<small>${escapeHtml(hint)}</small>`}
        </span>
      </label>
    `).join("")}
  </div>`;
}

function bindScopeDependency(root) {
  if (!root) return;
  const files = root.querySelector('[data-host-scope="files"]');
  const code = root.querySelector('[data-host-scope="code_execution"]');
  const sync = () => {
    if (!files || !code) return;
    if (!files.checked) code.checked = false;
    code.disabled = !files.checked;
  };
  files?.addEventListener("change", sync);
  sync();
}

function readScopes(root) {
  const scopes = {};
  for (const { key } of SCOPE_FIELDS) {
    scopes[key] = root.querySelector(`[data-host-scope="${key}"]`)?.checked === true;
  }
  if (!scopes.files) scopes.code_execution = false;
  return scopes;
}

async function chooseFolder(input) {
  const result = await window.dockerManagerActions?.chooseHostAccessFolder?.(input?.value || "");
  if (result?.path && input) input.value = result.path;
  return result;
}

function statusLabel(value) {
  const state = String(value || "disconnected");
  return {
    connecting: "Connecting",
    connected: "Connected",
    paused: "Paused",
    needs_action: "Needs action",
    error: "Error",
    disconnected: "Disconnected"
  }[state] || "Disconnected";
}

function browserOptions(browser = {}, selected = "") {
  const options = [{ value: "", label: "Automatic detection" }];
  for (const candidate of Array.isArray(browser?.available_browsers) ? browser.available_browsers : []) {
    const value = String(candidate?.browser_id || candidate?.id || candidate?.cdp_endpoint || "");
    if (!value || options.some((entry) => entry.value === value)) continue;
    const label = String(candidate?.browser_label || candidate?.label || candidate?.profile_label || candidate?.browser_family || value);
    options.push({ value, label });
  }
  if (selected && !options.some((entry) => entry.value === selected)) {
    options.push({ value: selected, label: selected });
  }
  return options.map((option) => `<option value="${escapeHtml(option.value)}"${option.value === selected ? " selected" : ""}>${escapeHtml(option.label)}</option>`).join("");
}

function closeDialog(dialog) {
  dialog?.remove();
}

function openHostAccessOnboarding(state = {}) {
  if (document.getElementById("hostAccessOnboarding")) return;
  const defaults = normalizeConfig(state?.hostAccess?.defaults, {}, "local");
  const dialog = document.createElement("div");
  dialog.id = "hostAccessOnboarding";
  dialog.className = "dm-dialog-backdrop dm-host-access-onboarding";
  dialog.innerHTML = `
    <form class="dm-dialog dm-host-access-dialog" role="dialog" aria-modal="true" aria-labelledby="hostAccessOnboardingTitle">
      <div class="dm-dialog-header">
        <div>
          <div class="dm-host-access-kicker">Launcher capability</div>
          <h2 id="hostAccessOnboardingTitle" class="dm-dialog-title">Host access</h2>
        </div>
      </div>
      <div class="dm-dialog-body">
        <p class="dm-dialog-copy">Let Agent Zero use this computer while its Instance tab is open. The Launcher supervises an outbound A0 CLI connection; closing or detaching the tab disconnects it.</p>
        ${scopeFieldsHtml("hostAccessDefault", defaults.scopes)}
        <div class="dm-field">
          <label for="hostAccessDefaultFolder">Default host folder <span class="dm-optional">optional</span></label>
          <div class="dm-host-folder-row">
            <input id="hostAccessDefaultFolder" class="dm-text-input" type="text" readonly value="${escapeHtml(defaults.folder)}" placeholder="Choose for named-volume, ephemeral, and remote Instances">
            <button class="button" type="button" data-choose-folder>Choose</button>
          </div>
          <div class="dm-field-hint">Bind-mounted local Instances automatically use the host directory backing <strong>/a0/usr</strong>.</div>
        </div>
      </div>
      <div class="dm-dialog-footer">
        <button class="button" type="button" data-skip>Skip</button>
        <button class="button confirm" type="submit">Enable by default</button>
      </div>
    </form>`;
  const form = dialog.querySelector("form");
  const folder = dialog.querySelector("#hostAccessDefaultFolder");
  bindScopeDependency(dialog);
  dialog.querySelector("[data-choose-folder]")?.addEventListener("click", () => chooseFolder(folder));
  const save = async (configured) => {
    const ok = await window.dockerManagerActions?.setHostAccessSettings?.({
      onboardingComplete: true,
      defaults: {
        configured,
        masterEnabled: true,
        folder: folder?.value || "",
        scopes: readScopes(dialog),
        browserSelection: ""
      }
    });
    if (ok !== false) closeDialog(dialog);
  };
  dialog.querySelector("[data-skip]")?.addEventListener("click", () => save(false));
  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    void save(true);
  });
  document.body.appendChild(dialog);
  window.setTimeout(() => form?.querySelector("button.confirm")?.focus(), 0);
}

function maybeOpenHostAccessOnboarding(state = {}) {
  if (!state?.stateLoaded || state?.hostAccess?.onboardingComplete === true) return;
  openHostAccessOnboarding(state);
}

function openHostAccessDialog(tab, state = window.__dmLastState || {}) {
  if (!tab?.id) return false;
  document.getElementById("hostAccessDialog")?.remove();
  const config = configForTarget(state, tab);
  const runtime = tab.hostAccess || {};
  const gateway = runtime.gateway || {};
  const details = gateway.status || {};
  const browser = details.browser || {};
  const computer = details.computer_use || {};
  const isRemote = tab.kind === "remote";
  const stateName = String(runtime.state || "disconnected");
  const compatibility = runtime.code === "CLI_UPDATE_REQUIRED"
    ? "A0 CLI 2.5 or newer required"
    : ["CORE_UPDATE_REQUIRED", "CONTRACT_MISMATCH", "PLUGIN_MISSING"].includes(runtime.code)
      ? "Agent Zero or A0 CLI update required"
      : runtime.code === "AUTH_REQUIRED"
        ? "Instance login required"
      : runtime.code === "ONBOARDING_REQUIRED"
        ? "Finish Host access onboarding"
        : stateName === "connected" || stateName === "paused" || stateName === "needs_action"
          ? "CLI and Core compatible"
          : "Checked when the gateway connects";
  const folderLocked = config.folderSource === "instance_workspace";
  const dialog = document.createElement("div");
  dialog.id = "hostAccessDialog";
  dialog.className = "dm-dialog-backdrop";
  dialog.innerHTML = `
    <form class="dm-dialog dm-host-access-dialog" role="dialog" aria-modal="true" aria-labelledby="hostAccessDialogTitle">
      <div class="dm-dialog-header">
        <div>
          <div class="dm-host-access-kicker">${escapeHtml(tab.title || "Agent Zero")}</div>
          <h2 id="hostAccessDialogTitle" class="dm-dialog-title">Host access</h2>
        </div>
        <button class="button dm-dialog-close" type="button" data-close aria-label="Close">×</button>
      </div>
      <div class="dm-dialog-body">
        <div class="dm-host-access-summary">
          <span class="dm-host-status-dot ${escapeHtml(stateName)}" aria-hidden="true"></span>
          <div><strong>${escapeHtml(statusLabel(stateName))}</strong><small>${escapeHtml(runtime.hostLabel || gateway.host_label || "This computer")}</small></div>
        </div>
        ${runtime.message ? `<div class="dm-host-access-notice ${stateName === "error" ? "error" : ""}">${escapeHtml(runtime.message)}</div>` : ""}
        <label class="dm-checkbox-line dm-host-master-line">
          <input id="hostAccessConfigured" type="checkbox"${config.configured ? " checked" : ""}>
          <span>${isRemote ? "Connect this computer while this tab is open" : "Allow this Instance to connect to this computer"}</span>
        </label>
        <label class="dm-checkbox-line">
          <input id="hostAccessMaster" type="checkbox"${config.masterEnabled ? " checked" : ""}>
          <span>Host access active</span>
        </label>
        ${scopeFieldsHtml("hostAccessInstance", config.scopes)}
        <div class="dm-field">
          <label for="hostAccessFolder">Host folder</label>
          <div class="dm-host-folder-row">
            <input id="hostAccessFolder" class="dm-text-input" type="text" readonly value="${escapeHtml(config.folder)}" placeholder="Choose a folder on this computer">
            <button class="button" type="button" data-choose-folder${folderLocked ? " disabled" : ""}>Choose</button>
          </div>
          <div class="dm-field-hint">${folderLocked ? "Automatically using the host directory backing /a0/usr." : "File operations stay inside this folder. Commands start here but run as the Launcher user and are not sandboxed to it."}</div>
        </div>
        <div class="dm-field">
          <label for="hostAccessBrowser">Personal Chromium profile</label>
          <select id="hostAccessBrowser" class="dm-select">${browserOptions(browser, config.browserSelection)}</select>
          <div class="dm-field-hint">${escapeHtml(browser.support_reason || browser.status || "Detected when the gateway connects.")}</div>
        </div>
        <div class="dm-host-access-diagnostics">
          <div><span>Compatibility</span><strong>${escapeHtml(compatibility)}</strong></div>
          <div><span>Computer Use</span><strong>${escapeHtml(computer.status || "Permission checked when connected")}</strong></div>
        </div>
      </div>
      <div class="dm-dialog-footer dm-host-access-footer">
        <div class="dm-dialog-footer-group">
          ${runtime.code === "CLI_UPDATE_REQUIRED" ? '<button class="button" type="button" data-install-cli>Install / Update CLI</button>' : ""}
          ${runtime.retryable || ["error", "needs_action"].includes(stateName) ? '<button class="button" type="button" data-retry>Retry</button>' : ""}
          ${browser.can_prepare ? '<button class="button" type="button" data-prepare-browser>Prepare browser</button>' : ""}
          ${computer.status && computer.status !== "active" ? '<button class="button" type="button" data-rearm>Arm Computer Use</button>' : ""}
        </div>
        <div class="dm-dialog-footer-group">
          <button class="button" type="button" data-close>Cancel</button>
          <button class="button confirm" type="submit">Save</button>
        </div>
      </div>
    </form>`;
  const folder = dialog.querySelector("#hostAccessFolder");
  bindScopeDependency(dialog);
  dialog.querySelectorAll("[data-close]").forEach((button) => button.addEventListener("click", () => closeDialog(dialog)));
  dialog.addEventListener("mousedown", (event) => {
    if (event.target === dialog) closeDialog(dialog);
  });
  dialog.querySelector("[data-choose-folder]")?.addEventListener("click", () => chooseFolder(folder));
  dialog.querySelector("[data-install-cli]")?.addEventListener("click", () => window.dockerManagerActions?.installCli?.());
  dialog.querySelector("[data-retry]")?.addEventListener("click", () => window.dockerManagerActions?.retryHostGateway?.(tab.id));
  dialog.querySelector("[data-prepare-browser]")?.addEventListener("click", () => window.dockerManagerActions?.hostGatewayCommand?.(tab.id, "prepare_browser"));
  dialog.querySelector("[data-rearm]")?.addEventListener("click", () => window.dockerManagerActions?.hostGatewayCommand?.(tab.id, "rearm_computer_use"));
  dialog.querySelector("form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const saved = await window.dockerManagerActions?.setInstanceHostAccess?.(tab, {
      configured: dialog.querySelector("#hostAccessConfigured")?.checked === true,
      masterEnabled: dialog.querySelector("#hostAccessMaster")?.checked === true,
      folder: folder?.value || "",
      scopes: readScopes(dialog),
      browserSelection: dialog.querySelector("#hostAccessBrowser")?.value || ""
    });
    if (saved !== false) closeDialog(dialog);
  });
  document.body.appendChild(dialog);
  window.setTimeout(() => dialog.querySelector("#hostAccessConfigured")?.focus(), 0);
  return true;
}

export {
  configForTarget,
  maybeOpenHostAccessOnboarding,
  normalizeConfig,
  normalizeScopes,
  openHostAccessDialog,
  readScopes,
  scopeFieldsHtml,
  bindScopeDependency
};
