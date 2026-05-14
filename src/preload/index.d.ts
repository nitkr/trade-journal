import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: {
      platform: string
      getVersion: () => string
      minimizeWindow: () => void
      maximizeWindow: () => void
      closeWindow: () => void
      storeData: (key: string, value: any) => Promise<void>
      getData: (key: string) => Promise<any>
    }
  }
}