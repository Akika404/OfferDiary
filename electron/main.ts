import { app, BrowserWindow, ipcMain, dialog, Notification } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'
import Store from 'electron-store'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

process.env.APP_ROOT = path.join(__dirname, '..')
const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

const store = new Store({
  name: 'offer-diary-data',
  defaults: {
    companies: [],
    interviews: [],
    pipelineConfig: {
      stages: [
        { name: '已投递', color: '#2080f0' },
        { name: '笔试', color: '#0fb9b1' },
        { name: '一面', color: '#3867d6' },
        { name: '二面', color: '#7c3aed' },
        { name: 'HR面', color: '#f0a020' },
        { name: 'Offer', color: '#18a058', terminal: true },
        { name: '拒绝', color: '#d03050', terminal: true },
        { name: '流程终止', color: '#909399', terminal: true }
      ]
    }
  }
})

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    title: '校招日记',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

// IPC: Data persistence
ipcMain.handle('store:get', (_event, key: string) => {
  return store.get(key)
})

ipcMain.handle('store:set', (_event, key: string, value: unknown) => {
  store.set(key, value)
})

// IPC: File dialog
ipcMain.handle('dialog:openFile', async (_event, filters: Electron.FileFilter[]) => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters
  })
  return result
})

// IPC: Read file
ipcMain.handle('fs:readFile', async (_event, filePath: string) => {
  return fs.readFileSync(filePath, 'utf-8')
})

// IPC: Notification
ipcMain.handle('notification:show', (_event, title: string, body: string) => {
  new Notification({ title, body }).show()
})

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})
