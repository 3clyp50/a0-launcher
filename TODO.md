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
7. Current follow-up: implementation, automated regression, visual proof, and a
   live authenticated file/folder gateway upload are complete. A normal local
   Launcher is running for the user's native-dialog and spoken-microphone feel
   test. Launcher HEAD is `d2c467c`; the larger A0 Tag feature remains
   intentionally uncommitted in Launcher and Connector, and must stay isolated
   from unrelated worktree changes.

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
