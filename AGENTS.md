# AGENTS.md

Guidance for AI coding agents working in `/home/eclypso/a0/a0-launcher`.

## Documentation First

Documentation is part of the development contract for this repository.

Treat every `AGENTS.md` file as the source of truth for the code in its subtree.
When a development concept, runtime contract, file layout, workflow, IPC method,
component pattern, Docker behavior, or release process changes, update the
closest owning `AGENTS.md` in the same session as the code change.

Documentation hierarchy:

- `/AGENTS.md` owns repo-wide policy, top-level architecture, product language,
  development commands, release/version expectations, and the exhaustive AGENTS
  file index.
- Level 1 docs such as `/app/AGENTS.md`, `/shell/AGENTS.md`, `/.github/AGENTS.md`,
  `/scripts/AGENTS.md`, and `/docs/AGENTS.md` own major project areas.
- Deeper docs own concrete implementation contracts for their subtree.
- The closer a doc is to code, the more exact it must be about files, entry
  points, state, side effects, naming, and test commands.
- Parent docs document boundaries and stable contracts. Child docs document exact
  implementation behavior.

Update rules:

- Update the nearest owning `AGENTS.md` for every code change.
- Update parent docs when a change affects architecture, ownership, runtime
  behavior, commands, environment variables, release/version flow, or the
  documentation hierarchy.
- Keep this root index exhaustive whenever an `AGENTS.md` file is added, removed,
  moved, or renamed.
- Remove stale or contradictory notes immediately.
- Keep public product copy in `README.md` and `docs/`. Keep durable development
  contracts in `AGENTS.md`.
- If a subtree later gains child `AGENTS.md` files, update the parent with a
  `Documentation Hierarchy` section before or alongside those child docs.

Default section order for child docs:

- `Purpose`
- `Documentation Hierarchy` when child docs exist
- `Ownership`
- Concrete contract sections for that area
- `Development Guidance`
- `Testing` when the area has runnable checks or special verification needs

## AGENTS File Index

This index must stay exhaustive.

Top-level docs:

- `/AGENTS.md`

Renderer docs:

- `/app/AGENTS.md`
- `/app/a0ui/AGENTS.md`
- `/app/components/docker-manager/AGENTS.md`

Electron and Docker docs:

- `/shell/AGENTS.md`
- `/shell/docker_manager/AGENTS.md`
- `/shell/docker_adapter/AGENTS.md`

Project support docs:

- `/.github/AGENTS.md`
- `/docs/AGENTS.md`
- `/scripts/AGENTS.md`

## Compass

Build as if elegance and reliability are the same requirement. Prefer code that
is clear, restrained, robust, and worthy of the Agent Zero brand: functional
beauty, not decorative noise.

Keep the signal high. Explore boldly, then refine carefully. Make the app feel
like it dissolves Docker from the user's path instead of explaining Docker back
to them.

## Project Overview

The launcher is an Electron desktop app that lets people install, activate,
switch, inspect, and open Dockerized Agent Zero instances without needing to
learn Docker first.

Primary runtime areas:

- `app/`: static renderer content, portable Agent Zero UI assets, component
  views, renderer state, and user-facing Docker Manager interactions.
- `shell/`: Electron main/preload code, content distribution, IPC, secure
  windows, tray behavior, and privileged Docker orchestration.
- `shell/docker_manager/`: app-specific Agent Zero image, instance, storage
  volume, release, retention, and remote-instance orchestration.
- `shell/docker_adapter/`: Docker and Docker Hub abstraction layer around
  Dockerode and registry calls.
- `.github/workflows/`: release builds and `content.json` bundle publication.
- `scripts/`: local build metadata and developer bootstrap helpers.
- `docs/`: public or user-facing supplemental documentation.

The architectural rule is simple: renderer code requests intent; shell code owns
privilege; Docker adapter code owns Docker mechanics.

## Environment

- Shell: `bash`
- OS: Ubuntu Linux
- Workspace: `/home/eclypso/a0/a0-launcher`
- Use Linux paths and commands in examples.
- Do not assume Windows-only paths such as `.\.venv\Scripts\python`; use Linux
  virtualenv paths like `./.venv/bin/python`.

## Running The Launcher

Use local app contents with:

```bash
A0_LAUNCHER_LOCAL_REPO=/home/eclypso/a0/a0-launcher npm start
```

For quick validation, prefer:

```bash
node --check shell/main.js
node --check shell/preload.js
node --check shell/docker_manager/index.js
node --check app/docker_manager.js
git diff --check
```

There is no default `npm test` contract in this repo unless a future commit adds
one.

## Runtime And Release Contracts

Electron app version:

- `App: ...` in the UI comes from Electron `app.getVersion()`, which reads the
  root `package.json` version.
