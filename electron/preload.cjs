const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('textFiles', {
  open: () => ipcRenderer.invoke('text:open'),
  save: (name, content) => ipcRenderer.invoke('text:save', { name, content })
});

contextBridge.exposeInMainWorld('photoFiles', {
  copy: bytes => ipcRenderer.invoke('photo:copy',bytes),
  save: (name,bytes) => ipcRenderer.invoke('photo:save',{name,bytes})
});
