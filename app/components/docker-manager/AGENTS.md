# AGENTS

## Purpose

`app/components/docker-manager/` owns the renderer components that make up the
launcher workspace.

The components should stay small, state-driven, and predictable. They render the
current Docker Manager snapshot and call named renderer actions when the user
asks for work.

## Ownership

This scope owns:

- `docker-manager-store.js`: mutable renderer store and default state shape.
- `progress-eta.js`: renderer-only minute-level progress ETA formatting shared
  by setup and operation modals.
- `status-header/`: wordmark, launcher update affordance, refresh, and shared
  progress-recovery helpers.
- `operation-modal/`: centered progress/error modal for non-runtime installs,
  updates, activation, start/stop, delete, rollback, and recovery actions.
- `runtime-gate/`: mandatory startup runtime setup modal, runtime setup
  progress, recovery actions, and non-dismissable gating.
- `remote-instance-dialog.js`: shared remote Instance URL and optional saved
  credential dialog used by the startup runtime gate and the Instances tab.
- `host-access-dialog.js`: one-time Host access onboarding, existing-Instance
  settings, scope dependency UI, folder selection, browser-profile selection,
  diagnostics, Retry, Disconnect, Reconnect, and disconnected state.
- `first-instance-setup/`: retired first image-pull defaults panel retained for
  compatibility while normal creation owns first Instance launch choices.
- `setup-showcase/`: Agent Zero capability slideshow helper shown during the
  long Agent Zero image pull phase.
- `onboarding/`: retired runtime setup banner files kept only for compatibility
  until they are removed.
- `sidebar/`: tab navigation, `dm:nav` event publication, and sidebar resource
  links.
- `official-versions/`: Version cards, activation dialog, saved
  Instance defaults, port/env overrides, data-loss acknowledgement, and
  update/switch actions.
- `local-testing/`: local containers, per-instance action menus, rename,
  Colour/Icon selection, launcher-saved credential controls for local and saved
  remote Instances, clone/log inspection controls, remote instance CRUD, and
  instance opening.
- `advanced/`: tabbed developer-mode custom image runner with inline Docker
  Compose composer, diagnostics, and storage-volume maintenance.
- `settings/`: port, workspace, Host access, and saved Instance provider/model
  defaults.
- `instance-tabs/`: browser-style attached and detached tab chrome, Launcher
  tab, name collapse, per-Instance Host access buttons, reload/detach/reattach,
  empty state, and viewport bounds reporting for shell-owned Agent Zero views.

## Local Contracts

- Components render from the state emitted by `app/docker_manager.js` through
  `dm:state`.
- Components should render once from `window.__dmLastState` if it already
  exists, then subscribe to future updates.
- Components should not call `window.dockerManagerAPI` directly. Use
  `window.dockerManagerActions`.
- Runtime setup renders from `state.runtime` in the blocking startup modal. It
  should distinguish installable Linux Engine setup, stopped daemons,
  relogin-required states, and manual install fallback without exposing
  package-manager details as the main path.
- Runtime setup must offer `Add remote Instance` as a first-step path for users
  who already host Agent Zero on a VPS or URL. Saved remote Instances bypass the
  local runtime blocker so the launcher can be used without Docker installed or
  an Agent Zero image pulled locally.
- If Docker is already reachable through the Docker Manager state, stale
  non-ready runtime assessments must not reopen the blocking runtime modal.
  Only completed runtime setup progress may keep the modal open to guide the
  immediate next step.
- Docker Desktop installed-but-stopped states must be warning states that tell
  the user to start Docker Desktop. Do not show a download/reinstall action for
  that state.
- Generic runtime setup buttons should say `Continue`, including runtime states
  that provide `Setup Agent Zero` or `Continue Setup` as a setup action label.
  Docker Desktop states may still name Docker Desktop plainly.
- Sidebar navigation publishes `dm:nav`; click-originated events include
  `userInitiated` so the renderer coordinator can refresh data-heavy tabs.
  Tab content activation remains owned by the renderer coordinator, not
  individual tab content components. Instances is the first sidebar item and
  the default launcher view. Programmatic tab handoffs should dispatch
  `dm:navigate` and let the sidebar apply the tab plus publish `dm:nav`.
