const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    createTab: (url, title) => ipcRenderer.invoke('create-tab', { url, title }),
    closeTab: (tabId) => ipcRenderer.send('close-tab', tabId),
    switchTab: (tabId) => ipcRenderer.invoke('switch-tab', { tabId }),
    readTabContent: (tabId) => ipcRenderer.invoke('read-tab-content', { tabId }),
    clickElement: (tabId, selector) => ipcRenderer.invoke('click-element', { tabId, selector }),
    typeInElement: (tabId, selector, text) => ipcRenderer.invoke('type-in-element', { tabId, selector, text }),
    scrollTab: (tabId, direction) => ipcRenderer.invoke('scroll-tab', { tabId, direction }),
    getPageStructure: (tabId) => ipcRenderer.invoke('get-page-structure', { tabId }),
    searchWeb: (query) => ipcRenderer.invoke('search-web', { query }),
    resizeView: (bounds) => ipcRenderer.send('resize-view', bounds),
    reloadTab: (tabId) => ipcRenderer.send('reload-tab', tabId),
    goBack: (tabId) => ipcRenderer.send('go-back', tabId),
    goForward: (tabId) => ipcRenderer.send('go-forward', tabId),
    updateUrl: (tabId, url) => ipcRenderer.send('update-url', { tabId, url }),

    // New browser features
    extractContent: (tabId) => ipcRenderer.invoke('extract-content', { tabId }),
    captureScreenshot: (tabId) => ipcRenderer.invoke('capture-screenshot', { tabId }),
    highlightText: (tabId, text) => ipcRenderer.invoke('highlight-text', { tabId, text }),
    openDevTools: () => ipcRenderer.send('open-devtools'),

    // Interactive browser tools (Phase 5)
    clickWebElement: (tabId, selector) => ipcRenderer.invoke('click-web-element', { tabId, selector }),
    typeWebInput: (tabId, selector, text) => ipcRenderer.invoke('type-web-input', { tabId, selector, text }),
    scrollWebPage: (tabId, direction) => ipcRenderer.invoke('scroll-web-page', { tabId, direction }),
    getPageStructure: (tabId) => ipcRenderer.invoke('get-page-structure', { tabId }),

    // Event listeners
    onTabTitleUpdated: (callback) => ipcRenderer.on('tab-title-updated', (event, data) => callback(data)),
    onTabUrlUpdated: (callback) => ipcRenderer.on('tab-url-updated', (event, data) => callback(data)),
    onTabLoading: (callback) => ipcRenderer.on('tab-loading', (event, data) => callback(data)),
    onTabFaviconUpdated: (callback) => ipcRenderer.on('tab-favicon-updated', (event, data) => callback(data)),

    // Cleanup
    removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel)
});
