const assert = require('node:assert/strict');
const { test } = require('node:test');

const { runtimeAssessmentDetail, runtimeKind, runtimeSetupProgressPatch } = require('./progress');

function activeStep(progress) {
  return progress.steps.find((step) => ['running', 'failed', 'canceled'].includes(step.status)) || null;
}

test('runtime progress translates Linux setup mechanics into plain product copy', () => {
  const assessment = { state: 'not_provisioned', packageManager: 'apt' };

  const installing = runtimeSetupProgressPatch(assessment, 'Installing Docker Engine');
  assert.equal(runtimeKind(assessment), 'linux');
  assert.equal(installing.headline, 'Preparing Agent Zero');
  assert.equal(installing.phase, 'install_engine');
  assert.equal(installing.detail, 'Installing required files');
  assert.equal(activeStep(installing)?.label, 'Installing required files');
  assert.equal(installing.indeterminate, true);

  const access = runtimeSetupProgressPatch(assessment, 'Checking Docker access');
  assert.equal(access.phase, 'check_access');
  assert.equal(access.detail, 'Checking system access');
  assert.equal(activeStep(access)?.label, 'Checking system access');
});

test('runtime progress translates Windows setup mechanics into plain product copy', () => {
  const assessment = { state: 'not_provisioned', mode: 'wsl_feature' };

  const approval = runtimeSetupProgressPatch(assessment, 'Requesting Windows approval');
  assert.equal(runtimeKind(assessment), 'windows_wsl');
  assert.equal(approval.phase, 'windows_approval');
  assert.equal(activeStep(approval)?.label, 'Waiting for Windows approval');

  const bridge = runtimeSetupProgressPatch({ mode: 'wsl_engine' }, 'Starting local Docker bridge');
  assert.equal(bridge.phase, 'start_bridge');
  assert.equal(bridge.detail, 'Connecting Agent Zero');
  assert.equal(activeStep(bridge)?.label, 'Connecting Agent Zero');

  const download = runtimeSetupProgressPatch({ mode: 'wsl_distribution' }, 'Downloading Agent Zero runtime');
  assert.equal(download.phase, 'download_runtime');
  assert.equal(download.detail, 'Downloading required files');
});

test('runtime progress normalizes Docker Desktop start phases', () => {
  const assessment = { state: 'engine_stopped', mode: 'docker_desktop' };

  const waiting = runtimeSetupProgressPatch(assessment, 'Waiting for Docker Desktop');
  assert.equal(runtimeKind(assessment), 'docker_desktop');
  assert.equal(waiting.phase, 'wait_desktop');
  assert.equal(activeStep(waiting)?.label, 'Waiting for Docker Desktop');

  const ready = runtimeSetupProgressPatch(assessment, 'Runtime ready', 100, 'completed');
  assert.equal(ready.phase, 'ready');
  assert.equal(ready.detail, 'Agent Zero is ready');
  assert.equal(ready.progress, 100);
  assert.equal(ready.indeterminate, false);
  assert.ok(ready.steps.every((step) => step.status === 'done'));
});

test('runtime progress normalizes macOS Colima setup phases', () => {
  const assessment = { state: 'not_provisioned', mode: 'colima' };

  const download = runtimeSetupProgressPatch(assessment, 'Downloading runtime components');
  assert.equal(runtimeKind(assessment), 'macos_colima');
  assert.equal(download.phase, 'download_components');
  assert.equal(download.detail, 'Downloading required files');
  assert.equal(activeStep(download)?.label, 'Downloading required files');

  const engine = runtimeSetupProgressPatch(assessment, 'Starting Docker Engine');
  assert.equal(engine.phase, 'start_engine');
  assert.equal(engine.detail, 'Connecting Agent Zero');
  assert.equal(activeStep(engine)?.label, 'Connecting Agent Zero');
});

test('runtime assessments keep actions clear without exposing normal-path internals', () => {
  assert.equal(runtimeAssessmentDetail({
    state: 'not_provisioned',
    mode: 'wsl_distribution',
    detail: 'No Docker Engine is available in WSL.'
  }, 'win32'), 'Agent Zero needs a one-time local setup. The Launcher will download and prepare it for you.');

  assert.equal(runtimeAssessmentDetail({
    state: 'needs_relogin',
    detail: 'Docker is installed, but this session cannot access the daemon.'
  }, 'linux'), 'Sign out of this computer and sign back in once, then return here to finish setup.');

  assert.equal(runtimeAssessmentDetail({
    state: 'unsupported',
    detail: 'Windows Server requires WSL 2 with nested virtualization.'
  }, 'win32'), 'Automatic setup is not available on Windows Server. Open the setup guide to complete the required server configuration.');
});

test('runtime failure copy does not surface raw setup mechanics', () => {
  const failed = runtimeSetupProgressPatch(
    { state: 'not_provisioned', mode: 'wsl_distribution' },
    'Docker daemon failed inside WSL distro AgentZeroRuntime',
    null,
    'failed'
  );

  assert.equal(failed.detail, 'Agent Zero setup did not finish. Try again or open Technical details.');
});
