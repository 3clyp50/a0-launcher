# Onboarding improvements

- [x] Use "Finish local Agent Zero runtime Setup." for the macOS initial setup
  description, matching Windows. Keep Linux and active phase descriptions.
- [x] Allow the first Agent Zero download and extraction to move to the existing
  background progress toast without canceling installation or losing progress.
- [x] Start onboarding with matching remote/local choice blocks. Save the local
  choice, open its runtime checklist expanded, and remove remote promotion from
  all later local steps.
- [x] Persist completion across relaunch, unavailable runtimes, and later Instance
  removal. Recognize existing installations from saved Instance/history evidence.
  Keep explicit Runtime Setup recovery available without replaying onboarding.
- [x] Verify both paths, background progress, completion persistence, and compact
  layouts with focused checks and updated UI captures.

## Implementation

- `app/components/docker-manager/runtime-gate/runtime-gate.js` owns the welcome
  choice and subsequent local setup. Create/Add dialogs and a handed-off download
  are protected from a recreated runtime modal. Canceling the remote dialog
  returns to the initial choice; local intent survives reload and stale snapshots.
- `app/components/docker-manager/operation-modal/operation-modal.js` reuses
  `Download in background` for the first image pull and extraction. The existing
  toast, failure recovery, and submitted form's run-after-pull behavior remain
  responsible for the operation lifecycle.
- `shell/docker_manager/state_store.js` persists `onboarding: local | complete`.
  No saved evidence means `new`; unreadable state remains an error, not a new
  installation. The no-argument `beginLocalSetup` intent saves the local choice
  without installing anything. Runtime installation still requires Continue.
- Completion follows a saved remote or a discovered local Instance. Upgrade
  detection also uses saved Instance names, Host access Instance records, and
  runtime identity history. Merely installed Docker and the compatibility-only
  `hostAccess.onboardingComplete` field are not completion evidence.
- Serialized, atomic state writes preserve onboarding advancement when another
  writer holds an older snapshot. Renderer state also rejects regressions.
  Completion reaches both state and inventory through the shell/preload bridge.
- Returning users with unavailable Docker get an explicit Runtime Setup action
  in Instances. Recovery can be closed when idle and does not show the welcome
  choices or first-image prompt.

## Verification

- Relevant renderer, state-store, runtime-provisioner, shell, and gateway suites:
  186 passed, 1 existing skip. Focused onboarding/state tests were rerun after the
  final changes. Syntax checks and `git diff --check` passed.
- Browser replay at 1280 x 900 and 800 x 600: remote cancel and submit, offline
  remote reload, local-choice reload, expanded checklist, no repeated remote
  promotion, background download/extraction, run-after-pull, stale state, and
  explicit runtime recovery passed.
- Native Electron local-content smoke used an isolated test profile with the
  existing Docker Instance. State and inventory reported `complete`, the marker
  was verified on disk, and renderer reload did not show onboarding.
- Captures: `output/playwright/onboarding-updated/`. Clean-machine runtime phases
  used simulated backend state; native macOS/Windows installation was not run.
- Completion protection assumes retained Launcher profile data. Deliberately
  deleting all saved profile/history is a fresh installation; upgrade detection
  cannot reconstruct history that no longer exists.
