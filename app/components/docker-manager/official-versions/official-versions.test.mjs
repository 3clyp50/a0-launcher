import assert from 'node:assert/strict';
import { test } from 'node:test';

globalThis.document = {
  getElementById: () => null
};

globalThis.window = {
  __dmLastState: null,
  addEventListener: () => {},
  dockerManagerActions: {}
};

const { actionForEntry, canRemoveEntry, defaultInstanceName } = await import('./official-versions.js');

test('installed active entries still expose Run for additional instances', () => {
  const action = actionForEntry({
    tag: 'latest',
    availability: 'installed',
    isActive: true,
    activeState: 'running'
  }, {});

  assert.equal(action?.label, 'Run');
  assert.equal(action?.disabled, undefined);
});

test('running operations still suppress install card actions', () => {
  const action = actionForEntry({
    tag: 'latest',
    availability: 'installing',
    isActive: true
  }, {});

  assert.equal(action, null);
});

test('installed and differing install cards can expose remove control', () => {
  assert.equal(canRemoveEntry({ availability: 'installed' }), true);
  assert.equal(canRemoveEntry({ availability: 'update_available' }), true);
  assert.equal(canRemoveEntry({ availability: 'available' }), false);
  assert.equal(canRemoveEntry({ availability: 'installing' }), false);
  assert.equal(canRemoveEntry({ availability: 'available', differsFromPublished: true }), true);
});

test('default run names increment when same-tag instances exist', () => {
  const name = defaultInstanceName('latest', {
    containers: [
      { instanceName: 'agent-zero-latest' },
      { instanceName: 'agent-zero-latest-2' }
    ]
  });

  assert.equal(name, 'agent-zero-latest-3');
});
