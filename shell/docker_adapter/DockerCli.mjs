import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { stripVTControlCharacters } from 'node:util';

const MAX_PROJECT_OUTPUT_CHARS = 12_000;

function cliError(code, message, output = '') {
  const error = new Error(message);
  error.code = code;
  error.output = output;
  return error;
}

function existingFile(value) {
  const candidate = String(value || '').trim();
  if (!candidate) return '';
  try {
    return fs.statSync(candidate).isFile() ? candidate : '';
  } catch {
    return '';
  }
}

function commandOnPath(command, env = process.env) {
  const names = process.platform === 'win32'
    ? (env.PATHEXT || '.EXE;.CMD;.BAT;.COM').split(';').map((ext) => `${command}${ext.toLowerCase()}`)
    : [command];
  for (const directory of String(env.PATH || '').split(path.delimiter).filter(Boolean)) {
    for (const name of names) {
      const found = existingFile(path.join(directory, name));
      if (found) return found;
    }
  }
  return '';
}

export function findDockerCliBinary(env = process.env) {
  const binary = process.platform === 'win32' ? 'docker.exe' : 'docker';
  const override = existingFile(env.A0_DOCKER_CLI_PATH) || existingFile(env.DOCKER_CLI_PATH);
  if (override) return override;
  const fromPath = commandOnPath('docker', env);
  if (fromPath) return fromPath;

  const home = os.homedir();
  const candidates = process.platform === 'win32'
    ? [
        path.join(env.ProgramFiles || 'C:\\Program Files', 'Docker', 'Docker', 'resources', 'bin', 'docker.exe'),
        path.join(env.ProgramW6432 || 'C:\\Program Files', 'Docker', 'Docker', 'resources', 'bin', 'docker.exe'),
        path.join(env.LOCALAPPDATA || path.join(home, 'AppData', 'Local'), 'Docker', 'resources', 'bin', 'docker.exe'),
        'C:\\ProgramData\\DockerDesktop\\version-bin\\docker.exe'
      ]
    : process.platform === 'darwin'
      ? [
          '/opt/homebrew/bin/docker',
          '/usr/local/bin/docker',
          '/usr/bin/docker',
          '/Applications/Docker.app/Contents/Resources/bin/docker',
          path.join(home, 'Applications', 'Docker.app', 'Contents', 'Resources', 'bin', 'docker')
        ]
      : ['/usr/bin/docker', '/usr/local/bin/docker', '/snap/bin/docker'];
  for (const candidate of candidates) {
    const found = existingFile(candidate);
    if (found) return found;
  }
  throw cliError('DOCKER_CLI_NOT_FOUND', 'Docker CLI was not found. Finish Docker Setup, then try again.');
}

function findLegacyComposeBinary(env = process.env) {
  return commandOnPath('docker-compose', env);
}

function cleanOutput(value) {
  const text = stripVTControlCharacters(String(value || '')).replace(/\r/g, '');
  return text.length <= MAX_PROJECT_OUTPUT_CHARS ? text : text.slice(-MAX_PROJECT_OUTPUT_CHARS);
}

function lastOutputLine(value) {
  return cleanOutput(value).split('\n').map((line) => line.trim()).filter(Boolean).at(-1)?.slice(0, 500) || '';
}

