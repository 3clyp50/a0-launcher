const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');

const {
  hostAccessInstanceKey,
  hostAccessMatchesGateway,
  normalizeHostFolder,
  normalizeHostAccessScopes,
  normalizeHostAccessSettings,
  resolveInstanceHostAccess
} = require('./host_access');

test('Host access defaults local Instances off with browser and Computer Use opt-in', () => {
  const settings = normalizeHostAccessSettings({});
  const local = resolveInstanceHostAccess(settings, { kind: 'local', id: 'abc123' });

  assert.equal(local.configured, false);
  assert.equal(local.masterEnabled, false);
  assert.deepEqual(local.scopes, {
    files: true,
    file_write: true,
    code_execution: true,
    browser: false,
    computer_use: false
  });
});

test('gateway startup is not gated by legacy onboarding state', () => {
  const source = fs.readFileSync(path.join(__dirname, 'main.js'), 'utf8');
  assert.doesNotMatch(source, /ONBOARDING_REQUIRED/);
  assert.doesNotMatch(source, /!settings\.onboardingComplete/);
});

test('saved remote Instances stay server-side until explicitly configured', () => {
  const settings = normalizeHostAccessSettings({
    onboardingComplete: true,
    defaults: { configured: true, folder: '/home/alessandro/agent-zero' }
  });
  const remote = resolveInstanceHostAccess(settings, { kind: 'remote', id: 'vps-1' });

  assert.equal(remote.configured, false);
  assert.equal(remote.folder, '');
  assert.equal(remote.folderSource, '');
});

test('file write and Code execution follow their permission dependencies', () => {
  assert.deepEqual(normalizeHostAccessScopes({
    files: true,
    file_write: false,
    code_execution: true,
    browser: true,
    computer_use: false
  }), {
    files: true,
    file_write: false,
    code_execution: false,
    browser: true,
    computer_use: false
  });
});

test('legacy Files preferences retain their former read/write meaning', () => {
  assert.equal(normalizeHostAccessScopes({ files: true }).file_write, true);
  assert.equal(normalizeHostAccessScopes({ files: false }).file_write, false);
});

test('host folders reject control-character separators', () => {
  assert.equal(normalizeHostFolder('/home/user\0/escape'), '');
  assert.equal(normalizeHostFolder('/home/user\n/escape'), '');
});

test('instance settings and bind-mounted workspace resolve deterministically', () => {
  const settings = normalizeHostAccessSettings({
    defaults: { folder: '/home/default' },
    instances: {
      'local:abc123': {
        configured: true,
        folder: '/home/saved',
        scopes: { files: true, file_write: true, code_execution: false, browser: false, computer_use: true }
      }
    }
  });
  const local = resolveInstanceHostAccess(settings, {
    kind: 'local',
    id: 'abc123',
    folder: '/home/instance/usr'
  });

  assert.equal(hostAccessInstanceKey('local', 'abc123'), 'local:abc123');
  assert.equal(local.folder, '/home/instance/usr');
  assert.equal(local.folderSource, 'instance_workspace');
  assert.equal(local.scopes.code_execution, false);
});

test('saved Instance choices win, then the current tab, then local defaults', () => {
  const settings = normalizeHostAccessSettings({
    defaults: {
      configured: false,
      scopes: { browser: false, computer_use: false }
    },
    instances: {
      'local:saved': {
        configured: true,
        scopes: { browser: true, computer_use: true }
      }
    }
  });
  const staleTab = {
    configured: false,
    scopes: { browser: false, computer_use: false }
  };
  const currentTab = {
    configured: true,
    scopes: { browser: true, computer_use: true }
  };

  assert.equal(resolveInstanceHostAccess(settings, { kind: 'local', id: 'saved' }, staleTab).configured, true);
  assert.equal(resolveInstanceHostAccess(settings, { kind: 'local', id: 'current' }, currentTab).configured, true);
  assert.equal(resolveInstanceHostAccess(settings, { kind: 'local', id: 'default' }).configured, false);
});

test('empty or stale gateway snapshots do not match saved permission switches', () => {
  const saved = {
    masterEnabled: true,
    scopes: {
      files: true,
      file_write: true,
      code_execution: true,
      browser: true,
      computer_use: true
    }
  };

  assert.equal(hostAccessMatchesGateway(saved, { master_enabled: true, scopes: {} }), false);
  assert.equal(hostAccessMatchesGateway(saved, {
    master_enabled: true,
    scopes: { ...saved.scopes }
  }), true);
});
