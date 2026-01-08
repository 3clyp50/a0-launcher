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

  // Read a text file from the downloaded content directory (used by the component loader under file://)
  readContentFile: (relativePath) => ipcRenderer.invoke('read-content-file', relativePath),
});
