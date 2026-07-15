import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const {
  bindScopeDependency,
  capabilityStatusLabel,
  computerUseNeedsArm,
  configForTarget,
  normalizeConfig,
  normalizeScopes,
  scopeFieldsHtml
} = await import('./host-access-dialog.js');

test('scope dependency binding tolerates non-parsing test and fallback DOMs', () => {
  assert.doesNotThrow(() => bindScopeDependency(null));
});

test('scope binding keeps the permission summary current', () => {
  const controls = Object.fromEntries(Object.entries({
    files: true,
    file_write: true,
    code_execution: true,
    browser: false,
    computer_use: false
  }).map(([key, checked]) => [key, {
    checked,
    addEventListener(_type, listener) { this.change = listener; }
  }]));
  const summary = {};
  const root = {
    querySelector(selector) {
      if (selector === '[data-host-scope-summary]') return summary;
      return controls[selector.match(/data-host-scope="([^"]+)"/)?.[1]] || null;
    },
    querySelectorAll(selector) {
      const fields = Object.values(controls);
      return selector.endsWith(':checked') ? fields.filter((field) => field.checked) : fields;
    }
  };

  bindScopeDependency(root);
  controls.browser.checked = true;
  controls.browser.change();
  assert.equal(summary.textContent, 'Browser on · Computer Use off');
});

test('local Host access inherits defaults while remote Host access stays off with a folder prefill', () => {
  const state = {
    hostAccess: {
      defaults: {
        configured: true,
        masterEnabled: true,
        folder: '/home/user/agent-zero',
        scopes: { files: true, file_write: true, code_execution: true, browser: true, computer_use: true }
      },
      instances: {}
    }
  };

  assert.equal(configForTarget(state, { kind: 'local', containerId: 'abc' }).configured, true);
  assert.equal(configForTarget(state, { kind: 'remote', instanceId: 'vps' }).configured, false);
  assert.equal(configForTarget(state, { kind: 'remote', instanceId: 'vps' }).folder, '/home/user/agent-zero');
});

test('File write controls Code execution without hiding file reads', () => {
  assert.deepEqual(normalizeScopes({
    files: true,
    file_write: false,
    code_execution: true,
    browser: false,
    computer_use: true
  }), {
    files: true,
    file_write: false,
    code_execution: false,
    browser: false,
    computer_use: true
  });
  assert.equal(normalizeConfig({}, {}, 'remote').configured, false);
});

test('Host permissions use one collapsed native disclosure', () => {
  const html = scopeFieldsHtml('host', {
    files: true,
    file_write: true,
    code_execution: true,
    browser: false,
    computer_use: false
  });
  assert.match(html, /<details class="dm-advanced dm-host-access-permissions">/);
  assert.match(html, /<summary>Host permissions <span data-host-scope-summary>Browser off · Computer Use off<\/span><\/summary>/);
  assert.doesNotMatch(html, /<details[^>]* open/);
});

test('Host capability statuses are human labels and arm only when actionable', () => {
  assert.equal(capabilityStatusLabel('ready', 'Unknown'), 'Ready');
  assert.equal(capabilityStatusLabel('persistent', 'Unknown'), 'Ready');
  assert.equal(computerUseNeedsArm('persistent'), false);
  assert.equal(computerUseNeedsArm('rearm required'), true);
  assert.equal(computerUseNeedsArm('approval_required'), true);
  assert.equal(computerUseNeedsArm('unsupported'), false);
});

test('Host access UI uses five friendly permissions and explains the command boundary', async () => {
  const source = await readFile(new URL('./host-access-dialog.js', import.meta.url), 'utf8');
  assert.match(source, /current Instance tab is open in the Launcher/i);
  assert.match(source, /close or detach that tab, and access stops/i);
  assert.match(source, /Files read/);
  assert.match(source, /Files write/);
  assert.match(source, /Use my Browser/);
  assert.match(source, /commands can also reach other files/i);
  assert.match(source, /Update A0 CLI to use Host access/);
  assert.doesNotMatch(source, /2\.5 or newer/);
  assert.doesNotMatch(source, /Personal browser/);
  assert.match(source, /candidate\?\.browser_id \|\| candidate\?\.id/);
  assert.match(source, /candidate\?\.browser_label \|\| candidate\?\.label/);
});
