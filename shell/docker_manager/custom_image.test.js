const assert = require('node:assert/strict');
const { test } = require('node:test');

const dockerManager = require('./index');

const {
  developerContainerName,
  defaultManagedInstanceName,
  activationImageSpec,
  normalizeActivationOptions,
  normalizeCustomImageOptions
} = dockerManager._test;

test('empty activation names get generated friendly defaults', () => {
  assert.equal(defaultManagedInstanceName(() => 0), 'brave-ada');
  assert.equal(normalizeActivationOptions({ instanceName: '' }, 'latest', () => 0).instanceName, 'brave-ada');
});

test('managed activation carries per-Instance Host access settings', () => {
  const options = normalizeActivationOptions({
    hostAccess: {
      configured: true,
      masterEnabled: false,
      folder: '/home/user/a0',
      scopes: { files: false, code_execution: true, browser: true, computer_use: false }
    }
  }, 'latest', () => 0);

  assert.equal(options.hostAccess.configured, true);
  assert.equal(options.hostAccess.masterEnabled, false);
  assert.equal(options.hostAccess.scopes.files, false);
  assert.equal(options.hostAccess.scopes.code_execution, false);
});

test('custom Agent Zero image tags accept shorthand release numbers', () => {
  const custom = normalizeCustomImageOptions({
    image: 'agent0ai/agent-zero',
    tag: '2.0',
    instanceName: 'agent-zero',
    pull: false
  });

  assert.equal(custom.tag, 'v2.0');
  assert.equal(custom.imageRef, 'agent0ai/agent-zero:v2.0');
});

test('custom non-Agent-Zero image tags stay literal', () => {
  const custom = normalizeCustomImageOptions({
    image: 'example/widget',
    tag: '2.0',
    pull: false
  });

  assert.equal(custom.tag, '2.0');
  assert.equal(custom.imageRef, 'example/widget:2.0');
});

test('activation retains the exact selected local image reference', () => {
  assert.deepEqual(activationImageSpec('latest', 'my-agent-zero:latest'), {
    imageRepo: 'my-agent-zero',
    tag: 'latest',
    imageRef: 'my-agent-zero:latest'
  });
  assert.equal(activationImageSpec('2.0', 'agent0ai/agent-zero:2.0').imageRef, 'agent0ai/agent-zero:2.0');
});

test('developer container name matches the requested Instance name', () => {
  assert.equal(developerContainerName('agent-zero'), 'agent-zero');
  assert.equal(developerContainerName('Agent Zero!'), 'Agent-Zero');
});
