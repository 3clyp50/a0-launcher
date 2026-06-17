const semver = require("semver");
const {
  parseUpdateInfo,
  resolveFiles
} = require("electron-updater/out/providers/Provider");

const DEFAULT_GITHUB_HOST = "github.com";
const WINDOWS_RELEASE_METADATA_FILE = "metadata-latest-windows.yml";
const MAC_RELEASE_METADATA_FILE = "metadata-latest-mac.yml";
const LINUX_RELEASE_METADATA_FILE = "metadata-latest-linux.yml";
const LINUX_ARM64_RELEASE_METADATA_FILE = "metadata-latest-linux-arm64.yml";

function normalizeLauncherReleaseAssetVersion(version = "") {
  const normalizedVersion = String(version || "").trim().replace(/^v/u, "");
  if (!normalizedVersion) {
    throw new Error("Launcher release asset resolution requires a non-empty version.");
  }

  if (/^\d+\.\d+$/u.test(normalizedVersion)) {
    return normalizedVersion;
  }

  const parsedVersion = semver.parse(normalizedVersion);
  if (!parsedVersion) {
    throw new Error(`Launcher release asset resolution received an invalid version "${normalizedVersion}".`);
  }

  if (!parsedVersion.prerelease.length && !parsedVersion.build.length && parsedVersion.patch === 0) {
    return `${parsedVersion.major}.${parsedVersion.minor}`;
  }

  return parsedVersion.version;
}

function normalizeLauncherWindowsReleaseArch(arch = process.arch) {
  const normalizedArch = String(arch || "").trim().toLowerCase();
  if (!normalizedArch) {
    throw new Error("Launcher Windows release asset resolution requires a non-empty arch.");
  }

  if (normalizedArch === "arm64") {
    return "arm64";
  }

  if (normalizedArch === "x64" || normalizedArch === "amd64" || normalizedArch === "x86_64") {
    return "x64";
  }

  throw new Error(`Launcher Windows release asset resolution does not support arch "${arch}".`);
}

function resolveLauncherWindowsReleaseAssetArch(value = "") {
  const normalizedValue = String(value || "").trim().toLowerCase();
  if (!normalizedValue) {
    return "";
  }

  if (normalizedValue.includes("arm64")) {
    return "arm64";
  }

  if (normalizedValue.includes("x64")) {
    return "x64";
  }

  return "";
}

function resolveLauncherWindowsReleaseAssetFileName({
  version = "",
  arch = process.arch
} = {}) {
  return `a0-launcher-${normalizeLauncherReleaseAssetVersion(version)}-windows-${normalizeLauncherWindowsReleaseArch(arch)}.exe`;
}

function getLauncherWindowsReleaseFiles(updateInfo = {}) {
  return (Array.isArray(updateInfo?.files) ? updateInfo.files : [])
    .filter((file) => String(file?.url || "").trim().toLowerCase().endsWith(".exe"));
}

function findLauncherWindowsReleaseFile(updateInfo = {}, arch = process.arch) {
  const normalizedArch = normalizeLauncherWindowsReleaseArch(arch);
  return (
    getLauncherWindowsReleaseFiles(updateInfo).find((file) => {
      return resolveLauncherWindowsReleaseAssetArch(file?.url || "") === normalizedArch;
    }) || null
  );
}

function resolveLauncherWindowsReleaseArchFallback(updateInfo = {}, arch = process.arch) {
  const windowsFiles = getLauncherWindowsReleaseFiles(updateInfo);
  if (!windowsFiles.length) {
    return null;
  }

  const normalizedArch = normalizeLauncherWindowsReleaseArch(arch);
  if (findLauncherWindowsReleaseFile(updateInfo, normalizedArch)) {
    return null;
  }

  return {
    actualFiles: windowsFiles.map((file) => String(file?.url || "").trim()).filter(Boolean),
    expectedArch: normalizedArch,
    expectedFileName: resolveLauncherWindowsReleaseAssetFileName({
      version: updateInfo?.version || "",
      arch: normalizedArch
    })
  };
}

function normalizeLauncherDebugReleaseVersion(requestedVersion, currentVersion = "") {
  const fallbackVersion = String(currentVersion || "").trim();
  const rawValue = String(requestedVersion || fallbackVersion).trim().replace(/^v/u, "");

  if (!rawValue) {
    throw new Error("Launcher debug reinstall requires a version or a current packaged app version.");
  }

  if (/^\d+\.\d+$/u.test(rawValue)) {
    return rawValue;
  }

  const parsedVersion = semver.parse(rawValue);
  if (!parsedVersion) {
    throw new Error(`Launcher debug reinstall requires a valid release version, received \"${rawValue}\".`);
  }

  if (!parsedVersion.prerelease.length && !parsedVersion.build.length && parsedVersion.patch === 0) {
    return `${parsedVersion.major}.${parsedVersion.minor}`;
  }

  return parsedVersion.version;
}

