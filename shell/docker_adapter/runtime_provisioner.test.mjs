import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { access, mkdir as mkdirp, mkdtemp, readdir, rm, utimes, writeFile } from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import { DockerInterface } from './DockerInterface.mjs';
import { acquireRuntimeSetupLock, downloadVerified, fetchJson, RuntimeProvisioner } from './RuntimeProvisioner.mjs';
import { ColimaRuntime, selectLatestDockerCliAsset } from './impl/ColimaRuntime.mjs';
import { LinuxEngineRuntime } from './impl/LinuxEngineRuntime.mjs';
import { ensureWindowsWslKeepAlive, stopWindowsWslKeepAlive } from './impl/WindowsWslDockerProxy.mjs';
import {
  WINDOWS_WSL_RUNTIME_CONTRACT,
  WindowsWslRuntime,
  validateWindowsWslRuntimeManifest
} from './impl/WindowsWslRuntime.mjs';

test('RuntimeProvisioner.forPlatform selects runtime implementations by platform', async () => {
  const managedDir = await mkdtemp(path.join(os.tmpdir(), 'a0-runtime-'));
  try {
    const macRuntime = await RuntimeProvisioner.forPlatform({ managedDir, platform: 'darwin' });
    const linuxRuntime = await RuntimeProvisioner.forPlatform({ managedDir, platform: 'linux' });
    const windowsRuntime = await RuntimeProvisioner.forPlatform({ managedDir, platform: 'win32' });
    const unsupportedRuntime = await RuntimeProvisioner.forPlatform({ managedDir, platform: 'freebsd' });

    assert.ok(macRuntime instanceof ColimaRuntime);
    assert.ok(linuxRuntime instanceof LinuxEngineRuntime);
    assert.ok(windowsRuntime instanceof WindowsWslRuntime);
    assert.equal(unsupportedRuntime, null);
  } finally {
    await rm(managedDir, { recursive: true, force: true });
  }
});

test('ColimaRuntime assess asks to start installed Docker Desktop before setup', async () => {
  const managedDir = await mkdtemp(path.join(os.tmpdir(), 'a0-runtime-'));
  try {
    const dockerApp = path.join(managedDir, 'Docker.app');
    await mkdirp(dockerApp);
    const runtime = new ColimaRuntime({
      managedDir,
      dockerDesktopAppPaths: [dockerApp],
      runCommand: async () => ({ code: 1, stdout: '', stderr: '' })
    });

    const assessment = await runtime.assess();

    assert.equal(assessment.state, 'engine_stopped');
    assert.equal(assessment.mode, 'docker_desktop');
    assert.match(assessment.detail, /Start Docker Desktop/i);
    assert.equal(assessment.manualUrl, undefined);
  } finally {
    await rm(managedDir, { recursive: true, force: true });
  }
});

test('ColimaRuntime can detect stopped Docker Desktop while Colima is running', async () => {
  const managedDir = await mkdtemp(path.join(os.tmpdir(), 'a0-runtime-'));
  try {
    const dockerApp = path.join(managedDir, 'Docker.app');
    await mkdirp(dockerApp);
    const runtime = new ColimaRuntime({
      managedDir,
      dockerDesktopAppPaths: [dockerApp],
      runCommand: async (_cmd, args) => {
        if (args?.[0] === 'version') return { code: 0, stdout: 'colima version', stderr: '' };
        if (args?.[0] === 'list') return { code: 0, stdout: '{"name":"a0","status":"Running"}', stderr: '' };
        return { code: 1, stdout: '', stderr: '' };
      }
    });

    assert.equal((await runtime.assess()).state, 'ready');
    assert.equal((await runtime.assessDockerDesktop()).mode, 'docker_desktop');
  } finally {
    await rm(managedDir, { recursive: true, force: true });
  }
});

test('WindowsWslRuntime assess directs Windows clients without WSL to runtime install guidance', async () => {
  const managedDir = await mkdtemp(path.join(os.tmpdir(), 'a0-runtime-'));
  try {
    const runtime = new WindowsWslRuntime({
      managedDir,
      isWindowsServer: false,
      runCommand: fakeWindowsCommandRunner()
    });

    const assessment = await runtime.assess();

    assert.equal(assessment.state, 'not_provisioned');
    assert.equal(assessment.mode, 'wsl_feature');
    assert.equal(assessment.requiresAdmin, true);
    assert.equal(assessment.requiresRestart, true);
    assert.equal(assessment.setupActionLabel, 'Setup Agent Zero');
    assert.match(assessment.detail, /Agent Zero runtime/i);
    assert.match(assessment.manualCommand, /wsl\.exe --install --no-distribution/i);
  } finally {
    await rm(managedDir, { recursive: true, force: true });
  }
});

test('WindowsWslRuntime assess detects installed Docker Desktop on Windows clients', async () => {
  const managedDir = await mkdtemp(path.join(os.tmpdir(), 'a0-runtime-'));
  const calls = [];
  try {
    const runtime = new WindowsWslRuntime({
      managedDir,
      isWindowsServer: false,
      runCommand: fakeWindowsCommandRunner({
        calls,
        dockerDesktopPath: 'C:\\Program Files\\Docker\\Docker\\Docker Desktop.exe'
      })
    });

    const assessment = await runtime.assess();

    assert.equal(assessment.state, 'engine_stopped');
    assert.equal(assessment.mode, 'docker_desktop');
    assert.match(assessment.detail, /Docker Desktop is installed/i);
    assert.match(assessment.detail, /Start Docker Desktop/i);
    assert.equal(assessment.manualUrl, undefined);
    assert.ok(calls.some((call) => call.cmd === 'powershell.exe' && /LOCALAPPDATA.*DockerDesktop/.test(String(call.args?.at(-1)))));
  } finally {
    await rm(managedDir, { recursive: true, force: true });
  }
});

test('WindowsWslRuntime assess detects Docker Desktop when WSL2 is incomplete', async () => {
  const managedDir = await mkdtemp(path.join(os.tmpdir(), 'a0-runtime-'));
  try {
    const runtime = new WindowsWslRuntime({
      managedDir,
      isWindowsServer: false,
      runCommand: fakeWindowsCommandRunner({
        binaries: ['wsl.exe'],
        dockerDesktopPath: 'C:\\Program Files\\Docker\\Docker\\Docker Desktop.exe',
        features: {
          'Microsoft-Windows-Subsystem-Linux': 'Enabled',
          VirtualMachinePlatform: 'Disabled'
        }
      })
    });

    const assessment = await runtime.assess();

    assert.equal(assessment.state, 'engine_stopped');
    assert.equal(assessment.mode, 'docker_desktop');
    assert.match(assessment.detail, /Docker Desktop is installed/i);
    assert.match(assessment.detail, /Start Docker Desktop/i);
    assert.equal(assessment.manualUrl, undefined);
  } finally {
    await rm(managedDir, { recursive: true, force: true });
  }
});

