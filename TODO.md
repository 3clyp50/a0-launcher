# A0 Tag Implementation Ledger

> This is the compaction-safe working ledger for A0 Tag. Keep it unusually
> detailed and update it after every meaningful implementation, test, design,
> failure, or environment discovery. It is not a release checklist and does
> not grant permission to commit, push, install dependencies, or release.

## 0. Resume Here After Compaction

1. Read this file from top to bottom.
2. Check the current entries in **Implementation Status** and **Evidence Log**.
3. Re-run `git status --short` in both repositories before editing.
4. Resume the first unchecked item under **Immediate Work Queue**.
5. Preserve the central invariant: the open selected Instance tab's outbound
   Launcher gateway is the only authority for host tools.
6. Keep this ledger synchronized before ending a work period.
7. Current follow-up: the accepted Ubuntu tranche is committed and pushed. The
   macOS tranche is active on the host recorded below. Resume from the first
   unchecked item in the macOS acceptance list; do not reuse the installed
   global `a0` for development proof and do not disturb Launcher-managed Colima.

## 0A. macOS Resume Capsule (2026-08-31, Mac Studio)

### Host and repositories

- Initial capture time: `2026-08-31T11:05:14-0700 PDT`; last synchronized
  `2026-08-31T17:09:38-0700 PDT`.
- Host names: Computer Name and LocalHostName `MaclyWWVV29HYQW`; hostname
  `MaclyWWVV29HYQW.local`.
- `sw_vers`: macOS `26.6`, build `25G72`.
- Kernel/architecture: Darwin `25.6.0`, `arm64`.
- Apple hardware inventory reports `Mac Studio`, model `Mac13,1`, Apple
  `M1 Max`, 10 cores, and 64 GB RAM. The task description called this an M2
  Max; use the native inventory as the evidence-backed hardware identity unless
  later system evidence supersedes it.
- Initial repository state, before any macOS ledger or source edit:

| Repository | Absolute path | Branch | HEAD | Initial state |
| --- | --- | --- | --- | --- |
| Connector | `/Users/alessandro/a0/a0-connector` | `development` | `5b20de55f73a96df56974e09b98ac9e128600340` | clean, tracks `origin/development` |
| Launcher | `/Users/alessandro/a0/a0-launcher` | `development` | `f787bbde07ec704aad382b744d3aaa290e5d2e11` | clean, tracks `origin/development` |
| Core | `/Users/alessandro/a0/agent-zero` | `ready` | `4d10f601d7e4c136d2b866feca0a5db91b571b61` | clean, tracks `origin/ready` |

- Every expected A0 Tag commit resolves and is an ancestor of the current
  checkout: Connector `fc72914221929b01bd16e3dc1ae111d8c5770ee6`
  and `5b20de55f73a96df56974e09b98ac9e128600340`; Launcher
  `d2c467cb1d0e5613135006b09f1e41d6db6ac76c`,
  `1e5eedc8f9ddca85877220e99f957d8bcc754001`, and
  `f787bbde07ec704aad382b744d3aaa290e5d2e11`.

### Installed and running Launcher identity

- Development native acceptance is complete and its exact process tree exited
  cleanly. The current runtime is the inspected arm64 production package at
  `/Users/alessandro/a0/a0-launcher/dist/desktop/macos/mac-arm64/Agent Zero Launcher.app`:
  LaunchServices-owned main PID `3807` with PPID `1`; no screen/Terminal wrapper
  remains. It was started with only explicit repo-local
  `A0_CLI_PATH=/Users/alessandro/a0/a0-connector/.venv/bin/a0`; local-content
  override is unset. Its runtime log is
  `/Users/alessandro/a0/agent-zero/tmp/a0-tag-macos-20260831/runtime/screenlog-packaged-macos.0`.
- Product version is `1.6`; Node is `v24.20.0`, npm is `11.19.0`, Electron is
  `42.5.1`, and Electron Forge is `7.10.2`. Root `node_modules` is present and
  `npm ls --depth=0 --json` reports the declared top-level packages resolved.
- The accepted development TCC application was
  `/Users/alessandro/a0/a0-launcher/node_modules/electron/dist/Electron.app`,
  bundle ID `com.github.Electron`, arm64, ad-hoc/linker-signed, with no Team ID.
  The current local package is bundle ID `ai.agent0.launcher`, arm64, unsigned
  except for Electron's linker ad-hoc signature, and has no Team ID; its actual
  Accessibility/TCC state is the next acceptance check. No previously installed
  package existed under `/Applications` or `/Users/alessandro/Applications`.
- The selected `agent-zero` Instance tab is open and its embedded WebUI is
  loaded at `http://127.0.0.1:49930/`. The current outbound child now uses the
  required sibling editable Connector checkout (the initial stale uv-tool
  command is retained in the chronological log):

```text
/Users/alessandro/a0/a0-connector/.venv/bin/python
/Users/alessandro/a0/a0-connector/.venv/bin/a0 gateway
--host http://127.0.0.1:49930
--gateway-id launcher-2155b00f-f2a4-4f3d-949d-8e1dd10e9425
--master
--scopes file_read,file_write,code_execution,browser,computer_use
```

- Packaged main PID `3807` and the same selected Instance tab are live.
  Exactly one repo-local gateway PID `4049` is connected with all five
  inherited scopes. The Agent Zero container/UI remain intact and HTTP `200`.
  The downloaded public 1.6 renderer predates the A0 Tag Settings panel, but
  the packaged current shell/controller retained the persisted enabled target;
  packaged shortcut/TCC behavior is now under native acceptance.

- The installed tool is `a0 2.11` under
  `/Users/alessandro/.local/share/uv/tools/a0`; it includes the macOS backend
  and PyObjC `12.2.2`, but its installed sources do not contain `a0_tag_v1`,
  `a0-tag`, or tag helper actions. It is therefore a known-stale candidate for
  this unreleased tranche even though its base Host access gateway is healthy.

### Launcher-managed Colima and Agent Zero

- No `docker` command is on the normal shell `PATH` by design. The user
  confirmed this Instance was created with Launcher's managed Colima runtime.
- Launcher runtime binaries live under
  `/Users/alessandro/Library/Application Support/a0-launcher/runtime/bin`; the
  exact Docker client is version `29.7.2` and connects to server `29.5.2` using
  context `colima-a0` at
  `unix:///Users/alessandro/.colima/a0/docker.sock`.
- Colima/Lima profile `colima-a0` is live. Its `limactl` usernet/hostagent and
  SSH mux are the expected Launcher-managed runtime processes; SSH publishes
  local port `49930`.
- Running container:

```text
id:      c925ea4ff5c5897593d6d6bc3c7f54b9a5f00ac45d127b35ab52fb026a3d40af
name:    a0-inst-agent-zero-mthid64x
image:   agent0ai/agent-zero:ready
port:    0.0.0.0:49930 -> 80/tcp
mount:   /Users/alessandro/agent-zero/agent-zero/usr -> /a0/usr
started: 2026-08-31T17:24:30.573888276Z
```

- Exact UI URL: `http://127.0.0.1:49930/`. Both `/` and `/api/health` return
  HTTP 200. Health reports runtime branch `ready`, commit
  `6a6cecff8527b164668c7a6ab2f76b6b1ed7cfa1`, tag/version `R v2.11`.
  The runtime is the release image with only `/a0/usr` mounted, not a Core
  source bind mount; no Core change or container restart is currently indicated.

### Connector environment and macOS backend baseline/current state

- Initial state had no repo-local environment. It now has the required editable
  CPython 3.12 environment at `/Users/alessandro/a0/a0-connector/.venv`; its
  `a0 --version` is `2.11`, and imports resolve to this checkout. It was created
  from existing repository constraints only; environment-only `numpy==2.2.6`
  matches the already-declared Windows test dependency and changed no metadata.
- System Python is Apple Python `3.9.6`; the installed uv tool uses CPython
  `3.12.14`. Git is Apple Git `2.50.1`.
- The checked-out macOS backend owner remains
  `packages/a0-computer-use-macos/src/a0_computer_use_macos/`. It already owns
  AX, CoreGraphics/Quartz input and capture, sessions, permissions, native
  window discovery, and helper stdio. The implementation now advertises
  `a0-tag` and supplies private `tag_context`, `tag_replace`, and `tag_release`
  through those existing seams. It uses bounded UTF-16 AX reads, exact target
  revalidation/rollback, and optional PID/bounds-verified CoreGraphics capture.
- The generic manager now exempts only its private `launcher-tag` session from
  ordinary Screen Recording setup, and the macOS runtime skips only that
  session's display-capture probe. Accessibility remains required; missing
  Screen Recording yields text-only context. No dependency, protocol, daemon,
  Core change, permission matrix, or fallback Instance was added.

### macOS TCC observations

- The user explicitly accepted the Accessibility/Screen Recording permissions
  requested by Codex's Computer Use inspection bridge during this preflight.
  That grant belongs to Codex/ChatGPT (`com.openai.codex`), not automatically to
  Launcher or the Connector helper.
- Initial read-only Launcher UI evidence for the old gateway lease reported:
  `Connection — Ready`, `Browser — Allowed · Ready`, and
  `Computer Use — Allowed · Ready`; every inherited scope is on.
- A non-prompting `permission_status` invocation of the installed macOS helper
  launched directly from Codex returned
  `accessibility=required`, `screen_recording=granted`. This is a different TCC
  responsibility chain from the Electron-owned gateway and is recorded as an
  identity observation, not as evidence that the visible Launcher lease is
  broken.
- The user TCC SQLite database is not readable from this process. No Full Disk
  Access was requested or granted, no TCC state was reset, and no unrelated
  privacy setting was touched.
- Input Monitoring has not been requested. The selected Instance microphone
  path has now been exercised. macOS attributed the native development prompt
  to the responsible launching application `ChatGPT`, not to the child
  Electron bundle; after the user allowed it, **Privacy & Security >
  Microphone** showed `ChatGPT: on` and `DeskIn: on`. The subsequent embedded
  page failure is a separate Chromium session permission, documented in the
  chronological evidence below. Development and packaged identities must each
  be recorded again at their native acceptance gates; prompts must name the
  exact responsible application and restart need.
- The exact development Electron app
  `/Users/alessandro/a0/a0-launcher/node_modules/electron/dist/Electron.app`
  (`com.github.Electron`) is now present and `on` in **Privacy & Security >
  Accessibility**. Computer Use read this state after the user unlocked the Mac;
  automation changed no TCC value. No Screen Recording or Input Monitoring
  prompt appeared during the current-source gateway restart or Ready proof.
- Packaged TCC baseline: **Privacy & Security > Accessibility** has no
  `Agent Zero Launcher` entry. Existing on entries are ChatGPT, Codex Computer
  Use, DeskIn (managed), development Electron, MosyleMDM (managed), and
  Terminal. The packaged bundle is exact `ai.agent0.launcher` at
  `/Users/alessandro/a0/a0-launcher/dist/desktop/macos/mac-arm64/Agent Zero Launcher.app`;
  user consent to add/enable only that application is now required. No existing
  entry was changed or reset.
- Packaged TCC current state: exact `Agent Zero Launcher` Accessibility and
  Screen & System Audio Recording switches are now on. The explicit off-state
  test first proved a physical shortcut did nothing, created no chat or worker,
  and left tag-free TextEdit byte-for-byte unchanged. Restoring Accessibility
  advanced the same gateway's diagnosis to Screen Recording; enabling that
  permission produced macOS's required quit/reopen notice. The user chose
  `Later` so the task can restart the exact package with the repo-local Connector
  environment instead of risking the stale global `a0`. No unrelated TCC entry
  changed and Input Monitoring was not requested.
- Preflight screenshots:

```text
/Users/alessandro/a0/agent-zero/tmp/a0-tag-macos-20260831/preflight/launcher-open-instance.jpeg
sha256 8256715a43a5d09e6ea789b32b90cc89f2a5de6771ca71ddf4038be237919c63

/Users/alessandro/a0/agent-zero/tmp/a0-tag-macos-20260831/preflight/host-access-ready.jpeg
sha256 ae58b4081f0a8f1749d59e712478e966b78f8f256a7965ab2f4a51d42d6887f0
```

### Objective, next action, blockers, and macOS acceptance

- Objective: implement and fully verify macOS A0 Tag without changing the
  accepted Linux behavior, adding a dependency/protocol/daemon/permission
  matrix/fallback Instance, or modifying Core without direct evidence.
- Next action: user inspection and push through GitHub Desktop; the user has
  authorized local commits but not a push. The next implementation tranche is
  Windows on a separate Windows 10 x64 machine. Live macOS Whisper
  draft/send/cancel remains the sole hardware-limited acceptance item and
  requires an actual audio-input device to be attached or exposed.
- No native TCC blocker remains: the responsible `ChatGPT` application now has
  Microphone access. The concrete microphone blocker is hardware: macOS exposes
  only `Mac Studio Speakers` with two output channels and no audio-input device;
  installed DeskIn and Parrot HAL drivers expose no active input. The native
  acceptance harness cannot synthesize a true macOS global shortcut, so each
  registration proof requires a physical keypress after Computer Use prepares
  and verifies the exact surface. Colima and container
  `a0-inst-agent-zero-mthid64x` remain running.
- Acceptance checklist:
  - [x] Mac backend advertises `a0-tag` only with the complete private contract.
  - [x] Focused automated macOS capture/replacement/security/rollback/release/
    screenshot/no-public-action tests pass.
  - [x] Connector targeted gateway/headless/backend tests pass.
  - [x] Connector full suite passes apart from any separately reproduced known
    Browser configuration fixture drift.
  - [x] Launcher A0 Tag/gateway/Settings/state/TCC targeted tests pass.
  - [x] Launcher full Node suite passes.
  - [x] Repo-local development Launcher advertises `a0_tag_v1` on the exact
    open Instance lease.
  - [x] Settings enable/select/save/reload reaches Ready with
    `Cmd+Shift+Enter`.
  - [x] TextEdit plain-text ASCII, surrounding-text, no-Enter, Unicode, and
    `@a0.developer` FIM flows pass.
  - [x] Protected-field and delayed stale-target flows fail closed without
    capture/chat/insertion leakage.
  - [ ] Command palette layout, drag, profile, microphone, attachment chooser,
    close-before-work, and origin-focus restoration pass.
  - [x] One harmless macOS Host Computer Use action is freshly verified; no
    Linux Desktop/Xpra fallback occurs.
  - [x] One disposable file and folder arrive byte-exact as safe upload refs;
    no host path enters renderer state or tagged argv.
  - [ ] Selected Instance Whisper first-use, draft/send, cancel, and raw-audio
    ownership pass. Hardware-blocked on this host: macOS exposes no audio-input
    device; do not mistake the store's generic browser-permission toast for a
    permission denial.
  - [x] Disable/tab close/reopen/Host disconnect/reconnect/Computer Use revoke/
    restore update shortcut, target, palette, and gateway state without orphans.
  - [x] Packaged arm64 application identity/signing/TCC recovery plus one FIM
    and one command flow pass without publish, release, or notarization.
  - [x] Deep frdel alignment review and evidence-backed in-scope polish complete.
  - [x] Final DOX, diff, secret, process, artifact, and cleanup audits complete.

## 1. Objective

Implement A0 Tag for Agent Zero Launcher so a user can type an explicit command
in the currently focused application and summon a selected Agent Zero profile:

```text
@a0 <query>
@a0.<profile-key> <query>
```

The user then presses the fixed MVP shortcut:

```text
Linux / Windows: Ctrl+Shift+Enter
macOS:           Cmd+Shift+Enter
Electron:        CommandOrControl+Shift+Enter
```

The selected Agent Zero Main model decides whether the task is:

- `replace`: return field-ready text for exact in-place replacement; or
- `action`: operate the tagged foreground application through the already
  authorized Computer Use gateway and return a concise completion summary.

Every invocation creates a new Agent Zero chat with the selected/default
profile. The resulting chat remains available in the selected Instance.

When the focused application cannot expose a safe editable range, the same
shortcut opens a floating Launcher-owned composer. Its requests always use
ordinary inherited Computer Use. The app restored after the palette closes is
the natural starting context when the wording refers to the current app, while
the Main model may work elsewhere on the computer when the request requires it.
This avoids pretending that every browser/chat rich editor supports exact native
replacement without creating a second target or permission modality.

## 2. Approved Product Decisions

### Invocation

- Explicit tag plus explicit global shortcut.
- No passive text watcher.
- No global keylogger.
- No clipboard polling.
- No accessibility text-change subscription in production.
- Exactly one invocation at a time for the MVP.
- A second shortcut while running resurfaces status; it does not queue work.
- Keep one shortcut and one controller. A valid inline tag remains the fastest
  path; recoverable capture failures open the command palette instead of an
  accessibility/caret instruction.

### Command palette fallback

- The palette is shell-owned, static, sandboxed, context-isolated, and backed
  by the same selected Instance lease as inline A0 Tag.
- It is a deliberate composer, never a passive capture surface: only text the
  user types into the palette becomes the query.
- Open it only for capture failures that mean no safe inline request is
  available (no accessible field/text/tag, unsupported caret position, or an
  inactive/unavailable origin window).
- Do not convert protected-field, permission, capability, lease, profile,
  malformed-result, or apply/revalidation failures into palette fallback.
- Palette requests always use the existing Computer Use scope across the
  desktop. There is no target selector or second permission mode.
- Close the palette before Agent Zero starts so the window manager can restore
  the previously focused app. That app is the natural starting context when the
  request wording refers to the current app, not an OS-level confinement rule.
- Include the configured profile and the live bounded profile list in the
  composer; a palette selection applies only to that invocation and does not
  silently rewrite Settings.
- The palette may be dragged by its branded header. Interactive controls remain
  explicit no-drag regions, Escape cancels, Enter sends, and Shift+Enter adds a
  line.
- The title is exactly `Ask Agent Zero to use your computer`; the input
  placeholder is exactly `Type your message here...`.
- The composer row follows the Agent Zero WebUI's real border/background/shadow
  color mixes, 16px Rubik input metrics, transparent microphone states, and
  `#4248f1` send action rather than an approximate Launcher-only variant.
- The left `+` opens an upward two-item menu: Attach file and Attach folder.
  Both use Electron's native chooser. The renderer sees only bounded display
  labels; exact selected paths remain in the shell and are uploaded only after
  submit through the selected Instance's authenticated outbound gateway.
- A selected folder means its regular files, matching the original WebUI
  composer's folder input. Nested symlinks are not followed. The gateway caps a
  request at 16 explicit selections, 128 expanded files, 25 MiB per file, and
  100 MiB total before the tagged chat starts.
- Before recording, read the exact Instance's `_whisper_stt` status. If its
  runtime/model is not ready, show a footer notice that the first transcription
  may download/load Whisper; keep Agent Zero's own toast/error behavior and do
  not proxy raw audio.
- Reuse the Agent Zero triangle asset, local Rubik font, dark palette tokens,
  and WebUI-composer visual language. Do not copy the full WebUI composer or
  import another UI framework.
- A palette invocation has no safe Launcher replacement target. If the Main
  model returns useful text without operating the app, show it in the existing
  Copy/Dismiss result surface; only Computer Use may type or submit in another
  application.
- Restored app focus is contextual intent, not an OS-level window sandbox. The
  gateway retains exactly the Computer Use authority the user already granted.

### Instance lease

- A0 Tag is default-off.
- Settings select one exact local or saved remote Instance by stable key.
- The selected Instance tab or detached window must be open.
- Closing the owning surface ends the eligible lease.
- Launcher Home selection, reload, detach, and reattach preserve the same lease.
- Explicit gateway Disconnect suppresses A0 Tag until Reconnect/lease reset.
- Never silently switch to another Instance.

### Permissions

- A0 Tag has an enable switch, not a second permission matrix.
- Capturing the tag and foreground context requires the selected gateway's
  existing Host access master and Computer Use scope.
- Tagged chats inherit every scope already granted to that gateway:
  - host file read;
  - host file write;
  - host code execution;
  - Use my Browser;
  - Computer Use.
- Scope dependency rules remain unchanged: write requires read; execution
  requires write.
- The ephemeral tagged headless client advertises no host tools of its own.
- Agent Zero Core therefore falls through to the existing Launcher gateway for
  every allowed host tool.
- Changing scopes during a run takes effect through the gateway immediately.
- Existing Agent Zero safeguards remain authoritative. A0 Tag adds no separate
  confirmation modal for app actions.

### Main-model decision

- Launcher does not classify the query with keywords or a second model.
- Tool-call presence is not a classifier because a text-reply task can use
  Browser, files, execution, or Computer Use for research.
- The selected Main model chooses `replace` or `action` in its final response.
- Hidden first-line completion markers:

```html
<!--a0-tag:v1;mode=replace-->
<!--a0-tag:v1;mode=action-->
```

- Human-visible text follows the marker.
- The repository's Marked renderer preserves these as non-rendered HTML
  comments, so the WebUI shows only the human text.
- A0 CLI strips and validates the marker for Launcher.
- Missing, duplicated, misplaced, or unknown markers fail closed to overlay.

### Replace mode

- Agent Zero may use any granted tool to prepare the reply.
- Agent Zero does not mutate the origin field merely to deliver the reply.
- Launcher revalidates the exact native target and replaces only the captured
  tag span.
- Launcher never presses Enter or submits.
- Preserve tabs/newlines; strip NUL and unsafe control characters.
- No synthetic `A0:` prefix.
- Direct insertion limit: 16,384 Unicode code points.
- Unsafe/changed/unsupported targets use a result overlay with Copy/Dismiss.

### Action mode

- Agent Zero may click, type, navigate, select, drag, or submit through the
  existing Computer Use capability when clearly required by the explicit task.
- It may combine Computer Use with all other granted gateway capabilities.
- The raw `@a0...` invocation is a control command, not content to post/send.
- When operating the tagged field, the agent removes/replaces the tag as part
  of the requested workflow.
- Launcher never inserts the action summary into the original field.
- Launcher releases its native target and shows the concise action summary in
  the branded result overlay.
- If the action cannot complete, the chat/overlay explains the blocker and the
  application must remain recoverable.

### Context

- Capture begins only after the explicit shortcut.
- Capture only the active application/window context:
  - app name;
  - window title;
  - focused/selected text around the invocation;
  - bounded active-window accessibility chunks;
  - active-window screenshot when reliably bounded.
- Query maximum: 2,048 Unicode code points.
- Profile key grammar: `[A-Za-z0-9][A-Za-z0-9_-]{0,63}`.
- At most 16 text chunks under the existing gateway 2,048-character string
  bound.
- Reject password/secure fields before text/tree/screenshot capture.
- Never silently upload a full-desktop screenshot when an active-window crop is
  unavailable. Continue text-only with a visible notice.
- Treat app content as untrusted prompt data.

### Cross-platform rollout

1. Ubuntu 24.04 GNOME Wayland implementation and proof on this machine.
2. Request remote Mac Mini only after Ubuntu acceptance.
3. Implement/verify macOS AX capture/range handling and packaged permissions.
4. Request Windows 11 only after macOS acceptance.
5. Implement/verify Windows UI Automation capture/range handling.
6. X11 stays outside this MVP and its existing product gate is unchanged.

## 3. Current Baseline (2026-08-30)

### Launcher

- Repo: `/home/eclypso/a0/a0-launcher`
- Branch: `development`
- HEAD: `3514435`
- Worktree at baseline: clean
- Version: `1.6`
- Electron dependency: existing repository version; no dependency changes
  authorized or planned.

### Connector

- Repo: `/home/eclypso/a0/a0-connector`
- Branch: `development`
- HEAD: `7a5095f`
- Worktree at baseline: clean
- Development CLI: `/home/eclypso/a0/a0-connector/.venv/bin/a0`
- CLI version: `2.11`

### Live Agent Zero

- Core repo: `/home/eclypso/a0/agent-zero`
- Container: `agent-zero`
- Baseline container ID: `42eb67c9f635`
- Live URL: `http://127.0.0.1:32081`
- `/api/health` baseline: HTTP 200
- Runtime is repo bind-mounted; Core code is not planned to change.

### Desktop

- OS: Ubuntu 24.04
- Desktop: Ubuntu GNOME
- Session: Wayland
- AT-SPI import and focused editable-text replacement were proven during
  planning with a disposable GTK field.
- GNOME Terminal exposes text but not EditableText in the observed AT-SPI tree;
  it must use overlay fallback for reply insertion.

## 4. Existing Architecture to Reuse

### Launcher

- `shell/main.js` owns Instance `WebContentsView` lifecycle and gateway leases.
- `shell/host_access.js` owns stable Instance keys and five Host access scopes.
- `shell/host_gateway.js` owns strict correlated JSONL request/response with the
  `a0 gateway` child.
- Gateway responses already bound strings to 2,048 characters, arrays to 64,
  nesting depth, keys, and total JSONL line length.
- `a0CliLaunchEnv(...)` already passes host and saved credentials securely.
- `findA0CliBinary(...)` already capability-gates gateway candidates.
- Settings already save ports, workspace, Instance defaults, and Host access in
  one state-store operation.
- Shell-owned static credential windows are the secure-window reference for the
  A0 Tag status/result surface.
- No existing global shortcut code; use Electron `globalShortcut` directly.

### Connector

- `a0 headless --new-chat --output jsonl --print` already creates a one-shot
  chat, accepts the prompt on stdin, streams events, and emits `complete`.
- `A0Client.create_chat(agent_profile=...)` already exists.
- `A0Client.upload_attachments(...)` already uploads bounded attachments.
- `ConnectorSession` already accepts:
  - `remote_files_enabled`;
  - `remote_file_write_enabled`;
  - `remote_exec_enabled`;
  - `remember_context`;
  - optional Host Browser and Computer Use managers.
- A capability-silent context-subscribed client does not shadow the gateway:
  Core selectors skip disabled metadata and select the active Launcher gateway.
- `a0 gateway` is tools-only and already exposes correlated stdin commands.
- `ComputerUseManager` already owns platform helper lifecycle and screenshot
  artifacts.
- Wayland backend already owns AT-SPI, portal capture/input, focus verification,
  and JSON stdio helper behavior.

## 5. Persisted and Runtime Shapes

### Persisted state

```js
a0Tag: {
  version: 1,
  enabled: false,
  instanceKey: "",
  defaultProfile: ""
}
```

- Older state files tolerate absence and normalize to disabled.
- Disabled settings retain selected Instance/profile.
- No profile-list cache is persisted.
- No shortcut customization is persisted in the MVP.
- No query, context, response, screenshot ref, child PID, or native token is
  persisted.

### Sanitized renderer runtime

```js
{
  config: { enabled, instanceKey, defaultProfile },
  shortcut: "CommandOrControl+Shift+Enter",
  status: "disabled|waiting_for_instance|waiting_for_gateway|needs_computer_use|needs_cli_update|shortcut_conflict|ready|running|error",
  message: "...",
  profiles: [{ key, label }],
  running: false
}
```

- Keep credentials, native target tokens, invocation text, app context,
  screenshot refs, and model output out of the canonical renderer state.

## 6. Internal Command Contracts

### Gateway feature

```text
a0_tag_v1
```

Advertise only when the local backend supports the tag operations and required
existing Core capabilities are available.

### Profile request

```json
{ "action": "a0_tag_profiles" }
```

Result fields:

```json
{
  "default_profile": "agent0",
  "profiles": [{ "key": "agent0", "label": "Agent 0" }]
}
```

### Capture request

```json
{ "action": "a0_tag_capture" }
```

Bounded result fields:

```json
{
  "target_token": "opaque",
  "tag_text": "@a0 ...",
  "query": "...",
  "profile_override": "developer",
  "app_name": "...",
  "window_title": "...",
  "focused_text_chunks": ["..."],
  "tree_chunks": ["..."],
  "attachment_ref": "/a0/usr/uploads/...png",
  "screenshot_status": "attached|unavailable"
}
```

### Explicit attachment upload request

```json
{
  "action": "a0_tag_upload",
  "paths": ["/absolute/user-selected/file", "/absolute/user-selected/folder"]
}
```

Bounded result fields:

```json
{
  "attachment_refs": ["/a0/usr/uploads/unique-safe-name.ext"]
}
```

- Only shell-owned native chooser results may populate `paths`.
- The gateway validates absolute existing paths, expands regular folder files
  without nested symlinks, reads/uploads within the request bounds, and returns
  no host path or file bytes.
- `--attachment-ref` remains the only tagged-headless transport and is
  repeatable; prompt text remains on stdin.

### Apply request

```json
{
  "action": "a0_tag_apply",
  "target_token": "opaque",
  "replacement": "field-ready text"
}
```

- Exact native revalidation is mandatory.
- Empty replacement is not needed for the approved MVP action path.

### Release request

```json
{ "action": "a0_tag_release", "target_token": "opaque" }
```

### Native helper actions

```text
tag_context
tag_replace
tag_release
```

- Launcher-only manager calls, not remote agent tool actions.
- Native target state stays in the helper.
- One target slot is sufficient for the one-invocation MVP.

## 7. Security and Failure Invariants

- Prompt and app context travel through stdin, not argv.
- Native attachment paths stay in the shell/gateway command and never enter the
  sandboxed renderer, tagged argv, canonical Settings state, or prompt context.
- File bytes travel only from the existing gateway process to the selected
  Instance through `A0Client.upload_attachments`; Launcher does not create a
  second HTTP/authentication path.
- Credentials remain environment-only and shell-owned.
- No raw IPC/process surface reaches the renderer.
- No generic gateway command surface reaches the renderer.
- No sensitive invocation data is logged.
- Overlay content is rendered via `textContent` only.
- Overlay window: context isolation, sandbox, no Node integration, static local
  content, narrow Copy/Dismiss intent only.
- Global shortcut is registered only while all lease conditions hold.
- Shortcut conflict/portal refusal becomes a visible status, never a fallback
  keyboard hook.
- Protected fields fail before context/screenshot capture.
- Replacement fails closed if app/window/element/focus/text/range changed.
- Wayland replacement must best-effort restore the original tag if deletion
  succeeds but insertion fails.
- Terminal surfaces never receive simulated multiline replacement or Enter.
- Launcher never auto-submits in replace mode.
- In action mode, only Agent Zero's ordinary Computer Use tools may submit.
- Malformed final delivery markers never cause field insertion.
- Closing/pausing the lease prevents insertion and host-tool effects through
  that gateway.
- Do not claim killing the observer cancels a server-side Agent Zero run.

## 8. Implementation Status

### Ledger and baseline

- [x] Create explicit implementation goal.
- [x] Re-read applicable Launcher/Connector/Computer Use/test DOX contracts.
- [x] Confirm both worktrees clean at baseline.
- [x] Confirm live Ubuntu/Wayland/container/CLI facts.
- [x] Create this ledger before feature-code edits.

### Connector: headless tagged run

- [x] Add CLI arguments with validation.
- [x] Extend `HeadlessOptions` without importing Textual.
- [x] Construct capability-silent `ConnectorSession` in launcher-tag mode.
- [x] Create new chat with requested profile.
- [x] Validate, deduplicate, bound, and attach repeated remote upload references.
- [x] Keep prompt on stdin.
- [x] Suppress terminal completion notification.
- [x] Parse exact replace/action marker.
- [x] Emit normalized `tag_result` JSONL.
- [x] Fail malformed marker to overlay-safe JSONL result.
- [x] Add focused entrypoint/headless/session tests.

### Connector: gateway commands

- [x] Advertise `a0_tag_v1` only for an `a0-tag` backend.
- [x] Add `a0_tag_profiles` using existing profile settings helper.
- [x] Add `a0_tag_capture` with Computer Use scope gating.
- [x] Add `a0_tag_upload` for explicitly native-selected files/folders using the
  existing authenticated client; return only bounded remote references.
- [x] Upload only a backend-supplied, verified bounded screenshot using the
  existing client session; current Wayland supplies none.
- [x] Add `a0_tag_apply` exact replacement command.
- [x] Add idempotent `a0_tag_release`.
- [x] Keep command results correlated and bounded.
- [x] Add gateway unit/contract tests.

### Connector: Computer Use manager

- [x] Add private tag context/apply/release manager methods.
- [x] Keep these out of agent-visible remote action metadata.
- [x] Normalize helper errors and cleanup.
- [x] Ensure gateway close clears tag target.
- [x] Add manager/contract tests.

### Wayland helper

- [x] Read focused accessible and reject protected/password fields.
- [x] Resolve the active top-level app/window.
- [x] Extract current logical line and codepoint caret.
- [x] Parse tag grammar and query/profile override.
- [x] Build bounded active-window tree/context.
- [x] Capture active-window screenshot or return explicit text-only status.
- [x] Store one opaque target with exact original range/text.
- [x] Revalidate same app/window/element/focus/range/text.
- [x] Replace exact span through AT-SPI EditableText.
- [x] Restore original tag best-effort after partial failure.
- [x] Release target on command/session close.
- [x] Keep stdout pure JSON.
- [x] Add Wayland package tests using fakes; no real portal in unit tests.

### Launcher persistence and settings

