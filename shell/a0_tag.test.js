const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { EventEmitter } = require('node:events');
const { PassThrough } = require('node:stream');
const { test } = require('node:test');

const {
  A0_TAG_SHORTCUT,
  A0TagController,
  A0TagOverlay,
  GnomeA0TagShortcut,
  a0TagMicrophoneNotice,
  a0TagLeaseReadiness,
  cancelA0TagMicrophone,
  composeA0TagPrompt,
  isA0TagPaletteFallbackError,
  getA0TagMicrophoneStatus,
  parseA0TagComposerIntent,
  parseA0TagOverlayIntent,
  resolveA0TagProfile,
  runA0TagMicrophone,
  runTaggedHeadless
} = require('./a0_tag');

function fakeChild(records, code = 0) {
  const child = new EventEmitter();
  child.stdin = new PassThrough();
  child.stdout = new PassThrough();
  child.stderr = new PassThrough();
  child.kill = () => {};
  process.nextTick(() => {
    for (const record of records) child.stdout.write(`${JSON.stringify(record)}\n`);
    child.stdout.end();
    child.emit('exit', code, null);
  });
  return child;
}

test('tag prompt keeps app context delimited and profile selection is exact case-insensitive', () => {
  const prompt = composeA0TagPrompt({
    query: 'draft a kind reply',
    app_name: 'Notes',
    focused_text_chunks: ['untrusted text'],
    tree_chunks: ['{"role":"text"}'],
    replace_supported: true
  });
  assert.match(prompt, /USER REQUEST\ndraft a kind reply/);
  assert.match(prompt, /UNTRUSTED FOREGROUND-APP CONTEXT/);
  assert.match(prompt, /<!--a0-tag:v1;mode=replace-->/);
  assert.equal(resolveA0TagProfile('DEVELOPER', 'agent0', {
    profiles: [{ key: 'developer', label: 'Developer' }]
  }), 'developer');
});

test('command palette prompt uses Computer scope with the restored app as its starting context', () => {
  const prompt = composeA0TagPrompt({
    query: 'summarize the app in front of me',
    palette_scope: 'computer',
    replace_supported: false
  });

  assert.match(prompt, /"invocation_surface": "command_palette"/);
  assert.match(prompt, /"target_scope": "computer"/);
  assert.match(prompt, /Launcher has no editable replacement target/);
  assert.match(prompt, /app restored after it closes as the natural starting context/);
});

test('command palette accepts only one bounded submit or exact cancel intent', () => {
  assert.deepEqual(
    parseA0TagComposerIntent('a0-tag-compose://submit?query=Draft%20a%20reply&profile=developer'),
    { action: 'submit', query: 'Draft a reply', profile: 'developer' }
  );
  assert.deepEqual(parseA0TagComposerIntent('a0-tag-compose://cancel'), { action: 'cancel' });
  assert.deepEqual(parseA0TagComposerIntent('a0-tag-compose://microphone'), { action: 'microphone' });
  assert.deepEqual(parseA0TagComposerIntent('a0-tag-compose://microphone-cancel'), { action: 'microphone-cancel' });
  assert.deepEqual(parseA0TagComposerIntent('a0-tag-compose://attach-file'), { action: 'attach-file' });
  assert.deepEqual(parseA0TagComposerIntent('a0-tag-compose://attach-folder'), { action: 'attach-folder' });
  assert.deepEqual(parseA0TagComposerIntent('a0-tag-compose://attachments-menu-open'), { action: 'attachments-menu-open' });
  assert.deepEqual(parseA0TagComposerIntent('a0-tag-compose://attachments-clear'), { action: 'attachments-clear' });
  assert.equal(parseA0TagComposerIntent('a0-tag-compose://cancel?query=leak'), null);
  assert.equal(parseA0TagComposerIntent('a0-tag-compose://microphone?extra=1'), null);
  assert.equal(parseA0TagComposerIntent('a0-tag-compose://submit?query=x&scope=window&profile=agent0'), null);
  assert.equal(parseA0TagComposerIntent('a0-tag-compose://submit?query=x&query=y&profile=agent0'), null);
  assert.equal(parseA0TagComposerIntent('a0-tag-compose://submit?query=x&profile=agent0&extra=1'), null);
  assert.equal(parseA0TagComposerIntent(`a0-tag-compose://submit?query=${'x'.repeat(2049)}&profile=agent0`), null);
  assert.equal(isA0TagPaletteFallbackError({ code: 'A0_TAG_FOCUS_UNAVAILABLE' }), true);
  assert.equal(isA0TagPaletteFallbackError({ code: 'A0_TAG_PROTECTED_FIELD' }), false);
});

