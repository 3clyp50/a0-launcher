const RUNTIME_STEPS = Object.freeze({
  linux: Object.freeze([
    ['check_runtime', 'Checking Docker Engine'],
    ['authorization', 'Requesting system authorization'],
    ['install_engine', 'Installing Docker Engine'],
    ['start_engine', 'Starting Docker Engine'],
    ['check_access', 'Checking Docker access'],
    ['ready', 'Runtime ready']
  ]),
  windows_wsl: Object.freeze([
    ['check_runtime', 'Checking Windows runtime'],
    ['windows_approval', 'Requesting Windows approval'],
    ['enable_wsl', 'Enabling WSL features'],
    ['follow_up', 'Waiting for restart or follow-up'],
    ['install_ubuntu', 'Installing Ubuntu'],
    ['prepare_ubuntu', 'Preparing Ubuntu'],
    ['install_engine', 'Installing Docker Engine in WSL'],
    ['start_wsl_engine', 'Starting Docker Engine in WSL'],
    ['start_bridge', 'Starting local Docker bridge'],
    ['ready', 'Runtime ready']
  ]),
  docker_desktop: Object.freeze([
    ['desktop_stopped', 'Docker Desktop is installed but not running'],
    ['start_desktop', 'Starting Docker Desktop'],
    ['wait_desktop', 'Waiting for Docker Desktop'],
    ['ready', 'Runtime ready']
  ]),
  macos_colima: Object.freeze([
    ['find_components', 'Finding runtime components'],
    ['download_components', 'Downloading runtime components'],
    ['install_components', 'Installing runtime components'],
    ['start_runtime', 'Starting Agent Zero runtime'],
    ['start_engine', 'Starting Docker Engine'],
    ['ready', 'Runtime ready']
  ]),
  generic: Object.freeze([
    ['check_runtime', 'Checking runtime'],
    ['setup_runtime', 'Runtime Setup'],
    ['ready', 'Runtime ready']
  ])
});

function runtimeKind(assessment = null, platform = process.platform) {
  const mode = typeof assessment?.mode === 'string' ? assessment.mode : '';
  if (mode === 'docker_desktop') return 'docker_desktop';
  if (mode === 'wsl_feature' || mode === 'wsl_distribution' || mode === 'wsl_engine' || mode === 'wsl_bridge_dependency') {
    return 'windows_wsl';
  }
  if (mode === 'colima') return 'macos_colima';
  if (assessment?.packageManager) return 'linux';
  if (platform === 'win32') return 'windows_wsl';
  if (platform === 'darwin') return 'macos_colima';
  if (platform === 'linux') return 'linux';
  return 'generic';
}

function normalizeProgressText(value) {
  return String(value || '').trim();
}

function phaseForMessage(message, kind) {
  const text = normalizeProgressText(message).toLowerCase();
  if (!text) return '';
  if (/runtime ready|ready|completed/.test(text)) return 'ready';
  if (/checking/.test(text) && /access/.test(text)) return 'check_access';
  if (/checking/.test(text)) return 'check_runtime';

  if (kind === 'docker_desktop') {
    if (/not running|installed but/.test(text)) return 'desktop_stopped';
    if (/starting docker desktop/.test(text)) return 'start_desktop';
    if (/waiting for docker desktop/.test(text)) return 'wait_desktop';
  }

  if (kind === 'windows_wsl') {
    if (/requesting windows approval/.test(text)) return 'windows_approval';
    if (/enabl/.test(text) && /wsl/.test(text)) return 'enable_wsl';
    if (/restart|follow-up|followup/.test(text)) return 'follow_up';
    if (/installing ubuntu/.test(text)) return 'install_ubuntu';
    if (/preparing ubuntu/.test(text)) return 'prepare_ubuntu';
    if (/installing docker engine/.test(text)) return 'install_engine';
    if (/starting wsl docker engine|starting docker engine in wsl/.test(text)) return 'start_wsl_engine';
    if (/bridge/.test(text)) return 'start_bridge';
  }

  if (kind === 'macos_colima') {
    if (/finding/.test(text)) return 'find_components';
    if (/downloading/.test(text)) return 'download_components';
    if (/installing/.test(text)) return 'install_components';
    if (/starting agent zero runtime|starting the runtime/.test(text)) return 'start_runtime';
    if (/starting docker engine/.test(text)) return 'start_engine';
  }

  if (kind === 'linux') {
    if (/authorization|authentication|approval/.test(text)) return 'authorization';
    if (/installing docker engine/.test(text)) return 'install_engine';
    if (/starting docker engine/.test(text)) return 'start_engine';
    if (/docker access|group|log out|login|relogin/.test(text)) return 'check_access';
  }

  if (/install/.test(text)) return 'setup_runtime';
  if (/start/.test(text)) return 'setup_runtime';
  return '';
}

function normalizeStepSet(kind) {
  return RUNTIME_STEPS[kind] || RUNTIME_STEPS.generic;
}

function decorateSteps(kind, phase, status = 'running') {
  const stepSet = normalizeStepSet(kind);
  const phaseIndex = phase ? stepSet.findIndex(([id]) => id === phase) : -1;
  const activeIndex = phaseIndex >= 0 ? phaseIndex : 0;

  return stepSet.map(([id, label], index) => {
    let stepStatus = 'pending';
    if (status === 'completed' || phase === 'ready') {
      stepStatus = 'done';
    } else if (status === 'failed') {
      if (index < activeIndex) stepStatus = 'done';
      else if (index === activeIndex) stepStatus = 'failed';
    } else if (status === 'canceled') {
      if (index < activeIndex) stepStatus = 'done';
      else if (index === activeIndex) stepStatus = 'canceled';
    } else if (index < activeIndex) {
      stepStatus = 'done';
    } else if (index === activeIndex) {
      stepStatus = 'running';
    }
    return { id, label, status: stepStatus };
  });
}

function clampProgress(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(100, n));
}

function runtimeSetupProgressPatch(assessment = null, message = '', progress = null, status = 'running') {
  const kind = runtimeKind(assessment);
  const detail = normalizeProgressText(message) || normalizeProgressText(assessment?.detail) || 'Preparing Agent Zero Setup.';
  const phase = phaseForMessage(detail, kind) || (status === 'completed' ? 'ready' : '');
  const numericProgress = clampProgress(progress);
  const patch = {
    headline: 'Setup Agent Zero',
    detail,
    message: detail,
    phase: phase || null,
    steps: decorateSteps(kind, phase, status),
    indeterminate: numericProgress === null && status === 'running'
  };

  if (numericProgress !== null) patch.progress = numericProgress;
  return patch;
}

module.exports = {
  runtimeKind,
  phaseForMessage,
  runtimeSetupProgressPatch
};
