// Narrow bridge between the widget page and the main process.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('widget', {
  onState: (cb) => ipcRenderer.on('state', (_e, s) => cb(s)),
  onConfig: (cb) => ipcRenderer.on('config', (_e, c) => cb(c)),
  setSize: (w, h, dock) => ipcRenderer.send('size', w, h, dock),
  move: (x, y) => ipcRenderer.send('move', x, y),
  moved: () => ipcRenderer.send('moved'),
  refresh: () => ipcRenderer.send('refresh'),
  login: () => ipcRenderer.send('login'),
  menu: () => ipcRenderer.send('menu'),
});
