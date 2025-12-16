const { contextBridge, ipcRenderer } = require('electron');

// Store listener references for cleanup
let statusListener = null;
let errorListener = null;

contextBridge.exposeInMainWorld('electronAPI', {
  onStatusUpdate: (callback) => {
    // Remove existing listener before adding new one
    if (statusListener) {
      ipcRenderer.removeListener('update-status', statusListener);
    }
    statusListener = (_event, message) => callback(message);
    ipcRenderer.on('update-status', statusListener);
  },
  onError: (callback) => {
    // Remove existing listener before adding new one
    if (errorListener) {
      ipcRenderer.removeListener('update-error', errorListener);
    }
    errorListener = (_event, message) => callback(message);
    ipcRenderer.on('update-error', errorListener);
  },
  removeAllListeners: () => {
    if (statusListener) {
      ipcRenderer.removeListener('update-status', statusListener);
      statusListener = null;
    }
    if (errorListener) {
      ipcRenderer.removeListener('update-error', errorListener);
      errorListener = null;
    }
  },
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getContentVersion: () => ipcRenderer.invoke('get-content-version')
});