- [x] Add tolerant state normalization/default.
- [x] Add combined Settings write/read result for A0 Tag.
- [x] Add canonical renderer defaults.
- [x] Add A0 Tag Settings sub-tab.
- [x] Add enable, Instance, profile, shortcut, and status controls.
- [x] Load live profiles only through named shell action/gateway request.
- [x] Persist inactive-tab edits through the single Save action.
- [x] Preserve per-section dirty/error behavior.
- [x] Add state-store/settings renderer tests.

### Launcher controller

- [x] Add one shell-owned controller module with focused tests.
- [x] Derive selected open tab/detached lease readiness.
- [x] Register/unregister exact Electron shortcut.
- [x] Handle portal/shortcut registration failure visibly.
- [x] Request capture from selected gateway.
- [x] Resolve bare/default and suffixed/exact profile.
- [x] Compose prompt with untrusted-context delimiters and mode contract.
- [x] Reuse selected CLI/host/workspace/credential environment.
- [x] Spawn tagged headless child with strict stdio/JSONL bounds.
- [x] Never put prompt/context/credentials in argv/logs.
- [x] Enforce one active invocation.
- [x] Consume `tag_result` and branch replace/action.
- [x] Replace through `a0_tag_apply` only for valid replace results.
- [x] Release target on every completion/error/lifecycle path.
- [x] Cancel local insertion eligibility when lease/config changes.
- [x] Add controller lifecycle/parser/spawn tests.

### Launcher status/result window

- [x] Add static secure HTML/CSS/JS assets.
- [x] Avoid a working BrowserWindow on Linux Wayland so the origin field keeps
  focus; retain shell runtime status and show result/error only after work.
- [x] Show interactive result/error/action-summary overlay after completion.
- [x] Copy through one narrow shell-owned action.
- [x] Dismiss without changing app state.
- [x] Render all model/error text with `textContent`.
- [x] Add secure-window policy tests where existing patterns permit.

### Launcher command palette expansion (2026-08-30 follow-up)

- [x] Record the two user-reported failure shapes: Chrome browser chrome does
  not expose an accessible focused editable target, while a rich chat composer
  can expose text/caret semantics that do not satisfy exact tag-at-caret
  replacement.
- [x] Choose a graceful palette fallback at the shared controller capture seam;
  do not weaken the native helper's exact-replacement checks per application.
- [x] Add strict parser/normalizer coverage for palette submit/cancel intents,
  bounded query, exact live profile selection, and `window`/`computer` scope.
- [x] Extend the existing static A0 Tag surface with the Agent Zero triangle,
  local Rubik composer, draggable header, profile selector, target selector,
  send button, keyboard behavior, and accessible labels.
- [x] Open/focus the palette for only the allowlisted recoverable capture error
  codes; protected fields and all authority/runtime failures must retain their
  explicit error result.
- [x] Close the palette before tagged headless execution, preserve one active
  invocation, and reuse the same lease/profile/CLI/credentials/chat path.
- [x] Compose a palette-aware untrusted-context prompt that forbids Launcher
  replacement, distinguishes focused-app from computer-wide intent, and leaves
  action versus returned-text judgment with the Main model.
- [x] Update Settings/status copy so users understand both inline tags and the
  anywhere composer without adding another preference.
- [x] Run focused shell tests, syntax checks, CSP/static-surface assertions, and
  `git diff --check`.
- [x] Live-prove on Ubuntu that a real inaccessible focused surface opens the
  composer; the composer is focused and exposes a native drag region; cancel is
  quiet; focused-app Computer Use restores the origin app; computer scope uses
  a per-invocation profile; and inline Unicode replacement still bypasses the
  palette.
- [ ] Manually drag the real palette and invoke it from the already-open Chrome
  omnibox and Discord composer. Automated Chrome foreground activation is
  rejected by GNOME/AT-SPI, so this final app-specific feel check stays with a
  human shortcut rather than adding unsafe focus machinery.
- [x] Inspect the created chat, gateway/Launcher logs, child cleanup, shortcut
  registration, and final persisted state. Record exact evidence here.

### Original-composer fidelity, Whisper readiness, and attachments (2026-08-30 follow-up)

- [x] Trace the live Agent Zero `chat-bar-input.html`, `bottom-actions.html`,
  attachment store/send path, `_whisper_stt` store, plugin status endpoint, and
  Connector upload client before editing.
- [x] Change exact title and placeholder copy.
- [x] Replace approximate input background/focus/send styling with the original
  composer color-mix, border, shadow, radius, spacing, and send-blue values.
- [x] Remove microphone border/background in every state; retain only original
  color and SVG scale interactions plus an accessible focus outline.
- [x] Add the original-style `+` and upward Attach file/Attach folder menu with
  dynamic window expansion that keeps the compact closed palette at 690 × 170.
- [x] Use native Electron dialogs and keep selected host paths out of renderer
  state; show only a compact removable summary.
- [x] Add correlated gateway upload, bounded regular-file folder expansion,
  generic MIME-aware upload creation, and repeated safe tag references.
- [x] Preserve the captured inline screenshot plus every explicit palette
  attachment in the same tagged UserMessage.
- [x] Query exact leased Instance Whisper status before recording and show
  first-use preparation/download/load information in the footer.
- [x] Add focused parser, status normalization, lease, window-resize, path
  privacy, multi-ref, generic-file, gateway-upload, and static surface tests.
- [x] Playwright-inspect default, menu, selected-attachment, and Whisper-status
  states at native dimensions with geometry/overflow measurements.
- [x] Run complete Launcher shell and Connector suites plus final diff checks;
  the only Connector failure is the already-recorded unrelated Browser fixture
  drift.
- [ ] Restart the normal local-content Launcher and perform the native-dialog
  smoke test against the selected live Instance lease.

### DOX

- [x] Update Launcher root architecture contract.
- [x] Update `shell/AGENTS.md` gateway/settings/window contracts.
- [x] Update renderer/component Settings contracts.
- [x] Update Docker Manager state persistence contract.
- [x] Update Connector root/CLI/gateway contracts.
- [x] Update platform package contracts for tag helper actions.
- [x] Confirm test behavior is covered by the owning contracts; no separate
  tests DOX change is required.

### Ubuntu verification

- [x] Connector focused tests.
- [x] Launcher focused tests.
- [x] Full relevant syntax/static checks at the live-MVP checkpoint.
- [x] `git diff --check` in both repos at the live-MVP checkpoint.
- [x] Confirm no secrets/runtime state in diffs.
- [x] Confirm no Core/plugin change requires sync or container restart.
- [x] Start Launcher with local content and development CLI override.
- [x] Verify the fixed shortcut through the reversible GNOME Wayland native
  binding fallback; this desktop does not expose the GlobalShortcuts portal.
- [x] Verify exact replace flow in an independent native GTK text editor.
- [ ] Repeat the same flow manually in GNOME Text Editor with a human shortcut
  press; automation cannot move its native caret under this Wayland session.
- [ ] Verify hybrid tool-assisted replace flow.
- [x] Verify local safe form action without submit.
- [ ] Verify local safe form action with explicit submit.
- [ ] Verify Text Editor document-wide action flow.
- [ ] Verify Google Keep PWA behavior.
- [ ] Verify Discord behavior without external side effects.
- [x] Verify Terminal overlay fallback.
- [x] Verify semantically protected-field rejection before screenshot.
- [x] Verify default and suffixed `developer` profiles.
- [x] Verify untrusted Wayland window geometry fails closed to text/tree-only
  context instead of uploading a monitor crop.
- [ ] Verify inherited file/browser/exec/Computer Use scopes.
- [ ] Verify scope revocation takes effect immediately.
- [x] Verify changed target fails closed and recoverable command errors do not
  poison the connected Host access lease.
- [x] Verify disable and app/tab lifecycle unregister shortcut and release
  target/helper without ending unrelated user shortcuts.
- [x] Verify packaged Linux AppImage shortcut identity and core flow.
- [x] Inspect recent Agent Zero/Launcher logs for task-related errors.

### Remote platform gates

- [x] Ubuntu acceptance complete; ask user for Mac Mini.
- [ ] Implement/verify macOS tag capture/replace and packaged permissions.
- [ ] macOS acceptance complete; ask user for Windows 11.
- [ ] Implement/verify Windows tag capture/replace and packaged permissions.

## 9. Immediate Work Queue

1. The user opens the selected Instance tab and feel-tests native file/folder
   selection, voice first-use information, dragging, and Chrome/Discord
   invocation. The selected tab lease restores `ready` and the guarded shortcut
   exactly as before.
2. Once that Ubuntu feel check is accepted, request the Mac Mini and resume the
   existing macOS then Windows platform gates.

## 10. Verification Commands

### Connector

```bash
cd /home/eclypso/a0/a0-connector
./.venv/bin/python -m pytest tests/test_entrypoint.py tests/test_headless.py -q
./.venv/bin/python -m pytest tests/test_gateway.py tests/test_attachments.py -q
./.venv/bin/python -m pytest tests/test_computer_use.py tests/test_computer_use_contract.py tests/test_wayland_backend_package.py -q
./.venv/bin/python -m pytest tests/ -q
git diff --check
```

## 10A. Ubuntu QA Inventory (Playwright + Native Desktop)

Use this inventory for both functional and visual signoff. Renderer inspection
does not substitute for native shortcut/accessibility proof, and native success
does not substitute for inspecting the Settings/overlay surfaces.

| Claim or control/state | Functional check | Visual state/evidence |
| --- | --- | --- |
| A0 Tag is default-off | Fresh/absent state normalizes disabled; shortcut is not registered | Settings tab shows off switch and Disabled status |
| Settings exposes one opt-in, exact Instance, default profile, fixed shortcut | Navigate with normal clicks; select Instance/profile; save once; reload and confirm persistence | Screenshot full A0 Tag tab at launched size and minimum Launcher size |
| Profile list comes from selected live Instance | Open live Instance tab; select it; request profiles through named action; confirm real keys | Profile selector populated without clipping or stale placeholder |
| Feature obeys the open tab/detached lease | Close/disconnect selected Instance and confirm status/shortcut become unavailable; reopen/reconnect and confirm Ready | Ready, waiting, and Computer Use-required status copy is readable |
| Explicit shortcut only | With enabled ready lease, type tag and press Ctrl+Shift+Enter; ordinary typing alone does nothing | Portal prompt/desktop behavior observed; no passive UI indicator while typing |
| Replace mode edits only the exact tag span | Text Editor tag becomes model result, surrounding text remains, no Enter/submit | Before/after field and brief completion overlay |
| Unsupported editable surface fails to overlay | Terminal invocation produces result overlay rather than simulated multiline typing | Interactive overlay readable with Copy/Dismiss |
| Action mode can operate the foreground app | Local reversible form task uses ordinary Computer Use and removes/handles raw tag | Action summary overlay; form reflects requested state |
| Action mode may explicitly submit | Local disposable form submits only when the tag asks; raw tag absent from submission | Submitted local result, no external side effect |
| Main model owns replace/action | Inspect new chats for exact hidden marker and behavior; Launcher has no intent keyword branch | WebUI shows human result without marker text |
| Context never leaks an unverified monitor crop | Inspect current Wayland tagged chat and upload timestamps | `screenshot_status: unavailable`, compositor notice present, no attachment |
| Existing gateway scopes are inherited | Exercise one safe file/browser/exec-assisted tag; revoke a scope and confirm immediate failure/change | Settings continues to show only Host access scopes, no duplicate matrix |
| Protected fields fail before capture | Invoke in a local password field and verify explicit rejection/no new screenshot/chat | Error overlay contains no protected text |
| Changed target fails closed | Change/focus the field while a slow run is active; confirm no insertion | Error/result overlay, edited field preserved |
| Busy state has no queue | Invoke twice during one run; second shortcut resurfaces working state; one new chat only | Non-activating working overlay remains compact |
| Secure overlay | Copy and Dismiss work; model text is literal; no HTML execution | Working, success, warning, and error surfaces inspected |
| Packaged behavior | Build AppImage, repeat shortcut identity and one replace flow | AppImage surface/portal registration behaves like development build |

Exploratory scenarios:

1. Switch Launcher Home while the selected Instance tab remains open, detach and
   reattach it, then trigger A0 Tag to find accidental active-tab coupling.
2. Disable Computer Use or disconnect Host access while an invocation is
   running, then restore it, to find stale insertion or implicit reconnect.
3. Use non-ASCII text before and inside the tag to exercise native codepoint
   offsets against JavaScript/JSON boundaries.
4. Put marker-like text and HTML in the origin context/result to verify prompt
   delimiting and literal overlay rendering.

### Launcher

```bash
cd /home/eclypso/a0/a0-launcher
node --check shell/main.js
node --check shell/preload.js
node --check app/docker_manager.js
node --test shell/host_access.test.js shell/host_gateway.test.js shell/instance_tabs.test.js
git diff --check
```

### Live development launch

```bash
cd /home/eclypso/a0/a0-launcher
A0_CLI_PATH=/home/eclypso/a0/a0-connector/.venv/bin/a0 \
A0_LAUNCHER_LOCAL_REPO=/home/eclypso/a0/a0-launcher \
npm start
```

## 11. Evidence Log

### 2026-08-30 — planning and feasibility

- Reference projects inspected:
  - `Anil-matcha/open-claude-tag`: Slack mention routing and serialized reply.
  - `CopilotKit/OpenTag`: channel mention/subscription/run/post pattern.
- Reusable concept: explicit trigger -> route -> run -> reply.
- Not reusable: neither project contains global shortcut, accessibility context,
  safe native replacement, app takeover, or Launcher tab lease code.
- Electron official `globalShortcut` supports out-of-focus shortcuts; Wayland
  uses the desktop GlobalShortcuts portal.
- Disposable GTK/AT-SPI proof successfully replaced
  `@a0 write a haiku` with a generated string using explicit EditableText calls.
- GNOME Terminal observation confirmed text-readable but non-EditableText
  behavior, validating the overlay fallback requirement.
- Agent Zero Core selector trace confirmed disabled context-local host metadata
  falls through to the active Launcher gateway.
- Main-model mode signal tested with the repository's actual Marked renderer:
  the A0 Tag HTML comment remains a non-rendered comment before visible text.

### 2026-08-30 — implementation start

- Goal created.
- Applicable skills and DOX contracts reread.
- Launcher and Connector worktrees clean.
- Live Agent Zero health returned HTTP 200 on `32081`.
- Ledger created before feature code.

### 2026-08-30 — tagged headless vertical slice

- Added `--launcher-tag`, `--agent-profile`, and `--attachment-ref` to the
  headless entrypoint.
- Launcher-tag validation requires new chat, JSONL, one-shot print mode, and a
  bounded profile key.
- Attachment refs are restricted to one safe basename directly under
  `/a0/usr/uploads/`.
- Tagged sessions set local file read/write and execution false, omit Browser
  and Computer Use managers, and disable remembered context.
- Raw context events are suppressed from tagged stdout; only readiness,
  normalized `tag_result`, errors, and `complete` remain.
- Final snapshot text wins over earlier streamed assistant text before marker
  parsing.
- Focused verification:

```text
./.venv/bin/python -m pytest tests/test_entrypoint.py tests/test_headless.py tests/test_session.py -q
45 passed in 0.42s
```

### 2026-08-30 — gateway and Wayland vertical slice

- Added private `tag_context`, `tag_replace`, and `tag_release` manager/helper
  operations without widening `_SUPPORTED_ACTIONS`.
- Added `a0-tag` only to builtin and packaged Wayland backend features; macOS
  and Windows remain gated until their machine phases.
- Wayland tag capture resolves the focused field and enclosing window, rejects
  protected/password fields before context work, parses native Unicode offsets,
  reports screenshot unavailable because compositor bounds are unverified, and
  stores one 15-minute opaque target.
- Replacement checks the same focused path/window and exact original substring;
  failed insertion restores the original tag best-effort.
- Gateway profile/capture/apply/release commands are correlated. If a future
  backend supplies a verified screenshot artifact, base64 is decoded inside the
  gateway and uploaded with the existing authenticated attachment API before
  the small remote ref reaches Launcher.
- Combined focused verification:

```text
./.venv/bin/python -m pytest tests/test_entrypoint.py tests/test_headless.py tests/test_session.py tests/test_gateway.py tests/test_computer_use.py tests/test_computer_use_contract.py tests/test_wayland_backend_package.py tests/test_attachments.py -q
165 passed in 0.82s
```

### 2026-08-30 — Launcher persisted/UI/controller vertical slice

- Added tolerant `a0Tag` state with version, default-off enable switch, exact
  stable Instance key, and bounded default profile. An incomplete enabled A0
  Tag section keeps its previous valid value while the other Settings sections
  still save.
- Added the A0 Tag Settings tab with Instance/profile selectors, fixed shortcut,
  live lease status, and explicit copy explaining opt-in behavior and inherited
  Host access permissions.
- Profile discovery crosses the renderer boundary only through the named
  `getA0TagProfiles` action; no generic gateway command was exposed.
- Added `shell/a0_tag.js` to own lease readiness, Wayland portal shortcut
  registration, one active invocation, immediate native capture, exact
  case-insensitive profile resolution, untrusted-context prompt composition,
  capability-silent headless spawn, strict bounded JSONL parsing, mode routing,
  exact apply, and release cleanup.
- The headless prompt and app context use stdin. Only CLI flags, selected host,
  workspace, profile key, and an already-uploaded screenshot ref appear in
  argv; credentials remain in the existing environment handoff.
- Added a static sandboxed overlay with no preload, no Node integration, a
  restrictive CSP, `textContent` rendering, click-through inactive progress,
  and only exact shell-owned Copy/Dismiss navigation intents.
- Linux enables Electron's native `GlobalShortcutsPortal`. If GNOME Wayland
  does not expose that portal, Launcher installs one reversible GNOME custom
  media-key binding that signals the current Launcher PID; it preserves all
  other bindings and exists only while the exact selected lease is ready.
- Current focused Launcher evidence:

```text
node --test shell/a0_tag.test.js shell/docker_manager/state_store.test.js app/components/docker-manager/settings/settings.test.mjs
8 passed
```

### 2026-08-30 — full static/unit regression checkpoint

- Full Launcher `node --test` discovery completed with 672 tests: 669 passed,
  3 skipped, 0 failed. The command also discovered copied distribution tests;
  no failure was hidden by focused selection.
- Full Connector suite completed with 807 passed, 1 skipped, and 1 unrelated
  failure. The failure is the existing Browser plugin configuration fixture:
  the sibling live Agent Zero repository now persists `keyboard_layout` and
  `keyboard_variant`, while the old Connector assertion expects neither. A
  focused retry reproduced the same mismatch; no unrelated fixture was edited.
- Connector A0 Tag focused suite completed with 165 passed.
- Both Wayland helper copies compile; Launcher changed JavaScript parses;
  `git diff --check` passed in both repositories.
- Latest focused additions after the live edge cases:

```text
node --test shell/a0_tag.test.js shell/host_gateway.test.js
29 passed

./.venv/bin/python -m pytest tests/test_wayland_backend_package.py -q
42 passed
```

### 2026-08-30 — Settings visual and live lease evidence

- Settings was inspected through a real Electron launch, not a static HTML
  render. At 1280x735 the fourth visible Settings tab, controls, status, and
  Save button fit cleanly. At the 800x600 outer minimum, Settings scrolls
  internally without horizontal overflow and Save remains reachable.
- Evidence images created outside the repositories:
  - `/tmp/a0-tag-qa/settings-initial.png`
  - `/tmp/a0-tag-qa/settings-small-initial.png`
- The live selected Instance is the exact local container key
  `local:42eb67c9f635a5bb582a35a6ff1793463784cbea7167e199b48d82119ba0b20a`.
- Live Host access had master enabled plus file read/write, code execution,
  Browser, and Computer Use. Gateway metadata advertised `a0_tag_v1`, Wayland
  backend feature `a0-tag`, and the existing persistent Computer Use token.
- Live profile discovery returned Agent 0, Minimal, Developer, Hacker,
  Researcher, and Tiny Local. The profile selector retains that list across
  Save/reload instead of rendering the selected profile as unavailable.

### 2026-08-30 — GNOME Wayland shortcut discovery and fallback

- `org.freedesktop.portal.Desktop` on this Ubuntu session does not expose
  `org.freedesktop.portal.GlobalShortcuts`; Electron therefore correctly
  returned `false` despite `GlobalShortcutsPortal` being enabled.
- Existing GNOME custom keybindings contained only the user's Ulauncher entry
  at `custom0` with `<Super>space`; no Ctrl+Shift+Enter conflict existed.
- Launcher fallback registered exactly:

```text
name:    Agent Zero Tag
binding: <Control><Shift>Return
command: /bin/kill -USR2 <current Launcher PID>
```

- The fallback is Linux + GNOME + Wayland only, uses native `gsettings`, adds
  no daemon/dependency/key listener, checks conflicts, preserves every foreign
  binding, removes only its own entry on lease loss/shutdown, and cleans a stale
  own entry on the next startup after an abnormal exit.
- Graceful Launcher shutdown was observed to remove `a0-tag` while retaining
  the user's `custom0` binding and terminating the outbound gateway/helper.

### 2026-08-30 — first live invocation failure and owner-correct fixes

- First shortcut activation spawned the packaged Wayland helper but failed on
  a stale focused AT-SPI node from an inactive application. A full desktop scan
  showed GNOME and Codex retaining historical `FOCUSED` states while the GTK
  editor's containing frame alone had the active lineage.
- The helper now searches active top-level windows first and chooses the
  deepest readable focused descendant. A fake multi-app regression proves an
  inactive focused decoy is ignored. Both source and packaged helper copies
  contain the same fix.
- Second attempt captured and ran the model, but Electron's supposedly
  non-focusable working BrowserWindow became the active GNOME Wayland surface.
  Exact revalidation correctly rejected insertion with
  `A0_TAG_TARGET_CHANGED`.
- Linux Wayland now suppresses the in-progress BrowserWindow. Runtime status
  still reports `running`; success/error/action overlays appear only after the
  target-sensitive work. Other platforms retain the compact working surface.
- Recoverable A0 Tag gateway results now request `statusOnError: false`; the
  error still rejects with its structured code/result, while the shared Host
  access status stays connected. Setup/contract failures retain the existing
  actionable-status behavior and regression.

### 2026-08-30 — Ubuntu live replacement acceptance

- Origin: an independent native GTK 4 text editor with active/focused
  EditableText and caret exactly after the tag.
- Invocation was activated by the exact command installed in the GNOME native
  binding, exercising the real Launcher signal/controller path.
- A0 CLI child argv proved one-shot new-chat behavior, default profile
  `agent0`, and the already-uploaded `/a0/usr/uploads/a0-tag-window.png` ref;
  prompt/context remained on stdin.
- New chat evidence: `/a0/usr/chats/EVmz9Sjo/chat.json`, chat name
  `A0 Tag Ubuntu`, profile `agent0`, created 2026-08-30 05:00:42 local time.
- Chat contains the explicit request, app/window identity, bounded focused
  text, active-window AT-SPI tree, and one screenshot attachment. The Main
  model returned the exact first-line replace marker.
- Exact native result:

```text
Before A0 Tag
@a0 Reply with exactly: A0 TAG UBUNTU MVP
After A0 Tag

became

Before A0 Tag
A0 TAG UBUNTU MVP
After A0 Tag
```

- No Enter/submit occurred. Only the captured tag range changed; both
  surrounding lines remained exact. Launcher and the gateway returned to
  `ready`/`connected`, and no result window remained after the brief success.

### 2026-08-30 — Ubuntu live Computer Use action acceptance

- Origin: independent native GTK 4 action fixture with a focused tag field,
  `Mark completed` button, and `WAITING` status label. This fixture has no
  external side effect and is not part of either repository.
- New chat evidence: `/a0/usr/chats/mg7mfrVL/chat.json`, chat name
  `A0 Tag Action`, profile `agent0`.
- The Main model chose the action path, loaded `host-computer-use-linux`,
  started an ordinary persistent Wayland Computer Use session, listed native
  windows, resolved the exact window state, and pressed button
  `element_index=3` with actual background dispatch.
- It captured a fresh verification frame, observed `WAITING` change to
  `ACTION COMPLETE`, stopped the Computer Use session, and returned:

```html
<!--a0-tag:v1;mode=action-->
Clicked the "Mark completed" button in the A0 Tag Action MVP window; its status label changed from WAITING to ACTION COMPLETE.
```

- Launcher left the action summary out of the origin field and rendered it in
  the secure Copy/Dismiss overlay. The raw tag was not posted or submitted.
- Total action latency was about 99 seconds because the Main model followed the
  full skill/status/start/list/state/press/capture/stop verification loop. This
  is functionally correct and a future performance/eval target, not a reason to
  add a Launcher-side intent classifier.

### 2026-08-30 — profile override and failure recovery acceptance

- Mixed-case `@A0.Developer` resolved case-insensitively to exact key
  `developer`. The headless argv used `--agent-profile developer`.
- New chat `/a0/usr/chats/pkPIju3i/chat.json` stored profile `developer`, chat
  name `A0 Tag Profile`, and the exact replace marker/result. The origin became
  `Before profile tag / A0 TAG DEVELOPER PROFILE / After profile tag` with the
  surrounding lines preserved.
- A GNOME Text Editor field with the caret away from the tag produced the
  explicit error `Place the caret at the end of the A0 Tag request.` No model
  child or new chat was needed. The secure error overlay rendered only that
  bounded message.
- After that recoverable capture error, Host access remained `connected` with
  empty code/message and A0 Tag immediately returned to `ready`; no reconnect
  or tab restart was required.

### 2026-08-30 — packaged Linux AppImage acceptance

- `npm run desktop:dist:linux` completed without installing dependencies and
  created `dist/desktop/linux/a0-launcher-1.6.0.AppImage`.
- Artifact size: 136,335,716 bytes.
- SHA-256:
  `4b35748b743fee5ef5cdf8b265507d1a8388d7109cdbc142880d4c2dc01c60c5`.
- Packaged Electron launched from its AppImage mount with
  `GlobalShortcutsPortal` enabled and the development Connector selected only
  through `A0_CLI_PATH` for this unreleased capability test.
- Startup removed the deliberately stale empty `a0-tag` binding left by the
  prior interrupted development process. After the exact Instance tab became
  connected, it registered a new binding to the packaged Electron PID and
  reported A0 Tag `ready` with gateway feature `a0_tag_v1`.
- The current public v1.6 release has no `content.json` asset, so packaged
  startup reused the existing cached renderer content. This renderer predates
  the new Settings panel, but the packaged current shell/controller consumed
  the already-persisted A0 Tag configuration. Release/content publication is a
  later release task and was not performed here.
- Invoking mixed-case `@A0.Developer` through that packaged binding created new
  chat `/a0/usr/chats/NS2Ee1SU/chat.json` with profile `developer`, returned the
  exact replace marker, and changed only the captured tag span to
  `A0 TAG DEVELOPER PROFILE`. Packaged runtime returned to `ready`/`connected`.
- Closing the packaged main window through the real renderer lifecycle exited
  the AppImage with code 0, stopped gateway/helper children, removed only the
  `a0-tag` GNOME path, and preserved the user's Ulauncher `custom0` binding.

### 2026-08-30 — final source hardening and regression checkpoint

- Capture attachment names are now immutable per invocation:
  `a0-tag-<uuid4 hex>.png`. The earlier fixed `a0-tag-window.png` name could
  overwrite a prior chat's screenshot while the chat continued to reference
  that path. UUID naming fixes the owner boundary in the gateway upload call
  without a new storage abstraction or dependency.
- A private tag portal/helper session now stops after `a0_tag_release`, and a
  failed `tag_context` stops it before returning its error. The selected
  Instance's outbound `a0 gateway` child remains alive; only the capture lease
  is ephemeral.
- Exact Wayland apply now revalidates the captured process/window identity as
  well as the element path, focus, text, and range. Capture also requires an
  active application/window and rejects a logical line when 4,096 characters
  after the caret are insufficient to find its end.
- The GNOME fallback command now reads `/proc/<pid>/stat` and compares the
  process start-time field before sending `SIGUSR2`. A stale binding therefore
  cannot signal an unrelated process that later reuses the Launcher's PID.
- Linux Wayland working/busy feedback uses Electron's non-focusing native
  system notification. The result/error overlay remains a sandboxed window;
  no target-sensitive progress BrowserWindow is created.
- Invocation now re-reads persisted A0 Tag Settings before resolving the live
  lease. A complete test-suite run found the previous cached-refresh order
  masking the intended Settings read error with `resolveLease is not a
  function`; changing that shared entry call from `refresh()` to `sync()`
  fixed the root path and the regression test.
- Current source-only Launcher suite (excluding generated distribution copies):

```text
343 discovered
342 passed
1 skipped
0 failed
```

- Current A0 Tag/Host access/Settings focused Launcher suite: 34 passed.
- Current focused Connector suite across entrypoint, headless, session,
  gateway, Computer Use, Wayland package, and attachments: 170 passed.
- Current complete Connector suite: 812 passed, 1 skipped, 1 unrelated
  failure. The failure remains
  `test_browser_runtime_endpoint_updates_browser_plugin_config`: the sibling
  Agent Zero Browser runtime now persists `keyboard_layout` and
  `keyboard_variant`, while the older Connector fixture omits them. No
  unrelated fixture was changed.
- `compileall`, all changed JavaScript syntax checks, `git diff --check`, and
  focused tests passed in both repositories.

### 2026-08-30 — final current-source Ubuntu replacement proof

- Development Launcher main PID `1803382` registered the exact guarded GNOME
  command against Linux process start time `32765532`:

```text
/bin/sh -c 'stat=$(/bin/cat /proc/1803382/stat 2>/dev/null) || exit 0;
rest=${stat##*) }; set -- $rest;
[ "${20}" = "32765532" ] && /bin/kill -USR2 1803382'
```

- The command installed in GNOME Settings was executed verbatim, exercising
  the native binding command, signal handler, current controller, current
  gateway, current helper, and current headless CLI.
- Origin was the independent GTK text fixture with mixed-case
  `@A0.Developer`; AT-SPI reported the exact active frame and focused editable
  descendant.
- New chat: `/a0/usr/chats/ih3Ipkw5/chat.json`, profile `developer`, chat name
  `A0 Tag Profile`.
- New attachment:
  `/a0/usr/uploads/a0-tag-6278946da97a4a9ba6374224ae11cb09.png`, 67,639 bytes,
  SHA-256
  `758b158bb06d8d644419f8cacaf518dfec83886cc0a3e912e93199b360df11a1`.
  The prior fixed screenshot retained a different hash, proving no overwrite.
- Exact native text after apply:

```text
Before profile tag
A0 TAG DEVELOPER PROFILE
After profile tag
```

- The private helper was absent after release; the one outbound gateway child
  remained connected and Computer Use returned to `persistent`. Launcher A0
  Tag returned to `ready`.

### 2026-08-30 — terminal Copy/Dismiss fallback proof

- Origin was GNOME Terminal running a bounded local `read -e` fixture whose
  focused AT-SPI terminal text ended in:
  `@a0 Reply with exactly: A0 TAG TERMINAL FALLBACK`.
- AT-SPI exposed readable Text but no EditableText, so direct replacement was
  unavailable by construction. The guarded GNOME command triggered the same
  live invocation path.
- New chat: `/a0/usr/chats/8lGmXRE4/chat.json`, profile `agent0`, chat name
  `A0 Tag Invocation`.
- Unique attachment:
  `/a0/usr/uploads/a0-tag-7e9ee0a56ccd4176b31bd1dfa1ba3821.png`.
- The Main model returned the exact replace marker and
  `A0 TAG TERMINAL FALLBACK`. Launcher preserved the terminal prompt byte for
  byte and showed a sandboxed result overlay containing only the answer plus
  Copy and Dismiss. It did not type, simulate Enter, or execute the tag.
- The helper stopped after release, the gateway remained connected, and A0 Tag
  returned to `ready`.

### 2026-08-30 — protected-field fail-closed proof and platform ceiling

- A real GTK 4 `Gtk.PasswordEntry` exposed AT-SPI role `password text` while
  focused. Invoking A0 Tag returned
  `A0 Tag is unavailable in protected fields.` before creating a chat or a
  screenshot. The latest chat/upload timestamps remained unchanged, the
  private helper stopped, and the shared gateway stayed connected.
- The first diagnostic fixture used an ordinary `Gtk.Entry` with only visual
  masking (`visibility=false`). GTK exposed it to AT-SPI as ordinary role
  `text`, omitted a protected state, and returned the raw Text value. That
  fixture therefore created diagnostic chat `/a0/usr/chats/VzbLVHf8/chat.json`
  and upload
  `/a0/usr/uploads/a0-tag-0bc81aafd7c94ce58f64bb1b5187d95d.png`.
- This is an unavoidable application/platform semantic ceiling: native code
  cannot infer a secret field when the application publishes it as ordinary
  readable text. A0 Tag rejects every protected state/password role the
  accessibility platform reports; applications must use their toolkit's
  semantic password control. It would be unsafe and unusable to reject every
  ordinary single-line text field as a workaround.

