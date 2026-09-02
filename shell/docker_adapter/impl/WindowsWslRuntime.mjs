/**
 * Windows runtime assessment for Docker Desktop and WSL-backed Docker Engine.
 *
 * DockerInterface probing runs before this class is consulted. Existing
 * reachable runtimes are reused first. Automatic WSL provisioning imports the
 * dedicated Agent Zero appliance and never installs packages into a user distro.
 */

import fsp from 'node:fs/promises';
import path from 'node:path';

import {
  acquireRuntimeSetupLock,
  RuntimeProvisioner,
  downloadVerified,
  fetchJson,
  makeError,
  pathExists,
  run
} from '../RuntimeProvisioner.mjs';
import {
  ensureWindowsWslDockerProxy,
  WINDOWS_WSL_DOCKER_HOST,
  WINDOWS_WSL_DOCKER_PIPE_PATH
} from './WindowsWslDockerProxy.mjs';

const WSL_GUIDE_URL = 'https://learn.microsoft.com/windows/wsl/install-on-server';
const WSL_INSTALL_URL = 'https://learn.microsoft.com/windows/wsl/install';
const DOCKER_DESKTOP_URL = 'https://www.docker.com/products/docker-desktop/';
const RUNTIME_RELEASE_BASE_URL = 'https://github.com/agent0ai/a0-install/releases/download/runtime-v1';
const RUNTIME_DOWNLOAD_HOSTS = Object.freeze([
  'github.com',
  'release-assets.githubusercontent.com',
  'objects.githubusercontent.com'
]);
const RUNTIME_ARCHITECTURES = Object.freeze({ x64: 'amd64', arm64: 'arm64' });
const REQUIRED_RUNTIME_PACKAGES = Object.freeze([
  'docker-ce',
  'docker-ce-cli',
  'containerd.io',
  'docker-buildx-plugin',
  'docker-compose-plugin',
  'python3'
]);

export const WINDOWS_WSL_RUNTIME_CONTRACT = Object.freeze({
  schemaVersion: 1,
  runtimeVersion: 1,
  distroName: 'AgentZeroRuntime',
  wslVersion: 2,
  markerPath: '/etc/agent-zero-runtime.json',
  startPath: '/usr/local/sbin/a0-runtime-start',
  repository: 'agent0ai/a0-install',
  releaseTag: 'runtime-v1',
  manifestName: 'agent-zero-runtime-manifest.json',
  manifestUrl: `${RUNTIME_RELEASE_BASE_URL}/agent-zero-runtime-manifest.json`,
  maxManifestBytes: 64 * 1024,
  maxCompressedSizeBytes: 350 * 1024 * 1024,
  assets: Object.freeze({
    amd64: 'agent-zero-runtime-wsl-amd64.tar.gz',
    arm64: 'agent-zero-runtime-wsl-arm64.tar.gz'
  })
});

export class WindowsWslRuntime extends RuntimeProvisioner {
  constructor(options = {}) {
    super(options);
    this._runCommand = typeof options.runCommand === 'function' ? options.runCommand : run;
    this._ensureProxy = typeof options.ensureProxy === 'function' ? options.ensureProxy : ensureWindowsWslDockerProxy;
    this._fetchJson = typeof options.fetchJson === 'function' ? options.fetchJson : fetchJson;
    this._downloadVerified = typeof options.downloadVerified === 'function' ? options.downloadVerified : downloadVerified;
    this._isWindowsServerOverride = typeof options.isWindowsServer === 'boolean' ? options.isWindowsServer : null;
    this._architecture = options.architecture || process.arch;
    this._manifestUrl = options.manifestUrl || WINDOWS_WSL_RUNTIME_CONTRACT.manifestUrl;
  }

