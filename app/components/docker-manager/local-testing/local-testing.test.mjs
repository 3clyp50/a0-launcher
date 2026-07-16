import assert from 'node:assert/strict';
import { test } from 'node:test';

globalThis.document = {
  body: { dataset: {} },
  addEventListener: () => {},
  createElement: (tag) => {
    const styles = new Map();
    return {
      tagName: String(tag || '').toUpperCase(),
      children: [],
      className: '',
      textContent: '',
      style: {
        setProperty: (name, value) => styles.set(name, String(value)),
        getPropertyValue: (name) => styles.get(name) || ''
      },
      appendChild(child) {
        this.children.push(child);
        return child;
      },
      setAttribute(name, value) {
        this[name] = String(value);
      }
    };
  },
  getElementById: () => null
};

globalThis.window = {
  __dmLastState: null,
  addEventListener: () => {},
  dockerManagerActions: {}
};

const {
  bindOpenableCardHeader,
  backgroundOperationLabel,
  computeCardMenuPlacement,
  deleteInstanceStorageModel,
  dockerInstanceRuntimeSummary,
  emptyInstancesStateModel,
  instancePowerMenuConfig,
  instanceUpdateModel,
  isBlockingOperationRunning,
  latestAvailableReleaseTag,
  remoteInstanceStatusModel,
  remoteCliMenuConfig,
  instanceVisualBadge,
  localCardsRenderKey,
  openCardMenu,
  storageOpenButtonLabel,
  workspaceStorageFolderAvailable
} = await import('./local-testing.js');
const { createInstanceVisual } = await import('../card-visuals.js');

function fakeClassList(initial = []) {
  const values = new Set(initial);
  return {
    add: (...names) => names.forEach((name) => values.add(name)),
    remove: (...names) => names.forEach((name) => values.delete(name)),
    toggle: (name, force) => {
      const shouldAdd = typeof force === 'boolean' ? force : !values.has(name);
      if (shouldAdd) values.add(name);
      else values.delete(name);
      return shouldAdd;
    },
    contains: (name) => values.has(name)
  };
}

test('instance chips prefer health runtime identity over image provenance', () => {
  assert.equal(
    instanceVisualBadge({
      versionTag: 'ready',
      runtimeTag: 'v2.4',
      runtimeVersion: 'v2.4+18',
      runtimeBranch: 'ready',
      matchedReleaseTag: 'v2.0'
    }),
    'ready · 2.4+18'
  );

  assert.equal(
    dockerInstanceRuntimeSummary({
      runtimeSource: { tag: 'v2.4', version: 'v2.4+18', branch: 'ready' },
      runtimeShortCommit: '6a7178af91c6'
    }),
    'ready @ 6a7178af91c6'
  );
});

test('custom Agent Zero images use health identity when available', () => {
  const instance = {
    imageRef: 'my-agent-zero:dev',
    versionTag: 'dev',
    isBackendImage: false,
    runtimeTag: 'v2.0',
    runtimeVersion: 'v2.0+3',
    runtimeBranch: 'ready',
    runtimeShortCommit: 'abcdef123456'
  };

  assert.equal(instanceVisualBadge(instance), 'ready · 2.0+3');
  assert.equal(dockerInstanceRuntimeSummary(instance), 'ready @ abcdef123456');
});

test('custom images without Agent Zero health metadata retain image identity', () => {
  const instance = {
    imageRef: 'my-runtime:dev',
    versionTag: 'dev',
    isBackendImage: false
  };

  assert.equal(instanceVisualBadge(instance), 'dev');
  assert.equal(dockerInstanceRuntimeSummary(instance), 'my-runtime:dev');
});

test('channel instance chips show matched concrete release without channel text', () => {
  assert.equal(
    instanceVisualBadge({
      versionTag: 'ready',
      runtimeBranch: 'ready',
      matchedReleaseTag: 'v1.20'
    }),
    '1.20'
  );

  assert.equal(
    instanceVisualBadge({
      versionTag: 'latest',
      runtimeBranch: 'ready',
      matchedReleaseTag: 'v1.20'
    }),
    '1.20'
  );
});

test('instance visual color stays stable when the badge changes', () => {
  const first = createInstanceVisual('RFC', { badge: 'ready', seed: 'abc123' });
  const next = createInstanceVisual('RFC', { badge: '2.0', seed: 'abc123' });

  assert.equal(
    first.style.getPropertyValue('--dm-version-fg'),
    next.style.getPropertyValue('--dm-version-fg')
  );
  assert.equal(first.children[1].textContent, 'ready');
  assert.equal(next.children[1].textContent, '2.0');
});

