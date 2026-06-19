# TODO

This file is a local working ledger for the current Windows/macOS/Linux runtime
and container-bootstrap push. It is intentionally verbose so future context
compactions can resume without rediscovering the same facts.

Do not commit this file unless the user explicitly asks.

## Goal Status

Make Agent Zero container bootstrap work reliably after runtime setup, and align
`a0-install` with the same runtime onboarding/reuse paths as `a0-launcher`
across Windows, macOS, and Linux.

Status on this Windows 10 machine: complete.

Status on this Ubuntu 24.04 machine: Linux launcher clean-slate path is closed
as of 2026-06-14. Docker was fully removed, the launcher bootstrapped native
Docker Engine through `pkexec`/apt, Docker-ready UI and lifecycle paths were
validated, and the machine was cleaned back to zero containers/images/volumes.
The only blocked real-image step was an external Docker Hub unauthenticated
rate limit while pulling `agent0ai/agent-zero:v1.20`; the launcher now surfaces
that as a visible operation failure, so it is not a Linux bootstrap blocker.

This TODO remains a portable next-machine handoff for Windows confirmation.
Copy it to the next Windows test machine before destructive validation,
especially for the fresh no-WSL/no-Docker path.

## Repos And Current Machine

- Launcher repo: `C:\Users\3CLYP50\Documents\GitHub\a0-launcher`
- Installer repo: `C:\Users\3CLYP50\Documents\GitHub\a0-install`
- Current host: Windows 10 Pro, version `10.0.19045`, ProductType `1`
- Current shell: Windows PowerShell `5.1.19041.6456`
- Current WSL positive path: Ubuntu under WSL2 with Docker Engine inside WSL
- Current Docker Engine observed in WSL: Docker Engine - Community `29.5.3`
- Current WSL kernel observed: `5.15.153.1-microsoft-standard-WSL2`
- Launcher WSL proxy endpoint: `tcp://127.0.0.1:23750`, loopback only
- Installer WSL mode: calls the Docker CLI inside WSL directly through
  `wsl.exe -d Ubuntu -u root -- docker ...`; it does not require a Windows
  `docker.exe` and does not expose an unauthenticated Docker TCP listener
- Latest stable Agent Zero release observed during testing: `v1.20`
- Latest stable release published at time of check: `2026-06-04T16:32:20Z`
- Image used in post-reset tests: `agent0ai/agent-zero:v1.20`
- Image digest observed in post-reset pull:
  `sha256:38c8a391003ba4f3ae968011504901a9d2bd92800ad4a0ebdbe80825e9296c3a`
- Final live validation URL: `http://127.0.0.1:5080/`
- Final live validation result: HTTP 200 from Windows PowerShell
- Final live launcher container state:
  `a0-svc-active__agent0ai-agent-zero`,
  `agent0ai/agent-zero:v1.20`, short id `cd41176659d1`, `Up`,
  port `127.0.0.1:5080->80/tcp`
- Plain `agent-zero` remains the CLI installer container name; the launcher
  active container name is intentionally managed/namespaced.
- Final root cause found for post-reset "container died" behavior:
  the Agent Zero container itself was healthy, but WSL idled/stopped after the
  Windows command context exited. Docker then reported the healthy container as
  `Exited (255)`, with `OOMKilled=false` and no in-container fatal signal.
- Final mitigation:
  launcher and installer now keep the selected WSL distro alive while
  launcher-owned proxy or Agent Zero containers are active.
- Linux closure host tested after the Windows pass: Ubuntu 24.04.4 LTS, kernel
  `6.17.0-35-generic`, user `eclypso`.
- Linux clean-slate reset before launcher test: Docker packages and data were
  removed; `docker`, `dockerd`, `/var/run/docker.sock`, `/var/lib/docker`, and
  `/var/lib/containerd` were absent.
- Linux Docker after launcher bootstrap: Ubuntu `docker.io`
  `29.1.3-0ubuntu3~24.04.2`, `containerd`
  `2.2.1-0ubuntu1~24.04.2`, `runc` `1.3.4-0ubuntu1~24.04.1`; Docker service
  active.
- Linux final Docker object state after cleanup: zero containers, images,
  volumes, and build cache.

## Non-Negotiable Constraints

- Do not change container CPU, memory, or disk sizing parameters.
- Do not hardcode old Agent Zero versions such as `v0.9.8`.
- Always prefer the newest stable Agent Zero GitHub release tag.
- Treat two-segment tags such as `v1.20` as semver-compatible `1.20.0`.
- Record the actual selected Agent Zero tag during live validation.
- Ask before installing Docker Desktop.
- Ask before enabling WSL or VirtualMachinePlatform.
- Ask before changing firewall, listener, or public network settings.
- Ask before rebooting Windows.
- Do not install Docker Desktop on Windows Server.
- Windows Server no-Docker paths must report WSL2/nested-virtualization
  requirements instead of recommending Docker Desktop.
