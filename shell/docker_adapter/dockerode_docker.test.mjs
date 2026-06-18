import assert from 'node:assert/strict';
import { test } from 'node:test';

import { DockerodeDocker } from './impl/DockerodeDocker.mjs';

test('listContainers formats UI URLs from selected public host port', async () => {
  const docker = new DockerodeDocker({ imageRepo: 'agent0ai/agent-zero' });
  docker.docker = {
    listContainers: async () => [
      {
        Id: 'container-id',
        Image: 'agent0ai/agent-zero:latest',
        Names: ['/agent-zero-latest'],
        Labels: {},
        State: 'running',
        Status: 'Up 2 minutes',
        Created: 1781760000,
        Ports: [
          { PrivatePort: 22, PublicPort: 32222, Type: 'tcp', IP: '127.0.0.1' },
          { PrivatePort: 80, PublicPort: 32080, Type: 'tcp', IP: '127.0.0.1' }
        ]
      }
    ]
  };

  const [container] = await docker.listContainers('agent0ai/agent-zero');

  assert.equal(container.uiUrl, 'http://127.0.0.1:32080/');
  assert.deepEqual(container.ports, [
    { privatePort: 22, publicPort: 32222, type: 'tcp', ip: '127.0.0.1' },
    { privatePort: 80, publicPort: 32080, type: 'tcp', ip: '127.0.0.1' }
  ]);
});
