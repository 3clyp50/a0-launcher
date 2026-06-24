import assert from 'node:assert/strict';
import { test } from 'node:test';

globalThis.document = {
  body: { dataset: {} },
  addEventListener: () => {},
  getElementById: () => null
};

globalThis.window = {
  __dmLastState: null,
  addEventListener: () => {},
  dockerManagerActions: {}
};

const { instanceVisualBadge } = await import('./local-testing.js');

test('channel instance chips include the matched concrete release', () => {
  assert.equal(
    instanceVisualBadge({
      versionTag: 'ready',
      runtimeBranch: 'ready',
      matchedReleaseTag: 'v1.20'
    }),
    'ready · 1.20'
  );

  assert.equal(
    instanceVisualBadge({
      versionTag: 'latest',
      runtimeBranch: 'ready',
      matchedReleaseTag: 'v1.20'
    }),
    'latest · 1.20'
  );
});

test('instance chips still prefer runtime branch without a channel release match', () => {
  assert.equal(
    instanceVisualBadge({
      versionTag: 'v1.19',
      runtimeBranch: 'ready'
    }),
    'ready'
  );
});
