import { Plus, X } from 'lucide-react';
import useTabsStore from '../store/tabsStore';

const TabBar = () => {
  const { tabs, activeTabId, setActiveTab, closeTab, createTab } = useTabsStore();

  return (
    <div className="flex items-center bg-creozen-bg pt-1 px-1 overflow-x-auto no-scrollbar select-none">
      {tabs.map((tab) => (
        <div
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={`
            group relative flex items-center min-w-[120px] max-w-[200px] h-9 px-3 mr-1 rounded-t-lg transition-all cursor-default
            ${activeTabId === tab.id 
              ? 'bg-creozen-card text-creozen-text-primary z-10 shadow-sm border-t border-x border-creozen-border' 
              : 'bg-transparent text-creozen-text-muted hover:bg-creozen-text-primary/5 hover:text-creozen-text-primary'}
          `}
        >
          {/* Favicon or Default Icon */}
          {tab.favicon ? (
             <img src={tab.favicon} alt="" className="w-4 h-4 mr-2 object-contain" />
          ) : (
             <div className="w-4 h-4 mr-2 rounded-full bg-creozen-text-muted/50 flex-shrink-0" />
          )}

          <span className="text-xs truncate flex-1 font-medium">{tab.title}</span>

          <button
            onClick={(e) => {
              e.stopPropagation();
              closeTab(tab.id);
            }}
            className={`
              ml-2 p-0.5 rounded-full hover:bg-creozen-text-primary/10 opacity-0 group-hover:opacity-100 transition-opacity
              ${activeTabId === tab.id ? 'opacity-100' : ''}
            `}
          >
            <X size={12} />
          </button>
          
          {/* Separator for inactive tabs */}
          {activeTabId !== tab.id && (
             <div className="absolute right-[-1px] top-2 bottom-2 w-[1px] bg-creozen-border" />
          )}
        </div>
      ))}

      <button
        onClick={() => createTab('https://google.com', 'New Tab')}
        className="ml-1 p-1 hover:bg-creozen-text-primary/10 rounded-md text-creozen-text-muted hover:text-creozen-text-primary transition-colors"
      >
        <Plus size={16} />
      </button>
    </div>
  );
};

export default TabBar;
