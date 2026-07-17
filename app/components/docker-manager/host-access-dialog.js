const SCOPE_FIELDS = Object.freeze([
  { key: "files", icon: "folder_open", label: "Files read", hint: "Open files in the folder below." },
  { key: "file_write", icon: "edit_document", label: "Files write", hint: "Create and change files there." },
  { key: "code_execution", icon: "terminal", label: "Code execution", hint: "Run terminal commands on this computer." },
  { key: "browser", icon: "language", label: "Use my Browser", hint: "Work in a supported browser profile." },
  { key: "computer_use", icon: "computer", label: "Computer Use", hint: "See and control apps on this computer." }
]);

const CAPABILITY_STATUS_LABELS = Object.freeze({
  ready: "Ready",
  active: "Active",
  disabled: "Off",
  unsupported: "Not available",
  "relaunch required": "Browser restart needed",
  interactive: "Ask each time",
  persistent: "Ready",
  allow: "Ready",
  arming: "Waiting for permission",
  "approval required": "Permission needed",
  "rearm required": "Permission needed",
  error: "Needs attention"
});

const ARMABLE_COMPUTER_USE_STATUSES = new Set(["approval required", "rearm required", "error"]);

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
    file_write: typeof value?.file_write === "boolean" ? value.file_write : value?.files !== false,
    code_execution: value?.code_execution !== false,
    browser: value?.browser === true,
    computer_use: value?.computer_use === true
  };
  if (!scopes.files) scopes.file_write = false;
  if (!scopes.file_write) scopes.code_execution = false;
  return scopes;
}

