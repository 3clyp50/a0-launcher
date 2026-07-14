const assert = require('node:assert/strict');
const { test } = require('node:test');

const {
  hostAccessInstanceKey,
  normalizeHostFolder,
  normalizeHostAccessScopes,
  normalizeHostAccessSettings,
  resolveInstanceHostAccess
} = require('./host_access');

test('Host access defaults local Instances on with all scopes', () => {
  const settings = normalizeHostAccessSettings({});
  const local = resolveInstanceHostAccess(settings, { kind: 'local', id: 'abc123' });

  assert.equal(local.configured, true);
  assert.equal(local.masterEnabled, true);
  assert.deepEqual(local.scopes, {
    files: true,
    code_execution: true,
    browser: true,
    computer_use: true
  });
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

test('turning Files off also turns Code execution off', () => {
  assert.deepEqual(normalizeHostAccessScopes({
    files: false,
    code_execution: true,
    browser: true,
    computer_use: false
  }), {
    files: false,
    code_execution: false,
    browser: true,
    computer_use: false
  });
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
        scopes: { files: true, code_execution: false, browser: false, computer_use: true }
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
