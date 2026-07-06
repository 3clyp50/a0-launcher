const assert = require('node:assert/strict');
const { test } = require('node:test');

const dockerManager = require('./index');

const {
  localImageIdForTag,
  removeReplacedLocalImage
} = dockerManager._test;

test('removeReplacedLocalImage deletes the old id when a tag moves', async () => {
  const calls = [];
  const imageLists = [
    [{ tag: 'latest', imageId: 'sha256:old' }],
    [{ tag: 'latest', imageId: 'sha256:new' }]
  ];
  const docker = {
    listLocalImages: async (repo) => {
      calls.push(['listLocalImages', repo]);
      return imageLists.shift() || [];
    },
    removeLocalImage: async (imageRef, options) => {
      calls.push(['removeLocalImage', imageRef, options]);
    }
  };

  const previousImageId = await localImageIdForTag(docker, 'agent0ai/agent-zero', 'latest');
  const removed = await removeReplacedLocalImage(docker, 'agent0ai/agent-zero', 'latest', previousImageId);

  assert.equal(removed, true);
  assert.deepEqual(calls, [
    ['listLocalImages', 'agent0ai/agent-zero'],
    ['listLocalImages', 'agent0ai/agent-zero'],
    ['removeLocalImage', 'sha256:old', { force: false }]
  ]);
});

test('removeReplacedLocalImage keeps old image when Docker reports it in use', async () => {
  const calls = [];
  const docker = {
    listLocalImages: async () => [{ tag: 'latest', imageId: 'sha256:new' }],
    removeLocalImage: async (imageRef, options) => {
      calls.push([imageRef, options]);
      const error = new Error('image is used by stopped container');
      error.code = 'CONFLICT';
      throw error;
    }
  };

  const removed = await removeReplacedLocalImage(docker, 'agent0ai/agent-zero', 'latest', 'sha256:old');

  assert.equal(removed, false);
  assert.deepEqual(calls, [['sha256:old', { force: false }]]);
});

test('removeReplacedLocalImage keeps old image when another Agent Zero tag still points to it', async () => {
  const calls = [];
  const docker = {
    listLocalImages: async () => [
      { tag: 'latest', imageId: 'sha256:new' },
      { tag: 'v1.2', imageId: 'sha256:old' }
    ],
    removeLocalImage: async (imageRef, options) => {
      calls.push([imageRef, options]);
    }
  };

  const removed = await removeReplacedLocalImage(docker, 'agent0ai/agent-zero', 'latest', 'sha256:old');

  assert.equal(removed, false);
  assert.deepEqual(calls, []);
});