function normalizeConfig(value = {}, fallback = {}, kind = "local") {
  const local = kind !== "remote";
  const configured = typeof value?.configured === "boolean"
    ? value.configured
    : local && fallback?.configured === true;
  return {
    configured,
    masterEnabled: typeof value?.masterEnabled === "boolean"
      ? value.masterEnabled
      : typeof fallback?.masterEnabled === "boolean"
        ? fallback.masterEnabled
        : configured,
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
  const config = normalizeConfig(runtimeConfig || saved, defaults, target?.kind);
  if (target?.kind === "remote" && !config.folder) config.folder = defaults.folder;
  return config;
}

function scopeFieldsHtml(prefix, scopes, { compact = false, onboarding = false, masterContent = "", detailsContent = "" } = {}) {
  const fields = `<fieldset class="dm-host-access-scopes${compact ? " compact" : ""}" aria-label="Host permissions">
      ${SCOPE_FIELDS.map(({ key, icon, label, hint }) => `
        <label class="dm-host-access-scope">
          <span class="material-symbols-outlined dm-host-access-scope-icon" aria-hidden="true">${escapeHtml(icon)}</span>
          <span class="dm-host-access-scope-copy">
            <strong>${escapeHtml(label)}</strong>
            <small>${escapeHtml(hint)}</small>
          </span>
          <span class="dm-host-access-switch">
            <input id="${prefix}-${key}" data-host-scope="${key}" type="checkbox"${scopes[key] ? " checked" : ""}>
            <span class="dm-host-access-toggler" aria-hidden="true"></span>
          </span>
        </label>
      `).join("")}
    </fieldset>`;
  if (onboarding) {
    return `<div class="dm-host-access-permissions-static">
      <div class="dm-field-label">Host permissions</div>
      ${fields}
    </div>`;
  }
  return `<details class="dm-advanced dm-host-access-permissions">
    <summary>Host permissions <span data-host-scope-summary>${scopeSummaryText(scopes)}</span></summary>
    ${masterContent}
    ${fields}
    ${detailsContent}
  </details>`;
}

function scopeSummaryText(scopes, enabled = true) {
  if (!enabled) return "Host access off";
  const permissions = [
    ["Read", scopes.files],
    ["Write", scopes.file_write],
    ["Code", scopes.code_execution],
    ["Browser", scopes.browser],
    ["Computer Use", scopes.computer_use]
  ];
  const on = permissions.filter(([, active]) => active).map(([label]) => label);
  const off = permissions.filter(([, active]) => !active).map(([label]) => label);
  return [on.length ? `On: ${on.join(", ")}` : "", off.length ? `Off: ${off.join(", ")}` : ""].filter(Boolean).join(" · ");
}

function syncScopeDependency(root) {
  const files = root.querySelector('[data-host-scope="files"]');
  const write = root.querySelector('[data-host-scope="file_write"]');
  const code = root.querySelector('[data-host-scope="code_execution"]');
  if (!files || !write || !code) return;
  if (!files.checked) write.checked = false;
  if (!write.checked) code.checked = false;
  write.disabled = !files.checked;
  code.disabled = !write.checked;
  const summary = root.querySelector("[data-host-scope-summary]");
  if (summary) summary.textContent = scopeSummaryText(readScopes(root));
}

function bindScopeDependency(root) {
  if (!root) return;
  root.querySelectorAll("[data-host-scope]").forEach((input) => {
    input.addEventListener("change", () => syncScopeDependency(root));
  });
  syncScopeDependency(root);
}

function bindHostAccessState(root, { configuredSelector = "" } = {}) {
  if (!root) return;
  const configured = configuredSelector ? root.querySelector(configuredSelector) : null;
  const scopes = root.querySelector(".dm-host-access-scopes");
  const sync = () => {
    const configuredOn = !configured || configured.checked;
    if (scopes) scopes.disabled = !configuredOn;
    root.querySelectorAll("[data-host-config-control]").forEach((control) => {
      control.disabled = !configuredOn || control.dataset.hostLocked === "true";
    });
    syncScopeDependency(root);
    const summary = root.querySelector("[data-host-scope-summary]");
    if (summary) summary.textContent = scopeSummaryText(readScopes(root), configuredOn);
  };
  configured?.addEventListener("change", sync);
  sync();
  return sync;
}

function switchLineHtml(id, label, hint, checked) {
  return `<label class="dm-host-access-switch-line" for="${escapeHtml(id)}">
    <span><strong>${escapeHtml(label)}</strong><small>${escapeHtml(hint)}</small></span>
    <span class="dm-host-access-switch">
      <input id="${escapeHtml(id)}" type="checkbox"${checked ? " checked" : ""}>
      <span class="dm-host-access-toggler" aria-hidden="true"></span>
    </span>
  </label>`;
}

function readScopes(root) {
  const scopes = {};
  for (const { key } of SCOPE_FIELDS) {
    scopes[key] = root.querySelector(`[data-host-scope="${key}"]`)?.checked === true;
  }
  if (!scopes.files) scopes.file_write = false;
  if (!scopes.file_write) scopes.code_execution = false;
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

function normalizeCapabilityStatus(value) {
  return String(value || "").trim().toLowerCase().replaceAll("_", " ");
}

function capabilityStatusLabel(value, fallback) {
  return CAPABILITY_STATUS_LABELS[normalizeCapabilityStatus(value)] || fallback;
}

function computerUseNeedsArm(value) {
  return ARMABLE_COMPUTER_USE_STATUSES.has(normalizeCapabilityStatus(value));
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

function browserSetupHint(browser = {}) {
  const available = Array.isArray(browser?.available_browsers) ? browser.available_browsers : [];
  const hasDebuggingEndpoint = Boolean(String(browser?.cdp_endpoint || "").trim())
    || available.some((candidate) => Boolean(String(candidate?.cdp_endpoint || "").trim()));
  return hasDebuggingEndpoint
    ? ""
    : "Open Chrome or Chromium at chrome://inspect/#remote-debugging, Edge at edge://inspect/#remote-debugging, or Opera at opera://inspect/#remote-debugging. Brave and Vivaldi are supported too. Turn on ‘Allow remote debugging for this browser instance,’ then click Set up browser again.";
}

function watchBrowserSetupFailure(tabId) {
  let timeoutId = 0;
  const stop = () => {
    window.clearTimeout(timeoutId);
    window.removeEventListener("dm:state", onState);
  };
  const onState = (event) => {
    const tab = event?.detail?.instanceTabs?.tabs?.find((candidate) => candidate?.id === tabId);
    if (tab?.hostAccess?.code !== "GATEWAY_COMMAND_FAILED") return;
    window.toastFrontendInfo?.(browserSetupHint(), "Set up browser", 12, "dm-host-browser-setup");
    stop();
  };
  window.addEventListener("dm:state", onState);
  timeoutId = window.setTimeout(stop, 30000);
}

function closeDialog(dialog) {
  dialog?.remove();
  window.dockerManagerActions?.syncInstanceTabBounds?.();
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
          <div class="dm-host-access-kicker">This computer</div>
          <h2 id="hostAccessOnboardingTitle" class="dm-dialog-title">Host access</h2>
        </div>
      </div>
      <div class="dm-dialog-body">
        <p class="dm-dialog-copy">Agent Zero can help with files, apps, and tasks on this computer while the current Instance is open with the Launcher, either in a tab or detached window. Close that tab or window, and access stops.</p>
        ${switchLineHtml(
          "hostAccessDefaultConfigured",
          "Allow new local Instances to use this computer",
          "You can change this for each Instance.",
          false
        )}
        ${scopeFieldsHtml("hostAccessDefault", defaults.scopes, { onboarding: true })}
        <div class="dm-field">
          <label for="hostAccessDefaultFolder">Default folder for files and commands <span class="dm-optional">optional</span></label>
          <div class="dm-host-folder-row">
            <input id="hostAccessDefaultFolder" class="dm-text-input" type="text" readonly value="${escapeHtml(defaults.folder)}" placeholder="Choose a fallback folder" data-host-config-control>
            <button class="button" type="button" data-choose-folder data-host-config-control>Choose</button>
          </div>
          <div class="dm-field-hint">Used when an Instance has no workspace on this computer. Agent Zero reads and writes files here. Commands start here but can reach other folders.</div>
        </div>
      </div>
      <div class="dm-dialog-footer">
        <button class="button" type="button" data-skip>Skip</button>
        <button class="button confirm" type="submit">Save defaults</button>
      </div>
    </form>`;
  const form = dialog.querySelector("form");
  const folder = dialog.querySelector("#hostAccessDefaultFolder");
  const configuredInput = dialog.querySelector("#hostAccessDefaultConfigured");
  bindScopeDependency(dialog);
  bindHostAccessState(dialog, {
    configuredSelector: "#hostAccessDefaultConfigured"
  });
  dialog.querySelector("[data-choose-folder]")?.addEventListener("click", () => chooseFolder(folder));
  const save = async (configured) => {
    const ok = await window.dockerManagerActions?.setHostAccessSettings?.({
      onboardingComplete: true,
      defaults: {
        configured,
        masterEnabled: configured,
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
    void save(configuredInput?.checked === true);
  });
  document.body.appendChild(dialog);
  window.setTimeout(() => configuredInput?.focus(), 0);
}

function maybeOpenHostAccessOnboarding(state = {}) {
  if (!state?.stateLoaded || state?.hostAccess?.onboardingComplete === true) return;
  openHostAccessOnboarding(state);
}

function openHostAccessDialog(tab, state = window.__dmLastState || {}) {
  if (!instanceKey(tab)) return false;
  closeDialog(document.getElementById("hostAccessDialog"));
  const config = configForTarget(state, tab);
  const runtime = tab.hostAccess || {};
  const gateway = runtime.gateway || {};
  const details = gateway.status || {};
  const browser = details.browser || {};
  const computer = details.computer_use || {};
  const canArmComputer = computerUseNeedsArm(computer.status);
  const stateName = String(runtime.state || "disconnected");
  const reconnectAvailable = runtime.suppressed === true;
  const disconnectAvailable = !reconnectAvailable && (runtime.connected === true || stateName === "connecting");
  const disconnectedWithoutTab = !tab.id && stateName === "disconnected";
  const configured = config.configured && config.masterEnabled;
  const connectionLabel = disconnectedWithoutTab && configured ? "Ready to connect" : statusLabel(stateName);
  const connectionDetail = disconnectedWithoutTab
    ? configured ? "Open this Instance in a Launcher tab to connect." : "Host access is off."
    : runtime.hostLabel || gateway.host_label || "This computer";
  const connectionAction = reconnectAvailable
    ? '<button class="button confirm dm-host-access-connection-action" type="button" data-reconnect>Reconnect</button>'
    : disconnectAvailable
      ? '<button class="button dm-host-access-connection-action" type="button" data-disconnect>Disconnect</button>'
      : "";
  const compatibility = runtime.code === "CLI_UPDATE_REQUIRED"
    ? "Launcher setup needs attention"
    : ["CORE_UPDATE_REQUIRED", "CONTRACT_MISMATCH", "PLUGIN_MISSING"].includes(runtime.code)
      ? "Update Launcher or Agent Zero to use Host access"
      : runtime.code === "AUTH_REQUIRED"
        ? "Sign in to this Instance"
      : runtime.code === "ONBOARDING_REQUIRED"
        ? "Choose your Host access defaults"
        : stateName === "connected" || stateName === "paused" || stateName === "needs_action"
          ? "Ready"
          : "Checked when you connect";
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
          <div><strong data-host-connection-label>${escapeHtml(connectionLabel)}</strong><small data-host-connection-detail>${escapeHtml(connectionDetail)}</small></div>
          ${connectionAction}
        </div>
        ${runtime.message ? `<div class="dm-host-access-notice ${stateName === "error" ? "error" : ""}">${escapeHtml(runtime.message)}</div>` : ""}
        ${scopeFieldsHtml("hostAccessInstance", config.scopes, {
          masterContent: switchLineHtml(
            "hostAccessConfigured",
            "All permissions",
            "Master switch",
            configured
          ),
          detailsContent: `<div class="dm-field">
            <label for="hostAccessFolder">Folder for files and commands</label>
            <div class="dm-host-folder-row">
              <input id="hostAccessFolder" class="dm-text-input" type="text" readonly value="${escapeHtml(config.folder)}" placeholder="Choose a folder on this computer" data-host-config-control data-host-locked="${folderLocked}">
              <button class="button" type="button" data-choose-folder data-host-config-control data-host-locked="${folderLocked}"${folderLocked ? " disabled" : ""}>Choose</button>
            </div>
            <div class="dm-field-hint">${folderLocked ? "Using this Instance's workspace. Agent Zero reads and writes files here. Commands start here but can reach other folders on this computer." : "Agent Zero reads and writes files here. Commands start here but can reach other folders on this computer."}</div>
          </div>`
        })}
        <details class="dm-advanced dm-host-access-advanced">
          <summary>Advanced settings <span>Browser and connection details</span></summary>
          <div class="dm-advanced-body">
            <div class="dm-field">
              <label for="hostAccessBrowser">Browser to use</label>
              <select id="hostAccessBrowser" class="dm-select" data-host-config-control>${browserOptions(browser, config.browserSelection)}</select>
              <div class="dm-field-hint">${escapeHtml(browser.support_reason || capabilityStatusLabel(browser.status, "We'll look for a supported browser when you connect."))}</div>
            </div>
            <div class="dm-host-access-diagnostics">
              <div><span>Connection</span><strong>${escapeHtml(compatibility)}</strong></div>
              <div><span>Computer Use</span><strong>${escapeHtml(capabilityStatusLabel(computer.status, "Permission checked when connected"))}</strong></div>
            </div>
          </div>
        </details>
      </div>
      <div class="dm-dialog-footer dm-host-access-footer">
        <div class="dm-dialog-footer-group">
          ${runtime.retryable || ["error", "needs_action"].includes(stateName) ? '<button class="button" type="button" data-retry>Retry</button>' : ""}
          ${browser.can_prepare ? '<button class="button" type="button" data-prepare-browser>Set up browser</button>' : ""}
          ${canArmComputer ? '<button class="button" type="button" data-rearm>Allow Computer Use</button>' : ""}
        </div>
        <div class="dm-dialog-footer-group">
          <button class="button" type="button" data-close>Cancel</button>
          <button class="button confirm" type="submit">Save</button>
        </div>
      </div>
    </form>`;
  const folder = dialog.querySelector("#hostAccessFolder");
  bindScopeDependency(dialog);
  bindHostAccessState(dialog, {
    configuredSelector: "#hostAccessConfigured"
  });
  const configuredInput = dialog.querySelector("#hostAccessConfigured");
  if (disconnectedWithoutTab) {
    const syncConnectionCopy = () => {
      const enabled = configuredInput?.checked === true;
      dialog.querySelector("[data-host-connection-label]").textContent = enabled ? "Ready to connect" : "Disconnected";
      dialog.querySelector("[data-host-connection-detail]").textContent = enabled
        ? "Open this Instance in a Launcher tab to connect."
        : "Host access is off.";
    };
    configuredInput?.addEventListener("change", syncConnectionCopy);
    syncConnectionCopy();
  }
  dialog.querySelectorAll("[data-close]").forEach((button) => button.addEventListener("click", () => closeDialog(dialog)));
  dialog.addEventListener("mousedown", (event) => {
    if (event.target === dialog) closeDialog(dialog);
  });
  dialog.querySelector("[data-choose-folder]")?.addEventListener("click", () => chooseFolder(folder));
  dialog.querySelector("[data-disconnect]")?.addEventListener("click", async () => {
    if (await window.dockerManagerActions?.hostGatewayCommand?.(tab.id, "disconnect") !== false) closeDialog(dialog);
  });
  dialog.querySelector("[data-reconnect]")?.addEventListener("click", async () => {
    if (await window.dockerManagerActions?.hostGatewayCommand?.(tab.id, "reconnect") !== false) closeDialog(dialog);
  });
  dialog.querySelector("[data-retry]")?.addEventListener("click", () => window.dockerManagerActions?.retryHostGateway?.(tab.id));
  dialog.querySelector("[data-prepare-browser]")?.addEventListener("click", () => {
    const hint = browserSetupHint(browser);
    if (hint) window.toastFrontendInfo?.(hint, "Set up browser", 12, "dm-host-browser-setup");
    else watchBrowserSetupFailure(tab.id);
    window.dockerManagerActions?.hostGatewayCommand?.(tab.id, "prepare_browser");
  });
  dialog.querySelector("[data-rearm]")?.addEventListener("click", () => window.dockerManagerActions?.hostGatewayCommand?.(tab.id, "rearm_computer_use"));
  dialog.querySelector("form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const enabled = configuredInput?.checked === true;
    const saved = await window.dockerManagerActions?.setInstanceHostAccess?.(tab, {
      configured: enabled,
      masterEnabled: enabled,
      folder: folder?.value || "",
      scopes: readScopes(dialog),
      browserSelection: dialog.querySelector("#hostAccessBrowser")?.value || ""
    });
    if (saved !== false) closeDialog(dialog);
  });
  document.body.appendChild(dialog);
  window.dockerManagerActions?.hideInstanceTabView?.();
  window.setTimeout(() => dialog.querySelector("#hostAccessConfigured")?.focus(), 0);
  return true;
}

export {
  configForTarget,
  capabilityStatusLabel,
  computerUseNeedsArm,
  maybeOpenHostAccessOnboarding,
  normalizeConfig,
  normalizeScopes,
  openHostAccessDialog,
  readScopes,
  scopeFieldsHtml,
  bindScopeDependency,
  bindHostAccessState,
  browserSetupHint,
  watchBrowserSetupFailure,
  switchLineHtml
};
