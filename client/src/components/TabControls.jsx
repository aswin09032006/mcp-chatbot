import { ArrowLeft, ArrowRight, RotateCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import useTabsStore from '../store/tabsStore';

const TabControls = () => {
  const { activeTabId, tabs, goBack, goForward, reloadTab, updateUrl } = useTabsStore();
  const activeTab = tabs.find((t) => t.id === activeTabId);
  const [inputValue, setInputValue] = useState('');

  // Sync input with active tab URL, but only when tab changes or finishes loading
  useEffect(() => {
    if (activeTab?.url) {
      setInputValue(activeTab.url);
    }
  }, [activeTabId, activeTab?.url]);

  if (!activeTab) return null;

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
        let url = inputValue.trim();
        if (!url) return;

        // Simple check to see if it's a URL or search query
        const isUrl = url.includes('.') && !url.includes(' ');
        
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            if (isUrl) {
                url = 'https://' + url;
            } else {
                url = `https://www.google.com/search?q=${encodeURIComponent(url)}`;
            }
        }
        
        // Optimistic update
        setInputValue(url);
        updateUrl(activeTabId, url);
    }
  };

  return (
    <div className="flex items-center gap-2 p-2 bg-creozen-card border-b border-creozen-border">
      <button 
        onClick={() => goBack(activeTabId)}
        className="p-1 hover:bg-creozen-text-primary/10 rounded-md text-creozen-text-muted hover:text-creozen-text-primary transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
        title="Back"
      >
        <ArrowLeft size={16} />
      </button>
      <button 
        onClick={() => goForward(activeTabId)}
        className="p-1 hover:bg-creozen-text-primary/10 rounded-md text-creozen-text-muted hover:text-creozen-text-primary transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
        title="Forward"
      >
        <ArrowRight size={16} />
      </button>
      <button 
        onClick={() => reloadTab(activeTabId)}
        className="p-1 hover:bg-creozen-text-primary/10 rounded-md text-creozen-text-muted hover:text-creozen-text-primary transition-colors"
        title="Reload"
      >
        <RotateCw size={16} className={activeTab.isLoading ? 'animate-spin' : ''} />
      </button>
      
      <div className="flex-1 relative">
        <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full bg-creozen-bg text-creozen-text-primary text-sm px-3 py-1.5 rounded-full border border-creozen-border focus:border-creozen-accent-blue focus:outline-none transition-colors"
            placeholder="Search or enter website name"
        />
        {activeTab.isLoading && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 border-2 border-creozen-text-muted border-t-transparent rounded-full animate-spin" />
        )}
      </div>
    </div>
  );
};

export default TabControls;
