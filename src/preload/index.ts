import { contextBridge, ipcRenderer } from 'electron'

// Custom APIs for renderer
const api = {
  // Platform info
  platform: process.platform,
  
  // App info  
  getVersion: () => process.env.npm_package_version || '1.0.0',
  
  // Window controls via IPC
  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  maximizeWindow: () => ipcRenderer.send('window-maximize'),
  closeWindow: () => ipcRenderer.send('window-close'),
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore
  window.electron = api
}