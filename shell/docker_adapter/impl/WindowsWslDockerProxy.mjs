import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import net from 'node:net';

const DEFAULT_PIPE_PATH = '\\\\.\\pipe\\agent-zero-runtime-docker';
const DEFAULT_DOCKER_HOST = 'npipe:////./pipe/agent-zero-runtime-docker';
const DEFAULT_DISTRO = 'AgentZeroRuntime';
const DEFAULT_SOCKET = '/var/run/docker.sock';

let proxyServer = null;
let proxyPromise = null;
let proxyDistro = '';
let keepAliveProcess = null;
let keepAliveDistro = '';
let keepAliveMarker = '';
let keepAliveSpawnCommand = null;
let cleanupRegistered = false;

const PYTHON_UNIX_SOCKET_BRIDGE = String.raw`
import os
import socket
import sys
import threading

sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
sock.connect(os.environ.get("A0_DOCKER_SOCKET", "/var/run/docker.sock"))

def stdin_to_socket():
    try:
        while True:
            data = os.read(sys.stdin.fileno(), 65536)
            if not data:
                break
            sock.sendall(data)
    finally:
        try:
            sock.shutdown(socket.SHUT_WR)
        except OSError:
            pass

def socket_to_stdout():
    try:
        while True:
            data = sock.recv(65536)
            if not data:
                break
            os.write(sys.stdout.fileno(), data)
    finally:
        try:
            sock.close()
        except OSError:
            pass

threading.Thread(target=stdin_to_socket, daemon=True).start()
socket_to_stdout()
`;

const WSL_KEEPALIVE_SCRIPT = String.raw`
sleep_pid=''
cleanup() {
  if [ -n "$sleep_pid" ]; then
    kill "$sleep_pid" >/dev/null 2>&1 || true
    wait "$sleep_pid" >/dev/null 2>&1 || true
  fi
  exit 0
}
trap cleanup TERM INT
while :; do
  sleep 2147483647 &
  sleep_pid=$!
  wait "$sleep_pid" >/dev/null 2>&1 || true
  sleep_pid=''
done
`;

export function isWindowsWslProxyEndpoint(hostInfo) {
  return (
    process.platform === 'win32' &&
    hostInfo?.kind === 'npipe' &&
    normalizePipePath(hostInfo.socketPath || hostInfo.raw) === normalizePipePath(DEFAULT_PIPE_PATH)
  );
}

export async function ensureWindowsWslDockerProxy(options = {}) {
  if (process.platform !== 'win32') {
    return { started: false, reason: 'unsupported_platform' };
  }

  const pipePath = options.pipePath || DEFAULT_PIPE_PATH;
  if (normalizePipePath(pipePath) !== normalizePipePath(DEFAULT_PIPE_PATH)) {
    return { started: false, reason: 'unsupported_endpoint' };
  }
  const selectedDistro = (options.distro || process.env.A0_WSL_DOCKER_DISTRO || DEFAULT_DISTRO).trim();

  if (proxyServer?.listening) {
    if (proxyDistro !== selectedDistro) await closeProxyServer();
    else {
      const keepAlive = ensureWindowsWslKeepAlive({ distro: selectedDistro, spawnCommand: options.spawnCommand });
      return { started: true, reused: true, keepAlive, dockerHost: DEFAULT_DOCKER_HOST };
    }
  }
  if (proxyPromise) return proxyPromise;

  proxyPromise = startProxy({
    pipePath,
    distro: selectedDistro,
    socketPath: options.socketPath || DEFAULT_SOCKET,
    spawnCommand: options.spawnCommand
  })
    .finally(() => {
      proxyPromise = null;
    });
  return proxyPromise;
}

async function startProxy({ pipePath, distro, socketPath, spawnCommand }) {
  const selectedDistro = String(distro || DEFAULT_DISTRO).trim();
  const keepAlive = ensureWindowsWslKeepAlive({ distro: selectedDistro, spawnCommand });
  const server = net.createServer({ allowHalfOpen: true }, (client) => {
    client.setKeepAlive(true);

    const args = [];
    if (selectedDistro) args.push('-d', selectedDistro);
    args.push('-u', 'root');
    args.push('--exec', 'python3', '-c', PYTHON_UNIX_SOCKET_BRIDGE);

    const child = spawn('wsl.exe', args, {
      env: { ...process.env, A0_DOCKER_SOCKET: socketPath },
      stdio: ['pipe', 'pipe', 'ignore'],
      windowsHide: true
    });
    child.unref();

    const closeClient = () => {
      if (!client.destroyed) client.destroy();
    };
    const closeChild = () => {
      if (!child.killed) child.kill();
    };

    client.pipe(child.stdin);
    child.stdout.pipe(client);

    client.on('error', closeChild);
    client.on('close', closeChild);
    child.stdin.on('error', closeClient);
    child.stdout.on('error', closeClient);
    child.on('error', closeClient);
    child.on('close', () => {
      if (!client.destroyed) client.end();
    });
  });

  server.on('close', () => {
    if (proxyServer === server) {
      proxyServer = null;
      proxyDistro = '';
    }
    stopWindowsWslKeepAlive();
  });

  try {
    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen({ path: pipePath, readableAll: false, writableAll: false }, resolve);
    });
  } catch (error) {
    stopWindowsWslKeepAlive();
    if (error?.code === 'EADDRINUSE') {
      return { started: false, reason: 'pipe_in_use', dockerHost: DEFAULT_DOCKER_HOST };
    }
    throw error;
  }

  server.unref();
  proxyServer = server;
  proxyDistro = selectedDistro;
  return { started: true, reused: false, keepAlive, dockerHost: DEFAULT_DOCKER_HOST };
}

