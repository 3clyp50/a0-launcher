const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  onStatusUpdate: (callback) => {
    ipcRenderer.on('update-status', (_event, message) => callback(message));
  },
  onError: (callback) => {
    ipcRenderer.on('update-error', (_event, message) => callback(message));
  },
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getContentVersion: () => ipcRenderer.invoke('get-content-version'),
  getShellIconDataUrl: () => ipcRenderer.invoke('get-shell-icon-data-url')
});

contextBridge.exposeInMainWorld('dockerManagerAPI', {
  getState: () => ipcRenderer.invoke('docker-manager:getState'),
  refresh: () => ipcRenderer.invoke('docker-manager:refresh'),
  installOrSync: (tag) => ipcRenderer.invoke('docker-manager:install', { tag }),
  startActive: () => ipcRenderer.invoke('docker-manager:startActive'),
  stopActive: () => ipcRenderer.invoke('docker-manager:stopActive'),
  setRetentionPolicy: (keepCount) => ipcRenderer.invoke('docker-manager:setRetentionPolicy', { keepCount }),
  setPortPreferences: (prefs) => {
    const p = prefs && typeof prefs === 'object' ? prefs : {};
    return ipcRenderer.invoke('docker-manager:setPortPreferences', { ui: p.ui, ssh: p.ssh });
  },
  deleteRetainedInstance: (containerId) =>
    ipcRenderer.invoke('docker-manager:deleteRetainedInstance', { containerId }),
  updateToLatest: (dataLossAck) => ipcRenderer.invoke('docker-manager:updateToLatest', { dataLossAck }),
  activateVersion: (tag, dataLossAck) => ipcRenderer.invoke('docker-manager:activate', { tag, dataLossAck }),
  activateRetainedInstance: (containerId, dataLossAck) =>
    ipcRenderer.invoke('docker-manager:activateRetainedInstance', { containerId, dataLossAck }),
  cancel: (opId) => ipcRenderer.invoke('docker-manager:cancel', { opId }),
  getInventory: () => ipcRenderer.invoke('docker-manager:getInventory'),
  removeVolume: (volumeName) => ipcRenderer.invoke('docker-manager:removeVolume', { volumeName }),
  pruneVolumes: () => ipcRenderer.invoke('docker-manager:pruneVolumes'),
  installDocker: () => ipcRenderer.invoke('docker-manager:installDocker'),
  openUi: () => ipcRenderer.invoke('docker-manager:openUi'),
  openHomepage: () => ipcRenderer.invoke('docker-manager:openHomepage'),
  onStateChange: (callback) => {
    if (typeof callback !== 'function') return () => {};
    const listener = (_event, state) => callback(state);
    ipcRenderer.on('docker-manager:state', listener);
    return () => ipcRenderer.removeListener('docker-manager:state', listener);
  },
  onProgress: (callback) => {
    if (typeof callback !== 'function') return () => {};
    const listener = (_event, progress) => callback(progress);
    ipcRenderer.on('docker-manager:progress', listener);
    return () => ipcRenderer.removeListener('docker-manager:progress', listener);
  }
});
