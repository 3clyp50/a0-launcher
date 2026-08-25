import assert from 'node:assert/strict';
import { test } from 'node:test';

function fakeElement(value = '') {
  return {
    value,
    dataset: {},
    disabled: false,
    addEventListener() {}
  };
}

function fakeDocument(elements) {
  return {
    getElementById(id) {
      return elements.get(id) || null;
    },
    querySelector(selector) {
      return elements.get(selector) || null;
    },
    querySelectorAll() {
      return [];
    }
  };
}

test('Settings save persists every sub-tab payload and a disabled Host access default at once', async () => {
  const hostConfigured = fakeElement();
  hostConfigured.checked = false;
  const hostFolder = fakeElement('/home/eclypso');
  const hostScopes = {
    files: Object.assign(fakeElement(), { checked: true }),
    file_write: Object.assign(fakeElement(), { checked: true }),
    code_execution: Object.assign(fakeElement(), { checked: true }),
    browser: Object.assign(fakeElement(), { checked: false }),
    computer_use: Object.assign(fakeElement(), { checked: false })
  };
  const hostRoot = {
    dataset: { rendered: '1' },
    querySelector(selector) {
      const key = selector.match(/data-host-scope="([^"]+)"/)?.[1];
      return key ? hostScopes[key] || null : null;
    },
    querySelectorAll(selector) {
      return selector === 'input' ? [hostConfigured, hostFolder, ...Object.values(hostScopes)] : [];
    }
  };
  const elements = new Map([
    ['uiPortInput', fakeElement('7777')],
    ['sshPortInput', fakeElement('')],
    ['workspaceStorageMode', fakeElement('named_volume')],
    ['workspaceHostRoot', fakeElement('/tmp/agent-zero')],
    ['workspaceHostPathMode', fakeElement('exact')],
    ['workspaceVolumePrefix', fakeElement('custom-a0')],
    ['settingsHostAccessDefaults', hostRoot],
    ['settingsHostAccessConfigured', hostConfigured],
    ['settingsHostAccessFolder', hostFolder],
    ['saveSettingsBtn', fakeElement()]
  ]);
  for (const id of ['uiPortInput', 'workspaceStorageMode', 'workspaceHostRoot', 'settingsHostAccessConfigured']) {
    elements.get(id).dataset.dirty = '1';
  }

  const calls = [];
  globalThis.document = fakeDocument(elements);
  globalThis.sessionStorage = { getItem: () => null, setItem: () => {} };
  globalThis.window = {
    __dmLastState: {
      storagePreferences: {
        mode: 'named_volume',
        hostRoot: '/tmp/agent-zero',
        hostPathMode: 'exact',
        volumePrefix: 'custom-a0'
      },
      hostAccess: {
        defaults: {
          configured: true,
          masterEnabled: true,
          folder: '/home/eclypso',
          scopes: {
            files: true,
            file_write: true,
            code_execution: true,
            browser: false,
            computer_use: false
          },
          browserSelection: 'chromium:default'
        }
      }
    },
    addEventListener() {},
    dockerManagerActions: {
      async saveSettings(payload) {
        calls.push(['settings', payload, elements.get('saveSettingsBtn').disabled]);
        return {
          portPreferences: true,
          storagePreferences: true,
          hostAccess: true,
          instanceDefaults: true
        };
      }
    },
    toastFrontendSuccess(message, title) {
      calls.push(['success', { message, title }]);
    },
    toastFrontendWarning(message, title) {
      calls.push(['warning', { message, title }]);
    },
    toastFrontendError(message, title) {
      calls.push(['error', { message, title }]);
    }
  };

  const { saveAllSettings } = await import('./settings.js');
  await saveAllSettings();

  assert.deepEqual(calls[0], [
    'settings',
    {
      portPreferences: { ui: 7777, ssh: undefined },
      storagePreferences: {
        mode: 'named_volume',
        hostRoot: '/tmp/agent-zero',
        hostPathMode: 'exact',
        volumePrefix: 'custom-a0'
      },
      instanceDefaults: {
        models: {
          Main: { provider: 'openrouter', model: '', apiKey: '' },
          Utility: { provider: 'openrouter', model: '', apiKey: '' },
          Embedding: { provider: 'huggingface', model: '', apiKey: '' }
        }
      },
      hostAccess: {
        onboardingComplete: true,
        defaults: {
          configured: false,
          masterEnabled: false,
          folder: '/home/eclypso',
          scopes: {
            files: true,
            file_write: true,
            code_execution: true,
            browser: false,
            computer_use: false
          },
          browserSelection: 'chromium:default'
        }
      }
    },
    true
  ]);
  assert.deepEqual(calls.at(-1), ['success', { message: 'Settings saved.', title: 'Agent Zero' }]);
  assert.equal(elements.get('saveSettingsBtn').disabled, false);
  assert.equal(elements.get('uiPortInput').dataset.dirty, undefined);
  assert.equal(elements.get('workspaceStorageMode').dataset.dirty, undefined);
  assert.equal(elements.get('workspaceHostRoot').dataset.dirty, undefined);
  assert.equal(elements.get('settingsHostAccessConfigured').dataset.dirty, undefined);
});
