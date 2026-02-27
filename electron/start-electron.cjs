// start-electron.cjs — waits for Vite then launches Electron
const { execSync, spawn } = require("child_process");
const http = require("http");

const VITE_URL = "http://localhost:5173";
const MAX_WAIT_MS = 30000;
const POLL_MS = 300;

function waitForVite(url, timeout) {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + timeout;
    function poll() {
      http.get(url, (res) => {
        res.resume();
        resolve();
      }).on("error", () => {
        if (Date.now() > deadline) return reject(new Error("Timed out waiting for Vite"));
        setTimeout(poll, POLL_MS);
      });
    }
    poll();
  });
}

console.log("⏳ Waiting for Vite at", VITE_URL, "…");
waitForVite(VITE_URL, MAX_WAIT_MS)
  .then(() => {
    console.log("✅ Vite ready — launching Electron");
    const electronPath = require("electron");
    const child = spawn(electronPath, ["."], {
      stdio: "inherit",
      env: { ...process.env, ELECTRON_ENABLE_LOGGING: "1" },
    });
    child.on("close", (code) => process.exit(code));
  })
  .catch((err) => {
    console.error("❌", err.message);
    process.exit(1);
  });
