# AGENTS

## Purpose

`shell/` owns the Electron host: main process, preload bridge, content loading,
window policy, IPC, and the bridge to Docker orchestration.

This layer is privileged. Keep it narrow, explicit, and boring in the best way.

## Ownership

This scope owns:

- `shell/main.js`: Electron app lifecycle, content distribution, custom
  protocol, main windows, IPC handlers, shell actions, and Docker Manager event
  forwarding.
- `shell/preload.js`: safe renderer bridge exposed through `contextBridge`.
- `shell/credential_prompt.html` and `shell/credential_prompt.css`: static
  content and native-window layout for the shell-owned credential consent
  modal. Reuse the Launcher's shared dialog styles and never receive credential
  values.
- `shell/host_access.js`: normalized Launcher Host access defaults, per-Instance
  configuration, scope dependencies, and stable Instance keys.
- `shell/host_gateway.js`: supervised, newline-delimited JSON bridge to the
  installed `a0 gateway` child process.
- `shell/a0_cli_install.js`: official A0 CLI installer command and release
  version policy used by Launcher CLI maintenance.
- `shell/loading.html`: loading/error shell while content initializes.
- `shell/launcher_update.js`: launcher update version formatting and legacy
  platform release-asset selection helpers.
- `shell/launcher_updater_debug_release.js`: packaged updater metadata staging
  for DevTools-triggered upgrade, reinstall, and downgrade tests.
- `shell/launcher_updater_artifacts.js`: updater cache cleanup marker and
  pending-download cleanup helpers.
- `shell/launcher_updater_install_options.js`: updater diagnostic log path and
  install-option helpers.
- `shell/assets/`: application icons and platform entitlements.
- `shell/docker_manager/`: Agent Zero image and instance orchestration.
- `shell/docker_adapter/`: Docker and registry abstraction layer.

## Local Contracts

- Keep renderer windows on `contextIsolation: true`, `nodeIntegration: false`,
  and `sandbox: true` unless an exception is documented here.
- Do not expose `ipcRenderer`, raw channels, filesystem paths, shell execution,
  or Docker objects directly to the renderer.
- The preload bridge exposes named methods only. New IPC must be added to both
  `shell/preload.js` and `shell/main.js` deliberately.
- Validate IPC bodies in `shell/main.js` before passing values to
  `shell/docker_manager`.
- New windows that open Agent Zero UIs or remote instances must sanitize URLs and
  allow only `http:` or `https:`.
- The A0 CLI terminal IPC may accept a local `http:` or `https:` URL without
  credentials, or a saved remote Instance ID. Remote CLI launches must resolve
  the saved URL in `shell/main.js`; the renderer must not pass arbitrary remote
  URLs. Terminal launch should stay shell-owned and work across Windows, macOS,
  and Linux when the `a0` CLI is installed or available in a sibling
  `a0-connector` development checkout. Launcher-owned instance launches should
  pass the known host directly to the CLI and only use CLI flags advertised by
  that installed `a0 --help`; use the direct `--connect` plus
  `--no-docker-discovery` path only when supported, otherwise pass `--host` and
  let the installed CLI use its normal discovery/autoconnect behavior. Before
  launching, the shell should use a native directory picker so the user chooses
  the CLI working folder; canceling that picker is a quiet no-op. Start the
  interactive CLI through a launcher-owned wrapper script rather than a long
  inline shell command so Textual receives normal terminal input. If an Instance
  has launcher-saved credentials, pass them to `a0` only as ephemeral
  `A0_USERNAME` and `A0_PASSWORD` environment variables for that terminal launch
  when the target is local loopback or remote `https:`; do not write passwords
  into wrapper scripts or command lines.
- After Electron becomes ready, the shell asynchronously ensures that the
  system A0 CLI is installed, advertises the Launcher gateway contract, and is
  current with the latest discoverable `a0-connector` release. Use only the
  official fixed installer endpoint, keep failures non-blocking for the rest of
  Launcher, and expose checking/installing state to the renderer. The named
  `Install A0 CLI` intent is visible only while the system CLI is missing and
  must report completion instead of merely opening a terminal. Do not expose
  generic command execution. Installing or updating the CLI is not Host access
  consent; gateway startup still requires an enabled saved choice and an open
  eligible Instance tab. Preserve user-requested gateway disconnection while
  stopping and restarting other leases around CLI maintenance.
