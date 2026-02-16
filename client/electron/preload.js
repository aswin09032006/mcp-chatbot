const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    createTab: (url, title) => ipcRenderer.invoke('create-tab', { url, title }),
    closeTab: (tabId) => ipcRenderer.send('close-tab', tabId),
    switchTab: (tabId) => ipcRenderer.send('switch-tab', tabId),
    resizeView: (bounds) => ipcRenderer.send('resize-view', bounds),
    reloadTab: (tabId) => ipcRenderer.send('reload-tab', tabId),
    goBack: (tabId) => ipcRenderer.send('go-back', tabId),
    goForward: (tabId) => ipcRenderer.send('go-forward', tabId),
    updateUrl: (tabId, url) => ipcRenderer.send('update-url', { tabId, url }),
    extractContent: (tabId) => ipcRenderer.invoke('extract-content', tabId),
    linkedinPost: (tabId, content, visibility) => ipcRenderer.invoke('linkedin-post', { tabId, content, visibility }),
    linkedinSearch: (tabId, query, type) => ipcRenderer.invoke('linkedin-search', { tabId, query, type }),

    // Listeners
    onTabTitleUpdated: (callback) => ipcRenderer.on('tab-title-updated', (event, data) => callback(data)),
    onTabUrlUpdated: (callback) => ipcRenderer.on('tab-url-updated', (event, data) => callback(data)),
    onTabLoading: (callback) => ipcRenderer.on('tab-loading', (event, data) => callback(data)),
    onTabFaviconUpdated: (callback) => ipcRenderer.on('tab-favicon-updated', (event, data) => callback(data)),

    // Cleanup
    removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel)
});
