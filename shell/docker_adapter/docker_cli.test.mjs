import assert from 'node:assert/strict';
import { test } from 'node:test';

import { developerProjectCommand } from './DockerCli.mjs';

test('developer project commands keep paths as arguments and never delete Compose volumes', () => {
  const compose = { binary: '/usr/bin/docker', prefix: ['compose', '--ansi', 'never'] };
  const base = {
    projectRoot: '/tmp/project with spaces',
    fileName: 'compose.yaml',
    fileKind: 'compose'
  };

  const down = developerProjectCommand({ ...base, action: 'down' }, compose, '/usr/bin/docker');
  assert.deepEqual(down.args, [
    'compose', '--ansi', 'never',
    '--project-directory', '/tmp/project with spaces',
    '--file', '/tmp/project with spaces/compose.yaml',
    'down'
  ]);
  assert.equal(down.args.includes('--volumes'), false);

  const build = developerProjectCommand({
    action: 'build',
    projectRoot: '/tmp/project with spaces',
    fileName: 'Dockerfile',
    fileKind: 'dockerfile',
    imageTag: 'example/app:dev'
  }, null, '/usr/bin/docker');
  assert.deepEqual(build.args, [
    'build', '--file', '/tmp/project with spaces/Dockerfile',
    '--tag', 'example/app:dev', '/tmp/project with spaces'
  ]);
});
