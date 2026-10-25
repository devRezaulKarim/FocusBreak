const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('settingsAPI', {
  getConfig: () => ipcRenderer.invoke('config:get'),
  saveConfig: (cfg) => ipcRenderer.invoke('config:save', cfg),
  close: () => ipcRenderer.send('settings:close'),
  getStatus: () => ipcRenderer.invoke('timer:status'),
  terminateTimer: () => ipcRenderer.invoke('timer:terminate'),
  startTimer: () => ipcRenderer.invoke('timer:start'),
  onTick: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('timer:tick', handler);
    return () => ipcRenderer.removeListener('timer:tick', handler);
  },
  onStateChange: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('timer:state-changed', handler);
    return () => ipcRenderer.removeListener('timer:state-changed', handler);
  }
});
