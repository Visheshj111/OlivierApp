const { app, BrowserWindow, Notification, ipcMain, Tray, Menu, nativeImage, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
let autoUpdater;

// Set app name early so notifications show "Olivier" instead of "Electron"
app.name = "Olivier";
app.setName("Olivier");

// --- File-based persistent storage (reliable across restarts) ---
function getStorePath() {
  return path.join(app.getPath("userData"), "olivier-data.json");
}

function readStore() {
  try {
    const p = getStorePath();
    if (fs.existsSync(p)) return fs.readFileSync(p, "utf-8");
  } catch (e) { console.warn("Store read error:", e.message); }
  return null;
}

function writeStore(data) {
  try {
    fs.writeFileSync(getStorePath(), data, "utf-8");
    return true;
  } catch (e) { console.warn("Store write error:", e.message); }
  return false;
}

let mainWindow;
let tray;

const isDev = !app.isPackaged;

// Load icon from file — used for tray and BrowserWindow
function getIconPath(name) {
  return path.join(__dirname, name);
}
function loadIcon(name) {
  try {
    const p = getIconPath(name);
    if (fs.existsSync(p)) return nativeImage.createFromPath(p);
  } catch (e) { console.warn("Icon load error:", e.message); }
  return nativeImage.createEmpty();
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 820,
    height: 700,
    minWidth: 400,
    minHeight: 400,
    title: "Olivier",
    icon: getIconPath("icon.png"),
    backgroundColor: "#F4F6F9",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
  } else {
    mainWindow.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }

  // Hide to tray instead of closing
  mainWindow.on("close", (e) => {
    if (!app.isQuitting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });
}

function createTray() {
  try {
    const icon = loadIcon("tray-icon.png");
    tray = new Tray(icon);
    tray.setToolTip("Olivier");

    const contextMenu = Menu.buildFromTemplate([
      {
        label: "Open Olivier",
        click: () => { mainWindow.show(); mainWindow.focus(); },
      },
      { type: "separator" },
      {
        label: "Quit",
        click: () => { app.isQuitting = true; app.quit(); },
      },
    ]);

    tray.setContextMenu(contextMenu);
    tray.on("double-click", () => { mainWindow.show(); mainWindow.focus(); });
  } catch (err) {
    console.warn("Tray creation failed (non-fatal):", err.message);
  }
}

// IPC: Send a native desktop notification
ipcMain.handle("send-notification", (_event, { title, body }) => {
  try {
    if (Notification.isSupported()) {
      const notif = new Notification({ title, body, icon: getIconPath("icon.png") });
      notif.show();
      notif.on("click", () => { mainWindow.show(); mainWindow.focus(); });
      return true;
    }
  } catch (e) {
    console.warn("Notification error:", e.message);
  }
  return false;
});

ipcMain.handle("notification-supported", () => Notification.isSupported());

// Persistent file storage IPC
ipcMain.handle("store-read", () => readStore());
ipcMain.handle("store-write", (_event, data) => writeStore(data));

// Auto-start on system startup
ipcMain.handle("get-auto-start", () => {
  return app.getLoginItemSettings().openAtLogin;
});

ipcMain.handle("set-auto-start", (_event, enabled) => {
  app.setLoginItemSettings({ openAtLogin: enabled, openAsHidden: true });
  return true;
});

// ── Single-instance lock: prevent duplicate app windows ──
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  // Another instance is already running — quit this one
  app.quit();
} else {
  app.on("second-instance", () => {
    // Someone tried to open a second instance — focus the existing window
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

app.whenReady().then(() => {
  if (!gotTheLock) return; // safety: don't create window if we're quitting
  
  // Enable auto-start by default on first run (only in production)
  if (!isDev) {
    const loginSettings = app.getLoginItemSettings();
    if (!loginSettings.wasOpenedAtLogin && loginSettings.openAtLogin === false) {
      // First time - enable auto-start by default
      app.setLoginItemSettings({ openAtLogin: true, openAsHidden: true });
    }
  }
  
  createWindow();
  createTray();

  // --- Auto-updater (only in production) ---
  if (!isDev) {
    try {
      autoUpdater = require("electron-updater").autoUpdater;
    } catch (err) {
      console.warn("Auto-updater unavailable:", err.message);
      return;
    }
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;

    autoUpdater.on("update-available", (info) => {
      console.log("Update available:", info.version);
      if (mainWindow) mainWindow.webContents.send("update-available", info.version);
    });

    autoUpdater.on("download-progress", (progress) => {
      if (mainWindow) mainWindow.webContents.send("update-progress", Math.round(progress.percent));
    });

    autoUpdater.on("update-downloaded", (info) => {
      if (mainWindow) mainWindow.webContents.send("update-downloaded", info.version);
    });

    autoUpdater.on("error", (err) => {
      console.warn("Auto-update error (non-fatal):", err.message);
    });

    // IPC: renderer requests install
    ipcMain.handle("install-update", () => {
      autoUpdater.quitAndInstall();
    });

    // Check for updates after a short delay (let app fully load first)
    setTimeout(() => {
      autoUpdater.checkForUpdatesAndNotify().catch(() => {});
    }, 5000);
  }
});

// Expose app version to renderer
ipcMain.handle("get-app-version", () => app.getVersion());

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on("before-quit", () => {
  app.isQuitting = true;
});
