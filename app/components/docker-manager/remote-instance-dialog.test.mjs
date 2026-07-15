import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const { remoteCredentialPayload } = await import('./remote-instance-dialog.js');

test('remote credential payload only requires credentials when save is checked', () => {
  assert.deepEqual(remoteCredentialPayload({
    username: 'dev',
    password: '',
    remember: false
  }), {
    ok: true,
    credentials: null
  });

  assert.deepEqual(remoteCredentialPayload({
    username: 'dev',
    password: '',
    remember: true
  }), {
    ok: false,
    message: 'Enter both username and password to save credentials.'
  });

  assert.deepEqual(remoteCredentialPayload({
    username: ' dev ',
    password: 'line one\nline two',
    remember: true
  }), {
    ok: true,
    credentials: {
      username: 'dev',
      password: 'line one line two'
    }
  });
});

test('remote dialog labels the friendly name as Instance name', async () => {
  const source = await readFile(new URL('./remote-instance-dialog.js', import.meta.url), 'utf8');
  assert.match(source, /<label for="remoteInstanceName">Instance name<\/label>/);
  assert.doesNotMatch(source, /<label for="remoteInstanceName">Display name<\/label>/);
});

test('remote setup stays on the remote machine unless Launcher host access is selected', async () => {
  const source = await readFile(new URL('./remote-instance-dialog.js', import.meta.url), 'utf8');
  assert.match(source, /Allow this Instance to use this computer/);
  assert.match(source, /Leave off for no access to this computer/);
  assert.doesNotMatch(source, /name="remoteHostAccess" type="radio"/);
  assert.match(source, /Folder for files and commands on this computer/);
  assert.match(source, /Commands start here but can reach other folders/i);
  assert.match(source, /masterEnabled: connectLauncher/);
  assert.match(source, /"remoteHostAccessConfigured"[\s\S]*false/);
});
