const childProcess = require('node:child_process');
const semver = require('semver');

const A0_CLI_INSTALL_SCRIPT_URL = 'https://raw.githubusercontent.com/agent0ai/a0-connector/main/install.sh';
const A0_CLI_INSTALL_SCRIPT_URL_WINDOWS = 'https://raw.githubusercontent.com/agent0ai/a0-connector/main/install.ps1';
const A0_CLI_RELEASE_API_URL = 'https://api.github.com/repos/agent0ai/a0-connector/releases/latest';

function normalizeA0CliVersion(value) {
  const match = String(value || '').match(/\bv?(\d+\.\d+(?:\.\d+)?)\b/i);
  return semver.coerce(match?.[1] || '')?.version || '';
}

function shouldInstallA0Cli({ installed = false, supportsGateway = false, currentVersion = '', latestVersion = '' } = {}) {
  if (!installed || !supportsGateway) return true;
  const current = normalizeA0CliVersion(currentVersion);
  const latest = normalizeA0CliVersion(latestVersion);
  return !!latest && (!current || semver.gt(latest, current));
}

function a0CliInstallCommand(platform = process.platform) {
  if (platform === 'win32') {
    return {
      command: 'powershell.exe',
      args: [
        '-NoLogo',
        '-NoProfile',
        '-ExecutionPolicy',
        'Bypass',
        '-Command',
        `$ProgressPreference = 'SilentlyContinue'; irm '${A0_CLI_INSTALL_SCRIPT_URL_WINDOWS}' | iex`
      ]
    };
  }
  if (platform === 'darwin' || platform === 'linux') {
    const script = [
      'tmp="$(mktemp "${TMPDIR:-/tmp}/a0-cli-install.XXXXXX")" || exit 1',
      'trap \'rm -f "$tmp"\' EXIT INT TERM',
      `if command -v curl >/dev/null 2>&1; then curl -LsSf '${A0_CLI_INSTALL_SCRIPT_URL}' -o "$tmp"`,
      `elif command -v wget >/dev/null 2>&1; then wget -qO "$tmp" '${A0_CLI_INSTALL_SCRIPT_URL}'`,
      'else echo "curl or wget is required to install A0 CLI." >&2; exit 127; fi',
      'sh "$tmp"'
    ].join('; ');
    return { command: 'sh', args: ['-c', script] };
  }
  const error = new Error('Installing A0 CLI is not available on this system.');
  error.code = 'TERMINAL_UNAVAILABLE';
  throw error;
}

function runA0CliInstaller({ platform = process.platform, spawn = childProcess.spawn, env = process.env } = {}) {
  const spec = a0CliInstallCommand(platform);
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (error) => {
      if (settled) return;
      settled = true;
      if (error) reject(error);
      else resolve({ installed: true });
    };

    let child;
    try {
      child = spawn(spec.command, spec.args, {
        detached: true,
        stdio: 'ignore',
        windowsHide: true,
        env
      });
    } catch (error) {
      finish(error);
      return;
    }

    child.once('error', finish);
    child.once('exit', (code, signal) => {
      if (code === 0) {
        finish();
        return;
      }
      const error = new Error(`A0 CLI installer exited (${code ?? signal ?? 'unknown'}).`);
      error.code = 'CLI_INSTALL_FAILED';
      finish(error);
    });
    child.unref?.();
  });
}

module.exports = {
  A0_CLI_RELEASE_API_URL,
  a0CliInstallCommand,
  normalizeA0CliVersion,
  runA0CliInstaller,
  shouldInstallA0Cli
};
