const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('overlayAPI', {
  onTick: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('timer:tick', handler);
    return () => ipcRenderer.removeListener('timer:tick', handler);
  },
  onStateChange: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('timer:state-changed', handler);
    return () => ipcRenderer.removeListener('timer:state-changed', handler);
  },
  skip: () => ipcRenderer.send('overlay:skip')
});