function resolveLauncherDebugReleaseTag(requestedVersion, currentVersion = "") {
  return `v${normalizeLauncherDebugReleaseVersion(requestedVersion, currentVersion)}`;
}

function resolveLauncherDebugComparisonVersion(version) {
  const normalizedVersion = String(version || "").trim().replace(/^v/u, "");
  if (!normalizedVersion) {
    throw new Error("Launcher debug reinstall comparison requires a non-empty version.");
  }

  if (/^\d+\.\d+$/u.test(normalizedVersion)) {
    return `${normalizedVersion}.0`;
  }

  const parsedVersion = semver.parse(normalizedVersion);
  if (!parsedVersion) {
    throw new Error(`Launcher debug reinstall comparison received an invalid version \"${normalizedVersion}\".`);
  }

  return parsedVersion.version;
}

function compareLauncherDebugReleaseVersions(targetVersion, currentVersion) {
  return semver.compare(
    resolveLauncherDebugComparisonVersion(targetVersion),
    resolveLauncherDebugComparisonVersion(currentVersion)
  );
}

function resolveLauncherDebugReleaseMetadataFileName({
  platform = process.platform,
  arch = process.arch
} = {}) {
  switch (platform) {
    case "win32":
      return WINDOWS_RELEASE_METADATA_FILE;
    case "darwin":
      return MAC_RELEASE_METADATA_FILE;
    case "linux":
      return arch === "arm64" ? LINUX_ARM64_RELEASE_METADATA_FILE : LINUX_RELEASE_METADATA_FILE;
    default:
      throw new Error(`Launcher debug reinstall does not support platform \"${platform}\".`);
  }
}

