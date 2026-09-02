const RUNTIME_STEPS = Object.freeze({
  linux: Object.freeze([
    ['check_runtime', 'Checking this computer'],
    ['authorization', 'Waiting for system approval'],
    ['install_engine', 'Installing required files'],
    ['start_engine', 'Starting Agent Zero'],
    ['check_access', 'Checking system access'],
    ['ready', 'Agent Zero is ready']
  ]),
  windows_wsl: Object.freeze([
    ['check_runtime', 'Checking this computer'],
    ['windows_approval', 'Waiting for Windows approval'],
    ['enable_wsl', 'Preparing Windows'],
    ['follow_up', 'Waiting for Windows restart'],
    ['download_runtime', 'Downloading required files'],
    ['install_runtime', 'Installing required files'],
    ['start_wsl_engine', 'Starting Agent Zero'],
    ['start_bridge', 'Connecting Agent Zero'],
    ['ready', 'Agent Zero is ready']
  ]),
  docker_desktop: Object.freeze([
    ['desktop_stopped', 'Docker Desktop is installed but not running'],
    ['start_desktop', 'Starting Docker Desktop'],
    ['wait_desktop', 'Waiting for Docker Desktop'],
    ['ready', 'Agent Zero is ready']
  ]),
  macos_colima: Object.freeze([
    ['find_components', 'Checking required components'],
    ['download_components', 'Downloading required files'],
    ['install_components', 'Installing required files'],
    ['start_runtime', 'Starting Agent Zero'],
    ['start_engine', 'Connecting Agent Zero'],
    ['ready', 'Agent Zero is ready']
  ]),
  generic: Object.freeze([
    ['check_runtime', 'Checking this computer'],
    ['setup_runtime', 'Preparing this computer'],
    ['ready', 'Agent Zero is ready']
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
    if (/download/.test(text) && /runtime/.test(text)) return 'download_runtime';
    if (/installing agent zero runtime|installing ubuntu|preparing ubuntu|installing docker engine/.test(text)) return 'install_runtime';
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

function runtimeAssessmentDetail(assessment = null, platform = process.platform) {
  const state = normalizeProgressText(assessment?.state);
  const mode = normalizeProgressText(assessment?.mode);
  const raw = normalizeProgressText(assessment?.detail);

  if (mode === 'docker_desktop' && state === 'engine_stopped') {
    return 'Docker Desktop is installed but not running. Start it to continue.';
  }
  if (state === 'ready') return 'Agent Zero is ready to run locally.';
  if (state === 'needs_group_membership') {
    return 'Agent Zero needs permission to run locally. Continue, then sign out and back in once.';
  }
  if (state === 'needs_relogin') {
    return 'Sign out of this computer and sign back in once, then return here to finish setup.';
  }
  if (state === 'engine_stopped') {
    return 'Agent Zero\'s local services are stopped. Continue to start them.';
  }
  if (state === 'not_provisioned') {
    return platform === 'win32'
      ? 'Agent Zero needs a one-time local setup. The Launcher will download and prepare it for you.'
      : 'Agent Zero needs a one-time local setup. Continue to prepare this computer.';
  }
  if (state === 'manual_install') {
    if (/docker group|user needs docker access|cannot access it yet/i.test(raw)) {
      return 'Your account needs permission to run Agent Zero locally. Complete the manual access step, sign out and back in, then refresh.';
    }
    return 'Automatic local setup is not available here. Install the required system components, then refresh.';
  }
  if (state === 'unsupported' && /windows server/i.test(raw)) {
    return 'Automatic setup is not available on Windows Server. Open the setup guide to complete the required server configuration.';
  }
  if (state === 'unsupported') {
    return 'Automatic local setup is not available on this system. Complete the setup guide, then refresh.';
  }
  return 'Agent Zero needs a one-time local setup before it can run on this computer.';
}

function runtimeProgressDetail(message, kind, phase, status = 'running') {
  const raw = normalizeProgressText(message);
  if (status === 'failed') {
    if (/\b(?:wsl|docker engine|container|image|daemon|runtime|endpoint|distro|distribution|socket|pipe)\b/i.test(raw)) {
      return 'Agent Zero setup did not finish. Try again or open Technical details.';
    }
    return raw || 'Agent Zero setup did not finish. Try again.';
  }
  if (status === 'completed' || phase === 'ready') return 'Agent Zero is ready';

  const copy = {
    check_runtime: 'Checking this computer',
    authorization: 'Waiting for system approval',
    windows_approval: 'Waiting for Windows approval',
    enable_wsl: 'Preparing Windows',
    follow_up: 'Restart Windows if prompted. Setup will continue when you return.',
    download_runtime: 'Downloading required files',
    install_runtime: 'Installing required files',
    install_engine: 'Installing required files',
    start_wsl_engine: 'Starting Agent Zero',
    start_runtime: 'Starting Agent Zero',
    start_engine: kind === 'macos_colima' ? 'Connecting Agent Zero' : 'Starting Agent Zero',
    start_bridge: 'Connecting Agent Zero',
    check_access: 'Checking system access',
    find_components: 'Checking required components',
    download_components: 'Downloading required files',
    install_components: 'Installing required files',
    setup_runtime: 'Preparing this computer',
    desktop_stopped: 'Docker Desktop is installed but not running',
    start_desktop: 'Starting Docker Desktop',
    wait_desktop: 'Waiting for Docker Desktop'
  };
  return copy[phase] || 'Preparing Agent Zero';
}

function runtimeSetupProgressPatch(assessment = null, message = '', progress = null, status = 'running') {
  const kind = runtimeKind(assessment);
  const rawDetail = normalizeProgressText(message) || normalizeProgressText(assessment?.detail);
  const phase = phaseForMessage(rawDetail, kind) || (status === 'completed' ? 'ready' : '');
  const detail = runtimeProgressDetail(rawDetail, kind, phase, status);
  const numericProgress = clampProgress(progress);
  const patch = {
    headline: status === 'completed' ? 'Agent Zero is ready' : 'Preparing Agent Zero',
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
  runtimeAssessmentDetail,
  runtimeProgressDetail,
  runtimeSetupProgressPatch
};