test('command palette microphone reuses the Instance Whisper store and bounds its result', async () => {
  const scripts = [];
  const webContents = {
    isDestroyed: () => false,
    async executeJavaScript(script) {
      scripts.push(script);
      return scripts.length === 1
        ? { text: `  ${'x'.repeat(2050)}  `, sendImmediately: true }
        : true;
    }
  };

  const result = await runA0TagMicrophone(webContents);
  assert.equal(result.text.length, 2048);
  assert.equal(result.sendImmediately, true);
  assert.match(scripts[0], /_whisper_stt\/webui\/whisper-stt-store\.js/);
  assert.match(scripts[0], /handleMicrophoneClick/);
  assert.equal(await cancelA0TagMicrophone(webContents), true);
  assert.match(scripts[1], /__a0TagMicrophoneSessionV1/);
});

test('command palette reports the Instance Whisper download state before recording', async () => {
  let script = '';
  const status = await getA0TagMicrophoneStatus({
    isDestroyed: () => false,
    async executeJavaScript(value) {
      script = value;
      return {
        enabled: true,
        config: { model_size: 'small' },
        model: { ready: false, loading: false, loaded_model: '' },
        package: { version: '20250625', error: '' }
      };
    }
  });

  assert.match(script, /_whisper_stt\/status/);
  assert.deepEqual(status, {
    enabled: true,
    modelReady: false,
    modelLoading: false,
    modelSize: 'small',
    loadedModel: '',
    packageVersion: '20250625',
    packageError: ''
  });
  assert.match(a0TagMicrophoneNotice(status).message, /download and load the Whisper small model/);
  assert.match(a0TagMicrophoneNotice({ enabled: true, modelSize: 'base' }).message, /prepare Whisper/);
  assert.match(a0TagMicrophoneNotice({ enabled: false }).error, /disabled/);
});

test('tag lease requires live Computer Use and the backend feature', () => {
  const tab = {
    hostAccessConfig: { configured: true, masterEnabled: true, scopes: { computer_use: true } },
    hostAccess: {
      state: 'connected',
      gateway: {
        state: 'connected',
        master_enabled: true,
        scopes: { computer_use: true },
        features: ['a0_tag_v1']
      }
    }
  };
  assert.equal(a0TagLeaseReadiness(tab).ready, true);
  assert.equal(a0TagLeaseReadiness({
    ...tab,
    hostAccessConfig: { ...tab.hostAccessConfig, scopes: { computer_use: false } }
  }).status, 'needs_computer_use');
  assert.equal(a0TagLeaseReadiness({
    ...tab,
    hostAccess: { ...tab.hostAccess, gateway: { ...tab.hostAccess.gateway, features: [] } }
  }, 'linux').code, 'A0_TAG_BACKEND_UNSUPPORTED');
});

test('tagged headless run keeps the prompt on stdin and accepts one complete result', async () => {
  let spawned;
  let stdin = '';
  const result = await runTaggedHeadless({
    spawn(command, args, options) {
      spawned = { command, args, options };
      const child = fakeChild([
        { type: 'ready', context_id: 'ctx-1' },
        { type: 'tag_result', context_id: 'ctx-1', mode: 'replace', text: '\tReady text\n\n', valid: true },
        { type: 'complete', context_id: 'ctx-1' }
      ]);
      child.stdin.on('data', (chunk) => { stdin += chunk.toString(); });
      return child;
    },
    launch: {
      cli: '/tmp/a0',
      host: 'http://127.0.0.1:32081',
      workspace: '/tmp/workspace',
      env: { A0_PASSWORD: 'secret' }
    },
    profile: 'developer',
    attachmentRefs: [
      '/a0/usr/uploads/a0-tag-window.png',
      '/a0/usr/uploads/brief.pdf'
    ],
    prompt: 'private prompt'
  });

  assert.deepEqual(result, { mode: 'replace', text: '\tReady text\n\n', valid: true, error: '' });
  assert.equal(spawned.args.includes('private prompt'), false);
  assert.deepEqual(
    spawned.args.filter((value, index) => spawned.args[index - 1] === '--attachment-ref'),
    ['/a0/usr/uploads/a0-tag-window.png', '/a0/usr/uploads/brief.pdf']
  );
  assert.equal(stdin, 'private prompt');
  assert.equal(spawned.options.detached, false);
});