### 2026-08-30 — active-window screenshot privacy audit and fail-closed correction

- Final file-by-file audit included opening the rebuilt AppImage attachment
  `/a0/usr/uploads/a0-tag-3bb7a362118f433089ff90d550594d9b.png`
  at original resolution, rather than treating successful upload and PNG
  dimensions as proof of a safe crop.
- The image was **not** bounded to the tagged GTK window. It showed unrelated
  GitHub Desktop and Launcher pixels, with only part of the GTK window visible
  at the lower-right edge. The attachment was therefore a privacy defect and
  invalidated all earlier screenshot acceptance claims in this ledger.
- Root cause was measured directly. For the active 760x420 GTK window, both
  direct and static `Atspi.Component.get_extents(..., SCREEN)` returned
  `(0, 0, 760, 420)` even though the compositor had positioned the window near
  `(353, 166)`. The focused child also proved the coordinate spaces were
  inconsistent: SCREEN returned `(0, 0, 696, 320)`, while WINDOW returned
  `(32, 68, 696, 320)`.
- GNOME's otherwise ideal `org.gnome.Shell.Screenshot.ScreenshotWindow` and
  `org.gnome.Shell.Introspect.GetWindows` D-Bus methods both returned
  `org.freedesktop.DBus.Error.AccessDenied` to the helper process. The existing
  RemoteDesktop portal stream is a monitor source and does not expose the
  active window's compositor origin. `wmctrl` cannot enumerate native Wayland
  GTK windows. There is therefore no owner-correct, permission-compatible,
  native active-window crop on this session.
- The unsafe crop path was removed from both builtin and packaged Wayland
  helpers. Current Wayland A0 Tag now reports:

```text
screenshot_status: unavailable
screenshot_error: The Wayland compositor did not expose verified active-window bounds; A0 Tag continued with text and accessibility context only.
```

- The notice is included in the tagged chat's untrusted-context JSON. No
  monitor frame or base64 crosses Launcher. The bounded active-window AT-SPI
  tree, focused text, app name, and title remain available, and an action-mode
  agent may still use ordinary Computer Use under the inherited permission.
- Gateway upload support remains bounded and uniquely named for a future
  backend that can supply a genuinely verified active-window artifact. A new
  regression keeps upload-failure cleanup owner-correct by releasing the
  native target/private portal session before returning the error.
- The same audit closed two adjacent data-integrity gaps:
  - leading/trailing tabs and newlines in a valid replacement are now preserved
    across Main response -> Connector JSONL -> Launcher -> AT-SPI apply;
  - if an editor accepts insertion but normalizes the inserted value, the
    helper calculates the actual inserted span and restores the original tag
    best-effort before failing.
- Post-release lease refresh errors are now caught inside `invoke()` so the
  global shortcut cannot create an unhandled rejection after a completed or
  failed operation.
- Focused post-correction evidence: 133 Connector tests passed; 34 Launcher
  A0 Tag/Host access/Settings tests passed; compile/syntax/diff checks passed.

### 2026-08-30 — corrected live/package acceptance and restored user state

- Current-source development proof after removing the unsafe crop created chat
  `iwz2E0Bm` with exact profile `developer`, no attachments, explicit
  `screenshot_status: unavailable`, and the compositor-boundary notice. The
  mixed-case profile tag still replaced exactly to `A0 TAG DEVELOPER PROFILE`
  while preserving both surrounding lines.
- The final AppImage was rebuilt from the corrected sources and then exercised
  through its exact guarded GNOME command. Packaged proof created chat
  `ZUE8uFEz`, again with profile `developer`, no attachment, the unavailable
  status/notice, exact replacement, helper teardown, persistent gateway state,
  and A0 Tag returning to `ready`.
- Final artifact:

```text
/home/eclypso/a0/a0-launcher/dist/desktop/linux/a0-launcher-1.6.0.AppImage
size:    136,335,703 bytes
sha256:  34f7ce006140b698537e52f433714586f7038c2dafe682f540f0b78a8e6863d6
```

  This exact hash was launched after the final rebuild, loaded the current
  renderer, exposed the persisted A0 Tag state as `disabled`, and exited with
  code 0 through normal window close.

- Final complete Launcher discovery included source and rebuilt distribution
  copies: 825 discovered, 822 passed, 3 skipped, 0 failed.
- Final focused Connector gate: 173 passed across entrypoint, headless,
  session, gateway, Computer Use, contract, both Wayland helper copies, and
  attachments.
- Final complete Connector suite: 815 passed, 1 skipped, and the same one
  unrelated Browser fixture failure for the sibling runtime's added
  `keyboard_layout` / `keyboard_variant` fields.
- Both helper trees compiled, changed JavaScript parsed, both diffs passed
  whitespace validation, and high-confidence API key/token/private-key scans
  found no secret material.
- A0 Tag was disabled through the real final packaged Settings UI. The persisted
  selection/profile remain for convenience, but `enabled` is false and status
  is `Disabled`.
- Graceful packaged shutdown removed only the Launcher's `a0-tag` path. GNOME
  custom bindings contain only the user's original `custom0` entry. No
  Launcher, AppImage mount, gateway, helper, headless child, GTK fixture, or
  terminal fixture process remains.
- To remove the privacy-defective test images from normal Agent Zero state
  without destroying evidence, all 11 task-created A0 Tag chats and all 5
  task-created A0 Tag uploads were moved to the recoverable ignored backup:

```text
/home/eclypso/a0/agent-zero/tmp/a0-tag-mvp-evidence-20260830T0605/
```

  `/a0/usr/chats` now contains no tagged test chat and `/a0/usr/uploads`
  contains no `a0-tag-*.png`. The backup can be inspected or deleted later by
  explicit user choice.
- No dependency, Core source, version, commit, branch, tag, push, PR, or release
  mutation was performed.

### 2026-08-30 — follow-up: Settings capability toast under normal local launch

#### User-visible report

- The user opened the exact selected `agent-zero` Instance tab, then enabled
  A0 Tag in Settings.
- Profile discovery stayed at `Open the selected Instance to load profiles`.
- Launcher reported:

```text
A0 Tag requires the supported Wayland Computer Use backend and current A0 CLI.
```

- Saving with the empty profile selection also produced the aggregate
  `Some settings could not be saved.` warning because enabled A0 Tag state is
  deliberately invalid without both an Instance key and a default profile.

#### Runtime diagnosis

- This was not a missing tab lease, missing Host access permission, missing
  Computer Use scope, or unsupported Ubuntu backend.
- The active development Launcher was PID `1840289`, started through
  `electron-forge start` with:

```text
A0_LAUNCHER_LOCAL_REPO=/home/eclypso/a0/a0-launcher
```

- It had no `A0_CLI_PATH` override. Its outbound tab-leased gateway was:

```text
/home/eclypso/.local/bin/a0 gateway ...
```

- That installed `a0` distribution reported version `2.11` and exposed the
  new tagged-headless flags, but its installed `gateway.py` did not contain
  `a0_tag_v1` or the tagged gateway commands. The connected gateway therefore
  correctly omitted the feature and failed Launcher's A0 Tag readiness gate.
- The adjacent development CLI at
  `/home/eclypso/a0/a0-connector/.venv/bin/a0` contains the complete gateway,
  Wayland helper, and tagged-headless implementation. Earlier successful live
  and packaged acceptance explicitly selected this binary with `A0_CLI_PATH`.
- Root cause was the shared CLI candidate order: even for local-content
  development, `findA0CliBinary({ requireGateway: true })` accepted the
  installed CLI's older base gateway contract before checking the adjacent
  development Connector. The base capability was true, but the optional A0
  Tag gateway capability was absent.

#### Minimal root-cause fix

- `findA0CliBinary` now preserves explicit `A0_CLI_PATH` as the first choice.
- Local-content runs prefer the adjacent `a0-connector` virtualenv before the
  installed command, keeping coupled unreleased Launcher/Connector work on the
  same source generation.
- Non-local/package runs still prefer the installed official CLI before any
  adjacent development checkout.
- No daemon, retry loop, second resolver, dependency, installer mutation, or
  feature-specific permission path was added.
- Added one focused source-contract regression proving both the local sibling
  ordering and explicit override priority.

#### Verification so far

```text
node --check shell/main.js
node --test shell/a0_tag.test.js shell/host_access.test.js shell/host_gateway.test.js
git diff --check
```

- Result: 42 passed, 0 failed; syntax and whitespace checks passed.

#### Live Ubuntu acceptance after the fix

- Restarted only the local development Launcher; the Agent Zero container and
  its data were not restarted or changed.
- Opened the real `agent-zero` Instance through the Launcher UI. The exact
  outbound child changed from the installed command to:

```text
/home/eclypso/a0/a0-connector/.venv/bin/python
/home/eclypso/a0/a0-connector/.venv/bin/a0 gateway ...
```

- The renderer's live tab snapshot reported both sides connected and the
  gateway features exactly included:

```json
["computer_use_setup_v1", "a0_tag_v1"]
```

- Repeated the user's failing path with native visible controls: Launcher →
  Settings → A0 Tag → enable. Profile discovery returned six real profiles:
  Agent 0, Minimal, Developer, Hacker, Researcher, and Tiny Local. The selected
  value remained `agent0`.
- Saving enabled A0 Tag produced the real `Settings saved.` toast. The
  persisted state changed to `enabled: true`, the UI reached
  `Ready. Type @a0, then use the shortcut.`, and neither the partial-save toast
  nor the backend/CLI capability toast appeared.
- GNOME's guarded `a0-tag` shortcut binding existed only while the enabled
  lease was ready, alongside the user's untouched `custom0` binding.
- Restored the opt-in state through the real UI: disabled A0 Tag and saved.
  The second save also produced `Settings saved.` with no warning; persisted
  state is again `enabled: false`, Instance/profile remain selected, and only
  the user's `custom0` GNOME binding remains.
- The temporary loopback DevTools listener used for repeatable UI inspection
  was closed and verified unreachable. Launcher was reopened normally through
  `npm start` with local content and no debugging port.
- Three UI evidence screenshots were moved out of the Launcher worktree to:

```text
/home/eclypso/a0/agent-zero/tmp/a0-tag-settings-proof-20260830/
```

- Final focused rerun added the renderer Settings and CLI maintenance suites:
  47 passed, 0 failed. Both changed shell files parsed and `git diff --check`
  passed.
- No A0 CLI installation/update, dependency, version, container, commit,
  branch, tag, push, PR, or release mutation was needed for this fix.

### 2026-08-30 — follow-up: GNOME Text Editor rejected a non-ASCII result

#### User-visible report and preserved state

- The user invoked A0 Tag in GNOME Text Editor with:

```text
@a0 What can we write here about fireflies?
```

- Launcher reported:

```text
A0 Tag could not finish
The field changed the replacement; the original tag was restored where possible.
```

- Read-only AT-SPI inspection after the failure confirmed the editor buffer is
  still exactly the original 43-character invocation with its caret at offset
  43. The fail-closed restore therefore prevented data loss in this case.
- The selected gateway remains connected, A0 Tag remains enabled as the user
  left it, and the guarded GNOME shortcut remains registered. No orphan tagged
  headless or Computer Use helper child remains.

#### Agent Zero chat evidence

- The exact newest chat is `/a0/usr/chats/9I3RslKZ/chat.json`:
  - name: `Firefly Writing`;
  - profile: `agent0`;
  - created: `2026-08-30T06:39:04.701176+02:00`;
  - final response logged at approximately 06:40:12 local time.
- The Main model correctly chose replace mode and returned one valid first-line
  `<!--a0-tag:v1;mode=replace-->` marker followed by plain field-ready prose.
  The Launcher/headless parser therefore succeeded; this was not a prompt,
  model, marker, profile, chat, or Core failure.
- The replacement after removing the marker is 1,635 Unicode code points but
  1,641 UTF-8 bytes. Its three em dashes account for the six-byte difference.

#### Root cause

- AT-SPI character positions and text counts are character offsets, but the
  separate `Atspi.EditableText.insert_text(..., length)` argument is explicitly
  a UTF-8 **byte** count.
- Both tracked Wayland helper copies currently pass Python character counts:

```python
insert_text(element, start, replacement, len(replacement))
insert_text(element, start, original, len(original))
```

- Affected owners:
  - `/home/eclypso/a0/a0-connector/src/agent_zero_cli/computer_use_helper.py`;
  - `/home/eclypso/a0/a0-connector/packages/a0-computer-use-wayland/src/a0_computer_use_wayland/computer_use_helper.py`.
- For the firefly prose, GNOME Text Editor accepted the call but inserted only
  the first 1,635 UTF-8 bytes. Because earlier em dashes consume extra bytes,
  that is 1,629 characters and omits the final six ASCII characters
  (`" here."`). The helper then correctly detected that the inserted text/count
  differed from the requested 1,635 characters, removed the partial result,
  restored the ASCII invocation, and surfaced the observed error.
- Existing fake AT-SPI tests mask the contract mismatch because their
  `insert_text` implementation slices a Python string by `length`, treating the
  argument as code points. The nominal non-ASCII test (`Réponse concise 🌟`)
  therefore passes without checking the byte length sent to the real API.

#### Independent contract and runtime proof

- Official GNOME libatspi documentation states that `text` is UTF-8, positions
  are character offsets, and `length` is the number of bytes to insert:

```text
https://gnome.pages.gitlab.gnome.org/at-spi2-core/libatspi/method.EditableText.insert_text.html
```

- DeepAPI discovery request `9b551db6-20b1-42fb-bee9-fb213fceca06` and exact
  official-page scrape `2ea5c261-aec3-4adb-b9d0-6991794d451b` both succeeded.
- A disposable GTK 4 `TextView` on this exact Ubuntu session reproduced the
  contract without touching the user's draft:

```text
input:                 "alpha — omega"
Python len:            13
UTF-8 byte length:     15
insert_text length 13: "alpha — ome"   (11 characters, returned True)
insert_text length 15: "alpha — omega" (13 characters, returned True)
```

- The disposable buffer was restored, its process was stopped, and its
  temporary script was deleted. Container logs contained no relevant exception;
  the failure traveled through the expected structured gateway error path.

#### Smallest owner-correct repair if authorized

- Keep all AT-SPI start/end offsets, character-count validation, replacement
  limits, and fail-closed restore logic in Unicode code points.
- Change only the `insert_text` length argument to
  `len(value.encode("utf-8"))` for replacement and restore calls in both helper
  copies.
- Make the fake API honor UTF-8 byte length (or explicitly record/assert the
  passed length), then add a regression whose replacement contains an em dash
  and emoji.
- Re-run both Wayland helper suites, sync the development CLI/runtime copy, and
  repeat the real GNOME Text Editor invocation with non-ASCII multiline output.
- No repair was implemented in this investigation-only turn.

#### Authorized repair status

- The user subsequently authorized the fix.
- Both tracked Wayland helpers now compute UTF-8 byte counts once for the
  requested replacement and rollback text, and pass those counts only to
  `EditableText.insert_text`. Range deletion, target identity, character limits,
  returned character counts, exact readback, and rollback bounds remain in
  Unicode character offsets.
- The fake AT-SPI `insert_text` now honors its byte-length contract. The existing
  `Réponse concise 🌟` success case asserts the exact UTF-8 byte count, and the
  normalization/rollback case now restores a non-ASCII original invocation
  (`@a0 preserve café — 🌟`) with its exact byte count.
- Updated the closest CLI and packaged Wayland DOX contracts with the
  byte-length/character-offset split.
- Initial focused result:

```text
tests/test_wayland_backend_package.py: 46 passed
both helper files: py_compile passed
git diff --check: passed
```

- Broader focused Connector regression passed: 119 tests across Computer Use,
  the cross-platform contract, both Wayland helpers, and gateway commands.
- The real production `_replace_atspi_text` function was exercised against a
  disposable GTK 4 `TextView` through the current system AT-SPI service:

```text
inserted: "Réponse concise — fireflies glow 🌟" (34 characters / 40 bytes)
restored: "@a0 probe café — 🌟"                (18 characters / 24 bytes)
```

  Exact readback passed in both directions. The fixture was closed and its
  temporary script removed.
- Final live A0 Tag acceptance used a second disposable focused GTK editor with:

```text
@a0 Reply with exactly: UTF-8 works — 🌟
```

- Launcher capture → development gateway → `agent0` tagged headless chat →
  replace apply completed. The field became exactly `UTF-8 works — 🌟` on the
  first observed read, with no truncation or overlay error.
- Test chat `4K5Kpuf6` (`A0 UTF-8 Test`) preserved the exact final protocol
  response:

```text
<!--a0-tag:v1;mode=replace-->
UTF-8 works — 🌟
```

- The private helper and headless child exited after apply; the selected
  outbound gateway stayed connected. A0 Tag remains enabled, and the user's
  original `Firefly Writing` chat and GNOME Text Editor draft were untouched.
- The test-created chat was moved recoverably out of the normal chat list to:

```text
/home/eclypso/a0/agent-zero/tmp/a0-tag-mvp-evidence-20260830T0605/chats/4K5Kpuf6/
```

- Complete Connector suite result: 815 passed, 1 skipped, 1 unrelated existing
  failure in
  `tests/test_plugin_backend.py::test_browser_runtime_endpoint_updates_browser_plugin_config`.
  The sibling Agent Zero Browser plugin persists `keyboard_layout` and
  `keyboard_variant`; that stale expected dictionary remains outside A0 Tag.
- No dependency, installation, Core source, Launcher runtime code, version,
  commit, push, tag, PR, or release mutation was performed.

### 2026-08-30 — command palette expansion request and design checkpoint

#### User-visible evidence

- Chrome screenshot: the omnibox visibly contains an `@a0` request, but the
  native helper returns `No accessible focused field was found.` Chrome browser
  chrome is therefore not a safe assumption for AT-SPI exact replacement even
  when text is visibly editable.
- Rich-chat report: invoking from another chat application returns `Place the
  caret at the end of the A0 Tag request.` Rich/contenteditable accessibility
  models can disagree with the visual caret and should not force users to learn
  native offset details.
- The attached Agent Zero WebUI reference shows the intended visual grammar: a
  quiet dark composer, local profile/context controls, microphone affordance,
  and a clear blue send action. The A0 Tag palette will reuse the grammar, not
  clone unrelated WebUI controls.
- GNOME Text Editor exact replacement is already accepted and feels valuable;
  the expansion must preserve it unchanged.

#### Root UX diagnosis

- The native helper is behaving correctly: exact replacement requires a
  readable focused `Text`/`EditableText` target and a stable tag ending at the
  reported caret. Relaxing either invariant would trade a confusing error for
  unsafe edits in rich applications.
- The product gap is in Launcher orchestration. It treats all capture failures
  as terminal overlays even though a subset means only that inline insertion is
  unavailable, while the user still has a valid explicit shortcut, selected
  profile, open leased Instance, and intentional Computer Use grant.
- The owner-correct seam is `A0TagController.invoke()` immediately around
  `a0_tag_capture`. The helper remains strict; the controller can distinguish
  recoverable inline-capture errors from protected/authority/runtime failures
  and open a separate explicit composer.

#### Minimal implementation decision

- Extend the current `A0TagOverlay` static HTML/CSS/JS and BrowserWindow owner
  into a dual result/composer surface instead of adding a renderer route,
  preload API, dependency, daemon, tray icon, or second controller.
- Submit/cancel travel through a separate narrowly parsed local navigation
  intent. Untrusted query text is bounded before prompt composition and all
  rendered strings use form values or `textContent`.
- The existing tagged-headless markers and result parser remain unchanged.
  Palette capture data sets `replace_supported: false`, contains only the
  explicit palette query/target scope, and carries no inaccessible field text.
- No Agent Zero Core or Connector source change is planned. Live proof, not the
  desire to keep that statement elegant, remains the gate for changing it.

#### Acceptance boundary

- Static/unit proof is necessary but insufficient. Ubuntu completion requires a
  real global shortcut, visible focused/draggable palette, selected profile,
  restored foreground app, real tagged chat, inherited Computer Use action,
  quiet cancel, no orphan helper/headless child, connected gateway afterward,
  and an unchanged inline replacement path.
- Browser/chat acceptance must use a harmless local or draft-only action; do not
  send a Discord message, submit a public form, or navigate a logged-in account
  consequentially merely to prove routing.
- macOS and Windows visual/focus behavior remain explicit remote-machine gates
  after Ubuntu acceptance.

#### Implemented Launcher slice

- Added strict `a0-tag-compose://submit|cancel` parsing. Submit accepts exactly
  one bounded non-empty query and syntactically valid profile; duplicate/extra
  fields, invalid paths, fragments, credentials, profiles, and
  over-2,048-codepoint queries fail closed. Scope is no longer accepted from
  the static page and the controller supplies the sole `computer` value.
- `A0TagController.invoke()` now catches only the allowlisted inline-capture
  limitation codes at the capture seam. `A0_TAG_PROTECTED_FIELD` and every
  authority/runtime/apply error remain explicit failures.
- The existing overlay owner now presents a second static composer view with
  the reused triangle SVG, local Rubik, live normalized profile options,
  Enter and Shift+Enter behavior, Escape/close, responsive 690-pixel maximum
  width, Electron drag/no-drag regions, and no Node/preload surface. The current
  palette deliberately has no Focused app/Computer selector.
- Composer submission closes its BrowserWindow before profile resolution,
  tagged-headless startup, or Computer Use. A second shortcut focuses the open
  composer instead of destroying or queueing it.
- Palette prompt context records `invocation_surface: command_palette` and
  `target_scope: computer`, carries no inaccessible field/app text, declares
  that Launcher has no replacement target, names the restored app as the
  natural starting context, and keeps final action/returned-text judgment with
  the selected Main model.
- Existing result UI now overrides the portable WebUI minimum document size and
  loads the shared button styles, eliminating the oversized empty result window
  visible in the user's earlier screenshots.
- Settings now describes inline tags and the anywhere composer without another
  switch, permission matrix, shortcut, or persisted field.
- No Connector or Agent Zero Core source changed for the palette.

#### Static and focused verification

```text
node --check shell/a0_tag.js
node --check shell/a0_tag_overlay.js
node --check shell/main.js
node --check shell/preload.js
node --check app/docker_manager.js
node --test shell/a0_tag.test.js shell/host_access.test.js shell/host_gateway.test.js shell/docker_manager/state_store.test.js app/components/docker-manager/settings/settings.test.mjs
git diff --check
```

- Result: 49 passed, 0 failed; syntax and whitespace checks passed.
- New focused coverage proves palette prompt scope, strict navigation parsing,
  fallback-code allowlisting, live profile selection, tagged-headless reuse,
  no apply/release for palette runs, and protected-field fail-closed behavior.
- Static surface coverage proves the triangle asset, composer controls,
  `window`/`computer` default, drag/no-drag CSS, Rubik, CSP, `textContent`, and
  absence of `innerHTML`, `ipcRenderer`, or `require`.
- Final owning-shell verification added CLI install/update, launcher update,
  debug-release, and full Instance-tab suites: 92 passed, 0 failed, with every
  changed JavaScript entry point parsing and `git diff --check` still clean.

#### Real Electron palette proof

- Restarted only Launcher with local content and loopback CDP on port 9333;
  the existing container was not restarted or changed. Opened the exact
  `agent-zero` Instance and waited for the sibling development gateway plus
  guarded GNOME shortcut.
- A real no-editable-target invocation opened a 690×238 A0 Tag BrowserWindow.
  Playwright/current Chromium measurements:
  - body viewport and scroll extent both exactly 690×238 (no overflow);
  - active element `a0TagQuery`;
  - font `Rubik, Arial, Helvetica, sans-serif`;
  - header `-webkit-app-region: drag`, textarea `no-drag`;
  - triangle asset loaded;
  - six real profiles loaded, with `agent0` selected;
  - default scope `window`;
  - `window.process` and `window.require` both absent.
- Escape closed the composer quietly and returned controller state to `ready`;
  no tagged headless child was created and the gateway/binding stayed live.
- Visual evidence was moved out of the Launcher worktree to:

```text
/home/eclypso/a0/agent-zero/tmp/a0-tag-command-palette-proof-20260830/
```

#### Live focused-app Computer Use acceptance

- Origin was a disposable GTK 4 window titled `A0 Tag Palette Test`, with a
  focused ordinary button, status `WAITING`, and no editable field. The native
  capture therefore exercised real palette fallback rather than a synthetic
  controller call.
- Submitted in `Focused app` scope with profile `agent0`:

```text
In the focused app named A0 Tag Palette Test, click the button labeled Mark palette verified. Do not interact with any other app.
```

- The palette closed before work. Agent Zero chat `2pR16Kuo`, named `A0 Tag
  Action`, preserved `invocation_surface: command_palette`, `target_scope:
  window`, profile `agent0`, and no captured field/tree/screenshot content.
- Agent Zero started the existing Wayland Computer Use gateway, found the exact
  fixture by native window identity, invoked the named button through background
  AT-SPI dispatch, re-read the window, and verified `PALETTE VERIFIED` before
  stopping its Computer Use session.
- The fixture independently printed `PALETTE VERIFIED`. The final action marker
  produced a compact branded Copy/Dismiss result, and controller state returned
  to `ready`; only the long-lived selected gateway remained.

#### Live computer-wide and profile acceptance

- Reinvoked from the same inaccessible surface, selected `Computer`, selected
  one-run profile `developer`, and asked for a read-only report of the fixture
  status.
- Chat `1fSwJlCN`, named `A0 Tag Check`, recorded profile `developer`, target
  scope `computer`, and the exact palette query. Computer Use reported the
  window active and status exactly `PALETTE VERIFIED`, made no change, stopped
  its session, and returned the action summary. Persisted default profile stayed
  `agent0`.

#### Inline regression acceptance

- A separate disposable GTK 4 `TextView` held the exact focused invocation:

```text
@a0 Reply with exactly: INLINE STILL WORKS — 🌟
```

- The shortcut created no palette target. Existing capture → tagged headless →
  exact apply changed the field to `INLINE STILL WORKS — 🌟`; the fixture
  independently printed the exact Unicode result. Chat `opLWx3A3` used profile
  `agent0`. Controller/gateway returned to `ready`/connected.

#### Browser-specific automation ceiling and cleanup

- A final harmless Computer-scope test asked Agent Zero to foreground the
  already-open `New Tab - Google Chrome` window without clicking, typing, or
  navigating. Chrome was discoverable as a native window, but its AT-SPI frame
  rejected verified foreground/auto focus. This confirms that users must focus
  the browser themselves before invoking `Focused app`; Launcher must not add a
  cross-app focus hack.
- Agent Zero avoided page interaction and tried compositor-only focus routes.
  The extended QA run was stopped through the authenticated WebUI `/stop`
  action after it remained in GNOME overview navigation. The selected Instance
  tab was then closed and reopened, which stopped the old gateway/helper/portal
  session and established a clean new lease. No Chrome content changed.
- Test chat `NJwTtCXH` records the stopped diagnostic. All four task-created
  chats were moved recoverably out of the normal chat list to the evidence
  directory above. Both disposable GTK fixtures and scripts were stopped and
  removed.
- Final live state at this checkpoint: A0 Tag enabled, default profile `agent0`,
  selected exact Instance unchanged, status `ready`, one selected outbound
  gateway, guarded `a0-tag` plus untouched user `custom0` binding, and no
  headless or private Computer Use helper child.
- Final handoff removed the temporary loopback CDP listener and gracefully
  stopped its tab lease. Launcher is open normally from local content on the
  Instances page; port 9333 is closed, only the user's `custom0` binding exists,
  and no gateway/helper/headless test process remains. Persisted A0 Tag stays
  enabled with the same Instance/profile. Clicking that Instance's `Open UI`
  re-establishes the deliberate tab lease, guarded shortcut, and `ready` state
  for the user's Chrome/Discord feel check.
- `docker logs --since 20m` contained none of the task error signatures
  (`Traceback`, runtime warning, exception, error, invalid/not-found, or
  warning). Final process inspection found no task fixture, gateway, helper, or
  tagged-headless child.

### 2026-08-30 — single-scope palette visual simplification

#### User decision

- Remove the visible `A0 Tag` heading and replace it, at the same bold Rubik
  weight, with `Ask Agent Zero to do anything on your computer`.
- Add a visible `Profile` label immediately before the existing one-run profile
  selector.
- Remove the Focused app/Computer choice and make every palette invocation use
  Computer scope. Existing inline tags remain a stronger signal: they still
  carry their exact captured field/app context and preserve replace/action
  choice by the Main model.
- Treat a focused/restored app as the natural first context for palette requests
  that refer to the current app, while preserving the already granted ability to
  work elsewhere on the computer.
- Reduce the lower empty area without changing the compact result overlay.

#### Implementation checkpoint

- Deleted the target fieldset and all selector CSS/JavaScript rather than hiding
  it. The static composer now submits only `query` and `profile`.
- Narrowed `a0-tag-compose://submit` to those two exact parameters; a submitted
  `scope` is now an unexpected field and fails closed.
- `A0TagController.invoke()` now writes `palette_scope: computer` itself. Prompt
  composition recognizes only that palette scope and explicitly names the
  restored app as the natural starting context.
- Reduced the fixed composer BrowserWindow height from 238 to 190 pixels and
  tightened only the composer padding/gaps; result-overlay sizing is unchanged.
- A first 340-pixel render exposed a hidden flex min-content overflow: the long
  title kept a 354-pixel intrinsic width and pushed Profile/close beyond the
  clipped window even though the document reported no scroll. The final CSS
  gives the composer/header zero flex minimum, preserves fixed triangle/close
  widths, and narrows only the profile select/gaps below 430 pixels.

#### Verification and visual evidence

```text
node --check shell/a0_tag.js
node --check shell/a0_tag_overlay.js
node --test shell/a0_tag.test.js
14 passed, 0 failed
node --test shell/*.test.js
95 passed, 0 failed
git diff --check
passed
```

- Exact normal render: 690 × 190 pixels. The card spans x=8 through x=682,
  ends at y=182, leaves the intended 8-pixel transparent outer margin, and has
  16.8125 pixels from the key-hint baseline box to the card bottom.
- The full heading remains untruncated at normal width (`clientWidth` and
  `scrollWidth` both 354 pixels), resolves to local Rubik weight 700, Profile is
  visible before the live selector, scope-control count is zero, and horizontal
  and vertical overflow are both zero.
- Exact minimum render: 340 × 190 pixels. The form remains x=8 through x=332;
  triangle, ellipsized heading, Profile/select, close, textarea, and send button
  all remain visible. Horizontal and vertical overflow are zero. The 75-pixel
  title box truncates only the sentence while the 144.625-pixel profile control
  and 30.390625-pixel close control stay inside the card.
- The temporary test server served the HTML, CSS, JavaScript, triangle, and all
  Rubik weights successfully. Its only console error was an irrelevant 404 for
  `/favicon.ico`; the Electron `loadFile` surface does not request that HTTP
  favicon.
- Screenshots and the recoverably moved Playwright snapshot/log directory:

```text
/home/eclypso/a0/agent-zero/tmp/a0-tag-command-palette-proof-20260830/a0-tag-command-palette-simplified.png
/home/eclypso/a0/agent-zero/tmp/a0-tag-command-palette-proof-20260830/a0-tag-command-palette-simplified-min-width.png
/home/eclypso/a0/agent-zero/tmp/a0-tag-command-palette-proof-20260830/playwright-cli-single-scope/
```

- Closed the Playwright browser and temporary loopback HTTP server, moved its
  generated session directory out of the Launcher worktree, and started a normal
  local-content Launcher with no DevTools/debugging listener. The Launcher is on
  its normal Instances surface; opening the selected Instance tab will
  re-establish the deliberately leased gateway and guarded shortcut for the
  user's real feel test.

### 2026-08-30 — composer input alignment refinement

- User screenshot showed the placeholder/text pinned near the textarea's top
  while the 3-rem send button remained vertically centered. The requested visual
  target is the real Agent Zero composer: larger input text centered against the
  send action without losing multiline Shift+Enter behavior.
- The Agent Zero WebUI source at
  `webui/components/chat/input/chat-bar-input.html` uses Rubik at 1rem/1.45 and
  native `align-content: center` for its composer text. A0 Tag now reuses those
  exact text metrics and block alignment on the existing textarea.
- This is deliberately CSS-only: the two-row textarea, Enter/Shift+Enter event
  contract, query limit, form submission, palette dimensions, and send-button
  geometry are unchanged.
- Playwright proved the 690 × 190 render uses `font-size: 16px`, `line-height:
  23.2px`, and supported `align-content: center`. The textarea center was
  101.7890625 pixels and the send-button center was 101.78125 pixels: a rounding
  delta of 0.0078125 pixels. Horizontal/vertical overflow remained zero.
- Two-line input remained fully visible with `clientHeight == scrollHeight ==
  64`, `scrollTop == 0`, and an enabled send button. Evidence:

```text
/home/eclypso/a0/agent-zero/tmp/a0-tag-command-palette-proof-20260830/a0-tag-command-palette-input-centered.png
/home/eclypso/a0/agent-zero/tmp/a0-tag-command-palette-proof-20260830/a0-tag-command-palette-input-centered-two-lines.png
```

