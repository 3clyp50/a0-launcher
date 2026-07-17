import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const {
  INSTANCE_ICON_OPTIONS,
  instanceIconName,
  normalizedInstanceIconId
} = await import('./card-visuals.js');

test('Instance appearance offers exactly 12 bounded icon choices', () => {
  assert.equal(INSTANCE_ICON_OPTIONS.length, 12);
  assert.equal(new Set(INSTANCE_ICON_OPTIONS.map(({ id }) => id)).size, 12);
  assert.equal(normalizedInstanceIconId(' terminal '), 'terminal');
  assert.equal(normalizedInstanceIconId('not-an-icon'), '');
  assert.equal(instanceIconName('not-an-icon'), 'language');
});

test('attached and detached tabs share Colour/Icon selection and label collapse', async () => {
  const [tabs, detached, css] = await Promise.all([
    readFile(new URL('./instance-tabs/instance-tabs.js', import.meta.url), 'utf8'),
    readFile(new URL('./instance-tabs/detached.js', import.meta.url), 'utf8'),
    readFile(new URL('../../docker_manager.css', import.meta.url), 'utf8')
  ]);
  assert.match(tabs, /openInstanceAppearanceDialog/);
  assert.match(detached, /openInstanceAppearanceDialog/);
  assert.match(tabs, /label_off/);
  assert.match(css, /names-collapsed \.dm-instance-home-tab \.dm-instance-tab-title/);
});
