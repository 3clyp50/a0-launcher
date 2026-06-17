const semver = require('semver');

function normalizeLauncherVersion(value) {
  const raw = String(value || '').trim().replace(/^v/i, '');
  if (!/^\d+\.\d+(\.\d+)?$/.test(raw)) return null;

  const candidate = /^\d+\.\d+$/.test(raw) ? `${raw}.0` : raw;
  return semver.valid(candidate);
}

function formatLauncherVersion(value) {
  const normalized = normalizeLauncherVersion(value);
  if (!normalized) return '';

  const parsed = semver.parse(normalized);
  if (!parsed) return '';
  if (parsed.patch === 0) return `v${parsed.major}.${parsed.minor}`;
  return `v${normalized}`;
}

function safeGithubHttpsUrl(value) {
  try {
    const url = new URL(String(value || '').trim());
    if (url.protocol !== 'https:' || url.username || url.password) return '';
    if (url.hostname !== 'github.com' && !url.hostname.endsWith('.github.com')) return '';
    return url.toString();
  } catch {
    return '';
  }
}

function releaseUrlForRepo(githubRepo) {
  const repo = String(githubRepo || '').trim();
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo)) return '';
  return `https://github.com/${repo}/releases/latest`;
}

function updateAssetPatterns(platform, arch) {
  const p = String(platform || '').trim();
  const a = String(arch || '').trim();

  if (p === 'darwin') {
    if (a === 'arm64') return [/macos-arm64\.dmg$/i, /macos-arm64-update\.zip$/i];
    return [/macos-x64\.dmg$/i, /macos-x64-update\.zip$/i];
  }

  if (p === 'win32') {
    if (a === 'arm64') return [/windows-arm64\.exe$/i];
    return [/windows-x64\.exe$/i];
  }

  if (p === 'linux') {
    if (a === 'arm64' || a === 'arm') return [/linux-arm64\.AppImage$/i];
    return [/linux-x64\.AppImage$/i];
  }

  return [];
}

function selectLauncherUpdateAsset(assets, options = {}) {
  const patterns = updateAssetPatterns(options.platform, options.arch);
  if (!patterns.length || !Array.isArray(assets)) return null;

  for (const pattern of patterns) {
    const match = assets.find((asset) => {
      const name = typeof asset?.name === 'string' ? asset.name : '';
      const url = safeGithubHttpsUrl(asset?.browser_download_url);
      return !!name && !!url && pattern.test(name);
    });
    if (match) return match;
  }

  return null;
}

function resolveLauncherUpdate(latestRelease, currentVersion, options = {}) {
  if (!latestRelease || typeof latestRelease !== 'object') return null;
  if (latestRelease.draft || latestRelease.prerelease) return null;

  const latestVersion = normalizeLauncherVersion(latestRelease.tag_name);
  const installedVersion = normalizeLauncherVersion(currentVersion);
  if (!latestVersion || !installedVersion || !semver.gt(latestVersion, installedVersion)) {
    return null;
  }

  const asset = selectLauncherUpdateAsset(latestRelease.assets, options);
  const releaseUrl = safeGithubHttpsUrl(latestRelease.html_url) || releaseUrlForRepo(options.githubRepo);
  const downloadUrl = safeGithubHttpsUrl(asset?.browser_download_url);
  const url = downloadUrl || releaseUrl;
  if (!url) return null;

  return {
    available: true,
    version: formatLauncherVersion(latestRelease.tag_name),
    tag: typeof latestRelease.tag_name === 'string' ? latestRelease.tag_name : '',
    url,
    releaseUrl,
    downloadUrl,
    assetName: typeof asset?.name === 'string' ? asset.name : ''
  };
}

module.exports = {
  formatLauncherVersion,
  normalizeLauncherVersion,
  releaseUrlForRepo,
  resolveLauncherUpdate,
  selectLauncherUpdateAsset,
  updateAssetPatterns
};
