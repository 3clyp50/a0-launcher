const test = require('node:test');
const assert = require('node:assert/strict');

const {
  formatLauncherVersion,
  normalizeLauncherVersion,
  releaseUrlForRepo,
  resolveLauncherUpdate,
  selectLauncherUpdateAsset
} = require('./launcher_update');

function release(tag, assets = []) {
  return {
    tag_name: tag,
    html_url: `https://github.com/agent0ai/a0-launcher/releases/tag/${tag}`,
    draft: false,
    prerelease: false,
    assets
  };
}

test('launcher version normalization accepts two and three segment release tags', () => {
  assert.equal(normalizeLauncherVersion('v0.5'), '0.5.0');
  assert.equal(normalizeLauncherVersion('0.5.1'), '0.5.1');
  assert.equal(formatLauncherVersion('v0.5.0'), 'v0.5');
  assert.equal(formatLauncherVersion('v0.5.1'), 'v0.5.1');
});

test('launcher update resolves when latest release is newer than app version', () => {
  const info = resolveLauncherUpdate(
    release('v0.5', [
      {
        name: 'a0-launcher-0.5.0-linux-x86.deb',
        browser_download_url: 'https://github.com/agent0ai/a0-launcher/releases/download/v0.5/a0-launcher-0.5.0-linux-x86.deb'
      }
    ]),
    '0.4.0',
    { platform: 'linux', arch: 'x64', githubRepo: 'agent0ai/a0-launcher' }
  );

  assert.equal(info.available, true);
  assert.equal(info.version, 'v0.5');
  assert.equal(info.assetName, 'a0-launcher-0.5.0-linux-x86.deb');
  assert.match(info.url, /linux-x86\.deb$/);
});

test('launcher update is null when installed version already matches latest', () => {
  assert.equal(
    resolveLauncherUpdate(release('v0.5'), '0.5.0', {
      platform: 'linux',
      arch: 'x64',
      githubRepo: 'agent0ai/a0-launcher'
    }),
    null
  );
});

test('launcher update falls back to release page without matching platform asset', () => {
  const info = resolveLauncherUpdate(release('v0.6'), '0.5.0', {
    platform: 'freebsd',
    arch: 'x64',
    githubRepo: 'agent0ai/a0-launcher'
  });

  assert.equal(info.version, 'v0.6');
  assert.equal(info.assetName, '');
  assert.equal(info.url, 'https://github.com/agent0ai/a0-launcher/releases/tag/v0.6');
});

test('launcher update ignores draft, prerelease, and unsafe download URLs', () => {
  assert.equal(resolveLauncherUpdate({ ...release('v0.6'), draft: true }, '0.5.0'), null);
  assert.equal(resolveLauncherUpdate({ ...release('v0.6'), prerelease: true }, '0.5.0'), null);

  const selected = selectLauncherUpdateAsset(
    [
      {
        name: 'a0-launcher-0.6.0-windows-x86-setup.exe',
        browser_download_url: 'http://example.test/a0-launcher.exe'
      }
    ],
    { platform: 'win32', arch: 'x64' }
  );
  assert.equal(selected, null);
});

test('release URL fallback accepts only owner/repo shorthands', () => {
  assert.equal(releaseUrlForRepo('agent0ai/a0-launcher'), 'https://github.com/agent0ai/a0-launcher/releases/latest');
  assert.equal(releaseUrlForRepo('https://github.com/agent0ai/a0-launcher'), '');
});
