# A0 Launcher - AGENTS.md

> Handoff document for AI coding agents working on this repo.
> Last updated: 2026-02-12.

## Quick Reference

- **Tech Stack**: JavaScript (CommonJS shell, ES modules content) | Electron 33.x (Forge 7.6.x) | Node.js 20+ | Alpine.js | GitHub Actions
- **Key dependencies**: `electron@^33.2.0`, `dockerode@^4.0.9`, `semver@^7.7.3`, `electron-squirrel-startup@^1.0.1`
- **Dev Run**: `npm start` (GUI required)
- **Local Content**: `A0_LAUNCHER_USE_LOCAL_CONTENT=1 npm start`
- **Build**: `npm run make` (or `npm run make:<os>`)
- **Syntax check**: `node --check shell/main.js`
- **No test runner**: there is no `npm test` yet. Use `node --check` for syntax validation.
- **Governance**: `.specify/memory/constitution.md`

---

## Table of Contents

1. [Architecture](#architecture)
2. [Project Structure](#project-structure)
3. [Naming Conventions](#naming-conventions)
4. [Shell Layer Detail](#shell-layer-detail)
5. [Content Layer Detail](#content-layer-detail)
6. [IPC Contract](#ipc-contract)
7. [A0 UI Core](#a0-ui-core)
8. [Docker Manager (Feature Layer)](#docker-manager-feature-layer)
9. [Custom Protocol](#custom-protocol)
10. [Content Bundling and Delivery](#content-bundling-and-delivery)
11. [Development Workflow](#development-workflow)
12. [Safety and Permissions](#safety-and-permissions)
13. [Code Style](#code-style)
14. [Git Workflow and CI](#git-workflow-and-ci)
15. [Troubleshooting](#troubleshooting)
16. [Current State and Next Steps](#current-state-and-next-steps)

---

## Architecture

```text
┌──────────────────────────────────────────────────────────┐
│  Shell  (Electron main process — CommonJS)               │
│  shell/main.js                                           │
│  shell/preload.js                                        │
│                                                          │
│  ┌──────────────────────┐  ┌───────────────────────────┐ │
│  │ docker_adapter/      │  │ docker_manager/            │ │
│  │ Low-level Docker     │  │ Feature orchestration      │ │
│  │ client (dockerode)   │  │ (state, ops, volumes, IPC) │ │
│  │                      │  │                            │ │
│  │ DockerInterface.mjs  │  │ index.js (exports)         │ │
│  │ impl/                │  │ state_store.js             │ │
│  │   DockerodeDocker    │  │ releases_client.js         │ │
│  │   DockerHubRegistry  │  │ retention.js               │ │
│  │   DockerodeLogProc.  │  │ errors.js                  │ │
│  └──────────────────────┘  └───────────────────────────┘ │
│                                                          │
│  a0app:// protocol handler (serves app/ from disk)       │
│  System tray · Window management · GitHub Releases DL    │
└──────────────┬───────────────────────────────────────────┘
               │  IPC channels: docker-manager:*
               │  Push events:  docker-manager:state
               │                docker-manager:progress
┌──────────────▼───────────────────────────────────────────┐
│  Content  (app/ — ES modules, served via a0app://)       │
│                                                          │
│  index.html          Page shell + <x-component> refs     │
│  docker_manager.js   Thin orchestrator (store + events)  │
│  docker_manager.css  A0-token layout styles              │
│                                                          │
│  ┌─────────────────┐  ┌───────────────────────────────┐  │
│  │ a0ui/           │  │ components/docker-manager/    │  │
│  │ A0 UI Core      │  │                               │  │
│  │ (vanilla Agent  │  │ docker-manager-store.js       │  │
│  │  Zero v0.9.8)   │  │                               │  │
│  │                 │  │ status-header/                │  │
│  │ index.css       │  │   index.html + .js            │  │
│  │ css/            │  │ onboarding/                   │  │
│  │ js/             │  │   index.html + .js            │  │
│  │ vendor/         │  │ official-versions/            │  │
│  │   alpine/       │  │   index.html + .js            │  │
│  │   ace-min/      │  │ local-testing/                │  │
│  │   ace/          │  │   index.html + .js            │  │
│  │   google/       │  │ retained-instances/           │  │
│  └─────────────────┘  │   index.html + .js            │  │
│                       │ storage-summary/              │  │
│                       │   index.html + .js            │  │
│                       │ help/                         │  │
│                       │   index.html                  │  │
│                       └───────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

### Key design decisions

- **Shell vs Content separation**: the built executable does NOT include `app/` files. Content is downloaded from GitHub Releases at runtime (`content.json`).
- **Custom protocol**: `a0app://` replaces `file://` so `fetch()` and module imports work correctly.
- **A0 UI Core is vanilla**: `app/a0ui/` contains unmodified copies from Agent Zero v0.9.8 (except local font bundling). It is intended to become a shared git submodule.
- **Component architecture**: each Docker manager section is a folder under `app/components/docker-manager/` with co-located `index.html` + JS controller. No separate CSS files — custom styles go in `<style>` tags within the HTML.
- **Alpine store per feature**: `docker-manager-store.js` holds shared reactive state. Section JS files listen for `dm:state` custom events and render imperatively.
- **Docker adapter vs manager**: `shell/docker_adapter/` is the reusable low-level client; `shell/docker_manager/` is the launcher-specific business/feature layer.

---

## Project Structure

```text
a0-launcher/
├── AGENTS.md                          # You are here
├── README.md                          # Human-facing overview
├── package.json                       # npm scripts + dependencies
├── forge.config.js                    # Electron Forge (makers, signing)
│
├── app/                               # Content layer (bundled by CI, served via a0app://)
│   ├── index.html                     # Page shell with <x-component> tags
│   ├── docker_manager.js              # Thin orchestrator (store init, refresh, events)
│   ├── docker_manager.css             # Layout styles using A0 CSS tokens
│   ├── a0ui/                          # A0 UI Core (vanilla Agent Zero framework)
│   │   ├── index.css                  # Theme (local @font-face)
│   │   ├── css/                       # buttons.css, modals.css
│   │   ├── js/                        # initFw.js, components.js, modals.js, AlpineStore.js, ...
│   │   └── vendor/                    # alpine/, ace-min/, ace/, google/ (fonts + icons)
│   └── components/
│       └── docker-manager/            # Launcher Docker manager sections
│           ├── docker-manager-store.js    # Shared Alpine store
│           ├── status-header/         # Header + banner + progress
│           ├── onboarding/            # Docker detection + install CTA
│           ├── official-versions/     # Image listing
│           ├── local-testing/         # Container listing
│           ├── retained-instances/    # Volume management
│           ├── storage-summary/       # Counts summary
│           └── help/                  # Help text
│
├── shell/                             # Shell layer (packaged into executable)
│   ├── main.js                        # Electron main process
│   ├── preload.js                     # contextBridge (renderer API surface)
│   ├── loading.html                   # Loading screen
│   ├── assets/                        # Icons + mac entitlements
│   ├── docker_adapter/                # Low-level Docker client
│   │   ├── DockerInterface.mjs        # Abstract interface + singleton + env detection
│   │   ├── getDocker.js               # CJS bridge to ESM DockerInterface
│   │   ├── LOG_PROCESSOR.md           # Log processor documentation
│   │   └── impl/
│   │       ├── DockerodeDocker.mjs    # Dockerode implementation
│   │       ├── DockerHubRegistry.mjs  # Docker Hub API client
│   │       └── DockerodeLogProcessor.mjs  # Container log streaming
│   └── docker_manager/               # Feature/business orchestration
│       ├── index.js                   # Main exports (state, operations, volumes)
│       ├── state_store.js             # Persistent state (userData/docker_manager/)
│       ├── releases_client.js         # GitHub Releases catalog
│       ├── retention.js               # Container retention policy
│       └── errors.js                  # Error normalization
│
├── scripts/
│   ├── write-build-info.js            # Generates shell/build-info.json
│   └── bootstrap-macos.sh            # Ephemeral macOS bootstrap
│
├── .github/workflows/
│   ├── bundle-content.yml             # Bundles app/ -> content.json
│   └── build.yml                      # Builds executables
│
├── docs/
│   ├── running-ui.md                  # Detailed architecture + dev workflow
│   └── faq-integration.md            # Integration FAQ + naming conventions
│
├── specs/                             # SpecKit feature specs
└── .specify/                          # SpecKit memory/templates
```

---

## Naming Conventions

| Layer             | Convention                    | Examples                             |
|-------------------|-------------------------------|--------------------------------------|
| Alpine stores     | `*-store.js`                  | `docker-manager-store.js`            |
| Component folders | section name as folder        | `onboarding/`, `status-header/`      |
| Component entry   | `index.html` per folder       | `onboarding/index.html`              |
| Component JS      | section name `.js`            | `onboarding.js`, `status-header.js`  |
| Custom CSS        | `<style>` tag in HTML         | (no separate `.css` per component)   |
| IPC channels      | `docker-manager:` prefix      | `docker-manager:getState`            |
| Preload API       | `window.dockerManagerAPI`     |                                      |
| App actions       | `window.dockerManagerActions` |                                      |
| Custom events     | `dm:state`                    |                                      |
| Shell modules     | snake_case folders            | `docker_adapter/`, `docker_manager/` |

---

## Shell Layer Detail

### `shell/main.js`

The Electron main process. Responsibilities:

- Window management (BrowserWindow, tray, quit behavior)
- GitHub Releases content downloading + caching
- `a0app://` protocol registration
- IPC handler registration for all `docker-manager:*` channels
- Docker Desktop installer download (Windows/macOS)

### `shell/preload.js`

Exposes two API surfaces to the renderer via `contextBridge`:

- `window.electronAPI` -- app version, content version, shell icon, status/error events
- `window.dockerManagerAPI` -- all Docker management operations + subscriptions

### `shell/docker_adapter/`

Low-level Docker client layer. Wraps `dockerode` behind an abstract `DockerInterface`:

- **`DockerInterface.mjs`**: abstract base with singleton factory (`DockerInterface.get()`), environment detection, host parsing
- **`DockerodeDocker.mjs`**: concrete implementation (images, containers, volumes, pulls, logs)
- **`DockerHubRegistry.mjs`**: Docker Hub v2 API (tags, digests, layer sizes)
- **`DockerodeLogProcessor.mjs`**: container log streaming with TTY/mux detection, backpressure, abort

### `shell/docker_manager/`

Feature/business layer (launcher-specific orchestration):

- **`index.js`**: main module exports — state building, refresh, install/sync, start/stop, update, activate, rollback, retention, volumes, inventory
- **`state_store.js`**: persistent JSON state in `userData/docker_manager/`
- **`releases_client.js`**: GitHub Releases catalog with offline fallback
- **`retention.js`**: container retention policy enforcement
- **`errors.js`**: error normalization for IPC responses

---

## Content Layer Detail

### `app/index.html`

Page shell that loads:

1. A0 UI Core (CSS + JS from `a0ui/`)
2. Docker manager styles (`docker_manager.css`)
3. Framework init (`a0ui/js/initFw.js` — loads Alpine, registers directives)
4. Section components via `<x-component path="components/docker-manager/...">` tags
5. Orchestrator module (`docker_manager.js`)

### `app/docker_manager.js`

Thin module orchestrator (~225 lines). It:

- Imports the shared Alpine store (`docker-manager-store.js`)
- Loads app/content metadata and header logo
- Calls `dockerManagerAPI.getInventory()` + `dockerManagerAPI.getState()` on boot
- Populates the store and emits `dm:state` custom events
- Exposes `window.dockerManagerActions` (refresh, openUi, openHomepage, removeVolume, pruneVolumes, openDockerDownload)
- Subscribes to push events (`docker-manager:state`, `docker-manager:progress`)

### `app/docker_manager.css`

Layout styles using A0 CSS custom properties (`var(--color-*)`, `var(--color-border)`, etc.). All classes use the `sv-` prefix (legacy — can be renamed to `dm-` in a future pass).

### Section folders (`app/components/docker-manager/`)

Each section has:

- `index.html` — markup loaded by `<x-component>`, includes a `<script type="module">` tag pointing to the co-located JS
- `*.js` — imperative controller that listens for `dm:state` events and renders into the section's DOM by ID

Current sections:

| Folder                | Purpose                                                                        |
|-----------------------|--------------------------------------------------------------------------------|
| `status-header/`      | Title, meta, action buttons (Refresh/Open UI/Homepage), banner, progress panel |
| `onboarding/`         | Docker detection + "Download Docker" CTA                                       |
| `official-versions/`  | Local image listing                                                            |
| `local-testing/`      | Container listing with state                                                   |
| `retained-instances/` | Volume listing + remove + prune                                                |
| `storage-summary/`    | Counts (images, containers, volumes)                                           |
| `help/`               | Static help text                                                               |

---

## IPC Contract

All channels use the `docker-manager:` prefix.

### Request/response (invoke)

| Channel                                     | Direction        | Purpose                                            |
|---------------------------------------------|------------------|----------------------------------------------------|
| `docker-manager:getState`                   | renderer -> main | Get current Docker manager state                   |
| `docker-manager:refresh`                    | renderer -> main | Force refresh state                                |
| `docker-manager:getInventory`               | renderer -> main | Get Docker inventory (images, containers, volumes) |
| `docker-manager:install`                    | renderer -> main | Install/sync a Docker image by tag                 |
| `docker-manager:startActive`                | renderer -> main | Start the active container                         |
| `docker-manager:stopActive`                 | renderer -> main | Stop the active container                          |
| `docker-manager:setRetentionPolicy`         | renderer -> main | Set container retention count                      |
| `docker-manager:setPortPreferences`         | renderer -> main | Set UI/SSH port preferences                        |
| `docker-manager:deleteRetainedInstance`     | renderer -> main | Delete a retained container                        |
| `docker-manager:updateToLatest`             | renderer -> main | Update to latest official version                  |
| `docker-manager:activate`                   | renderer -> main | Activate a specific version                        |
| `docker-manager:activateRetainedInstance`   | renderer -> main | Rollback to a retained instance                    |
| `docker-manager:cancel`                     | renderer -> main | Cancel a running operation                         |
| `docker-manager:removeVolume`               | renderer -> main | Remove a Docker volume by name                     |
| `docker-manager:pruneVolumes`               | renderer -> main | Prune dangling volumes                             |
| `docker-manager:installDocker`              | renderer -> main | Download + open Docker Desktop installer           |
| `docker-manager:openUi`                     | renderer -> main | Open Agent Zero UI in browser                      |
| `docker-manager:openHomepage`               | renderer -> main | Open agent-zero.ai                                 |

### Push events (send)

| Channel                    | Direction        | Purpose                   |
|----------------------------|------------------|---------------------------|
| `docker-manager:state`     | main -> renderer | State change notification |
| `docker-manager:progress`  | main -> renderer | Operation progress update |

---

## A0 UI Core

The A0 UI Core (`app/a0ui/`) contains vanilla copies of the Agent Zero WebUI framework (v0.9.8):

### JS modules (`app/a0ui/js/`)

- `initFw.js` -- framework bootstrap (imports Alpine, registers directives)
- `components.js` -- `<x-component>` loader with caching + inline module execution
- `modals.js` -- modal stack management
- `AlpineStore.js` -- `createStore()` helper for Alpine reactive stores
- `initializer.js` -- DOM-ready initialization
- `confirmClick.js` -- `$confirmClick` Alpine magic helper
- `device.js` -- touch vs pointer detection
- `shortcuts.js` -- keyboard shortcut registration
- `sleep.js` -- async sleep utility

### Vendor (`app/a0ui/vendor/`)

- `alpine/` -- Alpine.js (+ collapse plugin)
- `ace-min/` -- Ace editor (all modes/themes/snippets for portability)
- `ace/` -- Ace CSS + curated modes
- `google/` -- Material Symbols font + Rubik + Roboto Mono (local `.ttf` files)

### Deviation from upstream

The only intentional deviation from Agent Zero v0.9.8 is replacing the Google Fonts CDN `@import` in `index.css` with local `@font-face` declarations for offline/Electron use.

---

## Docker Manager (Feature Layer)

### Current scope (minimal)

The launcher's Docker manager currently focuses on:

1. **Onboarding** -- detect Docker availability; if missing, offer download/install
2. **Image detection** -- list local Docker images matching the backend repo
3. **Container listing** -- list containers with state/status
4. **Volume management** -- list, remove, prune Docker volumes
5. **Inventory summary** -- counts of images, containers, volumes

### Backend Docker operations (available but not all wired to UI yet)

The `shell/docker_manager/` module also exposes:

- Install/sync images
- Start/stop active instance
- Update to latest version
- Activate/rollback versions
- Retention policy management
- Port preferences
- Progress tracking with cancel

These are fully functional at the IPC level and can be wired to UI sections as needed.

### Docker auto-install

The shell can download Docker Desktop installers:

- **Windows**: downloads `.exe` to Downloads folder and opens it
- **macOS**: downloads `.dmg` and opens it (detects arm64 vs amd64)
- **Linux**: opens Docker Engine install documentation in browser

Triggered via `docker-manager:installDocker` IPC channel.

---

## Custom Protocol

The `a0app://` protocol is registered in `shell/main.js`:

```js
protocol.registerSchemesAsPrivileged([{
  scheme: 'a0app',
  privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true }
}]);

protocol.handle('a0app', (request) => {
  const url = new URL(request.url);
  const relativePath = decodeURIComponent(url.pathname).replace(/^\/+/, '');
  const filePath = path.join(contentRoot, relativePath);
  // Path traversal protection
  if (!path.resolve(filePath).startsWith(path.resolve(contentRoot))) {
    return new Response('Forbidden', { status: 403 });
  }
  return net.fetch(pathToFileURL(filePath).toString());
});
```

This stays in the shell layer only. The A0 UI Core does not know about it.

---

## Content Bundling and Delivery

### Bundle format (`content.json`)

CI bundles `app/` files into a JSON file with binary support:

```json
{
  "bundle_format_version": 2,
  "files": {
    "relative/path.js": { "encoding": "utf8", "data": "..." },
    "relative/path.ttf": { "encoding": "base64", "data": "..." }
  }
}
```

### Delivery flow

1. `npm start` -> shell checks GitHub Releases API for latest
2. Compares timestamps with local `content_meta.json`
3. Downloads `content.json` if newer
4. Extracts files to `userData/app_content/`
5. Loads `a0app://content/index.html`

---

## Development Workflow

### Commands

| Command               | Purpose                       |
|-----------------------|-------------------------------|
| `npm install`         | Install dependencies          |
| `npm start`           | Run in dev mode (GUI)         |
| `npm run make`        | Build installers (current OS) |
| `npm run make:mac`    | Build macOS installer         |
| `npm run make:win`    | Build Windows installer       |
| `npm run make:linux`  | Build Linux installer         |
| `node --check <file>` | Syntax check a file           |

### Environment variables

| Variable                              | Purpose                              |
|---------------------------------------|--------------------------------------|
| `A0_LAUNCHER_USE_LOCAL_CONTENT=1`     | Use CWD `app/` as content source     |
| `A0_LAUNCHER_LOCAL_REPO=<path>`       | Use specific repo as content source  |
| `A0_LAUNCHER_GITHUB_REPO=owner/repo`  | Override GitHub content source       |
| `A0_BACKEND_IMAGE_REPO=ns/name`       | Override Docker image repo           |
| `A0_BACKEND_GITHUB_REPO=owner/repo`   | Override backend releases catalog    |
| `SKIP_SIGNING=1`                      | Skip macOS code signing              |
| `NOTARIZE=1`                          | Force macOS notarization             |

### Fast iteration loop (Windows)

1. Edit files in `app/`
2. Run the PowerShell cache seeding script (see `docs/running-ui.md`)
3. `npm start`

Or use `A0_LAUNCHER_USE_LOCAL_CONTENT=1 npm start` to skip seeding.

---

## Safety and Permissions

### Allowed without asking

- Read/search any file
- Edit JS/HTML/CSS in `shell/`, `app/`, `scripts/`, `docs/`
- Run `node --check`, `node -e "require(...)"`
- Run `npm ci` / `npm install`

### Ask before executing

- Adding/removing npm dependencies
- Editing GitHub workflows
- Broadening renderer capabilities (new preload exports, relaxing isolation)
- Modifying `.specify/memory/constitution.md`
- Deleting files or directories

### Never do (unless explicitly instructed)

- Commit secrets or tokens
- Disable Electron isolation or expose `ipcRenderer` directly
- Use destructive git commands (`git reset --hard`, etc.)

---

## Code Style

No enforced formatter. Rules of thumb:

- Single quotes in `shell/*.js`
- Double quotes + trailing commas in `forge.config.js` and `scripts/*.js`
- ES modules with double quotes in `app/*.js` and component JS
- Keep changes stylistically consistent within the file you touch
- Avoid drive-by reformatting

---

## Git Workflow and CI

### CI Workflows

- **Bundle Content** (`bundle-content.yml`): bundles `app/` into `content.json` on release
- **Build Executables** (`build.yml`): builds platform installers on release or workflow_dispatch

### Release Semantics

Per `.specify/memory/constitution.md`:

- **MAJOR**: changes affecting the packaged executable (shell, forge config, workflows)
- **MINOR/PATCH**: content-only changes (app/) that don't require rebuilding the shell

---

## Troubleshooting

### Blank UI / "No content available"

- Check which repo the shell is using: look for `Using GitHub content repo: ...` in logs
- Override: `A0_LAUNCHER_GITHUB_REPO="owner/repo" npm start`

### `ERR_FILE_NOT_FOUND` in console

- The `a0app://` protocol strips leading slashes from pathnames. If component scripts use absolute paths like `/components/...`, they resolve correctly. If you see this error, check the path in the component HTML.

### `Cannot find package 'dockerode'`

- Run `npm install` to ensure dependencies are installed in the working tree.

### Docker not detected

- Ensure Docker Desktop (or Docker Engine) is installed and the daemon is running
- Check `shell/docker_adapter/DockerInterface.mjs` environment detection for diagnostic codes

### Alpine content not rendering

- Check CSP in `app/index.html` (needs `'unsafe-eval'` and `blob:`)
- Check that `a0ui/js/initFw.js` loads successfully (browser devtools network tab)

### Offline mode

If GitHub API is unreachable, the shell uses cached content. If cache is missing, it shows an error.

---

## Current State and Next Steps

### Completed

- A0 UI Core extracted to `app/a0ui/` (vanilla Agent Zero v0.9.8)
- Docker manager UI refactored into per-section component folders with co-located JS
- Shared Alpine store (`docker-manager-store.js`)
- `docker_manager.js` is a thin orchestrator (~225 lines)
- Full rename: `service_versions` -> `docker_manager`, `docker` -> `docker_adapter`
- IPC namespace: `docker-manager:*`
- Volume management API (list, remove, prune) added to adapter + manager + IPC + UI
- Docker Desktop auto-install (download + open) for Windows/macOS/Linux
- Cache seeding workflow documented

### Next steps

- [ ] Extract `app/a0ui/` into a git submodule shared with Agent Zero main project
- [ ] Implement richer Docker auto-install flow (monitor install completion, auto-retry detection)
- [ ] Wire remaining Docker operations to UI (install, start/stop, update, activate, rollback)
- [ ] Add progress visualization to status-header (download/extract bars)
- [ ] Rename CSS class prefix from `sv-` to `dm-` for consistency
- [ ] Add basic automated tests for shell Docker operations
