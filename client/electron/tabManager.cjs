const { BrowserView } = require('electron');
const crypto = require('crypto');
const { extractContent } = require('./contentExtractor.cjs');
const path = require('path');
const fs = require('fs');

class TabManager {
    constructor(mainWindow) {
        this.mainWindow = mainWindow;
        this.views = new Map(); // tabId -> BrowserView
        this.activeTabId = null;
        this.currentBounds = { x: 0, y: 0, width: 0, height: 0 };
    }

    createTab(url, title) {
        const tabId = crypto.randomUUID();
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
        // Enable DevTools shortcuts for tabs
        view.webContents.on('before-input-event', (event, input) => {
            if (input.key === 'F12' || (input.control && input.shift && input.key.toLowerCase() === 'i')) {
                view.webContents.toggleDevTools();
                event.preventDefault();
            }
        });

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

    getTab(tabId) {
        return this.views.get(tabId);
    }

    async getTabContent(tabId) {
        const view = this.views.get(tabId);
        if (!view) throw new Error('Tab not found');

        try {
            // Use Readability for clean content extraction
            const extracted = await extractContent(view.webContents);

            return {
                tabId,
                url: extracted.url,
                title: extracted.title,
                content: extracted.content,
                excerpt: extracted.excerpt,
                byline: extracted.byline,
                siteName: extracted.siteName,
                publishedTime: extracted.publishedTime,
                headings: extracted.headings,
                success: extracted.success
            };
        } catch (error) {
            console.error('Content extraction failed, using fallback:', error);

            // Fallback to simple text extraction
            const content = await view.webContents.executeJavaScript(`
                document.body.innerText
            `);

            return {
                tabId,
                url: view.webContents.getURL(),
                title: view.webContents.getTitle(),
                content: content.substring(0, 10000),
                success: false,
                error: error.message
            };
        }
    }

    searchWeb(query) {
        const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
        return this.createTab(searchUrl, `Search: ${query}`);
    }

    async clickWebElement(tabId, selector) {
        const view = this.views.get(tabId);
        if (!view) throw new Error('Tab not found');

        try {
            const result = await view.webContents.executeJavaScript(`
                (() => {
                    const element = document.querySelector('${selector.replace(/'/g, "\\'")}');
                    if (!element) {
                        return { success: false, error: 'Element not found' };
                    }
                    
                    element.click();
                    
                    return {
                        success: true,
                        selector: '${selector.replace(/'/g, "\\'")}',
                        tagName: element.tagName,
                        text: element.innerText || element.textContent || ''
                    };
                })()
            `);

            return result;
        } catch (error) {
            console.error('Click element failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async typeWebInput(tabId, selector, text) {
        const view = this.views.get(tabId);
        if (!view) throw new Error('Tab not found');

        try {
            const result = await view.webContents.executeJavaScript(`
                (() => {
                    const element = document.querySelector('${selector.replace(/'/g, "\\'")}');
                    if (!element) {
                        return { success: false, error: 'Element not found' };
                    }
                    
                    // Check if it's an input element
                    if (!['INPUT', 'TEXTAREA'].includes(element.tagName)) {
                        return { success: false, error: 'Element is not an input or textarea' };
                    }
                    
                    element.value = '${text.replace(/'/g, "\\'")}';
                    element.dispatchEvent(new Event('input', { bubbles: true }));
                    element.dispatchEvent(new Event('change', { bubbles: true }));
                    
                    return {
                        success: true,
                        selector: '${selector.replace(/'/g, "\\'")}',
                        value: element.value
                    };
                })()
            `);

            return result;
        } catch (error) {
            console.error('Type input failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async scrollTab(tabId, direction) {
        const view = this.views.get(tabId);
        if (!view) throw new Error('Tab not found');
        const scrollAmount = direction === 'down' ? 500 : -500;
        return await view.webContents.executeJavaScript(`
            window.scrollBy({ top: ${scrollAmount}, behavior: 'smooth' });
            ({ success: true, scroll: window.scrollY })
        `);
    }

    async getPageStructure(tabId) {
        const view = this.views.get(tabId);
        if (!view) throw new Error('Tab not found');
        return await view.webContents.executeJavaScript(`
            (() => {
                const interactives = Array.from(document.querySelectorAll('a, button, input, select, textarea, [role="button"]'))
                    .map(el => ({
                        tag: el.tagName,
                        text: el.innerText || el.placeholder || el.value || '',
                        id: el.id,
                        class: el.className,
                        selector: el.id ? '#' + el.id : (el.className ? '.' + el.className.split(' ').join('.') : el.tagName.toLowerCase()),
                        type: el.type || el.getAttribute('role') || 'generic'
                    }))
                     .filter(item => item.text.trim().length > 0 || item.id || item.class)
                    .slice(0, 50); // Limit to top 50 elements for context window
                return { 
                    title: document.title, 
                    url: window.location.href, 
                    interactives 
                };
            })()
        `);
    }

    async captureScreenshot(tabId) {
        const view = this.views.get(tabId);
        if (!view) throw new Error('Tab not found');

        try {
            // Capture the page as an image
            const image = await view.webContents.capturePage();

            // Create screenshots directory if it doesn't exist
            const { app } = require('electron');
            const screenshotsDir = path.join(app.getPath('userData'), 'screenshots');
            if (!fs.existsSync(screenshotsDir)) {
                fs.mkdirSync(screenshotsDir, { recursive: true });
            }

            // Generate filename with timestamp
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `screenshot-${timestamp}.png`;
            const filepath = path.join(screenshotsDir, filename);

            // Save to file
            fs.writeFileSync(filepath, image.toPNG());

            // Also return as base64 data URL for immediate display
            const base64 = image.toPNG().toString('base64');
            const dataUrl = `data:image/png;base64,${base64}`;

            return {
                success: true,
                filepath: filepath,
                filename: filename,
                dataUrl: dataUrl,
                url: view.webContents.getURL(),
                title: view.webContents.getTitle()
            };
        } catch (error) {
            console.error('Screenshot capture failed:', error);
            throw new Error(`Failed to capture screenshot: ${error.message}`);
        }
    }

    async highlightText(tabId, text) {
        const view = this.views.get(tabId);
        if (!view) throw new Error('Tab not found');

        try {
            const result = await view.webContents.executeJavaScript(`
                (() => {
                    const searchText = "${text.replace(/"/g, '\\"')}";
                    
                    // Remove previous highlights
                    document.querySelectorAll('.ai-highlight').forEach(el => {
                        const parent = el.parentNode;
                        parent.replaceChild(document.createTextNode(el.textContent), el);
                        parent.normalize();
                    });

                    // Find and highlight all occurrences
                    const walker = document.createTreeWalker(
                        document.body,
                        NodeFilter.SHOW_TEXT,
                        null,
                        false
                    );

                    const nodesToHighlight = [];
                    let node;
                    while (node = walker.nextNode()) {
                        const text = node.textContent;
                        const lowerText = text.toLowerCase();
                        const lowerSearch = searchText.toLowerCase();
                        
                        if (lowerText.includes(lowerSearch)) {
                            nodesToHighlight.push(node);
                        }
                    }

                    let highlightCount = 0;
                    nodesToHighlight.forEach(node => {
                        const text = node.textContent;
                        const lowerText = text.toLowerCase();
                        const lowerSearch = searchText.toLowerCase();
                        const index = lowerText.indexOf(lowerSearch);
                        
                        if (index !== -1) {
                            const before = text.substring(0, index);
                            const match = text.substring(index, index + searchText.length);
                            const after = text.substring(index + searchText.length);

                            const span = document.createElement('span');
                            span.className = 'ai-highlight';
                            span.style.backgroundColor = '#ffeb3b';
                            span.style.padding = '2px 4px';
                            span.style.borderRadius = '3px';
                            span.style.fontWeight = 'bold';
                            span.textContent = match;

                            const fragment = document.createDocumentFragment();
                            if (before) fragment.appendChild(document.createTextNode(before));
                            fragment.appendChild(span);
                            if (after) fragment.appendChild(document.createTextNode(after));

                            node.parentNode.replaceChild(fragment, node);
                            highlightCount++;
                        }
                    });

                    // Scroll to first highlight
                    if (highlightCount > 0) {
                        const firstHighlight = document.querySelector('.ai-highlight');
                        if (firstHighlight) {
                            firstHighlight.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }
                    }

                    return { count: highlightCount, searchText };
                })()
            `);

            return {
                success: true,
                count: result.count,
                text: text,
                message: result.count > 0
                    ? `Highlighted ${result.count} occurrence(s) of "${text}"`
                    : `No occurrences of "${text}" found`
            };
        } catch (error) {
            console.error('Text highlighting failed:', error);
            return {
                success: false,
                error: error.message,
                message: `Failed to highlight text: ${error.message}`
            };
        }
    }
}

module.exports = TabManager;
