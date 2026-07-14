import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const {
  bindScopeDependency,
  capabilityStatusLabel,
  computerUseNeedsArm,
  configForTarget,
  normalizeConfig,
  normalizeScopes
} = await import('./host-access-dialog.js');

test('scope dependency binding tolerates non-parsing test and fallback DOMs', () => {
  assert.doesNotThrow(() => bindScopeDependency(null));
});

test('local Host access inherits defaults while remote Host access stays off', () => {
  const state = {
    hostAccess: {
      defaults: {
        configured: true,
        masterEnabled: true,
        folder: '/home/user/agent-zero',
        scopes: { files: true, code_execution: true, browser: true, computer_use: true }
      },
      instances: {}
    }
  };

  assert.equal(configForTarget(state, { kind: 'local', containerId: 'abc' }).configured, true);
  assert.equal(configForTarget(state, { kind: 'remote', instanceId: 'vps' }).configured, false);
  assert.equal(configForTarget(state, { kind: 'remote', instanceId: 'vps' }).folder, '');
});

test('Files off disables Code execution in rendered configuration', () => {
  assert.deepEqual(normalizeScopes({
    files: false,
    code_execution: true,
    browser: false,
    computer_use: true
  }), {
    files: false,
    code_execution: false,
    browser: false,
    computer_use: true
  });
  assert.equal(normalizeConfig({}, {}, 'remote').configured, false);
});

test('Host capability statuses are human labels and arm only when actionable', () => {
  assert.equal(capabilityStatusLabel('ready', 'Unknown'), 'Ready');
  assert.equal(capabilityStatusLabel('persistent', 'Unknown'), 'Permission prompt');
  assert.equal(computerUseNeedsArm('persistent'), false);
  assert.equal(computerUseNeedsArm('rearm required'), true);
  assert.equal(computerUseNeedsArm('approval_required'), true);
  assert.equal(computerUseNeedsArm('unsupported'), false);
});

test('Host access UI states the tab lease and unsandboxed command boundary', async () => {
  const source = await readFile(new URL('./host-access-dialog.js', import.meta.url), 'utf8');
  assert.match(source, /closing or detaching the tab disconnects it/i);
  assert.match(source, /not sandboxed to/);
  assert.match(source, /A0 CLI Launcher gateway support required/);
  assert.doesNotMatch(source, /2\.5 or newer/);
  assert.match(source, /candidate\?\.browser_id \|\| candidate\?\.id/);
  assert.match(source, /candidate\?\.browser_label \|\| candidate\?\.label/);
});