- A0 CLI v2.5 is the first release expected to advertise the Launcher gateway
  contract. Keep actual gateway startup capability-gated so compatible
  development checkouts and future versions work without version-specific
  branches.
- A0 CLI v2.6 is the first release expected to advertise
  `computer_use_setup_v1`. The shell must capability-gate that command, correlate
  every request/result with `request_id`, reject pending requests on timeout or
  gateway exit, and keep the base gateway usable when the setup capability is
  absent. On macOS, the Electron shell owns the Accessibility prompt so TCC
  authorizes the actual packaged Launcher or Electron dev build; prompt once,
  poll silently, then let the connector continue staged Screen Recording and
  runtime validation. Later preflights remain non-prompting.
- External links should open through Electron `shell.openExternal` only after
  validation. Approved public launcher resources such as Docs, API Dashboard,
  and Support should be exposed to the renderer as fixed resource IDs, not
  arbitrary URL strings.
- Instance UI tabs are shell-owned `WebContentsView`s. Renderer code may request
  open/select/select launcher home/close/reload/detach/reattach and report viewport
  bounds, but URL resolution, URL validation, web contents lifecycle, and
  detached windows stay in `shell/main.js`. Detach reparents the existing view
  below a Launcher-owned header; reattach moves that same view back without a
  page reload. Main-window layout passes must leave detached views untouched
  because their detached windows own those bounds. Local `Open UI` requests
  should wait briefly for a freshly running container's HTTP UI before returning an
  unavailable error. Renderer open requests may pass a bounded Agent Zero
  section selector such as `self-update`; the shell validates the Instance URL,
  then opens only the matching known in-page Agent Zero modal or same-origin
  anchor. If a local Instance or saved remote Instance has
  launcher-saved credentials, `Open UI` may POST them to the same-origin Agent
  Zero `/login` route in the shell-owned browser session before loading the
  tab, and an already-open tab may repeat that recovery when a restart sends
  it back to `/login`; remote credential POSTs must stay on `https:` URLs
  unless the target is local loopback. Do not put credentials in URLs or expose
  decrypted passwords to the renderer. After a successful same-origin manual
  `/login` redirect, an eligible Instance tab with no saved credentials may
  show one branded modal child window with `Save credentials` / `Not now`.
  Observe the form only in the shell, never pass credential values into the
  static modal content, retain them only in memory until that choice, and
  persist them through the existing secure store only after explicit consent.
  After a tab starts from a validated
  Instance URL, in-tab navigation may stay on that Agent Zero origin, including
  same-origin anchors and callbacks; safe off-origin `http:` and `https:` URLs
  should open through the user's external browser. Embedded and detached Agent Zero UI
  web contents
  should attach the same shell-owned edit context menu so selected text and
  editable fields keep normal copy/paste behavior. Instance-tab refreshes must
  bypass the HTTP cache so an Agent Zero restart cannot strand aborted UI assets
  in the embedded view.
- Each eligible Launcher-owned Instance surface may own exactly one outbound
  `a0 gateway` child. Start it only after an embedded tab opens, keep it alive
  across Launcher-home selection and in-tab reloads, and transfer that same
  lease when the tab moves into a detached window. Stop it when the owning tab
  or detached window closes, its current web contents are destroyed, or the app
  cleans up. Graceful shutdown must be allowed to finish before Electron exits
  so remote shell groups, browser sessions, Computer Use sessions, and the
  WebSocket are not orphaned.
- Missing Host access preferences normalize with the local master state off.
  Preserve explicit saved Instance choices ahead of tab/runtime snapshots;
  Settings owns local defaults and Create/Add Instance is the single initial
  opt-in point. The retained onboarding field is compatibility state only and
  must not gate gateway startup.
- Launcher gateway supervision must use the installed CLI contract and JSONL
  stdin/stdout; it must not open an inbound port or expose a generic process
  surface through preload. Pass credentials only as ephemeral environment
  variables, never arguments or renderer state. Capability-gate startup on
  `launcher_gateway` plus `launcher_gateway_file_write` HTTP support and
  `launcher_gateway_control` WebSocket
  support, and select CLI candidates by their advertised `a0 gateway` contract
  rather than a release number so a capable sibling development checkout can
  follow an older installed CLI. Contract, authentication, and runtime exits
  stay stopped until an explicit Retry; a user-requested Disconnect is
  suppressed until the Launcher Host access modal reconnects that same lease or
  its owning tab/window closes.
  Keep gateway identity stable for the Launcher installation across tabs,
  preserve saved reverse-proxy base paths, reject URL credentials, and bound
  JSONL input before it enters renderer state. Treat stdout as a strict JSONL
  contract, require versioned status to match the requested gateway identity,
  send `file_read` for the separate read permission, and terminate children
  that do not publish valid status within the bounded startup window. The CLI
  reserves the older `files` argument for legacy read/write Launchers.
