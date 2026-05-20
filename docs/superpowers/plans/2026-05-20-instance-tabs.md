# Instance Tabs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `Open UI` open Agent Zero instances in launcher tabs by default, with detach-to-window support and live Instances refresh after operations.

**Architecture:** The renderer owns visible tab chrome and sends user intent through preload. `shell/main.js` owns target URL resolution, URL validation, `WebContentsView` lifecycle, tab dedupe, active view bounds, and detached `BrowserWindow`s. Renderer operation progress triggers a post-operation inventory refresh so newly activated instances appear without manual refresh.

**Tech Stack:** Electron 33, CommonJS main/preload, static ES module renderer, local Material Symbols, Node built-in `node:test` for pure helper coverage.

---

## File Structure

- Create `shell/instance_tabs.js`: pure helper functions for URL normalization, tab keys, and sanitized tab snapshots.
- Create `shell/instance_tabs.test.js`: Node built-in tests for helper behavior.
- Modify `shell/main.js`: import `WebContentsView`, add shell-owned instance tab registry, bounds sync, IPC handlers, and cleanup.
- Modify `shell/preload.js`: expose instance tab methods and state subscription through `dockerManagerAPI`.
- Modify `app/components/docker-manager/docker-manager-store.js`: add `instanceTabs` state.
- Modify `app/docker_manager.js`: add instance-tab actions, renderer event publication, viewport bounds sync, and post-operation refresh scheduling.
- Create `app/components/docker-manager/instance-tabs/index.html`: mount point for tab chrome and view viewport.
- Create `app/components/docker-manager/instance-tabs/instance-tabs.js`: render tabs and dispatch tab actions.
- Modify `app/index.html`: mount the instance-tabs component near the top-level launcher workspace.
- Modify `app/docker_manager.css`: style tab strip, viewport, empty state, and responsive behavior.
- Modify `app/components/docker-manager/local-testing/local-testing.js`: route local and remote `Open UI` buttons through the new tab action.
- Modify `shell/AGENTS.md`, `app/AGENTS.md`, `app/components/docker-manager/AGENTS.md`, and `docs/release-todos.md`: document final runtime contracts and release checks.

## Task 1: Pure Instance Tab Helpers

**Files:**
- Create: `shell/instance_tabs.js`
- Create: `shell/instance_tabs.test.js`

- [ ] **Step 1: Write failing helper tests**

Create `shell/instance_tabs.test.js`:

```javascript
const assert = require('node:assert/strict');
const { test } = require('node:test');

const {
  normalizeHttpUrl,
  isAllowedLocalInstanceUrl,
  isAllowedRemoteInstanceUrl,
  makeTabKey,
  makeTabsSnapshot
} = require('./instance_tabs');

test('local URLs allow only localhost-style HTTP URLs without credentials', () => {
  assert.equal(isAllowedLocalInstanceUrl('http://127.0.0.1:32080/'), true);
  assert.equal(isAllowedLocalInstanceUrl('http://localhost:8880/'), true);
  assert.equal(isAllowedLocalInstanceUrl('https://[::1]:8880/'), true);
  assert.equal(isAllowedLocalInstanceUrl('https://example.com/'), false);
  assert.equal(isAllowedLocalInstanceUrl('http://user:pass@127.0.0.1:32080/'), false);
  assert.equal(isAllowedLocalInstanceUrl('file:///tmp/index.html'), false);
});

test('remote URLs allow normal HTTP URLs without credentials', () => {
  assert.equal(isAllowedRemoteInstanceUrl('https://example.com/a0'), true);
  assert.equal(isAllowedRemoteInstanceUrl('http://agent-zero.example.test/'), true);
  assert.equal(isAllowedRemoteInstanceUrl('https://token@example.com/'), false);
  assert.equal(isAllowedRemoteInstanceUrl('ftp://example.com/'), false);
});

test('normalizeHttpUrl canonicalizes valid HTTP URLs and rejects invalid values', () => {
  assert.equal(normalizeHttpUrl(' http://127.0.0.1:32080 '), 'http://127.0.0.1:32080/');
  assert.equal(normalizeHttpUrl('not a url'), '');
  assert.equal(normalizeHttpUrl('file:///tmp/nope'), '');
});

test('makeTabKey includes target identity and normalized URL', () => {
  assert.equal(
    makeTabKey({ kind: 'local', containerId: 'abc123', url: 'http://127.0.0.1:32080/' }),
    'local:abc123:http://127.0.0.1:32080/'
  );
  assert.equal(
    makeTabKey({ kind: 'remote', instanceId: 'remote-1', url: 'https://example.com/' }),
    'remote:remote-1:https://example.com/'
  );
});

test('makeTabsSnapshot exposes only sanitized tab fields', () => {
  const tabs = new Map();
  tabs.set('tab-1', {
    id: 'tab-1',
    key: 'local:abc:http://127.0.0.1:32080/',
    kind: 'local',
    title: 'Agent Zero',
    url: 'http://127.0.0.1:32080/',
    containerId: 'abc',
    loading: false,
    canReload: true,
    view: { secret: true }
  });

  assert.deepEqual(makeTabsSnapshot(tabs, 'tab-1'), {
    tabs: [{
      id: 'tab-1',
      kind: 'local',
      title: 'Agent Zero',
      url: 'http://127.0.0.1:32080/',
      containerId: 'abc',
      instanceId: '',
      active: true,
      loading: false,
      canReload: true
    }],
    activeTabId: 'tab-1'
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
node --test shell/instance_tabs.test.js
```

