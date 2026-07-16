const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('a0LauncherHost', {
  getState: () => ipcRenderer.invoke('launcher-host:get-state'),
  openSettings: () => ipcRenderer.invoke('launcher-host:open-settings'),
  reconnect: () => ipcRenderer.invoke('launcher-host:reconnect'),
  rearmComputerUse: () => ipcRenderer.invoke('launcher-host:rearm-computer-use')
});
