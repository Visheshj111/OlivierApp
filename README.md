# Olivier

**Olivier** is a lightweight desktop app for managing leads and follow-ups — built for sales professionals who want to stay on top of their pipeline without the bloat of a full CRM.

![Platform](https://img.shields.io/badge/platform-Windows-blue)
![Version](https://img.shields.io/github/v/release/Visheshj111/OlivierApp)
![License](https://img.shields.io/badge/license-MIT-green)

---

## Features

- **Lead management** — Add leads with company, contact, deadline, and notes
- **Timeline & follow-ups** — Log every call and follow-up directly inside a lead card
- **Dashboard overview** — See total leads, active vs closed, and a leads-over-time chart
- **Deadline notifications** — Get native Windows desktop notifications when deadlines are due
- **System tray** — Runs quietly in the background; close the window and it stays in the tray
- **Auto-updates** — The app updates itself automatically when a new version is released
- **Offline & private** — No cloud, no account, no internet required. Your data stays on your machine

---

## Download

👉 **[Download the latest version](https://github.com/Visheshj111/OlivierApp/releases/latest)**

- `Olivier-Setup-x.x.x.exe` — Installer (recommended)
- `Olivier-Portable.exe` — No installation needed, just run it

---

## Getting Started

1. Download the installer from the link above
2. Run `Olivier-Setup-x.x.x.exe` and follow the prompts
3. Launch **Olivier** from your desktop or Start Menu
4. Click **+ Add Lead** to add your first lead
5. Set a deadline and Olivier will notify you when it's due

---

## How Updates Work

When a new version is released, Olivier will automatically detect it the next time you open the app. A dialog will appear letting you choose to **Restart Now** or **Later** — the update installs silently in the background.

---

## Data & Privacy

All your data is stored locally in:
```
C:\Users\<you>\AppData\Roaming\Olivier\olivier-data.json
```
Nothing is sent to any server. Ever.

---

## Built With

| Technology | Purpose |
|---|---|
| [Electron](https://www.electronjs.org/) | Desktop app framework |
| [React](https://react.dev/) | UI |
| [Vite](https://vitejs.dev/) | Build tool |
| [electron-builder](https://www.electron.build/) | Packaging & installer |
| [electron-updater](https://www.electron.build/auto-update) | Auto-updates via GitHub Releases |
| [Lucide React](https://lucide.dev/) | Icons |

---

## For Developers

```bash
# Install dependencies
npm install

# Run in development mode
npm run electron:dev

# Build and package
node .\node_modules\vite\bin\vite.js build
.\node_modules\.bin\electron-builder.cmd --win --dir
```

To publish a new release:
1. Bump `"version"` in `package.json`
2. Run `.\node_modules\.bin\electron-builder.cmd --win --publish always` with `$env:GH_TOKEN` set
3. Publish the draft release on GitHub

---

*Made with ❤️ by [Visheshj111](https://github.com/Visheshj111)*

The React Compiler is currently not compatible with SWC. See [this issue](https://github.com/vitejs/vite-plugin-react/issues/428) for tracking the progress.

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
