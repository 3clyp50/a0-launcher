const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { test } = require('node:test');

const {
  a0CliInstallCommand,
  normalizeA0CliVersion,
  runA0CliInstaller,
  shouldInstallA0Cli
} = require('./a0_cli_install');

test('CLI install policy covers missing, incompatible, and newer releases', () => {
  assert.equal(normalizeA0CliVersion('a0 2.5'), '2.5.0');
  assert.equal(shouldInstallA0Cli({ installed: false }), true);
  assert.equal(shouldInstallA0Cli({ installed: true, supportsGateway: false }), true);
  assert.equal(shouldInstallA0Cli({
    installed: true,
    supportsGateway: true,
    currentVersion: '2.5',
    latestVersion: 'v2.6'
  }), true);
  assert.equal(shouldInstallA0Cli({
    installed: true,
    supportsGateway: true,
    currentVersion: '2.5',
    latestVersion: 'v2.5'
  }), false);
  assert.equal(shouldInstallA0Cli({
    installed: true,
    supportsGateway: true,
    latestVersion: 'v2.5'
  }), true);
  assert.equal(shouldInstallA0Cli({ installed: true, supportsGateway: true }), false);
});

test('CLI installer uses the official fixed script on every supported platform', () => {
  const linux = a0CliInstallCommand('linux');
  assert.equal(linux.command, 'sh');
  assert.match(linux.args.at(-1), /agent0ai\/a0-connector\/main\/install\.sh/);
  assert.match(linux.args.at(-1), /curl/);
  assert.match(linux.args.at(-1), /wget/);

  const windows = a0CliInstallCommand('win32');
  assert.equal(windows.command, 'powershell.exe');
  assert.match(windows.args.at(-1), /agent0ai\/a0-connector\/main\/install\.ps1/);

  assert.throws(() => a0CliInstallCommand('freebsd'), { code: 'TERMINAL_UNAVAILABLE' });
});

test('CLI installer waits for completion and reports failure', async () => {
  let child;
  let spawnOptions;
  const spawn = (_command, _args, options) => {
    spawnOptions = options;
    child = new EventEmitter();
    child.unref = () => { child.unrefCalled = true; };
    return child;
  };

  const installed = runA0CliInstaller({ platform: 'linux', spawn, env: { PATH: '/usr/bin' } });
  child.emit('exit', 0, null);
  assert.deepEqual(await installed, { installed: true });
  assert.equal(child.unrefCalled, true);
  assert.equal(spawnOptions.detached, true);
  assert.equal(spawnOptions.windowsHide, true);
  assert.equal(spawnOptions.stdio, 'ignore');

  const failed = runA0CliInstaller({ platform: 'linux', spawn });
  child.emit('exit', 7, null);
  await assert.rejects(failed, { code: 'CLI_INSTALL_FAILED' });
});