- Any Docker TCP endpoint created for WSL must bind to loopback only.
- Preferred WSL Docker endpoint is `127.0.0.1:23750`.
- Never expose unauthenticated Docker TCP on a public/non-loopback interface.
- Keep local-only TODO/log/build artifacts out of commits.
- Do not overwrite or revert user changes.
- Before editing tracked code, read the closest `AGENTS.md`, inspect
  `git status --short`, and preserve unrelated changes.

## Completed Evidence To Preserve

- macOS Tahoe launcher path:
  - Packaged Electron app can bootstrap launcher-owned Colima/Lima/Docker CLI.
  - Homebrew is not required for the launcher-managed path.
  - Existing stopped `a0` Colima profile can be restarted.
  - Fresh launcher runtime directory can be repopulated and detected.
- macOS Tahoe installer path:
  - `a0-install` can bootstrap installer-owned Colima/Lima/Docker CLI.
  - Existing stopped `a0` Colima profile can be restarted.
  - Command Line Tools preflight was intentionally left to Colima/Lima errors.
  - Clean-slate Tahoe `26.3.2` VM, arm64, no Homebrew/no Docker/no Colima on
    login `PATH`, used installer-owned runtime at
    `/Users/m1/Library/Application Support/a0-install-test/runtime/bin`.
  - Quick Start selected current stable GitHub release tag `v1.20`, created
    `agent-zero` from `agent0ai/agent-zero:v1.20`, and returned HTTP 200 on
    `http://localhost:5080/`.
  - Rerun with Docker already running detected `1 Agent Zero container(s)` and
    showed `agent-zero [tag: v1.20]`.
  - Rerun from stopped Colima profile restarted profile `a0`, waited for Docker,
    detected the same single `agent-zero`, and preserved HTTP 200.
  - Homebrew reuse was validated after installing Homebrew `6.0.1` plus
    Homebrew `docker` `29.5.3`, `colima` `0.10.3`, and `lima` `2.1.2`.
    `a0-install` used `/opt/homebrew/bin/{docker,colima,limactl}`, left the
    alternate managed runtime directory empty, created `agent-zero` from
    `agent0ai/agent-zero:v1.20`, and returned HTTP 200.
  - Launcher runtime reuse was validated against the same Homebrew tools:
    `ColimaRuntime` selected `/opt/homebrew/bin/colima` and
    `/opt/homebrew/bin/docker`, restarted the stopped `a0` profile, reached
    `ready`, and left the launcher-managed runtime directory empty.
  - Docker Desktop `4.77.0` was installed at `/Applications/Docker.app`.
    Validation required a real GUI login session, so temporary autologin was
    enabled on the disposable Tahoe VM, Docker Desktop's first-run `Open`
    prompt was accepted over VNC, and autologin plus `/etc/kcpassword` were
    removed afterward.
  - With Colima profile `a0` stopped, Docker Desktop became the active Docker
    context `desktop-linux`, backed by
    `unix:///Users/m1/.docker/run/docker.sock`, Docker Server `29.5.3`.
  - Launcher packaged Docker Manager detected runtime `ready`,
    `dockerFlavor: docker_desktop`, and `dockerHost:
    unix:///Users/m1/.docker/run/docker.sock`.
  - Launcher packaged Docker Manager activated an already installed
    `agent0ai/agent-zero:v1.20` image through Docker Desktop on
    `http://127.0.0.1:5081/`, received HTTP 200, then deleted the temporary
    launcher-managed active container.
  - `a0-install` reused Docker Desktop without Colima fallback, reported
    `Docker already installed` and `Docker daemon is running`, selected current
    stable `v1.20`, created `agent-zero` from `agent0ai/agent-zero:v1.20`, and
    returned HTTP 200 on `http://localhost:5080/`.
- Linux launcher and installer paths:
  - Debian 12 and Ubuntu 24.04 Docker Engine bootstrap were smoke-tested.
  - Native package-manager Docker Engine path is the intended no-Docker path.
  - Non-root Ubuntu user can be added to `docker`; current session can fall
    back to sudo; relogin requirement is called out.
  - `a0-install` Quick Start created `agent-zero` from
    `agent0ai/agent-zero:v1.20` on port `5080` and returned HTTP 200 on Debian
    12 and Ubuntu 24.04.
  - Unsupported Linux families are documented as limitations rather than
    partially supported.