- Empty, loading, error, success, and disabled states must be explicit enough
  that the user is never left wondering whether Docker or the launcher is still
  working.
- Runtime setup progress belongs primarily in the blocking runtime modal.
- Runtime setup should stay transparent without becoming a feature showcase.
  Use the `See more` disclosure for structured setup phases when detailed
  progress is available.
- Runtime setup success should stay in the same modal shell long enough to
  guide the next step without implying Agent Zero is still missing. If no Agent
  Zero image is installed, offer a `Download Agent Zero` image action with a
  selector defaulting to `latest`. If an image is installed and no local
  Instance exists yet, offer `Run Agent Zero`. If a local Instance already
  exists, offer `Continue`.
- Visible setup titles and transient progress states should use `Setup`, not
  `Set up`, `Set Up`, or `Setting up`; button labels that advance runtime setup
  should use `Continue`.
- If two or more distinct reachable local Docker daemon identities are detected
  during setup completion, the same modal may show a compact `Run Agent Zero
  with` selector. The same one-time selector should appear on first launch when
  multiple daemons are already reachable and no preference exists. Endpoint
  aliases for one daemon and reachable endpoints without a verified daemon ID
  must not trigger the selector. Hide it for zero or one verified daemon, and do
  not add a runtime picker to Settings or the global chrome.
- An installed stopped Docker Desktop may be the second selector choice beside
  a verified reachable daemon. Label it as stopped, change the primary action
  to `Start Docker Desktop` while selected, and keep runtime startup progress or
  failure in the blocking modal until Docker Desktop is verified.
- Post-runtime image installs, activation, rollback, start, stop, and delete
  progress should use the centered operation modal rather than a top-page
  status strip. Updating an already-installed Version from Versions should keep
  progress in a background toast so the existing install can still be used.
  Non-onboarding image installs may offer `Download in background`, which moves
  that operation into the same progress toast without stopping the download.
- Local instance card `Start`, `Stop`, and `Delete` are the exception: they are
  accepted as background queued per-container actions so a slow or hanging
  container mutation does not block the rest of the launcher. Show only the
  affected card as queued/running and report failures with toast feedback.
- The Agent Zero setup slideshow belongs only to the image pull/extract wait in
  the install operation modal. Do not show it during Docker runtime setup or
  short preflight checks. Slides should use renderer-visible still image assets
  so the blocking install modal never depends on video playback to show
  meaningful media.
- First Instance name, credential, model, storage, port, and environment
  choices belong to the normal Create local Instance dialog. On first image
  pull, the operation modal should not show a separate launch wizard, model
  defaults panel, workspace storage step, or "start my first Instance" checkbox.
  Starting after a pull is automatic only for the submitted Create local
  Instance form. First-run image pulls should keep visible progress and should
  not expose `Download in background`.
- Active modal progress should show the current phase once, in the progress
  header above the bar. Do not repeat the same phase as body detail under the
  modal title.
- Operation progress should keep actionable recovery affordances for
  user-fixable failures. For Docker Hub pull-rate limits, keep the error
  visible and offer the shell-owned Docker sign-in wrapper plus retry instead
  of a dead-end message.
- Operation progress failures must remain visible with the stable
  renderer-facing error message after the async operation finishes.
- Operation progress may show a cancel action only when the Docker Manager
  progress payload marks the current phase as cancelable.
- Official version cards must distinguish available, installable, installed,
  active, visible channel tags (`latest`, `ready`), local builds, matching
  digest, and differing digest states without exposing raw Docker mechanics as
  the main story. Fresh machines must have a visible install action once Docker
  is ready. The `latest` and `ready` cards should show channel update dates
  when Docker Manager provides them, falling back to the matched numbered
  release date when available. Their primary card meta should stay compact:
  visible date plus size only, even when structured match/digest hints are
  present in state. Numbered release cards should be grouped by major version,
  with every numbered series collapsed by default so only pinned channel cards
  such as `latest` and `ready` are immediately visible. The
  unmaintained `testing` tag is intentionally hidden from the Versions view.
  The Versions view may offer an `All` / `Installed` filter; `Installed` should
  keep entries that already have a local image, differ from the published
  digest, are active, or are currently installing.
  Shared Instance and Version card visuals should keep title glows unclipped
  and avoid inset divider lines inside the colored artwork area.