### 2026-08-30 — compact composer and Instance-owned microphone

#### User decision

- Reduce the input box and palette height so the composer wraps its controls
  instead of reserving the previous two-line empty area.
- Add the Agent Zero microphone immediately before the send button. Whisper
  availability, model loading, permissions, errors/toasts, and backend behavior
  should remain the selected Instance's responsibility.

#### Ownership trace and implementation

- Agent Zero's bundled `_whisper_stt` plugin owns the exact reusable seam:
  `store.handleMicrophoneClick(finalTranscriptHandler)`. It already owns the
  selected device, permission request, silence threshold/duration, waiting
  timeout, Whisper status/model load, `/plugins/_whisper_stt/transcribe`, result
  filtering, error toasts, and configured draft/send behavior.
- The A0 Tag page remains a static sandbox with no preload, Node API, credentials,
  network access, or raw-audio IPC. Its microphone click uses the already
  allowlisted `a0-tag-compose://` navigation channel; the shell asks only the
  exact active leased Instance web contents to invoke that existing store.
- Microphone audio and base64 stay entirely inside the authenticated Agent Zero
  page and its intended plugin API. Launcher receives only a final transcript
  bounded to the existing 2,048-codepoint query limit, `sendImmediately`,
  cancellation, or a bounded error string.
- The plugin's optional final transcript handler lets A0 Tag honor the Instance's
  `draft` setting by filling the composer, or its `send` setting by filling then
  submitting. Launcher does not invent another speech preference.
- The plugin still emits its normal Agent Zero toast calls. The palette mirrors
  the bounded error in a local `Whisper STT` toast because the leased Instance
  page may be behind another desktop application when A0 Tag is invoked.
- Pressing the microphone again cancels. Closing/submitting the palette,
  renderer loss, controller disposal, lease change, or Instance-tab loss stops
  or discards the live session; a stale transcript cannot cross a changed lease.
- The mic uses the plugin's exact SVG path and state language beside the existing
  3-rem send button. The input wrapper now has only 0.4-rem vertical padding,
  and the BrowserWindow height is reduced from 190 to 170 pixels.

#### Verification checkpoint

- `node --check` passed for `shell/a0_tag.js`, `shell/a0_tag_overlay.js`, and
  `shell/main.js`.
- Focused A0 Tag suite passes 18 tests. It covers strict microphone
  start/cancel intents, exact Whisper-store reuse, 2,048-codepoint transcript
  bounding, draft/send propagation, active-lease gating, and static sandbox/UI
  invariants, owned-window transcript rendering, and in-flight cancellation.
- The complete shell suite passes 99 tests with no failures. `git diff --check`
  passes; all changed JavaScript parses.
- Playwright normal render is 690 × 170 pixels. The compact input box is
  65.15625 pixels high. Textarea, microphone, and send button share the exact
  91.96875-pixel vertical center; mic/send remain 48 × 48 pixels. Rubik input
  metrics remain 16px/23.2px with native centered content. Overflow is zero.
- Active state changes the accessible control from `Start voice input` to
  pressed `Stop voice input`, uses `rgb(239, 100, 100)`, and runs only the local
  `a0-tag-microphone-pulse` animation. The error state resets the mic and shows a
  live `Whisper STT` toast; the keyboard hint hides only while that toast is
  visible, preventing the overlap found in the first render.
- At the 340 × 170 floor, the form stays x=8..332, textarea keeps 161.625 pixels,
  and both 48-pixel mic/send controls remain fully inside the 308.406-pixel
  content edge. The placeholder may wrap to two centered lines; overflow stays
  zero.
- Static rendering used only a temporary loopback server. All actual surface
  assets loaded; the sole console item was its irrelevant `/favicon.ico` 404.
  The server/browser were closed and Playwright session files were moved out of
  the Launcher worktree.
- Visual evidence:

```text
/home/eclypso/a0/agent-zero/tmp/a0-tag-command-palette-proof-20260830/a0-tag-command-palette-compact-microphone.png
/home/eclypso/a0/agent-zero/tmp/a0-tag-command-palette-proof-20260830/a0-tag-command-palette-microphone-active.png
/home/eclypso/a0/agent-zero/tmp/a0-tag-command-palette-proof-20260830/a0-tag-command-palette-whisper-toast.png
/home/eclypso/a0/agent-zero/tmp/a0-tag-command-palette-proof-20260830/a0-tag-command-palette-compact-microphone-min-width.png
/home/eclypso/a0/agent-zero/tmp/a0-tag-command-palette-proof-20260830/playwright-cli-compact-microphone/
```

- A direct unauthenticated probe of the live Instance could not use the plugin
  API (`GET` returned 403 and raw `POST` returned 405), confirming that Launcher
  should not bypass WebUI authentication/CSRF or recover stored credentials for
  speech. The authenticated Instance web contents remains the correct owner.
- Restarted the normal local-content Launcher main process after the final lease
  cancellation change. No debug listener or temporary HTTP server remains. A
  human voice utterance is still required for the last live microphone gate:
  open the selected Instance tab, invoke the palette, click mic, speak, and
  confirm its configured draft/send behavior plus model/permission toast path.

### 2026-08-30 — original-composer fidelity, readiness copy, and native attachments

#### Source and ownership trace

- Read the real Agent Zero composer sources rather than approximating the
  screenshot:
  - `webui/components/chat/input/chat-bar-input.html` owns the 72% panel / 28%
    background row, 72% border, 8px radius, inset/18px shadow, `+` dimensions,
    Rubik 16px/1.45 input, and `#4248f1` send action;
  - `webui/components/chat/input/bottom-actions.html` owns the upward menu and
    file/folder actions;
  - `webui/components/chat/attachments/attachmentsStore.js` confirms folder
    selection becomes the selected regular files;
  - `webui/index.js` and `api/message.py` confirm attachments become one
    UserMessage attachment list;
  - `_whisper_stt` status/store sources confirm model ready/loading/model size,
    package state, exact microphone SVG/states, and first-transcription load.
- Traced Launcher capture through tagged headless and Connector session before
  selecting the owner. The existing `A0Client.upload_attachments()` is the one
  authenticated upload seam, so Agent Zero Core remains unchanged.

#### Final implementation

- Header is exactly `Ask Agent Zero to use your computer`; placeholder is
  exactly `Type your message here...`.
- The microphone has no border or background in inactive, hover, focus, or live
  states. It uses the plugin's gray/red colors and SVG hover/active scale; only
  an external accessible focus outline remains.
- The compact palette retains a fixed 154px card. On positioning-capable
  desktops, opening the `+` expands only the transparent BrowserWindow upward
  from 170px to 270px and anchors the unchanged card at the bottom. On Wayland,
  the window reserves the same 270px canvas from creation and Electron's native
  shape exposes only the bottom 170px while closed. Opening changes the shape,
  not the bounds. In both paths the two-item panel is anchored to the `+`
  trigger and floats over the header when open, matching the WebUI composer.
- Attach file permits native multi-selection; Attach folder selects one native
  folder. Exact paths live only in `A0TagOverlay.composerAttachments` in the
  main process. Renderer payloads contain only bounded basename/kind summaries,
  and the compact footer exposes one remove-all action.
- On submit, the selected open Instance's existing outbound gateway receives
  correlated `a0_tag_upload`. The gateway validates 1..16 absolute selections,
  expands directories without nested symlinks, deduplicates resolved regular
  files, applies 128-file / 25MiB-file / 100MiB-total bounds in a worker, creates
  unique MIME-aware upload names, and reuses `A0Client.upload_attachments()`.
- Tagged headless `--attachment-ref` is repeatable and validates/deduplicates up
  to 129 safe `/a0/usr/uploads/<basename>` references: 128 selected files plus
  the separately captured inline screenshot. Prompt/context remains on stdin;
  host paths and bytes never enter tagged argv or renderer state.
- Before microphone recording, the shell calls the exact leased Instance's
  authenticated `_whisper_stt/status`. Disabled state uses the local mirrored
  toast. Missing runtime/model, loading, and first download/load states use the
  previously empty left footer; attachments and the key hint temporarily yield
  that space, then return when transcription ends.

#### Automated and visual proof

```text
node --check shell/main.js shell/a0_tag.js shell/a0_tag_overlay.js
passed

node --test shell/*.test.js
101 passed, 0 failed

./.venv/bin/python -m pytest tests/test_attachments.py tests/test_entrypoint.py tests/test_headless.py tests/test_gateway.py -q
51 passed, 0 failed

./.venv/bin/python -m pytest tests/ -q
817 passed, 1 skipped, 1 unrelated known Browser-config fixture failure
```

- `git diff --check` passes in both Launcher and Connector after the final
  blur/menu cleanup and DOX/ledger edits.

- The full Connector failure is unchanged from the prior checkpoint:
  `test_browser_runtime_endpoint_updates_browser_plugin_config` expects the
  sibling Core Browser config not to contain `keyboard_layout` and
  `keyboard_variant`; current Core correctly includes them. No unrelated test or
  plugin fixture was edited.
- Playwright's exact closed geometry: card `8..682 × 8..162`, composer row
  `21..669 × 59.390625..127.390625` (68px); textarea height 44.9375px; plus
  40px; mic/send 50.390625px and the same 93.3828125px center; footer y
  135.390625..151.390625. No horizontal or vertical overflow.
- Visual states proved: default composer, upward menu, selected file/folder
  summary, and full first-use Whisper notice. Temporary HTTP produced only the
  irrelevant favicon 404; every real HTML/CSS/JS/SVG/Rubik asset loaded.
- Evidence was moved out of the Launcher worktree:

```text
/home/eclypso/a0/agent-zero/tmp/a0-tag-command-palette-proof-20260830/composer-fidelity/screenshots/a0-tag-composer-default.png
/home/eclypso/a0/agent-zero/tmp/a0-tag-command-palette-proof-20260830/composer-fidelity/screenshots/a0-tag-composer-attachments-menu-v2.png
/home/eclypso/a0/agent-zero/tmp/a0-tag-command-palette-proof-20260830/composer-fidelity/screenshots/a0-tag-composer-attachments-selected.png
/home/eclypso/a0/agent-zero/tmp/a0-tag-command-palette-proof-20260830/composer-fidelity/screenshots/a0-tag-composer-whisper-status-v2.png
/home/eclypso/a0/agent-zero/tmp/a0-tag-command-palette-proof-20260830/composer-fidelity/playwright-cli/
```

#### Live authenticated upload smoke

- Started the current local Connector gateway against the real Dockerized
  Instance `http://127.0.0.1:32081` using its remembered authenticated session,
  a disposable `/tmp` workspace, Computer Use scope only, and gateway id
  `a0-tag-smoke`.
- Live metadata advertised `a0_tag_v1`, Wayland `a0-tag`, connected state, and
  the existing persistent Computer Use grant.
- One correlated request selected an explicit `brief.txt` and a folder
  containing `context.md`. It returned two unique safe refs under
  `/a0/usr/uploads/`; host `cmp` proved both stored byte streams exactly matched
  the selected file and folder member.
- Sent correlated shutdown and observed `stopped`. Both uploaded smoke files and
  the disposable source directory were moved to the desktop trash, so they are
  recoverable and no test gateway/process remains.
- Restarted a normal local-content Launcher with the local Connector checkout,
  no remote-debugging listener, and no visual-test server. The remaining live
  gate is deliberately human: open the selected Instance tab, invoke the
  palette, and confirm the native file/folder dialog plus a real spoken Whisper
  request.
- Final process audit found the prior 16:01 development Launcher still alive
  after its old Forge terminal session ended, alongside the new 16:45 launch.
  Sent SIGTERM to that exact old Electron main process; its outbound gateway and
  Forge parent exited cleanly. One current local Launcher remains and no smoke
  gateway, Playwright browser, or temporary HTTP server remains. Because the
  stale process owned the open Instance surface, the user must reopen the
  selected Instance tab in the remaining Launcher before the shortcut becomes
  ready.

### 2026-08-30 — exact attachment menu and immovable Wayland palette

#### User-visible regression

- The first attachment menu reproduced the original panel's overall silhouette
  but substituted two thin outline SVGs. Agent Zero actually uses a filled
  paperclip SVG and the bundled Material Symbols `drive_folder_upload` glyph,
  so the menu was visibly approximate even though its labels and actions were
  correct.
- On native GNOME Wayland, changing the frameless BrowserWindow from 170px to
  270px while also requesting `y - 100` did not preserve its bottom edge.
  Wayland leaves top-level placement to the compositor; the surface grew from
  its compositor-owned top edge and the bottom-aligned card visibly moved down
  by the newly exposed menu height.

#### Owner-correct repair

- Copied the original WebUI menu primitives exactly from
  `webui/components/chat/input/chat-bar-input.html` and
  `webui/components/chat/input/bottom-actions.html`:
  - filled 18px paperclip path;
  - bundled `Material Symbols Outlined` folder-upload glyph and font asset;
  - inner flex menu wrapper, Rubik 13px type, opacity, spacing, hover color;
  - 11rem minimum / 18rem maximum width, bounded vertical overflow, 12px
    radius, border, 90% panel/10% black background, and original shadow.
- Kept the existing singular `Attach file` product label because that exact
  wording was explicitly requested; every visual primitive around it now
  matches the source composer.
- Reused Electron's already-installed native `BrowserWindow.setShape()` on
  Linux Wayland. The palette is created once at 690 × 270; while closed, only
  `{ x: 0, y: 100, width: 690, height: 170 }` is drawable and interactive.
  Opening exposes the complete 270px canvas. No resize or reposition request is
  issued, so GNOME has no geometry change with which to move the palette.
- The shape contract also keeps the reserved transparent area click-through
  while the menu is closed. Windows, macOS, and non-Wayland Linux keep the
  previous bottom-anchored resize path; no new window, dependency, preload, or
  renderer privilege was added.

#### Regression and native proof

```text
node --test shell/a0_tag.test.js
21 passed, 0 failed

node --test shell/*.test.js
102 passed, 0 failed

git diff --check
passed
```

- Added one focused geometry regression: closed/open Wayland shapes are exact
  and `getBounds()` remains byte-for-byte unchanged across the toggle.
- Ran the current Electron binary under the real `wayland-0` session with the
  production `A0TagOverlay`, stylesheet, font, and asset paths. Electron
  reported `setShape` as a function; before and after bounds were identically
  `{ x: 0, y: 0, width: 690, height: 270 }`.
- The native capture shows the original filled paperclip and folder-upload
  glyph, correct panel surface, 4px separation, and unchanged 154px palette
  card. Proof artifact:

```text
/home/eclypso/a0/agent-zero/tmp/a0-tag-command-palette-proof-20260830/menu-wayland-fix/a0-tag-wayland-menu.png
```
- Gracefully terminated the prior local development Electron main process and
  observed its exact Instance gateway lease exit with it. Started one fresh
  local-content Launcher from this checkout; the renderer, bundled Rubik and
  Material Symbols fonts, Docker inventory, and local Instance inventory all
  loaded without an A0 Tag or asset error. The user must reopen the selected
  Instance tab once so its intentionally tab-leased gateway and shortcut are
  provisioned again.

#### Trigger-anchor refinement

- Follow-up screenshot showed that visual fidelity inside the panel was now
  correct, but its geometry still used Launcher-specific fixed coordinates:
  `left: 36px; bottom: 166px`. That attached the panel to the outer card edge,
  leaving roughly one control-height of empty space between it and `+`.
- Replaced those coordinates with the original Agent Zero relationship:
  `position: absolute; left: 0; bottom: 100%; margin-bottom: 0.25rem`, resolved
  against the existing positioned attachment wrapper. The menu now moves with
  the trigger if composer padding, width, font metrics, or responsive geometry
  changes; there is no second coordinate to maintain.
- This intentionally lets the transient menu float over the palette header.
  Avoiding that overlap was what created the visually disconnected menu; the
  original WebUI popover prioritizes a direct control-to-menu relationship.
- Added a static contract assertion so the trigger-relative anchor cannot
  quietly regress to card-relative coordinates. Full Launcher shell tests are
  still 102/102.
- Native Electron/Wayland measurement with the production overlay returned:

```text
menu     x=33.515625  y=101.796875  width=176  height=67.59375
trigger  x=33.515625  y=173.390625  width=40   height=40
gap      4px
window before/after  { x: 0, y: 0, width: 690, height: 270 }
```

- The exact shared `x` proves left-edge alignment; the exact 4px gap is the
  WebUI's `0.25rem`; identical native bounds preserve the prior no-movement
  fix. Updated proof artifact:

```text
/home/eclypso/a0/agent-zero/tmp/a0-tag-command-palette-proof-20260830/menu-trigger-anchor/a0-tag-trigger-anchor-menu.png
```
- Removed the disposable proof script/user data after saving the PNG, then
  started one clean local-content Launcher from this checkout. Its renderer,
  shared fonts/assets, and Instance inventory loaded successfully; reopen the
  selected Instance tab to restore the deliberately tab-leased gateway.

### 2026-08-31 — macOS tranche preflight and ownership gate

#### Mandatory reads, goal, and plan

- Created the concrete task goal for the complete macOS tranche and generated a
  twelve-step plan spanning preflight, ledger, implementation, automated tests,
  development/native/package acceptance, deep frdel polish, and final audit.
- Read the complete 2,300-line ledger before editing it. No Ubuntu entry was
  deleted or collapsed.
- Read the complete `a0-live-e2e-tester-macos` and Ponytail full-intensity skill
  contracts. The live-E2E skill's legacy `/Users/m1` and fixed-port examples
  were deliberately replaced with discovered facts from this host. CodeRabbit
  was not run.
- Read the applicable Launcher root, shell, Docker Manager state, renderer,
  settings component, packaging, scripts, and GitHub workflow DOX chains.
- Read the applicable Connector root, source package, CLI, packages, macOS
  backend, tests, and accepted Wayland backend DOX chains.
- Read the Computer Use skill before its first UI call. Its initial read-only
  snapshot waited on Codex's missing native permissions and was terminated after
  approximately 60 seconds rather than left hanging. The user then explicitly
  approved those Codex permissions, and the retry completed normally.

#### Git and host commands

```text
git -C <repo> rev-parse --show-toplevel
git -C <repo> branch --show-current
git -C <repo> rev-parse HEAD
git -C <repo> status --short --branch
git -C <repo> status --porcelain=v1
git -C <repo> rev-parse --abbrev-ref --symbolic-full-name '@{upstream}'
```

- Results are captured in the resume table above: every repo initially clean on
  its requested branch/upstream with the exact full HEAD.
- The first compact expected-commit loop used zsh `set -- $spec`; zsh did not
  split the scalar, so Git tried paths such as
  `/Users/alessandro/a0/a0-connector fc72914` and returned `No such file or
  directory`. No repository state changed. The corrected explicit commands
  were:

```text
git -C <exact-repo> show -s --format='%H%n%h %s%n%ad' --date=iso-strict <commit>
git -C <exact-repo> merge-base --is-ancestor <commit> HEAD
```

- All five expected subjects/hashes matched the task exactly and every ancestry
  check exited `0`.
- Host commands and exact salient output:

```text
sw_vers
ProductName: macOS
ProductVersion: 26.6
BuildVersion: 25G72

uname -m
arm64

system_profiler SPHardwareDataType
Mac Studio / Mac13,1 / Apple M1 Max / 10 cores / 64 GB
```

- Tool inventory: Node `v24.20.0`, npm `11.19.0`, Apple Python `3.9.6`,
  uv-tool Python `3.12.14`, Apple Git `2.50.1`, uv `0.12.7`, installed `a0
  2.11`, Electron `42.5.1`, and Forge `7.10.2`.
- The first repo-environment command intentionally tested the required paths and
  returned `no such file or directory` for both Connector `.venv/bin/python`
  and `.venv/bin/a0`. A later `find ... -name pyvenv.cfg` returned no local
  environment. No environment or package was created during preflight.
- One npm inventory attempt used a login shell whose nested command did not
  retain the NVM Node path and returned `command not found`. The corrected
  command invoked the exact NVM Node binary and npm CLI JavaScript directly;
  `npm ls --depth=0 --json` then completed and reported the declared dependency
  set without missing/extraneous errors.

#### Launcher-managed runtime and live Instance

- The normal shell correctly returned `docker: command not found`. The user
  clarified that the local Instance uses Launcher-managed Colima; no system
  Docker installation was attempted.
- Discovery and runtime commands:

```text
ls -la '/Users/alessandro/Library/Application Support/a0-launcher/runtime/bin'
'/Users/alessandro/Library/Application Support/a0-launcher/runtime/bin/docker' context show
'/Users/alessandro/Library/Application Support/a0-launcher/runtime/bin/docker' context ls
'/Users/alessandro/Library/Application Support/a0-launcher/runtime/bin/docker' version
'/Users/alessandro/Library/Application Support/a0-launcher/runtime/bin/docker' ps --no-trunc
'/Users/alessandro/Library/Application Support/a0-launcher/runtime/bin/docker' inspect <container>
curl -fsS http://127.0.0.1:49930/api/health
curl -fsS -o /dev/null -w ... http://127.0.0.1:49930/
```

- These proved the exact `colima-a0` socket, Docker client/server, container,
  image, port, `/a0/usr` mount, start time, HTTP 200 root, and HTTP 200 health
  identity recorded above.
- `ps`, `lsof`, `mdls`, `codesign`, and cwd inspection proved one development
  Forge/Electron Launcher, the exact app bundle/TCC identity, its open-tab
  gateway child, and the Launcher-managed SSH listener. No competing packaged
  Launcher, second Forge main process, tag helper, or tagged-headless child was
  present.
- The state file was parsed with a field allowlist rather than printed wholesale.
  It has no `a0Tag` key, proving default-off. The exact local Instance has Host
  access configured/master enabled with all five scopes. Its persisted runtime
  endpoint is the discovered Colima socket. No credentials were printed.
- Computer Use inspection of `com.github.Electron` proved the selected
  `agent-zero` tab, connected Host access button, and actual embedded WebUI.
  Opening only the existing Host access modal and disclosures showed all five
  inherited switches on and live diagnostics `Connection Ready`, `Browser
  Allowed · Ready`, `Computer Use Allowed · Ready`. Cancel closed the modal;
  no value was saved or changed.

#### Permission and evidence commands

```text
printf permission_status/shutdown JSONL |
  /Users/alessandro/.local/share/uv/tools/a0/bin/python \
  .../a0_computer_use_macos/runtime.py --stdio
```

- Non-prompting result under Codex's responsibility chain:
  `accessibility_required`, Accessibility required, Screen Recording granted,
  restart not required. This does not override the actual Electron lease's live
  Ready diagnosis.
- A targeted read-only query of
  `~/Library/Application Support/com.apple.TCC/TCC.db` found it unreadable. No
  Full Disk Access, reset, or write was attempted.
- `NSWorkspace`/`CGWindowListCopyWindowInfo` independently identified the
  frontmost Codex app and the visible Electron `Agent Zero` window at
  1280 x 800. This call did not capture or persist unrelated desktop content.
- Preserved preflight screenshots and hashes are listed in the capsule. They
  were copied from the Codex Computer Use temporary capture directory into the
  existing ignored Core `tmp/` evidence tree; no repository worktree contains
  them.

#### Preflight conclusion

- The real owner path is proven: implement only the missing macOS feature and
  helper operations in the existing macOS backend package, while reusing the
  already-committed generic manager/gateway/Launcher protocol and lease.
  Full source/test tracing remains mandatory before that conclusion becomes an
  edit plan.
- Current runtime correction is also proven: construct the repository's existing
  local environment, then gracefully restart only the conflicting development
  Launcher so sibling CLI selection can replace the stale uv-tool gateway. Keep
  Launcher-managed Colima, its container, `/a0/usr`, and UI running.
- No source, dependency, Core, container, permission, branch, commit, push,
  release, or publication mutation occurred in preflight. This ledger capsule
  is the first repository edit of the macOS tranche.

#### Complete owner trace and minimal macOS design

- Read the complete macOS runtime/shared/backend package and its existing
  905-line focused test module, plus the generic `ComputerUseManager`, gateway
  tag commands/tests, and the accepted Wayland tag implementation/tests. One
  exploratory `git show 1e5eedc` was accidentally issued from the Connector
  checkout, so Git returned `ambiguous argument`; the commit had already been
  verified from the correct Launcher checkout and no state changed.
- The proven call chain is:
  Launcher's selected open tab and saved Host-access scopes -> its one outbound
  `a0 gateway` child -> the existing correlated `a0_tag_*` gateway commands ->
  generic private `ComputerUseManager` context `launcher-tag` -> the selected
  platform helper. The manager already keeps tag operations out of the public
  agent-visible action set, stops the private helper on capture failure/release,
  and leaves the outbound gateway lease connected. No Launcher protocol, Core
  change, daemon, inbound listener, fallback Instance, or permission matrix is
  needed.
- The macOS backend currently omits `a0-tag` from
  `MACOS_BACKEND_FEATURES`, has no tag handlers, and omits the three helper
  operations from its stdio allowlist. Those are the only missing owner seams.
- Read the root and macOS package dependency contracts before any environment
  creation. The existing locked project already declares PyObjC `12.2.2`
  ApplicationServices/Cocoa/CoreText/Quartz on Darwin; the standalone backend
  also declares ApplicationServices and Quartz. No new dependency is required
  or authorized.
- Native read-only capability probes used the already-installed repo-compatible
  uv-tool Python and printed API names/types only:

```text
ApplicationServices:
  AXFocusedWindow / AXFocusedUIElement / AXWindow
  AXNumberOfCharacters / AXStringForRange / AXSelectedTextRange / AXSelectedText
  AXUIElementIsAttributeSettable / AXUIElementGetPid / CFEqual
  AXValueCreate + AXValueGetValue(kAXValueCFRangeType)
  AXSecureTextField
Quartz:
  CGPreflightScreenCaptureAccess
  CGWindowListCopyWindowInfo
  CGWindowListCreateImage / CGWindowListCreateImageFromArray
  kCGWindowNumber / kCGWindowOwnerPID / kCGWindowBounds / kCGWindowName
```

- A direct PyObjC round trip proved a CFRange `(3, 5)` is represented and read
  as `(True, (3, 5))`; this confirms AX offsets are UTF-16 code units. The macOS
  implementation will translate those offsets explicitly and will never treat
  Python codepoint indices as native AX indices.
- Final edit design, recorded before source mutation:
  - add `a0-tag` only after all three helper operations exist;
  - use the exact NSWorkspace frontmost PID/application, its AX focused window,
    its AX focused element, and the element's AX window;
  - reject secure/protected roles/subroles before any text, tree, or screenshot;
  - read only bounded text with native `AXStringForRange`, parse the same one-line
    grammar and limits as accepted Linux, and store an opaque 15-minute token;
  - retain private native AX element/window identities plus PID, bundle,
    window title/bounds, exact UTF-16 range, original text, and captured caret;
  - expose replacement only when the exact selected-range and selected-text AX
    attributes are settable; apply by selecting only the captured range and
    setting `AXSelectedText`, never by typing or sending Enter;
  - revalidate token/TTL, application PID and bundle, active window, focused
    native element, protection/editability, caret, and exact range contents;
  - verify the exact post-write range and character count, restore the original
    range best-effort on rejection/normalization, and leave the caret at the end;
  - serialize only the existing bounded AX tree (depth 5, 120 nodes) and bounded
    focused text;
  - attach a PNG only after Screen Recording preflight succeeds and a unique
    CoreGraphics on-screen window for the exact PID has bounds matching the AX
    active window; otherwise return an explicit unavailable reason and continue;
  - clear private target state at a new capture, stop, close, release, expiry,
    and successful apply, without ending the gateway lease.
- This is the Ponytail rung that holds: native APIs plus the existing generic
  manager/gateway seams. It adds no dependency or speculative abstraction and
  deliberately leaves the accepted Wayland path unchanged.

#### macOS backend implementation checkpoint 1

- Changed only these Connector source files:
  - `packages/a0-computer-use-macos/src/a0_computer_use_macos/runtime.py`
  - `packages/a0-computer-use-macos/src/a0_computer_use_macos/shared.py`
- Added `a0-tag` to the macOS feature tuple only in the same change that added
  `tag_context`, `tag_replace`, and `tag_release` to runtime dispatch and the
  helper stdio allowlist. The private operations are deliberately excluded from
  ordinary public action normalization and remain absent from the generic
  agent-visible action set.
- Implemented bounded native AX capture using `AXNumberOfCharacters`,
  `AXSelectedTextRange`, and `AXStringForRange`; the parser keeps the accepted
  Linux grammar/limits but stores exact UTF-16 ranges. Secure/password/protected
  semantic state is checked before any text, tree, or screenshot read.
- Implemented native private target state with an opaque UUID token, 15-minute
  TTL, exact PID/bundle/window/element identities, window title/bounds, caret,
  original range, and safe-editability result. A new capture, session stop,
  close, release, expiry, and successful apply clear the private target.
- Implemented exact AX replacement by setting only the captured
  `AXSelectedTextRange` and `AXSelectedText`, then verifying replacement bytes as
  Unicode text, total UTF-16 character count, and final caret. A partial write,
  normalization, or caret failure attempts bounded original-range rollback and
  returns `A0_TAG_REPLACE_FAILED`; no keyboard event or Enter is emitted.
- Implemented active-window screenshot gating through existing PyObjC only:
  Screen Recording preflight, one on-screen CoreGraphics layer-0 window with the
  exact PID and AX-matching native bounds (2-point rounding tolerance), then
  direct window capture. Missing permission/bounds, ambiguity, capture failure,
  invalid PNG, or a payload over 16 MiB returns explicit `unavailable` while
  retaining text/AX context.
- Refactored the existing CoreGraphics image-to-PNG encoder into one private
  helper so display and window capture share the same native conversion; no new
  abstraction layer or dependency was introduced.
- Immediate verification:

```text
/Users/alessandro/.local/share/uv/tools/a0/bin/python -m py_compile \
  packages/a0-computer-use-macos/src/a0_computer_use_macos/runtime.py \
  packages/a0-computer-use-macos/src/a0_computer_use_macos/shared.py
exit 0

git diff --check
exit 0
```

- Next action: extend the existing macOS fake AX/driver harness and add the full
  required capture/revalidation/replacement/screenshot/teardown matrix before
  running the implementation against a native app.

#### macOS focused test matrix checkpoint

- Extended `tests/test_macos_computer_use_backend.py` and
  `tests/test_macos_backend_package.py` with focused coverage for feature
  advertisement; ASCII exact-range replacement; Unicode before/inside/after;
  suffixed profiles; non-terminal caret; empty/oversized queries; protected
  field rejection before text/screenshot reads; changed process, window,
  element, text, or caret; wrong/expired token; noneditable capability;
  normalization rollback; release/stop teardown; missing Screen Recording;
  verified CoreGraphics PID/bounds selection; and absence from the public action
  set. The fake AX field uses UTF-16 native offsets and range-selected writes.
- First test command:

```text
/Users/alessandro/.local/share/uv/tools/a0/bin/python -m pytest \
  tests/test_macos_backend_package.py tests/test_macos_computer_use_backend.py -q
/Users/alessandro/.local/share/uv/tools/a0/bin/python: No module named pytest
exit 1
```

- This is an environment failure, not a test failure: the discovered global
  uv-tool is a release/runtime installation without test tooling. The root and
  package dependency contracts have now been read completely, so the next
  action is to create `.venv` from this checkout's existing declared/locked
  requirements and install the checkout editable. No dependency will be added
  to project metadata.

#### repo-local Connector environment and focused run 1

- Created the required ignored local environment with the repository's
  documented macOS `uv venv` flow, the committed runtime/build constraints, and
  an editable root install. `pytest` is the explicit development tool named in
  `docs/development.md`; it was installed into `.venv` only and no dependency
  metadata or lock input changed.

```text
uv venv --python 3.12 .venv
Using CPython 3.12.14

uv pip install --python .venv/bin/python \
  --constraint constraints/a0-runtime.txt \
  --build-constraint constraints/a0-build.txt -e . pytest
Resolved 53 packages; installed a0 2.11 editable, PyObjC 12.2.2,
pytest 9.1.1, and the existing exact runtime dependency set; exit 0.
```

- Focused run 1:

```text
.venv/bin/python -m pytest \
  tests/test_macos_backend_package.py \
  tests/test_macos_computer_use_backend.py -q
12 passed before the shared AX fake was constructed; then 22 failed; exit 1.
```

- All 22 failures share one test-only root cause at
  `tests/test_macos_computer_use_backend.py:194`: Python class-body lookup cannot
  evaluate `app_root = app_root` from the enclosing helper when the class target
  shadows the same name. Existing and new AX tests therefore failed during fake
  construction with `NameError` before product code ran. Fix once by attaching
  the enclosing fake objects immediately after class creation, then rerun the
  identical focused command.

#### focused macOS backend runs 2-3

- Fixed the shared fake at its owner by assigning `app_root`, `tag_field`, and
  `tag_window` immediately after the nested class definition.