test('tagged headless run rejects duplicate result records', async () => {
  await assert.rejects(
    runTaggedHeadless({
      spawn: () => fakeChild([
        { type: 'tag_result', mode: 'replace', text: 'first', valid: true },
        { type: 'tag_result', mode: 'replace', text: 'second', valid: true },
        { type: 'complete' }
      ]),
      launch: { cli: '/tmp/a0', host: 'http://127.0.0.1:32081', workspace: '/tmp/workspace' },
      profile: 'agent0',
      prompt: 'private prompt'
    }),
    (error) => error.code === 'A0_TAG_CLI_CONTRACT' && /more than one tag result/.test(error.message)
  );
});

test('controller registers only a ready lease and exact-applies a replace result', async () => {
  let shortcutHandler;
  let failLeaseRefresh = false;
  const requests = [];
  const overlays = [];
  const config = {
    enabled: true,
    instanceKey: 'local:abc123',
    defaultProfile: 'agent0'
  };
  const controller = new A0TagController({
    getConfig: async () => config,
    resolveLease: async () => {
      if (failLeaseRefresh) throw new Error('lease refresh unavailable');
      return { ready: true, leaseToken: 'local:abc123:1:gateway' };
    },
    request: async (_key, payload) => {
      requests.push(payload);
      if (payload.action === 'a0_tag_capture') return {
        target_token: 'target-1',
        query: 'write a concise reply',
        tag_text: '@a0 write a concise reply',
        app_name: 'Text Editor',
        replace_supported: true,
        focused_text_chunks: [],
        tree_chunks: []
      };
      if (payload.action === 'a0_tag_profiles') return {
        default_profile: 'agent0',
        profiles: [{ key: 'agent0', label: 'Agent 0' }]
      };
      if (payload.action === 'a0_tag_release') failLeaseRefresh = true;
      return { replaced: payload.action === 'a0_tag_apply' };
    },
    resolveLaunch: async () => ({
      cli: '/tmp/a0',
      host: 'http://127.0.0.1:32081',
      workspace: '/tmp/workspace',
      env: {},
      leaseToken: 'local:abc123:1:gateway'
    }),
    globalShortcut: {
      register(shortcut, handler) {
        assert.equal(shortcut, A0_TAG_SHORTCUT);
        shortcutHandler = handler;
        return true;
      },
      unregister() {}
    },
    spawn: () => fakeChild([
      { type: 'tag_result', context_id: 'ctx-1', mode: 'replace', text: 'Concise reply.', valid: true },
      { type: 'complete', context_id: 'ctx-1' }
    ]),
    overlay: {
      showStatus: (message) => overlays.push(['status', message]),
      showCompletion: (message) => overlays.push(['complete', message]),
      showResult: (payload) => overlays.push(['result', payload]),
      destroy() {}
    }
  });

  await controller.sync();
  assert.equal(typeof shortcutHandler, 'function');
  assert.equal(controller.snapshot().status, 'ready');
  assert.equal(await controller.invoke(), true);
  assert.deepEqual(requests.map((request) => request.action), [
    'a0_tag_capture',
    'a0_tag_profiles',
    'a0_tag_apply',
    'a0_tag_release'
  ]);
  assert.deepEqual(overlays.at(-1), ['complete', 'Response inserted.']);
  assert.equal(controller.snapshot().status, 'error');
  assert.match(controller.snapshot().message, /lease refresh unavailable/);
});