  async assess() {
    if (await this.#isWindowsServer()) return await this.#assessWindowsServer();
    return await this.#assessWindowsClient();
  }

  async assessDockerDesktop() {
    if (await this.#isWindowsServer()) return null;
    return await this.#dockerDesktopPath() ? this.#dockerDesktopStoppedAssessment() : null;
  }

  async provision(options = {}) {
    const assessment = await this.assess();
    if (assessment?.mode === 'wsl_feature' && assessment.state === 'not_provisioned') {
      return await this.#installWslFeatures(options);
    }
    if (assessment?.mode === 'wsl_managed_distribution' && assessment.state === 'not_provisioned') {
      return await this.#provisionManagedRuntime(options);
    }
    if (assessment?.mode === 'docker_desktop' && assessment.state === 'engine_stopped') {
      options.onProgress?.('Starting Docker Desktop');
      return await this.#startDockerDesktop(options);
    }
    if (assessment?.state === 'engine_stopped') return await this.start(options);
    throw makeError('RUNTIME_UNSUPPORTED', assessment.detail, this.#manualDetails(assessment));
  }

  async start(options = {}) {
    if (options.mode === 'docker_desktop') return await this.#startDockerDesktop(options);

    const assessment = await this.assess();
    if (assessment?.mode === 'wsl_managed' && assessment.state === 'engine_stopped') {
      options.onProgress?.('Starting WSL Docker Engine');
      await this.#startManagedDocker(assessment.distro, options);
      options.onProgress?.('Starting local Docker bridge');
      await this.#ensureProxy(assessment.distro);
      return { endpoint: this.endpoint() };
    }
    if (assessment?.mode === 'wsl_engine' && assessment.state === 'engine_stopped') {
      if (!await this.#isReusableWslDistro(assessment.distro)) {
        throw makeError('RUNTIME_START_FAILED', 'The existing WSL Docker Engine is no longer ready. Agent Zero did not modify it.', {
          distro: assessment.distro
        });
      }
      options.onProgress?.('Starting local Docker bridge');
      await this.#ensureProxy(assessment.distro);
      return { endpoint: this.endpoint() };
    }
    if (assessment?.mode === 'docker_desktop') {
      options.onProgress?.('Starting Docker Desktop');
      return await this.#startDockerDesktop(options);
    }
    throw makeError('RUNTIME_UNSUPPORTED', assessment.detail, this.#manualDetails(assessment));
  }

  async status() {
    return {
      exists: await this.#binaryExists('wsl.exe'),
      running: false,
      needsRelogin: false
    };
  }

  endpoint() {
    return {
      kind: 'npipe',
      socketPath: WINDOWS_WSL_DOCKER_PIPE_PATH,
      dockerHost: WINDOWS_WSL_DOCKER_HOST
    };
  }

  async #assessWindowsServer() {
    const wslPresent = await this.#binaryExists('wsl.exe');
    if (!wslPresent) {
      return {
        state: 'manual_install',
        detail: 'Docker Desktop is not supported on Windows Server. Install WSL2 with nested virtualization support, then provide a Linux-container Docker Engine endpoint.',
        manualUrl: WSL_GUIDE_URL
      };
    }

    const distroList = await this.#wslList();
    const wslUsable = this.#wslListShowsUsableFeatures(distroList);
    const wslFeature = await this.#optionalFeatureState('Microsoft-Windows-Subsystem-Linux');
    const vmPlatform = await this.#optionalFeatureState('VirtualMachinePlatform');
    if (!wslUsable && (wslFeature !== 'Enabled' || vmPlatform !== 'Enabled')) {
      return {
        state: 'manual_install',
        detail: 'Docker Desktop is not supported on Windows Server. Enable WSL2 with wsl.exe --install --no-distribution, restart Windows, then provide a Linux-container Docker Engine endpoint.',
        manualCommand: 'wsl.exe --install --no-distribution',
        manualUrl: WSL_GUIDE_URL
      };
    }

    if (/WSL_E_DEFAULT_DISTRO_NOT_FOUND|has no installed distributions|no installed distributions|non ha distribuzioni installate/i.test(distroList)) {
      return {
        state: 'manual_install',
        detail: 'WSL2 is enabled, but no Linux Docker Engine is available yet. This VM needs nested virtualization or Hyper-V support from the host provider.',
        manualUrl: WSL_GUIDE_URL
      };
    }

    return {
      state: 'manual_install',
      detail: 'A WSL distro is installed, but no Windows Docker endpoint is reachable yet. Start its Docker Engine and expose a local Docker endpoint, then refresh.',
      manualUrl: WSL_GUIDE_URL
    };
  }

  async #assessWindowsClient() {
    const dockerDesktopInstalled = Boolean(await this.#dockerDesktopPath());
    if (!await this.#binaryExists('wsl.exe')) {
      if (dockerDesktopInstalled) return this.#dockerDesktopStoppedAssessment();
      return this.#wslFeatureSetupAssessment('Local Agent Zero runtime Setup may ask for Windows approval and may require a restart.');
    }

    const distroList = await this.#wslList();
    const distros = this.#parseWslDistros(distroList);
    const managed = this.#findDistro(distros, WINDOWS_WSL_RUNTIME_CONTRACT.distroName);
    if (managed) return await this.#assessManagedDistro(managed);

    const wslUsable = this.#wslListShowsUsableFeatures(distroList);
    if (!wslUsable) {
      const wslFeature = await this.#optionalFeatureState('Microsoft-Windows-Subsystem-Linux');
      const vmPlatform = await this.#optionalFeatureState('VirtualMachinePlatform');
      if (wslFeature !== 'Enabled' || vmPlatform !== 'Enabled') {
        if (dockerDesktopInstalled) return this.#dockerDesktopStoppedAssessment();
        return this.#wslFeatureSetupAssessment('Local Agent Zero runtime Setup may ask for Windows approval and may require a restart.');
      }
    }

    const reusable = await this.#findReusableWslDistro(distros);
    if (reusable) {
      return {
        state: 'engine_stopped',
        mode: 'wsl_engine',
        distro: reusable.name,
        detail: 'An existing WSL Docker Engine is ready for Agent Zero.'
      };
    }

    if (dockerDesktopInstalled) return this.#dockerDesktopStoppedAssessment();
    return {
      state: 'not_provisioned',
      mode: 'wsl_managed_distribution',
      detail: 'Install the lightweight Agent Zero local runtime.',
      manualUrl: WSL_INSTALL_URL,
      setupActionLabel: 'Setup Agent Zero'
    };
  }

  async #assessManagedDistro(distro) {
    if (distro.version !== WINDOWS_WSL_RUNTIME_CONTRACT.wslVersion) {
      return this.#managedRuntimeProblem(`The Agent Zero runtime exists as WSL${distro.version}; runtime v1 requires WSL2.`);
    }

    const marker = await this.#readManagedMarker(distro.name);
    const expectedArchitecture = RUNTIME_ARCHITECTURES[this._architecture];
    if (!marker.valid) {
      return this.#managedRuntimeProblem(
        `A WSL distro named ${WINDOWS_WSL_RUNTIME_CONTRACT.distroName} already exists but ${marker.reason}. Agent Zero made no changes.`,
        'RUNTIME_NAME_COLLISION'
      );
    }
    if (!expectedArchitecture || marker.value.architecture !== expectedArchitecture) {
      return this.#managedRuntimeProblem('The installed Agent Zero runtime architecture does not match this Windows host.');
    }

    const required = await this.#wslRootCommandOk(distro.name, [
      'command -v docker >/dev/null 2>&1',
      'command -v dockerd >/dev/null 2>&1',
      'command -v python3 >/dev/null 2>&1',
      'command -v timeout >/dev/null 2>&1',
      `test -x ${WINDOWS_WSL_RUNTIME_CONTRACT.startPath}`
    ].join(' && '));
    if (!required) {
      return this.#managedRuntimeProblem('The Agent Zero runtime is incomplete. Its Docker image cache must be preserved until the user chooses repair or removal.');
    }

