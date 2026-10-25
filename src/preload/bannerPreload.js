const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('bannerAPI', {
  onTick: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('timer:tick', handler);
    return () => ipcRenderer.removeListener('timer:tick', handler);
  },
  close: () => ipcRenderer.send('banner:close'),
  skip: () => ipcRenderer.send('banner:skip'),
  postpone: (minutes) => ipcRenderer.send('banner:postpone', minutes),
  breakNow: () => ipcRenderer.send('banner:break-now')
});