test('WindowsWslRuntime can detect stopped Docker Desktop beside a WSL runtime', async () => {
  const managedDir = await mkdtemp(path.join(os.tmpdir(), 'a0-runtime-'));
  try {
    const runtime = new WindowsWslRuntime({
      managedDir,
      isWindowsServer: false,
      runCommand: fakeWindowsCommandRunner({
        binaries: ['wsl.exe'],
        dockerDesktopPath: 'C:\\Program Files\\Docker\\Docker\\Docker Desktop.exe',
        wslList: '  NAME      STATE    VERSION\r\n* Ubuntu    Running  2\r\n',
        wslDockerInstalled: true,
        wslDockerReady: true
      })
    });

    assert.equal((await runtime.assess()).mode, 'wsl_engine');
    assert.equal((await runtime.assessDockerDesktop()).mode, 'docker_desktop');
  } finally {
    await rm(managedDir, { recursive: true, force: true });
  }
});

test('WindowsWslRuntime provision requests UAC for WSL feature setup', async () => {
  const managedDir = await mkdtemp(path.join(os.tmpdir(), 'a0-runtime-'));
  const calls = [];
  const progress = [];
  try {
    const runtime = new WindowsWslRuntime({
      managedDir,
      isWindowsServer: false,
      runCommand: fakeWindowsCommandRunner({ calls })
    });

    const result = await runtime.provision({ onProgress: (message) => progress.push(message) });

    assert.equal(result.state, 'needs_followup');
    assert.match(result.detail, /Restart Windows/i);
    assert.ok(progress.includes('Requesting Windows approval'));
    const elevated = calls.find((call) => call.cmd === 'powershell.exe' && /Start-Process/.test(String(call.args.at(-1))));
    assert.ok(elevated, 'expected an elevated PowerShell launcher');
    assert.match(String(elevated.args.at(-1)), /-Verb RunAs/);
    assert.match(String(elevated.args.at(-1)), /-WindowStyle Hidden/);
  } finally {
    await rm(managedDir, { recursive: true, force: true });
  }
});

test('WindowsWslRuntime resumes after the WSL feature reboot with managed appliance Setup', async () => {
  const managedDir = await mkdtemp(path.join(os.tmpdir(), 'a0-runtime-'));
  try {
    const runtime = new WindowsWslRuntime({
      managedDir,
      isWindowsServer: false,
      runCommand: fakeWindowsCommandRunner({
        binaries: ['wsl.exe'],
        wslList: [
          'Default Version: 2',
          'Windows Subsystem for Linux has no installed distributions.',
          'Error code: Wsl/WSL_E_DEFAULT_DISTRO_NOT_FOUND'
        ].join('\n')
      })
    });

    const assessment = await runtime.assess();
    assert.equal(assessment.state, 'not_provisioned');
    assert.equal(assessment.mode, 'wsl_managed_distribution');
    assert.equal(assessment.setupActionLabel, 'Setup Agent Zero');
    assert.doesNotMatch(String(assessment.manualCommand || ''), /Ubuntu/i);
  } finally {
    await rm(managedDir, { recursive: true, force: true });
  }
});