- Linux launcher clean-slate closure on this Ubuntu 24.04 machine:
  - User had already removed all Docker containers and images before the final
    clean-slate pass.
  - Docker CE packages, services, sockets, and data directories were fully
    removed, including `docker-ce`, `docker-ce-cli`,
    `docker-ce-rootless-extras`, `docker-buildx-plugin`,
    `docker-compose-plugin`, `containerd.io`, `/var/lib/docker`,
    `/var/lib/containerd`, `/etc/docker`, `/run/docker`, and
    `/var/run/docker.sock`.
  - `pkexec true` worked and passwordless sudo was unavailable, so the tested
    route exercised the intended desktop authorization path.
  - Direct detector result after uninstall:
    `dockerAvailable=false`, `dockerFlavor=docker_engine`,
    `diagnosticCode=DOCKER_NOT_FOUND`, host `unix:///var/run/docker.sock`.
  - Linux runtime assessment after uninstall:
    `state=not_provisioned`, `packageManager=apt`, detail "No container
    runtime was found. The launcher can install Docker Engine for this system."
  - Docker Manager reported `runtime.state=not_provisioned`,
    `canProvision=true`, `action=install`, `packageManager=apt`.
  - Dev-local Electron content was verified with a throwaway
    `XDG_CONFIG_HOME`: logs showed
    `Using local dev content: /home/eclypso/a0/a0-launcher/app/index.html` and
    `Content: dev-local`.
  - Dev-local UI no longer showed the global `Open A0 CLI` footer/dock.
  - Actual renderer setup installed native Ubuntu Docker through the launcher:
    `docker.io` `29.1.3-0ubuntu3~24.04.2`, `containerd`
    `2.2.1-0ubuntu1~24.04.2`, and `runc` `1.3.4-0ubuntu1~24.04.1`.
  - Docker service became active with socket `/var/run/docker.sock` owned by
    `root:docker`; current user already belonged to `docker`, so no relogin was
    required.
  - Launcher selected current stable Agent Zero tag `v1.20`, published
    `2026-06-04T16:32:20Z`.
  - Pulling `agent0ai/agent-zero:v1.20` was blocked by Docker Hub
    unauthenticated rate limit on this IP. The UI kept the progress panel
    visible and reported:
    `Docker Hub pull limit reached. Sign in to Docker or try again later.`
  - Local-only lifecycle fixture image `agent0ai/agent-zero:local` was built
    from `scratch` with a tiny static HTTP server, avoiding any network pull.
  - Fixture image appeared as an installed local build card with visible
    `Activate` action, while official release cards remained available.
  - Activating the fixture created
    `a0-svc-active__agent0ai-agent-zero`, labeled
    `a0.launcher.versionTag=local`, with dynamic host port mapping.
  - Fixture Web UI returned HTTP 200 and body
    `Agent Zero launcher local fixture`.
  - `Open UI` created an embedded launcher tab; CDP target text confirmed the
    fixture body.
  - Stop, Start, and Delete from the per-card menu all succeeded.
  - Dynamic-port tab reuse was fixed and retested: after restart changed the
    port, `Open UI` updated the existing tab URL instead of creating a stale
    duplicate.
  - Remote instance add/open/delete was validated with the fixture URL.
  - Settings save/restore was validated by changing ports to `32123`/`55123`
    and retention `2`, then restoring `8880`/`55022` and retention `1`.
  - Storage tab empty state and summary counts were validated.
  - Cleanup removed the fixture container, image, and temp directory.
  - Final Docker state after cleanup: Docker service active, Docker version
    `29.1.3`, zero containers, zero images, zero volumes, and zero build cache.
- Linux renderer fixes made during the closure pass:
  - Fresh Docker-ready machines render available version cards with visible
    `Install` buttons.
  - Async operation failures remain visible in the progress panel.
  - Renderer refresh uses main-process force-refresh IPC instead of cached
    `getState`.
  - Local images absent from official release metadata are merged into cards.
  - Dynamic-port local tabs key by container identity and update/reload their
    URL instead of duplicating stale tabs.
  - No-Docker onboarding fallback button copy now says `Setup Agent Zero`.
- Windows Server 2022 blocker path:
  - Baseline VM: Windows Server 2022 Standard, PowerShell `5.1.20348.4294`,
    no Docker CLI, no winget.
  - Docker Desktop is unsupported on Windows Server.
  - WSL and VirtualMachinePlatform can be enabled, but the tested VM lacks
    nested virtualization / Hyper-V capability.
  - Ubuntu WSL registration failed with
    `HCS_E_HYPERV_NOT_INSTALLED`.
  - Hyper-V role installation failed because required virtualization features
    were unavailable.
  - This VM is valid for proving precise nested-virtualization blocker behavior,
    not for proving a positive local Linux-container run.
- Windows 10 client runtime path:
  - Destructive reset was performed: Ubuntu unregistered, WSL and
    VirtualMachinePlatform disabled, reboot completed.
  - No-WSL baseline returned `WSL_E_WSL_OPTIONAL_COMPONENT_REQUIRED`.
  - Launcher provisioner reported `wsl_feature`, `Setup Agent Zero`,
    `requiresAdmin=true`, and `requiresRestart=true`.
  - UAC-backed `wsl.exe --install --no-distribution` started feature setup and
    returned a reboot-required follow-up.
  - After reboot, provisioner now correctly advances from feature setup to
    distro setup using WSL status/list evidence even when optional-feature
    queries are unavailable to a non-admin process.
  - Windows 10 Ubuntu Appx edge was fixed: if `wsl.exe --install -d Ubuntu
    --no-launch` leaves an installed Appx package but no registered distro,
    launcher setup can run `ubuntu.exe install --root`.
  - Launcher can install Docker Engine inside Ubuntu and start the loopback
    bridge on `127.0.0.1:23750`.
  - `DockerInterface.detectEnvironment({ dockerHost:
    "tcp://127.0.0.1:23750" })` returns `dockerAvailable: true` and
    `dockerFlavor: "wsl_engine"`.
  - Scoped longer timeout was added for Windows WSL loopback detection to
    tolerate cold WSL bridge startup.
  - Reboot resume plumbing was added:
    - `runtimeSetupResume` persisted in launcher state store.
    - HKCU RunOnce registered only for reboot-required setup.
    - Marker and RunOnce are cleared once runtime is ready.
    - Auto-resume only continues provisionable next steps that do not need
      another admin prompt.