Expected: FAIL with `Cannot find module './instance_tabs'`.

- [ ] **Step 3: Implement helper module**

Create `shell/instance_tabs.js`:

```javascript
function normalizeHttpUrl(value) {
  try {
    const url = new URL(String(value || '').trim());
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return '';
    if (url.username || url.password) return '';
    return url.toString();
  } catch {
    return '';
  }
}

function isAllowedLocalInstanceUrl(value) {
  const normalized = normalizeHttpUrl(value);
  if (!normalized) return false;
  try {
    const url = new URL(normalized);
    const host = url.hostname;
    if (host !== 'localhost' && host !== '127.0.0.1' && host !== '::1' && host !== '[::1]') return false;
    if (url.port) {
      const port = Number(url.port);
      if (!Number.isFinite(port) || port <= 0 || port > 65535) return false;
    }
    return true;
  } catch {
    return false;
  }
}

function isAllowedRemoteInstanceUrl(value) {
  const normalized = normalizeHttpUrl(value);
  if (!normalized) return false;
  try {
    const url = new URL(normalized);
    return !!url.hostname;
  } catch {
    return false;
  }
}

function makeTabKey(target) {
  const t = target && typeof target === 'object' ? target : {};
  const kind = typeof t.kind === 'string' ? t.kind : '';
  const id = kind === 'remote'
    ? (typeof t.instanceId === 'string' ? t.instanceId : '')
    : (typeof t.containerId === 'string' ? t.containerId : '');
  const url = normalizeHttpUrl(t.url);
  return `${kind}:${id}:${url}`;
}

function publicTab(tab, activeTabId) {
  const t = tab && typeof tab === 'object' ? tab : {};
  const id = typeof t.id === 'string' ? t.id : '';
  const kind = typeof t.kind === 'string' ? t.kind : '';
  const url = normalizeHttpUrl(t.url);
  if (!id || !kind || !url) return null;
  return {
    id,
    kind,
    title: typeof t.title === 'string' && t.title.trim() ? t.title.trim() : 'Agent Zero',
    url,
    containerId: typeof t.containerId === 'string' ? t.containerId : '',
    instanceId: typeof t.instanceId === 'string' ? t.instanceId : '',
    active: id === activeTabId,
    loading: !!t.loading,
    canReload: t.canReload !== false
  };
}

function makeTabsSnapshot(tabs, activeTabId) {
  const out = [];
  for (const tab of tabs instanceof Map ? tabs.values() : []) {
    const sanitized = publicTab(tab, activeTabId);
    if (sanitized) out.push(sanitized);
  }
  return {
    tabs: out,
    activeTabId: typeof activeTabId === 'string' ? activeTabId : ''
  };
}

module.exports = {
  normalizeHttpUrl,
  isAllowedLocalInstanceUrl,
  isAllowedRemoteInstanceUrl,
  makeTabKey,
  makeTabsSnapshot
};
```

- [ ] **Step 4: Run helper tests**

Run:

```bash
node --test shell/instance_tabs.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit helper slice**

```bash
git add shell/instance_tabs.js shell/instance_tabs.test.js
git commit -m "test: cover instance tab helpers"
```

## Task 2: Shell-Owned WebContentsView Tab Registry

**Files:**
- Modify: `shell/main.js`

- [ ] **Step 1: Update Electron imports and helper imports**

In `shell/main.js`, change the Electron import and add helper import:

```javascript
const { app, BrowserWindow, WebContentsView, net, ipcMain, shell, Tray, Menu, nativeImage, protocol } = require('electron');
const {
  normalizeHttpUrl,
  isAllowedLocalInstanceUrl,
  isAllowedRemoteInstanceUrl,
  makeTabKey,
  makeTabsSnapshot
} = require('./instance_tabs');
```

- [ ] **Step 2: Replace duplicated URL validators with helper-backed validators**

Keep existing function names for low-risk call sites:

```javascript
function isAllowedLocalUrl(value) {
  return isAllowedLocalInstanceUrl(value);
}

function isAllowedHttpUrl(value) {
  return isAllowedRemoteInstanceUrl(value);
}
```

- [ ] **Step 3: Add tab registry state near other main-process state**

Place near `lastDockerManagerState`:

```javascript
let instanceTabs = new Map();
let activeInstanceTabId = '';
let instanceTabBounds = null;
let instanceTabSeq = 0;
```

- [ ] **Step 4: Add tab snapshot and event helpers after `sendDockerManagerEvent`**

```javascript
function sendInstanceTabsEvent() {
  sendDockerManagerEvent('docker-manager:instanceTabs', makeTabsSnapshot(instanceTabs, activeInstanceTabId));
}

function getInstanceTabsSnapshot() {
  return makeTabsSnapshot(instanceTabs, activeInstanceTabId);
}

function nextInstanceTabId() {
  instanceTabSeq += 1;
  return `instance-tab-${Date.now()}-${instanceTabSeq}`;
}

function createInstanceWebPreferences() {
  return {
    contextIsolation: true,
    nodeIntegration: false,
    sandbox: true
  };
}
```

- [ ] **Step 5: Add bounds and view visibility helpers**

```javascript
function sanitizeInstanceTabBounds(bounds) {
  if (!isPlainObject(bounds)) return null;
  const x = Math.max(0, Math.floor(Number(bounds.x)));
  const y = Math.max(0, Math.floor(Number(bounds.y)));
  const width = Math.max(0, Math.floor(Number(bounds.width)));
  const height = Math.max(0, Math.floor(Number(bounds.height)));
  if (![x, y, width, height].every(Number.isFinite)) return null;
  if (width < 80 || height < 80) return null;
  return { x, y, width, height };
}