- Running an installed tag from Versions creates another managed local instance
  and must not stop existing instances or require a data-loss acknowledgement.
  Stale installed tags should keep `Run` visible and expose `Update` as a
  separate action, naming the concrete upstream release when Docker Manager
  provides one. After the run operation reports completed with the UI-ready
  marker, the renderer should switch to the Instances tab so the new managed
  Instance is visible.
  Removing an installed tag must go through Docker Manager image removal and
  must be non-forced so Docker refuses images still used by an Instance.
  Destructive switch, update, and retained-instance activation flows must keep
  the backup/proceed acknowledgement.
- Activation may offer optional model provider/model/API-key helpers under
  Advanced as `Choose your models`, compile helpers to Agent Zero environment
  defaults, save edited helpers as Instance Defaults for future runs, and
  preserve Advanced environment variables as the explicit escape hatch.
  Activation may also offer optional web login
  username/password helpers that compile to Agent Zero auth environment
  defaults; blank values must preserve Agent Zero's normal onboarding/default
  behavior.
- Port mappings and environment text stay advanced activation inputs. They
  should not become a required path for normal users.
- Advanced activation may expose a storage override, but it should name concrete
  outcomes instead of internal preferences: create a folder named after the
  Instance, choose a custom folder, or use a named Docker volume. The named
  Instance folder under the default workspace root should be first/default.
- The Advanced tab may expose developer-mode custom image, tag, environment,
  port, mount, and editable Compose-file controls in the Developer sub-tab.
  Validate through Docker Manager IPC, and never expose a generic command
  runner or a runtime-candidate browser.
- Advanced should keep developer controls and their related Compose editing
  together in the Developer sub-tab. Diagnostics and Storage volumes remain
  separate sub-tabs so the page avoids multiple boxed panels at once.
- Advanced sub-tabs should keep the Advanced page header and tab strip fixed in
  the launcher shell. Put overflow inside the active Advanced panel instead of
  relying on document-level scrolling.
- Advanced diagnostics should render structured Docker runtime facts from
  Docker Manager state as report-style rows, not metric-card grids or
  renderer-inferred runtime guesses.
- The Instances tab owns both local Docker containers and saved remote
  instances. Visible copy must say `Instances`, not `Sessions`.
  Runtime-wide tagged images, including images created in Docker Desktop or
  another selected Docker runtime, may be chosen by their full repository and
  tag; that identity must remain visible on the resulting Instance card.
  When the first inventory has loaded and there are no local or saved remote
  Instances, show a centered Create local Instance action that opens the normal
  creation dialog.
  The Instances header may expose `Create local Instance` beside `Add remote
  Instance`. Creating a local Instance should list installed versions only, then
  use the same activation defaults dialog as Versions so local instance name,
  login, model, storage, port, and environment handling stays consistent.
- Local instance cards keep `Open UI` or `Start` as the visible primary action.
  Any stopped local Agent Zero container listed by Docker Manager may expose
  `Start`; do not require newer launcher-managed labels just to start it.
  The component may log a de-duplicated card-action diagnostic snapshot to the
  renderer console when the Instances card state changes; keep it bounded to
  visible card/action/version fields and never include credentials.
  Secondary management and inspection actions such as `Rename`, `See logs`,
  `Open storage folder`, `Clone`, `Open A0 CLI`, dynamic `Start`/`Stop`, and
  `Delete` belong in the card overflow menu so they always apply to the
  specific instance shown. Local Instance deletion must use a launcher dialog,
  not a native confirm; when persistent `/a0/usr` storage is known, the dialog
  should offer explicit keep/delete storage choices and a host-folder opener
  only for host-backed storage.
  The visual header area of a running local card or saved remote card may
  mirror `Open UI`; the body/meta area should stay ordinary selectable text so
  values such as URLs remain easy to copy.
  The card overflow menu should choose its up/down direction from available
  viewport space, reserve any fixed bottom launcher chrome, and use bounded
  internal scrolling when the window is short.
  Show `Install A0 CLI` on local and saved remote Instance cards only while the
  system CLI is missing, then replace it with `Open A0 CLI`. Open should let the
  shell show the native working-folder picker before terminal launch; canceling
  that picker should not display an error. Disable it while CLI maintenance is
  running.
  Clone opens a quiet confirmation dialog with `/a0/usr` category choices hidden
  in a disclosure by default; all categories are selected by default to match
  Agent Zero backup behavior, while clearing all categories intentionally
  creates a fresh empty workspace. Keep Agent profiles as their own category for
  `/a0/usr/agents`, separate from generic workspace files. Clone and
  persistence-migration entry points must warn that the source container is
  paused and resumed, and that running AI work stops and must be resumed
  manually.
