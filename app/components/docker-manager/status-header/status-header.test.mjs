import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  isDockerHubRateLimit,
  progressActionsForState
} from './status-header.js';

test('status header recognizes Docker Hub rate limit failures from structured progress', () => {
  const progress = {
    status: 'failed',
    errorCode: 'DOCKER_PULL_RATE_LIMIT',
    error: 'Version downloads are temporarily limited. Sign in to Docker Hub or try again later.',
    targetTag: 'v1.20'
  };

  assert.equal(isDockerHubRateLimit(progress), true);
  assert.deepEqual(progressActionsForState({ progress }), [
    { id: 'docker-login', label: 'Sign in to Docker Hub', emphasis: 'primary' },
    { id: 'retry-install', label: 'Retry', emphasis: 'secondary', disabled: false }
  ]);
});

test('status header falls back to message matching for Docker Hub rate limit', () => {
  const progress = {
    status: 'failed',
    error: 'Version downloads are temporarily limited. Sign in to Docker Hub or try again later.'
  };

  assert.equal(isDockerHubRateLimit(progress), true);
});

test('status header does not show recovery actions for unrelated failures', () => {
  const progress = {
    status: 'failed',
    errorCode: 'CREATE_FAILED',
    error: 'Unable to start the selected version.'
  };

  assert.equal(isDockerHubRateLimit(progress), false);
  assert.deepEqual(progressActionsForState({ progress }), []);
});
