const assert = require('node:assert/strict');
const { test } = require('node:test');

const { toErrorResponse } = require('./errors');

test('runtime setup preserves the provisioner failure instead of replacing it with generic copy', () => {
  for (const code of ['RUNTIME_PROVISION_FAILED', 'RUNTIME_START_FAILED']) {
    const error = Object.assign(new Error('Windows WSL Setup did not complete.\nWSL_E_INSTALL_PROCESS_FAILED'), { code });
    assert.deepEqual(toErrorResponse(error), { code, message: error.message });
  }
});

test('Docker pull rate limit maps to actionable install guidance', () => {
  const error = new Error('Docker Hub pull rate limit exceeded');
  error.code = 'DOCKER_PULL_RATE_LIMIT';

  assert.deepEqual(toErrorResponse(error), {
    code: 'DOCKER_PULL_RATE_LIMIT',
    message: 'Docker Hub pull limit reached. Sign in to Docker or try again later.'
  });
});

test('workspace cleanup failure reports that the Instance was already deleted', () => {
  const error = new Error('cleanup failed');
  error.code = 'INSTANCE_DELETED_STORAGE_REMAINS';

  assert.deepEqual(toErrorResponse(error), {
    code: 'INSTANCE_DELETED_STORAGE_REMAINS',
    message: 'Instance deleted, but its /a0/usr folder could not be removed.'
  });
});
