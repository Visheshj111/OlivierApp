const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  sendNotification: (data) => ipcRenderer.invoke("send-notification", data),
  isNotificationSupported: () => ipcRenderer.invoke("notification-supported"),
  storeRead: () => ipcRenderer.invoke("store-read"),
  storeWrite: (data) => ipcRenderer.invoke("store-write", data),
  getAppVersion: () => ipcRenderer.invoke("get-app-version"),
  getAutoStart: () => ipcRenderer.invoke("get-auto-start"),
  setAutoStart: (enabled) => ipcRenderer.invoke("set-auto-start", enabled),
  installUpdate: () => ipcRenderer.invoke("install-update"),
  onUpdateAvailable: (cb) => ipcRenderer.on("update-available", (_e, v) => cb(v)),
  onUpdateProgress: (cb) => ipcRenderer.on("update-progress", (_e, pct) => cb(pct)),
  onUpdateDownloaded: (cb) => ipcRenderer.on("update-downloaded", (_e, v) => cb(v)),
  isElectron: true,
});