- Focused run 2 used the identical command and reached product behavior:
  `39 passed, 1 failed in 0.15s`. The sole failure changed the field to a
  shorter value so the captured native range no longer existed. The backend
  correctly refused insertion but surfaced the lower-level bounded-read code
  `A0_TAG_TEXT_UNAVAILABLE`; the replacement contract requires every such
  revalidation mismatch to surface `A0_TAG_TARGET_CHANGED`.
- Fixed the root boundary in `tag_replace`: a bounded exact-range read failure
  during revalidation is now treated as changed target content. Initial capture
  still preserves `A0_TAG_TEXT_UNAVAILABLE` for genuinely unsupported fields.
- Focused run 3:

```text
.venv/bin/python -m pytest \
  tests/test_macos_backend_package.py \
  tests/test_macos_computer_use_backend.py -q
........................................ [100%]
40 passed in 0.09s; exit 0
```

- No key/type call occurred in successful replacement tests, protected capture
  performed zero parameterized text reads and zero screenshot calls, normalized
  replacement restored exact Unicode original text/caret, and screenshot tests
  accepted only the matching CoreGraphics PID/native bounds.

#### shared Connector regression run 1

```text
.venv/bin/python -m pytest \
  tests/test_computer_use.py tests/test_computer_use_contract.py \
  tests/test_gateway.py tests/test_headless.py \
  tests/test_wayland_backend_package.py tests/test_macos_backend_package.py \
  tests/test_macos_computer_use_backend.py -q
170 passed, 6 failed in 478.20s; exit 1
```

- The six failures are all in older generic manager tests and share one
  macOS-only fixture assumption. `_manager()` passed `backend_selection=None`,
  so on this real Mac it auto-selected the macOS backend and correctly inserted
  fresh `permission_status` helpers before mocked `start_session` calls. Those
  tests were authored against the default Linux environment and their mocks
  supplied only start/capture responses; the explicit macOS setup tests already
  pass a macOS selection and cover the staged flow separately. No new macOS tag
  runtime/source frame appears in any traceback.
- Owner-correct test fix: make the shared `_manager()` helper default to its
  existing deterministic `wayland-test` fake selection. Tests that exercise
  macOS, Windows, or another backend continue to pass an explicit selection.
  This fixes all callers once and prevents host OS from silently changing
  generic unit-test semantics.

#### shared Connector regression run 2

- The exact six prior cases passed after the deterministic fixture correction:
  `6 passed in 0.12s`.
- Repeated the complete shared subset with the same files as run 1:

```text
176 passed in 0.58s; exit 0
```

- This validates the generic private manager actions, permission setup,
  gateway correlation/upload/release, tagged headless path, accepted Wayland
  implementation, macOS backend, and action-surface isolation together. The
  eight-minute delay was eliminated because generic mocks no longer
  accidentally enter the host's real macOS setup flow.

#### full Connector run 1 collection gate

```text
.venv/bin/python -m pytest tests/ -q
ERROR collecting tests/test_windows_computer_use_backend.py
ModuleNotFoundError: No module named 'numpy'
1 error in 3.69s; exit 2; no tests ran
```

- This is a cross-platform test-environment gate: the Windows backend test
  imports NumPy directly, while the root package correctly marks exact
  `numpy==2.2.6` for `sys_platform == 'win32'`, so the macOS editable install
  omitted it. NumPy is already a declared/locked project dependency, not a new
  dependency choice. Install that exact pin into the ignored `.venv` for
  cross-platform backend-test collection only; do not change metadata/locks.

#### full Connector run 2

- Installed exact already-declared `numpy==2.2.6` into the ignored test `.venv`
  only; no project file changed. Full collection then completed:

```text
.venv/bin/python -m pytest tests/ -q
822 passed, 1 skipped, 13 failed in 26.53s; exit 1
```

- One failure is the task's known unrelated Browser configuration fixture:
  `test_browser_runtime_endpoint_updates_browser_plugin_config` still expects
  `keyboard_layout` and `keyboard_variant` to be absent while current Core
  output includes both as empty strings. Keep it separate and do not change Core
  or that fixture in this tranche.
- The other 12 are pre-existing portability assumptions in
  `tests/test_host_browser.py`, not product/tag regressions:
  - the file expects Linux `platform.system()` behavior for XDG data roots,
    Wayland launch args, and Chrome 136+ default-profile restrictions, but does
    not set the platform in those cases;
  - several cases create sibling paths `Chrome/` and `chrome`, which are distinct
    on Linux but the same path on this Mac's case-insensitive filesystem, causing
    `IsADirectoryError` before manager code runs.
- Test-owner correction: give this Linux-oriented host-browser module one
  autouse Linux platform fixture (individual detection tests may still override
  it) and rename its synthetic profile root from `Chrome` to non-colliding
  `ChromeData`. This changes no browser runtime behavior and makes the required
  full suite deterministic on macOS.

#### host-browser portability verification

- Applied only the test-owner changes described above; no host-browser source
  changed.

```text
.venv/bin/python -m pytest tests/test_host_browser.py -q
53 passed in 4.30s; exit 0
```

- This clears all 12 newly exposed macOS host-browser failures. The known Core
  Browser config expectation remains intentionally separate.

#### full Connector runs 3-4

- Full run 3:

```text
.venv/bin/python -m pytest tests/ -q
834 passed, 1 skipped, 1 failed in 28.34s; exit 1
```

- The sole failure is exactly the documented unrelated
  `tests/test_plugin_backend.py::test_browser_runtime_endpoint_updates_browser_plugin_config`:
  current Core saves empty `keyboard_layout` and `keyboard_variant`, while the
  stale expected dictionary omits them. No A0 Tag/macOS file is involved.
- Isolation run 4:

```text
.venv/bin/python -m pytest tests/ -q \
  --deselect=tests/test_plugin_backend.py::test_browser_runtime_endpoint_updates_browser_plugin_config
834 passed, 1 skipped, 1 deselected in 28.37s; exit 0
```

- Connector automated gate is therefore green for every in-scope and otherwise
  runnable test, with the named pre-existing Browser fixture kept separate as
  required.

#### Launcher focused run 1

```text
node --test shell/a0_tag.test.js shell/host_gateway.test.js \
  app/components/docker-manager/settings/settings.test.mjs \
  shell/docker_manager/state_store.test.js shell/macos_permissions.test.js
47 passed, 1 failed in 84.56ms; exit 1
```

- The only failure was the Linux-specific
  `GNOME Wayland fallback preserves other shortcuts...` case. Its production
  class correctly checks `process.platform === 'linux'`, but the test supplied
  only GNOME environment variables, so on this Mac `register()` returned false
  before its fake gsettings path. Use the class's constructor boundary to inject
  a platform value (default remains `process.platform`) and set `linux` only in
  this test. This preserves the runtime guard and makes the cross-platform suite
  deterministic.

#### Launcher focused run 2 and full run 1

- Added the constructor platform seam with the real `process.platform` default;
  the GNOME test alone passes `linux`.
- Repeated the focused command: `48 passed, 0 failed in 85.73ms`; exit 0.
- Full discovery:

```text
node --test
353 passed, 1 skipped, 1 failed in 10.32s; exit 1
```

- The sole failure is unrelated to A0 Tag: the developer-project test compares
  macOS's `/var/...` temporary-directory symlink spelling to production's
  intentionally canonical `fs.realpath()` result `/private/var/...`. Change the
  test expectation to `await fs.realpath(root)`; production canonicalization is
  the security-correct behavior and remains untouched.

#### Launcher full run 2

- The exact developer-project test passed after canonicalizing its expectation:
  `1 passed in 59.08ms`; `git diff --check` also exited 0.
- Repeated complete discovery:

```text
node --test
354 passed, 1 skipped, 0 failed in 10.33s; exit 0
```

- Node emitted the repository's existing typeless-package ESM reparsing
  warnings; they are non-failing and unrelated. Current test discovery contains
  355 tests, so the historical Ubuntu `834 passed, 3 skipped` count is retained
  as history rather than treated as this checkout/Node version's expected
  cardinality.
- Next action: inspect the current exact development Launcher/gateway process
  tree, gracefully stop only that conflict, prove the gateway child exits while
  Colima/Agent Zero stays healthy, then restart local-content Launcher with the
  now-present sibling Connector `.venv/bin/a0`.

#### development runtime synchronization: old process teardown

- Immediately before teardown, re-proved exact ownership:
  Forge `30184 -> 30185 -> Electron main 30189 -> gateway 38929`. Gateway
  command used stale global
  `/Users/alessandro/.local/share/uv/tools/a0/bin/python` and
  `/Users/alessandro/.local/bin/a0`; it targeted only the selected
  `http://127.0.0.1:49930` Instance with the expected five scopes.
- Re-proved sibling readiness before stopping anything:

```text
/Users/alessandro/a0/a0-connector/.venv/bin/a0 --version
2.11
import location:
/Users/alessandro/a0/a0-connector/packages/a0-computer-use-macos/src/...
MACOS_BACKEND_SPEC contains a0-tag: True
```

- Sent `SIGTERM` only to exact Electron main PID `30189`. Its normal app cleanup
  caused gateway `38929` and Forge parents `30185/30184` to exit within one
  second. No force signal was needed. Post-check reported all four exact PIDs
  exited and no orphan tag/gateway child from that tree.
- Launcher-managed container `a0-inst-agent-zero-mthid64x` remained `Up`, still
  published `0.0.0.0:49930->80`, and UI root remained HTTP 200. Colima/lima PIDs
  were not signaled or restarted.
- Next action: start one Forge local-content Launcher from this checkout, wait
  for the selected Instance view, and prove its new gateway executable is the
  sibling `.venv/bin/a0` and advertises `a0_tag_v1`.

#### development runtime synchronization: local-content restart and exact permission gate

- Started the one development Launcher from the repository with `npm start`.
  Forge remains attached to the task PTY; startup reported
  `Using local dev content: /Users/alessandro/a0/a0-launcher/app/index.html`
  and loaded `a0app://content/index.html` from this checkout. Exact process tree:

```text
48338  48316  node .../a0-launcher/node_modules/.bin/electron-forge start
48339  48338  node .../@electron-forge/cli/dist/electron-forge-start.js
48343  48339  .../a0-launcher/node_modules/electron/dist/Electron.app/Contents/MacOS/Electron .
```

- Computer Use opened the existing exact `agent-zero` Instance tab. The UI at
  `http://127.0.0.1:49930/` loaded successfully, and Launcher spawned exactly
  one gateway child from the sibling editable Connector environment:

```text
49134  48343  /Users/alessandro/a0/a0-connector/.venv/bin/python \
  /Users/alessandro/a0/a0-connector/.venv/bin/a0 gateway \
  --host http://127.0.0.1:49930 \
  --workspace /Users/alessandro/agent-zero/agent-zero/usr \
  --gateway-id launcher-2155b00f-f2a4-4f3d-949d-8e1dd10e9425 \
  --host-label MaclyWWVV29HYQW.local --master \
  --scopes file_read,file_write,code_execution,browser,computer_use
```

- Rechecked the managed runtime without changing it: container
  `c925ea4ff5c5` / `a0-inst-agent-zero-mthid64x` remains `Up`, port mapping is
  still `0.0.0.0:49930->80/tcp`, and `curl http://127.0.0.1:49930/` returned
  HTTP 200. This confirms the user's clarification: absence of a system Docker
  CLI is expected because Launcher-managed Colima and Launcher's bundled Docker
  client own this Instance.
- The tab progressed from `Host access connecting` to `Host access needs
  action`. Its exact modal message is: `Allow Electron (this Launcher dev build)
  in macOS Accessibility settings.` This is a distinct TCC subject from the
  Codex/ChatGPT Computer Use permission the user accepted earlier. The native
  app to authorize is:
  `/Users/alessandro/a0/a0-launcher/node_modules/electron/dist/Electron.app`;
  the pane is **System Settings > Privacy & Security > Accessibility**. No
  toggle or System Settings value has been changed by automation. The backend
  rechecks trust on demand, so no app restart is expected; click Launcher
  **Retry** after enabling it. If macOS does not refresh trust, restart only this
  development Electron tree and reopen the same Instance.
- Preserved the modal as
  `/Users/alessandro/a0/agent-zero/tmp/a0-tag-macos-20260831/runtime/dev-host-access-needs-accessibility.jpeg`,
  SHA-256
  `e63ad4d0a30cab0f38114e89cdeaf86b22fa327d68662d71f276169a6f04469a`.
- Blocker before proving live `a0_tag_v1` readiness and beginning native
  acceptance: the human must enable that exact development Electron app in the
  Accessibility pane. Leave the Launcher, gateway, Colima, and Instance running
  while waiting.
- Used Launcher's **Open Accessibility Settings** button, then navigated without
  changing any permission to **Privacy & Security > Accessibility**. The live
  list contains ChatGPT (off), Codex Computer Use (on), two MDM-managed entries
  (on), and Terminal (on); there is no Electron entry to toggle. Therefore this
  development app must be added with the pane's `+` control, selecting the exact
  `.app` path above. This is a macOS security-setting mutation and remains a
  human confirmation gate; no `+`, toggle, TCC reset, Full Disk Access, or
  unrelated permission was touched.

#### macOS audit fix: text-only tag startup without Screen Recording

- While waiting at the Accessibility gate, traced the real private tag startup
  through `ComputerUseManager._tag_action -> _start_session` and the macOS
  helper's `start_session`. This exposed a contract gap not covered by the first
  focused tests: the manager's ordinary macOS permission preparation and the
  helper's ordinary full-display capture probe could reject a private
  `launcher-tag` session before `tag_context` had a chance to return the required
  explicit `screenshot_status: unavailable` result.
- Fixed the two existing owner boundaries without adding a protocol, abstraction,
  dependency, or public action. The generic manager skips its ordinary staged
  macOS Screen Recording setup only for its existing private `launcher-tag`
  context. The macOS helper still requires Accessibility for that context but
  starts it at `0 x 0` without a display capture probe; raw AX window bounds are
  still available, and `tag_context` independently preflights Screen Recording
  before attempting the optional verified window screenshot. All other Computer
  Use contexts retain their existing Accessibility + Screen Recording startup.
- Added one manager-boundary regression and one macOS-runtime regression. Exact
  focused command:

```text
./.venv/bin/python -m pytest \
  tests/test_computer_use.py::test_macos_launcher_tag_start_does_not_require_screen_recording_setup \
  tests/test_macos_computer_use_backend.py::test_macos_launcher_tag_session_does_not_probe_screen_capture \
  tests/test_macos_computer_use_backend.py::test_macos_a0_tag_continues_without_screen_recording_permission -q
3 passed in 0.19s; exit 0
```

- Re-ran the complete manager/macOS backend group:

```text
./.venv/bin/python -m pytest tests/test_computer_use.py \
  tests/test_macos_backend_package.py tests/test_macos_computer_use_backend.py -q
100 passed in 0.25s; exit 0
git diff --check
exit 0
```

- The development Launcher/gateway process predates this source correction.
  After Electron Accessibility is granted, gracefully restart only the current
  Forge/Electron/gateway tree once so live acceptance exercises this exact
  updated Connector code; keep Colima and the Agent Zero container running.
- Post-fix full Connector regression, excluding only the exact known unrelated
  Browser configuration fixture:

```text
./.venv/bin/python -m pytest tests/ -q \
  --deselect=tests/test_plugin_backend.py::test_browser_runtime_endpoint_updates_browser_plugin_config
836 passed, 1 skipped, 1 deselected in 27.72s; exit 0
```

  The two-test increase from the earlier `834 passed` run is exactly the new
  manager/runtime missing-Screen-Recording coverage. No new failure appeared.
- Added the explicit native-bounds negative required by the screenshot privacy
  contract. A fake CoreGraphics window with the correct PID/layer/title but a
  non-matching `X` bound must raise `A0_TAG_SCREENSHOT_UNAVAILABLE` before
  `CGWindowListCreateImage` can run. The first fixture used a one-point mismatch
  and correctly failed the test because production deliberately permits up to
  two points for AX/CoreGraphics rounding (`AttributeError: CGRectNull` showed
  the capture path had been reached). Changed the fixture to a three-point
  mismatch; the focused test then passed:

```text
./.venv/bin/python -m pytest \
  tests/test_macos_computer_use_backend.py::test_macos_a0_tag_window_capture_rejects_unverified_native_bounds -q
1 passed in 0.07s; exit 0
git diff --check
exit 0
```

#### packaged-gate read-only preparation while Accessibility is pending

- Read the actual package scripts/config without building: the repository gate
  is `npm run desktop:dist:mac` (`packaging/scripts/macos-package.js` delegates
  to the existing desktop builder). Forge product identity is `Agent Zero
  Launcher`, executable `a0-launcher`, bundle ID `ai.agent0.launcher`, with the
  existing macOS entitlements. `SKIP_SIGNING=1` is the supported local unsigned
  path; no publish/notarization action is part of this task.
- `security find-identity -v -p codesigning` reported `0 valid identities
  found`, so this host cannot satisfy the configured auto-detected `Developer ID
  Application` signature. The later packaged acceptance must therefore use the
  repository's unsigned local path and record `codesign`'s exact ad-hoc/unsigned
  result plus the resulting `ai.agent0.launcher` TCC identity. No credentials or
  signing state were changed.
- An initial broad `rg` included the vendored Ace assets and produced about
  1.8M tokens before tool truncation; it made no changes. Repeated the inspection
  with only `forge.config.js`, `package.json`, `packaging/`, and `scripts/`, which
  produced the bounded results above.
- Hardened the same screenshot boundary against non-finite AX/CoreGraphics
  geometry using only `math.isfinite`. NaN/Infinity can no longer satisfy the
  tolerance comparison or reach the native capture call; finite off-screen
  coordinates remain valid. Extended the mismatch test with a NaN case and
  repeated the positive attached-screenshot path:

```text
./.venv/bin/python -m pytest \
  tests/test_macos_computer_use_backend.py::test_macos_a0_tag_window_capture_rejects_unverified_native_bounds \
  tests/test_macos_computer_use_backend.py::test_macos_a0_tag_captures_ascii_and_replaces_only_the_exact_range -q
3 passed in 0.09s; exit 0
git diff --check
exit 0
```

#### disposable native-acceptance attachment fixtures

- Created only task-owned disposable content under the ignored evidence root:

```text
/Users/alessandro/a0/agent-zero/tmp/a0-tag-macos-20260831/acceptance/attachments/a0-tag-file.txt
  45 bytes; SHA-256 b1f65505aa07c9efc8fd9e395b437bffc29647497d24b524af9a11d385e457df
/Users/alessandro/a0/agent-zero/tmp/a0-tag-macos-20260831/acceptance/attachments/a0-tag-folder/alpha.txt
  21 bytes; SHA-256 0cfcead86d78fc30c47f6d582dbbe0b882c0af7c39c979fd69ba3142eaaae67c
/Users/alessandro/a0/agent-zero/tmp/a0-tag-macos-20260831/acceptance/attachments/a0-tag-folder/nested/bravo.txt
  21 bytes; SHA-256 70a2971386b85f426b2a10424991610501bf3c214dea520e4b792d04912e4dfc
```

- These are the only paths that will be selected in the later native
  file/folder choosers. Exact bytes/hashes above are the upload-verification
  oracle. They contain no secrets or user content and will be removed with the
  rest of the disposable evidence only after acceptance/reporting.

#### permission wait state

- A fresh Computer Use read of System Settings returned: `The Mac is locked and
  automatic unlock could not unlock it.` No unlock was attempted. Asked the user
  to unlock the Mac manually and finish the exact Electron Accessibility entry
  if it remains absent. Code/test work can continue while locked, but native UI
  acceptance remains paused. The Forge PTY and process tree must be rechecked
  after unlock rather than assumed alive.

#### Connector DOX pass after macOS capability completion

- Re-read the full owning contracts for `packages/`, the macOS backend package,
  `src/agent_zero_cli/`, and `tests/`. The root and CLI contracts still called
  `a0_tag_v1` Wayland-only, which became stale once macOS advertised the feature.
- Updated only the owning `AGENTS.md` contracts: supported Wayland and macOS
  backends may advertise the existing feature; macOS uses native UTF-16 AX
  ranges and exact revalidation/rollback; its private tag context requires
  Accessibility but not Screen Recording; screenshots require finite AX bounds
  and one matching CoreGraphics PID/bounds window; ordinary Computer Use keeps
  staged Accessibility + Screen Recording. Also clarified that private-session
  cleanup includes Wayland portal resources without describing the macOS helper
  as a portal. `git diff --check` exited 0.

#### latest-source full Connector regression after audit hardening

- Raw complete suite on the current source:

```text
./.venv/bin/python -m pytest tests/ -q
838 passed, 1 skipped, 1 failed in 28.46s; exit 1
```

- The one failure remains exactly
  `tests/test_plugin_backend.py::test_browser_runtime_endpoint_updates_browser_plugin_config`:
  current Core saves empty `keyboard_layout` and `keyboard_variant` fields while
  the pre-existing expected dictionary omits them. No A0 Tag/macOS failure was
  present.
- Exact known-fixture deselection on the same source:

```text
./.venv/bin/python -m pytest tests/ -q \
  --deselect=tests/test_plugin_backend.py::test_browser_runtime_endpoint_updates_browser_plugin_config
838 passed, 1 skipped, 1 deselected in 28.69s; exit 0
```

- The increase from the earlier post-fix `836 passed` is the two-case verified
  native-bound test (finite mismatch and NaN). This is now the authoritative
  pre-native Connector result before the following focused review polish.

#### requested frdel local-history alignment review: first pass

- Read `/Users/alessandro/.codex/skills/frdel/SKILL.md` completely, resolved both
  repository roots/branches, rechecked the applicable DOX chains, inspected the
  working-tree diff/callers, and searched only local history. No fetch, remote
  browse, CodeRabbit, commit, or push occurred.
- Evidence quality: Connector-specific confidence is low because Jan Tomášek/
  `frdel` has only `aa2c06d` (the initial license/gitignore commit) in that repo.
  Launcher has 20 old commits, but its relevant `e84aca0`, `022024c`, and
  `7a80a8b` evidence is limited to the original Forge signing/notarization path
  and predates the current shell architecture. The useful repeated engineering
  evidence comes from current local Agent Zero Core history:
  - `6181ac9c`: bound and mask output at the owner boundary;
  - `ec4de765`: validate identity before an external path/API call;
  - `f69147ae`: keep dependency-sensitive imports inside their owning runtime
    functions;
  - `1eb78607`: delete unnecessary queue/state machinery instead of adding
    orchestration;
  - `904a0f4a`: place expiry/cleanup at the lifecycle owner and add focused
    persistence/cleanup regressions;
  - `175baa49`: update the nearest DOX contract and parent index/contract when
    behavior changes.
- Verdict: aligned, medium confidence overall and low confidence for literal
  Connector/Launcher style. The current change reuses the existing manager,
  gateway, AX/CoreGraphics, Electron shortcut, lease, and package seams; keeps
  platform imports isolated; uses one ephemeral target and one existing lease;
  bounds/redacts context; validates every identity before write/capture; owns
  cleanup at release/session/tab teardown; and updated focused tests plus DOX.
  Historical evidence does not support extracting a new abstraction, sharing
  UTF-16/AT-SPI parsing across platform packages, adding a dependency, or
  rewriting the direct runtime methods.
- One actionable correctness polish was supported by the current contract (not
  merely by history): if `CGPreflightScreenCaptureAccess` itself raises, the
  optional screenshot path must fail closed to explicit text-only context rather
  than abort capture. Added a bounded exception branch with no exception-detail
  leakage and a focused regression:

```text
./.venv/bin/python -m pytest \
  tests/test_macos_computer_use_backend.py::test_macos_a0_tag_continues_without_screen_recording_permission \
  tests/test_macos_computer_use_backend.py::test_macos_a0_tag_continues_when_screen_recording_preflight_fails -q
2 passed in 0.10s; exit 0
git diff --check
exit 0
```

- Re-ran the complete manager/macOS backend group after the review polish:
  `103 passed in 0.26s; exit 0` using
  `./.venv/bin/python -m pytest tests/test_computer_use.py
  tests/test_macos_backend_package.py tests/test_macos_computer_use_backend.py
  -q`.

- Repeat the final diff/history comparison after native and packaged acceptance
  in case runtime evidence changes code. Current contracts, tests, and security
  remain authoritative over the historical patterns above.

#### development Electron Accessibility gate cleared

- After the user unlocked the Mac and completed the requested macOS action,
  Computer Use reopened **System Settings > Privacy & Security >
  Accessibility** and read the live TCC list. It now contains `Electron` with
  switch value `on` (`Electron_Toggle`), alongside `Codex Computer Use` on.
  This proves the exact development bundle
  `/Users/alessandro/a0/a0-launcher/node_modules/electron/dist/Electron.app`
  (`com.github.Electron`) is authorized. No permission value was changed by
  automation, no Full Disk Access or Input Monitoring was requested, and no
  unrelated entry was touched.
- No further human permission is required at this point. The next owner-correct
  action is to gracefully restart only the exact current Forge/Electron/gateway
  tree so it loads the latest Connector source, then reopen the same Instance
  and observe whether macOS separately requests Screen Recording. Colima and
  container `c925ea4ff5c5` remain out of scope for that restart.

#### current-source development Launcher restart

- Re-resolved the live tree before signaling it: Forge `48338 -> 48339 ->`
  Electron main `48343 ->` sibling gateway `49134`. Sent `SIGTERM` only to
  Electron main PID `48343`; all four exact PIDs exited through normal Launcher
  cleanup in under one second, with no force signal and no orphan gateway.
- Re-proved the managed runtime was untouched immediately afterward: container
  `c925ea4ff5c5` / `a0-inst-agent-zero-mthid64x` remained `Up`, port
  `0.0.0.0:49930->80/tcp` remained published, and
  `http://127.0.0.1:49930/` returned HTTP 200.
- Started one current-source local-content Launcher with `npm start` in PTY
  session `17836`. Forge reported
  `Using local dev content: /Users/alessandro/a0/a0-launcher/app/index.html`.
  The new tree is Forge `55442 -> 55444 ->` Electron main `55467`; opening the
  exact existing `agent-zero` tab spawned exactly one gateway child `55861`
  from `/Users/alessandro/a0/a0-connector/.venv/bin/python` and sibling
  `/Users/alessandro/a0/a0-connector/.venv/bin/a0 gateway`, targeting only
  `http://127.0.0.1:49930` with the existing five scopes.
- Computer Use observed the tab transition from `Host access connecting` to
  `Host access connected`; the authenticated Agent Zero UI loaded its new-chat
  surface. No Accessibility retry, Screen Recording prompt, container restart,
  or second gateway occurred. Next: inspect Launcher Settings, enable/select the
  exact A0 Tag lease/profile, persist/reload, and require a live `Ready` state
  before shortcut acceptance.

#### native development acceptance: Settings and live capability ready

- Opened Launcher **Settings > A0 Tag** through the real Electron UI. Initial
  state was disabled, with no Instance selected. Enabled A0 Tag, selected the
  exact open `agent-zero` Instance, inspected the live profile list (`Agent 0`,
  `Developer`, `Hacker`, `Researcher`, `Tiny Local`), and selected
  `Agent 0 · @a0.agent0` as the default so the later
  `@a0.developer` case can prove a real per-request override.
- Saved settings. Launcher briefly showed `Updating Host access…`, cleanly
  replaced gateway PID `55861` with exactly one sibling gateway PID `56256`,
  reconnected the same lease, and then reported
  `Ready. Tag a field or use the shortcut anywhere.` This is live evidence that
  the current macOS backend advertises `a0_tag_v1`; no fallback Instance or
  second permission matrix was created.
- Activated Launcher's own Refresh control and then read the complete current
  accessibility tree. Persistence was exact: Enable checkbox `1`, Instance
  `agent-zero`, default profile `Agent 0 · @a0.agent0`, Host access connected,
  and A0 Tag Ready. Preserved the visible state at
  `/Users/alessandro/a0/agent-zero/tmp/a0-tag-macos-20260831/runtime/dev-a0-tag-ready.jpeg`
  (85,752 bytes; SHA-256
  `2ef34c2a3951e4309c9de050fead21785251229139af3462facfb28e057f2c92`).
- No Screen Recording or Input Monitoring prompt appeared. Accessibility is the
  only permission proven necessary to reach text-capable A0 Tag Ready; optional
  per-window screenshot behavior will be judged from capture results and the
  existing Screen Recording TCC state during FIM acceptance.

#### latest-source full regressions and armed TextEdit acceptance case

- Re-ran both complete suites against the exact live source after the final
  Screen Recording preflight regression and DOX changes. Connector raw result:
  `839 passed, 1 skipped, 1 failed in 28.45s`; the sole failure remains the
  exact pre-existing Browser fixture
  `test_browser_runtime_endpoint_updates_browser_plugin_config`, where current
  Core includes empty `keyboard_layout` and `keyboard_variant` keys. Exact
  deselection result: `839 passed, 1 skipped, 1 deselected in 28.08s`, exit 0.
  Launcher `node --test`: `354 passed, 1 skipped, 0 failed` in 10.37s. Both
  worktrees pass `git diff --check`; Core remains clean.
- Opened a disposable untitled TextEdit document and used native
  `Cmd+Shift+T` to convert it to plain text. Prepared the exact three-line case
  below and placed the caret at the end of the tag line without inserting an
  Enter:

```text
PREFIX-ASCII
@a0 Replace this tag with exactly INLINE-ASCII-OK and no other text.
SUFFIX-ASCII
```

- Computer Use's app-targeted `Cmd+Shift+Enter` was attempted once and, as its
  documented boundary predicts, did not reach Electron's OS-level
  `globalShortcut`; the document and Agent Zero chat state remained unchanged.
  This is useful negative evidence, not native shortcut acceptance. The
  acceptance document was re-armed with the caret visibly at the exact request
  end. Evidence:
  `/Users/alessandro/a0/agent-zero/tmp/a0-tag-macos-20260831/acceptance/textedit-ascii-armed.jpeg`
  (15,873 bytes; SHA-256
  `cf540e137474b40debd8db860daca7b5ba01fdfa566abdb6ed44b1fa2acaa21e`).
- Next action requires one physical native input: bring TextEdit forward, click
  immediately after the final period on the `@a0` line if needed, and press
  `Cmd+Shift+Enter` once. Do not press ordinary Enter. Then immediately inspect
  TextEdit, the new tagged Agent Zero chat, gateway logs, and screenshot status.
- Continuation re-poll before any user confirmation found the document byte-for-
  byte unchanged and no new Forge output, so no physical shortcut event has
  reached the Launcher yet. The authoritative runtime is still live: Forge
  `55442 -> 55444 ->` Electron `55467 ->` gateway `56256`; the current
  frontmost application is Electron. The prepared TextEdit case remains intact
  and no restart or reconfiguration is warranted.

#### native development acceptance: ASCII TextEdit FIM passed

- User native-input sequence: the first physical `Cmd+Shift+Enter` opened the
  shell-owned command palette because no safe focused tag range was visible at
  that instant. It created no chat and changed no TextEdit content. On a second
  attempt with TextEdit/tag focus established, Launcher displayed
  `Agent Zero is working in TextEdit`, then replaced only the exact captured tag
  range. This is consistent with the contract: unsafe/unavailable range falls
  back to command mode; safe focused range enters FIM.
- Fresh post-write AX read proved the complete document is exactly:

```text
PREFIX-ASCII
INLINE-ASCII-OK
SUFFIX-ASCII
```

  Both sentinels and the two pre-existing newline separators are unchanged; the
  tag/query alone disappeared, no ordinary Enter or implicit submission
  occurred, and no extra line was created. Preserved native evidence at
  `/Users/alessandro/a0/agent-zero/tmp/a0-tag-macos-20260831/acceptance/textedit-ascii-success.jpeg`
  (11,525 bytes; SHA-256
  `ab8ac50e05fa4b766f362bb5b729010148510e69655e459d071372f9cbffeee6`).
- The mounted Agent Zero store contains exactly one new chat for this flow:
  `/Users/alessandro/agent-zero/agent-zero/usr/chats/AivwJdBQ/chat.json`, named
  `Tag replacement`, profile `agent0`, created
  `2026-08-31T13:04:56.334738-07:00`. Final stable file is 79,848 bytes with
  SHA-256
  `0c0310879c530fad54c1ff13a27f73e17050692694bc337b0e57ea8dfbb8334c`.
  Its bounded prompt records app `TextEdit`, window `Untitled`, the exact tag
  and focused text, a focused `AXTextArea`, and
  `direct_replacement_supported: true`. It records
  `screenshot_status: unavailable` with the explicit safe reason
  `macOS Accessibility did not expose verified active-window bounds; A0 Tag
  continued without a screenshot.` Thus text-only FIM worked without leaking or
  fabricating a window image.
- The saved response is exactly the required marker plus
  `INLINE-ASCII-OK`; the field contains only the normalized replacement. The
  chat log includes one initial model-format retry (`Message misformat, no valid
  tool request found`) before the valid final response; Launcher still waited
  for one validated result and applied it once. No public Computer Use action
  appeared in the tag client's prompt or result.