function hideInstanceTabView(tab) {
  if (!tab?.view || tab.view.webContents.isDestroyed()) return;
  tab.view.setBounds({ x: 0, y: 0, width: 0, height: 0 });
}

function applyActiveInstanceTabBounds() {
  for (const tab of instanceTabs.values()) {
    if (!tab || !tab.view || tab.view.webContents.isDestroyed()) continue;
    if (tab.id === activeInstanceTabId && instanceTabBounds) {
      tab.view.setBounds(instanceTabBounds);
    } else {
      hideInstanceTabView(tab);
    }
  }
}
```

- [ ] **Step 6: Add tab cleanup helper**

Use `contentView.removeChildView` when available, then close web contents explicitly:

```javascript
function destroyInstanceTab(tab) {
  if (!tab) return;
  try {
    if (mainWindow?.contentView && tab.view && typeof mainWindow.contentView.removeChildView === 'function') {
      mainWindow.contentView.removeChildView(tab.view);
    }
  } catch {
    // ignore view detach cleanup errors
  }

  try {
    if (tab.view?.webContents && !tab.view.webContents.isDestroyed()) {
      tab.view.webContents.close({ waitForBeforeUnload: false });
    }
  } catch {
    // ignore webContents cleanup errors
  }
}
```

- [ ] **Step 7: Add navigation guard helpers**

```javascript
function isNavigationAllowedForTab(tab, url) {
  const normalized = normalizeHttpUrl(url);
  if (!normalized || !tab?.url) return false;
  try {
    const base = new URL(tab.url);
    const next = new URL(normalized);
    if (next.origin !== base.origin) return false;
    return tab.kind === 'remote'
      ? isAllowedRemoteInstanceUrl(normalized)
      : isAllowedLocalInstanceUrl(normalized);
  } catch {
    return false;
  }
}

function openExternalIfSafe(url) {
  if (!isAllowedRemoteInstanceUrl(url)) return;
  shell.openExternal(normalizeHttpUrl(url)).catch(() => {});
}
```

- [ ] **Step 8: Add target resolution helper**

```javascript
async function resolveInstanceUiTarget(body) {
  if (!isPlainObject(body)) {
    const err = new Error('Invalid request');
    err.code = 'INVALID_INPUT';
    throw err;
  }

  const kind = typeof body.kind === 'string' ? body.kind : '';
  if (kind === 'remote') {
    const instanceId = typeof body.instanceId === 'string' ? body.instanceId : '';
    const remote = await dockerManager.getRemoteInstance(instanceId);
    const url = normalizeHttpUrl(remote?.url);
    if (!isAllowedRemoteInstanceUrl(url)) {
      const err = new Error('Invalid remote instance');
      err.code = 'INVALID_REMOTE_INSTANCE';
      throw err;
    }
    return {
      kind: 'remote',
      instanceId,
      containerId: '',
      title: remote?.name || 'Agent Zero',
      url,
      key: makeTabKey({ kind: 'remote', instanceId, url })
    };
  }

  const containerId = typeof body.containerId === 'string' ? body.containerId : '';
  let url = '';
  if (containerId) {
    url = normalizeHttpUrl(await dockerManager.getContainerUiUrl(containerId));
  } else {
    const state = await dockerManager.refreshDockerManager({ forceRefresh: false });
    url = normalizeHttpUrl(state?.uiUrl);
  }
  if (!isAllowedLocalInstanceUrl(url)) {
    const err = new Error(containerId ? 'Agent Zero UI is not reachable for this instance yet.' : 'Agent Zero UI is not available. Start a version first.');
    err.code = 'UI_UNAVAILABLE';
    throw err;
  }
  return {
    kind: 'local',
    instanceId: '',
    containerId,
    title: 'Agent Zero',
    url,
    key: makeTabKey({ kind: 'local', containerId, url })
  };
}
```

- [ ] **Step 9: Add create/focus/close/reload/detach helpers**

```javascript
function findInstanceTabByKey(key) {
  for (const tab of instanceTabs.values()) {
    if (tab.key === key) return tab;
  }
  return null;
}

function setActiveInstanceTab(id) {
  activeInstanceTabId = instanceTabs.has(id) ? id : '';
  applyActiveInstanceTabBounds();
  sendInstanceTabsEvent();
}

