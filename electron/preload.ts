import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  store: {
    get: (key: string) => ipcRenderer.invoke('store:get', key),
    set: (key: string, value: unknown) => ipcRenderer.invoke('store:set', key, value)
  },
  dialog: {
    openFile: (filters: { name: string; extensions: string[] }[]) =>
      ipcRenderer.invoke('dialog:openFile', filters)
  },
  fs: {
    readFile: (filePath: string) => ipcRenderer.invoke('fs:readFile', filePath)
  },
  notification: {
    show: (title: string, body: string) =>
      ipcRenderer.invoke('notification:show', title, body)
  }
})