- Windows 10 pre-reset container evidence:
  - Agent Zero previously ran from `agent0ai/agent-zero:v1.20`.
  - Container name: `agent-zero`.
  - Port binding: `127.0.0.1:5080->80/tcp`.
  - `Invoke-WebRequest http://127.0.0.1:5080/ -UseBasicParsing` returned HTTP
    200.
- Windows 10 post-reset container diagnosis and resolution:
  - Same image/tag pulled successfully under fresh WSL Docker Engine `29.5.3`.
  - Containers bound `127.0.0.1:5080->80/tcp`.
  - Deep instrumentation showed the image/container bootstrap was healthy.
  - The misleading failure mode was WSL idle-stop, not Agent Zero bootstrap.
  - When the WSL distro was held open, Agent Zero stayed running and returned
    HTTP 200 on `http://127.0.0.1:5080/`.
  - Diagnostic test containers and temp test volumes were removed afterward.
- Windows 10 launcher fix:
  - `WindowsWslDockerProxy.mjs` now starts a keepalive process for the selected
    WSL distro while the launcher-owned loopback bridge is active.
  - Focused proxy test covers keeping the selected WSL distro open.
- Windows 10 launcher no-WSL/no-Docker final pass on this machine:
  - Baseline after destructive reset: Windows 10 Pro `10.0.19045`, ProductType
    `1`, non-admin PowerShell `5.1.19041.6456`, no Windows `docker.exe`,
    `wsl --status` / `wsl -l -v` returned
    `WSL_E_WSL_OPTIONAL_COMPONENT_REQUIRED`.
  - Launcher setup requested UAC for `wsl.exe --install --no-distribution`,
    persisted `runtimeSetupResume`, and registered HKCU RunOnce.
  - After reboot, the launcher reappeared automatically. The screenshot showed
    cached `Content: v0.3`, `runtime_setup`, and a stale/generic
    `Parse Error: Expected HTTP/` plus `Download Docker`; live inspection showed
    this was not a real "Docker missing" state.
  - Post-reboot state: Ubuntu WSL2 installed/running, Docker Engine inside WSL
    reachable through `http://127.0.0.1:23750/version`, Docker Engine
    `29.5.3`, `dockerFlavor: "wsl_engine"`.
  - Fixed local default-app resume content detection:
    RunOnce/default-app Electron launches now preserve the app path and the
    shell treats the first non-option default-app argv as a local content repo
    candidate when env vars are gone.
  - Pulled selected stable image `agent0ai/agent-zero:v1.20`; observed digest
    `sha256:38c8a391003ba4f3ae968011504901a9d2bd92800ad4a0ebdbe80825e9296c3a`
    and size around `12.3GB` / `11.4 GB` in launcher UI.
  - Activated launcher instance as
    `a0-svc-active__agent0ai-agent-zero`, container id
    `cd41176659d1c0f249a170c6b822c535ccefe88bd47d366491015fd1366dae9e`.
  - Web UI bound to `http://127.0.0.1:5080/`; PowerShell
    `Invoke-WebRequest http://127.0.0.1:5080/ -UseBasicParsing` returned HTTP
    200 with content length about `7480`.
  - Relaunch/rerun detected the same running container id instead of recreating
    it.
  - Found old unmarked WSL keepalive shell/sleep loops from pre-fix app
    restarts. They were cleaned manually; the current launcher now leaves one
    marked `a0-launcher-wsl-keepalive` shell plus one child `sleep`.
  - Found `startActive` false failures: Agent Zero on Windows/WSL returned HTTP
    200 in about `1100ms`, while the old `350ms` readiness probe timed out for
    five minutes and reported failure. Probe attempts now allow `2000ms`.
  - Final patched relaunch state:
    `runtime.state="ready"`, `dockerFlavor="wsl_engine"`,
    `dockerHost="tcp://127.0.0.1:23750"`, top-level
    `uiUrl="http://127.0.0.1:5080/"`, active state `running`.
- Windows 10 installer fix:
  - `install.ps1` now supports Windows client WSL runtime setup:
    feature enablement with UAC/follow-up, Ubuntu install/root registration,
    Docker Engine install/start inside WSL, Docker Desktop reuse when reachable,
    and Windows Server nested-virtualization guidance.
  - `install.ps1` now registers a one-time HKCU RunOnce resume hook when WSL
    feature setup requires reboot.
  - The installer now keeps WSL alive when Agent Zero containers are running.
  - The installer now only promises post-reboot auto-resume when RunOnce
    registration actually succeeds.