test('version-like instance names use compact visual text', () => {
  assert.equal(createInstanceVisual('agent-zero').className.includes('is-compact'), false);
  assert.equal(createInstanceVisual('agent-zero-v2.0').className.includes('is-compact'), true);
});

test('instances without a health version retain image provenance as fallback', () => {
  assert.equal(
    instanceVisualBadge({
      imageRef: 'agent0ai/agent-zero:v2.0',
      runtimeBranch: 'ready'
    }),
    '2.0'
  );

  assert.equal(
    dockerInstanceRuntimeSummary({
      imageRef: 'agent0ai/agent-zero:v2.0',
      runtimeBranch: 'ready',
      runtimeShortCommit: '5c914bc49ebd'
    }),
    'ready @ 5c914bc49ebd'
  );
});

test('instance chips fall back to runtime branch without a concrete release', () => {
  assert.equal(
    instanceVisualBadge({
      versionTag: 'latest',
      runtimeBranch: 'ready'
    }),
    'ready'
  );
});

test('instance update model compares runtime version with latest available release', () => {
  const state = {
    versions: [
      { id: 'latest', displayVersion: 'latest' },
      { id: 'v2.1', displayVersion: '2.1' },
      { id: 'v2.2', displayVersion: '2.2' },
      { id: 'ready', displayVersion: 'ready' }
    ]
  };

  assert.equal(latestAvailableReleaseTag(state), 'v2.2');
  assert.deepEqual(
    instanceUpdateModel({
      runtimeTag: 'v2.0',
      matchedReleaseTag: 'v1.20',
      versionTag: 'ready'
    }, state),
    {
      available: true,
      currentTag: 'v2.0',
      latestTag: 'v2.2',
      latestLabel: '2.2'
    }
  );
  assert.equal(instanceUpdateModel({ runtimeTag: 'v2.2' }, state).available, false);
});

test('instance update model uses matched channel release when runtime tag is missing', () => {
  assert.equal(
    instanceUpdateModel({
      versionTag: 'latest',
      matchedReleaseTag: 'v2.0'
    }, {
      versions: [{ id: 'v2.2', displayVersion: '2.2' }]
    }).available,
    true
  );
});

test('health runtime release prevents stale image provenance from offering an update', () => {
  assert.equal(
    instanceUpdateModel({
      versionTag: 'ready',
      matchedReleaseTag: 'v2.0',
      runtimeTag: 'v2.4',
      runtimeVersion: 'v2.4+18',
      runtimeBranch: 'ready'
    }, {
      versions: [{ id: 'v2.4', displayVersion: '2.4' }]
    }).available,
    false
  );
});

test('instance power menu switches between stop and start', () => {
  assert.deepEqual(
    instancePowerMenuConfig({
      isRunning: true,
      canStart: false,
      containerId: 'abc123',
      containerOperationRunning: false
    }),
    {
      action: 'stop',
      icon: 'stop_circle',
      label: 'Stop',
      disabled: false,
      title: 'Stop this instance'
    }
  );

  assert.deepEqual(
    instancePowerMenuConfig({
      isRunning: false,
      canStart: true,
      canStop: false,
      containerId: 'abc123',
      containerOperationRunning: false
    }),
    {
      action: 'start',
      icon: 'play_arrow',
      label: 'Start',
      disabled: false,
      title: 'Start this instance'
    }
  );
});

test('instance power menu allows stop while start is waiting for UI', () => {
  assert.deepEqual(
    instancePowerMenuConfig({
      isRunning: false,
      canStart: true,
      canStop: true,
      containerId: 'abc123',
      containerOperationRunning: true
    }),
    {
      action: 'stop',
      icon: 'stop_circle',
      label: 'Stop',
      disabled: false,
      title: 'Stop this starting instance'
    }
  );
});

test('background operation labels use running progress messages', () => {
  assert.equal(
    backgroundOperationLabel({ type: 'start', status: 'running', message: 'Waiting for UI' }),
    'Waiting for UI'
  );
  assert.equal(
    backgroundOperationLabel({ type: 'start', status: 'queued', message: 'Waiting for UI' }),
    'Queued start'
  );
  assert.equal(
    backgroundOperationLabel({ type: 'start', status: 'running', message: '' }),
    'Starting'
  );
});

