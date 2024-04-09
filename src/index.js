const { app, BrowserWindow, shell, Menu, webContents, ipcMain, Accelerator, session } = require("electron");
const path = require("path");

const { ElectronBlocker } = require('@cliqz/adblocker-electron');
const fetch = require('cross-fetch');
const fs = require('fs');

const gotTheLock = app.requestSingleInstanceLock();
const iconPath = path.join(__dirname, '/assets/logo.ico');

const appDataPath = app.getPath('userData');

const cacheDir = path.join(appDataPath, 'Cache');

let APP_URL = "https://newcp.net/";
let APP_NAME = "New Club Penguin";
let APP_ICON = iconPath;

let win;
let splash;
let aboutWindow = null;

ipcMain.on('open-url', (event, url) => {
  shell.openExternal(url)
})

if (!gotTheLock) {
  app.quit();
} else {
  const createMenu = () => {
    const template = [
      {
        label: 'Menu',
          submenu: [
            { role: 'zoom',
            submenu: [
              {
                label: 'Reset',
                role: 'resetZoom',
              },
              {
                label: 'Zoom In',
                role: 'zoomIn',
              },
              { 
                label: 'Zoom Out',
                role: 'zoomOut',
              },]
            },
            { type: 'separator' },
            { 
              label: 'Quit Application',
              role: 'quit',
              accelerator: 'CmdOrCtrl+Q'
             }
          ]
      },
      { type: 'separator' },
      {
        label: 'Copyright',
        click: () => {
          if (aboutWindow && !aboutWindow.isDestroyed()) {
            if (aboutWindow.isMinimized()) aboutWindow.restore();
            aboutWindow.focus();
          } else {
            aboutWindow = new BrowserWindow({
              width: 800,
              height: 600,
              frame: false,
              autoHideMenuBar: true,
              webPreferences: {
                contextIsolation: false,
                plugins: true,
                nodeIntegration: true,
              }
            });
      
            aboutWindow.setIcon(APP_ICON);
            aboutWindow.loadFile(path.join(__dirname, "about/index.html"));
      
            aboutWindow.on('closed', () => {
              aboutWindow = null;
            });
          }
        }
      }      
    ];

    Menu.setApplicationMenu(Menu.buildFromTemplate(template));
  };

  const createWindow = () => {

    win = new BrowserWindow({
      title: APP_NAME,
      icon: iconPath,
      frame: true,
      fullscreen: true,
      autoHideMenuBar: false,
      webPreferences: {
        contextIsolation: true,
        plugins: true,
        nodeIntegration: true,
      },
    });

    win.setIcon(APP_ICON);
    
    win.webContents.on("new-window", (event, url) => {
      event.preventDefault();
      shell.openExternal(url);
    });

    win.webContents.on("context-menu", (event, params) => {
      Menu.getApplicationMenu().popup(win, params.x, params.y);
    });

    win.maximize();
    win.loadURL(APP_URL);

    win.once("page-title-updated", function (event, title) {
      event.preventDefault();
      win.title = APP_NAME;
    });

    win.webContents.on('dom-ready', () => {
      win.webContents.insertCSS(`
        /* Customize scrollbar */
        ::-webkit-scrollbar {
          width: 10px;
        }
        
        ::-webkit-scrollbar-track {
          background: radial-gradient(circle, rgba(0, 0, 125, 0.125), rgba(0, 0, 250, 0.125));
        }
        
        ::-webkit-scrollbar-thumb {
          background: radial-gradient(circle, #007bff, #0096ff);
          border-radius: 10px;
        }
        
        ::-webkit-scrollbar-thumb:hover {
          background: radial-gradient(circle, #0056b3, #0084ff);
        }        
      `);
    });
        
    win.webContents.on('did-finish-load', () => {
      splash.destroy();
    });

    win.on('closed', () => {
      if (aboutWindow && !aboutWindow.isDestroyed()) {
        aboutWindow.close();
      }
    });
  };

  const setupFlashPlugin = () => {
    let pluginName;
    let pluginType;

    switch (process.platform) {
      case "win32":
        pluginType = "win/";
        pluginName = "pepflashplayer.dll";
        break;
      case "darwin":
        pluginType = "mac/";
        pluginName = "PepperFlashPlayer.plugin";
        break;
      default:
        pluginType = "linux/";
        pluginName = "libpepflashplayer.so";
    }

    if (["freebsd", "linux", "netbsd", "openbsd"].includes(process.platform)) {
      app.commandLine.appendSwitch("no-sandbox");
    }

    app.commandLine.appendSwitch(
      "ppapi-flash-path",
      path.join(
        __dirname +
          "/plugins/" +
          pluginType +
          (process.arch == "x64" ? "x64" : "ia32"),
        pluginName
      )
    );
    app.commandLine.appendSwitch("ppapi-flash-version", "32.0.0.371");
  };

  app.setAsDefaultProtocolClient(app.name);

  app.on("second-instance", () => {
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
  });

  setupFlashPlugin();

  app.whenReady().then(() => {
    app.allowRendererProcessReuse = true;
    
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }
    
    ElectronBlocker.fromPrebuiltAdsAndTracking(fetch, {
      path:  path.join(cacheDir, 'adblock.cache'),
      read:  fs.promises.readFile,
      write: fs.promises.writeFile,
    }).then((blocker) => {
      blocker.enableBlockingInSession(session.defaultSession);
    });

    splash = new BrowserWindow({width: 650, height: 274, transparent: true, frame: false, alwaysOnTop: true});
    splash.setIcon(APP_ICON); 
    splash.loadFile(path.join(__dirname, "/splash/index.html"))
    setTimeout(function() {
      createMenu();
      createWindow();
    }, 4000);

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });
}