- Windows 10 installer Quick Start final proof:
  - Selected stable tag: `v1.20`.
  - Created/started existing `agent-zero` from `agent0ai/agent-zero:v1.20`.
  - `Invoke-WebRequest http://127.0.0.1:5080/ -UseBasicParsing` returned HTTP
    200.
  - Rerun detected/manages the existing `agent-zero` container instead of
    blindly recreating it.

## Recent Commits To Remember

Launcher:

- pending in current handoff:
  - cross-platform `Open A0 CLI` terminal launch from launcher shell
  - card-owned Instances overflow menu with `Open A0 CLI`, `Stop`, `Delete`
  - removal of the global bottom `A0 CLI Connector` footer/dock
  - per-container stop/delete IPC/product-layer operations
  - launcher terminal command now invokes:
    `a0 --host <url> --no-docker-discovery --connect`
- `a56462b Relax Agent Zero UI readiness probes`
- `ef21bd1 Clean up Windows WSL keepalive helpers`
- `74ce9ce Preserve local content for default-app resumes`
- `16c6f63 Preserve local Electron app path for runtime resume`
- `149a1cc Keep WSL Docker runtime alive while proxied`
- `1dcb821 Resume Windows WSL runtime setup after reboot`
- `e28af1c Polish Windows runtime onboarding copy`
- `8bcd3f3 Automate Windows WSL Docker Engine onboarding`
- `517d8b0 Add explicit Windows WSL setup flow`
- `4a09702 Support Windows WSL Docker Engine runtime`
- `9275058 Report Windows Server runtime blockers`

Installer:

- `d2c3f06 Report Windows installer resume registration accurately`
- `a35576b Resume Windows installer after WSL reboot`
- `8bbabba Keep WSL Agent Zero containers alive after install`
- `aa66b25 Add Windows WSL runtime setup to installer`
- `c551408 Use WSL Docker Engine from Windows installer`
- `cb408cd Improve Windows no-Docker installer guidance`
- `e4802f0 Improve Windows installer runtime guidance`
- `1524665 Select current releases in Quick Start`
- `7c8d7d9 Prefer stable release tags in bash installer`

Connector companion changes currently present in `a0-connector` but not part of
`a0-launcher` commits:

- `a0 --connect` was added as an explicit "connect to the configured host now"
  flag.
- Launcher-owned terminal launches use `--host <url> --no-docker-discovery
  --connect`, so the CLI should not show "Docker CLI was not found" when the
  launcher already supplied a known local instance URL.
- Focused connector tests passed for entrypoint flag routing and startup
  direct-connect behavior.

## Critical Objective A: Container Bootstrap Reliability

Status: complete on this Windows 10 machine.

- [x] Reproduced the post-reset Windows 10 WSL Engine bootstrap failure with
  timestamped diagnostic runs.
- [x] Recorded selected Agent Zero release tag: `v1.20`.
- [x] Recorded Docker Engine version, WSL distro, WSL kernel, and endpoint mode.
- [x] Recorded image digest for `agent0ai/agent-zero:v1.20`.
- [x] Confirmed no CPU, memory, or disk sizing parameters were changed.
- [x] Captured `docker ps`, `docker inspect`, logs, events, process snapshots,
  DNS/resolver state, and simple container networking evidence.
- [x] Tested the failure under Docker Engine inside WSL.
- [x] Isolated root cause to WSL idle-stop after Windows-side command exit.
- [x] Added launcher keepalive while the WSL Docker proxy is active.
- [x] Added installer keepalive while WSL-backed Agent Zero containers run.
- [x] Verified `agent0ai/agent-zero:v1.20` starts as `agent-zero`, binds Web UI
  port `5080`, and returns HTTP 200.
- [x] Verified launcher starts/reuses
  `a0-svc-active__agent0ai-agent-zero` from `agent0ai/agent-zero:v1.20`,
  binds Web UI port `5080`, and returns HTTP 200.
- [x] Verified installer rerun detects/manages existing `agent-zero` instead of
  blindly recreating it.
- [x] Verified launcher relaunch detects/manages existing
  `a0-svc-active__agent0ai-agent-zero` instead of blindly recreating it.
- [x] Fixed Windows/WSL UI readiness false negatives caused by too-short local
  HTTP probe attempts.
Next-machine confirmation still useful:

- [ ] Repeat a clean Windows 10 no-WSL/no-Docker run with the current commits
  on a separate machine.
- [x] Confirm the app survives reboot and resumes setup on this machine.
- [ ] Confirm the installer survives reboot and resumes setup on a separate
  fresh machine.
- [ ] Confirm the WSL keepalive persists long enough for Agent Zero to remain
  reachable after the initiating installer command returns.
- [x] Confirm the launcher WSL keepalive persists while the launcher-owned
  loopback bridge is active.

## Critical Objective B: Align a0-install With Launcher Runtime Paths

Status: complete for Windows 10 WSL Engine path on this machine.

- [x] Re-read `a0-install` scripts before editing:
  `install.ps1`, `install.sh`, and README/runtime docs.
- [x] Preserved installer role as CLI/power-user/headless/server path.
- [x] Preserved launcher role as friendly GUI desktop path.
- [x] Kept behavior aligned without forcing shared implementation between
  JavaScript and PowerShell.