async function openInstanceTab(target) {
  const existing = findInstanceTabByKey(target.key);
  if (existing) {
    setActiveInstanceTab(existing.id);
    return { opened: true, tabId: existing.id, focusedExisting: true };
  }

  if (!mainWindow?.contentView || typeof mainWindow.contentView.addChildView !== 'function') {
    openAgentZeroUiWindow(target.url, target.title);
    return { opened: true, detached: true };
  }

  const id = nextInstanceTabId();
  const view = new WebContentsView({ webPreferences: createInstanceWebPreferences() });
  const tab = {
    id,
    key: target.key,
    kind: target.kind,
    title: target.title || 'Agent Zero',
    url: target.url,
    containerId: target.containerId || '',
    instanceId: target.instanceId || '',
    loading: true,
    canReload: true,
    view
  };

  view.webContents.setWindowOpenHandler((details) => {
    if (isNavigationAllowedForTab(tab, details.url)) {
      return { action: 'allow' };
    }
    openExternalIfSafe(details.url);
    return { action: 'deny' };
  });
  view.webContents.on('will-navigate', (event, nextUrl) => {
    if (!isNavigationAllowedForTab(tab, nextUrl)) {
      event.preventDefault();
      openExternalIfSafe(nextUrl);
    }
  });
  view.webContents.on('did-start-loading', () => {
    tab.loading = true;
    sendInstanceTabsEvent();
  });
  view.webContents.on('did-stop-loading', () => {
    tab.loading = false;
    tab.url = normalizeHttpUrl(view.webContents.getURL()) || tab.url;
    sendInstanceTabsEvent();
  });
  view.webContents.on('page-title-updated', (_event, title) => {
    if (typeof title === 'string' && title.trim()) tab.title = title.trim();
    sendInstanceTabsEvent();
  });
  view.webContents.on('destroyed', () => {
    if (instanceTabs.get(id) === tab) {
      instanceTabs.delete(id);
      if (activeInstanceTabId === id) activeInstanceTabId = instanceTabs.keys().next().value || '';
      sendInstanceTabsEvent();
    }
  });

  instanceTabs.set(id, tab);
  mainWindow.contentView.addChildView(view);
  activeInstanceTabId = id;
  applyActiveInstanceTabBounds();
  sendInstanceTabsEvent();
  await view.webContents.loadURL(target.url);
  return { opened: true, tabId: id };
}

function closeInstanceTab(id) {
  const tab = instanceTabs.get(id);
  if (!tab) return { closed: false };
  instanceTabs.delete(id);
  destroyInstanceTab(tab);
  if (activeInstanceTabId === id) activeInstanceTabId = instanceTabs.keys().next().value || '';
  applyActiveInstanceTabBounds();
  sendInstanceTabsEvent();
  return { closed: true };
}

function reloadInstanceTab(id) {
  const tab = instanceTabs.get(id);
  if (!tab || tab.view.webContents.isDestroyed()) return { reloaded: false };
  tab.view.webContents.reload();
  return { reloaded: true };
}

function detachInstanceTab(id) {
  const tab = instanceTabs.get(id);
  if (!tab) return { detached: false };
  const currentUrl = normalizeHttpUrl(tab.view?.webContents?.getURL?.()) || tab.url;
  openAgentZeroUiWindow(currentUrl, tab.title || 'Agent Zero');
  closeInstanceTab(id);
  return { detached: true };
}
```

- [ ] **Step 10: Add IPC handlers near existing `openUi` handlers**

```javascript
ipcMain.handle('docker-manager:getInstanceTabs', async () => getInstanceTabsSnapshot());

ipcMain.handle('docker-manager:setInstanceTabBounds', async (_event, body) => {
  const bounds = sanitizeInstanceTabBounds(body);
  instanceTabBounds = bounds;
  applyActiveInstanceTabBounds();
  return { updated: !!bounds };
});

ipcMain.handle('docker-manager:openInstanceUi', async (_event, body) => {
  try {
    const target = await resolveInstanceUiTarget(body);
    return await openInstanceTab(target);
  } catch (error) {
    return dockerManager.toErrorResponse(error);
  }
});

ipcMain.handle('docker-manager:selectInstanceTab', async (_event, body) => {
  if (!isPlainObject(body)) return dockerManager.toErrorResponse({ code: 'INVALID_INPUT', message: 'Invalid request' });
  setActiveInstanceTab(typeof body.id === 'string' ? body.id : '');
  return { selected: !!activeInstanceTabId };
});

ipcMain.handle('docker-manager:closeInstanceTab', async (_event, body) => {
  if (!isPlainObject(body)) return dockerManager.toErrorResponse({ code: 'INVALID_INPUT', message: 'Invalid request' });
  return closeInstanceTab(typeof body.id === 'string' ? body.id : '');
});

ipcMain.handle('docker-manager:reloadInstanceTab', async (_event, body) => {
  if (!isPlainObject(body)) return dockerManager.toErrorResponse({ code: 'INVALID_INPUT', message: 'Invalid request' });
  return reloadInstanceTab(typeof body.id === 'string' ? body.id : '');
});

