import {
  ADVANCED_INSTANCE_MODEL_SLOTS,
  PRIMARY_INSTANCE_MODEL_SLOTS,
  applyInstanceDefaultsToForm,
  bindInstanceDefaultDirtyTracking,
  bindInstanceDefaultProviderPlaceholderSync,
  buildInstanceEnvText,
  clearInstanceDefaultDirty,
  instanceModelRowsHtml,
  normalizeInstanceDefaults,
  readInstanceDefaultsFromForm
} from "../instance-defaults.js";

const SETTINGS_TAB_KEY = "dm-settings-active-tab";
const SETTINGS_TABS = ["ports", "workspace", "defaults"];

function byId(id) { return document.getElementById(id); }

function validSettingsTab(tab) {
  return SETTINGS_TABS.includes(tab) ? tab : "ports";
}

function getSettingsTab() {
  try {
    return validSettingsTab(sessionStorage.getItem(SETTINGS_TAB_KEY));
  } catch {
    return "ports";
  }
}

function setStoredSettingsTab(tab) {
  try {
    sessionStorage.setItem(SETTINGS_TAB_KEY, validSettingsTab(tab));
  } catch {
    // Session storage may be unavailable in constrained browser contexts.
  }
}

function applySettingsTab(tab, { persist = true, focus = false } = {}) {
  const activeTab = validSettingsTab(tab);
  if (persist) setStoredSettingsTab(activeTab);

  document.querySelectorAll(".dm-settings-tab").forEach((button) => {
    const selected = button.dataset.settingsTab === activeTab;
    button.classList.toggle("is-active", selected);
    button.setAttribute("aria-selected", selected ? "true" : "false");
    button.tabIndex = selected ? 0 : -1;
    if (selected && focus) button.focus();
  });

  document.querySelectorAll(".dm-settings-tab-panel").forEach((panel) => {
    const selected = panel.dataset.settingsPanel === activeTab;
    panel.classList.toggle("is-active", selected);
    panel.hidden = !selected;
  });
}

function bindSettingsTabs() {
  const buttons = Array.from(document.querySelectorAll(".dm-settings-tab"));
  if (!buttons.length) return;

  buttons.forEach((button, index) => {
    if (button.dataset.dmTabBound) return;
    button.dataset.dmTabBound = "1";
    button.addEventListener("click", () => applySettingsTab(button.dataset.settingsTab));
    button.addEventListener("keydown", (event) => {
      const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
      if (!step) return;
      event.preventDefault();
      const nextIndex = (index + step + buttons.length) % buttons.length;
      applySettingsTab(buttons[nextIndex]?.dataset.settingsTab, { focus: true });
    });
  });

  applySettingsTab(getSettingsTab(), { persist: false });
}

