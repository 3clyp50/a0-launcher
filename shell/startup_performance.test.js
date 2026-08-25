const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const mainSource = fs.readFileSync(path.join(__dirname, 'main.js'), 'utf8');
const loadingSource = fs.readFileSync(path.join(__dirname, 'loading.html'), 'utf8');
const rendererSource = fs.readFileSync(path.join(__dirname, '..', 'app', 'docker_manager.js'), 'utf8');

test('startup keeps splash timing bounded and remote freshness off the critical path', () => {
  const entryMs = Number(mainSource.match(/SPLASH_ENTRY_ANIMATION_MS = (\d+)/)?.[1]);
  const exitMs = Number(mainSource.match(/SPLASH_EXIT_ANIMATION_MS = (\d+)/)?.[1]);
  assert.equal(loadingSource.includes(`splash-open ${entryMs}ms`), true);
  assert.equal(loadingSource.includes(`splash-close ${exitMs}ms`), true);
  assert.ok(entryMs + exitMs <= 750);

  const lifecycle = mainSource.slice(mainSource.indexOf('app.whenReady()'), mainSource.indexOf("app.on('window-all-closed'"));
  assert.doesNotMatch(lifecycle, /setTimeout|delayMs/);
  assert.match(lifecycle, /await createWindow\(\)/);
  assert.match(rendererSource, /await refresh\(\{ forceRefresh: false \}\)/);
  assert.match(rendererSource, /!Number\.isFinite\(initialSyncMs\) \|\| initialSyncMs < refreshStartedAt/);
  assert.match(rendererSource, /dockerManagerAPI\?\.refresh\?\.\(\{ forceRefresh: true \}\)/);
});
