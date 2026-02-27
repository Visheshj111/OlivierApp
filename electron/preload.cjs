const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  sendNotification: (data) => ipcRenderer.invoke("send-notification", data),
  isNotificationSupported: () => ipcRenderer.invoke("notification-supported"),
  storeRead: () => ipcRenderer.invoke("store-read"),
  storeWrite: (data) => ipcRenderer.invoke("store-write", data),
  getAppVersion: () => ipcRenderer.invoke("get-app-version"),
  getAutoStart: () => ipcRenderer.invoke("get-auto-start"),
  setAutoStart: (enabled) => ipcRenderer.invoke("set-auto-start", enabled),
  isElectron: true,
});
