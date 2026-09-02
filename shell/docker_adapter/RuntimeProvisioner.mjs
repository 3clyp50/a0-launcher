/**
 * Runtime provisioning base for launcher-managed Docker setup.
 *
 * This adapter layer owns runtime mechanics only. Product flow, operation ids,
 * acknowledgements, and renderer-facing language stay in docker_manager.
 */

import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';

/**
 * @typedef {Object} AssessResult
 * @property {"ready"|"engine_stopped"|"needs_relogin"|"needs_group_membership"|"not_provisioned"|"manual_install"|"unsupported"} state
 * @property {string} detail
 * @property {string=} packageManager
 * @property {string[]=} manualPackages
 * @property {string=} manualCommand
 * @property {string=} manualUrl
 * @property {string=} mode
 * @property {string=} distro
 * @property {boolean=} requiresAdmin
 * @property {boolean=} requiresRestart
 * @property {string=} setupActionLabel
 */

export class RuntimeProvisioner {
  /**
   * @param {Object} options
   * @param {string} options.managedDir Writable app-owned runtime directory.
   */
  constructor(options = {}) {
    if (!options.managedDir) throw makeError('INVALID_ARGS', 'managedDir is required');
    this.managedDir = options.managedDir;
  }

  /**
   * @param {{managedDir: string, platform?: NodeJS.Platform}} options
   * @returns {Promise<RuntimeProvisioner|null>}
   */
  static async forPlatform(options) {
    const platform = options?.platform || process.platform;
    if (platform === 'darwin') {
      const { ColimaRuntime } = await import('./impl/ColimaRuntime.mjs');
      return new ColimaRuntime(options);
    }
    if (platform === 'win32') {
      const { WindowsWslRuntime } = await import('./impl/WindowsWslRuntime.mjs');
      return new WindowsWslRuntime(options);
    }
    if (platform !== 'linux') return null;
    const { LinuxEngineRuntime } = await import('./impl/LinuxEngineRuntime.mjs');
    return new LinuxEngineRuntime(options);
  }

  /** @returns {Promise<AssessResult>} */
  async assess() { throw makeError('NOT_IMPLEMENTED', 'assess is abstract'); }

  /** @returns {Promise<AssessResult|null>} */
  async assessDockerDesktop() { return null; }

  async provision(_options = {}) { throw makeError('NOT_IMPLEMENTED', 'provision is abstract'); }

  async start(_options = {}) { throw makeError('NOT_IMPLEMENTED', 'start is abstract'); }

  async status() { throw makeError('NOT_IMPLEMENTED', 'status is abstract'); }

  endpoint() { throw makeError('NOT_IMPLEMENTED', 'endpoint is abstract'); }
}

export function makeError(code, message, details) {
  const err = new Error(message);
  err.code = code;
  if (details) err.details = details;
  return err;
}

/**
 * @param {string} cmd
 * @param {string[]} args
 * @param {Object=} options
 * @param {number=} options.timeoutMs
 * @param {AbortSignal=} options.signal
 * @param {(line: string) => void=} options.onLine
 * @param {Object=} options.env
 * @returns {Promise<{code: number, stdout: string, stderr: string}>}
 */