    return {
      state: 'engine_stopped',
      mode: 'wsl_managed',
      distro: distro.name,
      detail: 'Agent Zero local runtime is ready to start.'
    };
  }

  #managedRuntimeProblem(detail, diagnosticCode = 'RUNTIME_REPAIR_REQUIRED') {
    return {
      state: 'manual_install',
      mode: 'wsl_managed',
      distro: WINDOWS_WSL_RUNTIME_CONTRACT.distroName,
      detail,
      diagnosticCode,
      manualCommand: 'wsl.exe --list --verbose',
      manualUrl: WSL_INSTALL_URL
    };
  }

  async #findReusableWslDistro(distros) {
    const candidates = (distros || [])
      .filter((distro) => distro.version === 2 && !/^docker-desktop(?:-data)?$/i.test(distro.name))
      .sort((left, right) => Number(right.default) - Number(left.default));
    for (const distro of candidates) {
      if (await this.#isReusableWslDistro(distro.name)) return distro;
    }
    return null;
  }

  async #isReusableWslDistro(distro) {
    return await this.#wslRootCommandOk(distro, [
      'command -v docker >/dev/null 2>&1',
      'command -v dockerd >/dev/null 2>&1',
      'command -v python3 >/dev/null 2>&1',
      'docker info >/dev/null 2>&1'
    ].join(' && '));
  }

  async #provisionManagedRuntime(options = {}) {
    const architecture = RUNTIME_ARCHITECTURES[this._architecture];
    if (!architecture) {
      throw makeError('RUNTIME_UNSUPPORTED_ARCHITECTURE', `Agent Zero runtime v1 does not support Windows architecture ${this._architecture}.`);
    }

    const installPath = this.#managedPath('wsl', WINDOWS_WSL_RUNTIME_CONTRACT.distroName);
    const setupLock = await acquireRuntimeSetupLock(this.#managedPath('locks', 'setup.lock'));
    let archivePath = '';

    try {
      if (await pathExists(installPath)) {
        throw makeError('RUNTIME_PATH_COLLISION', 'The Agent Zero runtime directory already exists without a registered runtime. It was preserved for manual recovery.', {
          installPath
        });
      }

      options.onProgress?.('Checking Agent Zero runtime');
      const manifest = await this._fetchJson(this._manifestUrl, {
        signal: options.signal,
        maxBytes: WINDOWS_WSL_RUNTIME_CONTRACT.maxManifestBytes,
        allowedHosts: RUNTIME_DOWNLOAD_HOSTS
      });
      const asset = validateWindowsWslRuntimeManifest(manifest, architecture);
      archivePath = this.#managedPath('downloads', asset.name);
      await fsp.rm(archivePath, { force: true });
      options.onProgress?.('Downloading Agent Zero runtime');
      await this._downloadVerified(asset.url, archivePath, asset.sha256, {
        signal: options.signal,
        expectedSize: asset.sizeBytes,
        maxBytes: WINDOWS_WSL_RUNTIME_CONTRACT.maxCompressedSizeBytes,
        allowedHosts: RUNTIME_DOWNLOAD_HOSTS,
        onProgress: (_message, progress) => options.onProgress?.('Downloading Agent Zero runtime', progress)
      });

      if (this.#findDistro(await this.#wslDistros(), WINDOWS_WSL_RUNTIME_CONTRACT.distroName)) {
        throw makeError('RUNTIME_NAME_COLLISION', `A WSL distro named ${WINDOWS_WSL_RUNTIME_CONTRACT.distroName} appeared during Setup. Agent Zero did not replace it.`);
      }

      await fsp.mkdir(installPath, { recursive: true });
      options.onProgress?.('Installing Agent Zero runtime');
      const imported = await this._runCommand('wsl.exe', [
        '--import',
        WINDOWS_WSL_RUNTIME_CONTRACT.distroName,
        installPath,
        archivePath,
        '--version',
        String(WINDOWS_WSL_RUNTIME_CONTRACT.wslVersion)
      ], {
        timeoutMs: options.timeoutMs || 20 * 60 * 1000,
        signal: options.signal
      });
      if (imported.code !== 0) {
        throw makeError('RUNTIME_PROVISION_FAILED', 'Could not import the Agent Zero WSL runtime.', {
          exitCode: imported.code,
          stdout: cleanCommandText(imported.stdout),
          stderr: cleanCommandText(imported.stderr)
        });
      }

      const registered = this.#findDistro(await this.#wslDistros(), WINDOWS_WSL_RUNTIME_CONTRACT.distroName);
      const marker = registered ? await this.#readManagedMarker(registered.name) : { valid: false, reason: 'was not registered' };
      if (!registered || registered.version !== 2 || !marker.valid || marker.value.architecture !== architecture) {
        throw makeError('RUNTIME_PROVISION_FAILED', `The imported Agent Zero runtime failed ownership validation: ${marker.reason || 'unexpected WSL version or architecture'}.`);
      }

      options.onProgress?.('Starting WSL Docker Engine');
      await this.#startManagedDocker(registered.name, options);
      options.onProgress?.('Starting local Docker bridge');
      await this.#ensureProxy(registered.name);
      return { endpoint: this.endpoint() };
    } finally {
      if (archivePath) await fsp.rm(archivePath, { force: true }).catch(() => {});
      await setupLock.release();
    }
  }

  async #startManagedDocker(distro, options = {}) {
    const result = await this.#wslRootExec(distro, [WINDOWS_WSL_RUNTIME_CONTRACT.startPath, '120'], {
      timeoutMs: Math.min(options.timeoutMs || 130000, 130000),
      signal: options.signal
    });
    if (result.code !== 0) {
      throw makeError('RUNTIME_START_FAILED', 'Could not start Docker Engine inside the Agent Zero runtime.', {
        distro,
        exitCode: result.code,
        stdout: cleanCommandText(result.stdout),
        stderr: cleanCommandText(result.stderr)
      });
    }
  }

  async #ensureProxy(distro) {
    const result = await this._ensureProxy({ distro });
    if (result?.started !== true) {
      throw makeError('RUNTIME_START_FAILED', 'Could not start the local Docker bridge.', {
        distro,
        reason: result?.reason || 'unknown'
      });
    }
  }

  async #readManagedMarker(distro) {
    const result = await this.#wslRootExec(distro, ['cat', WINDOWS_WSL_RUNTIME_CONTRACT.markerPath], { timeoutMs: 15000 })
      .catch((error) => ({ code: -1, stdout: '', stderr: error?.message || String(error) }));
    if (result.code !== 0) return { valid: false, reason: 'does not carry the Agent Zero ownership marker' };
    let value;
    try {
      value = JSON.parse(cleanCommandText(result.stdout).trim());
    } catch {
      return { valid: false, reason: 'has an unreadable Agent Zero ownership marker' };
    }
    const valid = (
      isPlainObject(value) &&
      value.schemaVersion === WINDOWS_WSL_RUNTIME_CONTRACT.schemaVersion &&
      value.runtimeVersion === WINDOWS_WSL_RUNTIME_CONTRACT.runtimeVersion &&
      value.distroName === WINDOWS_WSL_RUNTIME_CONTRACT.distroName &&
      value.wslVersion === WINDOWS_WSL_RUNTIME_CONTRACT.wslVersion
    );
    return valid
      ? { valid: true, value }
      : { valid: false, value, reason: 'has an incompatible Agent Zero ownership marker' };
  }

  #managedPath(...parts) {
    const root = path.resolve(this.managedDir);
    const target = path.resolve(root, ...parts);
    if (target === root || !target.startsWith(`${root}${path.sep}`)) {
      throw makeError('INVALID_RUNTIME_PATH', 'Runtime path escapes the Agent Zero-owned directory', { target });
    }
    return target;
  }

  #dockerDesktopStoppedAssessment() {
    return {
      state: 'engine_stopped',
      mode: 'docker_desktop',
      detail: 'Docker Desktop is installed but not running. Start Docker Desktop, wait until it finishes starting, then return here.'
    };
  }

  #wslFeatureSetupAssessment(detail) {
    return {
      state: 'not_provisioned',
      mode: 'wsl_feature',
      detail,
      manualCommand: 'wsl.exe --install --no-distribution',
      manualUrl: WSL_INSTALL_URL,
      requiresAdmin: true,
      requiresRestart: true,
      setupActionLabel: 'Setup Agent Zero'
    };
  }

  async #binaryExists(binary) {
    const result = await this._runCommand('where.exe', [binary], { timeoutMs: 5000 }).catch(() => ({ code: 1 }));
    return result.code === 0;
  }

  async #isWindowsServer() {
    if (this._isWindowsServerOverride !== null) return this._isWindowsServerOverride;
    const result = await this.#powershell('(Get-CimInstance Win32_OperatingSystem).ProductType');
    const productType = Number(String(result.stdout || '').trim());
    return Number.isFinite(productType) && productType !== 1;
  }

  async #optionalFeatureState(name) {
    const safeName = String(name || '').replace(/'/g, "''");
    const script = `try { (Get-WindowsOptionalFeature -Online -FeatureName '${safeName}' -ErrorAction Stop).State } catch { 'Unknown' }`;
    const result = await this.#powershell(script);
    return String(result.stdout || '').trim() || 'Unknown';
  }

  async #wslList() {
    const result = await this._runCommand('wsl.exe', ['-l', '-v'], { timeoutMs: 15000 }).catch((error) => ({
      code: -1,
      stdout: '',
      stderr: error?.message || String(error)
    }));
    return cleanCommandText(`${result.stdout || ''}\n${result.stderr || ''}`);
  }

  async #wslDistros() {
    return this.#parseWslDistros(await this.#wslList());
  }

  #parseWslDistros(text) {
    const distros = [];
    for (const rawLine of String(text || '').split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || /^NAME\s+STATE\s+VERSION$/i.test(line)) continue;
      if (/^(default\s+(distribution|version)|distribuzione\s+predefinita|versione\s+predefinita)\s*:/i.test(line)) continue;
      const defaultDistro = line.startsWith('*');
      const parts = line.replace(/^\*\s*/, '').trim().split(/\s+/);
      if (parts.length < 3) continue;
      const version = Number(parts.pop());
      const state = parts.pop();
      const name = parts.join(' ');
      if (name && Number.isFinite(version)) distros.push({ name, state, version, default: defaultDistro });
    }
    return distros;
  }

  #findDistro(distros, name) {
    const wanted = String(name || '').toLowerCase();
    return (distros || []).find((distro) => String(distro.name || '').toLowerCase() === wanted) || null;
  }

  #wslListShowsUsableFeatures(text) {
    const value = String(text || '');
    if (/WSL_E_WSL_OPTIONAL_COMPONENT_REQUIRED/i.test(value)) return false;
    if (/WSL_E_DEFAULT_DISTRO_NOT_FOUND/i.test(value)) return true;
    if (/has no installed distributions|no installed distributions|non ha distribuzioni installate/i.test(value)) return true;
    return /^\s*\*?\s*NAME\s+STATE\s+VERSION\b/im.test(value);
  }

  async #wslRootCommandOk(distro, script) {
    const result = await this.#wslRootExec(distro, ['sh', '-c', script], { timeoutMs: 15000 }).catch(() => ({ code: 1 }));
    return result.code === 0;
  }

  async #installWslFeatures(options = {}) {
    options.onProgress?.('Requesting Windows approval');
    options.onProgress?.('Enabling WSL features');
    const script = [
      '$ErrorActionPreference = "Stop"',
      'wsl.exe --install --no-distribution',
      'if ($LASTEXITCODE -ne 0) { wsl.exe --install --no-distribution --web-download }',
      'if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }',
      'wsl.exe --set-default-version 2',
      'exit $LASTEXITCODE'
    ].join('\n');
    await this.#runElevatedPowerShell(script, {
      timeoutMs: options.timeoutMs || 20 * 60 * 1000,
      signal: options.signal
    });
    return {
      state: 'needs_followup',
      detail: 'Agent Zero Setup was started. Restart Windows if prompted, then return here to continue.'
    };
  }

  async #dockerDesktopPath() {
    const script = [
      '$paths = @(',
      '  (Join-Path $env:ProgramFiles "Docker\\Docker\\Docker Desktop.exe")',
      ')',
      'if (${env:ProgramFiles(x86)}) { $paths += (Join-Path ${env:ProgramFiles(x86)} "Docker\\Docker\\Docker Desktop.exe") }',
      'if ($env:LOCALAPPDATA) { $paths += (Join-Path $env:LOCALAPPDATA "Programs\\DockerDesktop\\Docker Desktop.exe") }',
      '$found = $paths | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1',
      'if ($found) { $found }'
    ].join('; ');
    const result = await this.#powershell(script).catch(() => ({ code: 1, stdout: '' }));
    return result.code === 0 ? String(result.stdout || '').trim() : '';
  }

  async #startDockerDesktop(options = {}) {
    const desktopPath = await this.#dockerDesktopPath();
    const command = desktopPath
      ? `Start-Process -LiteralPath '${desktopPath.replace(/'/g, "''")}'`
      : "Start-Process 'docker-desktop:'";
    await this.#powershell(command);
    options.onProgress?.('Waiting for Docker Desktop');
    if (!await this.#waitForDockerDesktopPipe(options.signal)) {
      throw makeError('RUNTIME_START_FAILED', 'Docker Desktop started, but Docker did not become reachable.');
    }
    return { endpoint: { kind: 'npipe', dockerHost: 'npipe:////./pipe/docker_engine' } };
  }

  async #waitForDockerDesktopPipe(signal, timeoutMs = 120000) {
    const net = await import('node:net');
    const pipePath = '\\\\.\\pipe\\docker_engine';
    const startedAt = Date.now();
    while (Date.now() - startedAt < timeoutMs) {
      if (signal?.aborted) throw makeError('ABORTED', 'Runtime start aborted');
      const ok = await new Promise((resolve) => {
        const socket = net.connect(pipePath);
        const finish = (value) => {
          try { socket.destroy(); } catch { /* ignore */ }
          resolve(value);
        };
        socket.setTimeout(1500);
        socket.once('connect', () => finish(true));
        socket.once('timeout', () => finish(false));
        socket.once('error', () => finish(false));
      });
      if (ok) return true;
      await sleep(1000);
    }
    return false;
  }

  async #runElevatedPowerShell(script, options = {}) {
    const encodedCommand = Buffer.from(String(script || ''), 'utf16le').toString('base64');
    const launcher = [
      '$ErrorActionPreference = "Stop"',
      `$argsList = @('-NoLogo', '-NoProfile', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', '${encodedCommand}')`,
      '$p = Start-Process -FilePath "powershell.exe" -ArgumentList $argsList -Verb RunAs -WindowStyle Hidden -Wait -PassThru',
      'if ($null -ne $p.ExitCode) { exit $p.ExitCode }'
    ].join('; ');
    const result = await this.#powershell(launcher, {
      timeoutMs: options.timeoutMs || 20 * 60 * 1000,
      signal: options.signal
    });
    if (result.code !== 0) {
      throw makeError('RUNTIME_PROVISION_FAILED', 'Windows WSL Setup did not complete.', {
        exitCode: result.code,
        stdout: cleanCommandText(result.stdout),
        stderr: cleanCommandText(result.stderr)
      });
    }
  }

  async #wslRootExec(distro, command, options = {}) {
    const selected = String(distro || '').trim();
    if (!selected) throw makeError('INVALID_ARGS', 'A WSL distro is required');
    return await this._runCommand('wsl.exe', ['-d', selected, '-u', 'root', '--exec', ...command], {
      timeoutMs: options.timeoutMs || 120000,
      signal: options.signal
    });
  }

  #manualDetails(assessment) {
    return {
      manualUrl: assessment?.manualUrl,
      manualCommand: assessment?.manualCommand,
      distro: assessment?.distro,
      diagnosticCode: assessment?.diagnosticCode
    };
  }

  async #powershell(script, options = {}) {
    return await this._runCommand(
      'powershell.exe',
      ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', script],
      { timeoutMs: options.timeoutMs || 15000, signal: options.signal }
    );
  }
}