function runProcess(binary, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(binary, args, {
      cwd: options.cwd,
      env: options.env,
      windowsHide: true,
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    let output = '';
    let aborted = false;
    let timer = null;

    const append = (chunk) => {
      const text = cleanOutput(chunk?.toString('utf8'));
      if (!text) return;
      output = cleanOutput(`${output}${text}`);
      options.onOutput?.(output);
    };
    child.stdout?.on('data', append);
    child.stderr?.on('data', append);

    const abort = () => {
      aborted = true;
      child.kill();
    };
    options.signal?.addEventListener('abort', abort, { once: true });
    if (Number.isFinite(Number(options.timeoutMs)) && Number(options.timeoutMs) > 0) {
      timer = setTimeout(() => child.kill(), Number(options.timeoutMs));
    }

    child.once('error', (error) => {
      if (timer) clearTimeout(timer);
      options.signal?.removeEventListener('abort', abort);
      reject(cliError(error?.code === 'ENOENT' ? 'DOCKER_CLI_NOT_FOUND' : 'DOCKER_CLI_FAILED', error?.message || 'Docker CLI failed.', output));
    });
    child.once('close', (code, signal) => {
      if (timer) clearTimeout(timer);
      options.signal?.removeEventListener('abort', abort);
      if (aborted || options.signal?.aborted) return reject(cliError('ABORT_ERR', 'Docker action canceled.', output));
      if (code === 0) return resolve({ output: cleanOutput(output).trim(), exitCode: 0 });
      const detail = cleanOutput(output).trim();
      reject(cliError('DEVELOPER_PROJECT_FAILED', lastOutputLine(detail) || `Docker exited with code ${code ?? signal ?? 'unknown'}.`, detail));
    });
  });
}

async function composeCommand(dockerCli, env) {
  try {
    await runProcess(dockerCli, ['compose', 'version'], { env, timeoutMs: 5000 });
    return { binary: dockerCli, prefix: ['compose', '--ansi', 'never'] };
  } catch {
    const legacy = findLegacyComposeBinary(env);
    if (legacy) return { binary: legacy, prefix: ['--no-ansi'] };
    throw cliError('COMPOSE_UNAVAILABLE', 'Docker Compose is not installed. Install the Docker Compose plugin, then try again.');
  }
}

export function developerProjectCommand(options, compose = null, dockerCli = 'docker') {
  const action = String(options?.action || '');
  const projectRoot = String(options?.projectRoot || '');
  const fileName = String(options?.fileName || '');
  const fileKind = String(options?.fileKind || '');
  const filePath = path.join(projectRoot, fileName);

  if (fileKind === 'dockerfile') {
    if (action !== 'validate' && action !== 'build') throw cliError('INVALID_ACTION', 'This action requires a Compose file.');
    const args = ['build'];
    if (action === 'validate') args.push('--check');
    args.push('--file', filePath);
    if (action === 'build') args.push('--tag', String(options?.imageTag || 'a0-developer:latest'));
    args.push(projectRoot);
    return { binary: dockerCli, args, cwd: projectRoot };
  }

  if (fileKind !== 'compose' || !compose) throw cliError('INVALID_ACTION', 'Choose a Compose file for this action.');
  const common = [...compose.prefix, '--project-directory', projectRoot, '--file', filePath];
  const commands = {
    validate: ['config', '--quiet'],
    build: ['build'],
    up: ['up', '--detach'],
    stop: ['stop'],
    down: ['down'],
    logs: ['logs', '--no-color', '--tail', '200']
  };
  if (!commands[action]) throw cliError('INVALID_ACTION', 'Unsupported developer project action.');
  return { binary: compose.binary, args: [...common, ...commands[action]], cwd: projectRoot };
}

export async function runDeveloperProjectCommand(options = {}) {
  const env = { ...process.env };
  const dockerHost = String(options?.dockerHost || '').trim();
  if (dockerHost) env.DOCKER_HOST = dockerHost;
  const dockerCli = findDockerCliBinary(env);
  if (options?.fileKind === 'dockerfile' && options?.action === 'validate') {
    const help = await runProcess(dockerCli, ['build', '--help'], { env, timeoutMs: 5000 });
    if (!/(?:^|\s)--check(?:\s|$)/m.test(help.output)) {
      throw cliError('DOCKERFILE_CHECK_UNAVAILABLE', 'Dockerfile checks require Docker Buildx. Use Build to validate this Dockerfile with the selected runtime.');
    }
  }
  const compose = options?.fileKind === 'compose' ? await composeCommand(dockerCli, env) : null;
  const command = developerProjectCommand(options, compose, dockerCli);
  return runProcess(command.binary, command.args, {
    cwd: command.cwd,
    env,
    signal: options.signal,
    onOutput: options.onOutput,
    timeoutMs: options.timeoutMs
  });
}
