# Release Checks

Use this checklist before cutting the next Launcher release. Build each executable from the release tag, then upload its matching updater metadata and `content.json`.

## Artifacts

- Windows x64 and arm64: `a0-launcher-<version>-windows-<arch>.exe` (NSIS).
- macOS x64 and arm64: `a0-launcher-<version>-macos-<arch>.dmg` and `a0-launcher-<version>-macos-<arch>-update.zip`.
- Linux x64 and arm64: `a0-launcher-<version>-linux-<arch>.AppImage`.
- Updater metadata: `metadata-latest-windows.yml`, `metadata-latest-mac.yml`, `metadata-latest-linux.yml`, and `metadata-latest-linux-arm64.yml`.
- Renderer content: `content.json`, built from the same tag.

Public versions use two segments when the patch is zero, such as `1.8`; Electron packages and updater comparisons use `1.8.0`. Squirrel/NuGet, Windows x86, and Linux DEB/RPM are outside the current release path. The expected release has 13 required assets; blockmaps are optional.

## Windows Runtime Matrix

Use separate Launcher test state so saved Instances, credentials, and runtime preferences remain intact. Test a real independent Ubuntu WSL2 Engine with Desktop stopped; stopping Desktop alone does not establish a no-Desktop setup test. To exercise that setup path on a machine with Desktop installed, hide only Desktop installation discovery in the test harness and retain real WSL installation, Docker API calls, IPC, and renderer behavior.

| Host state | Expected result |
| --- | --- |
| Docker Desktop running; two named-pipe aliases | One runtime choice, identified by the shared daemon ID. |
| Desktop installed but stopped; only Docker's private WSL distro | Offer Start Docker Desktop. Do not prepare a bridge or helper in the private distro. |
| Desktop absent; WSL unavailable | Offer local runtime Setup with Windows approval/restart guidance. Remote Instances remain available. |
| Desktop absent; WSL2 has no ordinary distro | Install Ubuntu, prepare its independent Engine, and remember the resulting endpoint. |
| Desktop absent; ordinary WSL2 distro has no Engine | Install the Engine in that distro; do not confuse a Desktop-integrated client with an independent Engine. |
| Independent WSL Engine running; Desktop stopped | Reuse WSL and offer installed Desktop as a separate stopped choice. |
| Desktop and independent WSL Engine both reachable | Group aliases by daemon ID and offer the two distinct runtimes. |
| Preferred runtime unavailable | Use the reachable fallback without deleting the preference; return to the preferred endpoint when it becomes reachable. |
| No reachable runtime | Keep Versions browsable and remote setup usable; gate only local execution. |

Also check WSL host-directory mounts, a container start/restart/stop, Launcher restart/bridge cleanup, and first-run completion. A completed user must not receive automatic onboarding when a runtime later stops.

## Windows Installer and Updater

- Build both architectures with the current electron-builder toolchain; inspect the embedded executable and runtime DLLs.
- Merge and stage updater metadata through the release scripts. Check both architecture URLs, SHA-512 hashes, and file sizes against the installers.
- On a disposable Windows profile, install, reinstall/update, and uninstall. Updates preserve Launcher state; ordinary uninstall removes Launcher-owned user data. Do not use a real user's settings as an uninstall fixture.
- Upgrade through an actual legacy release too: its old uninstaller runs during installation. The installer preserves settings in the sibling `a0-launcher-installer-backup` directory until restoration succeeds. If installation stops with a restore conflict, retain both directories and recover the saved settings before retrying.
- Verify direct launch after installation, shortcut creation, running-app shutdown, and the updater's download/install flow.
- Run the ARM64 executable on native Windows ARM64 before claiming runtime validation for that architecture. An ARM64 build on an x64 host verifies packaging only.

## Instance Surfaces and CLI

- Local Open UI opens an attached tab; opening the same Instance focuses it.
- Verify reload, reorder, detach, reattach, and closing a detached window without stopping the Instance.
- Repeat the tab checks on macOS before release.
- Each relevant Instance menu offers Install A0 CLI while missing and Open A0 CLI once installed. There is no global CLI dock.
- Verify local and saved remote CLI launches, working-folder selection, and cancellation. Remote targets remain shell-resolved by saved Instance ID.

## Local Content

`npm start` uses local repository content. Packaged startup uses release content unless a local-content override is explicitly supplied. For an explicit Linux development launch:

```bash
A0_LAUNCHER_LOCAL_REPO=/home/eclypso/a0/a0-launcher npm start
```

Legacy `dev-local` cache metadata must not block release updates.

## Windows Verification: 2026-10-13

Host: Windows 10 x64 build 19045, WSL 2.2.4. Docker Desktop was retained. All Launcher test profiles and host-folder fixtures were separate from the user's saved settings.

| Check | Observed result |
| --- | --- |
| Installed, stopped Desktop with only its private WSL distro | Correct Start Docker Desktop action; private distro excluded from independent Engine setup. |
| No-Desktop setup path | Passed with only Desktop installation discovery masked. A real Ubuntu 24.04 WSL2 distro was imported and Docker Engine installed; this was not a physical Desktop uninstall. |
| Catalog without a reachable runtime | 44 Versions remained available alongside local/remote first-run choices. |
| WSL container lifecycle and host storage | Advanced nginx fixture passed start, restart, stop, and start again. A Windows host folder containing spaces mounted at `/a0/usr`; a file was read successfully from the container. |
| Two independent Engines | Desktop and Ubuntu exposed different daemon IDs. Desktop's two named-pipe aliases shared one ID. |
| First-run runtime picker with `DOCKER_HOST` pointing to WSL | Passed after fixing inherited Dockerode transport defaults. The UI showed exactly two choices for two Engines; Desktop aliases stayed grouped. |
| Preference fallback and recovery | Stopping Ubuntu's Engine selected Desktop without changing the saved WSL preference; restoring Ubuntu returned to that preference. |
| Cold WSL reuse without Windows Docker CLI | Passed after terminating Ubuntu and stopping Desktop. The detection process's PATH contained only Windows system tools; the real WSL Engine started and retained its daemon ID. |
| Full Agent Zero under WSL | The normal image installer downloaded and extracted `ready`. Instance creation with a host workspace containing spaces passed; `/api/health` reported `R v2.13`, and the attached Instance page rendered its chat screen with Desktop stopped. |
| Cleanup | Test containers were deleted through Launcher intents while their workspaces were retained. Test Electron processes and WSL keepalive helpers ended. Desktop and the new Ubuntu distro were left stopped; Desktop data and normal Launcher settings were retained. |
| Automated suite | 426 passed, zero failed, one macOS Unix-socket test skipped on Windows. Syntax and whitespace checks passed. |
| Legacy installer data protection | Native NSIS fixture passed destructive legacy uninstall, extraction failure, interrupted-install recovery, and a new-profile conflict. Settings and nested binary credential data survived; conflict handling retained both profiles. The fixture used an isolated directory and registry key. |
| Windows packaging | x64 and ARM64 NSIS builds passed. Embedded archives, executable architectures, shipped runtime fixes, and both staged updater SHA-512 hashes/file sizes were verified. |

Native Windows ARM64 execution and a disposable-profile install/update/uninstall cycle remain release checks. Building ARM64 on this x64 host does not verify its runtime. Docker Desktop remained installed throughout: absence was simulated only at installation discovery, alongside real independent WSL setup, execution, and cold-start tests.

The development-launch `EPIPE` dialogs came from Electron inheriting a test command's closed output pipe. Subsequent test launches redirected stdout/stderr to files and completed without those dialogs.