- Local and saved remote Instance cards should use the launcher-visible name,
  saved colour, and saved tab icon as visual identity. Prefer the last valid
  runtime version reported by Agent Zero health metadata, including branch and
  commits since release, then fall back to matched or concrete image provenance. Keep the
  metadata compact: show runtime branch/commit first, put the URL on its own
  line, and avoid listing routine `image latest` or persistent workspace
  fragments in the primary card text.
- Local instance cards may show an `Update` action when the runtime release tag,
  matched channel release, or concrete image release is older than the newest
  official release in Docker Manager state. The action must start stopped
  Instances through the normal card-local start flow and, for running Instances,
  open Agent Zero's self-update page instead of performing backend update work
  in the launcher.
- Local instance cards should keep workspace state quiet. Persistent host
  directories, named volumes, custom mounts, and legacy ephemeral workspaces
  should be distinguishable through relevant controls and storage affordances
  without turning Docker storage into the primary card story. Intentionally
  ephemeral workspaces should not be labeled legacy.
- `Open storage folder` should appear only for persistent workspace storage
  that exposes an actual host directory path. Do not show it for named Docker
  volumes when the host file manager cannot open a stable user-facing folder.
- Repo-mounted `/a0` Instances may open the nested host `usr` folder, but custom
  mounts must not offer launcher storage deletion.
- `Persist a0/usr data` belongs in the local instance overflow menu only when
  the Docker Manager marks the container as legacy or non-persistent. The
  action must call a named renderer action, keep the old container retained
  until the shell operation succeeds, and show a completion dialog reminding the
  user to verify the new persistent Instance before deleting the old one.
- Renaming a local instance changes the launcher-visible display name. It must
  not rely on mutating existing Docker labels, because Docker labels are
  immutable after container creation.
- Selecting an Instance Colour/Icon changes only launcher metadata and should
  use the same bounded palette and 12-icon set for local and saved remote
  Instances. The active tab icon opens the same picker as the card menu; compact
  mode hides both Instance names and the Launcher label. Do not persist raw CSS,
  arbitrary color strings, icon markup, or Docker labels for this preference.
- Saved remote URL-only instance cards must not expose Docker mutation actions.
  Their footer status should display the Docker Manager-provided remote health
  state as `Online`, `Offline`, or `Checking`, not a generic `Remote` tag.
  Remote `Open A0 CLI` must pass only the saved remote Instance ID to the
  renderer action; shell code resolves and validates the URL.
  Saved remote deletion must use a launcher dialog and make clear that it only
  removes the saved launcher entry.
  A saved remote card may show `Clone locally` only when its URL is loopback
  (`localhost`, `127.0.0.1`, or IPv6 loopback) and the port matches a discovered
  local Docker container; the action must clone that local container.
- Clone should explain that it reuses the source image and copies selected
  `/a0/usr` data; ordinary cloning does not pause or snapshot the source.
- The local instance log viewer is a bottom popover panel driven by bounded
  Docker Manager log snapshots. It must stay read-only and must not expose a
  generic Docker command surface.
- Backup and Restore belong in the local instance overflow menu. Backup creates
  a core-compatible `.zip` for `/a0/usr`; Restore accepts that same backup
  shape and writes only into `/a0/usr`, with user confirmation before starting.
- Retained instances are rollback candidates; storage-volume cleanup belongs in
  Advanced and must remain clearly separate from instance start/stop actions.
- Storage UI must say `Storage volumes` when referring to Docker volumes.
  Workspace storage preferences belong in Settings, not the Advanced storage
  tab. Copy should distinguish workspace directories from Docker named volumes.
  Host directory mapping should make clear whether the selected folder is a
  parent for per-Instance workspaces or the exact folder mounted at `/a0/usr`.
