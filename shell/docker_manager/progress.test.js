const assert = require('node:assert/strict');
const { test } = require('node:test');

const { runtimeKind, runtimeSetupProgressPatch, imagePullProgressPatch } = require('./progress');

function activeStep(progress) {
  return progress.steps.find((step) => ['running', 'failed', 'canceled'].includes(step.status)) || null;
}

test('runtime progress normalizes Linux Docker Engine setup phases', () => {
  const assessment = { state: 'not_provisioned', packageManager: 'apt' };

  const installing = runtimeSetupProgressPatch(assessment, 'Installing Docker Engine');
  assert.equal(runtimeKind(assessment), 'linux');
  assert.equal(installing.headline, 'Setup Agent Zero');
  assert.equal(installing.phase, 'install_engine');
  assert.equal(activeStep(installing)?.label, 'Installing Docker Engine');
  assert.equal(installing.indeterminate, true);

  const access = runtimeSetupProgressPatch(assessment, 'Checking Docker access');
  assert.equal(access.phase, 'check_access');
  assert.equal(activeStep(access)?.label, 'Checking Docker access');
});

test('runtime progress normalizes Windows WSL setup phases', () => {
  const assessment = { state: 'not_provisioned', mode: 'wsl_feature' };

  const approval = runtimeSetupProgressPatch(assessment, 'Requesting Windows approval');
  assert.equal(runtimeKind(assessment), 'windows_wsl');
  assert.equal(approval.phase, 'windows_approval');
  assert.equal(activeStep(approval)?.label, 'Requesting Windows approval');

  const bridge = runtimeSetupProgressPatch({ mode: 'wsl_engine' }, 'Starting local Docker bridge');
  assert.equal(bridge.phase, 'start_bridge');
  assert.equal(activeStep(bridge)?.label, 'Starting local Docker bridge');
});

test('runtime progress normalizes Docker Desktop start phases', () => {
  const assessment = { state: 'engine_stopped', mode: 'docker_desktop' };

  const waiting = runtimeSetupProgressPatch(assessment, 'Waiting for Docker Desktop');
  assert.equal(runtimeKind(assessment), 'docker_desktop');
  assert.equal(waiting.phase, 'wait_desktop');
  assert.equal(activeStep(waiting)?.label, 'Waiting for Docker Desktop');

  const ready = runtimeSetupProgressPatch(assessment, 'Runtime ready', 100, 'completed');
  assert.equal(ready.phase, 'ready');
  assert.equal(ready.progress, 100);
  assert.equal(ready.indeterminate, false);
  assert.ok(ready.steps.every((step) => step.status === 'done'));
});

test('runtime progress normalizes macOS Colima setup phases', () => {
  const assessment = { state: 'not_provisioned', mode: 'colima' };

  const download = runtimeSetupProgressPatch(assessment, 'Downloading runtime components');
  assert.equal(runtimeKind(assessment), 'macos_colima');
  assert.equal(download.phase, 'download_components');
  assert.equal(activeStep(download)?.label, 'Downloading runtime components');

  const messages = [
    ['Finding runtime components', 'find_components'],
    ['Downloading Docker client', 'prepare_client'],
    ['Installing Docker client', 'prepare_client'],
    ['Downloading runtime components', 'download_components'],
    ['Installing runtime components', 'install_components'],
    ['Starting the runtime', 'start_runtime'],
    ['Downloading runtime components', 'start_runtime'],
    ['Preparing the runtime', 'start_runtime'],
    ['Starting Docker Engine', 'start_runtime'],
    ['Checking Docker Engine', 'verify_runtime']
  ];
  let previousIndex = -1;
  for (const [message, phase] of messages) {
    const patch = runtimeSetupProgressPatch(assessment, message, null, 'running', { phase });
    assert.equal(activeStep(patch)?.id, phase);
    const index = patch.steps.findIndex((step) => step.status === 'running');
    assert.ok(index >= previousIndex);
    previousIndex = index;
  }
  const failed = runtimeSetupProgressPatch(assessment, 'The runtime could not be started.', null, 'failed', { previous: { phase: 'start_runtime' } });
  assert.equal(activeStep(failed)?.id, 'start_runtime');
});

test('runtime download byte updates retain their step and installation clears 100 percent', () => {
  const assessment = { mode: 'colima', detail: 'Install Colima to run Agent Zero.' };
  for (const [message, phase] of [
    ['Downloading Docker client', 'prepare_client'],
    ['Downloading runtime components', 'download_components']
  ]) {
    let previous = runtimeSetupProgressPatch(assessment, message, null, 'running', { phase });
    for (const percent of [0, 45, 100, 0, 75, 100]) {
      previous = runtimeSetupProgressPatch(assessment, null, percent, 'running', { previous });
      assert.equal(previous.phase, phase);
      assert.equal(previous.detail, message);
      assert.equal(previous.progress, percent);
      assert.equal(activeStep(previous)?.id, phase);
    }
    const installing = runtimeSetupProgressPatch(assessment, 'Installing runtime components', null, 'running', { previous });
    assert.equal(installing.progress, null);
    assert.equal(installing.indeterminate, true);
    assert.equal(installing.phase, 'install_components');
  }
});

test('image pulls switch percentage and ETA baseline from download to extraction', () => {
  const now = Date.parse('2026-09-07T12:00:00Z');
  for (const suffix of ['', ' custom image']) {
    const downloading = imagePullProgressPatch({ downloadProgress: 80, extractProgress: 20 }, {}, suffix, now);
    assert.equal(downloading.progress, 80);
    const extracting = imagePullProgressPatch({ downloadProgress: 100, extractProgress: 40 }, downloading, suffix, now + 60_000);
    assert.equal(extracting.message, `Extracting${suffix}`);
    assert.equal(extracting.progress, 40);
    assert.equal(extracting.progressStartValue, 40);
    assert.equal(extracting.progressStartedAt, new Date(now + 60_000).toISOString());
    const later = imagePullProgressPatch({ downloadProgress: 100, extractProgress: 60 }, extracting, suffix, now + 120_000);
    assert.equal(later.progress, 60);
    assert.equal(later.progressStartValue, 40);
    assert.equal(later.progressStartedAt, extracting.progressStartedAt);
    const done = imagePullProgressPatch({ downloadProgress: 100, extractProgress: 100 }, later, suffix);
    assert.equal(done.message, `Extracting${suffix}`);
    const unknown = imagePullProgressPatch({ downloadProgress: 100 }, downloading, suffix);
    assert.equal(unknown.progress, null);
  }
});
