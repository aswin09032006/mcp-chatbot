import { ExternalLink, X } from "lucide-react";

const SideWorkspace = ({ url, onClose }) => {
  return (
    <div className="w-[50%] h-full flex flex-col bg-creozen-bg border-l border-creozen-border shadow-2xl relative z-40 transition-all duration-300">
      {/* Header */}
      <div className="h-14 flex items-center justify-between px-4 border-b border-creozen-border bg-creozen-card">
        <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-creozen-accent-blue/10 flex items-center justify-center text-creozen-accent-blue">
                <img 
                    src={url.includes('spreadsheets') 
                        ? 'https://upload.wikimedia.org/wikipedia/commons/3/30/Google_Sheets_logo_%282014-2020%29.svg' 
                        : 'https://upload.wikimedia.org/wikipedia/commons/0/01/Google_Docs_logo_%282014-2020%29.svg'} 
                    alt="Logo" 
                    className="w-5 h-5"
                />
            </div>
            <span className="font-semibold text-creozen-text-primary text-sm">Workspace</span>
        </div>
        
        <div className="flex items-center gap-1">
            <a 
                href={url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-2 text-creozen-text-muted hover:text-creozen-text-primary hover:bg-creozen-text-primary/10 rounded-lg transition-colors"
                title="Open in new tab"
            >
                <ExternalLink size={18} />
            </a>
            <button 
                onClick={onClose}
                className="p-2 text-creozen-text-muted hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                title="Close workspace"
            >
                <X size={18} />
            </button>
        </div>
      </div>

      {/* Iframe content */}
      <div className="flex-1 bg-creozen-bg relative">
        <iframe 
            src={url.includes('?') ? `${url}&rm=minimal` : `${url}?rm=minimal`} 
            className="w-full h-full border-none" 
            title="Google Workspace"
            allow="clipboard-write"
        />
      </div>
    </div>
  );
};

export default SideWorkspace;
