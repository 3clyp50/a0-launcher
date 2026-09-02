const assert = require('node:assert/strict');
const { test } = require('node:test');

const { toErrorResponse } = require('./errors');

test('Version download limit maps to clear provider sign-in guidance', () => {
  const error = new Error('Docker Hub pull rate limit exceeded');
  error.code = 'DOCKER_PULL_RATE_LIMIT';

  assert.deepEqual(toErrorResponse(error), {
    code: 'DOCKER_PULL_RATE_LIMIT',
    message: 'Version downloads are temporarily limited. Sign in to Docker Hub or try again later.'
  });
});

test('runtime trust failures stay plain while preserving the safe outcome', () => {
  const error = new Error('checksum mismatch for rootfs artifact');
  error.code = 'CHECKSUM_MISMATCH';

  assert.deepEqual(toErrorResponse(error), {
    code: 'CHECKSUM_MISMATCH',
    message: 'The local setup download could not be verified. Nothing was installed. Try again later.'
  });
});

test('normal Instance errors use product language', () => {
  const error = new Error('container create failed');
  error.code = 'CREATE_FAILED';

  assert.deepEqual(toErrorResponse(error), {
    code: 'CREATE_FAILED',
    message: 'Unable to create the Instance.'
  });
});

test('workspace cleanup failure reports that the Instance was already deleted', () => {
  const error = new Error('cleanup failed');
  error.code = 'INSTANCE_DELETED_STORAGE_REMAINS';

  assert.deepEqual(toErrorResponse(error), {
    code: 'INSTANCE_DELETED_STORAGE_REMAINS',
    message: 'Instance deleted, but its /a0/usr workspace data could not be removed.'
  });
});

test('workspace archive failures preserve the exact /a0/usr boundary', () => {
  const empty = new Error('empty');
  empty.code = 'BACKUP_EMPTY';
  const invalid = new Error('');
  invalid.code = 'INVALID_BACKUP_ARCHIVE';

  assert.equal(toErrorResponse(empty).message, 'No files were found in the /a0/usr workspace to back up.');
  assert.equal(toErrorResponse(invalid).message, 'This backup does not contain restorable /a0/usr workspace data.');
});

test('local setup selection failures do not expose endpoint terminology', () => {
  const invalid = new Error('Invalid runtime endpoint');
  invalid.code = 'INVALID_RUNTIME_ENDPOINT';
  const unavailable = new Error('Selected runtime is not available');
  unavailable.code = 'RUNTIME_ENDPOINT_UNAVAILABLE';

  assert.deepEqual(toErrorResponse(invalid), {
    code: 'INVALID_RUNTIME_ENDPOINT',
    message: 'Agent Zero cannot use the selected local setup. Choose another option or refresh.'
  });
  assert.deepEqual(toErrorResponse(unavailable), {
    code: 'RUNTIME_ENDPOINT_UNAVAILABLE',
    message: 'The selected local setup is no longer available. Choose another option or refresh.'
  });
});

test('unknown technical failures keep diagnostics without exposing jargon as the message', () => {
  const error = new Error('connect ENOENT //./pipe/docker_engine');
  error.code = 'INTERNAL_ERROR';

  assert.deepEqual(toErrorResponse(error), {
    code: 'INTERNAL_ERROR',
    message: 'Agent Zero could not complete this action. Try again or open Diagnostics.',
    technicalDetail: 'connect ENOENT //./pipe/docker_engine'
  });
});