test('fetchJson stops a chunked response at the configured byte limit', async () => {
  const server = http.createServer((_request, response) => {
    response.setHeader('content-type', 'application/json');
    response.write('{"value":"');
    response.write('x'.repeat(2048));
    response.end('"}');
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    const address = server.address();
    await assert.rejects(
      fetchJson(`http://127.0.0.1:${address.port}/manifest`, { maxBytes: 1024 }),
      (error) => error?.code === 'DOWNLOAD_TOO_LARGE'
    );
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('fetchJson rejects a final response outside the allowed HTTPS hosts', async () => {
  const server = http.createServer((_request, response) => {
    response.setHeader('content-type', 'application/json');
    response.end('{"ok":true}');
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    const address = server.address();
    await assert.rejects(
      fetchJson(`http://127.0.0.1:${address.port}/manifest`, { allowedHosts: ['github.com'] }),
      (error) => error?.code === 'DOWNLOAD_UNTRUSTED_REDIRECT'
    );
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('downloadVerified removes staging after a checksum mismatch', async () => {
  const managedDir = await mkdtemp(path.join(os.tmpdir(), 'a0-runtime-download-'));
  const destination = path.join(managedDir, 'runtime.tar.gz');
  const server = http.createServer((_request, response) => response.end('runtime-bytes'));
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    const address = server.address();
    await assert.rejects(
      downloadVerified(`http://127.0.0.1:${address.port}/runtime`, destination, '0'.repeat(64)),
      (error) => error?.code === 'CHECKSUM_MISMATCH'
    );
    assert.deepEqual(await readdir(managedDir), []);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await rm(managedDir, { recursive: true, force: true });
  }
});

test('runtime setup lock excludes concurrent consumers and recovers an old abandoned record', async () => {
  const managedDir = await mkdtemp(path.join(os.tmpdir(), 'a0-runtime-lock-'));
  const lockPath = path.join(managedDir, 'locks', 'setup.lock');
  try {
    const first = await acquireRuntimeSetupLock(lockPath, 'test-first');
    await assert.rejects(
      acquireRuntimeSetupLock(lockPath, 'test-second'),
      (error) => error?.code === 'RUNTIME_SETUP_BUSY'
    );
    await first.release();

    const second = await acquireRuntimeSetupLock(lockPath, 'test-second');
    await second.release();

    await writeFile(lockPath, '{abandoned', 'utf8');
    const old = new Date(Date.now() - 10 * 60_000);
    await utimes(lockPath, old, old);
    const recovered = await acquireRuntimeSetupLock(lockPath, 'test-recovered');
    await recovered.release();
  } finally {
    await rm(managedDir, { recursive: true, force: true });
  }
});

test('WindowsWslRuntime ignores a user distro without a working Docker Engine', async () => {
  const managedDir = await mkdtemp(path.join(os.tmpdir(), 'a0-runtime-'));
  const calls = [];
  try {
    const runtime = new WindowsWslRuntime({
      managedDir,
      isWindowsServer: false,
      runCommand: fakeWindowsCommandRunner({
        binaries: ['wsl.exe'],
        calls,
        wslList: '  NAME      STATE           VERSION\n* Ubuntu    Running         2\n'
      })
    });

    const assessment = await runtime.assess();
    assert.equal(assessment.mode, 'wsl_managed_distribution');
    assert.equal(assessment.state, 'not_provisioned');
    assert.ok(!calls.some((call) => /apt-get|docker\.sources/.test(String(call.args?.join(' ')))));
  } finally {
    await rm(managedDir, { recursive: true, force: true });
  }
});

test('WindowsWslRuntime reuses only an already-functional WSL Docker Engine without modifying it', async () => {
  const managedDir = await mkdtemp(path.join(os.tmpdir(), 'a0-runtime-'));
  const calls = [];
  const proxyCalls = [];
  try {
    const runtime = new WindowsWslRuntime({
      managedDir,
      isWindowsServer: false,
      ensureProxy: async (options) => {
        proxyCalls.push(options);
        return { started: true };
      },
      runCommand: fakeWindowsCommandRunner({
        binaries: ['wsl.exe'],
        calls,
        wslList: '  NAME      STATE           VERSION\n* Ubuntu    Running         2\n',
        wslDockerInstalled: true,
        wslDockerReady: true
      })
    });

    const assessment = await runtime.assess();
    assert.equal(assessment.mode, 'wsl_engine');
    assert.equal(assessment.distro, 'Ubuntu');
    const result = await runtime.start();
    assert.equal(result.endpoint.dockerHost, 'npipe:////./pipe/agent-zero-runtime-docker');
    assert.deepEqual(proxyCalls, [{ distro: 'Ubuntu' }]);
    assert.ok(!calls.some((call) => /apt-get|systemctl start docker|service docker start/.test(String(call.args?.join(' ')))));
  } finally {
    await rm(managedDir, { recursive: true, force: true });
  }
});

test('WindowsWslRuntime refuses an unmarked AgentZeroRuntime name collision', async () => {
  const managedDir = await mkdtemp(path.join(os.tmpdir(), 'a0-runtime-'));
  const calls = [];
  try {
    const runtime = new WindowsWslRuntime({
      managedDir,
      isWindowsServer: false,
      runCommand: fakeWindowsCommandRunner({
        binaries: ['wsl.exe'],
        calls,
        wslList: '  NAME                 STATE      VERSION\n* AgentZeroRuntime     Stopped    2\n'
      })
    });

    const assessment = await runtime.assess();
    assert.equal(assessment.state, 'manual_install');
    assert.equal(assessment.diagnosticCode, 'RUNTIME_NAME_COLLISION');
    assert.match(assessment.detail, /made no changes/i);
    assert.ok(!calls.some((call) => call.args?.includes('--unregister')));
  } finally {
    await rm(managedDir, { recursive: true, force: true });
  }
});

test('WindowsWslRuntime validates and starts the marked managed appliance', async () => {
  const managedDir = await mkdtemp(path.join(os.tmpdir(), 'a0-runtime-'));
  const calls = [];
  const proxyCalls = [];
  try {
    const runtime = new WindowsWslRuntime({
      managedDir,
      architecture: 'x64',
      isWindowsServer: false,
      ensureProxy: async (options) => {
        proxyCalls.push(options);
        return { started: true };
      },
      runCommand: fakeWindowsCommandRunner({
        binaries: ['wsl.exe'],
        calls,
        managedMarker: windowsRuntimeMarker(),
        managedRuntimeComplete: true,
        wslList: '  NAME                 STATE      VERSION\n* AgentZeroRuntime     Stopped    2\n'
      })
    });

    const assessment = await runtime.assess();
    assert.equal(assessment.mode, 'wsl_managed');
    assert.equal(assessment.state, 'engine_stopped');
    await runtime.start();
    const start = calls.find((call) => call.args?.includes(WINDOWS_WSL_RUNTIME_CONTRACT.startPath));
    assert.ok(start);
    assert.deepEqual(proxyCalls, [{ distro: 'AgentZeroRuntime' }]);
  } finally {
    await rm(managedDir, { recursive: true, force: true });
  }
});

test('WindowsWslRuntime imports the verified appliance and never invokes Store Ubuntu or apt', async () => {
  const managedDir = await mkdtemp(path.join(os.tmpdir(), 'a0-runtime-'));
  const calls = [];
  const downloads = [];
  const progress = [];
  const proxyCalls = [];
  const manifest = windowsRuntimeManifest();
  try {
    const runtime = new WindowsWslRuntime({
      managedDir,
      architecture: 'x64',
      isWindowsServer: false,
      fetchJson: async (_url, options) => {
        assert.equal(options.maxBytes, WINDOWS_WSL_RUNTIME_CONTRACT.maxManifestBytes);
        return manifest;
      },
      downloadVerified: async (url, destination, sha256, options) => {
        downloads.push({ url, destination, sha256, options });
        await mkdirp(path.dirname(destination), { recursive: true });
        await writeFile(destination, Buffer.alloc(manifest.assets.amd64.sizeBytes));
      },
      ensureProxy: async (options) => {
        proxyCalls.push(options);
        return { started: true };
      },
      runCommand: fakeWindowsCommandRunner({
        binaries: ['wsl.exe'],
        calls,
        features: {
          'Microsoft-Windows-Subsystem-Linux': 'Enabled',
          VirtualMachinePlatform: 'Enabled'
        },
        managedMarker: windowsRuntimeMarker(),
        managedRuntimeComplete: true,
        wslList: '  NAME      STATE           VERSION\n'
      })
    });

    const result = await runtime.provision({ onProgress: (message, percent) => progress.push([message, percent]) });
    assert.equal(result.endpoint.dockerHost, 'npipe:////./pipe/agent-zero-runtime-docker');
    const imported = calls.find((call) => call.cmd === 'wsl.exe' && call.args?.[0] === '--import');
    assert.equal(imported.args[1], 'AgentZeroRuntime');
    assert.equal(imported.args.at(-2), '--version');
    assert.equal(imported.args.at(-1), '2');
    assert.equal(downloads[0].sha256, manifest.assets.amd64.sha256);
    assert.equal(downloads[0].options.expectedSize, manifest.assets.amd64.sizeBytes);
    assert.deepEqual(proxyCalls, [{ distro: 'AgentZeroRuntime' }]);
    assert.ok(progress.some(([message]) => message === 'Downloading Agent Zero runtime'));
    assert.ok(!calls.some((call) => call.args?.[0] === '--install' && call.args?.includes('Ubuntu')));
    assert.ok(!calls.some((call) => /apt-get|docker\.sources/.test(String(call.args?.join(' ')))));
    await assert.rejects(access(downloads[0].destination));
  } finally {
    await rm(managedDir, { recursive: true, force: true });
  }
});

test('WindowsWslRuntime preserves an unregistered runtime directory', async () => {
  const managedDir = await mkdtemp(path.join(os.tmpdir(), 'a0-runtime-'));
  const installPath = path.join(managedDir, 'wsl', 'AgentZeroRuntime');
  const orphanPath = path.join(installPath, 'ext4.vhdx');
  const calls = [];
  try {
    await mkdirp(installPath, { recursive: true });
    await writeFile(orphanPath, 'recoverable');
    const runtime = new WindowsWslRuntime({
      managedDir,
      architecture: 'x64',
      isWindowsServer: false,
      fetchJson: async () => {
        throw new Error('An existing runtime path must fail before download.');
      },
      runCommand: fakeWindowsCommandRunner({
        binaries: ['wsl.exe'],
        calls,
        wslList: '  NAME      STATE           VERSION\n'
      })
    });

    await assert.rejects(runtime.provision(), { code: 'RUNTIME_PATH_COLLISION' });
    await access(orphanPath);
    assert.ok(!calls.some((call) => call.args?.[0] === '--import'));
  } finally {
    await rm(managedDir, { recursive: true, force: true });
  }
});

test('WindowsWslRuntime rejects an unsupported Windows architecture before download', async () => {
  const managedDir = await mkdtemp(path.join(os.tmpdir(), 'a0-runtime-'));
  const calls = [];
  try {
    const runtime = new WindowsWslRuntime({
      managedDir,
      architecture: 'ia32',
      isWindowsServer: false,
      fetchJson: async () => {
        throw new Error('Unsupported architecture reached download.');
      },
      runCommand: fakeWindowsCommandRunner({
        binaries: ['wsl.exe'],
        calls,
        wslList: '  NAME      STATE           VERSION\n'
      })
    });

    await assert.rejects(runtime.provision(), { code: 'RUNTIME_UNSUPPORTED_ARCHITECTURE' });
    assert.ok(!calls.some((call) => call.args?.[0] === '--import'));
  } finally {
    await rm(managedDir, { recursive: true, force: true });
  }
});

test('WindowsWslRuntime keeps partial import state but removes verified staging', async () => {
  const managedDir = await mkdtemp(path.join(os.tmpdir(), 'a0-runtime-'));
  const calls = [];
  let archivePath = '';
  try {
    const manifest = windowsRuntimeManifest();
    const runtime = new WindowsWslRuntime({
      managedDir,
      architecture: 'x64',
      isWindowsServer: false,
      fetchJson: async () => manifest,
      downloadVerified: async (_url, destination) => {
        archivePath = destination;
        await mkdirp(path.dirname(destination), { recursive: true });
        await writeFile(destination, 'verified');
      },
      runCommand: fakeWindowsCommandRunner({
        binaries: ['wsl.exe'],
        calls,
        wslList: '  NAME      STATE           VERSION\n',
        wslImportCode: 5
      })
    });

    await assert.rejects(runtime.provision(), { code: 'RUNTIME_PROVISION_FAILED' });
    await access(path.join(managedDir, 'wsl', 'AgentZeroRuntime'));
    await assert.rejects(access(archivePath));
    await assert.rejects(access(path.join(managedDir, 'locks', 'setup.lock')));
  } finally {
    await rm(managedDir, { recursive: true, force: true });
  }
});

test('validateWindowsWslRuntimeManifest fails closed on release, URL, checksum, size, and shape drift', () => {
  const valid = windowsRuntimeManifest();
  assert.equal(validateWindowsWslRuntimeManifest(valid, 'amd64').name, WINDOWS_WSL_RUNTIME_CONTRACT.assets.amd64);

  for (const mutate of [
    (manifest) => { manifest.release.repository = 'attacker/runtime'; },
    (manifest) => { manifest.assets.amd64.url = 'https://example.com/runtime.tar.gz'; },
    (manifest) => { manifest.assets.amd64.sha256 = 'A'.repeat(64); },
    (manifest) => { manifest.assets.amd64.sizeBytes = WINDOWS_WSL_RUNTIME_CONTRACT.maxCompressedSizeBytes + 1; },
    (manifest) => { manifest.unexpected = true; }
  ]) {
    const manifest = structuredClone(valid);
    mutate(manifest);
    assert.throws(() => validateWindowsWslRuntimeManifest(manifest, 'amd64'), { code: 'RUNTIME_MANIFEST_INVALID' });
  }
});

test('WindowsWslRuntime assess explains WSL setup on Windows Server without features', async () => {
  const managedDir = await mkdtemp(path.join(os.tmpdir(), 'a0-runtime-'));
  try {
    const runtime = new WindowsWslRuntime({
      managedDir,
      isWindowsServer: true,
      runCommand: fakeWindowsCommandRunner({
        binaries: ['wsl.exe'],
        features: {
          'Microsoft-Windows-Subsystem-Linux': 'Disabled',
          VirtualMachinePlatform: 'Disabled'
        }
      })
    });

    const assessment = await runtime.assess();

    assert.equal(assessment.state, 'manual_install');
    assert.match(assessment.detail, /Docker Desktop is not supported on Windows Server/i);
    assert.match(assessment.detail, /wsl\.exe --install --no-distribution/i);
    assert.match(assessment.manualCommand, /wsl\.exe --install --no-distribution/i);
  } finally {
    await rm(managedDir, { recursive: true, force: true });
  }
});

test('WindowsWslRuntime assess calls out nested virtualization when WSL has no distro', async () => {
  const managedDir = await mkdtemp(path.join(os.tmpdir(), 'a0-runtime-'));
  try {
    const runtime = new WindowsWslRuntime({
      managedDir,
      isWindowsServer: true,
      runCommand: fakeWindowsCommandRunner({
        binaries: ['wsl.exe'],
        features: {
          'Microsoft-Windows-Subsystem-Linux': 'Enabled',
          VirtualMachinePlatform: 'Enabled'
        },
        wslList: 'Windows Subsystem for Linux has no installed distributions.'
      })
    });

    const assessment = await runtime.assess();

    assert.equal(assessment.state, 'manual_install');
    assert.match(assessment.detail, /nested virtualization/i);
    assert.match(assessment.manualUrl, /learn\.microsoft\.com/);
  } finally {
    await rm(managedDir, { recursive: true, force: true });
  }
});

test('DockerInterface distinguishes Docker Desktop and Agent Zero named pipes', async () => {
  const dockerDesktop = await DockerInterface.detectEnvironment({
    dockerHost: 'npipe:////./pipe/docker_engine',
    timeoutMs: 250,
    enableWindowsWslProxy: false,
    discoverDockerContexts: false,
    candidateHosts: [],
    dockerodeClass: fakeDockerodeClass()
  });
  assert.equal(dockerDesktop.dockerHost.kind, 'npipe');
  assert.equal(dockerDesktop.dockerHost.socketPath, '//./pipe/docker_engine');
  assert.equal(dockerDesktop.dockerFlavor, 'docker_desktop');

  const wslEngine = await DockerInterface.detectEnvironment({
    dockerHost: 'npipe:////./pipe/agent-zero-runtime-docker',
    timeoutMs: 250,
    enableWindowsWslProxy: false,
    discoverDockerContexts: false,
    candidateHosts: [],
    dockerodeClass: fakeDockerodeClass()
  });
  assert.equal(wslEngine.dockerHost.kind, 'npipe');
  assert.equal(wslEngine.dockerHost.socketPath, '//./pipe/agent-zero-runtime-docker');
  assert.equal(wslEngine.dockerFlavor, 'wsl_engine');
});

test('DockerInterface prepares the built-in Windows WSL endpoint before probing', async () => {
  const preparedHosts = [];
  let prepared = false;
  class FakeDockerode {
    constructor(options = {}) {
      this.options = options;
    }

    async ping() {
      if (prepared && this.options.socketPath === '//./pipe/agent-zero-runtime-docker') return true;
      const error = new Error('Docker endpoint is not reachable');
      error.code = 'ECONNREFUSED';
      throw error;
    }

    async version() {
      return { Version: 'test' };
    }
  }

  const env = await DockerInterface.detectEnvironment({
    platform: 'win32',
    timeoutMs: 250,
    discoverDockerContexts: false,
    candidateHosts: [
      { provider: 'wsl_engine', label: 'Agent Zero local runtime', dockerHost: 'npipe:////./pipe/agent-zero-runtime-docker', source: 'known_socket' }
    ],
    prepareDockerHost: async (hostInfo) => {
      prepared = true;
      preparedHosts.push(hostInfo.raw);
    },
    dockerodeClass: FakeDockerode
  });

  assert.deepEqual(preparedHosts, ['npipe:////./pipe/agent-zero-runtime-docker']);
  assert.equal(env.dockerAvailable, true);
  assert.equal(env.dockerFlavor, 'wsl_engine');
  assert.equal(env.runtimeCandidates[0].available, true);
});

test('DockerInterface does not prepare the built-in Windows WSL endpoint when another runtime is reachable', async () => {
  const preparedHosts = [];
  const env = await DockerInterface.detectEnvironment({
    platform: 'win32',
    timeoutMs: 250,
    discoverDockerContexts: false,
    candidateHosts: [
      { provider: 'docker_desktop', label: 'Docker Desktop', dockerHost: 'npipe:////./pipe/docker_engine', source: 'known_socket' },
      { provider: 'wsl_engine', label: 'Agent Zero local runtime', dockerHost: 'npipe:////./pipe/agent-zero-runtime-docker', source: 'known_socket' }
    ],
    prepareDockerHost: async (hostInfo) => {
      preparedHosts.push(hostInfo.raw);
    },
    dockerodeClass: fakeDockerodeClass(['//./pipe/docker_engine'])
  });

  assert.deepEqual(preparedHosts, []);
  assert.equal(env.dockerAvailable, true);
  assert.equal(env.dockerFlavor, 'docker_desktop');
});

test('DockerInterface selects a single available native endpoint without extra choices', async () => {
  const env = await DockerInterface.detectEnvironment({
    platform: 'linux',
    homeDir: '/home/a0',
    runtimeDir: '/run/user/1000',
    discoverDockerContexts: false,
    candidateHosts: [
      { provider: 'docker_engine', label: 'Docker Engine', dockerHost: 'unix:///var/run/docker.sock' }
    ],
    dockerodeClass: fakeDockerodeClass(['/var/run/docker.sock'])
  });

  assert.equal(env.dockerAvailable, true);
  assert.equal(env.dockerHost.socketPath, '/var/run/docker.sock');
  assert.equal(env.runtimeCandidates.length, 1);
  assert.equal(env.runtimeCandidates[0].available, true);
  assert.equal(env.runtimeCandidates[0].isSelected, true);
});

test('DockerInterface dedupes endpoints and selects the highest-priority reachable runtime', async () => {
  const env = await DockerInterface.detectEnvironment({
    platform: 'darwin',
    homeDir: '/Users/a0',
    discoverDockerContexts: false,
    candidateHosts: [
      { provider: 'orbstack', label: 'OrbStack', dockerHost: 'unix:///Users/a0/.orbstack/run/docker.sock', priority: 50 },
      { provider: 'orbstack', label: 'OrbStack duplicate', dockerHost: 'unix:///Users/a0/.orbstack/run/docker.sock', priority: 70 },
      { provider: 'rancher_desktop', label: 'Rancher Desktop', dockerHost: 'unix:///Users/a0/.rd/docker.sock', priority: 60 }
    ],
    dockerodeClass: fakeDockerodeClass([
      '/Users/a0/.orbstack/run/docker.sock',
      '/Users/a0/.rd/docker.sock'
    ])
  });

  assert.equal(env.dockerAvailable, true);
  assert.equal(env.dockerFlavor, 'orbstack');
  assert.equal(env.runtimeCandidates.length, 2);
  assert.deepEqual(env.runtimeCandidates.filter((candidate) => candidate.available).map((candidate) => candidate.label), [
    'OrbStack',
    'Rancher Desktop'
  ]);
  assert.equal(env.runtimeCandidates.find((candidate) => candidate.label === 'OrbStack')?.isSelected, true);
});

test('DockerInterface preserves endpoint aliases while exposing their shared daemon identity', async () => {
  const desktopContext = '/Users/a0/.docker/context.sock';
  const desktopSocket = '/Users/a0/.docker/run/docker.sock';
  const orbStackSocket = '/Users/a0/.orbstack/run/docker.sock';
  const unidentifiedSocket = '/Users/a0/.docker/unknown.sock';
  const env = await DockerInterface.detectEnvironment({
    platform: 'darwin',
    homeDir: '/Users/a0',
    discoverDockerContexts: false,
    candidateHosts: [
      { provider: 'docker_desktop', label: 'desktop-linux', dockerHost: `unix://${desktopContext}`, priority: 20 },
      { provider: 'docker_desktop', label: 'Docker Desktop', dockerHost: `unix://${desktopSocket}`, priority: 50 },
      { provider: 'orbstack', label: 'OrbStack', dockerHost: `unix://${orbStackSocket}`, priority: 60 },
      { provider: 'docker_engine', label: 'Unknown runtime', dockerHost: `unix://${unidentifiedSocket}`, priority: 70 }
    ],
    dockerodeClass: fakeDockerodeClass(
      [desktopContext, desktopSocket, orbStackSocket, unidentifiedSocket],
      {
        [desktopContext]: 'desktop-daemon',
        [desktopSocket]: 'desktop-daemon',
        [orbStackSocket]: 'orbstack-daemon',
        [unidentifiedSocket]: null
      }
    )
  });

  assert.equal(env.runtimeCandidates.length, 4);
  assert.equal(env.runtimeCandidates[0].daemonId, 'desktop-daemon');
  assert.equal(env.runtimeCandidates[1].daemonId, 'desktop-daemon');
  assert.equal(env.runtimeCandidates[2].daemonId, 'orbstack-daemon');
  assert.equal(env.runtimeCandidates[3].daemonId, null);
});

test('DockerInterface falls back when a persisted runtime endpoint is stale', async () => {
  const env = await DockerInterface.detectEnvironment({
    platform: 'linux',
    runtimePreference: {
      id: 'runtime-stale',
      label: 'Old runtime',
      provider: 'docker_engine',
      dockerHost: 'unix:///tmp/missing-docker.sock'
    },
    discoverDockerContexts: false,
    candidateHosts: [
      { provider: 'docker_engine', label: 'Docker Engine', dockerHost: 'unix:///var/run/docker.sock' }
    ],
    dockerodeClass: fakeDockerodeClass(['/var/run/docker.sock'])
  });

  assert.equal(env.dockerAvailable, true);
  assert.equal(env.dockerHost.socketPath, '/var/run/docker.sock');
  assert.equal(env.runtimeCandidates.find((candidate) => candidate.id === 'runtime-stale')?.available, false);
  assert.equal(env.runtimeCandidates.find((candidate) => candidate.label === 'Docker Engine')?.isSelected, true);
});

test('DockerInterface falls back without forgetting the preferred runtime', async () => {
  const options = {
    platform: 'darwin',
    runtimePreference: {
      id: 'runtime-docker-desktop',
      label: 'Docker Desktop',
      provider: 'docker_desktop',
      dockerHost: 'unix:///Users/a0/.docker/run/docker.sock'
    },
    discoverDockerContexts: false,
    candidateHosts: [
      { provider: 'docker_desktop', label: 'Docker Desktop', dockerHost: 'unix:///Users/a0/.docker/run/docker.sock' },
      { provider: 'orbstack', label: 'OrbStack', dockerHost: 'unix:///Users/a0/.orbstack/run/docker.sock' }
    ]
  };

  const fallback = await DockerInterface.detectEnvironment({
    ...options,
    dockerodeClass: fakeDockerodeClass(['/Users/a0/.orbstack/run/docker.sock'])
  });
  assert.equal(fallback.dockerFlavor, 'orbstack');
  assert.equal(fallback.runtimeCandidates.find((candidate) => candidate.source === 'preference')?.available, false);

  const recovered = await DockerInterface.detectEnvironment({
    ...options,
    dockerodeClass: fakeDockerodeClass([
      '/Users/a0/.docker/run/docker.sock',
      '/Users/a0/.orbstack/run/docker.sock'
    ])
  });
  assert.equal(recovered.dockerFlavor, 'docker_desktop');
  assert.equal(recovered.runtimeCandidates.find((candidate) => candidate.source === 'preference')?.isSelected, true);
});

test('DockerInterface parses Docker context endpoints into provider-labeled candidates', async () => {
  const env = await DockerInterface.detectEnvironment({
    platform: 'darwin',
    homeDir: '/Users/a0',
    candidateHosts: [],
    dockerContexts: [
      {
        Name: 'orbstack',
        Current: true,
        Endpoints: { docker: { Host: 'unix:///Users/a0/.orbstack/run/docker.sock' } }
      },
      {
        Name: 'rancher-desktop',
        Endpoints: { docker: { Host: 'unix:///Users/a0/.rd/docker.sock' } }
      }
    ],
    dockerodeClass: fakeDockerodeClass(['/Users/a0/.orbstack/run/docker.sock'])
  });

  assert.equal(env.dockerAvailable, true);
  assert.deepEqual(env.runtimeCandidates.map((candidate) => candidate.provider), ['orbstack', 'rancher_desktop']);
  assert.equal(env.runtimeCandidates[0].label, 'orbstack (current)');
  assert.equal(env.runtimeCandidates[0].isSelected, true);
  assert.equal(env.runtimeCandidates[1].available, false);
});

test('DockerInterface only accepts Podman when its Docker-compatible API responds', async () => {
  const unavailable = await DockerInterface.detectEnvironment({
    platform: 'linux',
    runtimeDir: '/run/user/1000',
    discoverDockerContexts: false,
    candidateHosts: [
      { provider: 'podman', label: 'Podman', dockerHost: 'unix:///run/user/1000/podman/podman.sock' }
    ],
    dockerodeClass: fakeDockerodeClass()
  });

  assert.equal(unavailable.dockerAvailable, false);
  assert.equal(unavailable.runtimeCandidates[0].provider, 'podman');
  assert.equal(unavailable.runtimeCandidates[0].available, false);

  const available = await DockerInterface.detectEnvironment({
    platform: 'linux',
    runtimeDir: '/run/user/1000',
    discoverDockerContexts: false,
    candidateHosts: [
      { provider: 'podman', label: 'Podman', dockerHost: 'unix:///run/user/1000/podman/podman.sock' }
    ],
    dockerodeClass: fakeDockerodeClass(['/run/user/1000/podman/podman.sock'])
  });

  assert.equal(available.dockerAvailable, true);
  assert.equal(available.dockerFlavor, 'podman');
  assert.equal(available.runtimeCandidates[0].isSelected, true);
});

test('WindowsWslDockerProxy keepalive holds the selected WSL distro open', { skip: process.platform !== 'win32' }, () => {
  stopWindowsWslKeepAlive();
  const calls = [];
  const child = new FakeChildProcess();
  const spawnCommand = (cmd, args, options) => {
    calls.push({ cmd, args, options });
    return child;
  };

  try {
    const first = ensureWindowsWslKeepAlive({ distro: 'Ubuntu', spawnCommand });
    const second = ensureWindowsWslKeepAlive({ distro: 'Ubuntu', spawnCommand });

    assert.deepEqual(first, { started: true, reused: false, distro: 'Ubuntu' });
    assert.deepEqual(second, { started: true, reused: true, distro: 'Ubuntu' });
    assert.equal(calls.length, 1);
    assert.equal(calls[0].cmd, 'wsl.exe');
    assert.deepEqual(calls[0].args.slice(0, 2), ['-d', 'Ubuntu']);
    assert.ok(calls[0].args.includes('-u'));
    assert.ok(calls[0].args.includes('root'));
    assert.ok(calls[0].args.includes('--exec'));
    assert.ok(calls[0].args.includes('sh'));
    assert.match(calls[0].args.at(-2), /sleep 2147483647/);
    assert.match(calls[0].args.at(-2), /kill "\$sleep_pid"/);
    assert.match(calls[0].args.at(-1), /^a0-launcher-wsl-keepalive-\d+-[a-f0-9-]{36}$/);
    assert.deepEqual(calls[0].options.stdio, 'ignore');
    assert.equal(calls[0].options.windowsHide, true);
    assert.equal(child.unrefCalled, true);
  } finally {
    stopWindowsWslKeepAlive();
  }

  assert.equal(child.killed, true);
  assert.equal(calls.length, 2);
  assert.equal(calls[1].cmd, 'wsl.exe');
  assert.deepEqual(calls[1].args.slice(0, 2), ['-d', 'Ubuntu']);
  assert.match(calls[1].args.at(-1), /pkill -TERM/);
  assert.match(calls[1].args.at(-1), /\[a\]0-launcher-wsl-keepalive-/);
  assert.deepEqual(calls[1].options.stdio, 'ignore');
  assert.equal(calls[1].options.windowsHide, true);
  assert.equal(calls[1].options.detached, true);
});

function fakeDockerodeClass(availableSocketPaths = [], daemonIds = {}) {
  const available = new Set(availableSocketPaths);
  return class FakeDockerode {
    constructor(options = {}) {
      this.options = options;
    }

    async ping() {
      const socketPath = this.options.socketPath || '';
      const tcpHost = this.options.host ? `${this.options.host}:${this.options.port || 2375}` : '';
      if (available.has(socketPath) || available.has(tcpHost)) return true;
      const error = new Error('Docker endpoint is not reachable');
      error.code = socketPath ? 'ENOENT' : 'ECONNREFUSED';
      throw error;
    }

    async version() {
      return { Version: 'test' };
    }

    async info() {
      const endpoint = this.options.socketPath || (this.options.host ? `${this.options.host}:${this.options.port || 2375}` : '');
      if (Object.prototype.hasOwnProperty.call(daemonIds, endpoint)) return { ID: daemonIds[endpoint] };
      return { ID: `daemon-${availableSocketPaths.indexOf(endpoint) + 1}` };
    }
  };
}

test('selectLatestDockerCliAsset chooses the newest static macOS Docker CLI tarball', () => {
  const html = `
    <a href="docker-29.4.2.tgz">docker-29.4.2.tgz</a>
    <a href="docker-29.4.2-2.tgz">docker-29.4.2-2.tgz</a>
    <a href="docker-29.5.2.tgz">docker-29.5.2.tgz</a>
    <a href="docker-29.5.3.tgz">docker-29.5.3.tgz</a>
    <a href="notes.txt">notes.txt</a>
  `;

  assert.deepEqual(
    selectLatestDockerCliAsset('https://download.docker.com/mac/static/stable/aarch64/', html),
    {
      name: 'docker-29.5.3.tgz',
      version: '29.5.3',
      url: 'https://download.docker.com/mac/static/stable/aarch64/docker-29.5.3.tgz'
    }
  );
});

test('selectLatestDockerCliAsset returns null when the index has no Docker CLI tarballs', () => {
  assert.equal(
    selectLatestDockerCliAsset('https://download.docker.com/mac/static/stable/aarch64/', '<html></html>'),
    null
  );
});

test('LinuxEngineRuntime assess allows passwordless sudo when pkexec is absent', async () => {
  const managedDir = await mkdtemp(path.join(os.tmpdir(), 'a0-runtime-'));
  try {
    const runtime = new LinuxEngineRuntime({
      managedDir,
      isRoot: false,
      runCommand: fakeLinuxCommandRunner({
        binaries: ['apt-get'],
        passwordlessSudo: true
      })
    });

    const assessment = await runtime.assess();

    assert.equal(assessment.state, 'not_provisioned');
    assert.equal(assessment.packageManager, 'apt');
  } finally {
    await rm(managedDir, { recursive: true, force: true });
  }
});

test('LinuxEngineRuntime start reports the endpoint selected by the user action', async () => {
  const managedDir = await mkdtemp(path.join(os.tmpdir(), 'a0-runtime-'));
  try {
    const runtime = new LinuxEngineRuntime({
      managedDir,
      isRoot: false,
      probeNativeSocket: async () => 'OK',
      runCommand: fakeLinuxCommandRunner({ passwordlessSudo: true })
    });

    const result = await runtime.start();

    assert.equal(result.endpoint.dockerHost, 'unix:///var/run/docker.sock');
  } finally {
    await rm(managedDir, { recursive: true, force: true });
  }
});

test('LinuxEngineRuntime starts installed Docker Desktop without privileged native Engine setup', async () => {
  const managedDir = await mkdtemp(path.join(os.tmpdir(), 'a0-runtime-'));
  const calls = [];
  const privilegedScripts = [];
  const desktopSocket = `${os.homedir()}/.docker/desktop/docker.sock`;
  try {
    const runtime = new LinuxEngineRuntime({
      managedDir,
      isRoot: false,
      probeNativeSocket: async (socketPath) => socketPath === desktopSocket ? 'OK' : 'ENOENT',
      runCommand: fakeLinuxCommandRunner({
        binaries: ['docker'],
        dockerDesktopInstalled: true,
        passwordlessSudo: true,
        privilegedScripts,
        calls
      })
    });

    const assessment = await runtime.assess();
    const result = await runtime.start();

    assert.equal(assessment.state, 'engine_stopped');
    assert.equal(assessment.mode, 'docker_desktop');
    assert.equal(result.endpoint.dockerHost, `unix://${desktopSocket}`);
    assert.ok(calls.some(({ cmd, args }) => cmd === 'systemctl' && args?.join(' ') === '--user start docker-desktop'));
    assert.deepEqual(privilegedScripts, []);
  } finally {
    await rm(managedDir, { recursive: true, force: true });
  }
});

test('LinuxEngineRuntime can start Docker Desktop while native Engine is ready', async () => {
  const managedDir = await mkdtemp(path.join(os.tmpdir(), 'a0-runtime-'));
  const desktopSocket = `${os.homedir()}/.docker/desktop/docker.sock`;
  try {
    const runtime = new LinuxEngineRuntime({
      managedDir,
      isRoot: false,
      probeNativeSocket: async () => 'OK',
      runCommand: fakeLinuxCommandRunner({
        binaries: ['docker'],
        dockerDesktopInstalled: true
      })
    });

    assert.equal((await runtime.assess()).state, 'ready');
    assert.equal((await runtime.assessDockerDesktop()).mode, 'docker_desktop');
    const result = await runtime.start({ mode: 'docker_desktop' });
    assert.equal(result.endpoint.dockerHost, `unix://${desktopSocket}`);
  } finally {
    await rm(managedDir, { recursive: true, force: true });
  }
});

test('LinuxEngineRuntime assess requires manual install without pkexec or passwordless sudo', async () => {
  const managedDir = await mkdtemp(path.join(os.tmpdir(), 'a0-runtime-'));
  try {
    const runtime = new LinuxEngineRuntime({
      managedDir,
      isRoot: false,
      username: 'a0user',
      runCommand: fakeLinuxCommandRunner({
        binaries: ['apt-get'],
        passwordlessSudo: false
      })
    });

    const assessment = await runtime.assess();

    assert.equal(assessment.state, 'manual_install');
    assert.equal(assessment.packageManager, 'apt');
    assert.match(assessment.detail, /authentication dialog or passwordless sudo/i);
    assert.match(assessment.manualCommand, /apt-get update/);
  } finally {
    await rm(managedDir, { recursive: true, force: true });
  }
});

test('LinuxEngineRuntime provision composes install, start, and docker group access', async () => {
  const managedDir = await mkdtemp(path.join(os.tmpdir(), 'a0-runtime-'));
  const privilegedScripts = [];
  try {
    const runtime = new LinuxEngineRuntime({
      managedDir,
      isRoot: false,
      username: 'a0user',
      probeNativeSocket: async () => 'EACCES',
      runCommand: fakeLinuxCommandRunner({
        binaries: ['apt-get'],
        passwordlessSudo: true,
        privilegedScripts
      })
    });

    await assert.rejects(
      () => runtime.provision(),
      (error) => error?.code === 'RUNTIME_NEEDS_RELOGIN'
    );

    assert.equal(privilegedScripts.length, 1);
    assert.match(privilegedScripts[0], /apt-get update/);
    assert.match(privilegedScripts[0], /systemctl enable --now docker/);
    assert.doesNotMatch(privilegedScripts[0], /then exit 0/);
    assert.match(privilegedScripts[0], /usermod -aG docker 'a0user'/);
  } finally {
    await rm(managedDir, { recursive: true, force: true });
  }
});

test('LinuxEngineRuntime assess offers docker group repair when Docker is installed without access', async () => {
  const managedDir = await mkdtemp(path.join(os.tmpdir(), 'a0-runtime-'));
  try {
    const runtime = new LinuxEngineRuntime({
      managedDir,
      isRoot: false,
      username: 'a0user',
      probeNativeSocket: async () => 'EACCES',
      runCommand: fakeLinuxCommandRunner({
        binaries: ['docker'],
        groups: ['a0user'],
        passwordlessSudo: true
      })
    });

    const assessment = await runtime.assess();

    assert.equal(assessment.state, 'needs_group_membership');
    assert.match(assessment.detail, /needs Docker access/i);
  } finally {
    await rm(managedDir, { recursive: true, force: true });
  }
});

test('LinuxEngineRuntime assess reports relogin when docker group membership is already recorded', async () => {
  const managedDir = await mkdtemp(path.join(os.tmpdir(), 'a0-runtime-'));
  try {
    const runtime = new LinuxEngineRuntime({
      managedDir,
      isRoot: false,
      username: 'a0user',
      probeNativeSocket: async () => 'EACCES',
      runCommand: fakeLinuxCommandRunner({
        binaries: ['docker'],
        groups: ['a0user', 'docker'],
        passwordlessSudo: true
      })
    });

    const assessment = await runtime.assess();

    assert.equal(assessment.state, 'needs_relogin');
  } finally {
    await rm(managedDir, { recursive: true, force: true });
  }
});

function fakeLinuxCommandRunner({
  binaries = [],
  groups = [],
  passwordlessSudo = false,
  privilegedScripts = [],
  dockerDesktopInstalled = false,
  calls = []
} = {}) {
  const present = new Set(binaries);
  return async (cmd, args) => {
    calls.push({ cmd, args: Array.isArray(args) ? [...args] : args });
    if (cmd === 'sh' && args?.[0] === '-c') {
      const match = String(args[1] || '').match(/^command -v ([A-Za-z0-9_.-]+)$/);
      if (match) {
        const binary = match[1];
        return {
          code: present.has(binary) ? 0 : 1,
          stdout: present.has(binary) ? `/usr/bin/${binary}\n` : '',
          stderr: ''
        };
      }
    }
    if (cmd === 'sudo' && args?.[0] === '-n' && args?.[1] === 'true') {
      return { code: passwordlessSudo ? 0 : 1, stdout: '', stderr: '' };
    }
    if (cmd === 'sudo' && args?.[0] === '-n' && args?.[1] === 'sh' && args?.[2] === '-c') {
      privilegedScripts.push(String(args[3] || ''));
      return { code: 0, stdout: '', stderr: '' };
    }
    if (cmd === 'id' && args?.[0] === '-nG') {
      return { code: 0, stdout: `${groups.join(' ')}\n`, stderr: '' };
    }
    if (cmd === 'systemctl' && args?.[0] === '--user' && args?.[1] === 'show') {
      return dockerDesktopInstalled
        ? { code: 0, stdout: 'loaded\n', stderr: '' }
        : { code: 1, stdout: 'not-found\n', stderr: '' };
    }
    if (cmd === 'systemctl' && args?.[0] === '--user' && args?.[1] === 'start') {
      return { code: 0, stdout: '', stderr: '' };
    }
    return { code: 1, stdout: '', stderr: '' };
  };
}

class FakeChildProcess extends EventEmitter {
  killed = false;
  unrefCalled = false;

  unref() {
    this.unrefCalled = true;
  }

  kill() {
    this.killed = true;
    this.emit('close', null);
  }
}

function windowsRuntimeMarker(overrides = {}) {
  return {
    schemaVersion: 1,
    runtimeVersion: 1,
    distroName: 'AgentZeroRuntime',
    wslVersion: 2,
    architecture: 'amd64',
    ...overrides
  };
}

function windowsRuntimeManifest() {
  const packageVersions = {
    'docker-ce': '5:29.7.2-1',
    'docker-ce-cli': '5:29.7.2-1',
    'containerd.io': '2.3.4-1',
    'docker-buildx-plugin': '0.36.1-1',
    'docker-compose-plugin': '5.5.0-1',
    python3: '3.12.3-1'
  };
  const asset = (architecture, sha256) => ({
    name: WINDOWS_WSL_RUNTIME_CONTRACT.assets[architecture],
    url: `https://github.com/agent0ai/a0-install/releases/download/runtime-v1/${WINDOWS_WSL_RUNTIME_CONTRACT.assets[architecture]}`,
    sha256,
    sizeBytes: 16,
    sbomName: `agent-zero-runtime-wsl-${architecture}.spdx.json`,
    packageVersions: { ...packageVersions }
  });
  return {
    schemaVersion: 1,
    runtimeVersion: 1,
    distro: {
      name: 'AgentZeroRuntime',
      wslVersion: 2,
      markerPath: '/etc/agent-zero-runtime.json'
    },
    release: { repository: 'agent0ai/a0-install', tag: 'runtime-v1' },
    base: { distribution: 'ubuntu', version: '24.04.4', codename: 'noble' },
    createdAt: '2026-09-01T00:00:00Z',
    assets: {
      amd64: asset('amd64', 'a'.repeat(64)),
      arm64: asset('arm64', 'b'.repeat(64))
    }
  };
}

function fakeWindowsCommandRunner({
  binaries = [],
  calls = [],
  elevatedExitCode = 0,
  features = {},
  productType = 3,
  wslList = '',
  dockerDesktopPath = '',
  wslDockerInstalled = false,
  wslDockerReady = false,
  wslPythonInstalled = true,
  managedMarker = null,
  managedRuntimeComplete = false,
  wslImportCode = 0
} = {}) {
  const present = new Set(binaries);
  let managedImported = false;
  return async (cmd, args) => {
    calls.push({ cmd, args: Array.isArray(args) ? [...args] : args });
    if (cmd === 'where.exe') {
      const binary = args?.[0] || '';
      return {
        code: present.has(binary) ? 0 : 1,
        stdout: present.has(binary) ? `C:\\Windows\\System32\\${binary}\r\n` : '',
        stderr: ''
      };
    }
    if (cmd === 'powershell.exe') {
      const script = String(args?.[args.length - 1] || '');
      if (/Start-Process/.test(script) && /-Verb RunAs/.test(script)) {
        return { code: elevatedExitCode, stdout: '', stderr: '' };
      }
      if (/Win32_OperatingSystem\)\.ProductType/.test(script)) {
        return { code: 0, stdout: `${productType}\r\n`, stderr: '' };
      }
      if (/Docker Desktop\.exe/.test(script)) {
        return { code: 0, stdout: dockerDesktopPath ? `${dockerDesktopPath}\r\n` : '', stderr: '' };
      }
      const featureMatch = script.match(/FeatureName '([^']+)'/);
      if (featureMatch) {
        return { code: 0, stdout: `${features[featureMatch[1]] || 'Unknown'}\r\n`, stderr: '' };
      }
    }
    if (cmd === 'wsl.exe' && args?.[0] === '-l') {
      const imported = managedImported
        ? `${wslList.trimEnd()}\n  AgentZeroRuntime     Stopped    2\n`
        : wslList;
      return { code: 0, stdout: imported, stderr: '' };
    }
    if (cmd === 'wsl.exe' && args?.[0] === '--import') {
      if (wslImportCode === 0) managedImported = true;
      return { code: wslImportCode, stdout: '', stderr: wslImportCode ? 'import failed' : '' };
    }
    if (cmd === 'wsl.exe' && args?.includes('--exec')) {
      const distroIndex = args.indexOf('-d');
      const distro = distroIndex >= 0 ? String(args[distroIndex + 1] || '') : '';
      const execIndex = args.indexOf('--exec');
      const command = args.slice(execIndex + 1);
      if (command[0] === 'cat' && command[1] === WINDOWS_WSL_RUNTIME_CONTRACT.markerPath) {
        if (/^AgentZeroRuntime$/i.test(distro) && managedMarker && (managedImported || /AgentZeroRuntime/i.test(wslList))) {
          return { code: 0, stdout: `${JSON.stringify(managedMarker)}\n`, stderr: '' };
        }
        return { code: 1, stdout: '', stderr: 'marker missing' };
      }
      if (command[0] === WINDOWS_WSL_RUNTIME_CONTRACT.startPath) {
        return { code: managedRuntimeComplete ? 0 : 1, stdout: '', stderr: managedRuntimeComplete ? '' : 'start failed' };
      }
      if (command[0] === 'sh' && command[1] === '-c') {
        const script = String(command[2] || '');
        if (/^AgentZeroRuntime$/i.test(distro)) {
          return { code: managedRuntimeComplete ? 0 : 1, stdout: '', stderr: '' };
        }
        const ready = wslDockerInstalled && wslDockerReady && wslPythonInstalled;
        if (/docker info/.test(script)) return { code: ready ? 0 : 1, stdout: '', stderr: '' };
        if (/command -v docker|command -v dockerd/.test(script)) {
          return { code: wslDockerInstalled ? 0 : 1, stdout: '', stderr: '' };
        }
        if (/command -v python3/.test(script)) return { code: wslPythonInstalled ? 0 : 1, stdout: '', stderr: '' };
      }
    }
    return { code: 1, stdout: '', stderr: '' };
  };
}