- A first read-only chat-stat loop accidentally used zsh's reserved `path`
  variable, temporarily replacing command lookup and yielding
  `zsh:2: command not found: stat` twice. It changed no file. Re-ran with the
  task-specific variable `chat_file` and explicit `/usr/bin/stat`, producing the
  timestamps and sizes above.
- After completion no palette/working window remained; Launcher Settings still
  reported Host access connected and A0 Tag Ready, and the one gateway lease
  stayed PID `56256`. Next: Unicode FIM, then exact Developer profile override.

#### native development acceptance: Unicode FIM armed

- Reused the same disposable unsaved plain-text TextEdit document and replaced
  its content with non-ASCII text before, inside, and after the tag range:

```text
PRÉFIXE-🙂-前
@a0 Replace this tag with exactly RÉPONSE-雪-🙂 and no other text.
SUFFIXE-終-🚀
```

- Fresh AX read returned the exact Unicode string. Then placed the caret after
  the tag line using the exact tag plus Unicode prefix/suffix disambiguators;
  no key or newline was inserted. Preserved the armed state at
  `/Users/alessandro/a0/agent-zero/tmp/a0-tag-macos-20260831/acceptance/textedit-unicode-armed.jpeg`
  (15,978 bytes; SHA-256
  `ccf0948dd3314b6818ee4def1aee7b6def9b155839e5bad9306ea404ba0ab0c1`).
- Await one physical `Cmd+Shift+Enter` with TextEdit foreground; expected exact
  result is the same prefix/suffix and line structure with only the tag replaced
  by `RÉPONSE-雪-🙂`.

#### native development acceptance: Unicode TextEdit FIM passed

- One physical shortcut produced the working notification and completed without
  a palette detour. Fresh AX read proved exact post-write text:

```text
PRÉFIXE-🙂-前
RÉPONSE-雪-🙂
SUFFIXE-終-🚀
```

  The emoji (supplementary UTF-16 pair), accented Latin text, CJK characters,
  preceding/following ranges, and both newline separators are byte-for-visible-
  character intact; only the exact tag/query range changed. This is native
  evidence that macOS UTF-16 AX offsets are converted and revalidated without
  splitting Unicode codepoints. Preserved screenshot:
  `/Users/alessandro/a0/agent-zero/tmp/a0-tag-macos-20260831/acceptance/textedit-unicode-success.jpeg`
  (11,461 bytes; SHA-256
  `68bf5a0dc6c80029bfcb6c1b8336b7590744b1bb19130e7809a1771ac2836129`).
- Exactly one new chat was created at
  `/Users/alessandro/agent-zero/agent-zero/usr/chats/cljsyTcy/chat.json`, named
  `Tag replacement`, default profile `agent0`, created
  `2026-08-31T13:10:20.836293-07:00`, 80,070 bytes, SHA-256
  `965ef185eba009567a67cad304730931e2807f82e293604ff32dd23aa3b506c5`.
  Its user context preserves every Unicode character above, focused AX element,
  direct-replacement capability, and the same explicit verified-bounds
  screenshot-unavailable reason. Its final response is exactly the replace
  marker plus `RÉPONSE-雪-🙂`.
- Next: arm `@a0.developer` while the saved default remains `agent0`, then prove
  both the exact field replacement and saved chat `agent_profile: developer`.

#### native development acceptance: Developer override armed

- Kept Launcher Settings unchanged at default `Agent 0 · @a0.agent0`, then
  prepared this distinct plain-text case:

```text
PREFIX-PROFILE
@a0.developer Replace this tag with exactly PROFILE-DEVELOPER-OK and no other text.
SUFFIX-PROFILE
```

- Fresh AX read matched the intended value and exact prefix/suffix-disambiguated
  caret placement is at the end of the tag line. Evidence:
  `/Users/alessandro/a0/agent-zero/tmp/a0-tag-macos-20260831/acceptance/textedit-developer-armed.jpeg`
  (16,979 bytes; SHA-256
  `beb0060b57d3a7676204a68242b43c8023738b5ff44da70c098d4f185b43a890`).
- Await one physical shortcut; acceptance requires the exact replacement plus a
  new saved chat whose `agent_profile` is `developer`, not the configured
  `agent0` default.

#### native development acceptance: Developer profile override passed

- One physical shortcut completed FIM. Fresh AX read proved the exact final
  document:

```text
PREFIX-PROFILE
PROFILE-DEVELOPER-OK
SUFFIX-PROFILE
```

  The exact tag/query was replaced once, both sentinels and line separators are
  untouched, and no Enter/submission occurred. Preserved screenshot:
  `/Users/alessandro/a0/agent-zero/tmp/a0-tag-macos-20260831/acceptance/textedit-developer-success.jpeg`
  (12,192 bytes; SHA-256
  `f3e7d66b55cde5bca9ed39e0a88fdd032ad60e9a1acb5f3c3bd8f841ae3cb412`).
- Exactly one new chat proves routing rather than merely visible replacement:
  `/Users/alessandro/agent-zero/agent-zero/usr/chats/Wk8dktfq/chat.json`, named
  `Tag replacement`, created `2026-08-31T13:12:56.037294-07:00`, 99,121 bytes,
  SHA-256
  `86ab162e2d3bb6d7e59e857a17c68ddb6637f256842ec699c365acd196576567`.
  Its `agent_profile` is exactly `developer` while Launcher Settings remains
  default `agent0`; its captured `tag_text` retains the
  `@a0.developer` suffix, and its final response is exactly the replace marker
  plus `PROFILE-DEVELOPER-OK`. Screenshot context again failed safely to the
  explicit verified-bounds-unavailable reason.
- TextEdit development FIM acceptance is now complete for ASCII, exact
  surrounding-range preservation, no Enter, Unicode/codepoint handling, and
  suffixed profile selection. Next: native fail-closed protected-field and
  stale-target/focus-change scenarios.

#### native fail-closed acceptance: protected field armed

- Created one disposable local-only 458-byte HTML fixture at
  `/Users/alessandro/a0/agent-zero/tmp/a0-tag-macos-20260831/acceptance/protected-field.html`
  (SHA-256
  `b1c8498c6993783c77ab1f532fc1469b982ceb2d6027042346a82e181db94249`).
  It contains only a labeled native `<input type=password>` and explanatory
  text; no script, network reference, dependency, or server.
- Opened it in a separate Safari tab through the native file chooser. Safari AX
  identifies the focused element as `secure text field (settable)`. Filled it
  with a disposable non-credential sentinel/tag. Fresh AX output exposes only
  bullet characters, never the underlying value. Preserved screenshot:
  `/Users/alessandro/a0/agent-zero/tmp/a0-tag-macos-20260831/acceptance/protected-field-armed.jpeg`
  (45,560 bytes; SHA-256
  `de1d1b7c64f04b361706a074e4212d16b860a3087efb9fe9a911c7d454551b06`).
- Baseline Agent Zero store contains exactly four `chat.json` files (the
  pre-existing chat plus the three accepted FIM chats). A fixed-string search
  finds no protected-field sentinel anywhere under `usr/chats` before
  invocation. Await one physical shortcut. Required result: explicit protected-
  field error, unchanged bullets/value, no palette, no new chat, no screenshot,
  and no sentinel in chat files or runtime logs.
- The user later reported that Launcher was not visible and asked to reopen the
  fixture. Read-only discovery proved this was not merely minimization: PTY
  `17836` was unknown and no matching Forge, Electron, or gateway process
  remained. The managed container stayed `Up` with its original ID/port and UI
  HTTP 200, so Colima and Agent Zero were not restarted.
- Started one replacement current-source local-content Launcher via `npm start`,
  PTY `47082`: Forge `66231 -> 66232 ->` Electron `66234`. Reopening only the
  saved `agent-zero` Instance spawned exactly one sibling repo-local gateway PID
  `66641`; Host access reached connected. Settings survived the full process
  loss exactly: A0 Tag checkbox `1`, Instance `agent-zero`, default
  `Agent 0 · @a0.agent0`, fixed shortcut, and Ready status.
- Safari had returned to a new Start Page. Navigated that existing blank page
  back to the exact local `file:` URL (no server/network), restored only the
  disposable sentinel, and clicked the secure text field. Fresh AX reports the
  secure field focused and shows bullets only. The window was raised via AX;
  a subsequent `NSWorkspace` read still reports Codex/ChatGPT frontmost while
  the user reads this task, so the user must click Safari or its Dock icon once
  before pressing the native shortcut. Baseline chat/leak assertions remain
  unchanged.

#### native fail-closed acceptance: protected field passed

- With Safari made frontmost by the user, one physical shortcut produced the
  exact shell-owned notification toast:
  `A0 Tag could not finish` / `A0 Tag is unavailable in protected fields`.
  This is the backend's explicit `A0_TAG_PROTECTED_FIELD` path; it did not fall
  through to command palette or start Agent Zero work.
- Fresh Safari AX read still identifies a secure text field and exposes exactly
  51 bullets, matching the disposable sentinel's 51 UTF-16 units. No plaintext
  became accessible and the field was not cleared or replaced. Preserved the
  post-rejection masked state at
  `/Users/alessandro/a0/agent-zero/tmp/a0-tag-macos-20260831/acceptance/protected-field-rejected.jpeg`
  (36,644 bytes; SHA-256
  `83816033c2fe725cea2ccd9a6f00050fd4e1da1dce43197156aea2d2a30bebfb`).
- Agent Zero chat storage still contains exactly the same four chat files; a
  fixed-string search found no protected sentinel in any chat. Container logs
  since the invocation also contain no sentinel. The existing `usr/uploads`
  directory remains empty (last directory timestamp 10:24), proving no tag
  screenshot/file upload was created. Electron exposes only its main Launcher
  window after the transient toast, so no palette remained.
- Runtime ownership remained exact and healthy: Forge `66231 -> 66232 ->`
  Electron `66234 ->` one gateway `66641`; Host access stayed connected.
  Protected-field fail-closed acceptance therefore passes with explicit error,
  no chat, no screenshot/upload, no plaintext leak, and no field mutation.
- Next: delayed replacement with a focus/element/text change must reject the
  stale target after Agent Zero has begun, with no insertion into either field.

#### native fail-closed acceptance: stale focus target armed

- Added one local-only, script-free 480-byte fixture at
  `/Users/alessandro/a0/agent-zero/tmp/a0-tag-macos-20260831/acceptance/stale-target.html`
  (SHA-256
  `f6c7d592f4101f6077cdba076e8e863830344b95b400eedd801507a63167a829`).
  It contains exactly two ordinary editable text areas in one Safari window.
- Loaded it through Safari's native local-file chooser. Source field contains
  `@a0 Replace this tag with exactly STALE-SHOULD-NOT-INSERT and no other text.`;
  second field contains `SECOND-FIELD-UNCHANGED`. Fresh AX proves source focus
  and exact caret at the request end. Preserved armed evidence at
  `/Users/alessandro/a0/agent-zero/tmp/a0-tag-macos-20260831/acceptance/stale-target-armed.jpeg`
  (49,190 bytes; SHA-256
  `03210112e379468a3dafd59dcda905e0c3d2adb06c88e8baf9665c60a8ce7cc7`).
- Native action: press the shortcut with source focused; immediately after the
  `Agent Zero is working in Safari` toast, click inside the second field and
  leave both values unchanged. Expected final toast is stale/focus rejection;
  the source tag and second sentinel must remain exact, while one new tagged
  chat may exist because capture legitimately completed before focus changed.

#### native fail-closed acceptance: stale focus target passed

- User invoked the source tag, waited for the working toast, then clicked the
  second field without typing. Final shell-owned toast was exactly:
  `A0 Tag could not finish` / `The active window or focused field changed while
  Agent Zero was working`.
- Fresh Safari AX read proves both values remain exact: the source still contains
  the complete raw `@a0 ... STALE-SHOULD-NOT-INSERT ...` request and the second
  field remains `SECOND-FIELD-UNCHANGED`. Neither received the model result,
  neither was cleared, and no Enter/submission occurred. Preserved screenshot:
  `/Users/alessandro/a0/agent-zero/tmp/a0-tag-macos-20260831/acceptance/stale-target-rejected.jpeg`
  (42,875 bytes; SHA-256
  `fbe5a071787517f6627fa6b3dd941a972467e97dceb2bdcbdba2314b0dae32d0`).
- One new chat is expected because safe capture preceded the focus change:
  `/Users/alessandro/agent-zero/agent-zero/usr/chats/Y2ur0OcB/chat.json`, named
  `A0 Tag invocation`, default profile `agent0`, created
  `2026-08-31T13:45:37.150372-07:00`, 97,624 bytes, SHA-256
  `2d23d0c1e7ef1359664519502d48a72089338b186247001d125ac42b15b2ce6e`.
  Its final result is the valid replace marker plus
  `STALE-SHOULD-NOT-INSERT`, proving Launcher rejected a valid late result at
  target revalidation rather than because model work failed.
- Captured context was bounded to Safari/window/tag and explicitly records
  screenshot unavailable because native active-window bounds were not verified;
  `usr/uploads` remains empty. The gateway lease stayed PID `66641` and no
  palette remained. Native protected and stale-target fail-closed acceptance is
  complete.
- Next: command palette acceptance from a surface with no safe tag, including
  layout, dragging, profile choice, composer, `+` menu/native choosers,
  microphone surface, close-before-work, and origin focus restoration.

#### development runtime and Safari recovery before command-mode acceptance

- At the user's request after the Launcher disappeared again, process discovery
  found the Agent Zero container and UI still healthy at the exact existing URL
  (`curl http://127.0.0.1:49930/` returned `200`). The loss was confined to the
  development desktop process; Colima and the container were not restarted.
- A plain detached `nohup npm start < /dev/null` did not hold Electron Forge
  alive without a pseudo-terminal. A subsequent Computer Use inspection caused
  macOS to launch the bare Electron application/demo as PID `71349`; that was
  not the Launcher content and was terminated by exact PID. No gateway or
  Instance runtime was changed by that false start.
- Stable recovery uses the native pseudo-terminal owner already available on
  macOS, with no new dependency:

```text
screen -L -dmS a0tag-macos zsh -lc \
  'cd /Users/alessandro/a0/a0-launcher && exec npm start'
```

  `screen -ls` now reports exactly one detached session,
  `71506.a0tag-macos`. Its live tree is `screen 71506 -> login 71508 -> Forge
  71531 -> Forge CLI 71532 -> Electron 71536`. Opening only the saved
  `agent-zero` Instance created exactly one sibling repo-local gateway PID
  `71922` with the selected URL, gateway ID, host label, `--master`, and the
  inherited `file_read,file_write,code_execution,browser,computer_use` scopes.
  The durable process log is
  `/Users/alessandro/a0/agent-zero/tmp/a0-tag-macos-20260831/runtime/screenlog.0`.
- Computer Use inspected the real local-content window, confirmed the exact
  Instance tab says `Host access connected`, and used its `Show launcher`
  control so the Launcher shell is visibly open. Preserved evidence:
  `/Users/alessandro/a0/agent-zero/tmp/a0-tag-macos-20260831/runtime/launcher-screen-runtime-restored.jpeg`
  (54,652 bytes; SHA-256
  `3f46a81cbb240d195f7970bdf7de620b3b92cd0aa018650b23cee5eb228cf9cc`).
- Safari had again returned to `Start Page`. Reused that existing window and
  navigated it back to the exact local fixture URL
  `file:///Users/alessandro/a0/agent-zero/tmp/a0-tag-macos-20260831/acceptance/stale-target.html`.
  Fresh AX shows the expected two fields; the tag-free lower field still reads
  exactly `SECOND-FIELD-UNCHANGED` and is focused for command-mode invocation.
  Preserved evidence:
  `/Users/alessandro/a0/agent-zero/tmp/a0-tag-macos-20260831/acceptance/stale-page-restored-for-command-mode.jpeg`
  (40,140 bytes; SHA-256
  `f330940a7f4f9ed52329dbcde763ac28634bd26d1f4099073b9a86efd9806656`).
- Current recovery status at `2026-08-31T14:00:10-0700 PDT`: Launcher visible
  and stable under the detached session, one selected Instance/gateway open,
  Safari fixture restored and frontmost, lower tag-free field focused, Agent
  Zero HTTP `200`. No user data, container state, permissions, or unrelated
  process was modified.
- Opened the restored shell's Settings > A0 Tag pane and re-proved the live
  lease after recovery: enabled checkbox `1`, exact Instance `agent-zero`,
  default `Agent 0 · @a0.agent0`, shortcut `Ctrl/⌘ + Shift + Enter`, and status
  `Ready. Tag a field or use the shortcut anywhere.` Preserved
  `/Users/alessandro/a0/agent-zero/tmp/a0-tag-macos-20260831/runtime/dev-a0-tag-ready-after-screen-recovery.jpeg`
  (SHA-256
  `959fb3161ab89c22288209f88a3cb9e999af62374714087a5d03cc74ca848b71`).
  Then returned to Safari and clicked the lower ordinary field again; fresh AX
  confirms that exact field is focused and unchanged at
  `2026-08-31T14:02:19-0700 PDT`.

#### native command-mode end-to-end path passed

- The next physical shortcut did open the command palette. The instruction to
  reply `open` was interpreted inside that palette, so the user submitted the
  literal command `OPEN`; this was not a stale draft or automatic submission.
  The palette closed before Agent Zero work, and the shell created exactly one
  fresh chat, `/Users/alessandro/agent-zero/agent-zero/usr/chats/NLIQs67C/chat.json`,
  named `Agent Zero Control`, profile `agent0`, created
  `2026-08-31T14:03:52.578601-07:00` (117,414 bytes; SHA-256
  `d26d21a76f59fc4b2f3cb2b85dd9bca99558199e578d20077f85916efa9e25cc`).
- The stored launcher-tag protocol prompt proves
  `invocation_surface=command_palette`, `target_scope=computer`, no captured app
  text/tree/screenshot, no replacement target, and exact `USER REQUEST OPEN`.
  Agent Zero's Main `agent0` model selected action mode, started the inherited
  host Computer Use session, loaded its existing macOS guidance, listed native
  windows, and returned exactly
  `<!--a0-tag:v1;mode=action-->` plus
  `Safari and the Launcher workspace are already open.` The user received the
  exact shell toast `A0 Tag completed` / `Safari and the Launcher workspace are
  already open`.
- Host evidence is explicit: session ID
  `1462cc7eabc848ee8efc07899565d40d`, backend `macos/macos`, contract `v1`,
  native macOS window/AX/CoreGraphics features, and `a0-tag`. No Linux Desktop,
  Xpra, fallback Instance, second permission path, or Launcher-side intent
  classifier participated. The fresh 1920x1080 visual shows Codex naturally
  restored in front with Safari and the real Launcher workspace still visible:
  `/Users/alessandro/agent-zero/agent-zero/usr/chats/NLIQs67C/screenshots/computer-use/e29660a98a9842af9d80dc82622a3910-20260831-140359-d81ae6dc.png`
  (910,104 bytes; SHA-256
  `1089547060fa0fdf59a42e103cf42bb58cdf4db0595a806b4a774e121cf26fd0`).
- This passes the command-mode open/compose/submit/close-before-work/Main-model/
  inherited-macOS-Computer-Use/toast path. The selected Launcher/gateway
  process tree remained unchanged and `usr/uploads` remained empty. Palette
  layout, dragging, selectors, `+` chooser, and microphone controls still need
  deliberate UI-only inspection without submitting another command.

#### native command-palette UI and attachment path passed

- Reopened the palette without a submission and inspected the real macOS
  BrowserWindow. Native bounds were exactly `x=615, y=184, width=690,
  height=170`, title `A0 Tag`, floating layer `3`. Returning to Codex left the
  palette visible without submitting or closing it, while `NSWorkspace`
  correctly reported ChatGPT as the frontmost application. Preserved the clean
  visual at
  `/Users/alessandro/a0/agent-zero/tmp/a0-tag-macos-20260831/acceptance/command-palette-open.jpeg`
  (19,006 bytes; SHA-256
  `7e8200b4d78a0a7e693db80f857da7525286525ad30815dc280440c81a456fe7`).
- The fresh AX tree and visual both show the compact, coherent layout:
  `Ask Agent Zero to use your computer`, profile selector, close button, `+`
  menu, empty composer, microphone, disabled send button, and the Enter versus
  Shift+Enter hint. Opening the profile selector exposed exactly `Agent 0`,
  `Developer`, `Hacker`, `Researcher`, and `Tiny Local`; selected `Developer`
  for this invocation without changing the saved default.
- The `+` menu exposed exactly `Attach file` and `Attach folder`. Each opened a
  native macOS open panel with the correct title (`Attach files to Agent Zero`
  and `Attach folder to Agent Zero`). Selected only the pre-created disposable
  file and folder. The palette renderer then exposed only
  `a0-tag-file.txt +1`; its AX tree contained no absolute host path. Preserved
  the composed, attachment-ready state at
  `/Users/alessandro/a0/agent-zero/tmp/a0-tag-macos-20260831/acceptance/command-palette-attachments-ready.jpeg`
  (SHA-256
  `7afb10faf3fe5270d181fe7ddbdd257b83bd5024ff844fb73b31b5f12fc291a5`).
- Submitted through the visible Send control with the exact prompt to verify
  all three files and return `ATTACHMENTS-OK`. The palette disappeared before
  upload/model work. A fresh `NSWorkspace` read immediately reported ChatGPT
  (`com.openai.codex`, PID `69556`) frontmost; no A0 Tag composer window
  remained. The underlying windows retained their exact bounds: Launcher
  `320,140 1280x800`, Safari `586,49 1324x940`, and ChatGPT
  `223,43 1280x820`.
- The existing authenticated gateway expanded and uploaded exactly three
  regular files as safe references:

```text
/a0/usr/uploads/a0-tag-file-0b4c52f84fa74e91867eaa127ff32e31.txt
/a0/usr/uploads/alpha-0c183159d6b84500ad5c0d2309e7cbb0.txt
/a0/usr/uploads/bravo-ef3ba46496c94ff5a8ad864d46a2e0b6.txt
```

  Byte lengths are `45`, `21`, and `21`. Each destination SHA-256 exactly
  matches its selected source: `b1f65505aa07c9efc8fd9e395b437bffc29647497d24b524af9a11d385e457df`,
  `0cfcead86d78fc30c47f6d582dbbe0b882c0af7c39c979fd69ba3142eaaae67c`,
  and `70a2971386b85f426b2a10424991610501bf3c214dea520e4b792d04912e4dfc`.
  An exact fixed-string search found no selected host attachment path in the
  chat JSON. The tagged prompt contains only the three `/a0/usr/uploads/`
  references, and the short-lived headless process exited after completion.
- The fresh chat is
  `/Users/alessandro/agent-zero/agent-zero/usr/chats/0ecGHGCK/chat.json`, ID
  `0ecGHGCK`, name `File Verification`, profile `developer`, created
  `2026-08-31T14:23:04.720510-07:00`, 99,345 bytes, SHA-256
  `9cd9570e4fcfcf0eae42a4853dfcd174c5280d3f77d34299d2e91d9c2ea5e7ca`.
  The model initially emitted one empty/misformatted response, recovered via
  Core's existing format warning, verified all three regular readable files
  without Computer Use or mutation, and returned the valid replace marker plus
  exact `ATTACHMENTS-OK`. Because command mode intentionally has no replacement
  target, Launcher displayed `A0 Tag response` / `ATTACHMENTS-OK` with Copy and
  Dismiss. Preserved
  `/Users/alessandro/a0/agent-zero/tmp/a0-tag-macos-20260831/acceptance/attachments-result.jpeg`
  (SHA-256
  `6deda000b9a77dbf3a3a33d6db3fa5e380b68a49c41f834e2b38abb1ac5429f1`).
  Dismiss returned A0 Tag to Ready and ChatGPT remained naturally frontmost.

#### remote-input focus anomaly: resolved outside Launcher

- The user reports an intermittent but repeated problem (approximately six
  occurrences): after pressing the shortcut through DeskIn remote display,
  the foreground feels stuck, clicking the ChatGPT Dock icon can open Settings,
  and the Codex input may not accept typing. The user invoked it as
  `Ctrl+Shift+Enter`, consistent with a remote key mapping, rather than a local
  physical macOS keyboard test. Do not dismiss this as DeskIn-only or claim the
  palette focus contract accepted yet.
- Live evidence while the palette was open showed ChatGPT genuinely frontmost,
  the palette still visible as a separate `690x170` Electron floating window,
  and DeskIn's own remote-control overlay at macOS layer `1000`. A combined
  Quartz key-state read after the report showed left/right Command, Shift,
  Control, and Option all `false`; no modifier was stuck at that later instant.
  This does not capture the failure moment.
- The shortest plausible hypothesis is a lost remote modifier-up event when the
  Electron global-shortcut callback immediately transfers focus to the palette,
  but current evidence does not yet distinguish Launcher, Electron/macOS, and
  DeskIn. No speculative delay or input synthesis has been added. A focused
  reproduction should timestamp frontmost-app and Quartz modifier transitions
  across one remote shortcut, then compare one native-keyboard invocation if
  available.
- Two Computer Use drag attempts from the documented draggable header left the
  palette bounds unchanged and moved no underlying window. This proves no
  accidental underlying-window movement, but the automation did not deliver a
  usable native BrowserWindow drag, so manual palette dragging remains
  unaccepted rather than falsely passed.
- Armed one 40-second read-only diagnostic sampling every 20 ms for frontmost
  bundle/PID, left/right Command/Shift/Control/Option, Return, and the native
  A0 Tag window. Baseline was ChatGPT PID `69556`, no pressed key, no palette.
  The trace ended with no transition or new palette, so no shortcut occurred
  during that diagnostic window (or the remote input did not reach macOS).
  Treat this as an inconclusive reproduction attempt, not evidence against the
  user's repeated observation.
- A second coordinated 55-second trace was armed after the user said they were
  ready. It sampled all left/right modifiers plus Return every 5 ms and
  frontmost app/palette windows every 50 ms. It recorded only the baseline
  (`ChatGPT`, no keys, no palette) before the turn was intentionally aborted;
  no test invocation was captured. The trace exited normally and no monitor
  process remains. This attempt is also inconclusive and must be redone only
  after the user confirms the visible `TRACE ARMED` handoff.
- After the interruption, verified the development runtime rather than
  restarting it: detached session `71506.a0tag-macos`, Forge `71531`, Electron
  `71536`, one repo-local gateway `71922`, and Agent Zero HTTP `200`. The real
  Launcher window remains open with the exact `agent-zero` tab connected and
  Settings > A0 Tag still reporting `Ready. Tag a field or use the shortcut
  anywhere.` No process, Instance, permission, or container state changed.
- The next coordinated trace captured the failure exactly. Evidence is
  `/Users/alessandro/a0/agent-zero/tmp/a0-tag-macos-20260831/runtime/deskin-shortcut-trace.log`
  (835 bytes, 15 lines, SHA-256
  `dc65910b364d12a5d004f7762caabe91480b774175677817362c0b51cc01a39f`).
  It began at `2026-08-31T14:47:33.398318-07:00` with ChatGPT PID `69556`
  frontmost, no pressed key, and no palette. At trace offset `32.365`, macOS
  saw left Command down; at `32.970`, left Shift down; at `33.232`, Return
  down; at `33.317`, Return up; and at `33.445`, Shift up while left Command
  remained down. No Command-up occurred before the trace ended at
  `2026-08-31T14:48:17.767556-07:00`.
- The palette did not begin appearing until offset `35.846` and settled at
  `x=615, y=184, width=690, height=170, layer=3` at `35.936`: the missing
  Command-up therefore preceded Launcher palette focus by about 2.4 seconds
  and persisted for more than 12 seconds afterward. This rules out palette
  focus transfer as the cause in the captured run. DeskIn translated the
  user's Windows Ctrl chord into macOS Command-down but dropped the matching
  Command-up, explaining modified Dock clicks and temporarily blocked typing.
- The user explicitly confirmed DeskIn performs that Windows-Ctrl-to-macOS-
  Command translation, is known to have disruptive remote-session bugs, and
  does **not** want A0 Tag optimized around it. This is now a product boundary:
  do not add Launcher delay, synthetic key release, an input hook, another
  permission, or DeskIn-specific behavior. Native macOS shortcut behavior
  remains authoritative.
- Closed the empty diagnostic palette through its real Close control. A fresh
  Electron AX read returned the normal `Agent Zero` workspace, selected
  `agent-zero` tab with `Host access connected`, and Settings > A0 Tag status
  `Ready. Tag a field or use the shortcut anywhere.` No tagged request, chat,
  upload, process restart, or state mutation occurred.

#### native microphone acceptance preflight

- Re-read the live microphone owner path before exercising it. Launcher asks
  the selected Instance tab's own authenticated WebUI for
  `/plugins/_whisper_stt/status`, then executes the existing
  `/plugins/_whisper_stt/webui/whisper-stt-store.js` inside that same tab. The
  store owns `navigator.mediaDevices`, recording, model preparation,
  transcription, draft-versus-send policy, toast errors, and cancellation.
  Launcher receives only the final bounded transcript/result; raw audio never
  enters the palette renderer, gateway JSONL, argv, or a Launcher-owned store.
- The exact development runtime remained Forge `71531`, Electron `71536`, and
  one repo-local gateway `71922`; no tagged headless or Whisper helper process
  was running before the test. No dependency, permission, process, or product
  change was made. The next physical action is one palette invocation from an
  ordinary non-tagged surface; inspect the live first-use notice before
  starting the microphone.

#### native microphone first attempt exposed the missing macOS TCC preflight

- The user opened a fresh command palette from Codex. They also confirmed that
  tapping Windows Ctrl once more releases DeskIn's stuck translated Command
  modifier and makes the Codex composer clickable again. This is recorded only
  as remote-test-environment recovery; the product remains intentionally free
  of DeskIn-specific behavior.
- Fresh AX showed the normal empty palette with `Start voice input`. A first
  Computer Use click focused rather than activated the HTML toggle. Activating
  the focused control with Return exercised the actual path and produced the
  exact palette toast `Whisper STT` / `Failed to access the microphone. Please
  check browser permissions.` The control returned to `Start voice input`; no
  recording, transcript, tagged chat, or submission occurred.
- Read-only runtime inspection found the selected Instance config at
  `/Users/alessandro/agent-zero/agent-zero/usr/plugins/_whisper_stt/config.json`:
  model `base`, language `en`, message mode `send`, silence threshold `0.3`,
  silence duration `1000`, and waiting timeout `2000`. The tracked plugin is
  enabled by default and owns `navigator.mediaDevices`, recording, model load,
  transcription, and send/draft delivery as expected.
- Opened **System Settings > Privacy & Security > Microphone** without changing
  it. The pane listed exactly one app, `DeskIn`, on. Development Electron was
  absent, proving the embedded page failed before registering a macOS TCC
  choice. The actual dev identity remains
  `/Users/alessandro/a0/a0-launcher/node_modules/electron/dist/Electron.app`,
  bundle `com.github.Electron`; its Info.plist includes
  `NSMicrophoneUsageDescription`.
- Root cause: Launcher invoked the Instance page's `getUserMedia` without first
  requesting native microphone consent for the containing Electron identity.
  Electron 42's installed `systemPreferences` contract provides
  `getMediaAccessStatus('microphone')` plus
  `askForMediaAccess('microphone')`, and documents that later System Settings
  recovery after denial requires an app restart.
- Added the smallest owner-correct fix on the existing macOS permission seam:
  `ensureMacMicrophonePermission` checks the native state, prompts only from
  `not-determined`, preserves granted/denied decisions, and returns a bounded
  result. `transcribeA0TagMicrophone` calls it only on Darwin, after the exact
  lease is ready and before the selected Instance store records. Denied state
  names either packaged Agent Zero Launcher or development Electron and the
  exact Microphone pane/restart requirement. No renderer permission UI,
  protocol, raw-audio bridge, dependency, Core change, or second permission
  matrix was added.
- Updated `shell/AGENTS.md` with this native-consent ownership contract and
  added focused granted/not-determined/denied/copy tests. Verification:
  `node --check shell/main.js`, `node --check shell/macos_permissions.js`, and
  `node --test shell/macos_permissions.test.js shell/a0_tag.test.js
  shell/instance_tabs.test.js` all passed: `55` passed, `0` failed in
  `66.295375 ms`. `git diff --check` passed. The current-source development
  Launcher must now be restarted, then the real prompt/recording path retested.
- Restarted only the exact development runtime. Sending Ctrl-C to the old
  detached command ended Forge `71531`/CLI `71532`; Electron `71536` remained
  briefly reparented to PID 1 with gateway `71922` already defunct. Targeted
  TERM did not exit it, so targeted INT was sent to that exact Electron PID;
  both `71536` and `71922` then disappeared. No name-wide kill, container
  restart, or unrelated process action occurred.
