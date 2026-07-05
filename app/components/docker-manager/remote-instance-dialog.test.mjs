import assert from 'node:assert/strict';
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