test('controller opens the command palette for inaccessible fields and reuses tagged headless action', async () => {
  const requests = [];
  const overlays = [];
  let stdin = '';
  let spawnedArgs = [];
  const controller = new A0TagController({
    getConfig: async () => ({
      enabled: true,
      instanceKey: 'local:abc123',
      defaultProfile: 'agent0'
    }),
    resolveLease: async () => ({ ready: true, leaseToken: 'local:abc123:1:gateway' }),
    request: async (_key, payload) => {
      requests.push(payload);
      if (payload.action === 'a0_tag_capture') {
        const error = new Error('No accessible focused field was found.');
        error.code = 'A0_TAG_FOCUS_UNAVAILABLE';
        throw error;
      }
      if (payload.action === 'a0_tag_upload') {
        assert.deepEqual(payload.paths, ['/tmp/brief.txt', '/tmp/references']);
        return {
          attachment_refs: [
            '/a0/usr/uploads/brief-1.txt',
            '/a0/usr/uploads/reference-1.md'
          ]
        };
      }
      return {
        default_profile: 'agent0',
        profiles: [
          { key: 'agent0', label: 'Agent 0' },
          { key: 'developer', label: 'Developer' }
        ]
      };
    },
    resolveLaunch: async () => ({
      cli: '/tmp/a0',
      host: 'http://127.0.0.1:32081',
      workspace: '/tmp/workspace',
      env: {},
      leaseToken: 'local:abc123:1:gateway'
    }),
    globalShortcut: { register: () => true, unregister() {} },
    spawn: (_command, args) => {
      spawnedArgs = args;
      const child = fakeChild([
        { type: 'tag_result', mode: 'action', text: 'Focused app updated.', valid: true },
        { type: 'complete' }
      ]);
      child.stdin.on('data', (chunk) => { stdin += chunk.toString(); });
      return child;
    },
    overlay: {
      focusComposer: () => false,
      showComposer: async (payload) => {
        overlays.push(['composer', payload]);
        return {
          query: 'Update this draft',
          profile: 'developer',
          attachmentPaths: ['/tmp/brief.txt', '/tmp/references']
        };
      },
      showStatus: (message) => overlays.push(['status', message]),
      showCompletion: (message) => overlays.push(['complete', message]),
      showResult: (payload) => overlays.push(['result', payload]),
      destroy() {}
    }
  });

  await controller.sync();
  assert.equal(await controller.invoke(), true);
  assert.deepEqual(requests.map((request) => request.action), [
    'a0_tag_capture',
    'a0_tag_profiles',
    'a0_tag_upload'
  ]);
  assert.equal(overlays[0][0], 'composer');
  assert.deepEqual(overlays[0][1].profiles.map((profile) => profile.key), ['agent0', 'developer']);
  assert.equal(overlays.at(-1)[1].title, 'A0 Tag completed');
  assert.match(stdin, /USER REQUEST\nUpdate this draft/);
  assert.match(stdin, /"target_scope": "computer"/);
  assert.match(stdin, /Launcher has no editable replacement target/);
  assert.deepEqual(
    spawnedArgs.filter((value, index) => spawnedArgs[index - 1] === '--attachment-ref'),
    ['/a0/usr/uploads/brief-1.txt', '/a0/usr/uploads/reference-1.md']
  );
});

test('controller keeps protected fields fail-closed instead of opening the command palette', async () => {
  let composerCalls = 0;
  const results = [];
  const controller = new A0TagController({
    getConfig: async () => ({ enabled: true, instanceKey: 'local:abc123', defaultProfile: 'agent0' }),
    resolveLease: async () => ({ ready: true, leaseToken: 'lease' }),
    request: async () => {
      const error = new Error('A0 Tag is unavailable in protected fields.');
      error.code = 'A0_TAG_PROTECTED_FIELD';
      throw error;
    },
    globalShortcut: { register: () => true, unregister() {} },
    overlay: {
      focusComposer: () => false,
      showComposer: async () => { composerCalls += 1; return null; },
      showStatus() {},
      showCompletion() {},
      showResult: (payload) => results.push(payload),
      destroy() {}
    }
  });

  assert.equal(await controller.invoke(), false);
  assert.equal(composerCalls, 0);
  assert.match(results[0].message, /protected fields/);
});

