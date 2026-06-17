const test = require('node:test');
const assert = require('node:assert/strict');

const {
  compareLauncherDebugReleaseVersions,
  normalizeLauncherReleaseAssetVersion,
  resolveLauncherDebugReleaseAssetUrl,
  resolveLauncherDebugReleaseMetadataFileName,
  resolveLauncherDebugReleaseTag,
  resolveLauncherWindowsReleaseArchFallback,
  resolveLauncherWindowsReleaseAssetFileName
} = require('./launcher_updater_debug_release');

const publishConfig = {
  provider: 'github',
  owner: 'agent0ai',
  repo: 'a0-launcher'
};

test('launcher debug release versions keep two-segment tags for release assets', () => {
  assert.equal(normalizeLauncherReleaseAssetVersion('v0.5.0'), '0.5');
  assert.equal(normalizeLauncherReleaseAssetVersion('0.5.1'), '0.5.1');
  assert.equal(resolveLauncherDebugReleaseTag('0.5.0'), 'v0.5');
  assert.equal(compareLauncherDebugReleaseVersions('0.3', '0.4.0'), -1);
});

test('launcher debug release selects platform metadata files', () => {
  assert.equal(resolveLauncherDebugReleaseMetadataFileName({ platform: 'win32' }), 'metadata-latest-windows.yml');
  assert.equal(resolveLauncherDebugReleaseMetadataFileName({ platform: 'darwin' }), 'metadata-latest-mac.yml');
  assert.equal(resolveLauncherDebugReleaseMetadataFileName({ platform: 'linux', arch: 'x64' }), 'metadata-latest-linux.yml');
  assert.equal(resolveLauncherDebugReleaseMetadataFileName({ platform: 'linux', arch: 'arm64' }), 'metadata-latest-linux-arm64.yml');
});

test('launcher debug release resolves GitHub release asset URLs', () => {
  assert.equal(
    resolveLauncherDebugReleaseAssetUrl({
      publishConfig,
      tag: 'v0.5',
      fileName: 'metadata-latest-linux.yml'
    }),
    'https://github.com/agent0ai/a0-launcher/releases/download/v0.5/metadata-latest-linux.yml'
  );
});

test('launcher Windows arch fallback expects canonical release asset names', () => {
  assert.equal(
    resolveLauncherWindowsReleaseAssetFileName({ version: '0.5.0', arch: 'x64' }),
    'a0-launcher-0.5-windows-x64.exe'
  );

  assert.deepEqual(
    resolveLauncherWindowsReleaseArchFallback({
      version: '0.5.0',
      files: [
        { url: 'a0-launcher-0.5-windows-arm64.exe' }
      ]
    }, 'x64'),
    {
      actualFiles: ['a0-launcher-0.5-windows-arm64.exe'],
      expectedArch: 'x64',
      expectedFileName: 'a0-launcher-0.5-windows-x64.exe'
    }
  );
});
