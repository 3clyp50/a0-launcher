# A0 Launcher

A0 Launcher is an Electron desktop app for installing, running, switching,
inspecting, and opening Dockerized Agent Zero instances without making Docker the
first thing a user has to understand.

It is intentionally small at the shell boundary: renderer code expresses user
intent, the Electron shell owns privileged IPC, and the Docker manager owns image,
container, release, storage-volume, and remote-instance orchestration.

## What It Does

- Detects Docker Desktop or Docker Engine availability.
- Lists Agent Zero backend releases and local Docker images.
- Installs, updates, activates, starts, stops, and switches Agent Zero instances.
- Keeps retained instances available for rollback.
- Shows local containers, saved remote instances, and storage volumes.
- Opens Agent Zero UIs from the instance where they belong.
- Provides a bottom A0 CLI Connector for launching the `a0` CLI against a
  running local instance.

## Runtime Model

The launcher has two layers:

1. **Shell** (`shell/`)
   - Electron main process, preload bridge, secure windows, tray, and IPC.
   - Downloads release content from GitHub Releases when local content is not
     requested.
   - Owns privileged Docker and terminal-launch behavior through
     `shell/docker_manager/` and `shell/docker_adapter/`.

2. **Renderer content** (`app/`)
   - Static HTML, CSS, ES modules, local Agent Zero UI assets, and
     `<x-component>` includes.
   - Bundled into `content.json` by GitHub Actions for release content updates.
   - Served by the shell through the `a0app://` protocol so `fetch()`, ES module
     imports, and relative URLs work like they would on a local web server.

Packaged and normal non-local runs load `content.json` from the latest configured
GitHub Release and cache it under Electron `userData`. Local UI work should opt
into local content explicitly.

## Requirements

- Node.js 20+
- npm 9+
- Docker Desktop or Docker Engine for Docker Manager features

## Quick Start

```bash
npm install
npm start
```

Plain `npm start` exercises the release-content path. That means it may show the
latest downloaded `content.json`, not your edited local `app/` files.

For local UI development, run:

```bash
A0_LAUNCHER_LOCAL_REPO=. npm start
```

You can also use the current working directory when it contains `app/index.html`
and `package.json`:

```bash
A0_LAUNCHER_USE_LOCAL_CONTENT=1 npm start
```

Content-source precedence:

1. `A0_LAUNCHER_LOCAL_REPO=<path>`
2. `A0_LAUNCHER_USE_LOCAL_CONTENT=1`
3. GitHub Release `content.json`

To test release content from a fork or another repository:

```bash
A0_LAUNCHER_GITHUB_REPO="owner/a0-launcher" npm start
```

## Docker Manager Development

Useful backend overrides:

```bash
A0_BACKEND_GITHUB_REPO="owner/agent-zero" npm start
A0_BACKEND_IMAGE_REPO="namespace/agent-zero" npm start
```

The default backend image is `agent0ai/agent-zero`, and the default backend
release metadata repository is `agent0ai/agent-zero`.

The A0 CLI Connector prefers the launcher-managed active instance URL. If there
is no launcher-managed active instance, it falls back to a running local Agent
Zero container from the Instances inventory when that container exposes a local
UI URL such as `http://127.0.0.1:32080/`. The terminal launcher accepts only
local `http:` or `https:` URLs without credentials.

## Validation

There is no default `npm test` contract yet. For quick validation, use:

```bash
node --check shell/main.js
node --check shell/preload.js
node --check shell/docker_manager/index.js
node --check app/docker_manager.js
git diff --check
```

For visible UI changes, run local content and inspect the affected screen:

```bash
A0_LAUNCHER_LOCAL_REPO=. npm start
```

## Build Executables

```bash
npm run make
npm run make:mac
npm run make:win
npm run make:linux
```

Platform-specific examples:

```bash
npm run make:mac -- --arch=arm64
npm run make:mac -- --arch=x64
npm run make:win -- --arch=arm64
npm run make:win -- --arch=x64
npm run make:linux -- --arch=arm64
npm run make:linux -- --arch=x64
```

Release artifacts are:

- macOS arm/x86 DMG and ZIP
- Windows arm/x86 Squirrel setup EXE and NuGet package
- Linux arm/x86 DEB packages
- `content.json`

Linux RPM artifacts are intentionally not published unless the product decision
changes.

## macOS Signing

For local or fork builds, unsigned macOS artifacts are usually enough:

```bash
SKIP_SIGNING=1 npm run make:mac
```

Release-grade macOS signing and notarization in GitHub Actions require:

- `MACOS_CERT_P12`
- `MACOS_CERT_PASSPHRASE`
- `APPLE_ID`
- `APPLE_PASSWORD`
- `APPLE_TEAM_ID`

When Apple credentials are absent, the workflow still builds unsigned macOS
artifacts.

## Release Process

GitHub Actions owns the release path:

1. Create or move a `v*` tag intentionally.
2. Create or update the GitHub Release for that tag.
3. `bundle-content.yml` checks out the tag, bundles `app/` into `content.json`,
   and uploads it to the release.
4. `build.yml` builds executable artifacts from the tagged source and uploads
   them to the release.

Two-segment tags such as `v0.3` are normalized to full semver versions such as
`0.3.0` during executable builds.

After publishing, verify release assets with:

```bash
gh release view <tag> --repo agent0ai/a0-launcher --json assets \
  --jq '[.assets[].name]'
```

## Repository Layout

```text
a0-launcher/
├── .github/workflows/       # Release executable and content bundle workflows
├── app/                     # Static renderer source content
│   ├── a0ui/                # Portable Agent Zero UI primitives and vendor assets
│   ├── components/          # Docker Manager component views
│   ├── docker_manager.css   # Launcher UI styles
│   ├── docker_manager.js    # Renderer state coordinator and action facade
│   └── index.html           # Renderer entrypoint
├── docs/                    # Supplemental user-facing docs and release notes
├── scripts/                 # Build metadata and bootstrap helpers
├── shell/                   # Electron shell, preload, content loading, IPC
│   ├── docker_adapter/      # Docker and registry abstraction layer
│   └── docker_manager/      # Agent Zero image, instance, release, and volume logic
├── AGENTS.md                # Repo-wide coding-agent contract
├── forge.config.js          # Electron Forge makers and packaging config
└── package.json
```

Coding agents should read `AGENTS.md` first. Each subtree may also have its own
`AGENTS.md` with closer implementation contracts.

## License

MIT