- The old screen command exited with its process, so created fresh detached
  session `81549.a0tag-macos-mic` with a preserved separate log at
  `/Users/alessandro/a0/agent-zero/tmp/a0-tag-macos-20260831/runtime/screenlog-microphone.0`.
  Current process tree: npm `81813`, Forge `81836`, Forge CLI `81837`, Electron
  `81839`. Reopened only the existing running `agent-zero` Instance through its
  real `Open UI` control; it reused `http://127.0.0.1:49930/`, which remained
  HTTP `200`, and started exactly one sibling repo-local gateway `82544` under
  Electron. Fresh AX reports `Host access connected`; the embedded Agent Zero
  UI is healthy and exposes its ordinary `Microphone standby` control.
- Reopened Settings > A0 Tag after the restart and re-proved the persisted
  configuration: enabled, exact Instance `agent-zero`, default
  `Agent 0 · @a0.agent0`, shortcut `Ctrl/⌘ + Shift + Enter`, and exact status
  `Ready. Tag a field or use the shortcut anywhere.` The next physical
  shortcut should open a new empty palette; its microphone click should now
  trigger the native development-Electron consent prompt.

#### native consent passed; embedded Chromium audio permission fixed at its owner seam

- The restarted development Launcher did reach the selected Instance's real
  Whisper store. On microphone activation it showed the complete live
  first-use notice: `Agent Zero will download and load the Whisper base model
  after recording. First use may take a few minutes.` Preserved visual evidence
  at
  `/Users/alessandro/a0/agent-zero/tmp/a0-tag-macos-20260831/acceptance/microphone-first-use.jpeg`
  is `24152` bytes, mtime `2026-08-31T15:28:37-0700`, SHA-256
  `db2106e62e37218e67a54bdc028b750583d42374e3ba70f30297e2d0efb3c42d`.
- The user accepted the native macOS prompt. Their immediately following
  observation was a small palette-adjacent toast referring to `Check Browser
  permissions`; the already-captured exact store error for this failure is
  `Failed to access the microphone. Please check browser permissions.` No
  transcript, tagged chat, submission, gateway command, or raw-audio transfer
  occurred.
- Fresh read-only **System Settings > Privacy & Security > Microphone** evidence
  then showed `ChatGPT: on` and `DeskIn: on`, with no Electron row. Thus the
  native TCC request succeeded. Because Codex/ChatGPT launched the development
  Electron process, macOS assigned the responsibility chain to `ChatGPT`; this
  does not change the packaged application's future identity gate. The
  remaining denial was Chromium/Electron's permission-request layer for the
  embedded Agent Zero page, not native TCC or Whisper.
- Traced the existing tab/session seams before editing. Added one pure
  `isAllowedInstanceAudioPermission` predicate in `shell/instance_tabs.js` and
  reused it from the existing Instance tab attachment path in `shell/main.js`.
  A session handler permits only Electron `media` requests from the exact open
  tab's own `webContents`, main frame, current allowed HTTP(S) Instance origin,
  and audio-only media type. It rejects another tab/webContents, another origin,
  a subframe, video, mixed audio/video, missing media type, notifications, and
  every unrelated permission. A `WeakSet` installs the two Electron session
  handlers once even when tabs share a session; each decision re-resolves the
  current exact open tab instead of retaining stale authority.
- This is only the browser-side half of the existing selected-Instance
  microphone flow. The prior native TCC preflight still runs first, the
  Instance page still owns `navigator.mediaDevices`, raw audio, model load,
  transcription, draft/send, and cancellation, and closing the tab still
  destroys its page/store. No renderer permission prompt, broad media grant,
  raw-audio bridge, new permission matrix, dependency, protocol, Core change,
  daemon, or fallback Instance was added. Updated `shell/AGENTS.md` with the
  exact ownership and fail-closed constraints.
- Added focused allow/reject coverage in `shell/instance_tabs.test.js` and
  reran `node --check shell/main.js`, `node --check shell/instance_tabs.js`,
  and `node --test shell/instance_tabs.test.js shell/macos_permissions.test.js
  shell/a0_tag.test.js`: **56 passed, 0 failed** in `63.0275 ms`.
  `git diff --check` also passed. The still-running Electron PID `81839`
  predates this handler, so the next safe action is one exact development
  Launcher restart; Colima and container stay intact.
- Loaded that handler by restarting only the exact development tree. Ctrl-C to
  detached session `81549.a0tag-macos-mic` ended npm/Forge PIDs
  `81813`/`81836`/`81837`; Electron `81839` remained reparented with gateway
  `82544` defunct, so sent SIGINT only to that exact Electron PID, after which
  both disappeared. Closed only the now-empty screen session. No broad process
  match, Colima action, container restart, or Agent Zero state change occurred.
- Started current local content in detached screen
  `84872.a0tag-macos-mic2`, preserving output at
  `/Users/alessandro/a0/agent-zero/tmp/a0-tag-macos-20260831/runtime/screenlog-microphone-browser.0`.
  Exact tree at `2026-08-31T15:39:08-0700 PDT`: npm `85105`, Forge `85128`,
  Forge CLI `85130`, Electron `85144`. Reopened only the existing running
  `agent-zero` Instance through its real `Open UI` control; exactly one sibling
  repo-local gateway `85566` started beneath Electron with the same gateway ID,
  host, workspace, and inherited scopes. Container `c925ea4ff5c5` remained up,
  `http://127.0.0.1:49930/` returned HTTP `200`, the tab reports `Host access
  connected`, and Settings > A0 Tag again reports the persisted exact Instance,
  default profile, enabled state, and `Ready. Tag a field or use the shortcut
  anywhere.` The new browser permission handler is now live.

#### correction: the live Whisper failure is no-input hardware, not permission

- The user supplied the exact earlier toast screenshot and then disclosed that
  this Mac has no microphone. The image confirms the previously recorded text:
  `Whisper STT — Failed to access the microphone. Please check browser
  permissions.` Preserved it from the transient Codex clipboard path as
  `/Users/alessandro/a0/agent-zero/tmp/a0-tag-macos-20260831/acceptance/microphone-no-input-toast.png`,
  `155467` bytes, SHA-256
  `b0221c1cd1a7bbe257324aec912e809a41ad2ef967df2f5f1f2a6ee2fdce1a9f`.
- Read-only `system_profiler SPAudioDataType` at
  `2026-08-31T15:43:24-0700 PDT` reported exactly one audio device:
  `Mac Studio Speakers`, Apple, built-in, two output channels, with no input
  channels and no default input device. `/Library/Audio/Plug-Ins/HAL` contains
  `DeskInAudioDriver.driver` and `ParrotAudioPlugin.driver`, but neither appears
  as an active CoreAudio input. `ioreg -r -c IOAudioEngine -l` returned no
  channel evidence. This independently corroborates the user's statement.
- Therefore the toast is generic and cannot distinguish permission denial from
  `getUserMedia` having no audio-input device. The native TCC prompt did succeed
  (`ChatGPT: on`), while the second live run failed even with the new Electron
  session handler loaded. The earlier statement that this proved a Chromium
  permission-layer denial is explicitly reclassified as a disproven hypothesis.
  No recording started and no raw audio, transcript, tagged chat, or submission
  existed in either run.
- Owner-boundary consequence: the new Instance-session media handler is
  unproven and would itself become the second permission matrix forbidden by
  the A0 Tag contract. Remove only that speculative handler/test/DOX delta and
  retain the chronological failed experiment here. Live Whisper first-use,
  send, draft, and recording cancellation are hardware-blocked unless the user
  later attaches or exposes a real input device; no dependency, virtual-device
  install, or external authority is authorized. Other acceptance work can
  continue.
- Removed the speculative media handler completely: `shell/instance_tabs.js`
  and `shell/instance_tabs.test.js` are back to their pre-experiment state;
  `shell/main.js` no longer imports or installs any session permission handler
  or keeps a permission-session set; and `shell/AGENTS.md` no longer claims a
  shell-owned Chromium media matrix. The standard macOS native microphone
  preflight remains because it is the existing platform consent API, runs only
  after the exact lease is ready and the user activates voice input, and does
  not proxy or authorize browser content.
- Post-removal verification: `node --check shell/main.js`, `node --check
  shell/instance_tabs.js`, and `node --test shell/instance_tabs.test.js
  shell/macos_permissions.test.js shell/a0_tag.test.js` passed **55 tests, 0
  failures** in `61.656792 ms`; `git diff --check` passed; and a repository
  search found no remaining `setPermissionCheckHandler`,
  `setPermissionRequestHandler`, `observeInstancePermissions`, or
  `isAllowedInstanceAudioPermission`. The current Electron process still has
  the deleted handler in memory and requires one exact restart before further
  acceptance.
- Unloaded the removed handler by restarting only the exact development tree.
  Ctrl-C ended npm/Forge `85105`/`85128`/`85130`; Electron `85144` lingered
  reparented with gateway `85566` defunct, so sent SIGINT only to `85144`, then
  closed only the empty `84872.a0tag-macos-mic2` screen session. Started the
  corrected source in `86956.a0tag-macos-mic3` with preserved log
  `/Users/alessandro/a0/agent-zero/tmp/a0-tag-macos-20260831/runtime/screenlog-microphone-no-input.0`.
  Current exact tree is npm `87189`, Forge `87212`, Forge CLI `87213`, Electron
  `87227`, and one repo-local gateway `87641`. Colima/container were untouched,
  the exact UI stayed HTTP `200`, and the reopened selected tab reports `Host
  access connected`.
- Fresh Settings evidence after the correction shows A0 Tag still enabled,
  exact Instance `agent-zero`, default `Agent 0 · @a0.agent0`, fixed
  `Ctrl/⌘ + Shift + Enter`, and `Ready. Tag a field or use the shortcut
  anywhere.` The running app now contains no Launcher-owned Chromium permission
  handler.

#### command-palette physical drag gate

- The user opened a fresh empty command palette with the physical translated
  shortcut for the manual drag gate. Fresh AX confirms the complete shell-owned
  surface: title, exact Agent 0 selector, Close, More actions, empty composer,
  Start voice input, disabled Send, and keyboard guidance; no stale error toast,
  attachment, transcript, or request is present.
- Before physical movement, System Events reported the two exact Electron
  windows in front-to-back order: palette `A0 Tag` at `(615, 184)`, size
  `690 × 170`; underlying workspace `Agent Zero` at `(320, 140)`, size
  `1280 × 800`. This is the immutable baseline for the next user drag. The
  requested action is to drag only the palette title/header, release it at a
  visibly different safe location, and leave it open; afterward recapture both
  native bounds to prove the palette moved while its workspace did not.
- After the user physically dragged and released the header, System Events
  reported palette `A0 Tag` at `(963, 550)`, still exactly `690 × 170`, while
  workspace `Agent Zero` remained byte-for-byte in geometry at `(320, 140)`,
  `1280 × 800`. The palette moved `(+348, +366)` with no resize or parent-window
  motion. Fresh AX after movement retained the title, exact Agent 0 selector,
  Close, More actions, empty composer, Start voice input, disabled Send, and
  keyboard guidance. This passes the physical drag/no-window-movement gate.
- Preserved post-drag visual evidence at
  `/Users/alessandro/a0/agent-zero/tmp/a0-tag-macos-20260831/acceptance/palette-dragged.jpeg`,
  `19006` bytes, SHA-256
  `7e8200b4d78a0a7e693db80f857da7525286525ad30815dc280440c81a456fe7`.
  Closed the empty palette through its real Close control. It disappeared,
  focus returned naturally to the underlying `Agent Zero` workspace's selected
  A0 Tag settings tab, the workspace bounds remained `(320, 140)`,
  `1280 × 800`, Host access stayed connected, and status stayed `Ready`. No
  request/chat/transcript/upload/process or other state was created.

#### lifecycle gate: A0 Tag disabled

- In the real Settings > A0 Tag surface, changed only `Enable A0 Tag` from on
  to off and used the single Save settings control. Fresh AX reports checkbox
  value `0`, exact status `Disabled`, and `Agent Zero Settings saved.` The
  palette is absent and the selected Instance tab remains open with Host access
  connected. Agent Zero remained HTTP `200`.
- Before Save the exact outbound gateway was PID `87641`. The unified Settings
  IPC intentionally calls `restartHostGatewayForTab` for every open tab before
  syncing A0 Tag, so the Save replaced it with exactly one same-Instance,
  sibling-checkout gateway PID `88802`, same gateway ID/workspace/host/scopes;
  `87641` is gone and there is no second or orphan gateway. This restart is a
  property of the existing all-Settings save seam, not `a0_tag_release`; the
  normal private release path remains independently covered without ending a
  lease. Record the lifecycle observation without changing accepted shared
  Linux Settings behavior in the macOS tranche.
- No `a0 headless --launcher-tag`, tagged child, palette, or private helper is
  running. The next native proof is one physical shortcut press while status is
  Disabled; it must open no palette and create no process/chat/state.
- The user pressed the physical shortcut once while Disabled and observed
  exactly `nothing opened`. Immediate independent checks found only the main
  `Agent Zero` window at its unchanged `(320, 140)`, `1280 × 800` bounds;
  exactly one gateway PID `88802`; no `a0 headless`, `--launcher-tag`, palette,
  or tagged child; and exactly seven chat files, newest still
  `0ecGHGCK/chat.json` at `2026-08-31T14:23:29-0700`. This passes disabled
  shortcut/no-work/no-chat/no-process acceptance.
- Re-enabled only A0 Tag and saved. Fresh AX reports checkbox value `1`,
  `Agent Zero Settings saved.`, and exact status `Ready. Tag a field or use the
  shortcut anywhere.` The shared Settings seam replaced gateway `88802` with
  exactly one gateway PID `89283`, same exact Instance/gateway ID/workspace/
  host/scopes; HTTP remains `200` and there is no tagged child. The next
  physical shortcut must reopen the empty palette, proving immediate
  re-registration; it will then be closed without submission.
- The user physically invoked again and the clean empty palette reopened,
  proving shortcut re-registration. Fresh AX showed the exact Agent 0 selector,
  empty composer, no toast/attachment/transcript, and disabled Send. Closed it
  through the real Close control; focus returned to Settings with status still
  Ready. Chat count remained seven and no tagged child was created.

#### lifecycle gate: selected Instance tab closed

- With A0 Tag enabled and Ready, closed only the selected `agent-zero` tab via
  its exact tab Close control. The container was not stopped. Settings updated
  immediately without reload to `Open the selected Agent Zero Instance in a
  Launcher tab or detached window.` The persisted Instance/profile selection
  and enabled checkbox remained unchanged; no fallback Instance appeared.
- Former exact gateway PID `89283` exited within the first poll. A process scan
  found no repo-local Connector gateway, helper, `a0 headless`, or
  `--launcher-tag` child. Container `c925ea4ff5c5` remained Up, its published UI
  stayed HTTP `200`, and Electron `87227` plus the Launcher workspace remained
  live. Preserved the unavailable-state surface at
  `/Users/alessandro/a0/agent-zero/tmp/a0-tag-macos-20260831/acceptance/lifecycle-tab-closed.jpeg`,
  `81967` bytes, SHA-256
  `9259f89828bb83c255c6e2a3be0ba0c43312e85089f755a9600bf690589942d2`.
- The next native proof is one physical shortcut press while this selected-tab
  lease is absent. It must open no palette and start no fallback gateway or
  tagged child; afterward reopen the same running Instance and prove Ready plus
  one new exact gateway.
- The user pressed the physical shortcut with the selected tab absent and
  observed exactly `nothing opened`. Immediate checks found only the main
  `Agent Zero` window, no Connector/gateway/helper/tagged child, still exactly
  seven chats, and UI HTTP `200`. Thus closed-tab shortcut withdrawal created
  neither a fallback Instance nor hidden work.
- Reopened only the same existing running `agent-zero` Instance through its
  freshly resolved `Open UI` control. One initial Computer Use click returned
  stale-element error `-10005` after the accessibility tree refreshed; it made
  no change. Refreshing the tree and clicking the new exact element succeeded.
  Exactly one sibling-checkout gateway PID `90687` started with the same
  gateway ID/workspace/host/inherited scopes. Fresh AX reports `Host access
  connected`, persisted A0 Tag checkbox on, exact Instance/profile, and `Ready.
  Tag a field or use the shortcut anywhere.` Container/UI never restarted.

#### lifecycle gate: Host access disconnected

- Opened the selected tab's existing Host access dialog; it showed Connected,
  host `MaclyWWVV29HYQW.local`, one `Disconnect` action, and inherited scopes
  `Read, Write, Code, Browser, Computer Use`. Used only that exact Disconnect
  action. The tab immediately changed to `Host access disconnected` and A0 Tag
  immediately changed to `Waiting for the selected Instance Host access
  connection.` The Instance tab/page remained open; container/UI remained HTTP
  `200`; no fallback or A0 Tag-specific permission UI appeared.
- Exact gateway PID `90687` exited within the first poll. A full scoped process
  scan found no Connector gateway/helper, `a0 headless`, or `--launcher-tag`
  child. Preserved the disconnected state at
  `/Users/alessandro/a0/agent-zero/tmp/a0-tag-macos-20260831/acceptance/lifecycle-host-disconnected.jpeg`,
  `93031` bytes, SHA-256
  `c09f93971220a441f2a900114e7f7b93f2fa1b82e6183659556258bda374a659`.
- Next native proof: one physical shortcut press while Host access is
  disconnected must open nothing and start no gateway/tagged child. Then use
  this same Host access dialog to reconnect and prove exactly one gateway plus
  Ready return.
- The user pressed the physical shortcut while Host access was disconnected and
  observed exactly `nothing opened`. Immediate checks found only the main
  Launcher window, no Connector gateway/helper/tagged child, still exactly
  seven chats, and HTTP `200`. No implicit reconnect or fallback occurred.
- Reopened the exact same Host access dialog; it showed `Disconnected`, the
  same host, same inherited scope summary, and one `Reconnect` action. Used only
  Reconnect. The tab changed immediately to `Host access connected`, A0 Tag to
  exact Ready, and one sibling-checkout gateway PID `91913` started with the
  same gateway ID/workspace/host/scopes. No second gateway or tagged child
  exists. The next physical shortcut must reopen the palette to prove immediate
  re-registration; it will be closed without submission before Computer Use
  scope revocation.
- The user physically invoked after reconnect and the clean palette reopened,
  proving immediate shortcut restoration. Fresh AX showed the exact profile,
  empty composer, no toast/attachment/transcript, and disabled Send. Closed it
  via the real Close control and returned to Ready without work.

#### lifecycle gate: Computer Use revoked

- Opened the existing selected-Instance Host access dialog and expanded its
  single Host permissions disclosure. Baseline checkboxes were Files read,
  Files write, Code execution, Use my Browser, and Computer Use all on. Changed
  only Computer Use to off; the summary became `On: Read, Write, Code, Browser
  · Off: Computer Use`, while all four other individual checkboxes remained
  value `1`. Saved through the existing Host access Save control.
- The tab stayed `Host access connected`; A0 Tag immediately changed to exact
  `Allow Computer Use for the selected Instance to capture and use A0 Tag.`
  Existing gateway `91913` was replaced by exactly one sibling-checkout gateway
  PID `92327` whose argv has only
  `--scopes file_read,file_write,code_execution,browser`. Thus A0 Tag inherits
  and reacts to the one Host access matrix; it did not disconnect the other
  scopes or create its own permission setting. HTTP stayed `200`, no tagged
  child exists, and no fallback gateway appeared.
- Preserved the status at
  `/Users/alessandro/a0/agent-zero/tmp/a0-tag-macos-20260831/acceptance/lifecycle-computer-use-revoked.jpeg`,
  `92998` bytes, SHA-256
  `de36fe388a5a0fbe6da53075b2f3cc389521c8e24c85431716a64b6dded80d16`.
  Next native proof: the physical shortcut must open nothing while Computer Use
  is off. Then restore only that checkbox and prove five-scope gateway plus
  Ready/palette return.
- The user pressed the physical shortcut while Computer Use alone was off and
  observed exactly `nothing opened`. Immediate checks found the one four-scope
  gateway `92327`, only the main Launcher window, no tagged child, and still
  seven chats. No hidden capture, work, fallback, or implicit scope grant
  occurred.
- Reopened the same Host access dialog and changed only Computer Use back on;
  the other four individual permissions remained on throughout. Saved through
  the existing Host access control. A0 Tag returned immediately to exact Ready,
  and gateway `92327` was replaced by exactly one repo-local gateway PID
  `92799` with all five inherited scopes including `computer_use`. HTTP stayed
  `200`; no second matrix, second gateway, or tagged child exists. The final
  lifecycle physical shortcut must reopen the palette; then close it and run
  the complete orphan/process audit.
- The user physically invoked after Computer Use restoration and the final
  clean palette reopened, proving immediate shortcut restoration. Fresh AX
  showed exact Agent 0, empty composer, no toast/attachment/transcript, and
  disabled Send. Closed it through the real Close control; focus returned to
  the selected Instance workspace with Host access connected and A0 Tag Ready.
- Final lifecycle audit at `2026-08-31T16:11:32-0700 PDT`: one detached dev
  screen `86956.a0tag-macos-mic3`; npm/Forge/CLI/Electron exact tree
  `87189 -> 87212 -> 87213 -> 87227`; exactly one repo-local gateway `92799`
  under Electron with the exact Instance/gateway ID/workspace/host and all five
  inherited scopes; no computer-use helper, headless/tagged process, second
  gateway, or orphan. Only the main `Agent Zero` workspace remains; seven chats
  remain, newest still `0ecGHGCK/chat.json` from `14:23:29`; container
  `c925ea4ff5c5` is Up and both UI and health return HTTP `200`. Development
  lifecycle acceptance passes completely.

#### packaged macOS gate: owner-path and dependency preflight

- Re-read the complete Launcher `packaging/AGENTS.md` and `scripts/AGENTS.md`
  contracts before invoking either toolchain. Read the full owner path used by
  this gate: `packaging/scripts/macos-package.js`,
  `packaging/scripts/desktop-builder.js`, `packaging/scripts/tooling.js`, root
  `package.json` build metadata, `scripts/write-build-info.js`,
  `forge.config.js`, and `shell/assets/entitlements.mac.plist`.
- The repository's production packaged-product path is
  `npm run desktop:dist:mac`; it calls electron-builder locally with
  `publish: null`, rejects every `--publish` argument, and writes only under
  `dist/desktop/macos`. The exact planned command is
  `SKIP_SIGNING=1 npm run desktop:dist:mac -- --arch arm64`; the documented
  local-build flag sets `identity=null` and `notarize=false`. No release,
  upload, tag, notarization, or credential operation is in scope.
- `security find-identity -v -p codesigning` again returned
  `0 valid identities found`. Root Node/npm are the repo-resolved
  `/Users/alessandro/.nvm/versions/node/v24.20.0/bin/node` `v24.20.0` and npm
  `11.19.0`. The disk has about `1.7 TiB` available. No prior `.app`, DMG, or
  ZIP exists under `out` or `dist/desktop`.
- The root development dependency tree is complete. The deliberately separate
  packaging tree is not installed: `npm ls --prefix packaging --depth=0`
  exited `1` with only the two declared packages missing, `electron@^42.5.1`
  and `electron-builder@^26.15.6`. Its tracked lockfile is version 3 and pins
  exact `electron 42.5.1` and `electron-builder 26.15.7`. Installing that
  existing lock-scoped toolchain is required by the owning DOX; it is not a new
  dependency or metadata change. Next run the documented scoped install and
  prove both tracked lockfiles and the live development runtime remain intact
  before packaging.
- Ran the owning DOX command `npm install --prefix packaging`. It exited `0`,
  added 283 packages from the existing lock, audited 284 packages, and resolved
  exact `electron 42.5.1` plus `electron-builder 26.15.7`. The preserved output
  is
  `/Users/alessandro/a0/agent-zero/tmp/a0-tag-macos-20260831/runtime/packaging-npm-install.log`.
  npm reported one high-severity audit advisory and one unapproved transitive
  `electron-winstaller@5.4.0` Windows install script. This macOS gate neither
  updates the declared lock nor needs that Windows-only script, so no
  `npm audit fix` or install-script approval was performed.
- `git status --short package-lock.json packaging/package-lock.json
  shell/build-info.json` returned no output. SHA-256 remained
  `496de507...244cba` for the root lock,
  `124d80a3...3f7cc` for the packaging lock, and
  `54214cda...607a` for generated build info. The live screen and exact process
  tree remain `86956`, `87189 -> 87212 -> 87213 -> 87227 -> 92799`; both HTTP
  probes return `200`, and container `c925ea4ff5c5` remains Up. The scoped
  dependency preparation therefore changed no product metadata or runtime
  state.
- The exact dry-run command
  `SKIP_SIGNING=1 npm run desktop:dist:mac -- --dry-run --arch arm64` exited
  `0`. It resolved host/preferred platform `darwin`, build version `1.6.0`,
  output `dist/desktop/macos`, targets `dmg, zip`, and only architecture
  `arm64`. The output is preserved at
  `/Users/alessandro/a0/agent-zero/tmp/a0-tag-macos-20260831/runtime/packaging-macos-arm64-dry-run.log`.
  The only warning says the packaging-local Electron distribution is absent,
  so electron-builder will resolve its pinned target runtime. No artifact,
  publish action, signing request, or notarization request occurred.
- Ran the exact production command
  `SKIP_SIGNING=1 npm run desktop:dist:mac -- --arch arm64`; it exited `0` in
  about 39 seconds. electron-builder `26.15.7` downloaded/extracted pinned
  Electron `42.5.1`, skipped dependency rebuild, explicitly skipped macOS code
  signing because identity was null, and built the arm64 ZIP, DMG, and their
  blockmaps. The complete output is preserved at
  `/Users/alessandro/a0/agent-zero/tmp/a0-tag-macos-20260831/runtime/packaging-macos-arm64-build.log`.
  It did not publish or notarize. Existing warnings were the root-as-app-dir
  shape, intentionally disabled asar, and duplicate dependency references;
  none stopped the build.
- Production artifacts:

```text
dist/desktop/macos/a0-launcher-1.6.0.dmg
127544005 bytes
sha256 2da108545c31f745ad89d420c4befb34d719ede6e6ff303daa9152820e53443c

dist/desktop/macos/a0-launcher-1.6.0.zip
124603631 bytes
sha256 195685e0e76458645e68b480f105dea849ff04b8ea797d481c2d754a07786cf0

dmg.blockmap sha256 09fceed4bdef5011271d746324824a47d6c8f125f8d13f63f191265ec34b8914
zip.blockmap sha256 6f0ead2b60d8f0577e82a3c7b3c257ad956fea22633c1f26376a897b553e9cb3
```

- `hdiutil verify` reported the DMG checksum VALID and `unzip -tq` reported no
  compressed-data errors. The unpacked 311 MiB app is
  `dist/desktop/macos/mac-arm64/Agent Zero Launcher.app`. Its Info.plist reports
  product/display/executable `Agent Zero Launcher`, bundle
  `ai.agent0.launcher`, and versions `1.6.0`; `file` and `lipo -archs` report a
  thin arm64 Mach-O.
- The packaged payload is under `Contents/Resources/app`. Source and packaged
  `shell/a0_tag.js` share SHA-256 `4ad8288a...2abca`; source and packaged
  `shell/main.js` share `e5a7750f...f71ef`; both `cmp` checks exited `0`. The
  initial hash command used `Contents/Resources/shell`, found no files, and was
  corrected to the actual electron-builder resource depth; this was an
  inspection-path error, not a missing payload.
- Exact unsigned signing evidence: `codesign -dv --verbose=4` identifies the
  inner Electron executable as linker/ad-hoc signed with identifier `Electron`,
  no Team ID, no sealed resources, and Info.plist not bound. Strict deep bundle
  verification exits `1` with `code has no resources but signature indicates
  they must be present`; entitlement display exits `0` but emits no entitlement
  payload. `spctl` exits `0` only because this host reports
  `override=security disabled`; that is not release-signing evidence. This local
  packaged gate therefore tests exact `ai.agent0.launcher` product behavior but
  cannot claim Developer ID, hardened-runtime, Gatekeeper, or notarization
  acceptance.
- The build left the exact live development screen/process/gateway tree intact,
  with both Agent Zero HTTP probes still `200`. Only the pre-existing intended
  Launcher source/TODO changes appear in `git status`; generated package output
  is ignored. Next switch runtimes without touching Colima or the container.
- Sent one Ctrl-C only to development screen `86956.a0tag-macos-mic3`.
  Electron `87227`, its npm/Forge parents, and repo-local gateway `92799` exited
  immediately; no helper/tagged child remained. The screen returned to an empty
  shell, so it was closed with an exact `screen -S ... -X quit`. Colima's
  `limactl` usernet/hostagent remained, container `c925ea4ff5c5` remained Up,
  and UI plus health stayed HTTP `200`.
- The first packaged launch harness command used Screen's newer `-Logfile`
  option. macOS Screen `4.00.03` rejected it with `Unknown option Logfile`; no
  app, gateway, or screen session was created. Retried using ordinary
  stdout/stderr redirection into the same evidence path.
- The inspected package then started successfully as screen
  `95261.a0tag-macos-packaged`, login shell `95265`, and exact app PID `95267`
  from the arm64 `.app`. Launch environment explicitly pins
  `A0_CLI_PATH=/Users/alessandro/a0/a0-connector/.venv/bin/a0` and removes
  `A0_LAUNCHER_LOCAL_REPO`, so this is packaged content with the unreleased
  repo-local Connector, never the stale global CLI. Runtime output is preserved
  at
  `/Users/alessandro/a0/agent-zero/tmp/a0-tag-macos-20260831/runtime/screenlog-packaged-macos.0`.
- Opened the sole `agent-zero` Instance through the real packaged renderer. It
  showed `Host access connected` and loaded exact UI
  `http://127.0.0.1:49930/`. Exactly one gateway PID `95531` appeared under
  packaged PID `95267` with the repo-local Python/`a0`, same gateway/Instance/
  workspace/host identity, and all five scopes. No global `a0`, second gateway,
  helper, or tagged child exists; both HTTP probes remain `200`.
- Packaged startup downloaded/extracted the public v1.6 renderer content into
  the existing Launcher cache. Its Settings view has only Ports, Workspace,
  and Instance defaults, confirming that public content predates the A0 Tag
  panel, while the current packaged shell/controller and persisted enabled
  configuration remain active. Preserved the UI at
  `/Users/alessandro/a0/agent-zero/tmp/a0-tag-macos-20260831/acceptance/packaged-launcher-public-settings.jpeg`,
  `93280` bytes, SHA-256
  `f53f0a287b817bf89ddba7833189956bee728022aaafede044274a2e139de764`.
  This known renderer-version limitation does not relax the packaged native
  FIM, command-mode, or permission-recovery gates.
- Opened macOS **Privacy & Security > Accessibility** read-only. The list has no
  `Agent Zero Launcher` entry; only ChatGPT, Codex Computer Use, managed DeskIn,
  development Electron, managed MosyleMDM, and Terminal are present/on. Thus
  development Electron's grant did not bleed into bundle `ai.agent0.launcher`,
  as required for an honest packaged identity gate. No TCC value was changed.
  Preserved the baseline at
  `/Users/alessandro/a0/agent-zero/tmp/a0-tag-macos-20260831/acceptance/packaged-accessibility-before.jpeg`,
  `66749` bytes, SHA-256
  `9f48aeaf5b43d30b2d385645e7935d3cdc78d3ae0d2ed003fcbc708810840262`.
  Human consent is now required to add/enable only the exact packaged `.app`;
  leave the package running so immediate recovery can be tested before any
  restart is considered.
- The user added and enabled exact `Agent Zero Launcher`. Fresh System Settings
  AX state shows its dedicated switch `on` above the unchanged prior entries.
  The packaged main PID remained `95267`, exact repo-local five-scope gateway
  remained `95531`, both Agent Zero probes remained HTTP `200`, and no helper or
  tagged process exists. Thus the grant took effect without restarting or
  losing the pinned Connector environment. Preserved the enabled state at
  `/Users/alessandro/a0/agent-zero/tmp/a0-tag-macos-20260831/acceptance/packaged-accessibility-enabled.jpeg`,
  `55571` bytes, SHA-256
  `3890b597122fcb29b2666b6effd1e5bab4e8014abfd0d625da220ffd5be2d489`.
- Prepared packaged FIM acceptance in the existing disposable TextEdit window.
  Opening its Format menu showed `Make Rich Text`, proving the document is
  already plain text. The first AX set attempt reused the menu's stale element
  index and failed locally with CUA `-10005`; no text changed. Cancelled the
  menu through its exposed accessibility action, refreshed the field, and set:

```text
PACKAGED CONTEXT — café 🌍
@a0 Return the exact replacement text PACKAGED FIM OK and nothing else
```

- Sent targeted `super+Down` only inside TextEdit to place the caret at the end
  without invoking the global shortcut. TextEdit remains frontmost with the
  exact two-line value. Preserved the staged window at
  `/Users/alessandro/a0/agent-zero/tmp/a0-tag-macos-20260831/acceptance/packaged-fim-before.jpeg`,
  `16035` bytes, SHA-256
  `38dfd6fede5f54da8dd976e4e7524b208b317eea63e7531c27070d576e543539`.
  Baseline is exactly seven chat files, one gateway `95531`, and no helper or
  tagged process. The next action is one physical macOS Cmd+Shift+Enter; DeskIn
  key translation is test-environment behavior and is not a product target.
