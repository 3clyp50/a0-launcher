const childProcess = require('node:child_process');

const GATEWAY_STATES = new Set([
  'connecting',
  'connected',
  'paused',
  'needs_action',
  'error',
  'disconnected'
]);
const MAX_GATEWAY_JSONL_LENGTH = 1024 * 1024;
const GATEWAY_STARTUP_TIMEOUT_MS = 30000;
const GATEWAY_REQUEST_TIMEOUT_MS = 30000;

function boundedGatewayValue(value, depth = 0) {
  if (typeof value === 'string') return value.slice(0, 2048);
  if (typeof value === 'boolean' || typeof value === 'number' || value === null) return value;
  if (depth >= 6) return null;
  if (Array.isArray(value)) {
    return value.slice(0, 64).map((item) => boundedGatewayValue(item, depth + 1));
  }
  if (!value || typeof value !== 'object') return String(value || '').slice(0, 2048);
  const result = {};
  for (const [rawKey, item] of Object.entries(value).slice(0, 64)) {
    const key = String(rawKey).slice(0, 80);
    if (['__proto__', 'constructor', 'prototype'].includes(key)) continue;
    result[key] = boundedGatewayValue(item, depth + 1);
  }
  return result;
}

function sanitizeGatewayMetadata(value = {}) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const state = GATEWAY_STATES.has(source.state) ? source.state : 'connected';
  const scopes = source.scopes && typeof source.scopes === 'object' ? source.scopes : {};
  const files = scopes.files === true;
  const fileWrite = files && (typeof scopes.file_write === 'boolean' ? scopes.file_write : files);
  return {
    version: Number(source.version) === 1 ? 1 : 0,
    kind: source.kind === 'launcher' ? 'launcher' : '',
    id: String(source.id || '').slice(0, 128),
    host_label: String(source.host_label || '').slice(0, 128),
    state,
    master_enabled: source.master_enabled !== false,
    features: Array.isArray(source.features)
      ? source.features.slice(0, 64).map((item) => String(item || '').slice(0, 128)).filter(Boolean)
      : [],
    scopes: {
      files,
      file_write: fileWrite,
      code_execution: fileWrite && scopes.code_execution === true,
      browser: scopes.browser === true,
      computer_use: scopes.computer_use === true
    },
    status: boundedGatewayValue(source.status && typeof source.status === 'object' ? source.status : {})
  };
}

function gatewayScopeArgument(scopes = {}) {
  const filesEnabled = scopes?.files === true;
  const fileWriteEnabled = filesEnabled && scopes?.file_write === true;
  return [
    ['files', 'file_read'],
    ['file_write', 'file_write'],
    ['code_execution', 'code_execution'],
    ['browser', 'browser'],
    ['computer_use', 'computer_use']
  ]
    .filter(([key]) => scopes?.[key] === true &&
      (key !== 'file_write' || filesEnabled) &&
      (key !== 'code_execution' || fileWriteEnabled))
    .map(([, argument]) => argument)
    .join(',');
}

function gatewayErrorState(code) {
  return [
    'AUTH_REQUIRED',
    'CONTRACT_MISMATCH',
    'INVALID_WORKSPACE',
    'PLUGIN_MISSING',
    'CLI_UPDATE_REQUIRED',
    'CORE_UPDATE_REQUIRED'
  ].includes(String(code || '').trim())
    ? 'needs_action'
    : 'error';
}

function gatewayHelpSupportsLauncher(result = {}) {
  const output = `${result.stdout || ''}\n${result.stderr || ''}`;
  return result.status === 0 && output.includes('--gateway-id') &&
    output.includes('--scopes') && output.includes('file_read') && output.includes('file_write');
}

function coreCapabilitiesSupportLauncher(value) {
  return Array.isArray(value?.features) &&
    value.features.includes('launcher_gateway') &&
    value.features.includes('launcher_gateway_file_write');
}

function launcherUserAgent(value, version) {
  const current = String(value || '').trim();
  if (current.includes('A0-Launcher/')) return current;
  const cleanVersion = String(version || '').trim().replace(/\s+/g, '') || '0';
  return `${current} A0-Launcher/${cleanVersion}`.trim();
}