- [x] Windows client installer reuses Docker Desktop when a reachable Windows
  engine already exists.
- [x] Windows client installer does not default to Docker Desktop for users who
  do not already have it.
- [x] Windows client installer can provision WSL, Ubuntu, and Docker Engine.
- [x] Windows client installer handles missing Windows `docker.exe` by calling
  the Docker CLI inside WSL.
- [x] Windows client installer does not expose Docker TCP on non-loopback.
- [x] Windows client installer avoids `[Console]::KeyAvailable` crashes in
  noninteractive sessions.
- [x] Windows client installer registers HKCU RunOnce for post-reboot resume
  and clears it when Docker/runtime setup succeeds.
- [x] Windows Server installer keeps current behavior:
  no Docker Desktop install/recommendation, and clear WSL2/nested
  virtualization requirement.
- [x] Both installers use current stable Agent Zero release selection and
  normalize two-segment tags.
- [x] Both installers record the selected tag in output.
- [x] Both installers avoid container CPU/memory/disk sizing changes.
- [x] Windows installer rerun manages an existing container cleanly.

Known future hardening:

- [ ] Add explicit `install.ps1` flags if desired:
  `-QuickStart`, `-Yes`, `-NonInteractive`, `-Port`, `-Name`, `-DockerHost`,
  `-SkipRuntimeSetup`.
- [ ] Consider a small machine-readable runtime contract shared by launcher and
  installer to prevent future drift.
- [ ] Revalidate macOS and Linux after Windows commits are merged/released.

## Platform Validation Matrix

### Windows 10 Launcher, No WSL/No Docker

- [x] Destructive reset completed and validated once.
- [x] WSL feature setup through UAC reached reboot-required follow-up.
- [x] Reboot completed.
- [x] Post-reboot provisioner advanced past feature setup.
- [x] Ubuntu Appx root-registration edge fixed.
- [x] Docker Engine install inside WSL succeeded.
- [x] Loopback bridge reached `dockerAvailable: true`.
- [x] Reboot-resume plumbing implemented for launcher state and HKCU RunOnce.
- [x] WSL keepalive implemented for launcher-owned WSL Docker proxy.
- [x] Current machine visible Electron UI first-run pass from reset state:
  no WSL, no Docker, UAC prompt, reboot, app relaunch/resume, Ubuntu setup,
  Docker Engine setup, Agent Zero image pull, container activation, Web UI HTTP
  200, relaunch detects existing container.
- [ ] Next-machine: repeat the same visible Electron UI first-run pass from
  reset state as release-candidate confirmation.

### Windows 10 Launcher, WSL Engine Already Available

- [x] Detection works for `tcp://127.0.0.1:23750`.
- [x] `dockerFlavor` is `wsl_engine`.
- [x] WSL proxy keepalive prevents Docker from losing running containers when
  the initiating Windows-side command exits.
- [x] Launcher activation path creates/starts
  `a0-svc-active__agent0ai-agent-zero`.
- [x] Launcher activation path binds Web UI to loopback port `5080`.
- [x] Launcher activation path reports exact reachable URL/status:
  `http://127.0.0.1:5080/`, HTTP 200.
- [x] Launcher relaunch/re-activation manages the existing instance.
- [x] Launcher `startActive` no longer falsely fails while the UI is reachable
  on slower Windows/WSL loopback responses.
- [x] Global bottom `A0 CLI Connector` footer removed.
- [x] Per-instance card menu added for `Open A0 CLI`, `Stop`, and `Delete`.
- [x] Card menu `Open A0 CLI` passes the selected card URL, not a global
  active-instance guess.
- [x] Windows terminal command verified with:
  `--host http://127.0.0.1:5080/ --no-docker-discovery --connect`.
- [ ] Commit or otherwise hand off the companion `a0-connector` `--connect`
  changes before testing the end-to-end live CLI connection from launcher.

### Windows 10 Installer, WSL Engine Already Available

- [x] `install.ps1` can reuse existing WSL Docker Engine from Windows when no
  Windows `docker.exe` exists.
- [x] Selected stable tag printed/recorded: `v1.20`.
- [x] Verified `agent-zero` container creation/start.
- [x] Verified Web UI HTTP 200 on `http://127.0.0.1:5080/`.
- [x] Verified rerun detects/manages existing container.
- [x] Verified WSL keepalive keeps the distro/container alive after the
  installer command path returns.
- [ ] Optional future hardening: add explicit noninteractive Quick Start flags
  instead of using function-level validation and scripted menu probes.

### Windows 10 Installer, No WSL/No Docker

- [x] User-approved WSL feature setup implemented.
- [x] Reboot/resume story implemented with HKCU RunOnce and
  `-A0ResumeRuntimeSetup`.
- [x] Ubuntu install/registration implemented, including Windows 10 Appx
  root-registration fallback.
- [x] Docker Engine install inside WSL implemented.
- [x] WSL Docker CLI execution implemented; no public TCP listener required.
- [x] Parser/helper validation passed after implementation.
- [ ] Next-machine: destructive fresh no-WSL/no-Docker installer run from
  baseline through reboot, resume, Ubuntu setup, Docker Engine setup, Quick
  Start, HTTP 200, and rerun behavior.