- Keep `package.json` and the root entries in `package-lock.json` aligned with
  the current release line so local `npm start` runs do not show stale metadata.
- Release workflows set package metadata from the selected tag during builds,
  but the checked-in package version is still the fallback and local-dev source
  of truth.

Renderer content:

- Packaged or non-local runs fetch `content.json` from the latest GitHub Release
  for the configured launcher repo and unpack it under Electron `userData`.
- Local development should use `A0_LAUNCHER_LOCAL_REPO=/home/eclypso/a0/a0-launcher`
  so the shell serves files directly from this checkout.
- `A0_LAUNCHER_GITHUB_REPO` can override the launcher content repository.
- `A0_LAUNCHER_USE_LOCAL_CONTENT=true` can use the current working directory as
  local content when it contains `app/index.html` and `package.json`.

Agent Zero backend releases:

- Docker images default to `agent0ai/agent-zero`.
- Backend release metadata defaults to `agent0ai/agent-zero`.
- `A0_BACKEND_IMAGE_REPO` and `A0_BACKEND_GITHUB_REPO` may override those repos
  for testing.

Tags and GitHub Releases:

- `v*` tags are release inputs for executable builds.
- Two-segment tags such as `v0.1` become semver `0.1.0` in the workflow.
- Release artifacts are macOS arm/x86 DMG and ZIP, Windows arm/x86 Squirrel
  setup and NuGet packages, Linux arm/x86 DEB packages, and `content.json`.
  Linux RPMs are intentionally omitted unless the product decision changes.
- If a release tag is moved to include a metadata fix, keep `main`, the tag, and
  both remotes intentionally aligned; stale tags are worse than no poetry at all.

## Agent Zero Runtime Assumptions

- When discussing plugin/backend code, treat the Dockerized Agent Zero instance
  at `localhost:32080` as the live runtime.
- If you change live runtime plugin/backend code, also copy those changes into
  the real A0 Core plugin repo:

```bash
/home/eclypso/a0/agent-zero/plugins
```

Do not leave runtime-only plugin changes stranded in the container.

## Product Direction

The launcher is the bridge that lets people run Agent Zero instances without
needing to understand Docker first.

- Say `Instances`, not `Sessions`, for running or retained containers.
- Say `Storage volumes`, not just `Storage`, when referring to Docker volumes.
- Keep Docker mechanics behind purposeful controls.
- Put `Open UI` where the instance lives, not in the global header.
- Keep the surface quiet and precise: avoid excessive borders, nested cards, and
  explanatory clutter.
- The API Dashboard destination is:

```text
https://www.agent-zero.ai/p/community/api-dashboard/
```

## Code Style

- Follow existing patterns before inventing new ones.
- Keep changes narrowly scoped to the requested behavior.
- Use structured APIs and parsers when available; avoid fragile string
  manipulation for nontrivial data.
- Prefer small helpers when they remove real complexity.
- Add comments only where they explain a non-obvious decision.
- Default to ASCII unless the file already uses meaningful Unicode.
- Do not create hidden scratch directories or commit generated outputs unless a
  checked-in fixture is explicitly requested.

## Frontend Principles

- Build the usable app first, not a landing page.
- Use Agent Zero's existing visual language and local tokens.
- Prefer familiar icon buttons for obvious controls such as refresh.
- Avoid boxy chrome where a lighter grouping works better.
- Make interactive states clear: loading, disabled, empty, success, and error.
- Keep text short and task-oriented.
- Verify text does not overflow compact controls or cards.

## Docker Manager Boundaries

- `app/` is the renderer/content layer.
- `shell/` is the Electron main/preload and Docker orchestration layer.
- Docker access belongs behind IPC and `shell/docker_manager`.
- Renderer code should call `window.dockerManagerAPI` through the preload
  surface.
- Keep Electron windows secure: `contextIsolation: true`, `nodeIntegration:
  false`, and `sandbox: true` unless there is a documented reason.

## CodeRabbit

CodeRabbit is installed in the terminal. Use it for code review when changes are
more than trivial.

Review uncommitted changes with:

```bash
coderabbit --prompt-only -t uncommitted
```

Useful help:

```bash
cr -h
```

Do not run CodeRabbit more than 3 times for one set of changes. If it is
cancelled, assume the user chose to cancel because the review was unnecessary for
that change.

## Git Discipline

- Make separate, logical, no-nonsense commits when the user asks for commits.
- Use a concise subject and a short body explaining the intent.
- Do not stage unrelated user changes accidentally.
- Do not revert user changes unless explicitly asked.
- Before committing, inspect `git status --short` and the staged diff.
- Prefer commits that tell the product story in order: surface, behavior,
  runtime wiring, docs.
