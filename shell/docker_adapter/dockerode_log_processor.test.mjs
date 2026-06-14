import assert from 'node:assert/strict';
import { test } from 'node:test';

import { readContainerLogs } from './impl/DockerodeLogProcessor.mjs';

function muxFrame(streamType, text) {
  const payload = Buffer.from(text);
  const header = Buffer.alloc(8);
  header[0] = streamType;
  header.writeUInt32BE(payload.length, 4);
  return Buffer.concat([header, payload]);
}

test('readContainerLogs decodes Dockerode snapshot buffers', async () => {
  const docker = {
    getContainer() {
      return {
        inspect: async () => ({ Config: { Tty: false } }),
        logs: (_options, callback) => callback(null, Buffer.concat([
          muxFrame(1, 'stdout line\n'),
          muxFrame(2, 'stderr line\n')
        ]))
      };
    }
  };

  const result = await readContainerLogs(docker, 'container-id', {
    maxLines: 20,
    includeStderr: true
  });

  assert.deepEqual(result, {
    mode: 'snapshot',
    aborted: false,
    lines: [
      { stream: 'stdout', line: 'stdout line' },
      { stream: 'stderr', line: 'stderr line' }
    ]
  });
});