- Embedded and detached Launcher-owned Agent Zero web contents must append
  `A0-Launcher/<version>` to the user agent. This tag identifies the shell-owned
  browsing surface; it does not grant authentication or gateway authority, and
  Agent Zero pages receive no Launcher Host access preload. The detached
  Launcher's own header may use the normal named renderer bridge for its tab,
  modal visibility, reload, and reattach intents; main-process handlers must
  resolve the caller back to its owning detached window before moving its view.
- Local development content is selected by `A0_LAUNCHER_LOCAL_REPO`,
  `A0_LAUNCHER_USE_LOCAL_CONTENT`, a repo-shaped default-app current working
  directory, a repo-shaped unpackaged-app current working directory, or the
  first non-option app path in a default-app Electron launch. The default-app
  path matters for Windows RunOnce runtime setup resumes, where the original
  environment variables may be gone.
- Non-local content comes from the configured GitHub Release `content.json`
  asset and is unpacked under Electron `userData`. Downloaded release content
  must be written to a staging directory first, then swapped into
  `app_content`, so a failed cleanup or partial extraction cannot destroy the
  last usable cache.
- Packaged launcher executable update prompts use `electron-updater` metadata
  from the launcher GitHub Release. A newer executable may hold
  `shell/loading.html` with `Update` and `Continue`; `Update` downloads the
  updater payload, then becomes a restart/install action once downloaded.
- `electron-updater` stays configured with `autoDownload: false`,
  `autoInstallOnAppQuit: false`, web installers disabled, and differential
  download disabled. User intent must start download and install.
- The preload bridge intentionally exposes a DevTools debugging surface at
  `window.space` and `window.launcherUpdater` with `checkForUpdates()`,
  `downloadUpdate()`, `installUpdate()`, and `debugReinstall(version)`.
  `debugReinstall` may stage upgrades, reinstalls, or downgrades by reading the
  requested release metadata; keep it package-only and updater-owned.
- Startup begins in a transparent, frameless splash window that shows only the
  launcher icon and title. Before app content opens, `shell/main.js` sends the
  splash exit event, replaces that splash with the normal framed app window,
  then loads `a0app://content/index.html`.
- Release bundles may contain legacy string file entries or structured
  `{ encoding, data }` entries. The loader must preserve `utf8` text and decode
  `base64` binary assets while rejecting unsafe paths.
- Legacy cache metadata with `version: "dev-local"` must never block release
  updates. Use explicit local-content mode for development instead of
  future-dated sentinel timestamps.
- The `a0app://` custom protocol is the renderer content origin; keep URL
  resolution, fetch, and CSP compatible with that scheme.
- `content_meta.json` owns the downloaded content version exposed through
  shell metadata.
- `app.getVersion()` owns the launcher app version exposed to the renderer for
  diagnostics and update decisions. The default renderer header does not show
  visible launcher version text.
- `electronAPI` owns shell metadata: status/error listeners, app/content version,
  and icon data URL.
- `dockerManagerAPI` owns all Docker Manager calls.
- Runtime setup IPC is a named Docker Manager intent. The renderer may request
  setup/start, but assessment and privileged mechanics stay in
  `shell/docker_manager` and `shell/docker_adapter`.
- Runtime preferences are soft. Endpoint detection must fall back when the
  preferred endpoint is unavailable without deleting the preference; a runtime
  explicitly started by the user becomes the new preferred endpoint.
- Runtime discovery may expose multiple endpoint aliases for fallback, but
  renderer onboarding choices must be based on distinct verified Docker daemon
  identities rather than endpoint count.
- Shell state sanitization may expose only the bounded runtime-candidate fields
  needed by the picker, including the narrowly validated installed-and-stopped
  Docker Desktop start state.
- Docker Hub sign-in recovery is a named shell-owned intent. The renderer may
  request it, but `shell/main.js` must launch a visible wrapper around the real
  `docker login` flow instead of exposing generic command execution.
