const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('appUpdates',{check:()=>ipcRenderer.invoke('app:check-updates')});
contextBridge.exposeInMainWorld('textFiles', {
  open: () => ipcRenderer.invoke('text:open'),
  save: (name, content) => ipcRenderer.invoke('text:save', { name, content })
});

contextBridge.exposeInMainWorld('photoFiles', {
  copy: bytes => ipcRenderer.invoke('photo:copy',bytes),
  save: (name,bytes) => ipcRenderer.invoke('photo:save',{name,bytes})
});