- Settings owns persistence for preferred UI/SSH ports and Instance
  provider/model defaults plus workspace storage and Host access defaults. The
  Instance defaults tab must expose the same master state, five permissions,
  and fallback folder chosen during Host access onboarding, preserve hidden
  browser-profile state, and save them through the page's single Save action.
  Do not scatter persistent default controls into install or instance cards
  except for the first-pull defaults prompt.
  Its single visible save action should persist every Settings sub-tab, including
  edited fields in inactive panels.
- `Open UI` opens local and remote instances in a launcher tab by default.
  Reopening the same target focuses the existing tab. Detach moves the existing
  page view below the same Launcher header in a standalone secure Electron
  window without stopping the instance or its live Host access lease; reattach
  moves it back without reload, and closing that window ends the lease.
- Instance tab chrome keeps a Launcher tab as the first tab whenever any
  instance UI tab is open. Selecting Launcher clears the active shell-owned
  view and leaves the launcher surface usable below the tab strip.
  Connected instance tabs should display only the tab/instance name, not the
  URL, so short names stay compact in the tab strip.
- Each Instance tab shows a separately accessible computer button immediately
  after its name. The icon is green only while Connected and grey otherwise;
  clicking it opens the Launcher-owned settings modal. A header control may
  collapse Instance names to the globe and computer icons. Opening settings
  must keep that Instance
  selected, temporarily hiding only the shell-owned view while the Launcher
  modal is open and restoring it when the modal closes. Agent Zero pages expose
  no Host access menu or controls. Instance cards must not repeat the Host access
  icon or settings button; connection and scope changes belong in an open
  Launcher Instance tab or its detached Launcher window.
  Remote Instances stay configured off by default, but an unset folder in their
  Host access
  dialog is prefilled from the Launcher default for a first opt-in.
- File read and file write are separate permissions. Write depends on read,
  and Code execution depends on write. Permission choices render as a compact
  icon/title/description list inside a native disclosure that starts collapsed;
  its summary must always identify whether Browser and Computer Use are on or
  off so those opt-in controls remain discoverable. Summarize all five
  permissions while Host access is on, show only that Host access is off when
  the master switch is off, place that master switch and the folder field inside
  the same disclosure, and keep live Disconnect/Reconnect beside the connection
  status. Use Agent Zero-style switch controls in every Host access view. The
  one-time onboarding is the exception only to collapsing: keep its full
  permission list visible.
  Host access starts off for new local and remote setups, with the local default
  master switch available in both onboarding and Settings. Browser and Computer
  Use start opt-in. Do not add a CLI installation helper to first-Instance or
  Host access onboarding; Launcher owns CLI preparation independently of
  permission opt-in.
  One Agent Zero-style switch owns the persisted master permission state and
  visibly disables its dependent permissions. Call the selected path the folder
  for files and commands, explain both roles in plain language, and make
  clear that commands may use other locations available to the Launcher user.
  Keep browser selection and Connection/Computer Use diagnostics in a collapsed
  Advanced settings disclosure with a short summary.
  Browser preparation and Computer Use
  permission failures are Needs action states, not silent relaunches or grants.
  Present capability metadata as human labels and offer Computer Use arming only
  for actionable approval, rearm, or error states—not healthy trust modes.
  Compatibility copy must name advertised Launcher gateway support rather than
  assume a specific A0 CLI release number.
- Local creation defaults channel updates on for `latest` and `ready`; users may
  turn the checkbox off when they intentionally want the installed channel image.

## Work Guidance

- Keep component scripts pure enough to rerender repeatedly from state without
  accumulating duplicate event listeners.
- Use stable element ids inside a component only within that component's loaded
  fragment; do not rely on ids owned by sibling components.
- Prefer short task-oriented copy. Avoid explanatory paragraphs when a label,
  status, or action name will do.
- Keep destructive actions guarded by confirmation or explicit acknowledgement.
- If a component's contract becomes large enough to need its own doc, add a
  child `AGENTS.md` and update this file plus the root index in the same session.

## Verification

After component changes, run:

```bash
node --check app/docker_manager.js
git diff --check
```

For script changes under this subtree, also run `node --check` on the edited
component modules when they are standalone ES modules.

## Child DOX Index

No child `AGENTS.md` files exist in this scope.
