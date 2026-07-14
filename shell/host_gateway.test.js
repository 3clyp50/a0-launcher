const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { PassThrough, Writable } = require('node:stream');
const { test } = require('node:test');

const {
  HostGatewaySupervisor,
  coreCapabilitiesSupportLauncher,
  gatewayHelpSupportsLauncher,
  gatewayHostUrl,
  gatewayScopeArgument,
  launcherGatewayId,
  launcherUserAgent,
  sanitizeGatewayMetadata
} = require('./host_gateway');

function fakeChild() {
  const child = new EventEmitter();
  child.exitCode = null;
  child.stdout = new PassThrough();
  child.stderr = new PassThrough();
  child.input = '';
  child.stdin = new Writable({
    write(chunk, _encoding, callback) {
      child.input += String(chunk);
      callback();
    }
  });
  child.kill = (signal) => {
    child.killedWith = signal;
    return true;
  };
  return child;
}

function launch(overrides = {}) {
  return {
    cli: '/usr/bin/a0',
    host: 'https://agent.example.test',
    workspace: '/home/user/workspace',
    gatewayId: 'launcher-1',
    hostLabel: 'My computer',
    masterEnabled: true,
    scopes: { files: true, code_execution: true, browser: true, computer_use: false },
    env: { A0_USERNAME: 'jan', A0_PASSWORD: 'secret' },
    ...overrides
  };
}

test('gateway scope arguments enforce the Files and Code execution contract upstream', () => {
  assert.equal(gatewayScopeArgument({
    files: true,
    code_execution: true,
    browser: false,
    computer_use: true
  }), 'files,code_execution,computer_use');
  assert.equal(gatewayScopeArgument({ files: false, code_execution: true, browser: true }), 'browser');
});

test('CLI and Core capability gates require advertised gateway contracts', () => {
  assert.equal(gatewayHelpSupportsLauncher({
    status: 0,
    stdout: 'usage: a0 gateway --gateway-id ID --scopes LIST'
  }), true);
  assert.equal(gatewayHelpSupportsLauncher({ status: 0, stdout: 'usage: a0 headless' }), false);
  assert.equal(coreCapabilitiesSupportLauncher({ features: ['launcher_gateway'] }), true);
  assert.equal(coreCapabilitiesSupportLauncher({ features: ['chat_create'] }), false);
});

test('Launcher-owned WebContents receive one versioned user-agent marker', () => {
  assert.equal(launcherUserAgent('Chrome/140', '1.2'), 'Chrome/140 A0-Launcher/1.2');
  assert.equal(
    launcherUserAgent('Chrome/140 A0-Launcher/1.2', '1.3'),
    'Chrome/140 A0-Launcher/1.2'
  );
});

test('one Launcher installation keeps the same gateway identity across tabs', () => {
  assert.equal(launcherGatewayId('install-123'), 'launcher-install-123');
  assert.equal(launcherGatewayId('install-123'), launcherGatewayId('install-123'));
  assert.equal(launcherGatewayId('../unsafe'), '');
});

test('gateway host URLs preserve reverse-proxy base paths without URL credentials', () => {
  assert.equal(
    gatewayHostUrl('https://agent.example.test/a0/?view=chat#active'),
    'https://agent.example.test/a0'
  );
  assert.equal(gatewayHostUrl('https://user:secret@agent.example.test/a0'), '');
});

test('gateway metadata is bounded before it reaches renderer state', () => {
  const metadata = sanitizeGatewayMetadata({
    version: 1,
    kind: 'launcher',
    id: 'x'.repeat(300),
    state: 'connected',
    scopes: { files: false, code_execution: true, browser: true },
    status: { browser: { message: 'x'.repeat(4000) } }
  });
  assert.equal(metadata.id.length, 128);
  assert.equal(metadata.scopes.code_execution, false);
  assert.equal(metadata.status.browser.message.length, 2048);
});

test('one tab owns exactly one invisible gateway child and no credential arguments', () => {
  const spawned = [];
  const child = fakeChild();
  const supervisor = new HostGatewaySupervisor({
    spawn(command, args, options) {
      spawned.push({ command, args, options });
      return child;
    }
  });

  supervisor.start('tab-1', launch());
  supervisor.start('tab-1', launch());

  assert.equal(spawned.length, 1);
  assert.equal(spawned[0].options.detached, false);
  assert.equal(spawned[0].options.stdio.join(','), 'pipe,pipe,pipe');
  assert.equal(spawned[0].args.includes('secret'), false);
  assert.equal(spawned[0].args.includes('jan'), false);
  assert.equal(spawned[0].options.env.A0_PASSWORD, 'secret');
});

test('JSONL status is published and Core scope changes flow back to persistence', () => {
  const statuses = [];
  const configs = [];
  const child = fakeChild();
  const supervisor = new HostGatewaySupervisor({
    spawn: () => child,
    onStatus: (_tabId, status) => statuses.push(status),
    onConfig: (_tabId, gateway) => configs.push(gateway)
  });
  supervisor.start('tab-1', launch());

  child.stdout.write(`${JSON.stringify({
    type: 'status',
    gateway: {
      version: 1,
      kind: 'launcher',
      id: 'launcher-1',
      host_label: 'My computer',
      state: 'paused',
      master_enabled: false,
      scopes: { files: true, code_execution: false, browser: true, computer_use: false }
    }
  })}\n`);

  assert.equal(statuses.at(-1).state, 'paused');
  assert.equal(statuses.at(-1).hostLabel, 'My computer');
  assert.equal(configs.at(-1).master_enabled, false);

  child.stdout.write(`${JSON.stringify({
    type: 'result',
    request_id: '',
    ok: false,
    error: 'Close Chromium before preparing this profile.'
  })}\n`);
  assert.equal(statuses.at(-1).state, 'needs_action');
  assert.match(statuses.at(-1).message, /Close Chromium/);
});

