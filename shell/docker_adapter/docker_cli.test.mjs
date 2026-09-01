import assert from 'node:assert/strict';
import path from 'node:path';
import { test } from 'node:test';

import { developerProjectCommand } from './DockerCli.mjs';

test('developer project commands keep paths as arguments and never delete Compose volumes', () => {
  const compose = { binary: '/usr/bin/docker', prefix: ['compose', '--ansi', 'never'] };
  const projectRoot = path.resolve('/tmp/project with spaces');
  const base = {
    projectRoot,
    fileName: 'compose.yaml',
    fileKind: 'compose'
  };

  const down = developerProjectCommand({ ...base, action: 'down' }, compose, '/usr/bin/docker');
  assert.deepEqual(down.args, [
    'compose', '--ansi', 'never',
    '--project-directory', projectRoot,
    '--file', path.join(projectRoot, 'compose.yaml'),
    'down'
  ]);
  assert.equal(down.args.includes('--volumes'), false);

  const build = developerProjectCommand({
    action: 'build',
    projectRoot,
    fileName: 'Dockerfile',
    fileKind: 'dockerfile',
    imageTag: 'example/app:dev'
  }, null, '/usr/bin/docker');
  assert.deepEqual(build.args, [
    'build', '--file', path.join(projectRoot, 'Dockerfile'),
    '--tag', 'example/app:dev', projectRoot
  ]);
});
