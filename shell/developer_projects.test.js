const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const {
  developerProjectTarget,
  loadDeveloperProject,
  saveDeveloperProjectFile
} = require('./developer_projects');

test('developer projects expose only bounded root files and bind saves to the owning renderer', async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'a0-developer-project-'));
  const outside = await fs.mkdtemp(path.join(os.tmpdir(), 'a0-developer-outside-'));
  t.after(async () => {
    await fs.rm(root, { recursive: true, force: true });
    await fs.rm(outside, { recursive: true, force: true });
  });

  await fs.writeFile(path.join(root, 'compose.yaml'), 'services: {}\n');
  await fs.writeFile(path.join(root, 'Dockerfile'), 'FROM scratch\n');
  await fs.writeFile(path.join(root, '.env'), 'SECRET=hidden\n');
  await fs.writeFile(path.join(outside, 'compose.yaml'), 'services: {}\n');
  await fs.symlink(path.join(outside, 'compose.yaml'), path.join(root, 'compose.link.yaml'));

  const project = await loadDeveloperProject(11, root);
  assert.deepEqual(project.files.map((file) => file.name), ['compose.yaml', 'Dockerfile']);

  await saveDeveloperProjectFile(11, project.token, 'compose.yaml', 'services:\n  app:\n    image: busybox\n');
  await saveDeveloperProjectFile(11, project.token, '.dockerignore', '.git\n');
  assert.equal((await developerProjectTarget(11, project.token, '.dockerignore')).projectRoot, root);
  assert.match(await fs.readFile(path.join(root, 'compose.yaml'), 'utf8'), /busybox/);

  await assert.rejects(
    developerProjectTarget(12, project.token, 'compose.yaml'),
    (error) => error?.code === 'PROJECT_EXPIRED'
  );
  await assert.rejects(
    saveDeveloperProjectFile(11, project.token, '../compose.yaml', 'services: {}\n'),
    (error) => error?.code === 'UNSUPPORTED_FILE'
  );
});