function launcherGatewayId(value) {
  const installationId = String(value || '').trim();
  if (!/^[A-Za-z0-9._:-]+$/.test(installationId)) return '';
  return `launcher-${installationId}`.slice(0, 128);
}

function gatewayHostUrl(value) {
  try {
    const url = new URL(String(value || '').trim());
    if (!['http:', 'https:'].includes(url.protocol) || !url.hostname || url.username || url.password) return '';
    url.search = '';
    url.hash = '';
    url.pathname = url.pathname.replace(/\/+$/, '') || '/';
    return url.href.replace(/\/$/, '');
  } catch {
    return '';
  }
}

function publicGatewayStatus(value = {}) {
  const state = GATEWAY_STATES.has(value.state) ? value.state : 'disconnected';
  const out = {
    state,
    connected: state === 'connected' || state === 'paused' || state === 'needs_action',
    hostLabel: typeof value.hostLabel === 'string' ? value.hostLabel : '',
    message: typeof value.message === 'string' ? value.message : '',
    code: typeof value.code === 'string' ? value.code : '',
    retryable: value.retryable === true,
    suppressed: value.suppressed === true
  };
  if (state === 'disconnected') out.gateway = null;
  else if (value.gateway && typeof value.gateway === 'object') out.gateway = sanitizeGatewayMetadata(value.gateway);
  return out;
}

class HostGatewaySupervisor {
  constructor(options = {}) {
    this.spawn = options.spawn || childProcess.spawn;
    this.onStatus = typeof options.onStatus === 'function' ? options.onStatus : () => {};
    this.onConfig = typeof options.onConfig === 'function' ? options.onConfig : () => {};
    const startupTimeoutMs = Number(options.startupTimeoutMs);
    this.startupTimeoutMs = Number.isFinite(startupTimeoutMs)
      ? Math.max(1, startupTimeoutMs)
      : GATEWAY_STARTUP_TIMEOUT_MS;
    this.records = new Map();
    this.closingChildren = new Set();
    this.requestSequence = 0;
  }

  start(tabId, launch = {}, options = {}) {
    const id = String(tabId || '').trim();
    if (!id) throw new Error('tabId is required');
    const existing = this.records.get(id);
    if (existing?.child && existing.child.exitCode === null) return publicGatewayStatus(existing.status);
    if (existing?.suppressed && options.force !== true) return publicGatewayStatus(existing.status);

    const status = {
      state: 'connecting',
      connected: false,
      hostLabel: String(launch.hostLabel || ''),
      message: 'Connecting this computer…',
      code: '',
      retryable: false,
      suppressed: false
    };
    const record = {
      tabId: id,
      child: null,
      status,
      buffer: '',
      stderr: '',
      intentional: false,
      suppressed: false,
      removed: false,
      startupTimer: null,
      pendingRequests: new Map(),
      launch: { ...launch }
    };
    this.records.set(id, record);
    this._publish(record);

    const args = [
      'gateway',
      '--host', String(launch.host || ''),
      '--workspace', String(launch.workspace || ''),
      '--gateway-id', String(launch.gatewayId || ''),
      '--host-label', String(launch.hostLabel || ''),
      launch.masterEnabled === false ? '--no-master' : '--master',
      '--scopes', gatewayScopeArgument(launch.scopes)
    ];
    if (launch.browserSelection) {
      args.push('--browser-selection', String(launch.browserSelection));
    }

    let child;
    try {
      child = this.spawn(String(launch.cli || ''), args, {
        cwd: String(launch.workspace || ''),
        env: launch.env && typeof launch.env === 'object' ? launch.env : process.env,
        stdio: ['pipe', 'pipe', 'pipe'],
        windowsHide: true,
        detached: false
      });
    } catch (error) {
      this._fail(record, 'GATEWAY_START_FAILED', error?.message || 'Unable to start A0 gateway.');
      return publicGatewayStatus(record.status);
    }
    record.child = child;
    child.stdout?.setEncoding?.('utf8');
    child.stderr?.setEncoding?.('utf8');
    child.stdout?.on?.('data', (chunk) => this._readStdout(record, chunk));
    child.stderr?.on?.('data', (chunk) => {
      record.stderr = `${record.stderr}${String(chunk || '')}`.slice(-4000);
    });
    child.once?.('error', (error) => {
      this._clearStartupTimer(record);
      this._fail(record, 'GATEWAY_START_FAILED', error?.message || 'Unable to start A0 gateway.');
    });
    child.once?.('exit', (code, signal) => this._handleExit(record, code, signal));
    record.startupTimer = setTimeout(() => {
      this._terminateWithError(
        record,
        'GATEWAY_START_TIMEOUT',
        'A0 gateway did not publish a valid status before the startup deadline.'
      );
    }, this.startupTimeoutMs);
    record.startupTimer.unref?.();
    return publicGatewayStatus(record.status);
  }

