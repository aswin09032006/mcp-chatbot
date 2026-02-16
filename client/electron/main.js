const { app, BrowserWindow, ipcMain, screen } = require('electron');
const path = require('path');
const TabManager = require('./tabManager');

let mainWindow;
let tabManager;

function createWindow() {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;

    mainWindow = new BrowserWindow({
        width: width,
        height: height,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        },
        autoHideMenuBar: true, // Remove default tokenizer toolbar
    });

    const startUrl = process.env.ELECTRON_START_URL || `file://${path.join(__dirname, '../dist/index.html')}`;

    if (process.env.BROWSER === 'none') {
        mainWindow.loadURL('http://localhost:5173');
    } else {
        mainWindow.loadURL(startUrl);
    }

    // Initialize TabManager
    tabManager = new TabManager(mainWindow);

    // Open DevTools in dev mode
    if (process.env.NODE_ENV === 'development' || process.env.BROWSER === 'none') {
        mainWindow.webContents.openDevTools({ mode: 'detach' });
    }

    mainWindow.on('resize', () => {
        tabManager.handleWindowResize();
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
        tabManager = null;
    });
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// IPC Handlers
ipcMain.handle('create-tab', (event, { url, title }) => {
    return tabManager.createTab(url, title);
});

ipcMain.on('close-tab', (event, tabId) => {
    tabManager.closeTab(tabId);
});

ipcMain.on('switch-tab', (event, tabId) => {
    tabManager.switchTab(tabId);
});

ipcMain.on('resize-view', (event, bounds) => {
    tabManager.updateBounds(bounds);
});

ipcMain.on('reload-tab', (event, tabId) => {
    const view = tabManager.getTab(tabId);
    if (view) view.webContents.reload();
});

ipcMain.on('go-back', (event, tabId) => {
    const view = tabManager.getTab(tabId);
    if (view && view.webContents.canGoBack()) view.webContents.goBack();
});

ipcMain.on('go-forward', (event, tabId) => {
    const view = tabManager.getTab(tabId);
    if (view && view.webContents.canGoForward()) view.webContents.goForward();
});

ipcMain.handle('extract-content', (event, tabId) => {
    return tabManager.extractContent(tabId);
});

ipcMain.handle('linkedin-post', (event, { tabId, content, visibility }) => {
    return tabManager.linkedinPost(tabId, content, visibility);
});

ipcMain.handle('linkedin-search', (event, { tabId, query, type }) => {
    return tabManager.linkedinSearch(tabId, query, type);
});

ipcMain.on('update-url', (event, { tabId, url }) => {
    const view = tabManager.getTab(tabId);
    if (view) view.webContents.loadURL(url);
});
