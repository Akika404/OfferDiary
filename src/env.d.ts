/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<object, object, unknown>
  export default component
}

interface ElectronAPI {
  store: {
    get: (key: string) => Promise<unknown>
    set: (key: string, value: unknown) => Promise<void>
  }
  dialog: {
    openFile: (filters: { name: string; extensions: string[] }[]) => Promise<{
      canceled: boolean
      filePaths: string[]
    }>
  }
  fs: {
    readFile: (filePath: string) => Promise<string>
  }
  notification: {
    show: (title: string, body: string) => Promise<void>
  }
}

interface Window {
  electronAPI: ElectronAPI
}
