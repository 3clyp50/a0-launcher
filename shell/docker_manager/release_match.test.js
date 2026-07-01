const assert = require('node:assert/strict');
const { test } = require('node:test');

const dockerManager = require('./index');

const {
  applyContainerMatchedReleaseTags,
  inspectContainerRuntimeSource,
  imageTagForContainer,
  matchedReleaseTagForLocalTag,
  matchedSemverReleaseTagForDigest,
  parsePackedRefsTagsForCommit,
  releaseTagLabel
} = dockerManager._test;

test('channel image digest can resolve to a concrete release tag', () => {
  const digest = 'sha256:abc1234567890defabc1234567890defabc1234567890defabc1234567890def';
  const knownRemoteDigests = [
    { tag: 'latest', digest },
    { tag: 'v1.20', digest }
  ];

  assert.equal(matchedSemverReleaseTagForDigest(digest, knownRemoteDigests), 'v1.20');
  assert.equal(releaseTagLabel('v1.20'), '1.20');
});

test('latest can fall back to the known latest release tag', () => {
  assert.equal(matchedReleaseTagForLocalTag('latest', new Map([['v1.21', {}]]), [], 'v1.21'), 'v1.21');
  assert.equal(matchedReleaseTagForLocalTag('latest', new Map([['latest', {}]]), [], 'v1.21'), 'v1.21');
  assert.equal(matchedReleaseTagForLocalTag('ready', new Map([['v1.21', {}]]), [], 'v1.21'), '');
});

test('latest does not fall back when a local digest lacks a release match', () => {
  const localByTag = new Map([
    ['latest', {
      repoDigests: ['agent0ai/agent-zero@sha256:def1234567890abc1234567890abc1234567890abc1234567890abc1234567890abc']
    }]
  ]);

  assert.equal(matchedReleaseTagForLocalTag('latest', localByTag, [], 'v1.21'), '');
});

test('matched release tags are applied to matching channel containers', () => {
  const imageId = 'sha256:old-ready';
  const containers = [
    {
      containerId: 'abc123',
      containerName: 'agent-zero-ready',
      imageRef: 'agent0ai/agent-zero:ready',
      imageId,
      labels: { 'a0.launcher.versionTag': 'ready' }
    }
  ];

  assert.equal(imageTagForContainer(containers[0]), 'ready');

  const [enriched] = applyContainerMatchedReleaseTags(
    containers,
    new Map([['ready', 'v1.20']]),
    new Map([['ready', { imageId }]])
  );
  assert.equal(enriched.matchedReleaseTag, 'v1.20');
  assert.equal(containers[0].matchedReleaseTag, undefined);
});

test('channel container release tags follow the container image id, not the current channel tag', () => {
  const oldImageId = 'sha256:old-ready';
  const newReadyImageId = 'sha256:new-ready';
  const containers = [
    {
      containerId: 'abc123',
      containerName: 'agent-zero-ready',
      imageRef: 'agent0ai/agent-zero:ready',
      imageId: oldImageId,
      labels: { 'a0.launcher.versionTag': 'ready' }
    }
  ];

  const [enriched] = applyContainerMatchedReleaseTags(
    containers,
    new Map([['ready', 'v2.1']]),
    new Map([
      ['ready', { imageId: newReadyImageId }],
      ['v1.20', { imageId: oldImageId }]
    ])
  );

  assert.equal(enriched.matchedReleaseTag, 'v1.20');
});

test('stale channel containers are not labeled as the current channel release', () => {
  const [enriched] = applyContainerMatchedReleaseTags(
    [{
      containerId: 'abc123',
      containerName: 'agent-zero-ready',
      imageRef: 'agent0ai/agent-zero:ready',
      imageId: 'sha256:old-ready',
      labels: { 'a0.launcher.versionTag': 'ready' }
    }],
    new Map([['ready', 'v2.1']]),
    new Map([['ready', { imageId: 'sha256:new-ready' }]])
  );

  assert.equal(enriched.matchedReleaseTag, undefined);
});

test('runtime source resolves release tags pointing at the current Git commit', async () => {
  const commit = '5c914bc49ebd5c914bc49ebd5c914bc49ebd5c914bc';
  const packedRefs = [
    '# pack-refs with: peeled fully-peeled sorted',
    `${commit} refs/heads/ready`,
    `${commit} refs/tags/v1.20`,
    '1111111111111111111111111111111111111111 refs/tags/v2.0',
    `^${commit}`
  ].join('\n');
  const reads = new Map([
    ['/a0/.git/HEAD', 'ref: refs/heads/ready\n'],
    ['/a0/.git/refs/heads/ready', commit],
    ['/a0/.git/packed-refs', packedRefs]
  ]);
  const docker = {
    readContainerTextFile: async (_containerId, filePath) => reads.get(filePath) ?? null,
    listContainerDirectory: async () => []
  };

  assert.deepEqual(parsePackedRefsTagsForCommit(packedRefs, commit), ['v2.0', 'v1.20']);

  const source = await inspectContainerRuntimeSource(docker, { containerId: 'abc123' });
  assert.equal(source.tag, 'v2.0');
  assert.equal(source.branch, 'ready');
  assert.equal(source.shortCommit, commit.slice(0, 12));
});