### Windows 10 Docker Desktop Already Installed

- [ ] Launcher should detect/reuse `npipe:////./pipe/docker_engine`.
- [ ] Launcher should ask the user to start/keep Docker Desktop open when
  installed but not running.
- [ ] Launcher should still use Docker Desktop terminology for this mode because
  the user already chose that power-user path.
- [ ] Installer should reuse Docker Desktop when available.
- [ ] Installer should provide clear "start Docker Desktop" guidance when the
  CLI exists but the engine is unavailable.
- [ ] No Docker Desktop installation should be attempted without explicit user
  approval.

### Windows Server 2022

- [x] Current no-nested-virtualization blocker validated.
- [x] Installer no-Docker path exits cleanly with Windows Server guidance.
- [x] Launcher no-Docker path reports nested virtualization requirement.
- [ ] On a future host with nested virtualization, validate WSL Engine positive
  path without Docker Desktop.
- [ ] On that future host, validate both launcher and installer Quick Start.

### macOS

- [x] Launcher-managed Colima/Lima/Docker CLI path validated on Tahoe.
- [x] Installer-managed Colima/Lima/Docker CLI path validated on Tahoe.
- [x] No Homebrew required for managed path.
- [x] Retest container bootstrap with the current selected stable tag after
  merging/releasing the Windows keepalive changes.
- [x] Verify rerun detects/manages existing `agent-zero`.
- [x] Validate reuse when Colima/Lima are already installed through Homebrew on
  a separate Mac.
  - Validated on the Tahoe VM after installing Homebrew: installer and launcher
    both reused `/opt/homebrew/bin/{docker,colima,limactl}` and did not populate
    their alternate managed runtime directories.
- [x] Validate Docker Desktop already-installed reuse if available.
  - Validated on the Tahoe VM with Colima stopped and Docker Desktop active as
    context `desktop-linux` (`unix:///Users/m1/.docker/run/docker.sock`):
    launcher detection, launcher temporary activation/HTTP 200, cleanup, and
    installer Quick Start/HTTP 200 all passed.

### Linux

Status: closed for native Docker Engine launcher/bootstrap on Ubuntu 24.04 as
of 2026-06-14. Docker Hub rate limiting prevented a real
`agent0ai/agent-zero:v1.20` pull on this IP; the visible rate-limit error path
is validated.

- [x] Debian 12 and Ubuntu 24.04 Docker Engine bootstrap validated.
- [x] Debian 12 and Ubuntu 24.04 `a0-install` Quick Start returned HTTP 200 with
  `agent0ai/agent-zero:v1.20`.
- [x] Ubuntu 24.04 clean-slate launcher pass: Docker removed, detector
  `DOCKER_NOT_FOUND`, provisioner `not_provisioned`/`apt`.
- [x] Launcher installed native Ubuntu Docker Engine through `pkexec`/apt.
- [x] Already-installed Docker reuse validated after bootstrap:
  `runtime.state=ready`, `dockerFlavor=docker_engine`,
  `dockerHost=unix:///var/run/docker.sock`.
- [x] Fresh Docker-ready UI renders available versions with visible `Install`
  actions.
- [x] Current stable `v1.20` install action attempted; Docker Hub rate-limit
  surfaced visibly.
- [x] Local image lifecycle surrogate validated: local image card, activate,
  HTTP 200, Open UI tab, stop/start/delete.
- [x] Dynamic-port `Open UI` tab updates the existing local tab after restart.
- [x] Remote instance add/open/delete validated.
- [x] Settings save/restore validated.
- [x] Storage volumes empty state and counts validated.
- [x] Cleanup verified: zero containers, images, volumes, and build cache;
  Docker service active.
- [ ] Optional future variant: rootless Docker messaging/reuse if available.
- [ ] Optional future variant: Docker Desktop for Linux reuse if product wants
  to support it.

## Code Areas Likely Involved

Launcher:

- `shell/docker_adapter/RuntimeProvisioner.mjs`
- `shell/docker_adapter/DockerInterface.mjs`
- `shell/docker_adapter/impl/WindowsWslRuntime.mjs`
- `shell/docker_adapter/impl/WindowsWslDockerProxy.mjs`
- `shell/docker_adapter/runtime_provisioner.test.mjs`
- `shell/docker_manager/index.js`
- `shell/docker_manager/state_store.js`
- `shell/docker_manager/release_tags.js`
- `shell/docker_manager/release_tags.test.js`
- `shell/docker_manager/releases_client.js`
- `shell/docker_manager/releases_client.test.js`
- `shell/instance_tabs.js`
- `shell/instance_tabs.test.js`
- `shell/main.js`
- `shell/preload.js`
- `app/docker_manager.js`
- closest relevant `AGENTS.md` files before edits

Installer:

- `install.ps1`
- `install.sh`
- installer docs/README files if runtime behavior changes
- any script-local release-tag selection helpers
- any script-local Docker endpoint detection helpers