test('delete dialog storage model exposes folder choices and platform opener labels', () => {
  assert.equal(storageOpenButtonLabel('darwin'), 'Open in Finder');
  assert.equal(storageOpenButtonLabel('win32'), 'Open in Explorer');
  assert.equal(storageOpenButtonLabel('linux'), 'Open folder');

  assert.deepEqual(
    deleteInstanceStorageModel({
      workspaceStorage: {
        persistent: true,
        hostPath: '/home/ada/agent-zero/brave-ada'
      }
    }, {
      runtime: { platform: 'darwin' }
    }),
    {
      hasStorageChoice: true,
      canOpenStorage: true,
      storageKind: 'folder',
      storageValue: '/home/ada/agent-zero/brave-ada',
      keepLabel: 'Keep folder',
      deleteStorageLabel: 'Delete folder',
      openLabel: 'Open in Finder'
    }
  );
});

test('delete dialog storage model handles Docker volumes without file-manager action', () => {
  assert.deepEqual(
    deleteInstanceStorageModel({
      workspaceStorage: {
        persistent: true,
        volumeName: 'a0-launcher-brave-ada-usr'
      }
    }, {
      runtime: { platform: 'linux' }
    }),
    {
      hasStorageChoice: true,
      canOpenStorage: false,
      storageKind: 'volume',
      storageValue: 'a0-launcher-brave-ada-usr',
      keepLabel: 'Keep volume',
      deleteStorageLabel: 'Delete volume',
      openLabel: 'Open folder'
    }
  );

  assert.equal(deleteInstanceStorageModel({ workspaceStorage: { persistent: false } }).hasStorageChoice, false);
});

test('repo-mounted workspaces can open without offering destructive storage cleanup', () => {
  const instance = {
    workspaceStorage: {
      mode: 'custom_mount',
      persistent: true,
      hostPath: '/home/ada/agent-zero/usr'
    }
  };
  assert.equal(workspaceStorageFolderAvailable(instance), true);
  assert.equal(deleteInstanceStorageModel(instance).hasStorageChoice, false);
});

test('openable card header binds click and keyboard activation', () => {
  const attrs = {};
  const listeners = new Map();
  let opened = 0;
  let prevented = false;
  const header = {
    classList: fakeClassList(),
    setAttribute: (name, value) => { attrs[name] = String(value); },
    addEventListener: (type, handler) => { listeners.set(type, handler); }
  };

  bindOpenableCardHeader(header, () => { opened += 1; }, {
    title: 'Open this instance',
    ariaLabel: 'Open Main'
  });

  assert.equal(header.classList.contains('dm-card-open-header'), true);
  assert.equal(header.tabIndex, 0);
  assert.equal(header.title, 'Open this instance');
  assert.equal(attrs.role, 'button');
  assert.equal(attrs['aria-label'], 'Open Main');

  listeners.get('click')?.({});
  listeners.get('keydown')?.({ key: 'Enter', preventDefault: () => { prevented = true; } });
  listeners.get('keydown')?.({ key: 'Escape', preventDefault: () => { throw new Error('Escape should not open'); } });

  assert.equal(opened, 2);
  assert.equal(prevented, true);
});

test('empty Instances state opens local creation after first inventory', () => {
  assert.deepEqual(
    emptyInstancesStateModel({ stateLoaded: false, loading: true, containers: [], remoteInstances: [] }),
    {
      kind: 'checking',
      message: 'Checking Instances...'
    }
  );

  assert.deepEqual(
    emptyInstancesStateModel({
      stateLoaded: true,
      loading: false,
      containers: [],
      remoteInstances: [],
      versions: [{ id: 'latest', availability: 'available', installability: 'installable' }]
    }),
    {
      kind: 'create_local',
      title: 'No Instances yet',
      detail: 'Create a local or remote Agent Zero Instance.',
      actionLabel: 'Create local Instance',
      disabled: false,
      actionTitle: 'Create a local Instance'
    }
  );

  assert.equal(
    emptyInstancesStateModel({ stateLoaded: true, containers: [{ containerId: 'abc' }], remoteInstances: [] }),
    null
  );
  assert.equal(
    emptyInstancesStateModel({ stateLoaded: true, containers: [], remoteInstances: [{ id: 'remote' }] }),
    null
  );
  assert.equal(
    emptyInstancesStateModel({
      stateLoaded: true,
      containers: [],
      remoteInstances: [],
      progress: { status: 'running' },
      versions: [{ id: 'latest', availability: 'available', installability: 'installable' }]
    }).disabled,
    true
  );
  assert.equal(
    emptyInstancesStateModel({
      stateLoaded: true,
      containers: [],
      remoteInstances: [],
      progress: { status: 'running', presentation: 'toast' },
      versions: [{ id: 'latest', availability: 'available', installability: 'installable' }]
    }).disabled,
    false
  );
});