ipcMain.handle('docker-manager:detachInstanceTab', async (_event, body) => {
  if (!isPlainObject(body)) return dockerManager.toErrorResponse({ code: 'INVALID_INPUT', message: 'Invalid request' });
  return detachInstanceTab(typeof body.id === 'string' ? body.id : '');
});
```

- [ ] **Step 11: Route legacy open handlers through the tab path**

Replace the bodies of `docker-manager:openUi`, `docker-manager:openContainerUi`, and `docker-manager:openRemoteInstance` so they call `openInstanceTab(await resolveInstanceUiTarget(...))` and keep their existing error messages. `openRemoteInstance` should pass `{ kind: 'remote', instanceId: id }`; local active should pass `{ kind: 'local' }`; local container should pass `{ kind: 'local', containerId }`.

- [ ] **Step 12: Clean up views on main window close**

Inside the existing main window close/closed lifecycle, add:

```javascript
for (const tab of instanceTabs.values()) destroyInstanceTab(tab);
instanceTabs = new Map();
activeInstanceTabId = '';
instanceTabBounds = null;
```

- [ ] **Step 13: Run shell checks**

Run:

```bash
node --check shell/main.js
node --test shell/instance_tabs.test.js
```

Expected: both pass.

- [ ] **Step 14: Commit shell tab registry**

```bash
git add shell/main.js shell/instance_tabs.js shell/instance_tabs.test.js
git commit -m "feat: add shell instance tab registry"
```

## Task 3: Preload Instance Tab API

**Files:**
- Modify: `shell/preload.js`

- [ ] **Step 1: Add named preload wrappers**

Add these methods to `dockerManagerAPI`:

```javascript
getInstanceTabs: () => ipcRenderer.invoke('docker-manager:getInstanceTabs'),
openInstanceUi: (target) => {
  const t = target && typeof target === 'object' ? target : {};
  return ipcRenderer.invoke('docker-manager:openInstanceUi', {
    kind: typeof t.kind === 'string' ? t.kind : '',
    containerId: typeof t.containerId === 'string' ? t.containerId : '',
    instanceId: typeof t.instanceId === 'string' ? t.instanceId : ''
  });
},
selectInstanceTab: (id) => ipcRenderer.invoke('docker-manager:selectInstanceTab', { id }),
closeInstanceTab: (id) => ipcRenderer.invoke('docker-manager:closeInstanceTab', { id }),
reloadInstanceTab: (id) => ipcRenderer.invoke('docker-manager:reloadInstanceTab', { id }),
detachInstanceTab: (id) => ipcRenderer.invoke('docker-manager:detachInstanceTab', { id }),
setInstanceTabBounds: (bounds) => {
  const b = bounds && typeof bounds === 'object' ? bounds : {};
  return ipcRenderer.invoke('docker-manager:setInstanceTabBounds', {
    x: b.x,
    y: b.y,
    width: b.width,
    height: b.height
  });
},
onInstanceTabsChange: (callback) => {
  if (typeof callback !== 'function') return () => {};
  const listener = (_event, snapshot) => callback(snapshot);
  ipcRenderer.on('docker-manager:instanceTabs', listener);
  return () => ipcRenderer.removeListener('docker-manager:instanceTabs', listener);
},
```

- [ ] **Step 2: Keep existing APIs**

Do not remove `openUi`, `openContainerUi`, or `openRemoteInstance` from preload yet. They remain compatibility wrappers while renderer code migrates.

- [ ] **Step 3: Run preload check**

Run:

```bash
node --check shell/preload.js
```

Expected: PASS.

- [ ] **Step 4: Commit preload API**

```bash
git add shell/preload.js
git commit -m "feat: expose instance tab IPC"
```

## Task 4: Renderer State, Actions, And Bounds Sync

**Files:**
- Modify: `app/components/docker-manager/docker-manager-store.js`
- Modify: `app/docker_manager.js`

- [ ] **Step 1: Add store state**

In `docker-manager-store.js`, add:

```javascript
instanceTabs: { tabs: [], activeTabId: "" },
```

- [ ] **Step 2: Include instance tabs in renderer snapshots**

In `snapshot()` in `app/docker_manager.js`, add:

```javascript
instanceTabs: store.instanceTabs || { tabs: [], activeTabId: "" },
```

- [ ] **Step 3: Add instance tab event emitter**

Add after `emitState()`:

```javascript
function emitInstanceTabs() {
  const next = store.instanceTabs || { tabs: [], activeTabId: "" };
  window.__dmLastInstanceTabs = next;
  window.dispatchEvent(new CustomEvent("dm:instance-tabs", { detail: next }));
}

function applyInstanceTabsSnapshot(snapshot) {
  const tabs = Array.isArray(snapshot?.tabs) ? snapshot.tabs : [];
  store.instanceTabs = {
    tabs,
    activeTabId: typeof snapshot?.activeTabId === "string" ? snapshot.activeTabId : ""
  };
  emitInstanceTabs();
  emitState();
}
```

- [ ] **Step 4: Add instance tab actions**

Add these functions near `openUi`:

```javascript
async function openInstanceUi(target = {}) {
  const api = window.dockerManagerAPI;
  if (!api || typeof api.openInstanceUi !== "function") return;
  try {
    const payload = target && typeof target === "object" ? target : {};
    const res = await api.openInstanceUi(payload);
    if (isErrorResponse(res)) setBanner("error", res.message);
    else if (res?.opened) window.toastFrontendInfo?.("Instance UI opened.", "Agent Zero", 2, "dm-open-ui");
  } catch (e) {
    setBanner("error", e?.message || "Unable to open UI");
  }
}

async function selectInstanceTab(id) {
  await window.dockerManagerAPI?.selectInstanceTab?.(id);
}

async function closeInstanceTab(id) {
  await window.dockerManagerAPI?.closeInstanceTab?.(id);
}

async function reloadInstanceTab(id) {
  await window.dockerManagerAPI?.reloadInstanceTab?.(id);
}

async function detachInstanceTab(id) {
  await window.dockerManagerAPI?.detachInstanceTab?.(id);
}
```

- [ ] **Step 5: Make legacy actions use new tab action**

Update `openUi(containerId = "")`:

```javascript
async function openUi(containerId = "") {
  return openInstanceUi({ kind: "local", containerId: containerId || "" });
}
```

Update `openRemoteInstance(id)`:

```javascript
async function openRemoteInstance(id) {
  return openInstanceUi({ kind: "remote", instanceId: id || "" });
}
```

- [ ] **Step 6: Add actions to `window.dockerManagerActions`**

Add:

```javascript
openInstanceUi,
selectInstanceTab,
closeInstanceTab,
reloadInstanceTab,
detachInstanceTab,
syncInstanceTabBounds,
```

- [ ] **Step 7: Add viewport bounds sync**

Add before `initSubscriptions()`:

```javascript
let instanceTabBoundsTimer = 0;

