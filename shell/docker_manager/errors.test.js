const assert = require('node:assert/strict');
const { test } = require('node:test');

const { toErrorResponse } = require('./errors');

test('Docker pull rate limit maps to actionable install guidance', () => {
  const error = new Error('Docker Hub pull rate limit exceeded');
  error.code = 'DOCKER_PULL_RATE_LIMIT';

  assert.deepEqual(toErrorResponse(error), {
    code: 'DOCKER_PULL_RATE_LIMIT',
    message: 'Docker Hub pull limit reached. Sign in to Docker or try again later.'
  });
});