test('toast progress does not change the Instance card render key', () => {
  const baseState = {
    stateLoaded: true,
    loading: false,
    containers: [{ containerId: 'abc', state: 'running', instanceName: 'Main' }],
    remoteInstances: [],
    backgroundOperations: [],
    cli: { installed: true, command: 'a0' }
  };

  assert.equal(
    isBlockingOperationRunning({ progress: { status: 'running', presentation: 'toast' } }),
    false
  );
  assert.equal(
    isBlockingOperationRunning({ progress: { status: 'running' } }),
    true
  );
  assert.equal(
    localCardsRenderKey({ ...baseState, progress: { status: 'running', presentation: 'toast', progress: 10 } }),
    localCardsRenderKey({ ...baseState, progress: { status: 'running', presentation: 'toast', progress: 80 } })
  );
  assert.notEqual(
    localCardsRenderKey(baseState),
    localCardsRenderKey({ ...baseState, progress: { status: 'running' } })
  );
});

test('remote instance status labels health states', () => {
  assert.deepEqual(remoteInstanceStatusModel({ health: { status: 'online' } }), {
    className: 'status-online',
    label: 'Online',
    title: 'Remote health check is online'
  });
  assert.equal(remoteInstanceStatusModel({ health: { status: 'offline', error: 'ECONNREFUSED' } }).label, 'Offline');
  assert.equal(remoteInstanceStatusModel({ health: { status: 'checking' } }).label, 'Checking');
  assert.equal(remoteInstanceStatusModel({}).label, 'Checking');
});

test('remote CLI menu opens saved remote target when CLI is installed', async () => {
  const calls = [];
  window.dockerManagerActions = {
    openCliTerminal: (target) => calls.push(target),
    installCli: () => calls.push('install')
  };

  const config = remoteCliMenuConfig({ id: 'remote-1' }, { cli: { installed: true } });
  assert.equal(config.icon, 'terminal');
  assert.equal(config.label, 'Open A0 CLI');
  assert.equal(config.disabled, false);

  await config.onSelect();

  assert.deepEqual(calls, [{ kind: 'remote', instanceId: 'remote-1' }]);
});

test('remote CLI menu uses installer when CLI is missing', async () => {
  const calls = [];
  window.dockerManagerActions = {
    openCliTerminal: (target) => calls.push(target),
    installCli: () => calls.push('install')
  };

  const config = remoteCliMenuConfig({ id: 'remote-1' }, { cli: { installed: false } });
  assert.equal(config.icon, 'download');
  assert.equal(config.label, 'Install A0 CLI');
  assert.equal(config.disabled, false);

  await config.onSelect();

  assert.deepEqual(calls, ['install']);
});

test('remote CLI menu disables opening without a saved remote id or during blocking work', () => {
  assert.equal(
    remoteCliMenuConfig({}, { cli: { installed: true } }).disabled,
    true
  );
  assert.equal(
    remoteCliMenuConfig({ id: 'remote-1' }, {
      cli: { installed: true },
      progress: { status: 'running' }
    }).disabled,
    true
  );
});

test('card menu placement reserves fixed bottom chrome in short windows', () => {
  const placement = computeCardMenuPlacement({
    triggerRect: { top: 500, right: 590, bottom: 532 },
    popoverWidth: 184,
    popoverHeight: 340,
    viewportWidth: 1024,
    viewportHeight: 650,
    footerHeight: 48
  });

  assert.equal(placement.openDown, false);
  assert.ok(placement.top >= 12);
  assert.ok(placement.top + placement.maxHeight <= 650 - 48 - 12);
});

test('card menu placement clamps horizontal overflow', () => {
  const placement = computeCardMenuPlacement({
    triggerRect: { top: 120, right: 86, bottom: 152 },
    popoverWidth: 220,
    popoverHeight: 180,
    viewportWidth: 260,
    viewportHeight: 520,
    footerHeight: 0
  });

  assert.equal(placement.left, 12);
  assert.ok(placement.left + 220 <= 260 - 12);
});