function readInstanceTabViewportBounds() {
  const el = document.getElementById("dmInstanceTabViewport");
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  return {
    x: Math.round(rect.left),
    y: Math.round(rect.top),
    width: Math.round(rect.width),
    height: Math.round(rect.height)
  };
}

function syncInstanceTabBounds() {
  window.clearTimeout(instanceTabBoundsTimer);
  instanceTabBoundsTimer = window.setTimeout(() => {
    const bounds = readInstanceTabViewportBounds();
    if (bounds) window.dockerManagerAPI?.setInstanceTabBounds?.(bounds);
  }, 40);
}

function initInstanceTabBoundsObserver() {
  const el = document.getElementById("dmInstanceTabViewport");
  if (!el) return;
  syncInstanceTabBounds();
  window.addEventListener("resize", syncInstanceTabBounds);
  if (typeof ResizeObserver === "function") {
    const observer = new ResizeObserver(syncInstanceTabBounds);
    observer.observe(el);
  }
}
```

- [ ] **Step 8: Subscribe to shell tab state**

In `initSubscriptions()`, add:

```javascript
if (typeof api.onInstanceTabsChange === "function") {
  api.onInstanceTabsChange((tabsSnapshot) => {
    applyInstanceTabsSnapshot(tabsSnapshot);
  });
}
```

In `DOMContentLoaded`, after `initSubscriptions()`:

```javascript
initInstanceTabBoundsObserver();
if (typeof window.dockerManagerAPI?.getInstanceTabs === "function") {
  const tabsSnapshot = await window.dockerManagerAPI.getInstanceTabs();
  if (!isErrorResponse(tabsSnapshot)) applyInstanceTabsSnapshot(tabsSnapshot);
}
```

- [ ] **Step 9: Run renderer checks**

Run:

```bash
node --check app/docker_manager.js
```

Expected: PASS.

- [ ] **Step 10: Commit renderer state/actions**

```bash
git add app/docker_manager.js app/components/docker-manager/docker-manager-store.js
git commit -m "feat: wire renderer instance tab actions"
```

## Task 5: Visible Instance Tabs Component

**Files:**
- Create: `app/components/docker-manager/instance-tabs/index.html`
- Create: `app/components/docker-manager/instance-tabs/instance-tabs.js`
- Modify: `app/index.html`
- Modify: `app/docker_manager.css`
- Modify: `app/components/docker-manager/local-testing/local-testing.js`

- [ ] **Step 1: Create component HTML**

Create `app/components/docker-manager/instance-tabs/index.html`:

```html
<body>
  <section class="dm-instance-tabs" aria-label="Instance UI tabs">
    <div id="dmInstanceTabStrip" class="dm-instance-tab-strip"></div>
    <div id="dmInstanceTabViewport" class="dm-instance-tab-viewport">
      <div id="dmInstanceTabEmpty" class="dm-instance-tab-empty">
        <span class="material-symbols-outlined" aria-hidden="true">tab</span>
        <span>Open an instance UI to keep it here.</span>
      </div>
    </div>
  </section>
  <script type="module" src="components/docker-manager/instance-tabs/instance-tabs.js"></script>
</body>
```

- [ ] **Step 2: Create component script**

Create `app/components/docker-manager/instance-tabs/instance-tabs.js`:

```javascript
function byId(id) {
  return document.getElementById(id);
}

function activeTab(snapshot) {
  const tabs = Array.isArray(snapshot?.tabs) ? snapshot.tabs : [];
  return tabs.find((tab) => tab?.active) || tabs.find((tab) => tab?.id === snapshot?.activeTabId) || null;
}

function render(snapshot = window.__dmLastInstanceTabs || { tabs: [], activeTabId: "" }) {
  const strip = byId("dmInstanceTabStrip");
  const empty = byId("dmInstanceTabEmpty");
  const viewport = byId("dmInstanceTabViewport");
  if (!strip || !viewport) return;

  const tabs = Array.isArray(snapshot?.tabs) ? snapshot.tabs : [];
  const selected = activeTab(snapshot);
  strip.innerHTML = "";

  if (!tabs.length) {
    strip.classList.add("hidden");
    viewport.classList.remove("has-tab");
    if (empty) empty.classList.remove("hidden");
    window.dockerManagerActions?.syncInstanceTabBounds?.();
    return;
  }

  strip.classList.remove("hidden");
  viewport.classList.add("has-tab");
  if (empty) empty.classList.add("hidden");

  for (const tab of tabs) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `dm-instance-tab${tab?.id === selected?.id ? " active" : ""}`;
    button.title = tab?.url || "Agent Zero";
    button.addEventListener("click", () => window.dockerManagerActions?.selectInstanceTab?.(tab.id));

    const icon = document.createElement("span");
    icon.className = "material-symbols-outlined";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = tab?.loading ? "progress_activity" : "language";

    const label = document.createElement("span");
    label.className = "dm-instance-tab-title";
    label.textContent = tab?.title || "Agent Zero";

    const close = document.createElement("span");
    close.className = "material-symbols-outlined dm-instance-tab-close";
    close.setAttribute("aria-hidden", "true");
    close.textContent = "close";
    close.addEventListener("click", (event) => {
      event.stopPropagation();
      window.dockerManagerActions?.closeInstanceTab?.(tab.id);
    });

    button.appendChild(icon);
    button.appendChild(label);
    button.appendChild(close);
    strip.appendChild(button);
  }

  const controls = document.createElement("div");
  controls.className = "dm-instance-tab-controls";

  const reload = document.createElement("button");
  reload.type = "button";
  reload.className = "button icon-button dm-icon-button";
  reload.title = "Reload";
  reload.setAttribute("aria-label", "Reload active instance UI");
  reload.disabled = !selected;
  reload.innerHTML = '<span class="material-symbols-outlined" aria-hidden="true">refresh</span>';
  reload.addEventListener("click", () => window.dockerManagerActions?.reloadInstanceTab?.(selected?.id || ""));

  const detach = document.createElement("button");
  detach.type = "button";
  detach.className = "button icon-button dm-icon-button";
  detach.title = "Detach";
  detach.setAttribute("aria-label", "Detach active instance UI");
  detach.disabled = !selected;
  detach.innerHTML = '<span class="material-symbols-outlined" aria-hidden="true">open_in_new</span>';
  detach.addEventListener("click", () => window.dockerManagerActions?.detachInstanceTab?.(selected?.id || ""));

  controls.appendChild(reload);
  controls.appendChild(detach);
  strip.appendChild(controls);
  window.dockerManagerActions?.syncInstanceTabBounds?.();
}

