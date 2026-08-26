const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

const MAX_DEVELOPER_FILE_BYTES = 1024 * 1024;
const MAX_DEVELOPER_FILES = 32;
const projects = new Map();

function projectError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function developerFileKind(value) {
  const name = String(value || '').trim();
  if (!name || path.basename(name) !== name || name.length > 180) return '';
  if (/\.ya?ml$/i.test(name)) return 'compose';
  if (/^(?:Dockerfile|Containerfile)(?:[._-][A-Za-z0-9_-]+)*$/i.test(name)) return 'dockerfile';
  if (name === '.dockerignore') return 'dockerignore';
  if (name === '.env.example') return 'env_example';
  return '';
}

function validateDeveloperText(value) {
  const text = typeof value === 'string' ? value : '';
  if (text.includes('\0')) throw projectError('INVALID_INPUT', 'Developer files cannot contain NUL bytes.');
  if (Buffer.byteLength(text, 'utf8') > MAX_DEVELOPER_FILE_BYTES) {
    throw projectError('FILE_TOO_LARGE', 'Developer files must be 1 MB or smaller.');
  }
  return text;
}

async function canonicalProjectRoot(value) {
  const selected = String(value || '').trim();
  if (!selected) throw projectError('INVALID_INPUT', 'Choose a project folder.');
  const root = await fs.realpath(selected);
  const stat = await fs.stat(root);
  if (!stat.isDirectory()) throw projectError('INVALID_INPUT', 'Choose a project folder.');
  if (root === path.parse(root).root || root === path.resolve(os.homedir())) {
    throw projectError('PROJECT_TOO_BROAD', 'Choose a dedicated project folder, not a filesystem or home root.');
  }
  return root;
}

async function readDeveloperFile(filePath) {
  const stat = await fs.lstat(filePath);
  if (!stat.isFile()) throw projectError('INVALID_INPUT', 'Developer project entries must be regular files.');
  if (stat.size > MAX_DEVELOPER_FILE_BYTES) throw projectError('FILE_TOO_LARGE', 'Developer files must be 1 MB or smaller.');
  const buffer = await fs.readFile(filePath);
  let content = '';
  try {
    content = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
  } catch {
    throw projectError('INVALID_ENCODING', 'Developer files must use UTF-8.');
  }
  return validateDeveloperText(content);
}

function fileOrder(name) {
  const kind = developerFileKind(name);
  if (kind === 'compose') return 0;
  if (kind === 'dockerfile') return 1;
  if (kind === 'dockerignore') return 2;
  return 3;
}

async function loadDeveloperProject(ownerId, rootPath, selectedFilePath = '') {
  const owner = Number(ownerId);
  if (!Number.isInteger(owner) || owner <= 0) throw projectError('INVALID_INPUT', 'Invalid project owner.');
  const root = await canonicalProjectRoot(rootPath);
  const selectedName = selectedFilePath ? path.basename(selectedFilePath) : '';
  if (selectedName && !developerFileKind(selectedName)) {
    throw projectError('UNSUPPORTED_FILE', 'Choose a Dockerfile, Compose YAML, .dockerignore, or .env.example file.');
  }

  const entries = await fs.readdir(root, { withFileTypes: true });
  const names = entries
    .filter((entry) => entry.isFile() && developerFileKind(entry.name))
    .map((entry) => entry.name)
    .sort((a, b) => fileOrder(a) - fileOrder(b) || a.localeCompare(b))
    .slice(0, MAX_DEVELOPER_FILES);
  if (selectedName && !names.includes(selectedName)) names.unshift(selectedName);

  const files = [];
  const warnings = [];
  for (const name of names.slice(0, MAX_DEVELOPER_FILES)) {
    try {
      files.push({ name, kind: developerFileKind(name), content: await readDeveloperFile(path.join(root, name)) });
    } catch (error) {
      if (name === selectedName) throw error;
      warnings.push(`${name}: ${error?.message || 'Unable to read file'}`);
    }
  }

  const token = randomUUID();
  projects.set(owner, {
    token,
    root,
    files: new Set(files.map((file) => file.name))
  });
  return {
    token,
    name: path.basename(root),
    selectedFile: selectedName,
    files,
    warnings
  };
}

function requireDeveloperProject(ownerId, token) {
  const project = projects.get(Number(ownerId));
  if (!project || project.token !== String(token || '')) {
    throw projectError('PROJECT_EXPIRED', 'Open the developer project again.');
  }
  return project;
}

async function atomicWrite(filePath, content) {
  const tempPath = path.join(path.dirname(filePath), `.a0-launcher-${randomUUID()}.tmp`);
  try {
    await fs.writeFile(tempPath, content, { encoding: 'utf8', flag: 'wx', mode: 0o600 });
    await fs.rename(tempPath, filePath);
  } finally {
    await fs.rm(tempPath, { force: true }).catch(() => {});
  }
}

async function saveDeveloperProjectFile(ownerId, token, fileName, value) {
  const project = requireDeveloperProject(ownerId, token);
  const name = String(fileName || '').trim();
  const kind = developerFileKind(name);
  if (!kind) throw projectError('UNSUPPORTED_FILE', 'Use a Dockerfile, Compose YAML, .dockerignore, or .env.example filename.');
  const content = validateDeveloperText(value);
  const targetPath = path.join(project.root, name);

  if (!project.files.has(name)) {
    try {
      await fs.lstat(targetPath);
      throw projectError('FILE_EXISTS', `${name} already exists in this project.`);
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
    }
  }

  await atomicWrite(targetPath, content);
  project.files.add(name);
  return { name, kind, content };
}

async function developerProjectTarget(ownerId, token, fileName) {
  const project = requireDeveloperProject(ownerId, token);
  const name = String(fileName || '').trim();
  const kind = developerFileKind(name);
  if (!kind || !project.files.has(name)) throw projectError('FILE_NOT_SAVED', 'Save the selected developer file first.');
  const filePath = path.join(project.root, name);
  const stat = await fs.lstat(filePath);
  if (!stat.isFile()) throw projectError('INVALID_INPUT', 'Developer project entries must be regular files.');
  return { projectRoot: project.root, fileName: name, fileKind: kind };
}

async function writeDeveloperExport(filePath, value) {
  const targetPath = path.resolve(String(filePath || '').trim());
  if (!developerFileKind(path.basename(targetPath))) {
    throw projectError('UNSUPPORTED_FILE', 'Export as a Dockerfile, Compose YAML, .dockerignore, or .env.example file.');
  }
  await atomicWrite(targetPath, validateDeveloperText(value));
  return { exported: true, name: path.basename(targetPath) };
}

function closeDeveloperProjects(ownerId) {
  projects.delete(Number(ownerId));
}

module.exports = {
  MAX_DEVELOPER_FILE_BYTES,
  closeDeveloperProjects,
  developerFileKind,
  developerProjectTarget,
  loadDeveloperProject,
  saveDeveloperProjectFile,
  writeDeveloperExport
};
