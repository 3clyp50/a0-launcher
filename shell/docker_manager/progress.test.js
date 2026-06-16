const assert = require('node:assert/strict');
const { test } = require('node:test');

const { runtimeKind, runtimeSetupProgressPatch } = require('./progress');

function activeStep(progress) {
  return progress.steps.find((step) => ['running', 'failed', 'canceled'].includes(step.status)) || null;
}

test('runtime progress normalizes Linux Docker Engine setup phases', () => {
  const assessment = { state: 'not_provisioned', packageManager: 'apt' };

  const installing = runtimeSetupProgressPatch(assessment, 'Installing Docker Engine');
  assert.equal(runtimeKind(assessment), 'linux');
  assert.equal(installing.headline, 'Setting up Agent Zero');
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

  const engine = runtimeSetupProgressPatch(assessment, 'Starting Docker Engine');
  assert.equal(engine.phase, 'start_engine');
  assert.equal(activeStep(engine)?.label, 'Starting Docker Engine');
});
