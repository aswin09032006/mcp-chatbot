import { create } from 'zustand';

const useTabsStore = create((set, get) => ({
    tabs: [],
    activeTabId: null,

    // Actions called by UI components
    createTab: async (url, title) => {
        if (window.api) {
            const { tabId } = await window.api.createTab(url, title);
            set((state) => ({
                tabs: [...state.tabs, { id: tabId, url, title: title || 'New Tab', isLoading: true, favicon: '' }],
                activeTabId: tabId,
            }));
        } else {
            console.error('Electron API not available');
        }
    },

    closeTab: (tabId) => {
        if (window.api) {
            window.api.closeTab(tabId);
            set((state) => {
                const newTabs = state.tabs.filter((t) => t.id !== tabId);
                let newActiveId = state.activeTabId;

                if (state.activeTabId === tabId) {
                    // Find adjacent tab to activate
                    const index = state.tabs.findIndex(t => t.id === tabId);
                    if (newTabs.length > 0) {
                        newActiveId = newTabs[Math.max(0, index - 1)].id;
                        window.api.switchTab(newActiveId);
                    } else {
                        newActiveId = null;
                    }
                }

                return { tabs: newTabs, activeTabId: newActiveId };
            });
        }
    },

    setActiveTab: (tabId) => {
        if (window.api) {
            window.api.switchTab(tabId);
            set({ activeTabId: tabId });
        }
    },

    updateTab: (tabId, updates) => {
        set((state) => ({
            tabs: state.tabs.map((t) => (t.id === tabId ? { ...t, ...updates } : t)),
        }));
    },

    reloadTab: (tabId) => {
        if (window.api) window.api.reloadTab(tabId);
    },

    goBack: (tabId) => {
        if (window.api) window.api.goBack(tabId);
    },

    goForward: (tabId) => {
        if (window.api) window.api.goForward(tabId);
    },

    updateUrl: (tabId, url) => {
        if (window.api) window.api.updateUrl(tabId, url);
    }
}));

// Initialize listeners outside the store or in a useEffect
// We'll export a hook or a setup function to call in the main component
export const setupTabListeners = () => {
    if (!window.api) return;

    window.api.onTabTitleUpdated(({ tabId, title }) => {
        useTabsStore.getState().updateTab(tabId, { title });
    });

    window.api.onTabUrlUpdated(({ tabId, url }) => {
        useTabsStore.getState().updateTab(tabId, { url });
    });

    window.api.onTabLoading(({ tabId, isLoading }) => {
        useTabsStore.getState().updateTab(tabId, { isLoading });
    });

    window.api.onTabFaviconUpdated(({ tabId, favicon }) => {
        useTabsStore.getState().updateTab(tabId, { favicon });
    });
};

export default useTabsStore;