export function validateWindowsWslRuntimeManifest(manifest, architecture) {
  const contract = WINDOWS_WSL_RUNTIME_CONTRACT;
  const expectedName = contract.assets[architecture];
  if (!expectedName) throw invalidManifest(`unsupported architecture ${architecture}`);
  assertExactKeys(manifest, ['schemaVersion', 'runtimeVersion', 'distro', 'release', 'base', 'createdAt', 'assets'], 'manifest');
  if (manifest.schemaVersion !== contract.schemaVersion || manifest.runtimeVersion !== contract.runtimeVersion) {
    throw invalidManifest('schema or runtime version does not match the Launcher contract');
  }

  assertExactKeys(manifest.distro, ['name', 'wslVersion', 'markerPath'], 'distro');
  if (manifest.distro.name !== contract.distroName || manifest.distro.wslVersion !== 2 || manifest.distro.markerPath !== contract.markerPath) {
    throw invalidManifest('distro contract does not match the Launcher contract');
  }
  assertExactKeys(manifest.release, ['repository', 'tag'], 'release');
  if (manifest.release.repository !== contract.repository || manifest.release.tag !== contract.releaseTag) {
    throw invalidManifest('release coordinates are not allowed');
  }
  assertExactKeys(manifest.base, ['distribution', 'version', 'codename'], 'base');
  if (manifest.base.distribution !== 'ubuntu' || manifest.base.version !== '24.04.4' || manifest.base.codename !== 'noble') {
    throw invalidManifest('base distribution does not match runtime v1');
  }
  if (typeof manifest.createdAt !== 'string' || manifest.createdAt.length > 64 || !Number.isFinite(Date.parse(manifest.createdAt))) {
    throw invalidManifest('createdAt is invalid');
  }

  assertExactKeys(manifest.assets, ['amd64', 'arm64'], 'assets');
  for (const [assetArchitecture, assetName] of Object.entries(contract.assets)) {
    const asset = manifest.assets[assetArchitecture];
    assertExactKeys(asset, ['name', 'url', 'sha256', 'sizeBytes', 'sbomName', 'packageVersions'], `assets.${assetArchitecture}`);
    const expectedUrl = `${RUNTIME_RELEASE_BASE_URL}/${assetName}`;
    if (asset.name !== assetName || asset.url !== expectedUrl) throw invalidManifest(`asset URL/name is invalid for ${assetArchitecture}`);
    if (!/^[a-f0-9]{64}$/.test(asset.sha256)) throw invalidManifest(`asset SHA-256 is invalid for ${assetArchitecture}`);
    if (!Number.isSafeInteger(asset.sizeBytes) || asset.sizeBytes < 1 || asset.sizeBytes > contract.maxCompressedSizeBytes) {
      throw invalidManifest(`asset size is invalid for ${assetArchitecture}`);
    }
    if (asset.sbomName !== `agent-zero-runtime-wsl-${assetArchitecture}.spdx.json`) {
      throw invalidManifest(`SBOM name is invalid for ${assetArchitecture}`);
    }
    assertPackageVersions(asset.packageVersions, assetArchitecture);
  }
  return manifest.assets[architecture];
}

export const WINDOWS_WSL_GUIDE_URL = WSL_GUIDE_URL;
export const WINDOWS_DOCKER_DESKTOP_URL = DOCKER_DESKTOP_URL;

function assertExactKeys(value, expected, label) {
  if (!isPlainObject(value)) throw invalidManifest(`${label} must be an object`);
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
    throw invalidManifest(`${label} has an unexpected shape`);
  }
}

function assertPackageVersions(value, architecture) {
  if (!isPlainObject(value) || Object.keys(value).length > 32) {
    throw invalidManifest(`package versions are invalid for ${architecture}`);
  }
  for (const name of REQUIRED_RUNTIME_PACKAGES) {
    if (typeof value[name] !== 'string' || !value[name] || value[name].length > 200) {
      throw invalidManifest(`required package ${name} is invalid for ${architecture}`);
    }
  }
}

function invalidManifest(message) {
  return makeError('RUNTIME_MANIFEST_INVALID', `Agent Zero runtime manifest is invalid: ${message}`);
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function cleanCommandText(value) {
  return String(value || '').replace(/\0/g, '');
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
