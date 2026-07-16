import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const {
  bindHostAccessState,
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
  const configured = {
    checked: false,
    addEventListener(_type, listener) { this.change = listener; }
  };
  const scopes = {};
  const root = {
    querySelector(selector) {
      if (selector === '[data-host-scope-summary]') return summary;
      if (selector === '#hostAccessConfigured') return configured;
      if (selector === '.dm-host-access-scopes') return scopes;
      return controls[selector.match(/data-host-scope="([^"]+)"/)?.[1]] || null;
    },
    querySelectorAll(selector) {
      if (selector === '[data-host-config-control]') return [];
      const fields = Object.values(controls);
      return selector.endsWith(':checked') ? fields.filter((field) => field.checked) : fields;
    }
  };

  bindScopeDependency(root);
  controls.browser.checked = true;
  controls.browser.change();
  assert.equal(summary.textContent, 'On: Read, Write, Code, Browser · Off: Computer Use');

  bindHostAccessState(root, { configuredSelector: '#hostAccessConfigured' });
  assert.equal(scopes.disabled, true);
  assert.equal(summary.textContent, 'Host access off');
  configured.checked = true;
  configured.change();
  assert.equal(summary.textContent, 'On: Read, Write, Code, Browser · Off: Computer Use');
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
  assert.equal(normalizeConfig({}, {}, 'local').configured, false);
  assert.equal(normalizeConfig({}, {}, 'local').masterEnabled, false);
  assert.equal(normalizeConfig({}, {}, 'remote').configured, false);
});

test('Host permissions use one collapsed native disclosure', () => {
  const html = scopeFieldsHtml('host', {
    files: true,
    file_write: true,
    code_execution: true,
    browser: false,
    computer_use: false
  }, { detailsContent: '<div data-folder>Folder</div>' });
  assert.match(html, /<details class="dm-advanced dm-host-access-permissions">/);
  assert.match(html, /<summary>Host permissions <span data-host-scope-summary>On: Read, Write, Code · Off: Browser, Computer Use<\/span><\/summary>/);
  assert.match(html, /<fieldset[\s\S]*<div data-folder>Folder<\/div>\s*<\/details>/);
  assert.equal(html.match(/dm-host-access-toggler/g)?.length, 5);
  assert.doesNotMatch(html, /<details[^>]* open/);
});

test('Host access onboarding starts off and keeps permission switches visible', async () => {
  const html = scopeFieldsHtml('host', {
    files: true,
    file_write: true,
    code_execution: true,
    browser: false,
    computer_use: false
  }, { onboarding: true });
  assert.match(html, /dm-host-access-permissions-static/);
  assert.match(html, /dm-host-access-switch/);
  assert.doesNotMatch(html, /<details/);
  const source = await readFile(new URL('./host-access-dialog.js', import.meta.url), 'utf8');
  assert.match(source, /hostAccessDefaultConfigured/);
  assert.match(source, /"You can change this for each Instance\.",\s+false/);
  assert.match(source, />Save defaults<\/button>/);
});

test('Advanced Host access details start collapsed with a short summary', async () => {
  const source = await readFile(new URL('./host-access-dialog.js', import.meta.url), 'utf8');
  assert.match(source, /<details class="dm-advanced dm-host-access-advanced">/);
  assert.match(source, /<summary>Advanced settings <span>Browser and connection details<\/span><\/summary>/);
  assert.match(source, /dm-host-access-advanced[\s\S]*Browser to use[\s\S]*dm-host-access-diagnostics/);
  assert.doesNotMatch(source, /<details[^>]*dm-host-access-advanced[^>]* open/);
});

test('Host access uses one switch for connection and permission state', async () => {
  const source = await readFile(new URL('./host-access-dialog.js', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /hostAccessMaster|Host access active/);
  assert.match(source, /configured: enabled,\s+masterEnabled: enabled/);
});

test('Host access settings can open from a saved Instance without a live tab', async () => {
  const source = await readFile(new URL('./host-access-dialog.js', import.meta.url), 'utf8');
  assert.match(source, /if \(!instanceKey\(tab\)\) return false/);
  assert.doesNotMatch(source, /if \(!tab\?\.id\) return false/);
  assert.match(source, /disconnectedWithoutTab && configured \? "Ready to connect"/);
  assert.match(source, /Open this Instance in a Launcher tab to connect\./);
  assert.match(source, /enabled \? "Ready to connect" : "Disconnected"/);
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
  assert.match(source, /current Instance is open with the Launcher/i);
  assert.match(source, /either in a tab or detached window/i);
  assert.match(source, /close that tab or window, and access stops/i);
  assert.doesNotMatch(source, /Access stays on when you detach/i);
  assert.match(source, /Files read/);
  assert.match(source, /Files write/);
  assert.match(source, /Use my Browser/);
  assert.match(source, /Commands start here but can reach other folders/i);
  assert.match(source, /Folder for files and commands/);
  assert.match(source, /Update A0 CLI to use Host access/);
  assert.doesNotMatch(source, /2\.5 or newer/);
  assert.doesNotMatch(source, /Personal browser/);
  assert.match(source, /candidate\?\.browser_id \|\| candidate\?\.id/);
  assert.match(source, /candidate\?\.browser_label \|\| candidate\?\.label/);
});

test('Host access settings temporarily hide the active Instance view without selecting Launcher home', async () => {
  const dialogSource = await readFile(new URL('./host-access-dialog.js', import.meta.url), 'utf8');
  const tabsSource = await readFile(new URL('./instance-tabs/instance-tabs.js', import.meta.url), 'utf8');
  assert.match(dialogSource, /hideInstanceTabView\?\.\(\)/);
  assert.match(dialogSource, /syncInstanceTabBounds\?\.\(\)/);
  assert.doesNotMatch(tabsSource, /hostAccess\.addEventListener[\s\S]{0,240}selectInstanceHome/);
});