test('controller keeps voice input on the active command-palette lease', async () => {
  const calls = [];
  const controller = new A0TagController({
    resolveLease: async () => ({ ready: true, leaseToken: 'lease-1' }),
    microphoneStatus: async (instanceKey) => {
      calls.push(['status', instanceKey]);
      return { enabled: true, modelReady: false, modelSize: 'base' };
    },
    transcribeMicrophone: async (instanceKey) => {
      calls.push(['start', instanceKey]);
      return { text: 'Voice request', sendImmediately: false };
    },
    cancelMicrophone: async (instanceKey) => {
      calls.push(['cancel', instanceKey]);
      return true;
    }
  });
  controller.active = {
    instanceKey: 'local:abc123',
    leaseToken: 'lease-1',
    eligible: true,
    composing: true
  };

  assert.deepEqual(await controller.getComposerMicrophoneStatus(), {
    enabled: true,
    modelReady: false,
    modelSize: 'base'
  });
  assert.deepEqual(await controller.startComposerMicrophone(), {
    text: 'Voice request',
    sendImmediately: false
  });
  assert.equal(await controller.cancelComposerMicrophone(), true);
  assert.deepEqual(calls, [
    ['status', 'local:abc123'],
    ['start', 'local:abc123'],
    ['cancel', 'local:abc123']
  ]);
});

test('controller closes a composing palette when its lease is lost', async () => {
  let destroyed = 0;
  const controller = new A0TagController({
    resolveLease: async () => ({ ready: false, status: 'waiting_for_instance', message: 'Instance closed' }),
    globalShortcut: { unregister() {} },
    overlay: {
      destroy: () => { destroyed += 1; },
      showStatus() {},
      showCompletion() {},
      showResult() {}
    }
  });
  controller.active = {
    instanceKey: 'local:abc123',
    leaseToken: 'lease-1',
    eligible: true,
    composing: true
  };

  await controller.sync({
    enabled: true,
    instanceKey: 'local:abc123',
    defaultProfile: 'agent0'
  });

  assert.equal(controller.active.eligible, false);
  assert.equal(destroyed, 1);
});

test('profile discovery remains visible while an unsaved Instance choice is being configured', async () => {
  const controller = new A0TagController({
    getConfig: async () => ({ enabled: false }),
    resolveLease: async () => ({ ready: true }),
    request: async () => ({ profiles: [{ key: 'developer', label: 'Developer' }] }),
    globalShortcut: { register: () => true, unregister() {} }
  });

  const result = await controller.getProfiles('local:abc123');

  assert.deepEqual(result.profiles, [{ key: 'developer', label: 'Developer' }]);
  assert.deepEqual(controller.snapshot().profiles, result.profiles);
});