async function closeProxyServer() {
  const server = proxyServer;
  if (!server) return;
  await new Promise((resolve) => server.close(resolve));
}

export function ensureWindowsWslKeepAlive(options = {}) {
  if (process.platform !== 'win32') {
    return { started: false, reason: 'unsupported_platform' };
  }

  const selectedDistro = (options.distro || process.env.A0_WSL_DOCKER_DISTRO || DEFAULT_DISTRO).trim();
  if (keepAliveProcess && !keepAliveProcess.killed && keepAliveDistro === selectedDistro) {
    return { started: true, reused: true, distro: selectedDistro || null };
  }

  stopWindowsWslKeepAlive();

  const marker = `a0-launcher-wsl-keepalive-${process.pid}-${randomUUID()}`;
  const args = [];
  args.push('-d', selectedDistro);
  args.push('-u', 'root', '--exec', 'sh', '-c', WSL_KEEPALIVE_SCRIPT, marker);

  const spawnCommand = typeof options.spawnCommand === 'function' ? options.spawnCommand : spawn;
  const child = spawnCommand('wsl.exe', args, {
    stdio: 'ignore',
    windowsHide: true
  });
  child.unref?.();

  keepAliveProcess = child;
  keepAliveDistro = selectedDistro;
  keepAliveMarker = marker;
  keepAliveSpawnCommand = spawnCommand;
  registerProcessCleanup();

  child.on?.('close', () => {
    if (keepAliveProcess === child) {
      keepAliveProcess = null;
      keepAliveDistro = '';
      keepAliveMarker = '';
      keepAliveSpawnCommand = null;
    }
  });
  child.on?.('error', () => {
    if (keepAliveProcess === child) {
      keepAliveProcess = null;
      keepAliveDistro = '';
      keepAliveMarker = '';
      keepAliveSpawnCommand = null;
    }
  });

  return { started: true, reused: false, distro: selectedDistro || null };
}

export function stopWindowsWslKeepAlive(options = {}) {
  const child = keepAliveProcess;
  const selectedDistro = keepAliveDistro;
  const marker = keepAliveMarker;
  const spawnCommand = typeof options.spawnCommand === 'function'
    ? options.spawnCommand
    : keepAliveSpawnCommand;
  keepAliveProcess = null;
  keepAliveDistro = '';
  keepAliveMarker = '';
  keepAliveSpawnCommand = null;
  if (!child && !selectedDistro) {
    return { stopped: false, cleanup: { started: false, reason: 'not_running' } };
  }
  if (child && !child.killed) {
    child.kill();
  }
  const cleanup = cleanupWindowsWslKeepAlive({ distro: selectedDistro, marker, spawnCommand });
  return { stopped: !!child, cleanup };
}

function cleanupWindowsWslKeepAlive({ distro = '', marker = '', spawnCommand = spawn } = {}) {
  if (process.platform !== 'win32') {
    return { started: false, reason: 'unsupported_platform' };
  }

  const selectedDistro = String(distro || '').trim();
  const selectedMarker = String(marker || '').trim();
  if (!selectedDistro || !/^a0-launcher-wsl-keepalive-[A-Za-z0-9-]+$/.test(selectedMarker)) {
    return { started: false, reason: 'invalid_scope' };
  }
  const pattern = selectedMarker.replace(/^a/, '[a]');
  const args = ['-d', selectedDistro, '-u', 'root', '--exec', 'sh', '-c', `pkill -TERM -f '${pattern}' >/dev/null 2>&1 || true`];

  try {
    const child = (typeof spawnCommand === 'function' ? spawnCommand : spawn)('wsl.exe', args, {
      stdio: 'ignore',
      windowsHide: true,
      detached: true
    });
    child.unref?.();
    return { started: true, distro: selectedDistro || null };
  } catch (error) {
    return { started: false, reason: 'spawn_failed', message: error?.message || String(error) };
  }
}

export const WINDOWS_WSL_DOCKER_HOST = DEFAULT_DOCKER_HOST;
export const WINDOWS_WSL_DOCKER_PIPE_PATH = DEFAULT_PIPE_PATH;

function registerProcessCleanup() {
  if (cleanupRegistered) return;
  cleanupRegistered = true;
  process.once('exit', () => {
    stopWindowsWslKeepAlive();
  });
}

function normalizePipePath(value) {
  return String(value || '')
    .replace(/^npipe:/i, '')
    .replace(/\\/g, '/')
    .replace(/^\/+/, '//')
    .toLowerCase();
}
