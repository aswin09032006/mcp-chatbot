const { app, BrowserWindow, ipcMain, screen } = require('electron');
const path = require('path');
const TabManager = require('./tabManager.cjs');

let mainWindow;
let tabManager;

function createWindow() {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;

    mainWindow = new BrowserWindow({
        width: width,
        height: height,
        webPreferences: {
            preload: path.join(__dirname, 'preload.cjs'),
            contextIsolation: true,
            nodeIntegration: false,
        },
    });

    // Permanently remove the menu
    mainWindow.setMenu(null);

    const isDev = !app.isPackaged || process.env.ELECTRON_START_URL;
    const startUrl = process.env.ELECTRON_START_URL || `file://${path.join(__dirname, '../dist/index.html')}`;

    mainWindow.loadURL(startUrl);

    // Initialize TabManager
    tabManager = new TabManager(mainWindow);

    // Open DevTools in dev mode
    if (process.env.NODE_ENV === 'development' || process.env.BROWSER === 'none') {
        mainWindow.webContents.openDevTools({ mode: 'detach' });
    }

    mainWindow.on('resize', () => {
        tabManager.handleWindowResize();
    });

    // Enable DevTools shortcuts
    mainWindow.webContents.on('before-input-event', (event, input) => {
        if (input.key === 'F12' || (input.control && input.shift && input.key.toLowerCase() === 'i')) {
            mainWindow.webContents.toggleDevTools();
            event.preventDefault();
        }
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

ipcMain.handle('switch-tab', (e, { tabId }) => {
    tabManager.switchTab(tabId);
});

ipcMain.handle('read-tab-content', async (e, { tabId }) => {
    return await tabManager.getTabContent(tabId);
});

ipcMain.handle('click-element', async (e, { tabId, selector }) => {
    return await tabManager.clickElement(tabId, selector);
});

ipcMain.handle('type-in-element', async (e, { tabId, selector, text }) => {
    return await tabManager.typeInElement(tabId, selector, text);
});

ipcMain.handle('scroll-tab', async (e, { tabId, direction }) => {
    return await tabManager.scrollTab(tabId, direction);
});

ipcMain.handle('get-page-structure', async (e, { tabId }) => {
    return await tabManager.getPageStructure(tabId);
});

ipcMain.handle('search-web', (e, { query }) => {
    return tabManager.searchWeb(query);
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

ipcMain.handle('update-url', (event, { tabId, url }) => {
    const view = tabManager.getTab(tabId);
    if (view) view.webContents.loadURL(url);
});

// New browser feature handlers
ipcMain.handle('extract-content', async (e, { tabId }) => {
    return await tabManager.getTabContent(tabId);
});

ipcMain.handle('capture-screenshot', async (e, { tabId }) => {
    return await tabManager.captureScreenshot(tabId);
});

ipcMain.handle('highlight-text', async (e, { tabId, text }) => {
    return await tabManager.highlightText(tabId, text);
});

ipcMain.handle('click-web-element', async (e, { tabId, selector }) => {
    return await tabManager.clickWebElement(tabId, selector);
});

ipcMain.handle('type-web-input', async (e, { tabId, selector, text }) => {
    return await tabManager.typeWebInput(tabId, selector, text);
});

ipcMain.handle('scroll-web-page', async (e, { tabId, direction }) => {
    return await tabManager.scrollTab(tabId, direction);
});

ipcMain.on('open-devtools', (event) => {
    if (mainWindow) {
        mainWindow.webContents.openDevTools({ mode: 'detach' });
    }
});