test('card menu is positioned while hidden before it opens', () => {
  window.innerWidth = 720;
  window.innerHeight = 520;

  const menuClasses = fakeClassList(['dm-card-menu']);
  const cardClasses = fakeClassList(['dm-card']);
  const triggerAttributes = {};
  let measuredWhileHidden = false;

  const trigger = {
    setAttribute: (name, value) => { triggerAttributes[name] = String(value); },
    getBoundingClientRect: () => ({ top: 360, right: 620, bottom: 392 })
  };
  const popover = {
    style: {},
    scrollWidth: 184,
    scrollHeight: 260,
    getBoundingClientRect: () => {
      measuredWhileHidden = true;
      assert.equal(menuClasses.contains('measuring'), true);
      assert.equal(menuClasses.contains('open'), false);
      return { width: 184, height: 260 };
    }
  };
  const card = { classList: cardClasses };
  const menu = {
    classList: menuClasses,
    closest: (selector) => selector === '.dm-card' ? card : null,
    querySelector: (selector) => {
      if (selector === '.dm-card-menu-trigger') return trigger;
      if (selector === '.dm-card-menu-popover') return popover;
      return null;
    }
  };

  openCardMenu(menu, trigger);

  assert.equal(measuredWhileHidden, true);
  assert.equal(menuClasses.contains('measuring'), false);
  assert.equal(menuClasses.contains('open'), true);
  assert.equal(cardClasses.contains('menu-open'), true);
  assert.equal(triggerAttributes['aria-expanded'], 'true');
  assert.match(popover.style.left, /^\d+px$/);
  assert.match(popover.style.top, /^\d+px$/);
  assert.match(popover.style.maxHeight, /^\d+px$/);
});

test('card menu stays hidden until fixed coordinates settle', () => {
  window.innerWidth = 720;
  window.innerHeight = 520;

  const scheduledFrames = [];
  window.requestAnimationFrame = (callback) => {
    scheduledFrames.push(callback);
    return scheduledFrames.length;
  };

  try {
    const menuClasses = fakeClassList(['dm-card-menu']);
    const cardClasses = fakeClassList(['dm-card']);
    const triggerAttributes = {};
    const trigger = {
      setAttribute: (name, value) => { triggerAttributes[name] = String(value); },
      getBoundingClientRect: () => ({ top: 360, right: 620, bottom: 392 })
    };
    let settlingReads = 0;
    const popover = {
      style: {},
      scrollWidth: 184,
      scrollHeight: 260,
      getBoundingClientRect: () => {
        const left = Number.parseFloat(popover.style.left) || 0;
        const top = Number.parseFloat(popover.style.top) || 0;
        if (menuClasses.contains('settling')) {
          settlingReads += 1;
          if (settlingReads <= 2) return { left: left + 17, top: top - 211, width: 184, height: 260 };
          return { left, top, width: 184, height: 260 };
        }
        return { width: 184, height: 260 };
      }
    };
    const card = { classList: cardClasses };
    const menu = {
      classList: menuClasses,
      closest: (selector) => selector === '.dm-card' ? card : null,
      querySelector: (selector) => {
        if (selector === '.dm-card-menu-trigger') return trigger;
        if (selector === '.dm-card-menu-popover') return popover;
        return null;
      }
    };

    openCardMenu(menu, trigger);

    assert.equal(menuClasses.contains('measuring'), false);
    assert.equal(menuClasses.contains('settling'), true);
    assert.equal(menuClasses.contains('open'), true);
    assert.equal(cardClasses.contains('menu-open'), true);
    assert.equal(triggerAttributes['aria-expanded'], 'true');
    assert.equal(scheduledFrames.length, 1);

    scheduledFrames.shift()();

    assert.equal(menuClasses.contains('settling'), true);
    assert.equal(menuClasses.contains('open'), true);
    assert.equal(scheduledFrames.length, 1);

    scheduledFrames.shift()();

    assert.equal(menuClasses.contains('settling'), true);
    assert.equal(menuClasses.contains('open'), true);
    assert.equal(scheduledFrames.length, 1);

    scheduledFrames.shift()();

    assert.equal(menuClasses.contains('settling'), false);
    assert.equal(menuClasses.contains('measuring'), false);
    assert.equal(menuClasses.contains('open'), true);
    assert.equal(triggerAttributes['aria-expanded'], 'true');
  } finally {
    delete window.requestAnimationFrame;
  }
});