test('GNOME Wayland fallback preserves other shortcuts and removes only its own binding', () => {
  let paths = "['/org/gnome/settings-daemon/plugins/media-keys/custom-keybindings/custom0/']";
  const calls = [];
  const shortcut = new GnomeA0TagShortcut({
    pid: 4242,
    processStartTime: '8675309',
    env: { XDG_SESSION_TYPE: 'wayland', XDG_CURRENT_DESKTOP: 'ubuntu:GNOME' },
    spawnSync(_command, args) {
      calls.push(args);
      if (args[0] === 'get' && args[1] === 'org.gnome.settings-daemon.plugins.media-keys') {
        return { status: 0, stdout: paths };
      }
      if (args[0] === 'get' && args[2] === 'binding') return { status: 0, stdout: "'<Super>space'" };
      if (args[0] === 'set' && args[1] === 'org.gnome.settings-daemon.plugins.media-keys') {
        paths = args[3];
      }
      return { status: 0, stdout: '' };
    }
  });

  assert.equal(shortcut.register(), true);
  assert.match(paths, /a0-tag/);
  const command = calls.find((args) => args[0] === 'set' && args[2] === 'command')?.[3] || '';
  assert.match(command, /\/proc\/4242\/stat/);
  assert.match(command, /\$\{20\}" = "8675309"/);
  assert.match(command, /\/bin\/kill -USR2 4242/);
  shortcut.unregister();
  assert.doesNotMatch(paths, /a0-tag/);
  assert.match(paths, /custom0/);
});

test('controller uses the native fallback only when Electron cannot register', async () => {
  let fallbackRegistered = false;
  let fallbackRemoved = false;
  const controller = new A0TagController({
    getConfig: async () => ({ enabled: true, instanceKey: 'local:abc', defaultProfile: 'agent0' }),
    resolveLease: async () => ({ ready: true, leaseToken: 'lease' }),
    globalShortcut: { register: () => false, unregister() {} },
    registerFallback: () => { fallbackRegistered = true; return true; },
    unregisterFallback: () => { fallbackRemoved = true; }
  });

  await controller.sync();
  assert.equal(controller.snapshot().status, 'ready');
  assert.equal(fallbackRegistered, true);
  controller.dispose();
  assert.equal(fallbackRemoved, true);
});

test('controller reports a settings read failure without an unhandled invocation', async () => {
  const results = [];
  const controller = new A0TagController({
    getConfig: async () => { throw new Error('state unavailable'); },
    overlay: {
      showStatus() {},
      showCompletion() {},
      showResult: (payload) => results.push(payload),
      destroy() {}
    }
  });

  assert.equal(await controller.invoke(), false);
  assert.equal(results[0].title, 'A0 Tag unavailable');
  assert.match(results[0].message, /state unavailable/);
});

test('overlay renders the owned microphone result and cancels an in-flight session', async () => {
  const scripts = [];
  let cancelCalls = 0;
  const windowRef = {
    isDestroyed: () => false,
    webContents: {
      async executeJavaScript(script) {
        scripts.push(script);
      }
    }
  };
  const overlay = new A0TagOverlay({
    startMicrophone: async () => ({ text: 'Voice request', sendImmediately: false }),
    cancelMicrophone: async () => { cancelCalls += 1; }
  });
  overlay.window = windowRef;

  await overlay._toggleComposerMicrophone(windowRef);
  assert.match(scripts[0], /renderA0TagMicrophone/);
  assert.match(scripts[0], /Voice request/);

  let finishMicrophone;
  overlay.startMicrophone = () => new Promise((resolve) => { finishMicrophone = resolve; });
  const pending = overlay._toggleComposerMicrophone(windowRef);
  await new Promise((resolve) => setImmediate(resolve));
  overlay._cancelComposerMicrophone();
  finishMicrophone({ cancelled: true });
  await pending;
  assert.equal(cancelCalls, 1);
  assert.equal(scripts.length, 1);
});

test('overlay expands the original-style menu and keeps selected host paths out of renderer state', async () => {
  const scripts = [];
  let bounds = { x: 100, y: 120, width: 690, height: 170 };
  const windowRef = {
    isDestroyed: () => false,
    getBounds: () => ({ ...bounds }),
    setBounds: (value) => { bounds = { ...value }; },
    close() {},
    webContents: {
      async executeJavaScript(script) { scripts.push(script); }
    }
  };
  const overlay = new A0TagOverlay({
    fixedComposerCanvas: false,
    screen: { getDisplayMatching: () => ({ workArea: { y: 0 } }) },
    selectAttachments: async () => ['/tmp/brief.txt', '/tmp/references']
  });
  overlay.window = windowRef;

  overlay._setComposerMenuOpen(windowRef, true);
  assert.deepEqual(bounds, { x: 100, y: 20, width: 690, height: 270 });
  await overlay._selectComposerAttachments(windowRef, 'file');
  assert.deepEqual(bounds, { x: 100, y: 120, width: 690, height: 170 });
  assert.deepEqual(overlay.composerAttachments.map((item) => item.path), [
    '/tmp/brief.txt',
    '/tmp/references'
  ]);
  assert.match(scripts.at(-1), /renderA0TagAttachments/);
  assert.doesNotMatch(scripts.at(-1), /\/tmp\/brief/);

  const completion = new Promise((resolve) => {
    overlay.composerResolver = resolve;
    overlay.composerPromise = Promise.resolve();
  });
  overlay._finishComposer({ action: 'submit', query: 'Read these', profile: 'agent0' });
  assert.deepEqual(await completion, {
    action: 'submit',
    query: 'Read these',
    profile: 'agent0',
    attachmentPaths: ['/tmp/brief.txt', '/tmp/references']
  });
});

test('overlay keeps the Wayland composer fixed while exposing the menu canvas', () => {
  const bounds = { x: 100, y: 20, width: 690, height: 270 };
  let shape;
  const windowRef = {
    isDestroyed: () => false,
    getBounds: () => ({ ...bounds }),
    setShape: (value) => { shape = value; }
  };
  const overlay = new A0TagOverlay({ fixedComposerCanvas: true });

  overlay._setComposerMenuOpen(windowRef, false);
  assert.deepEqual(shape, [{ x: 0, y: 100, width: 690, height: 170 }]);
  overlay._setComposerMenuOpen(windowRef, true);
  assert.deepEqual(shape, [{ x: 0, y: 0, width: 690, height: 270 }]);
  assert.deepEqual(windowRef.getBounds(), bounds);
});

test('overlay accepts only its two exact shell intents and renders model text via textContent', () => {
  assert.equal(parseA0TagOverlayIntent('a0-tag-overlay://copy'), 'copy');
  assert.equal(parseA0TagOverlayIntent('a0-tag-overlay://dismiss'), 'dismiss');
  assert.equal(parseA0TagOverlayIntent('a0-tag-overlay://copy?extra=1'), '');
  const html = fs.readFileSync(path.join(__dirname, 'a0_tag_overlay.html'), 'utf8');
  const script = fs.readFileSync(path.join(__dirname, 'a0_tag_overlay.js'), 'utf8');
  const styles = fs.readFileSync(path.join(__dirname, 'a0_tag_overlay.css'), 'utf8');
  assert.match(html, /Content-Security-Policy/);
  assert.match(html, /assets\/darkSymbol\.svg/);
  assert.match(html, /id="a0TagComposer"/);
  assert.match(html, /Ask Agent Zero to use your computer/);
  assert.match(html, /placeholder="Type your message here\.\.\."/);
  assert.match(html, /<span>Profile<\/span>/);
  assert.match(html, /id="a0TagAttachmentTrigger"/);
  assert.match(html, /<span>Attach file<\/span>/);
  assert.match(html, /<span>Attach folder<\/span>/);
  assert.match(html, /drive_folder_upload/);
  assert.match(html, /M16\.5 6v11\.5c0 2\.21/);
  assert.match(html, /id="a0TagMicrophone"/);
  assert.match(html, /id="a0TagMicrophoneStatus"/);
  assert.match(html, /id="a0TagToast"/);
  assert.doesNotMatch(html, /a0TagScope|Focused app|>Computer</);
  assert.match(styles, /-webkit-app-region: drag/);
  assert.match(styles, /-webkit-app-region: no-drag/);
  assert.match(styles, /"Rubik"/);
  assert.match(styles, /a0-tag-microphone/);
  assert.match(styles, /align-content: center/);
  assert.match(styles, /background: color-mix\(in srgb, var\(--color-panel\) 72%, var\(--color-background\) 28%\)/);
  assert.match(styles, /background: #4248f1/);
  assert.match(styles, /\.a0-tag-attachment-menu\s*\{[^}]*position: absolute;[^}]*bottom: 100%;[^}]*margin-bottom: 0\.25rem;/s);
  assert.doesNotMatch(styles, /a0-tag-microphone\[data-active="true"\][^{]*\{[^}]*color-mix/s);
  assert.doesNotMatch(styles, /a0-tag-scope/);
  assert.match(script, /renderA0TagComposer/);
  assert.match(script, /renderA0TagMicrophone/);
  assert.match(script, /renderA0TagMicrophoneStatus/);
  assert.match(script, /renderA0TagAttachments/);
  assert.match(script, /message\.textContent/);
  assert.doesNotMatch(script, /a0TagScope|scope:/);
  assert.doesNotMatch(script, /innerHTML|ipcRenderer|require\(/);

  const notifications = [];
  class FakeNotification {
    static isSupported() { return true; }
    constructor(options) { this.options = options; }
    show() { notifications.push(this.options); }
    close() {}
  }
  const overlay = new A0TagOverlay({ suppressWorkingWindow: true, Notification: FakeNotification });
  overlay.showStatus('Working');
  assert.equal(overlay.window, null);
  assert.deepEqual(notifications, [{ title: 'A0 Tag', body: 'Working', silent: true }]);
});