## Verification Commands

Launcher checks:

```powershell
node --test shell/docker_adapter/runtime_provisioner.test.mjs
node --test shell/docker_manager/release_tags.test.js shell/docker_manager/releases_client.test.js shell/instance_tabs.test.js
node --check shell/main.js
node --check shell/preload.js
node --check shell/docker_manager/index.js
node --check shell/docker_manager/state_store.js
node --check app/docker_manager.js
git diff --check
```

Linux launcher closure checks:

```bash
node --check shell/main.js
node --check shell/preload.js
node --check shell/docker_manager/index.js
node --check app/docker_manager.js
node --check app/components/docker-manager/official-versions/official-versions.js
node --check app/components/docker-manager/onboarding/onboarding.js
node --check app/components/docker-manager/status-header/status-header.js
node -e "import('./shell/docker_adapter/impl/DockerodeDocker.mjs')"
node --test shell/docker_manager/errors.test.js shell/docker_adapter/dockerode_log_processor.test.mjs shell/docker_adapter/runtime_provisioner.test.mjs shell/docker_manager/release_tags.test.js shell/docker_manager/releases_client.test.js shell/instance_tabs.test.js
git diff --check
docker ps -a
docker image ls
docker volume ls
docker system df
```

Installer PowerShell parser check:

```powershell
$tokens = $null
$errors = $null
[System.Management.Automation.Language.Parser]::ParseFile((Resolve-Path .\install.ps1), [ref]$tokens, [ref]$errors) | Out-Null
if ($errors) { $errors | Format-List *; exit 1 }
```

Windows WSL/Docker baseline:

```powershell
Get-CimInstance Win32_OperatingSystem | Select-Object Caption, Version, BuildNumber, ProductType
$PSVersionTable.PSVersion
([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
Get-Command docker -ErrorAction SilentlyContinue
docker version
docker info
wsl --status
wsl -l -v
Get-Command winget -ErrorAction SilentlyContinue
```

Windows WSL Engine endpoint smoke:

```powershell
$env:DOCKER_HOST = "tcp://127.0.0.1:23750"
docker version
docker info
docker ps
```

Windows installer WSL direct-Docker smoke:

```powershell
wsl -d Ubuntu -u root -- docker version
wsl -d Ubuntu -u root -- docker info
wsl -d Ubuntu -u root -- docker ps
```

Agent Zero HTTP smoke:

```powershell
Invoke-WebRequest http://127.0.0.1:5080/ -UseBasicParsing
```

Container diagnostics:

```powershell
docker ps -a --no-trunc
docker inspect agent-zero
docker logs --timestamps agent-zero
docker exec agent-zero ps -eo pid,ppid,stat,comm,args
docker exec agent-zero cat /etc/resolv.conf
docker events --since "YYYY-MM-DDTHH:MM:SS" --until "YYYY-MM-DDTHH:MM:SS"
```

Simple network control under same WSL Engine:

```powershell
docker run --rm ubuntu:24.04 bash -lc "apt-get update"
```

## Open Risks And Questions

- Fresh-machine risk:
  Windows 10 no-WSL/no-Docker setup has been implemented and partially
  destructive-tested here, but the full polished user journey should be proven
  on the next clean machine with the current commits.
- Visible launcher risk:
  first-run UI, reboot resume, Agent Zero activation, Web UI reachability, and
  relaunch detection are now proven on this Windows 10 machine. Repeat on a
  separate clean Windows 10 machine before calling the release path fully
  boring.
- Docker Desktop risk:
  Docker Desktop installed/running and installed/not-running reuse/guidance
  should be tested separately. Do not install Docker Desktop only for this
  unless explicitly approved.
- Is installer rerun behavior robust when the existing container is stopped,
  unhealthy, has an old image, or uses a different data path?
- If `a0-install` registers RunOnce, how should that behave in headless or
  remote PowerShell sessions? Current implementation is appropriate for a
  logged-in Windows client user; pure headless Windows automation may deserve
  explicit flags later.
- How should installer output distinguish Docker Desktop reuse from invisible
  managed WSL Engine setup while staying simple for non-experts?
- Should the launcher and installer share a small machine-readable runtime
  contract to prevent drift across platforms?

## Shopping List If Blocked

- UAC approval for WSL feature enablement.
- Reboot window after WSL/VirtualMachinePlatform changes.
- Docker Desktop install approval, only for explicit Docker Desktop validation.
- Windows Server host with nested virtualization for positive Server validation.
- macOS machine with Homebrew-installed Colima for reuse validation.
- Linux VM access for clean retest after installer changes.
- Network/GitHub/Docker Hub access for release and image pulls.
- Permission to keep or remove test containers/volumes after diagnostics.

## Commit Rules For This Goal

- Make logical commits only when tracked code changes are needed.
- Include test evidence in commit bodies.
- Do not commit this `TODO.md` unless explicitly asked.
- Do not commit logs, screenshots, build artifacts, temp files, or unrelated
  formatting churn.
- Before each commit:
  - inspect `git status --short`,
  - inspect staged diff,
  - keep unrelated user changes unstaged.