function parseOptionalInt(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return undefined;
  const parsed = parseInt(raw, 10);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function compactText(value, fallback = "") {
  const text = String(value || "").trim();
  return text || fallback;
}

function currentStoragePreferences(state) {
  const prefs = state?.storagePreferences && typeof state.storagePreferences === "object" ? state.storagePreferences : {};
  return {
    mode: prefs.mode === "named_volume" ? "named_volume" : "host_directory",
    hostRoot: compactText(prefs.hostRoot, "~/agent-zero"),
    hostPathMode: prefs.hostPathMode === "exact" ? "exact" : "per_instance",
    volumePrefix: compactText(prefs.volumePrefix, "a0-launcher")
  };
}

function syncStoragePreferenceFields() {
  const mode = byId("workspaceStorageMode")?.value || "host_directory";
  const host = mode === "host_directory";
  const hostRootRow = byId("workspaceHostRootRow");
  const hostPathModeRow = byId("workspaceHostPathModeRow");
  const volumePrefixRow = byId("workspaceVolumePrefixRow");

  if (hostRootRow) hostRootRow.hidden = !host;
  if (hostPathModeRow) hostPathModeRow.hidden = !host;
  if (volumePrefixRow) volumePrefixRow.hidden = host;
}

function renderModelFields() {
  const primary = byId("settingsPrimaryModels");
  const advanced = byId("settingsAdvancedModels");
  if (primary && !primary.dataset.rendered) {
    primary.innerHTML = instanceModelRowsHtml(PRIMARY_INSTANCE_MODEL_SLOTS, null, "settings");
    primary.dataset.rendered = "1";
  }
  if (advanced && !advanced.dataset.rendered) {
    advanced.innerHTML = instanceModelRowsHtml(ADVANCED_INSTANCE_MODEL_SLOTS, null, "settings");
    advanced.dataset.rendered = "1";
  }
  bindInstanceDefaultProviderPlaceholderSync(document, "settings");
}

function populateFromState(state) {
  renderModelFields();
  const prefs = state?.portPreferences;
  const storagePrefs = currentStoragePreferences(state);
  const instanceDefaults = normalizeInstanceDefaults(state?.instanceDefaults);

  const uiInput = byId("uiPortInput");
  const sshInput = byId("sshPortInput");
  const storageMode = byId("workspaceStorageMode");
  const hostRoot = byId("workspaceHostRoot");
  const hostPathMode = byId("workspaceHostPathMode");
  const volumePrefix = byId("workspaceVolumePrefix");
  const saveWorkspaceStorageBtn = byId("saveWorkspaceStorageBtn");

  if (uiInput && prefs?.ui != null && !uiInput.dataset.dirty) {
    uiInput.value = prefs.ui;
  }
  if (sshInput && prefs?.ssh != null && !sshInput.dataset.dirty) {
    sshInput.value = prefs.ssh;
  }
  if (storageMode && !storageMode.dataset.dirty) storageMode.value = storagePrefs.mode;
  if (hostRoot && !hostRoot.dataset.dirty) hostRoot.value = storagePrefs.hostRoot;
  if (hostPathMode && !hostPathMode.dataset.dirty) hostPathMode.value = storagePrefs.hostPathMode;
  if (volumePrefix && !volumePrefix.dataset.dirty) volumePrefix.value = storagePrefs.volumePrefix;
  if (saveWorkspaceStorageBtn) saveWorkspaceStorageBtn.disabled = state?.progress?.status === "running";
  syncStoragePreferenceFields();
  applyInstanceDefaultsToForm(document, "settings", instanceDefaults, { respectDirty: true });
}

function bindActions() {
  bindSettingsTabs();
  renderModelFields();
  const savePortsBtn = byId("savePortsBtn");
  const saveWorkspaceStorageBtn = byId("saveWorkspaceStorageBtn");
  const saveInstanceDefaultsBtn = byId("saveInstanceDefaultsBtn");
  const uiInput = byId("uiPortInput");
  const sshInput = byId("sshPortInput");
  const storageInputs = [
    byId("workspaceStorageMode"),
    byId("workspaceHostRoot"),
    byId("workspaceHostPathMode"),
    byId("workspaceVolumePrefix")
  ].filter(Boolean);

  if (uiInput && !uiInput.dataset.bound) {
    uiInput.dataset.bound = "1";
    uiInput.addEventListener("input", () => { uiInput.dataset.dirty = "1"; });
  }
  if (sshInput && !sshInput.dataset.bound) {
    sshInput.dataset.bound = "1";
    sshInput.addEventListener("input", () => { sshInput.dataset.dirty = "1"; });
  }
  bindInstanceDefaultDirtyTracking(document, "settings");

  storageInputs.forEach((input) => {
    if (input.dataset.bound) return;
    input.dataset.bound = "1";
    input.addEventListener("input", () => { input.dataset.dirty = "1"; });
    input.addEventListener("change", () => {
      input.dataset.dirty = "1";
      syncStoragePreferenceFields();
    });
  });

  if (savePortsBtn && !savePortsBtn.dataset.bound) {
    savePortsBtn.dataset.bound = "1";
    savePortsBtn.addEventListener("click", async () => {
      const ui = parseOptionalInt(uiInput?.value);
      const ssh = parseOptionalInt(sshInput?.value);
      const ok = await window.dockerManagerActions?.setPortPreferences?.({ ui, ssh });
      if (ok) {
        if (uiInput) delete uiInput.dataset.dirty;
        if (sshInput) delete sshInput.dataset.dirty;
      }
    });
  }

  if (saveWorkspaceStorageBtn && !saveWorkspaceStorageBtn.dataset.bound) {
    saveWorkspaceStorageBtn.dataset.bound = "1";
    saveWorkspaceStorageBtn.addEventListener("click", async () => {
      const saved = await window.dockerManagerActions?.setStoragePreferences?.({
        mode: byId("workspaceStorageMode")?.value || "host_directory",
        hostRoot: byId("workspaceHostRoot")?.value || "~/agent-zero",
        hostPathMode: byId("workspaceHostPathMode")?.value || "per_instance",
        volumePrefix: byId("workspaceVolumePrefix")?.value || "a0-launcher"
      });
      if (saved) storageInputs.forEach((input) => { delete input.dataset.dirty; });
    });
  }

  if (saveInstanceDefaultsBtn && !saveInstanceDefaultsBtn.dataset.bound) {
    saveInstanceDefaultsBtn.dataset.bound = "1";
    saveInstanceDefaultsBtn.addEventListener("click", async () => {
      const instanceDefaults = readInstanceDefaultsFromForm(document, "settings");
      const envResult = buildInstanceEnvText(instanceDefaults);
      if (!envResult.ok) {
        window.toastFrontendError?.(envResult.message, "Agent Zero");
        return;
      }
      const ok = await window.dockerManagerActions?.setInstanceDefaults?.(instanceDefaults);
      if (ok) clearInstanceDefaultDirty(document, "settings");
    });
  }
}

window.addEventListener("dm:state", (e) => {
  populateFromState(e.detail);
  bindActions();
});

if (window.__dmLastState) {
  populateFromState(window.__dmLastState);
}
bindActions();
