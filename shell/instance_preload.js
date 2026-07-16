const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('a0LauncherHost', {
  getState: () => ipcRenderer.invoke('launcher-host:get-state'),
  reconnect: () => ipcRenderer.invoke('launcher-host:reconnect')
});
