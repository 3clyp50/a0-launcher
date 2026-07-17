import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

test('component markup mounts before component modules execute', async () => {
  const source = await readFile(new URL('./components.js', import.meta.url), 'utf8');
  const mountMarkup = source.indexOf('targetElement.appendChild(node.cloneNode(true));');
  const awaitModules = source.indexOf('await Promise.all(loadPromises);');

  assert.ok(mountMarkup >= 0 && mountMarkup < awaitModules);
});
