const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { execFile } = require('node:child_process');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { promisify } = require('node:util');
const { test } = require('node:test');

const execute = promisify(execFile);

test('Windows installer preserves data across legacy updates, failed extraction, and recovery', { skip: process.platform !== 'win32' }, async (t) => {
  const cache = path.join(process.env.LOCALAPPDATA, 'electron-builder', 'Cache', 'nsis');
  const versions = await fs.readdir(cache).catch(() => []);
  let compiler = '';
  for (const version of versions.filter((name) => name.startsWith('nsis-')).sort().reverse()) {
    const candidate = path.join(cache, version, 'Bin', 'makensis.exe');
    if (await fs.stat(candidate).catch(() => null)) { compiler = candidate; break; }
  }
  if (!compiler) { t.skip('Build a Windows installer first to cache the NSIS toolchain'); return; }

  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'a0-installer-data-test-'));
  const name = `a0-launcher-installer-test-${randomUUID()}`;
  const profile = path.resolve(process.env.APPDATA, name);
  const backup = `${profile}-installer-backup`;
  const registryKey = `Software\\a0-launcher-installer-tests\\${name}`;
  assert.equal(path.dirname(profile), path.resolve(process.env.APPDATA));
  assert.ok(path.basename(profile).startsWith('a0-launcher-installer-test-'));
  assert.equal(path.dirname(backup), path.dirname(profile));
  assert.ok(path.resolve(root).startsWith(path.resolve(os.tmpdir()) + path.sep));
  const fixture = path.join(__dirname, '..', 'platforms', 'windows', 'installer-user-data-fixture.nsi');
  const includes = path.join(__dirname, '..', 'node_modules', 'app-builder-lib', 'templates', 'nsis', 'include');
  const credentials = Buffer.from([0, 255, 128, 42]);
  try {
    for (const mode of ['success', 'failure', 'conflict', 'recovery']) {
      await fs.mkdir(path.join(profile, 'nested'), { recursive: true });
      await fs.writeFile(path.join(profile, 'settings.json'), 'saved settings');
      await fs.writeFile(path.join(profile, 'nested', 'credentials.bin'), credentials);
      if (mode === 'recovery') await fs.rename(profile, backup);
      await execute(compiler, [`/DAPP_PACKAGE_NAME=${name}`, `/DUNINSTALL_REGISTRY_KEY=${registryKey}`, `/DTEST_ROOT=${root}`, `/DTEST_CASE=${mode}`, `/X!addincludedir "${includes}"`, fixture], { windowsHide: true, timeout: 60_000 });
      let failure = null;
      await execute(path.join(root, `fixture-${mode}.exe`), ['/S'], { windowsHide: true, timeout: 60_000 }).catch((error) => { failure = error; });
      if (mode === 'success' || mode === 'recovery') assert.equal(failure, null);
      else { assert.notEqual(failure, null); assert.ok([1, 2].includes(failure.code), failure.message); }
      const preserved = mode === 'conflict' ? backup : profile;
      assert.equal(await fs.readFile(path.join(preserved, 'settings.json'), 'utf8'), 'saved settings');
      assert.deepEqual(await fs.readFile(path.join(preserved, 'nested', 'credentials.bin')), credentials);
      if (mode === 'conflict') {
        assert.equal(await fs.readFile(path.join(profile, 'new-user-data.txt'), 'utf8'), 'New state must survive');
      } else {
        assert.equal(await fs.stat(backup).catch(() => null), null);
      }
      await fs.rm(profile, { recursive: true, force: true });
      await fs.rm(backup, { recursive: true, force: true });
    }
  } finally {
    await execute('reg.exe', ['delete', `HKCU\\${registryKey}`, '/f'], { windowsHide: true, timeout: 5000 }).catch(() => {});
    await fs.rm(profile, { recursive: true, force: true });
    await fs.rm(backup, { recursive: true, force: true });
    await fs.rm(root, { recursive: true, force: true });
  }
});