window.addEventListener("dm:instance-tabs", (event) => render(event.detail));

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => render());
} else {
  render();
}
```

- [ ] **Step 3: Mount component in `app/index.html`**

Add after the `.dm-header` block and before `.dm-layout`:

```html
<x-component path="components/docker-manager/instance-tabs/index.html"></x-component>
```

- [ ] **Step 4: Add CSS**

Add to `app/docker_manager.css` before terminal dock styles:

```css
.dm-instance-tabs {
  display: flex;
  flex-direction: column;
  gap: 0;
  min-height: 18rem;
}

.dm-instance-tab-strip {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  min-height: 2.5rem;
  border-bottom: 1px solid var(--dm-line-soft);
  overflow-x: auto;
  padding-bottom: 0.35rem;
}

.dm-instance-tab {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  max-width: 15rem;
  min-width: 8rem;
  min-height: 2.1rem;
  border: 1px solid var(--dm-line-soft);
  border-radius: 0.45rem 0.45rem 0 0;
  background: var(--dm-surface);
  color: var(--color-text-muted);
  cursor: pointer;
  font-family: "Rubik", Arial, Helvetica, sans-serif;
  font-size: 0.82rem;
  padding: 0.35rem 0.45rem;
}

.dm-instance-tab.active {
  background: var(--dm-surface-strong);
  color: var(--color-text);
  border-color: var(--color-highlight);
}

.dm-instance-tab-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dm-instance-tab-close {
  margin-left: auto;
  font-size: 1rem;
}

.dm-instance-tab-controls {
  display: inline-flex;
  gap: 0.25rem;
  margin-left: auto;
  position: sticky;
  right: 0;
  background: var(--color-background);
  padding-left: 0.35rem;
}

.dm-instance-tab-viewport {
  position: relative;
  min-height: clamp(20rem, 52vh, 44rem);
  border: 1px solid var(--dm-line-soft);
  border-top: 0;
  background: color-mix(in srgb, var(--color-panel) 65%, transparent);
}

.dm-instance-tab-viewport.has-tab {
  background: #000;
}

.dm-instance-tab-empty {
  min-height: clamp(20rem, 52vh, 44rem);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  color: var(--color-text-muted);
  font-size: 0.9rem;
}

@media (max-width: 760px) {
  .dm-instance-tabs {
    min-height: 14rem;
  }

  .dm-instance-tab {
    min-width: 6.5rem;
    max-width: 11rem;
  }
}
```

- [ ] **Step 5: Route local and remote card buttons through `openInstanceUi`**

In `local-testing.js`, change local button click to:

```javascript
openBtn.addEventListener("click", () => {
  window.dockerManagerActions?.openInstanceUi?.({ kind: "local", containerId: c?.containerId || "" });
});
```

Change remote button click to:

```javascript
openBtn.addEventListener("click", () => {
  window.dockerManagerActions?.openInstanceUi?.({ kind: "remote", instanceId: remote?.id || "" });
});
```

- [ ] **Step 6: Run renderer component checks**

Run:

```bash
node --check app/docker_manager.js
node --check app/components/docker-manager/instance-tabs/instance-tabs.js
node --check app/components/docker-manager/local-testing/local-testing.js
```

Expected: all pass.

- [ ] **Step 7: Commit visible component**

```bash
git add app/index.html app/docker_manager.css app/docker_manager.js app/components/docker-manager/docker-manager-store.js app/components/docker-manager/instance-tabs app/components/docker-manager/local-testing/local-testing.js
git commit -m "feat: add instance UI tab surface"
```

## Task 6: Live Refresh After Operations

**Files:**
- Modify: `app/docker_manager.js`

- [ ] **Step 1: Add post-operation refresh scheduler**

Add near `runDockerOperation`:

```javascript
let postOperationRefreshTimer = 0;