- The user physically invoked packaged FIM and reported the proper replacement.
  Fresh TextEdit AX/visual inspection independently shows exactly:

```text
PACKAGED CONTEXT — café 🌍
PACKAGED FIM OK
```

  The context, Unicode, and line count are unchanged; only the captured tag
  line was replaced, with no Enter or submission. Preserved the post-write
  window at
  `/Users/alessandro/a0/agent-zero/tmp/a0-tag-macos-20260831/acceptance/packaged-fim-after.jpeg`,
  `11341` bytes, SHA-256
  `7281c311cf18d911cead824ed37051cc824200426217ded9d391832cdbd2a646`.
- Chat count increased exactly seven to eight. New chat
  `/Users/alessandro/agent-zero/agent-zero/usr/chats/ZAVVKdaO/chat.json` has ID
  `ZAVVKdaO`, name `Text replacement`, profile `agent0`, and creation time
  `2026-08-31T16:28:06.568849-07:00`. Its bounded foreground context identifies
  TextEdit/Untitled, exact Unicode focused text and tag, direct replacement
  support, and explicit screenshot status `unavailable` because Accessibility
  exposed no verified window bounds. The Main model first emitted one empty/
  misformatted response, then recovered through Core's existing retry and
  returned exact replace marker plus `PACKAGED FIM OK`.
- After completion exactly one repo-local five-scope gateway `95531` remains;
  no launcher-tag/headless/computer-use helper exists, and UI plus health remain
  HTTP `200`. Packaged FIM acceptance passes. TextEdit is now a focused editable
  field with no A0 Tag, so the next physical shortcut is the packaged
  command-palette fallback gate.
- The user physically invoked from tag-free TextEdit and the packaged `A0 Tag`
  palette opened. Fresh AX showed exact packaged overlay URL, title
  `Ask Agent Zero to use your computer`, Agent 0 selected, empty composer,
  microphone, plus menu, Close, and disabled Send. Staged exact query
  `Reply with exactly PACKAGED COMMAND OK. Do not use Computer Use or change
  any application.` and preserved the enabled Send state at
  `/Users/alessandro/a0/agent-zero/tmp/a0-tag-macos-20260831/acceptance/packaged-command-before-send.jpeg`,
  `26433` bytes, SHA-256
  `391a54c6cc8c16fd6c98c885b898f941066a6b88f69697b1845be4891fbb72e9`.
- Clicked only the real Send control. The palette disappeared before the
  temporary headless worker ran. Immediate fresh TextEdit AX showed its text
  field focused and exact unchanged two-line value; the main Launcher had no
  palette window. Preserved that origin state at
  `/Users/alessandro/a0/agent-zero/tmp/a0-tag-macos-20260831/acceptance/packaged-command-origin-restored.jpeg`,
  `11341` bytes, SHA-256
  `7281c311cf18d911cead824ed37051cc824200426217ded9d391832cdbd2a646`.
  A later shell-level frontmost query reported ChatGPT because the active Codex
  inspection itself had resumed; it is not substituted for the immediate
  post-Send TextEdit focus evidence.
- Chat count increased exactly eight to nine. New chat
  `/Users/alessandro/agent-zero/agent-zero/usr/chats/eD4U4k2M/chat.json` has ID
  `eD4U4k2M`, name `A0 Tag Execution`, profile `agent0`, and creation time
  `2026-08-31T16:32:36.634695-07:00`. Its prompt records
  `invocation_surface=command_palette`, `target_scope=computer`, and empty app/
  window/tag/focused/tree context. The Main model made no Computer Use call and
  returned exact marker plus `PACKAGED COMMAND OK`; this is the required
  model-decided text result from Computer mode, never a Launcher intent
  classifier or insertion path. As in FIM, Core retried one initial
  misformatted model response successfully.
- The worker PID `97604` exited. Exactly gateway `95531` remains, TextEdit is
  still unchanged, and both HTTP probes are `200`. Preserved the final origin at
  `/Users/alessandro/a0/agent-zero/tmp/a0-tag-macos-20260831/acceptance/packaged-command-after.jpeg`,
  `11781` bytes, SHA-256
  `58193cdbf724d656d47e35048ac395509877bf9d516b494f806f1f7f03bfb652`.
  Packaged command-mode acceptance passes.
- Reopened exact **Privacy & Security > Accessibility** and confirmed
  `Agent Zero Launcher` on before the recovery test. The user switched only
  that entry off. The first confirmation read found macOS's authorization sheet
  still open (`Privacy & Security is trying to modify your system settings`),
  so the task correctly did not assume revocation. The user authenticated and
  selected `Modify Settings`; a second fresh read then showed exact
  `Agent Zero Launcher_Toggle = off`. Every other entry remained unchanged.
- Preserved the authenticated off state at
  `/Users/alessandro/a0/agent-zero/tmp/a0-tag-macos-20260831/acceptance/packaged-accessibility-revoked.jpeg`,
  `54882` bytes, SHA-256
  `1ec1c9f98ef0880fd89d89829ebefe64b89b7d5116e6809fd91a22ce4c0b59d6`.
  The packaged main PID is still `95267`, exactly one five-scope gateway
  `95531` remains, and chat count remains nine. This is correct separation:
  native TCC revocation does not terminate or mutate the selected Instance's
  outbound Host access lease. Next invoke once from tag-free TextEdit; expected
  behavior is an explicit Accessibility failure with no palette, worker, chat,
  capture, or text change.
- Raised/focused unchanged tag-free TextEdit and the user physically invoked
  once. Contrary to the expected fresh denied state, the empty palette opened
  with no toast or macOS notification. No request was submitted: chat count
  stayed nine, no worker/helper appeared, and TextEdit remained unchanged after
  closing the palette. Fresh System Settings inspection still shows the
  packaged switch definitively off.
- This is evidence that macOS retained Accessibility trust in the already-
  running packaged process after revocation, not evidence that the setting
  reverted. Preserved the cached-trust palette at
  `/Users/alessandro/a0/agent-zero/tmp/a0-tag-macos-20260831/acceptance/packaged-accessibility-revoked-cached-palette.jpeg`,
  `19006` bytes, SHA-256
  `7e8200b4d78a0a7e693db80f857da7525286525ad30815dc280440c81a456fe7`.
  The pixel hash matches the earlier empty dragged palette because its visual
  content and persisted position are identical. The owner-correct next step is
  to restart only this exact packaged app while the grant remains off, keeping
  Colima/container/TCC state intact, then repeat the denied-state shortcut.
- Sent Ctrl-C only to packaged screen `95261`. Main PID `95267`, gateway
  `95531`, and helper/renderers exited; the screen closed itself. Container and
  both HTTP probes stayed healthy. Restarted the identical inspected app under
  screen `99057`, login shell `99061`, and new main PID `99063`, with the same
  explicit repo-local `A0_CLI_PATH` and no local-content override.
- Reopened the sole selected `agent-zero` Instance through the real renderer.
  Host access connected and exactly one new repo-local gateway PID `99278`
  started with the same gateway/Instance/workspace/host identity and all five
  scopes. No second gateway, helper, or tagged child exists; chat count remains
  nine and both endpoints remain HTTP `200`. Fresh System Settings AX after the
  restart still reports exact `Agent Zero Launcher_Toggle = off`. This is now a
  valid fresh-process permission-denied condition for the physical shortcut.
- The user physically invoked again after that restart and the empty palette
  still opened, with no toast or macOS notification. Closed it without
  submission; chat count remains nine, only gateway `99278` exists, and
  TextEdit is unchanged. Therefore process freshness alone is insufficient:
  the screen-launched app and its gateway still inherit the Codex/Terminal TCC
  responsibility chain, whose entries remain allowed. This cannot honestly
  test the package's own off entry and is a harness identity issue, not a
  product permission result.
- The exact next correction is native LaunchServices launch of the same `.app`.
  `launchctl getenv A0_CLI_PATH` and `launchctl getenv
  A0_LAUNCHER_LOCAL_REPO` both returned empty, so no user session value exists
  to overwrite. Temporarily set only repo-local `A0_CLI_PATH`, launch through
  `open -na`, then immediately unset the session value; the launched process
  retains its copied environment while unrelated future applications do not.
- Stopped screen-owned main PID `99063` and gateway `99278` cleanly; no screen
  remained and both Agent Zero probes stayed HTTP `200`. Temporarily set the
  previously absent session `A0_CLI_PATH`, launched the exact `.app` with
  LaunchServices `open -n`, and removed the value via an EXIT trap immediately
  after process creation. A follow-up `launchctl getenv` for both
  `A0_CLI_PATH` and `A0_LAUNCHER_LOCAL_REPO` returned empty. Exact package main
  PID is now `220` with PPID `1`, proving launchd/LaunchServices ownership and
  no Codex/screen/Terminal wrapper.
- Opened the selected Instance. Exact repo-local five-scope gateway PID `509`
  proves the copied CLI environment reached the package even though the
  session value is gone. The tab immediately reports `Host access needs
  action`. Its existing Host access dialog says exact
  `Allow Agent Zero Launcher in macOS Accessibility settings.` while still
  showing all five Host permissions on and the gateway connected. This is the
  true packaged TCC identity/boundary. Preserved the diagnosis at
  `/Users/alessandro/a0/agent-zero/tmp/a0-tag-macos-20260831/acceptance/packaged-accessibility-launchservices-denied.jpeg`,
  `48595` bytes, SHA-256
  `27c062203cd83ea166f063bbdaadf0bd8648399ad838a46b565f14101cffe6ab`.
  Chat count remains nine, container/UI remain healthy, and no A0 Tag worker
  exists.
- Closed only the diagnosis dialog, raised the existing tag-free TextEdit field,
  and asked for one physical `Cmd+Shift+Enter` while the exact package entry
  remained off. The user reported exact result `nothing opened`. A fresh AX
  read immediately afterward found the same focused editable field and exact
  unchanged two-line value `PACKAGED CONTEXT — café 🌍` / `PACKAGED FIM OK`;
  there was no palette or notification.
- Preserved the unchanged post-invocation surface at
  `/Users/alessandro/a0/agent-zero/tmp/a0-tag-macos-20260831/acceptance/packaged-accessibility-shortcut-disabled.jpeg`,
  `11341` bytes, SHA-256
  `7281c311cf18d911cead824ed37051cc824200426217ded9d391832cdbd2a646`.
  This intentionally matches the accepted packaged FIM after-image byte-for-byte:
  the denied shortcut made no visible or textual change.
- The first audit command mistakenly queried the clean Core checkout's absent
  `/Users/alessandro/a0/agent-zero/usr/chats` path and printed `find: ... No such
  file or directory` plus zero. Corrected immediately against the exact live
  bind source `/Users/alessandro/agent-zero/agent-zero/usr/chats`: chat count is
  still nine. Process-specific checks report only gateway PID `509`; no
  `--launcher-tag`, macOS helper, or `a0 headless` process exists. Packaged main
  PID `220` remains PPID `1`, gateway `509` remains its child, and `/` plus
  `/api/health` both return HTTP `200`. The package-specific Accessibility-off
  shortcut gate therefore passes without terminating the outbound gateway
  lease. Next restore only the package entry and prove recovery.
- Reopened exact **System Settings > Privacy & Security > Accessibility**
  read-only. Fresh AX confirms `Agent Zero Launcher_Toggle = off`; ChatGPT,
  Codex Computer Use, Electron, and Terminal remain on, while the managed DeskIn
  and MosyleMDM values remain untouched. Preserved this pre-restore state at
  `/Users/alessandro/a0/agent-zero/tmp/a0-tag-macos-20260831/acceptance/packaged-accessibility-before-restore.jpeg`,
  `68478` bytes, SHA-256
  `94e7a56a96a9021af2b0d3aa0eb963a6cab34dcaccc54d2a2164b78e5a10f1d1`.
  Human action is now required to switch only the exact packaged entry on and
  authenticate if macOS asks; no other permission needs changing.
- The user switched the exact `Agent Zero Launcher` Accessibility entry on.
  Fresh AX confirmed the switch was committed, with no authentication sheet
  remaining and every other entry unchanged. Preserved the restored state at
  `/Users/alessandro/a0/agent-zero/tmp/a0-tag-macos-20260831/acceptance/packaged-accessibility-restored.jpeg`,
  `69435` bytes, SHA-256
  `558129ca3f7c4c58a1f33bc33a1bd406522175268404cecc4b5be2b3e9a01cfe`.
- Retried only the existing Host access connection. It advanced from exact
  Accessibility denial to exact `Allow Agent Zero Launcher in macOS Screen
  Recording settings.`, proving the same package/gateway permission sequence.
  Invoked its existing **Allow Screen Recording** setup control. The temporary
  permission helper exited normally; no always-on helper was introduced.
- Opened exact **System Settings > Privacy & Security > Screen & System Audio
  Recording** and confirmed `Agent Zero Launcher_Toggle = on`. macOS displayed
  its native notice that the grant may not take effect until the app quits, with
  `Quit & Reopen` and `Later`. The user followed the precise instruction to
  choose `Later`, because an OS-managed reopen would not preserve the temporary
  repo-local `A0_CLI_PATH` used for this unreleased package test. Preserved the
  enabled state at
  `/Users/alessandro/a0/agent-zero/tmp/a0-tag-macos-20260831/acceptance/packaged-screen-recording-enabled.jpeg`,
  `61333` bytes, SHA-256
  `7b02f955ad9352de7b4995041945876d64126cec50fe402fcf950a9aae074a8f`.
  Main PID `220` and repo-local gateway PID `1937` remain live until the planned
  controlled restart; Colima/container are untouched.
- Gracefully quit only packaged main PID `220`. Gateway PID `1937`, renderers,
  and any private helper exited; no tagged/headless child remained. The first
  relaunch script then stopped safely before launch because it used nonexistent
  `/usr/bin/launchctl`, reporting exact
  `zsh:18: no such file or directory: /usr/bin/launchctl`. The permission and
  container state were unaffected; the app was briefly and intentionally down.
- Corrected to discovered native `/bin/launchctl`. Temporarily set only
  `A0_CLI_PATH=/Users/alessandro/a0/a0-connector/.venv/bin/a0`, launched the same
  package through `open -n`, and immediately unset the value through the EXIT
  trap. New main PID `3807` has PPID `1`; follow-up `launchctl getenv` for both
  `A0_CLI_PATH` and `A0_LAUNCHER_LOCAL_REPO` is empty. Both Agent Zero HTTP
  probes remained `200` throughout.
- Reopened only the existing `agent-zero` Instance. The first UI click expired
  harmlessly as the renderer updated (`Computer Use server error -10005: The
  element ID is no longer valid`); a fresh AX read and current control opened it
  successfully. The selected tab now reports exact `Host access connected`.
  Exactly one repo-local five-scope gateway PID `4049` is a child of main PID
  `3807`; chat count remains nine, and no tag/helper/headless worker exists.
  Preserved the recovered package/lease surface at
  `/Users/alessandro/a0/agent-zero/tmp/a0-tag-macos-20260831/acceptance/packaged-permission-recovered-ready.jpeg`,
  `95239` bytes, SHA-256
  `811d0dd28804e9aa82883e3bddb29da1a02cb64c484e7fa6aed4c7f15a7597dd`.
  The next gate is one physical shortcut from tag-free TextEdit, followed by
  closing the empty palette and confirming state remains nine chats/one gateway.
- Raised and focused the same plain-text TextEdit field. Fresh AX reports exact
  unchanged value `PACKAGED CONTEXT — café 🌍` / `PACKAGED FIM OK`, with no A0
  Tag range. Preserved the recovery pre-shortcut surface at
  `/Users/alessandro/a0/agent-zero/tmp/a0-tag-macos-20260831/acceptance/packaged-permission-recovery-before-shortcut.jpeg`,
  `12125` bytes, SHA-256
  `bed5c2b0ed609b6d3eafe9721bcdd455b32f622526fdce893c0ac96b3b8c4de6`.
  Awaiting exactly one physical `Cmd+Shift+Enter`; expected result is the empty
  package-owned command palette with no automatic submission.
- The user physically invoked once and reported exact `Yes, it's opened`.
  Fresh package AX showed one `A0 Tag` window with the expected Computer-mode
  title, profile `Agent 0`, plus menu, empty composer, microphone, close button,
  and disabled Send. No prompt was entered and nothing was submitted. Preserved
  the recovered palette at
  `/Users/alessandro/a0/agent-zero/tmp/a0-tag-macos-20260831/acceptance/packaged-permission-recovery-palette.jpeg`,
  `19006` bytes, SHA-256
  `7e8200b4d78a0a7e693db80f857da7525286525ad30815dc280440c81a456fe7`.
  Its bytes intentionally match the earlier empty package palette: permission
  recovery changed authorization, not palette rendering.
- Clicked only **Close A0 Tag**. Fresh TextEdit AX immediately reported the same
  focused editable field and exact unchanged value; the package then exposed
  only its normal `Agent Zero` window, with Host access still connected and no
  `A0 Tag` window. Preserved the post-close TextEdit state at
  `/Users/alessandro/a0/agent-zero/tmp/a0-tag-macos-20260831/acceptance/packaged-permission-recovery-after-close.jpeg`,
  `11341` bytes, SHA-256
  `7281c311cf18d911cead824ed37051cc824200426217ded9d391832cdbd2a646`.
  A later shell frontmost query reported ChatGPT after Computer Use returned to
  this task; it is not substituted for the immediate focused TextEdit AX proof.
- Final recovery audit: chat count remains nine, exactly repo-local gateway PID
  `4049` remains under LaunchServices-owned main PID `3807`, and no
  `--launcher-tag`, macOS helper, or `a0 headless` process exists. Both HTTP
  probes return `200`. The package has now passed FIM, command mode, true
  package-specific Accessibility denial, Accessibility restore, Screen Recording
  first grant/restart, and physical shortcut recovery without a new Instance,
  fallback gateway, chat, target leak, or orphan process. Packaged gate passes.

#### final macOS regression and review pass

- Ran final complete suites in parallel against the accepted source and live
  package state. Raw Connector command
  `/Users/alessandro/a0/a0-connector/.venv/bin/python -m pytest tests/ -q`
  exited `1` in `28.80s`: `839 passed, 1 skipped, 1 failed`. The only failure is
  the exact previously isolated unrelated
  `tests/test_plugin_backend.py::test_browser_runtime_endpoint_updates_browser_plugin_config`:
  current Core adds empty `keyboard_layout` and `keyboard_variant`, while the
  fixture still omits them. No macOS/A0 Tag test failed.
- Launcher `node --test` exited `0` in `10.80s`: `712 passed, 2 skipped, 0
  failed`. Bare discovery now includes both checkout tests and the identical
  ignored test copies inside the newly built `dist/desktop/macos/.../Resources/app`
  package, so its count is exactly twice the source-only cardinality minus no
  cases. Existing typeless-package ESM reparsing warnings remain non-failing.
  Run source-only discovery next for the canonical checkout count, in parallel
  with Connector's exact one-test deselection.
- Connector isolation command
  `/Users/alessandro/a0/a0-connector/.venv/bin/python -m pytest tests/ -q
  --deselect=tests/test_plugin_backend.py::test_browser_runtime_endpoint_updates_browser_plugin_config`
  exited `0` in `28.23s`: `839 passed, 1 skipped, 1 deselected`. This proves all
  runnable in-scope and unrelated tests are green while preserving the known
  fixture failure as separate evidence.
- Launcher source-only command
  `rg --files -0 -g '*.test.js' -g '*.test.mjs' -g '!dist/**' | sort -z |
  xargs -0 node --test` exited `0` in `10.32s`: `356 passed, 1 skipped, 0
  failed`. The two-test increase over the earlier `354 passed` count is the
  final macOS permission coverage added during this tranche; no generated
  package test was included. Proceed to final repository/DOX/security/runtime
  audits and the required read-only frdel alignment review.
- `2026-08-31T17:17:43-0700 PDT`: the final current-contract review found two
  deterministic macOS edge cases before sign-off. Bounded AX reads subtract or
  add `4096` native UTF-16 units; on a long document that arbitrary boundary can
  bisect a surrogate pair and reject an otherwise valid Unicode tag. Also, the
  parser deliberately excludes trailing horizontal whitespace from the exact
  replacement range, but the successful write moved the caret to the end of
  the replacement rather than preserving its original logical-line position
  after that untouched whitespace. Both conflict with the explicit Unicode and
  caret-at-end contracts. The owner-correct minimal fix is one existing-runtime
  bounded-read retry that trims only the uncertain edge by one UTF-16 unit,
  plus a replacement caret offset equal to the untouched `caret - end` span.
  Add one focused regression for each, then rerun the macOS backend and full
  Connector suites. No dependency, protocol, Launcher, Core, or public action
  change is warranted.
- `2026-08-31T17:19:11-0700 PDT`: applied the minimal owner-local correction in
  `packages/a0-computer-use-macos/src/a0_computer_use_macos/runtime.py`. One
  bounded AX range helper retries a rejected read after trimming only the
  uncertain outer UTF-16 edge by one unit and returns its adjusted offsets, so
  absolute tag positions remain exact. Focused context is assembled from safe
  before/original/after ranges instead of one range with two arbitrary edges.
  Replacement now preserves the untouched `target.caret - target.end` trailing
  whitespace span when setting and verifying the final caret. Added two focused
  regressions in `tests/test_macos_computer_use_backend.py`: a long document
  whose `4096`-unit before and after boundaries each bisect an emoji, and a tag
  with untouched trailing space/tab. Command
  `./.venv/bin/python -m pytest tests/test_macos_computer_use_backend.py -q`
  exited `0`: `44 passed in 0.22s`.
- `2026-08-31T17:20:07-0700 PDT`: reran the complete Connector suite against
  the corrected source. Raw command `./.venv/bin/python -m pytest tests/ -q`
  exited `1` in `29.22s`: `841 passed, 1 skipped, 1 failed`; the sole failure
  remains the previously isolated unrelated
  `tests/test_plugin_backend.py::test_browser_runtime_endpoint_updates_browser_plugin_config`,
  where current Core adds empty `keyboard_layout` and `keyboard_variant` but
  the Connector fixture omits them. Exact isolation command with only that test
  deselected exited `0` in `29.23s`: `841 passed, 1 skipped, 1 deselected`.
  The two new macOS regressions account for the count increase from `839` to
  `841`; no in-scope failure remains.
- `2026-08-31T17:21:02-0700 PDT`: synchronized the accepted packaged runtime to
  the final Connector source through the product lifecycle seam. Closed only
  the selected `agent-zero` Instance tab; exact old gateway PID `4049` exited
  and no gateway, tag worker, macOS helper, or headless process remained.
  Reopened the same Instance through the packaged renderer. Its tab advanced
  from `Host access connecting` to exact `Host access connected`, and fresh
  repo-local gateway PID `6733` (PPID `3807`) started at `17:20:47` with the
  same gateway ID, live workspace, host label, and all five scopes. Chat count
  remains nine, `/` and `/api/health` remain HTTP `200`, and no private worker
  exists. The package stays open for inspection with exactly one lease and the
  final Python runtime loaded.
- `2026-08-31T17:22:19-0700 PDT`: completed the required final read-only frdel
  alignment review after native and packaged acceptance. Direct same-subsystem
  history remains sparse: Connector has only Jan Tomášek's initial `aa2c06d`,
  and Launcher's relevant frdel commits (`e84aca0`, `022024c`, `7a80a8b`) cover
  older Forge signing/build configuration rather than the current tag runtime.
  Current local Core history supplies stronger repeated evidence: `4e243a99`
  centralizes shared routing/security instead of duplicating paths,
  `7bd3ab6a` adds a minimal owner-boundary safety guard, `2cf73c4b` returns a
  structured owner value and updates direct callers, and `e138e33c` keeps DOX
  beside its owning scopes. Final verdict: **aligned**, medium overall
  confidence and low direct macOS-subsystem historical confidence. The tranche
  reuses the accepted manager/gateway/lease/AX/CoreGraphics/Electron seams,
  adds no dependency or parallel protocol, holds ephemeral target state at its
  lifecycle owner, validates every protected identity/range before write or
  capture, and updates nearest DOX/tests. The final Unicode-boundary and caret
  corrections are current-contract fixes, not speculative history-driven
  rewrites. No further frdel-style change is evidence-backed.
- Final repository review at the same point: Connector has exactly the expected
  11 modified tracked files, Launcher exactly eight, Core is clean at
  `4d10f601d7e4c136d2b866feca0a5db91b571b61`; all three `git diff --check`
  commands pass. Non-ledger diffs contain no private-key marker, hard-coded
  workstation path, or Ponytail comment; apparent `token` matches are the
  required opaque target token fields. No dependency metadata changed.
- `2026-08-31T17:24:04-0700 PDT`: completed recoverable cleanup. Moved—not
  deleted—the eight task-created chat directories `0ecGHGCK`, `AivwJdBQ`,
  `NLIQs67C`, `Wk8dktfq`, `Y2ur0OcB`, `ZAVVKdaO`, `cljsyTcy`, and `eD4U4k2M`;
  the three task upload copies; and the disposable `attachments/`,
  `protected-field.html`, and `stale-target.html` fixtures into exact backup
  `/Users/alessandro/a0/agent-zero/tmp/a0-tag-macos-20260831/cleanup-backup/20260831T172219-0700/`.
  The backup contains 20 files and occupies `1.6M`. Attachment source/upload
  byte pairs remain exact: file SHA-256
  `b1f65505aa07c9efc8fd9e395b437bffc29647497d24b524af9a11d385e457df`,
  alpha `0cfcead86d78fc30c47f6d582dbbe0b882c0af7c39c979fd69ba3142eaaae67c`,
  and bravo `70a2971386b85f426b2a10424991610501bf3c214dea520e4b792d04912e4dfc`;
  HTML hashes are protected
  `b1c8498c6993783c77ab1f532fc1469b982ceb2d6027042346a82e181db94249`
  and stale
  `f6c7d592f4101f6077cdba076e8e863830344b95b400eedd801507a63167a829`.
  Restore is a direct move back
  from the categorized `chats/`, `uploads/`, and `fixtures/` directories.
  All acceptance screenshots, logs, package artifacts, and the pre-existing
  `cI3GK5WR` / `Test execution` chat remain in place. Refreshed the active
  Instance UI; it now visibly lists only `Test execution`, while the selected
  tab remains `Host access connected`.
- Final live/runtime/artifact audit: packaged main PID `3807` remains
  LaunchServices-owned (PPID `1`) with exactly one final repo-local gateway PID
  `6733`; no tag worker, macOS backend helper, headless client, or Screen session
  remains. Both Agent Zero probes are HTTP `200`; Launcher-managed Colima still
  reports container `c925ea4ff5c5` / `a0-inst-agent-zero-mthid64x` on image
  `agent0ai/agent-zero:ready`, healthy/up with port `49930 -> 80`. Session
  `A0_CLI_PATH` and `A0_LAUNCHER_LOCAL_REPO` remain absent. The arm64 package is
  ad-hoc/linker-signed (`codesign` identifier `Electron`, no TeamIdentifier,
  CDHash `0a61f34ddb268305476c657e579bf4774b4e63d5`), as expected for this local
  non-release gate. Source/package SHA-256 pairs match exactly for `a0_tag.js`
  (`4ad8288a290daa9b1548a77fd76638346c213f54200d76bb2b2a77a3c542abca`),
  `macos_permissions.js`
  (`f90d39371636590257feade8d30ff1d9b263902775ff2baac5b602149f7037e1`),
  and `main.js`
  (`e5a7750f8dc16345078c5f5cf9bdd00bbedb6524f0d3591fd75a8004b70f71ef`).
  Final `git diff --check` passes
  in all three repositories; Core remains clean. No commit, push, publish,
  notarization, release, dependency addition, or Core modification occurred.
- `2026-08-31T17:32:27-0700 PDT`: after explicit user authorization, committed
  the complete Connector macOS tranche on `development` as
  `ca4f05cfab2e744e0e82962960edd4ee7bfff1c8` — **Add native macOS A0 Tag
  backend**. The commit contains exactly the expected 11 Connector source,
  test, and DOX files (`1538 insertions`, `30 deletions`) and leaves that
  worktree clean. Its real message body has two paragraphs describing the
  bounded Accessibility/UTF-16 capture-replacement contract and complete
  capability/test surface; inspection with `git log -1 --format=%B` confirmed
  no literal `\n` text. No push occurred.
- `2026-08-31T17:32:58-0700 PDT`: committed the non-ledger Launcher macOS
  integration on `development` as
  `6702fe4b98d44f4c170d78851993375f42ba1aad` — **Complete macOS A0 Tag Launcher
  integration**. The commit contains exactly seven shell source, test, and DOX
  files (`101 insertions`, `4 deletions`): native Electron microphone
  permission preflight with exact application identity, plus deterministic
  GNOME and case-insensitive-filesystem test seams. Its two real body paragraphs
  preserve selected-Instance Whisper ownership and the accepted Linux behavior;
  `git log -1 --format=%B` confirms no literal `\n` text. Only this ledger now
  remains modified in Launcher. Commit it alone as the final macOS handoff;
  do not push. The next tranche belongs to Windows 10 x64 on its own machine.

## 12. Known Risks and Mitigations

- **Wayland shortcut ownership differs between development and AppImage.**
  Test both. Electron portal registration is preferred; GNOME fallback is one
  reversible native media-key binding to the current PID, never a keyboard
  hook.
- **AT-SPI offsets are Unicode codepoints while JavaScript strings use UTF-16.**
  Parse/store native offsets in Python/helper; pass opaque token to Launcher.
- **Rich editors may not expose safe EditableText replacement.**
  Keep exact helper checks. Open the explicit palette for allowlisted capture
  failures; only ordinary Computer Use may operate the app, never simulated
  Launcher insertion.
- **GNOME Wayland does not expose verified native-window screen bounds here.**
  Keep initial tag context text/tree-only; never crop the monitor using AT-SPI
  `(0, 0)` geometry. Re-enable attachments only with a compositor-verified
  active-window source.
- **An app can visually mask an ordinary field without semantic protection.**
  Reject every platform-reported protected/password field before reading it;
  document that native code cannot infer secrecy when an app exposes ordinary
  readable accessibility text.
- **Delete then insert can partially fail.**
  Preserve original tag and restore it best-effort before reporting failure.
- **A BrowserWindow can become active on GNOME Wayland despite inactive flags.**
  Do not create the working window there; show an overlay only after exact
  replacement/action/error is complete. Other platforms keep the compact
  non-activating working surface pending their machine verification.
- **The focusable palette necessarily becomes the active window.**
  Close it before starting tagged headless work so the desktop restores the
  origin app; live-test this on each platform. If a compositor does not restore
  focus, fail visibly rather than teaching the agent to click an inferred app.
- **Microphone permission and model state belong to the Instance page.**
  Invoke only its existing `_whisper_stt` store, mirror bounded errors in the
  palette, keep its five-minute no-result timeout, and cancel on every palette or
  lease exit. Never proxy raw audio or duplicate Whisper in Launcher.
- **A selected folder can contain too much or escape through symlinks.**
  Require an explicit native chooser result, never infer a folder, skip nested
  symlinks, deduplicate resolved files, and enforce 16 selections / 128 files /
  25 MiB per file / 100 MiB total in the gateway worker before upload. Keep host
  paths out of renderer state and tagged argv.
- **Model might omit/mangle delivery marker.**
  Fail closed to overlay and preserve the full A0 chat.
- **Untrusted app content can contain prompt injection.**
  Delimit it explicitly and never let it bypass gateway/native enforcement.
- **Tagged headless client could accidentally expose host tools.**
  Explicitly construct it with every local capability disabled and test Hello
  metadata plus Core fallthrough behavior.
- **Action mode could submit the raw tag.**
  Prompt states it is a control command; action acceptance tests include local
  forms and verify raw tag is not submitted.
- **Tab/scope state can change mid-run.**
  Re-check lease/config before every final apply and release on all exits.
- **Remote platform code cannot be honestly accepted on Linux.**
  Keep shared contracts cross-platform, then use the user's Mac and Windows
  machines at the explicit gates.

## 13. Deliberate Non-Goals

- New Agent Zero Core protocol or response-tool schema.
- Always-on daemon or inbound Launcher server.
- Passive tag detection.
- Configurable shortcuts in MVP.
- Invocation queues or concurrency.
- Continuing one tag thread across multiple invocations.
- Per-tag or per-feature copy of Host access permissions.
- Launcher-side intent classifier.
- Automatic instance fallback.
- Automatic Enter/submission in replace mode.
- OS-level confinement of Computer Use to one application window; restored app
  focus is contextual intent, while the inherited gateway Computer Use
  permission remains the enforcement boundary.
- X11 support change.
- New dependencies.
- Telemetry.
- Version bump, commit, push, PR, or release without a separate user request.
