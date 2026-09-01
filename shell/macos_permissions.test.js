const assert = require('node:assert/strict');
const test = require('node:test');

const {
  ensureMacAccessibilityPermission,
  ensureMacMicrophonePermission,
  localizeMacPermissionStatus,
  macAccessibilityPermissionMessage,
  macMicrophonePermissionMessage
} = require('./macos_permissions');

test('macOS Accessibility preflight prompts once and polls without prompting', async () => {
  const calls = [];
  const results = [false, false, false, true];
  const systemPreferences = {
    isTrustedAccessibilityClient(prompt) {
      calls.push(prompt);
      return results.shift() === true;
    }
  };

  const result = await ensureMacAccessibilityPermission(systemPreferences, {
    prompt: true,
    timeoutMs: 1000,
    pollIntervalMs: 10,
    wait: async () => {}
  });

  assert.deepEqual(result, { granted: true, prompted: true });
  assert.deepEqual(calls, [false, true, false, false]);
});

test('macOS Accessibility preflight stays silent when prompting is disabled', async () => {
  const calls = [];
  const result = await ensureMacAccessibilityPermission({
    isTrustedAccessibilityClient(prompt) {
      calls.push(prompt);
      return false;
    }
  }, { prompt: false });

  assert.deepEqual(result, { granted: false, prompted: false });
  assert.deepEqual(calls, [false]);
});

test('dev permission copy names the Electron build macOS actually authorizes', () => {
  const status = localizeMacPermissionStatus({
    gateway: {
      status: {
        computer_use: {
          setup: { state: 'accessibility_required', message: 'Allow Agent Zero Launcher.' }
        }
      }
    }
  }, { isPackaged: false });

  assert.equal(
    status.gateway.status.computer_use.setup.message,
    'Allow Electron (this Launcher dev build) in macOS Accessibility settings.'
  );
  assert.equal(
    macAccessibilityPermissionMessage({ isPackaged: true }),
    'Allow Agent Zero Launcher in macOS Accessibility settings.'
  );
  assert.equal(
    macMicrophonePermissionMessage({ isPackaged: false }),
    'Allow Electron (this Launcher dev build) in macOS Microphone settings, then restart Launcher.'
  );
});

test('macOS microphone preflight prompts only from the undetermined state', async () => {
  const calls = [];
  const permission = {
    getMediaAccessStatus(mediaType) {
      calls.push(['status', mediaType]);
      return 'not-determined';
    },
    async askForMediaAccess(mediaType) {
      calls.push(['ask', mediaType]);
      return true;
    }
  };

  assert.deepEqual(
    await ensureMacMicrophonePermission(permission, { prompt: true }),
    { granted: true, prompted: true }
  );
  assert.deepEqual(calls, [
    ['status', 'microphone'],
    ['ask', 'microphone']
  ]);
});

test('macOS microphone preflight preserves granted and denied decisions', async () => {
  let asked = 0;
  const granted = {
    getMediaAccessStatus: () => 'granted',
    askForMediaAccess: async () => { asked += 1; return false; }
  };
  const denied = {
    getMediaAccessStatus: () => 'denied',
    askForMediaAccess: async () => { asked += 1; return true; }
  };

  assert.deepEqual(
    await ensureMacMicrophonePermission(granted, { prompt: true }),
    { granted: true, prompted: false }
  );
  assert.deepEqual(
    await ensureMacMicrophonePermission(denied, { prompt: true }),
    { granted: false, prompted: false }
  );
  assert.equal(asked, 0);
});