  retry(tabId) {
    const record = this.records.get(String(tabId || '').trim());
    if (!record) return null;
    if (record.suppressed) return publicGatewayStatus(record.status);
    return this.start(record.tabId, record.launch, { force: true });
  }

  send(tabId, payload) {
    const record = this.records.get(String(tabId || '').trim());
    const child = record?.child;
    if (!child?.stdin || child.stdin.destroyed || child.exitCode !== null) return false;
    try {
      child.stdin.write(`${JSON.stringify(payload || {})}\n`);
      return true;
    } catch {
      return false;
    }
  }

  request(tabId, payload, options = {}) {
    const record = this.records.get(String(tabId || '').trim());
    const child = record?.child;
    if (!record || !child?.stdin || child.stdin.destroyed || child.exitCode !== null) {
      return Promise.reject(this._requestError('GATEWAY_NOT_RUNNING', 'Host gateway is not running.'));
    }
    const timeoutValue = Number(options.timeoutMs);
    const timeoutMs = Number.isFinite(timeoutValue)
      ? Math.max(1, Math.min(timeoutValue, 5 * 60 * 1000))
      : GATEWAY_REQUEST_TIMEOUT_MS;
    const requestId = `launcher-${++this.requestSequence}`;
    const command = payload && typeof payload === 'object' && !Array.isArray(payload)
      ? { ...payload, request_id: requestId }
      : { request_id: requestId };
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        record.pendingRequests.delete(requestId);
        reject(this._requestError(
          'GATEWAY_COMMAND_TIMEOUT',
          `Host gateway command timed out after ${Math.ceil(timeoutMs / 1000)} seconds.`
        ));
      }, timeoutMs);
      record.pendingRequests.set(requestId, { resolve, reject, timer });
      if (this.send(record.tabId, command)) return;
      clearTimeout(timer);
      record.pendingRequests.delete(requestId);
      reject(this._requestError('GATEWAY_NOT_RUNNING', 'Host gateway is not running.'));
    });
  }

  disconnect(tabId) {
    const id = String(tabId || '').trim();
    const record = this.records.get(id);
    if (!record) return false;
    record.suppressed = true;
    return this.stop(id, 'user_disconnect', { preserveSuppression: true });
  }

  stop(tabId, reason = 'closed', options = {}) {
    const id = String(tabId || '').trim();
    const record = this.records.get(id);
    if (!record) return false;
    const preserveSuppression = options.preserveSuppression === true && record.suppressed;
    record.intentional = true;
    record.removed = !preserveSuppression;
    this._clearStartupTimer(record);
    this._rejectPending(record, 'GATEWAY_STOPPED', 'Host gateway stopped before the command completed.');
    if (preserveSuppression) {
      record.status = {
        ...record.status,
        state: 'disconnected',
        connected: false,
        code: '',
        message: '',
        retryable: false,
        suppressed: true
      };
      this._publish(record);
    } else {
      this.records.delete(id);
    }
    const child = record.child;
    if (child && child.exitCode === null) {
      this.closingChildren.add(child);
      try {
        child.stdin?.write?.(`${JSON.stringify({ action: 'shutdown', reason })}\n`);
      } catch {
        // ignore
      }
      const terminate = setTimeout(() => {
        if (child.exitCode === null) {
          try { child.kill('SIGTERM'); } catch { /* ignore */ }
        }
      }, 500);
      terminate.unref?.();
      const force = setTimeout(() => {
        if (child.exitCode === null) {
          try { child.kill('SIGKILL'); } catch { /* ignore */ }
        }
      }, 8000);
      force.unref?.();
    }
    return true;
  }

  stopAll(reason = 'app_quit', options = {}) {
    const tabIds = [...this.records.keys()];
    for (const tabId of tabIds) this.stop(tabId, reason, options);
    return tabIds.length;
  }

  pendingStopCount() {
    return this.closingChildren.size;
  }

  async waitForStopped(timeoutMs = 8500) {
    const deadline = Date.now() + Math.max(0, Number(timeoutMs) || 0);
    while (this.closingChildren.size && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
  }

  statusFor(tabId) {
    const record = this.records.get(String(tabId || '').trim());
    return publicGatewayStatus(record?.status || {});
  }

  isSuppressed(tabId) {
    return this.records.get(String(tabId || '').trim())?.suppressed === true;
  }

  _readStdout(record, chunk) {
    record.buffer += String(chunk || '');
    if (record.buffer.length > MAX_GATEWAY_JSONL_LENGTH && !record.buffer.includes('\n')) {
      record.buffer = '';
      this._terminateWithError(record, 'GATEWAY_CONTRACT_ERROR', 'A0 gateway emitted an oversized JSONL message.');
      return;
    }
    while (record.buffer.includes('\n')) {
      const newline = record.buffer.indexOf('\n');
      const line = record.buffer.slice(0, newline).trim();
      record.buffer = record.buffer.slice(newline + 1);
      if (!line) continue;
      if (line.length > MAX_GATEWAY_JSONL_LENGTH) {
        this._terminateWithError(record, 'GATEWAY_CONTRACT_ERROR', 'A0 gateway emitted an oversized JSONL message.');
        return;
      }
      let event;
      try {
        event = JSON.parse(line);
      } catch {
        this._terminateWithError(record, 'GATEWAY_CONTRACT_ERROR', 'A0 gateway emitted invalid JSONL output.');
        return;
      }
      if (!event || typeof event !== 'object' || Array.isArray(event)) {
        this._terminateWithError(record, 'GATEWAY_CONTRACT_ERROR', 'A0 gateway emitted a non-object JSONL message.');
        return;
      }
      this._handleEvent(record, event);
    }
  }

  _handleEvent(record, event = {}) {
    if (record.removed) return;
    if (event.type === 'status' && event.gateway && typeof event.gateway === 'object') {
      const gateway = sanitizeGatewayMetadata(event.gateway);
      if (
        gateway.version !== 1 ||
        gateway.kind !== 'launcher' ||
        !gateway.id ||
        gateway.id !== String(record.launch.gatewayId || '')
      ) {
        this._terminateWithError(
          record,
          'GATEWAY_CONTRACT_ERROR',
          'A0 gateway status did not match the requested Launcher gateway identity.'
        );
        return;
      }
      this._clearStartupTimer(record);
      const state = gateway.state;
      if (state === 'disconnected') record.suppressed = true;
      record.status = {
        state,
        connected: state !== 'disconnected' && state !== 'error',
        hostLabel: String(gateway.host_label || record.launch.hostLabel || ''),
        message: '',
        code: '',
        retryable: false,
        suppressed: record.suppressed,
        gateway
      };
      this._publish(record);
      this.onConfig(record.tabId, gateway);
      return;
    }
    if (event.type === 'error') {
      const code = String(event.code || 'GATEWAY_ERROR');
      record.status = {
        ...record.status,
        state: gatewayErrorState(code),
        connected: false,
        code,
        message: String(event.message || 'Host gateway failed.'),
        retryable: event.fatal === true,
        suppressed: record.suppressed
      };
      this._publish(record);
      return;
    }
    if (event.type === 'result' && event.ok === false) {
      this._settleRequest(record, event);
      record.status = {
        ...record.status,
        state: 'needs_action',
        code: String(event.code || 'GATEWAY_COMMAND_FAILED').slice(0, 128),
        message: String(event.error || 'Host access needs attention.').slice(0, 2048),
        retryable: false
      };
      this._publish(record);
      return;
    }
    if (event.type === 'result') {
      this._settleRequest(record, event);
      return;
    }
    if (event.type === 'stage') {
      const stage = String(event.stage || '');
      record.status = {
        ...record.status,
        state: 'connecting',
        message: String(event.message || ''),
        connected: false
      };
      this._publish(record);
    }
  }

  _handleExit(record, code, signal) {
    this._clearStartupTimer(record);
    if (record.child) this.closingChildren.delete(record.child);
    record.child = null;
    this._rejectPending(record, 'GATEWAY_EXITED', 'Host gateway exited before the command completed.');
    if (record.removed) return;
    const expected = record.intentional || record.suppressed;
    const preserveFailure = !expected &&
      ['error', 'needs_action'].includes(record.status.state) &&
      Boolean(record.status.code);
    record.status = {
      ...record.status,
      state: expected ? 'disconnected' : preserveFailure ? record.status.state : 'error',
      connected: false,
      code: expected ? '' : preserveFailure ? record.status.code : 'GATEWAY_EXITED',
      message: expected
        ? ''
        : (record.status.message || record.stderr.trim() || `A0 gateway exited (${code ?? signal ?? 'unknown'}).`),
      retryable: !expected,
      suppressed: record.suppressed
    };
    this._publish(record);
  }

  _fail(record, code, message) {
    record.status = {
      ...record.status,
      state: gatewayErrorState(code),
      connected: false,
      code,
      message,
      retryable: true
    };
    this._publish(record);
  }

  _terminateWithError(record, code, message) {
    if (record.removed) return;
    this._clearStartupTimer(record);
    this._rejectPending(record, code, message);
    this._fail(record, code, message);
    try { record.child?.kill?.('SIGTERM'); } catch { /* ignore */ }
  }

  _clearStartupTimer(record) {
    if (!record.startupTimer) return;
    clearTimeout(record.startupTimer);
    record.startupTimer = null;
  }

  _settleRequest(record, event) {
    const requestId = String(event?.request_id || '').trim();
    const pending = requestId ? record.pendingRequests.get(requestId) : null;
    if (!pending) return false;
    record.pendingRequests.delete(requestId);
    clearTimeout(pending.timer);
    if (event.ok === true) {
      pending.resolve(boundedGatewayValue(event.result));
    } else {
      pending.reject(this._requestError(
        String(event.code || 'GATEWAY_COMMAND_FAILED'),
        String(event.error || 'Host access command failed.'),
        event.result
      ));
    }
    return true;
  }

  _rejectPending(record, code, message) {
    for (const pending of record?.pendingRequests?.values?.() || []) {
      clearTimeout(pending.timer);
      pending.reject(this._requestError(code, message));
    }
    record?.pendingRequests?.clear?.();
  }

  _requestError(code, message, result) {
    const error = new Error(String(message || code || 'Host gateway command failed.'));
    error.code = String(code || 'GATEWAY_COMMAND_FAILED');
    if (result !== undefined) error.result = boundedGatewayValue(result);
    return error;
  }

  _publish(record) {
    if (!record.removed) this.onStatus(record.tabId, publicGatewayStatus(record.status));
  }
}

module.exports = {
  GATEWAY_STATES,
  GATEWAY_REQUEST_TIMEOUT_MS,
  coreCapabilitiesSupportLauncher,
  gatewayScopeArgument,
  gatewayErrorState,
  gatewayHelpSupportsLauncher,
  gatewayHostUrl,
  launcherGatewayId,
  launcherUserAgent,
  publicGatewayStatus,
  sanitizeGatewayMetadata,
  HostGatewaySupervisor
};
