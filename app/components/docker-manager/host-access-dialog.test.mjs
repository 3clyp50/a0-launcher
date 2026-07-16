import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const {
  bindHostAccessState,
  bindScopeDependency,
  browserSetupHint,
  capabilityStatusLabel,
  computerUseNeedsArm,
  configForTarget,
  normalizeConfig,
  normalizeScopes,
  scopeFieldsHtml,
  watchBrowserSetupFailure
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

test('Browser setup explains how to enable remote debugging when no endpoint is open', () => {
  const hint = browserSetupHint({
    available_browsers: [{ label: 'Google Chrome - Default', cdp_endpoint: '' }]
  });

  assert.match(hint, /Chrome or Chromium at chrome:\/\/inspect\/#remote-debugging/);
  assert.match(hint, /Edge at edge:\/\/inspect\/#remote-debugging/);
  assert.match(hint, /Opera at opera:\/\/inspect\/#remote-debugging/);
  assert.match(hint, /Brave and Vivaldi are supported too/);
  assert.match(hint, /Allow remote debugging for this browser instance/);
  assert.equal(browserSetupHint({ cdp_endpoint: 'ws://localhost:9222/devtools/browser/test' }), '');
  assert.equal(browserSetupHint({
    available_browsers: [{ cdp_endpoint: 'ws://localhost:9333/devtools/browser/test' }]
  }), '');
});

test('Browser setup explains a stale debugging endpoint after the gateway command fails', () => {
  let stateListener;
  let toast;
  let removed = false;
  const originalWindow = globalThis.window;
  globalThis.window = {
    addEventListener(type, listener) {
      if (type === 'dm:state') stateListener = listener;
    },
    removeEventListener(type, listener) {
      if (type === 'dm:state' && listener === stateListener) removed = true;
    },
    setTimeout() { return 1; },
    clearTimeout() {},
    toastFrontendInfo(...args) { toast = args; }
  };

  try {
    watchBrowserSetupFailure('instance-tab-1');
    stateListener({
      detail: {
        instanceTabs: {
          tabs: [{ id: 'instance-tab-1', hostAccess: { code: 'GATEWAY_COMMAND_FAILED' } }]
        }
      }
    });
  } finally {
    if (originalWindow === undefined) delete globalThis.window;
    else globalThis.window = originalWindow;
  }

  assert.match(toast[0], /chrome:\/\/inspect\/#remote-debugging/);
  assert.deepEqual(toast.slice(1), ['Set up browser', 12, 'dm-host-browser-setup']);
  assert.equal(removed, true);
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
  assert.match(source, /Launcher setup needs attention/);
  assert.doesNotMatch(source, /data-install-cli/);
  assert.doesNotMatch(source, /2\.5 or newer/);
  assert.doesNotMatch(source, /Personal browser/);
  assert.match(source, /candidate\?\.browser_id \|\| candidate\?\.id/);
  assert.match(source, /candidate\?\.browser_label \|\| candidate\?\.label/);
});

test('Host access settings temporarily hide the active Instance view without selecting Launcher home', async () => {
  const dialogSource = await readFile(new URL('./host-access-dialog.js', import.meta.url), 'utf8');
  const tabsSource = await readFile(new URL('./instance-tabs/instance-tabs.js', import.meta.url), 'utf8');
  const rendererSource = await readFile(new URL('../../docker_manager.js', import.meta.url), 'utf8');
  assert.match(dialogSource, /hideInstanceTabView\?\.\(\)/);
  assert.match(dialogSource, /syncInstanceTabBounds\?\.\(\)/);
  assert.match(rendererSource, /dm:open-host-access/);
  assert.match(tabsSource, /dm:open-host-access/);
  assert.match(tabsSource, /openHostAccessDialog\(tab, state\)/);
  assert.doesNotMatch(tabsSource, /hostAccess\.addEventListener[\s\S]{0,240}selectInstanceHome/);
});