- Developer custom-image runs are named Docker Manager intents. The renderer may
  pass image, tag, environment, port, mount, and pull preferences, but shell code
  must keep validation and Docker execution behind `shell/docker_manager`; do not
  add generic shell or Docker command IPC.
- Create local Instance may select only Agent Zero releases and local Agent Zero
  builds. Arbitrary Docker image execution remains an Advanced developer intent.
- Docker CLI discovery for that sign-in flow should honor explicit
  `A0_DOCKER_CLI_PATH` or `DOCKER_CLI_PATH` overrides, then `PATH`, then known
  Docker Desktop, Homebrew, Linux package, and Snap locations before failing.
- Windows client WSL setup may request UAC through an explicit runtime setup
  action. Keep that path narrowly scoped to WSL feature/distro setup; do not add
  generic command execution IPC.
- Runtime state may expose HTTP(S) manual guide URLs, but `shell/main.js` must
  continue sanitizing that field before it reaches the renderer.
- Long-running Docker operations should return an accepted operation id and
  report progress through Docker Manager events instead of blocking the renderer.
  The sanitized progress bridge should preserve explicit product state flags
  such as `uiReady` when the renderer depends on them for handoff behavior.
- Sanitized Docker Manager state may expose bounded health-derived runtime
  identity fields for local and saved remote Instances; never forward arbitrary
  health response content.
- Install image removal is a named Docker Manager IPC intent. The renderer may
  pass a release tag, but shell code must validate the IPC body and Docker
  Manager must perform a non-forced image removal so Docker can refuse images
  still used by any container.
- Per-instance clone, rename, and Colour/Icon selection operations are named
  Docker Manager intents. Clone may accept a bounded `/a0/usr` category selection, but
  archive copy and filtering stay in `shell/docker_manager` and
  `shell/docker_adapter`. Appearance selection may accept only bounded palette
  and icon IDs and must stay launcher metadata. Long-running container
  mutations report progress.
- Per-instance deletion may remove persistent workspace storage only after an
  explicit renderer choice. Root-owned host-workspace contents must be cleaned
  through the Docker adapter, and a cleanup failure after container deletion
  must report that partial result instead of claiming the Instance still exists.
- Per-instance Backup and Restore are named Docker Manager intents. The shell
  owns native save/open dialogs for `.zip` files; Docker Manager owns the
  `/a0/usr` archive semantics and progress events.
- Workspace storage preference and migration actions are named Docker Manager
  intents. They may expose storage mode/root/path-mode/volume fields, but
  Docker mount creation, migration, and archive copy behavior must stay in
  `shell/docker_manager` and `shell/docker_adapter`.
- Opening an Instance storage folder is a named Docker Manager intent. The
  renderer passes a container id; the shell resolves and opens only validated
  host-directory workspace paths.
- Per-instance Docker log inspection is a named, bounded, read-only Docker
  Manager intent. Do not expose raw Docker log commands or shell execution.
- Error responses should use `dockerManager.toErrorResponse()` so renderer code
  sees a stable `{ code, message }` shape.
- The launcher should not create a system tray/menu-bar status icon. Keep the
  normal app window plus platform Dock/taskbar entry as the only shell presence.

## Work Guidance

- Keep main-process code as orchestration. Put reusable Docker behavior in
  `shell/docker_manager` or `shell/docker_adapter`.
- Prefer one IPC method per user intent rather than generic "run command"
  bridges.
- When adding a renderer-visible action, update `shell/preload.js`,
  `shell/main.js`, `app/docker_manager.js`, and the owning `AGENTS.md` files in
  the same session.
- Avoid platform-specific assumptions unless the code explicitly checks
  `process.platform`.

## Verification

After shell changes, run:

```bash
node --check shell/main.js
node --check shell/preload.js
node --test shell/a0_cli_install.test.js
node --test shell/launcher_update.test.js
node --test shell/launcher_updater_debug_release.test.js
node --test shell/instance_tabs.test.js
node --test shell/host_access.test.js shell/host_gateway.test.js
git diff --check
```

If IPC or content loading changed, launch local content:

```bash
A0_LAUNCHER_LOCAL_REPO=/home/eclypso/a0/a0-launcher npm start
```

## Child DOX Index

- `/shell/docker_adapter/AGENTS.md`: generic Docker and Docker Hub adapter.
- `/shell/docker_manager/AGENTS.md`: Agent Zero Docker Manager product layer.