export function run(cmd, args, options = {}) {
  const timeoutMs = Number.isFinite(Number(options.timeoutMs)) ? Math.max(100, Number(options.timeoutMs)) : 120000;

  return new Promise((resolve, reject) => {
    let child;
    try {
      child = spawn(cmd, args, { env: options.env || process.env, windowsHide: true });
    } catch (error) {
      reject(makeError('SPAWN_FAILED', `Failed to run ${cmd}`, { message: error?.message || String(error) }));
      return;
    }

    const stdout = [];
    const stderr = [];
    let lineRest = '';
    let settled = false;

    const settle = (fn, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (options.signal && abortListener) {
        try {
          options.signal.removeEventListener('abort', abortListener);
        } catch {
          // ignore
        }
      }
      fn(value);
    };

    const feedLines = (chunk) => {
      if (typeof options.onLine !== 'function') return;
      const parts = (lineRest + chunk.toString('utf8')).split(/\r?\n/);
      lineRest = parts.pop() || '';
      for (const line of parts) {
        const clean = line.trim();
        if (clean) options.onLine(clean);
      }
    };

    child.stdout.on('data', (chunk) => {
      stdout.push(chunk);
      feedLines(chunk);
    });
    child.stderr.on('data', (chunk) => {
      stderr.push(chunk);
      feedLines(chunk);
    });

    const timer = setTimeout(() => {
      try {
        child.kill('SIGTERM');
      } catch {
        // ignore
      }
      settle(reject, makeError('TIMEOUT', `${cmd} timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    const abortListener = () => {
      try {
        child.kill('SIGTERM');
      } catch {
        // ignore
      }
      settle(reject, makeError('ABORTED', `${cmd} aborted`));
    };

    if (options.signal) {
      if (options.signal.aborted) {
        abortListener();
        return;
      }
      options.signal.addEventListener('abort', abortListener, { once: true });
    }

    child.on('error', (error) => {
      settle(reject, makeError('SPAWN_FAILED', error?.message || String(error), { code: error?.code }));
    });

    child.on('close', (code) => {
      settle(resolve, {
        code: code ?? -1,
        stdout: Buffer.concat(stdout).toString('utf8'),
        stderr: Buffer.concat(stderr).toString('utf8')
      });
    });
  });
}

export async function pathExists(filePath) {
  try {
    await fsp.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function acquireRuntimeSetupLock(lockPath, product = 'a0-launcher') {
  const target = path.resolve(String(lockPath || ''));
  if (!lockPath || target === path.parse(target).root) {
    throw makeError('INVALID_RUNTIME_PATH', 'Runtime setup lock path is invalid');
  }
  await fsp.mkdir(path.dirname(target), { recursive: true });

  for (let attempt = 0; attempt < 2; attempt += 1) {
    let handle;
    try {
      handle = await fsp.open(target, 'wx', 0o600);
    } catch (error) {
      if (error?.code === 'EEXIST' && attempt === 0 && await removeStaleRuntimeSetupLock(target)) continue;
      throw makeError('RUNTIME_SETUP_BUSY', 'Another Agent Zero local runtime setup is already in progress. Retry after it finishes.');
    }

    try {
      await handle.writeFile(JSON.stringify({
        schemaVersion: 1,
        processId: process.pid,
        product,
        createdAt: new Date().toISOString()
      }));
    } catch (error) {
      await handle.close().catch(() => {});
      await fsp.rm(target, { force: true }).catch(() => {});
      throw error;
    }

    let released = false;
    return {
      path: target,
      async release() {
        if (released) return;
        released = true;
        await handle.close().catch(() => {});
        await fsp.rm(target, { force: true }).catch(() => {});
      }
    };
  }
  throw makeError('RUNTIME_SETUP_BUSY', 'Another Agent Zero local runtime setup is already in progress. Retry after it finishes.');
}

async function removeStaleRuntimeSetupLock(lockPath) {
  try {
    const stats = await fsp.stat(lockPath);
    if (Date.now() - stats.mtimeMs < 5 * 60_000) return false;
    const text = await fsp.readFile(lockPath, 'utf8');
    let record = null;
    try { record = JSON.parse(text); } catch { /* stale invalid owner record */ }
    const pid = Number(record?.processId);
    if (Number.isSafeInteger(pid) && pid > 0 && processIsRunning(pid)) return false;
    await fsp.rm(lockPath, { force: true });
    return true;
  } catch {
    return false;
  }
}

function processIsRunning(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error?.code !== 'ESRCH';
  }
}

export async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    signal: options.signal,
    headers: {
      'Accept': 'application/vnd.github+json, application/json',
      'User-Agent': 'A0-Launcher'
    }
  });
  if (!response.ok) {
    throw makeError('DOWNLOAD_FAILED', `Request failed: ${response.status} ${response.statusText}`, { url });
  }
  assertAllowedResponseUrl(response, url, options.allowedHosts);
  const maxBytes = Number.isSafeInteger(options.maxBytes) && options.maxBytes > 0 ? options.maxBytes : 0;
  const contentLength = Number(response.headers.get('content-length')) || 0;
  if (maxBytes && contentLength > maxBytes) {
    throw makeError('DOWNLOAD_TOO_LARGE', 'JSON response exceeds the allowed size', { url, maxBytes, contentLength });
  }
  let text;
  if (maxBytes && response.body && typeof response.body.getReader === 'function') {
    const reader = response.body.getReader();
    const chunks = [];
    let receivedBytes = 0;
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = Buffer.from(value);
        receivedBytes += chunk.length;
        if (receivedBytes > maxBytes) {
          await reader.cancel().catch(() => {});
          throw makeError('DOWNLOAD_TOO_LARGE', 'JSON response exceeds the allowed size', { url, maxBytes, receivedBytes });
        }
        chunks.push(chunk);
      }
    } finally {
      reader.releaseLock();
    }
    text = Buffer.concat(chunks, receivedBytes).toString('utf8');
  } else {
    text = await response.text();
    const receivedBytes = Buffer.byteLength(text, 'utf8');
    if (maxBytes && receivedBytes > maxBytes) {
      throw makeError('DOWNLOAD_TOO_LARGE', 'JSON response exceeds the allowed size', { url, maxBytes, receivedBytes });
    }
  }
  try {
    return JSON.parse(text);
  } catch (error) {
    throw makeError('INVALID_JSON', 'Response is not valid JSON', { url, message: error?.message || String(error) });
  }
}

export async function fetchText(url, options = {}) {
  const response = await fetch(url, {
    signal: options.signal,
    headers: {
      'Accept': 'text/plain, */*',
      'User-Agent': 'A0-Launcher'
    }
  });
  if (!response.ok) {
    throw makeError('DOWNLOAD_FAILED', `Request failed: ${response.status} ${response.statusText}`, { url });
  }
  return await response.text();
}

export async function downloadVerified(url, destPath, sha256 = '', options = {}) {
  const response = await fetch(url, {
    signal: options.signal,
    redirect: 'follow',
    headers: {
      'Accept': 'application/octet-stream',
      'User-Agent': 'A0-Launcher'
    }
  });
  if (!response.ok) {
    throw makeError('DOWNLOAD_FAILED', `Download failed: ${response.status} ${response.statusText}`, { url });
  }
  assertAllowedResponseUrl(response, url, options.allowedHosts);

  const maxBytes = Number.isSafeInteger(options.maxBytes) && options.maxBytes > 0 ? options.maxBytes : 0;
  const expectedSize = Number.isSafeInteger(options.expectedSize) && options.expectedSize > 0 ? options.expectedSize : 0;
  const contentLength = Number(response.headers.get('content-length')) || 0;
  if ((maxBytes && contentLength > maxBytes) || (expectedSize && contentLength && contentLength !== expectedSize)) {
    throw makeError('DOWNLOAD_SIZE_MISMATCH', 'Downloaded component has an unexpected size', {
      url,
      expectedSize: expectedSize || undefined,
      maxBytes: maxBytes || undefined,
      contentLength
    });
  }

  await fsp.mkdir(path.dirname(destPath), { recursive: true });
  const tempPath = `${destPath}.tmp-${process.pid}-${Date.now()}`;
  const hash = crypto.createHash('sha256');
  let file = null;
  let received = 0;
  let lastProgress = -1;

  try {
    if (!response.body || typeof response.body.getReader !== 'function') {
      const buffer = Buffer.from(await response.arrayBuffer());
      received = buffer.length;
      if (maxBytes && received > maxBytes) {
        throw makeError('DOWNLOAD_TOO_LARGE', 'Downloaded component exceeds the allowed size', { url, maxBytes, receivedBytes: received });
      }
      hash.update(buffer);
      await fsp.writeFile(tempPath, buffer);
    } else {
      file = fs.createWriteStream(tempPath, { mode: 0o644 });
      const reader = response.body.getReader();
      const total = Number(response.headers.get('content-length')) || 0;

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = Buffer.from(value);
        hash.update(chunk);
        received += chunk.length;
        if (maxBytes && received > maxBytes) {
          throw makeError('DOWNLOAD_TOO_LARGE', 'Downloaded component exceeds the allowed size', { url, maxBytes, receivedBytes: received });
        }
        if (total && typeof options.onProgress === 'function') {
          const progress = Math.max(0, Math.min(100, Math.round((received / total) * 100)));
          if (progress !== lastProgress) {
            lastProgress = progress;
            options.onProgress(null, progress);
          }
        }
        await new Promise((resolve, reject) => file.write(chunk, (error) => (error ? reject(error) : resolve())));
      }

      await new Promise((resolve, reject) => file.end((error) => (error ? reject(error) : resolve())));
      if (!file.closed) await new Promise((resolve) => file.once('close', resolve));
    }

    if (expectedSize && received !== expectedSize) {
      throw makeError('DOWNLOAD_SIZE_MISMATCH', 'Downloaded component has an unexpected size', {
        url,
        expectedSize,
        receivedBytes: received
      });
    }

    const actual = hash.digest('hex');
    const expected = String(sha256 || '').trim().toLowerCase();
    if (expected && actual.toLowerCase() !== expected) {
      throw makeError('CHECKSUM_MISMATCH', 'Downloaded component failed verification', { url, expected, actual });
    }

    await fsp.rename(tempPath, destPath);
  } catch (error) {
    if (file && !file.closed) {
      const closed = new Promise((resolve) => file.once('close', resolve));
      file.destroy();
      await closed;
    }
    await fsp.rm(tempPath, { force: true }).catch(() => {});
    throw error;
  }
}

function assertAllowedResponseUrl(response, requestedUrl, allowedHosts) {
  if (!Array.isArray(allowedHosts) || allowedHosts.length === 0) return;
  let finalUrl;
  try {
    finalUrl = new URL(response?.url || requestedUrl);
  } catch {
    throw makeError('DOWNLOAD_UNTRUSTED_REDIRECT', 'Download resolved to an invalid URL', { url: response?.url || requestedUrl });
  }
  const hosts = allowedHosts.map((value) => String(value || '').toLowerCase());
  if (finalUrl.protocol !== 'https:' || !hosts.includes(finalUrl.hostname.toLowerCase())) {
    throw makeError('DOWNLOAD_UNTRUSTED_REDIRECT', 'Download redirected to an untrusted host', { url: finalUrl.href });
  }
}

export function sha256FromSumText(text, assetName) {
  const wanted = String(assetName || '').trim();
  if (!wanted) return '';
  for (const line of String(text || '').split(/\r?\n/)) {
    const match = /^\s*([a-fA-F0-9]{64})\s+[* ]?(.+?)\s*$/.exec(line);
    if (!match) continue;
    const name = path.basename(match[2].trim());
    if (name === wanted) return match[1].toLowerCase();
  }
  return '';
}