function normalizeLauncherDebugGitHubHost(host) {
  const normalizedHost = String(host || "").trim();
  if (!normalizedHost) {
    return DEFAULT_GITHUB_HOST;
  }

  return normalizedHost.replace(/^https?:\/\//u, "").replace(/\/+$/u, "");
}

function validateLauncherDebugGitHubPublishConfig(publishConfig = {}) {
  const provider = String(publishConfig.provider || "").trim();
  const owner = String(publishConfig.owner || "").trim();
  const repo = String(publishConfig.repo || "").trim();

  if (provider !== "github") {
    throw new Error(`Launcher debug reinstall requires a GitHub publish config, received provider \"${provider || "unknown"}\".`);
  }

  if (!owner || !repo) {
    throw new Error("Launcher debug reinstall requires GitHub publish owner and repo metadata.");
  }

  return {
    host: normalizeLauncherDebugGitHubHost(publishConfig.host),
    owner,
    repo
  };
}

function resolveLauncherDebugGitHubBaseUrl(publishConfig = {}) {
  const { host } = validateLauncherDebugGitHubPublishConfig(publishConfig);
  return new URL(`https://${host}`);
}

function resolveLauncherDebugGitHubBasePath(publishConfig = {}) {
  const { owner, repo } = validateLauncherDebugGitHubPublishConfig(publishConfig);
  return `/${owner}/${repo}/releases`;
}

function resolveLauncherDebugReleaseAssetUrl({
  publishConfig,
  tag,
  fileName
}) {
  const normalizedTag = String(tag || "").trim();
  const normalizedFileName = String(fileName || "").trim();

  if (!normalizedTag || !normalizedFileName) {
    throw new Error("Launcher debug reinstall requires both a release tag and an asset file name.");
  }

  const baseUrl = resolveLauncherDebugGitHubBaseUrl(publishConfig);
  const releasePath = resolveLauncherDebugGitHubBasePath(publishConfig);
  return new URL(`${releasePath}/download/${normalizedTag}/${normalizedFileName}`, baseUrl).href;
}

function escapeLauncherDebugRegExp(value) {
  return String(value || "").replace(/[|\\{}()[\]^$+*?.]/gu, "\\$&");
}

function getLauncherDebugReleaseBlockMapFiles(baseFileUrl, oldVersion, newVersion, oldBlockMapFileBaseUrl = null) {
  const normalizedBaseFileUrl = baseFileUrl instanceof URL ? baseFileUrl : new URL(baseFileUrl);
  const oldBlockMapBaseUrl = oldBlockMapFileBaseUrl ? new URL(oldBlockMapFileBaseUrl) : normalizedBaseFileUrl;
  const normalizedOldVersion = String(oldVersion || "").trim();
  const normalizedNewVersion = String(newVersion || "").trim();
  const oldBlockMapPath = `${normalizedBaseFileUrl.pathname.replace(
    new RegExp(escapeLauncherDebugRegExp(normalizedNewVersion), "g"),
    normalizedOldVersion
  )}.blockmap`;

  return [
    new URL(oldBlockMapPath, oldBlockMapBaseUrl),
    new URL(`${normalizedBaseFileUrl.pathname}.blockmap`, normalizedBaseFileUrl)
  ];
}

function createLauncherDebugReleaseProvider({
  publishConfig
}) {
  const baseUrl = resolveLauncherDebugGitHubBaseUrl(publishConfig);
  const releasePath = resolveLauncherDebugGitHubBasePath(publishConfig);

  return {
    fileExtraDownloadHeaders: null,
    isUseMultipleRangeRequest: false,
    requestHeaders: null,
    setRequestHeaders(value) {
      this.requestHeaders = value || null;
    },
    resolveFiles(updateInfo) {
      return resolveFiles(
        updateInfo,
        baseUrl,
        (assetPath) => `${releasePath}/download/${updateInfo.tag}/${String(assetPath || "").replace(/ /gu, "-")}`
      );
    },
    getBlockMapFiles(baseFileUrl, oldVersion, newVersion, oldBlockMapFileBaseUrl = null) {
      return getLauncherDebugReleaseBlockMapFiles(baseFileUrl, oldVersion, newVersion, oldBlockMapFileBaseUrl);
    }
  };
}

function parseLauncherDebugReleaseInfo({
  rawData,
  tag,
  metadataFileName,
  metadataUrl
}) {
  const parsedInfo = parseUpdateInfo(rawData, metadataFileName, metadataUrl);
  return {
    tag,
    ...parsedInfo
  };
}

async function stageLauncherDebugRelease({
  requestedVersion = "",
  currentVersion = "",
  platform = process.platform,
  arch = process.arch,
  publishConfig,
  fetchText
}) {
  if (typeof fetchText !== "function") {
    throw new Error("Launcher debug reinstall requires a metadata fetch function.");
  }

  const normalizedTargetVersion = normalizeLauncherDebugReleaseVersion(requestedVersion, currentVersion);
  const tag = resolveLauncherDebugReleaseTag(normalizedTargetVersion, currentVersion);
  const metadataFileName = resolveLauncherDebugReleaseMetadataFileName({
    platform,
    arch
  });
  const metadataUrl = resolveLauncherDebugReleaseAssetUrl({
    publishConfig,
    tag,
    fileName: metadataFileName
  });
  const rawData = await fetchText(metadataUrl);
  const info = parseLauncherDebugReleaseInfo({
    rawData,
    tag,
    metadataFileName,
    metadataUrl
  });

  return {
    comparison: compareLauncherDebugReleaseVersions(info.version || normalizedTargetVersion, currentVersion),
    info,
    metadataFileName,
    metadataUrl,
    provider: createLauncherDebugReleaseProvider({
      publishConfig
    }),
    requestedVersion: normalizedTargetVersion,
    tag
  };
}

module.exports = {
  LINUX_ARM64_RELEASE_METADATA_FILE,
  LINUX_RELEASE_METADATA_FILE,
  MAC_RELEASE_METADATA_FILE,
  WINDOWS_RELEASE_METADATA_FILE,
  compareLauncherDebugReleaseVersions,
  createLauncherDebugReleaseProvider,
  findLauncherWindowsReleaseFile,
  getLauncherWindowsReleaseFiles,
  getLauncherDebugReleaseBlockMapFiles,
  normalizeLauncherReleaseAssetVersion,
  normalizeLauncherDebugReleaseVersion,
  normalizeLauncherWindowsReleaseArch,
  parseLauncherDebugReleaseInfo,
  resolveLauncherWindowsReleaseArchFallback,
  resolveLauncherWindowsReleaseAssetArch,
  resolveLauncherWindowsReleaseAssetFileName,
  resolveLauncherDebugComparisonVersion,
  resolveLauncherDebugGitHubBasePath,
  resolveLauncherDebugGitHubBaseUrl,
  resolveLauncherDebugReleaseAssetUrl,
  resolveLauncherDebugReleaseMetadataFileName,
  resolveLauncherDebugReleaseTag,
  stageLauncherDebugRelease,
  validateLauncherDebugGitHubPublishConfig
};
