const { app, BrowserWindow, Tray, Menu, ipcMain } = require('electron');
const path = require('path');
const AutoLaunch = require('auto-launch');

let win;
let tray;

if (process.env.NODE_ENV !== 'production') {
  try {
    require('electron-reload')(__dirname, {
      electron: require(`${__dirname}/node_modules/electron`)
    });
  } catch (err) {
    console.log('Electron reload not available:', err);
  }
}

function createWindow() {
  win = new BrowserWindow({
    width: 420,
    height: 500,
    alwaysOnTop: false,
    frame: false,
    transparent: true,
    resizable: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js') // preload for IPC
    },
  });

  win.loadURL('https://google.com');

  // Minimize to tray instead of quitting
  win.on('close', (event) => {
    if (!app.isQuiting) {
      event.preventDefault();
      win.hide();
    }
  });

  win.webContents.on('did-finish-load', () => {
    win.webContents.executeJavaScript(`
      // Create a floating titlebar
      const titlebar = document.createElement('div');
      titlebar.id = 'electron-titlebar';
      titlebar.innerHTML = \`
        <button id="back-btn">←</button>
        <button id="min-btn">_</button>
        <button id="max-btn">[ ]</button>
        <button id="close-btn">X</button>
      \`;
      document.body.appendChild(titlebar);

      // Style the titlebar
      const style = document.createElement('style');
      style.innerHTML = \`
        #electron-titlebar {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 30px;
          background: #0e5290;
          display: flex;
          justify-content: flex-end;
          align-items: center;
          -webkit-app-region: drag;
          z-index: 9999;
        }
        #electron-titlebar button {
          -webkit-app-region: no-drag;
          margin: 0 5px;
          width: 30px;
          height: 20px;
          cursor: pointer;
          color: #ffffff;
          background: transparent;
          border: none;
        }
        #back-btn {
          margin-right: auto;
        }
        body {
          margin-top: 30px !important;
        }
      \`;
      document.head.appendChild(style);

      // Hook buttons
      document.getElementById('min-btn').addEventListener('click', () => window.electronAPI.minimize());
      document.getElementById('max-btn').addEventListener('click', () => window.electronAPI.maximize());
      document.getElementById('close-btn').addEventListener('click', () => window.electronAPI.close());
      document.getElementById('back-btn').addEventListener('click', () => window.electronAPI.goBack());
    `);
  });
}

ipcMain.on('window-minimize', () => win.minimize());
ipcMain.on('window-maximize', () => win.isMaximized() ? win.unmaximize() : win.maximize());
ipcMain.on('window-close', () => win.close());
ipcMain.on('window-go-back', () => {
  if (win && win.webContents.canGoBack()) {
    win.webContents.goBack();
  }
});

app.whenReady().then(() => {
  createWindow();

  // Tray icon and menu
  tray = new Tray(path.join(__dirname, 'icon.png'));

  // Left-click shows dashboard immediately
  tray.on('click', () => {
    if (win) {
      win.show();
      win.focus();
    }
  });

  const contextMenu = Menu.buildFromTemplate([
    { label: 'Show Dashboard', click: () => win.show() },
    { label: 'Quit', click: () => { app.isQuiting = true; app.quit(); } },
  ]);
  
  tray.setToolTip('Project Dashboard');
  tray.setContextMenu(contextMenu);

  // Auto-start on boot
  const autoLauncher = new AutoLaunch({ name: 'Project Dashboard' });
  autoLauncher.enable();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
