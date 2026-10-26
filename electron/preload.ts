import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  openOAuthWindow: (clientId: string) => ipcRenderer.invoke('open-oauth-window', clientId),
  openExternal: (url: string) => ipcRenderer.invoke('open-external', url),
  openReadme: () => ipcRenderer.invoke('open-readme'),
});

