const { BrowserView } = require('electron');
const { v4: uuidv4 } = require('uuid');

class TabManager {
    constructor(mainWindow) {
        this.mainWindow = mainWindow;
        this.views = new Map(); // tabId -> BrowserView
        this.activeTabId = null;
        this.currentBounds = { x: 0, y: 0, width: 0, height: 0 };
    }

    createTab(url, title) {
        const tabId = uuidv4();
        const view = new BrowserView({
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                sandbox: true,
            },
        });

        view.webContents.loadURL(url || 'about:blank');
        this.views.set(tabId, view);

        // Setup event listeners for the view
        this.setupViewListeners(tabId, view);

        // If it's the first tab, switch to it
        if (!this.activeTabId) {
            this.switchTab(tabId);
        }

        return { tabId, url, title };
    }

    setupViewListeners(tabId, view) {
        view.webContents.on('did-finish-load', () => {
            this.mainWindow.webContents.send('tab-loading', { tabId, isLoading: false });
            this.mainWindow.webContents.send('tab-title-updated', { tabId, title: view.webContents.getTitle() });
            this.mainWindow.webContents.send('tab-url-updated', { tabId, url: view.webContents.getURL() });
        });

        view.webContents.on('did-start-loading', () => {
            this.mainWindow.webContents.send('tab-loading', { tabId, isLoading: true });
        });

        view.webContents.on('page-title-updated', (e, title) => {
            this.mainWindow.webContents.send('tab-title-updated', { tabId, title });
        });

        view.webContents.on('did-navigate', (e, url) => {
            this.mainWindow.webContents.send('tab-url-updated', { tabId, url });
        });

        view.webContents.on('did-navigate-in-page', (e, url) => {
            this.mainWindow.webContents.send('tab-url-updated', { tabId, url });
        });

        view.webContents.on('page-favicon-updated', (e, favicons) => {
            if (favicons && favicons.length > 0) {
                this.mainWindow.webContents.send('tab-favicon-updated', { tabId, favicon: favicons[0] });
            }
        });

        // Handle new window requests (e.g. target="_blank")
        view.webContents.setWindowOpenHandler(({ url }) => {
            // Option 1: Open in a new tab within the app (requires round-trip to renderer to update state, or handling here and notifying renderer)
            // For simplicity, let's notify renderer to add a tab
            this.mainWindow.webContents.send('request-new-tab', { url });
            return { action: 'deny' };
        });
    }

    closeTab(tabId) {
        const view = this.views.get(tabId);
        if (!view) return;

        if (this.activeTabId === tabId) {
            this.mainWindow.removeBrowserView(view);
            this.activeTabId = null;
        }

        // Destroy the view
        // Note: BrowserView doesn't have a destroy() method like BrowserWindow. 
        // Just releasing the reference and ensuring it's not attached is enough usually, 
        // but we can explicitly call destroy on webContents if needed.
        // view.webContents.destroy(); // Optional, use with caution if sharing sessions

        this.views.delete(tabId);
    }

    switchTab(tabId) {
        // If switching to the same tab, just ensure it's attached and resized
        if (this.activeTabId === tabId) {
            const view = this.views.get(tabId);
            if (view) {
                this.mainWindow.setBrowserView(view);
                view.setBounds(this.currentBounds);
            }
            return;
        }

        // Detach current
        if (this.activeTabId) {
            const currentView = this.views.get(this.activeTabId);
            if (currentView) {
                this.mainWindow.removeBrowserView(currentView);
            }
        }

        // Attach new
        const newView = this.views.get(tabId);
        if (newView) {
            this.activeTabId = tabId;
            this.mainWindow.setBrowserView(newView);
            newView.setBounds(this.currentBounds);
            newView.setAutoResize({ width: true, height: true });
        }
    }

    updateBounds(bounds) {
        this.currentBounds = bounds;
        if (this.activeTabId) {
            const view = this.views.get(this.activeTabId);
            if (view) {
                view.setBounds(bounds);
            }
        }
    }

    handleWindowResize() {
        // BrowserView autoResize handles most of it, but sometimes we need to enforce bounds
        // if the sidebar width is dynamic or relative. 
        // The renderer usually keeps sending 'resize-view' on ResizeObserver, so this might be redundant 
        // but good for safety.
        if (this.activeTabId) {
            const view = this.views.get(this.activeTabId);
            if (view) {
                view.setBounds(this.currentBounds);
            }
        }
    }

    async extractContent(tabId) {
        const view = this.views.get(tabId);
        if (!view) return { success: false, error: 'Tab not found' };

        try {
            const result = await view.webContents.executeJavaScript(`
                (() => {
                    // Simple readability-like extraction
                    const clone = document.cloneNode(true);
                    // Remove scripts, styles, etc.
                    const toRemove = clone.querySelectorAll('script, style, noscript, iframe, svg, header, footer, nav');
                    toRemove.forEach(el => el.remove());
                    
                    return {
                        title: document.title,
                        url: window.location.href,
                        content: document.body.innerText.substring(0, 50000), // Cap length
                        html: document.body.innerHTML.substring(0, 50000)
                    };
                })()
            `);
            return { success: true, ...result };
        } catch (error) {
            console.error('Extract Content Error:', error);
            return { success: false, error: error.message };
        }
    }

    async linkedinPost(tabId, content, visibility = 'connections') {
        const view = this.views.get(tabId);
        if (!view) return { success: false, error: 'Tab not found' };

        try {
            await view.webContents.executeJavaScript(`
                (() => {
                    // Navigate to feed if not already there
                    if (!window.location.href.includes('linkedin.com/feed')) {
                        window.location.href = 'https://www.linkedin.com/feed/';
                    }
                })()
            `);

            // Wait for navigation/load (simple delay for now, ideally wait for selector)
            await new Promise(r => setTimeout(r, 3000));

            const result = await view.webContents.executeJavaScript(`
                (async () => {
                    try {
                        // 1. Click "Start a post" button
                        const startPostBtn = document.querySelector('button.share-box-feed-entry__trigger');
                        if (startPostBtn) startPostBtn.click();
                        else return { success: false, error: 'Start Post button not found' };

                        // Wait for modal
                        await new Promise(r => setTimeout(r, 1500));

                        // 2. Insert Text
                        const editor = document.querySelector('.ql-editor');
                        if (editor) {
                            editor.innerHTML = '<p>' + content + '</p>'; // Simple HTML insertion
                            editor.dispatchEvent(new Event('input', { bubbles: true }));
                        } else {
                            return { success: false, error: 'Post editor not found' };
                        }

                        // 3. Visibility (Optional - default is usually fine or stuck to last used)
                        // Implementing visibility switching is complex due to dynamic IDs. Skipping for MVP.

                        return { success: true, message: 'Draft created. Please review and click Post.' };
                    } catch (e) {
                         return { success: false, error: e.message };
                    }
                })()
            `);
            return result;
        } catch (error) {
            console.error('LinkedIn Post Error:', error);
            return { success: false, error: error.message };
        }
    }

    async linkedinSearch(tabId, query, type = 'all') {
        const view = this.views.get(tabId);
        if (!view) return { success: false, error: 'Tab not found' };

        const searchUrl = `https://www.linkedin.com/search/results/${type}/?keywords=${encodeURIComponent(query)}`;

        try {
            view.webContents.loadURL(searchUrl);
            return { success: true, message: `Searching for "${query}" in ${type}` };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    getTab(tabId) {
        return this.views.get(tabId);
    }
}

module.exports = TabManager;
