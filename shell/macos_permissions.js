function macAccessibilityPermissionMessage({ isPackaged = true } = {}) {
  return isPackaged
    ? 'Allow Agent Zero Launcher in macOS Accessibility settings.'
    : 'Allow Electron (this Launcher dev build) in macOS Accessibility settings.';
}

function macScreenRecordingPermissionMessage({ isPackaged = true } = {}) {
  return isPackaged
    ? 'Allow Agent Zero Launcher in macOS Screen Recording settings.'
    : 'Allow Electron (this Launcher dev build) in macOS Screen Recording settings.';
}

function localizeMacPermissionStatus(status = {}, { isPackaged = true } = {}) {
  const setup = status?.gateway?.status?.computer_use?.setup;
  const state = String(setup?.state || '').trim().toLowerCase();
  const message = state === 'accessibility_required'
    ? macAccessibilityPermissionMessage({ isPackaged })
    : state === 'screen_recording_required'
      ? macScreenRecordingPermissionMessage({ isPackaged })
      : '';
  if (!message) return status;
  return {
    ...status,
    gateway: {
      ...status.gateway,
      status: {
        ...status.gateway.status,
        computer_use: {
          ...status.gateway.status.computer_use,
          setup: {
            ...setup,
            message
          }
        }
      }
    }
  };
}

async function ensureMacAccessibilityPermission(systemPreferences, {
  prompt = false,
  timeoutMs = 120000,
  pollIntervalMs = 500,
  wait = (delay) => new Promise((resolve) => setTimeout(resolve, delay)),
  onPrompt = () => {}
} = {}) {
  const trusted = (shouldPrompt) => {
    try {
      return systemPreferences?.isTrustedAccessibilityClient?.(shouldPrompt) === true;
    } catch {
      return false;
    }
  };
  if (trusted(false)) return { granted: true, prompted: false };
  if (!prompt) return { granted: false, prompted: false };

  onPrompt();
  if (trusted(true)) return { granted: true, prompted: true };
  const deadline = Date.now() + Math.max(0, Number(timeoutMs) || 0);
  while (Date.now() < deadline) {
    await wait(Math.max(10, Number(pollIntervalMs) || 500));
    if (trusted(false)) return { granted: true, prompted: true };
  }
  return { granted: false, prompted: true };
}

module.exports = {
  ensureMacAccessibilityPermission,
  localizeMacPermissionStatus,
  macAccessibilityPermissionMessage,
  macScreenRecordingPermissionMessage
};