test('gateway status must match the requested versioned Launcher identity', () => {
  const child = fakeChild();
  const supervisor = new HostGatewaySupervisor({ spawn: () => child });
  supervisor.start('tab-1', launch());

  child.stdout.write(`${JSON.stringify({
    type: 'status',
    gateway: {
      version: 1,
      kind: 'launcher',
      id: 'launcher-other',
      state: 'connected'
    }
  })}\n`);

  const status = supervisor.statusFor('tab-1');
  assert.equal(status.state, 'error');
  assert.equal(status.code, 'GATEWAY_CONTRACT_ERROR');
  assert.equal(child.killedWith, 'SIGTERM');
});

test('gateway stdout rejects non-object JSONL messages', () => {
  const child = fakeChild();
  const supervisor = new HostGatewaySupervisor({ spawn: () => child });
  supervisor.start('tab-1', launch());

  child.stdout.write('null\n');

  const status = supervisor.statusFor('tab-1');
  assert.equal(status.code, 'GATEWAY_CONTRACT_ERROR');
  assert.equal(child.killedWith, 'SIGTERM');
});

test('gateway startup is bounded until a valid status arrives', async () => {
  const child = fakeChild();
  const supervisor = new HostGatewaySupervisor({
    spawn: () => child,
    startupTimeoutMs: 5
  });
  supervisor.start('tab-1', launch());

  await new Promise((resolve) => setTimeout(resolve, 20));

  const status = supervisor.statusFor('tab-1');
  assert.equal(status.state, 'error');
  assert.equal(status.code, 'GATEWAY_START_TIMEOUT');
  assert.equal(child.killedWith, 'SIGTERM');
});

test('close sends shutdown and removes the lease without restarting it', () => {
  const child = fakeChild();
  let spawns = 0;
  const supervisor = new HostGatewaySupervisor({
    spawn: () => {
      spawns += 1;
      return child;
    }
  });
  supervisor.start('tab-1', launch());

  assert.equal(supervisor.stop('tab-1', 'tab_closed'), true);
  assert.match(child.input, /"action":"shutdown"/);
  assert.equal(supervisor.statusFor('tab-1').state, 'disconnected');
  assert.equal(spawns, 1);
});

test('contract failures remain actionable after the child exits', () => {
  const child = fakeChild();
  const statuses = [];
  const supervisor = new HostGatewaySupervisor({
    spawn: () => child,
    onStatus: (_key, status) => statuses.push(status)
  });
  supervisor.start('tab-1', launch());
  child.stdout.write(`${JSON.stringify({
    type: 'error',
    code: 'CONTRACT_MISMATCH',
    message: 'Agent Zero update required.',
    fatal: true
  })}\n`);
  child.exitCode = 2;
  child.emit('exit', 2, null);

  assert.equal(statuses.at(-1).state, 'needs_action');
  assert.equal(statuses.at(-1).code, 'CONTRACT_MISMATCH');
  assert.equal(statuses.at(-1).retryable, true);
});

test('Emergency disconnect suppresses the current lease until tab reopen', () => {
  const children = [fakeChild(), fakeChild()];
  let spawns = 0;
  const supervisor = new HostGatewaySupervisor({
    spawn: () => children[spawns++]
  });
  supervisor.start('tab-1', launch());
  children[0].stdout.write(`${JSON.stringify({
    type: 'status',
    gateway: {
      version: 1,
      kind: 'launcher',
      id: 'launcher-1',
      state: 'disconnected',
      host_label: 'My computer'
    }
  })}\n`);
  children[0].exitCode = 0;
  children[0].emit('exit', 0, null);

  assert.equal(supervisor.isSuppressed('tab-1'), true);
  assert.equal(supervisor.start('tab-1', launch()).suppressed, true);
  assert.equal(spawns, 1);
  assert.equal(supervisor.retry('tab-1').suppressed, true);
  assert.equal(spawns, 1);
  supervisor.stop('tab-1', 'tab_closed');
  assert.equal(supervisor.start('tab-1', launch()).state, 'connecting');
  assert.equal(spawns, 2);
});

test('application cleanup terminates and waits for every open tab lease', async () => {
  const children = [fakeChild(), fakeChild()];
  let index = 0;
  const supervisor = new HostGatewaySupervisor({ spawn: () => children[index++] });
  supervisor.start('tab-1', launch());
  supervisor.start('tab-2', launch({ gatewayId: 'launcher-2' }));

  assert.equal(supervisor.stopAll('app_quit'), 2);

  assert.match(children[0].input, /app_quit/);
  assert.match(children[1].input, /app_quit/);
  assert.equal(supervisor.pendingStopCount(), 2);
  children.forEach((child) => {
    child.exitCode = 0;
    child.emit('exit', 0, null);
  });
  await supervisor.waitForStopped(50);
  assert.equal(supervisor.pendingStopCount(), 0);
  assert.equal(supervisor.statusFor('tab-1').state, 'disconnected');
  assert.equal(supervisor.statusFor('tab-2').state, 'disconnected');
});
