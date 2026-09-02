# Runtime Troubleshooting

The launcher talks to a Docker-compatible runtime through a local socket. It
tries existing runtimes first, then offers automatic setup only when the
platform supports it.

When more than one usable local runtime is already available, the setup flow can
ask where Agent Zero should run. If there is only one usable runtime, the
launcher chooses it automatically.

## Quick Checks

Run these from a terminal when the launcher says the runtime is unavailable:

```bash
docker info
docker context show
echo "$DOCKER_HOST"
```

If `DOCKER_HOST` points at an old or missing socket, unset it and refresh the
launcher:

```bash
unset DOCKER_HOST
```

On Windows PowerShell, inspect the same sources plus WSL with:

```powershell
docker info
docker context show
$env:DOCKER_HOST
wsl --list --verbose
```

Docker contexts are also reused when they point to a reachable Docker-compatible
endpoint. Tools such as OrbStack, Rancher Desktop, Colima, rootless Docker, and
Podman can work when their Docker API endpoint is running. Portainer is a
management UI for existing runtimes, so the launcher still needs the underlying
Docker-compatible endpoint.

## Docker Desktop

On macOS or Windows, start Docker Desktop and wait until it reports that the
engine is running. Then refresh the launcher.

On Linux, Docker Desktop uses a user socket such as:

```text
~/.docker/desktop/docker.sock
```

If Docker Desktop is running but the launcher still cannot connect, check that
your shell or desktop session is not overriding `DOCKER_HOST` with a stale
value.

## Agent Zero Local Runtime On Windows

On supported Windows client editions, Launcher can provide Linux containers
without Docker Desktop. It imports the dedicated WSL2 distro
`AgentZeroRuntime` from the pinned `agent0ai/a0-install` `runtime-v1` release.
The download is accepted only when its manifest shape, repository/tag, x64 or
ARM64 asset URL, declared size, and SHA-256 match the client contract.

The managed runtime is shared by Launcher and `a0-install` beneath:

```text
%LOCALAPPDATA%\AgentZero\runtime
```

It sits outside Launcher uninstall data and outside Agent Zero workspaces. The
appliance is deliberately narrow: Docker Engine/CLI, containerd, Buildx,
Compose, Python, and a bounded Docker-start helper. Launcher does not install
Store Ubuntu, run `apt` in an arbitrary distro, change its services, or expose
Docker on a fixed TCP port.

### Existing WSL distributions

An existing WSL2 distribution is reusable only when Docker, `dockerd`, Python,
and `docker info` already work. Launcher may connect its process-owned named
pipe but does not start its Docker daemon, repair packages or configuration, or
write into that distribution. A plain Ubuntu installation without a running
Docker Engine is ignored and left untouched.

If a distro already has the exact `AgentZeroRuntime` name, Launcher requires
the compatible ownership marker and matching architecture. An unmarked name
collision fails closed; rename or remove it yourself only after confirming what
it contains.

### Diagnostics and repair

Inspect registration and ownership from PowerShell:

```powershell
wsl --list --verbose
wsl -d AgentZeroRuntime -u root -- cat /etc/agent-zero-runtime.json
wsl -d AgentZeroRuntime -u root -- /usr/local/sbin/a0-runtime-start 120
```

The last command waits at most 120 seconds and prints a bounded Docker daemon
log tail on failure. A missing/unreadable marker, wrong WSL version,
architecture mismatch, or missing runtime binary is treated as a repair state;
Launcher preserves the distro and its Docker data instead of overwriting it.
Production setup also requires the published `runtime-v1` manifest. A 404
before publication or a blocked GitHub download is not repaired by weakening
checksum or URL validation.

### Storage and removal

Docker images (called Versions in Launcher), containers, and build cache live
inside the managed distro's virtual disk. Instance workspaces remain separate,
under `%USERPROFILE%\agent-zero` by default. Deleting a Version reclaims logical
Docker space, but the Windows VHD file may remain at its previous high-water
size until a separate Windows/WSL compaction. Launcher never silently calls
global `wsl --shutdown` or stops unrelated distributions to compact it.

Launcher uninstall preserves `AgentZeroRuntime`. To remove the runtime, first
inspect the marker above, stop its Instances, and understand that this command
permanently deletes all Docker images, containers, and cache inside it:

```powershell
wsl --unregister AgentZeroRuntime
```

Do not delete `ext4.vhdx` directly. Unregistering the runtime does not delete
host workspace directories, but any Instance records referring to containers
inside the removed runtime will no longer have those containers.

## Native Docker Engine

On Debian or Ubuntu, the launcher and installer can use the host package manager
to install Docker Engine. If Docker was just installed and the launcher says
your user cannot access it yet, log out and back in once so group membership is
applied.

Useful Linux checks:

```bash
systemctl status docker
docker info
groups
```

If the daemon is stopped, start it:

```bash
sudo systemctl start docker
```

On systems without `systemctl`, use the host service manager.

## Colima On macOS

When Docker Desktop is not installed, the launcher can use Colima with a
dedicated profile named `a0`. The expected socket is:

```text
~/.colima/a0/docker.sock
```

Homebrew is not required for this launcher-managed path. When `colima`,
`limactl`, or `docker` are missing, the launcher installs its own runtime
components under its application data directory and starts Colima in user space.
It should not ask for an administrator password just to create the `a0` profile.

If Colima was installed outside the launcher, make sure `colima`, `limactl`, and
`docker` are available on `PATH`, then refresh the launcher. To inspect the
profile:

```bash
colima list
colima start a0 --runtime docker
```

The launcher uses Colima's runtime defaults. Do not tune CPU, memory, or disk
settings just to make the launcher detect the runtime.

## Rootless Docker On Linux

Rootless Docker usually exposes a user socket under:

```text
/run/user/<uid>/docker.sock
```

The launcher checks `XDG_RUNTIME_DIR` when looking for this socket. If rootless
Docker is running but unavailable to the launcher, confirm the socket path:

```bash
echo "$XDG_RUNTIME_DIR"
ls -l "$XDG_RUNTIME_DIR/docker.sock"
docker info
```

Make sure the launcher is started from the same desktop session that owns the
rootless Docker socket.
