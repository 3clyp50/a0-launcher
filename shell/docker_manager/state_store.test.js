const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { after, test } = require('node:test');

const testRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'a0-launcher-state-store-'));
const electronPath = require.resolve('electron');
const previousElectronModule = require.cache[electronPath];
require.cache[electronPath] = {
  id: electronPath,
  filename: electronPath,
  loaded: true,
  exports: {
    app: { getPath: () => testRoot },
    safeStorage: null
  }
};
const stateStorePath = require.resolve('./state_store');
delete require.cache[stateStorePath];
const stateStore = require('./state_store');

after(() => {
  fs.rmSync(testRoot, { recursive: true, force: true });
  delete require.cache[stateStorePath];
  if (previousElectronModule) require.cache[electronPath] = previousElectronModule;
  else delete require.cache[electronPath];
});

function settings(portPreferences, hostRoot) {
  return {
    portPreferences,
    storagePreferences: {
      mode: 'host_directory',
      hostRoot,
      hostPathMode: 'per_instance',
      volumePrefix: 'a0-launcher'
    },
    instanceDefaults: {
      models: {
        Main: { provider: 'openrouter', model: 'openai/gpt-5', apiKey: '' },
        Utility: { provider: 'openrouter', model: '', apiKey: '' },
        Embedding: { provider: 'huggingface', model: '', apiKey: '' }
      }
    },
    hostAccess: {
      onboardingComplete: true,
      defaults: {
        configured: false,
        masterEnabled: false,
        folder: '',
        scopes: {
          files: true,
          file_write: true,
          code_execution: true,
          browser: false,
          computer_use: false
        }
      }
    }
  };
}

test('Settings write preserves the previous port pair when duplicate ports are rejected', async () => {
  const first = await stateStore.writeSettings(settings({ ui: 7777, ssh: 55022 }, '/tmp/first'));
  assert.deepEqual(first.saved, {
    portPreferences: true,
    storagePreferences: true,
    instanceDefaults: true,
    hostAccess: true
  });

  const partial = await stateStore.writeSettings(settings({ ui: 6000, ssh: 6000 }, '/tmp/second'));
  assert.equal(partial.saved.portPreferences, false);
  assert.deepEqual(partial.portPreferences, { ui: 7777, ssh: 55022 });
  assert.equal(partial.storagePreferences.hostRoot, '/tmp/second');

  const persisted = JSON.parse(fs.readFileSync(stateStore.stateFile(), 'utf8'));
  assert.deepEqual(persisted.portPreferences, { ui: 7777, ssh: 55022 });
  assert.equal(persisted.storagePreferences.hostRoot, '/tmp/second');
  assert.equal(persisted.instanceDefaults.models.Main.model, 'openai/gpt-5');
  assert.equal(persisted.hostAccess.onboardingComplete, true);
});
