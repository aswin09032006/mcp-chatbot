import { Code, Globe } from 'lucide-react';
import { useEffect, useRef } from 'react';
import useNeuralLinkStore from '../store/neuralLinkStore';
import useTabsStore, { setupTabListeners } from '../store/tabsStore';
import ArtifactsPanel from './ArtifactsPanel';
import TabBar from './TabBar';
import TabControls from './TabControls';

const WorkspaceTabs = () => {
    const containerRef = useRef(null);
    const { activeTabId } = useTabsStore();
    const { workspaceView, setWorkspaceView } = useNeuralLinkStore();

    useEffect(() => {
        setupTabListeners();
        
        let resizeTimeout;
        const observer = new ResizeObserver((entries) => {
            if (!containerRef.current) return;
            
            // Use requestAnimationFrame to sync with browser paint cycle
            cancelAnimationFrame(resizeTimeout);
            resizeTimeout = requestAnimationFrame(() => {
                // If we are not in browser mode, hide the view
                if (workspaceView !== 'browser') {
                    if (window.api) {
                        window.api.resizeView({ x: 0, y: 0, width: 0, height: 0 });
                    }
                    return;
                }

                for (let entry of entries) {
                    const { x, y, width, height } = entry.target.getBoundingClientRect();
                    // Basic validation to prevent setting 0 size when it shouldn't be
                    if (width === 0 || height === 0) continue; 

                    const bounds = {
                        x: Math.round(x),
                        y: Math.round(y),
                        width: Math.round(width),
                        height: Math.round(height)
                    };
                    
                    if (window.api) {
                        window.api.resizeView(bounds);
                    }
                }
            });
        });

        if (containerRef.current) {
            observer.observe(containerRef.current);
        }

        return () => {
            observer.disconnect();
            clearTimeout(resizeTimeout);
        };
    }, [workspaceView]); // Re-run when view changes

    // Update bounds when active tab changes or view changes
    useEffect(() => {
        // Immediate update for tab switching or view toggling
        if (workspaceView !== 'browser') {
            if (window.api) window.api.resizeView({ x: 0, y: 0, width: 0, height: 0 });
            return;
        }

        if (containerRef.current && window.api) {
            const { x, y, width, height } = containerRef.current.getBoundingClientRect();
            if (width > 0 && height > 0) {
                 window.api.resizeView({
                        x: Math.round(x),
                        y: Math.round(y),
                        width: Math.round(width),
                        height: Math.round(height)
                 });
            }
        }
    }, [activeTabId, workspaceView]);

    return (
        <div className="flex flex-col h-full bg-creozen-bg border-l border-creozen-border">
            {/* View Switcher */}
            <div className="flex items-center px-2 pt-2 bg-creozen-bg border-b border-creozen-border">
                <button
                    onClick={() => setWorkspaceView('browser')}
                    className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                        workspaceView === 'browser' 
                        ? 'bg-creozen-card text-creozen-text-primary border-t border-x border-creozen-border' 
                        : 'text-creozen-text-muted hover:text-creozen-text-primary hover:bg-creozen-card/50'
                    }`}
                >
                    <Globe size={14} />
                    Browser
                </button>
                <button
                    onClick={() => setWorkspaceView('artifacts')}
                    className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                        workspaceView === 'artifacts'
                        ? 'bg-creozen-card text-creozen-text-primary border-t border-x border-creozen-border' 
                        : 'text-creozen-text-muted hover:text-creozen-text-primary hover:bg-creozen-card/50'
                    }`}
                >
                    <Code size={14} />
                    Artifacts
                </button>
            </div>

            <div className="flex-1 flex flex-col overflow-hidden relative">
                {workspaceView === 'browser' ? (
                    <>
                        <TabBar />
                        <TabControls />
                        <div 
                            ref={containerRef} 
                            className="flex-1 w-full relative bg-creozen-card"
                        >
                            {!activeTabId && (
                                <div className="absolute inset-0 flex items-center justify-center text-creozen-text-muted">
                                    Open a new tab to browse
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <ArtifactsPanel />
                )}
            </div>
        </div>
    );
};

export default WorkspaceTabs;