function schedulePostOperationRefresh() {
  window.clearTimeout(postOperationRefreshTimer);
  postOperationRefreshTimer = window.setTimeout(() => {
    refresh();
  }, 350);
}
```

- [ ] **Step 2: Trigger it from progress subscription**

In `initSubscriptions()`, inside `api.onProgress` callback after `emitState()`:

```javascript
const status = typeof progress?.status === "string" ? progress.status : "";
if (status === "completed" || status === "failed" || status === "canceled") {
  schedulePostOperationRefresh();
}
```

- [ ] **Step 3: Avoid duplicate user-facing toasts**

Do not add any toast in `schedulePostOperationRefresh()`. Existing operation initiation toasts remain enough.

- [ ] **Step 4: Run renderer check**

Run:

```bash
node --check app/docker_manager.js
```

Expected: PASS.

- [ ] **Step 5: Commit live refresh**

```bash
git add app/docker_manager.js
git commit -m "fix: refresh instances after operations complete"
```

## Task 7: Documentation Updates

**Files:**
- Modify: `shell/AGENTS.md`
- Modify: `app/AGENTS.md`
- Modify: `app/components/docker-manager/AGENTS.md`
- Modify: `docs/release-todos.md`

- [ ] **Step 1: Document shell tab contract**

In `shell/AGENTS.md`, add to Electron Security Contracts:

```markdown
- Instance UI tabs are shell-owned `WebContentsView`s. Renderer code may request
  open/select/close/reload/detach and report viewport bounds, but URL
  resolution, URL validation, web contents lifecycle, and detached windows stay
  in `shell/main.js`.
```

Add to Testing:

```bash
node --test shell/instance_tabs.test.js
```

- [ ] **Step 2: Document renderer tab ownership**

In `app/AGENTS.md`, add to Renderer Contracts:

```markdown
- Instance tab chrome is renderer-owned, but embedded Agent Zero pages are not.
  The renderer computes the tab viewport bounds and sends them through preload;
  the shell owns the `WebContentsView` attached to that rectangle.
```

- [ ] **Step 3: Document component ownership**

In `app/components/docker-manager/AGENTS.md`, add to Ownership:

```markdown
- `instance-tabs/`: browser-style tab chrome, active-tab controls, empty state,
  and viewport bounds reporting for shell-owned Agent Zero UI views.
```

Add to Feature Contracts:

```markdown
- `Open UI` opens local and remote instances in a launcher tab by default.
  Reopening the same target focuses the existing tab. Detach moves the target
  into a standalone secure Electron window without stopping the instance.
```

- [ ] **Step 4: Document release validation**

In `docs/release-todos.md`, add to Next Release:

```markdown
- Validate instance tabs on macOS via cloud runner or manual macOS test:
  - local `Open UI` opens a launcher tab
  - opening the same instance focuses the existing tab
  - detach opens a standalone window
  - closing the detached window does not stop the instance
```

- [ ] **Step 5: Run docs check**

Run:

```bash
git diff --check
```

Expected: PASS.

- [ ] **Step 6: Commit docs**

```bash
git add shell/AGENTS.md app/AGENTS.md app/components/docker-manager/AGENTS.md docs/release-todos.md
git commit -m "docs: document instance tab contracts"
```

## Task 8: Full Verification And CodeRabbit Review

**Files:**
- Review all changed files.

- [ ] **Step 1: Run static verification**

Run:

```bash
node --test shell/instance_tabs.test.js
node --check shell/main.js
node --check shell/preload.js
node --check shell/docker_manager/index.js
node --check app/docker_manager.js
node --check app/components/docker-manager/instance-tabs/instance-tabs.js
node --check app/components/docker-manager/local-testing/local-testing.js
git diff --check
```

Expected: all pass.

- [ ] **Step 2: Run local launcher smoke test**

Run:

```bash
A0_LAUNCHER_LOCAL_REPO=/Users/lazy/Projects/a0-launcher npm start
```

Expected manual results:

- Launcher opens with no Electron security warning from this change.
- Instances tab still renders.
- `Open UI` for a running local instance opens an in-launcher tab.
- Clicking `Open UI` again focuses the existing tab.
- Reload refreshes the active tab.
- Detach opens a standalone Agent Zero window and removes the tab.
- A saved remote instance opens in a tab.
- Activation completion updates Instances without pressing refresh.

- [ ] **Step 3: Run CodeRabbit once**

Run:

```bash
coderabbit --prompt-only -t uncommitted
```

Expected: review returns no blocking issues. Address any concrete correctness/security findings, then rerun static verification. Do not run CodeRabbit more than three total times.

- [ ] **Step 4: Inspect final status**

Run:

```bash
git status --short --branch
git log --oneline -8
```

Expected: only intentional files are modified or committed. Pre-existing untracked `.agents/` and `skills-lock.json` remain unstaged unless the user explicitly asks otherwise.

- [ ] **Step 5: Commit final fixes if needed**

If verification or CodeRabbit produced fixes:

```bash
git add shell/main.js shell/preload.js shell/instance_tabs.js shell/instance_tabs.test.js app/index.html app/docker_manager.js app/docker_manager.css app/components/docker-manager/docker-manager-store.js app/components/docker-manager/instance-tabs/index.html app/components/docker-manager/instance-tabs/instance-tabs.js app/components/docker-manager/local-testing/local-testing.js shell/AGENTS.md app/AGENTS.md app/components/docker-manager/AGENTS.md docs/release-todos.md
git commit -m "fix: harden instance tab behavior"
```

If no fixes were needed, do not create an empty commit.

## Self-Review

- Spec coverage: Tasks 2-5 implement local and remote tabs, dedupe, reload, close, and detach. Task 6 implements live Instances refresh. Task 7 covers AGENTS and release validation docs. Task 8 covers static, manual, and CodeRabbit verification.
- Placeholder scan: no red-flag placeholder terms or open-ended implementation steps remain.
- Type consistency: tab ids use `id`; remote identity uses `instanceId`; local identity uses `containerId`; tab snapshots use `{ tabs, activeTabId }` consistently across shell, preload, renderer store, and component.
