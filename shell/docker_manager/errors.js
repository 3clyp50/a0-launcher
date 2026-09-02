function mapDockerInterfaceErrorToUiMessage(error) {
  const code = (error && typeof error === 'object' && error.code) ? String(error.code) : '';
  const msg = (error && typeof error === 'object' && typeof error.message === 'string') ? error.message : '';

  if (msg && /port is already allocated/i.test(msg)) {
    return 'That port is already in use. Choose different ports and try again.';
  }

  // Keep messages non-technical. Any technical troubleshooting belongs in a dedicated help surface.
  switch (code) {
    case 'PERMISSION_DENIED':
      return 'Agent Zero does not have permission to use its local setup. Check the requested system permission, then try again.';
    case 'DAEMON_UNAVAILABLE':
      return 'Agent Zero\'s local services are not running. Start them, then try again.';
    case 'DOCKER_NOT_FOUND':
    case 'DOCKERODE_MISSING':
      return 'Agent Zero\'s local support is unavailable. Complete local setup, then try again.';
    case 'INVALID_DOCKER_HOST':
    case 'INVALID_RUNTIME_ENDPOINT':
      return 'Agent Zero cannot use the selected local setup. Choose another option or refresh.';
    case 'RUNTIME_ENDPOINT_UNAVAILABLE':
      return 'The selected local setup is no longer available. Choose another option or refresh.';
    case 'INVALID_RUNTIME_PATH':
      return 'Agent Zero cannot use the selected local setup folder. Choose another location and try again.';
    case 'INVALID_ARGS':
      return 'Agent Zero received an invalid local setup request. Refresh and try again.';
    case 'RUNTIME_NOT_PROVISIONED':
      return 'Local setup is not complete yet.';
    case 'RUNTIME_PROVISION_FAILED':
      return 'Agent Zero could not finish local setup. Try again.';
    case 'RUNTIME_START_FAILED':
      return 'Agent Zero could not start its local services. Try again.';
    case 'RUNTIME_NEEDS_RELOGIN':
      return 'Sign out of this computer and sign back in once, then return here to finish setup.';
    case 'RUNTIME_MANUAL_INSTALL':
      return 'This computer needs a few system components before Agent Zero can run locally.';
    case 'RUNTIME_AUTH_DECLINED':
      return 'Authentication was cancelled. Nothing was changed.';
    case 'RUNTIME_UNSUPPORTED':
      return 'Automatic local setup is not available on this system.';
    case 'RUNTIME_UNSUPPORTED_ARCHITECTURE':
      return 'This computer\'s processor is not supported by the current Agent Zero local setup.';
    case 'RUNTIME_PATH_COLLISION':
      return 'Agent Zero found existing files in its local setup folder and left them untouched. Move or rename them, then try again.';
    case 'RUNTIME_NAME_COLLISION':
      return 'Agent Zero found an existing local setup it does not own and left it untouched. Rename or remove that setup, then try again.';
    case 'RUNTIME_MANIFEST_INVALID':
    case 'CHECKSUM_MISMATCH':
    case 'DOWNLOAD_SIZE_MISMATCH':
    case 'DOWNLOAD_TOO_LARGE':
    case 'DOWNLOAD_UNTRUSTED_REDIRECT':
    case 'INVALID_JSON':
      return 'The local setup download could not be verified. Nothing was installed. Try again later.';
    case 'DOWNLOAD_FAILED':
      return 'Agent Zero could not download its local setup. Check your connection and try again.';
    case 'SETUP_DOWNLOAD_FAILED':
      return 'The setup download failed. Check your connection and try again.';
    case 'SETUP_INSTALLER_OPEN_FAILED':
      return 'The setup installer could not be opened. Open the setup guide instead.';
    case 'SPAWN_FAILED':
      return 'Agent Zero could not start a required system process. Try again.';
    case 'INVALID_USERNAME':
      return 'Automatic local setup cannot use this Windows account name. Open the manual setup guide for help.';
    case 'RUNTIME_SETUP_BUSY':
      return 'Another Agent Zero setup is already running. Try again after it finishes.';
    case 'TIMEOUT':
      return 'Setup took too long and stopped safely. Try again.';
    case 'ABORTED':
      return 'Setup was canceled.';

    case 'REGISTRY_RATE_LIMIT':
      return 'Update checks are temporarily unavailable. Please try again later.';
    case 'REGISTRY_AUTH_FAILED':
      return 'Update checks are unavailable. Please try again later.';
    case 'REGISTRY_ERROR':
    case 'REGISTRY_NO_DIGEST':
      return 'Update checks are unavailable right now. Please try again later.';
    case 'DOCKER_PULL_RATE_LIMIT':
      return 'Version downloads are temporarily limited. Sign in to Docker Hub or try again later.';

    case 'GITHUB_API_ERROR':
    case 'GITHUB_PAGINATION_ERROR':
      return 'Update checks are unavailable right now. Please try again later.';

    case 'OP_IN_PROGRESS':
      return 'Another operation is already running. Please wait for it to finish.';
    case 'OP_NOT_FOUND':
      return 'No operation is currently running.';
    case 'INVALID_OP_ID':
    case 'INVALID_CONTAINER_ID':
      return 'Invalid request.';
    case 'INVALID_RETENTION_POLICY':
      return 'Invalid retention setting.';
    case 'INVALID_PORT_PREFERENCES':
      return 'Invalid port settings. Use three different ports (1-65535).';
    case 'INVALID_PORT_MAPPINGS':
      return 'Invalid port mapping. Use computer port:Instance port, for example 3000:80, or 0:80 to choose an available computer port.';
    case 'INVALID_ENV_VARS':
      return 'Invalid environment variables. Use KEY=value lines.';
    case 'INVALID_IMAGE':
      return 'Invalid image name.';
    case 'INVALID_MOUNTS':
      return 'Invalid mount. Use source:/container/path with optional :ro or :rw.';
    case 'INVALID_REMOTE_INSTANCE':
      return 'Enter a valid remote instance URL.';
    case 'INVALID_DATA_LOSS_ACK':
      return 'Please confirm the warning to continue.';
    case 'NOT_INSTALLED':
      return 'This version is not installed yet.';
    case 'IMAGE_IN_USE':
      return 'This version is still used by an Instance. Delete the Instance first, then remove the version.';
    case 'NOT_YET_AVAILABLE':
      return 'This version is not available yet. Please try again later.';
    case 'INSTANCE_NOT_FOUND':
      return 'Instance not found.';
    case 'UI_NOT_READY':
      return 'Agent Zero is still starting. Wait a moment, then choose Refresh.';
    case 'INSTANCE_DELETED_STORAGE_REMAINS':
      return 'Instance deleted, but its /a0/usr workspace data could not be removed.';
    case 'CANNOT_DELETE_ACTIVE':
      return 'You cannot delete the active instance.';
    case 'NO_RELEASES':
      return 'No official releases are available right now.';
    case 'NO_ACTIVE_INSTANCE':
      return 'No active instance is available.';
    case 'CREATE_FAILED':
      return 'Unable to create the Instance.';
    case 'CONFLICT':
      return 'Unable to start due to a conflict (ports or name already in use).';
    case 'INVALID_TAG':
      return 'Invalid Version tag.';
    case 'TAG_NOT_ALLOWED':
      return 'That version is not supported.';
    case 'INVALID_BACKUP_PATH':
      return 'Choose a valid Agent Zero backup .zip file.';
    case 'BACKUP_NOT_FOUND':
      return 'Backup file was not found.';
    case 'BACKUP_EMPTY':
      return 'No files were found in the /a0/usr workspace to back up.';
    case 'BACKUP_TOO_LARGE':
      return msg || 'Backup is too large to export.';
    case 'BACKUP_UNAVAILABLE':
      return 'Backup is not available with the selected local setup.';
    case 'RESTORE_UNAVAILABLE':
      return 'Restore is not available with the selected local setup.';
    case 'WORKSPACE_COPY_UNAVAILABLE':
      return 'Copying the /a0/usr workspace is not available with the selected local setup.';
    case 'WORKSPACE_ALREADY_PERSISTENT':
      return 'This Instance already keeps its /a0/usr workspace between updates.';
    case 'INVALID_STORAGE_MODE':
      return 'Choose persistent storage for the /a0/usr workspace, then try again.';
    case 'SOURCE_IMAGE_NOT_FOUND':
      return 'The source Instance Version is unavailable.';
    case 'TERMINAL_UNAVAILABLE':
      return 'Agent Zero could not open a terminal on this computer.';
    case 'INVALID_BACKUP_ARCHIVE':
      return msg || 'This backup does not contain restorable /a0/usr workspace data.';

    case 'NOT_IMPLEMENTED':
      return 'This action is not available yet.';

    default:
      return '';
  }
}

function safeFallbackMessage(message) {
  const value = typeof message === 'string' ? message.trim() : '';
  if (!value) return '';
  const technical = /\b(?:docker|wsl|container|image|daemon|runtime|endpoint|distro|distribution|socket|pipe|spawn|checksum|manifest|opid)\b|\b(?:ENOENT|EACCES|ECONNREFUSED)\b|[A-Za-z]:\\|\/(?:a0|home|usr|var)\//i.test(value);
  return technical ? '' : value;
}

function toErrorResponse(error) {
  const code = (error && typeof error === 'object' && error.code) ? String(error.code) : undefined;
  const raw = (error && typeof error === 'object' && typeof error.message === 'string') ? error.message.trim() : '';
  const friendly = mapDockerInterfaceErrorToUiMessage(error);
  const message =
    friendly ||
    safeFallbackMessage(raw) ||
    'Agent Zero could not complete this action. Try again or open Diagnostics.';

  const payload = { message };
  if (code) payload.code = code;
  if (!friendly && raw && raw !== message) payload.technicalDetail = raw.slice(0, 2000);
  return payload;
}

module.exports = {
  mapDockerInterfaceErrorToUiMessage,
  safeFallbackMessage,
  toErrorResponse
};
