import { ExternalLink } from 'lucide-react';
import { useState } from 'react';

/**
 * Citation Badge Component - Perplexity-style numbered citation
 * Displays a small numbered badge that opens the source URL when clicked
 */
const CitationBadge = ({ number, url, title, siteName, onClick }) => {
    const [isHovered, setIsHovered] = useState(false);

    const handleClick = (e) => {
        e.preventDefault();
        if (onClick) {
            onClick(url, title);
        }
    };

    return (
        <span className="inline-block relative">
            <a
                href={url}
                onClick={handleClick}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                className="inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold rounded-full bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 hover:text-blue-300 transition-all duration-200 cursor-pointer border border-blue-500/30 hover:border-blue-400/50 mx-0.5"
                title={title || url}
            >
                {number}
            </a>
            
            {/* Hover tooltip */}
            {isHovered && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 pointer-events-none">
                    <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-xl px-3 py-2 max-w-xs">
                        <div className="flex items-start gap-2">
                            <ExternalLink size={12} className="text-blue-400 mt-0.5 flex-shrink-0" />
                            <div className="min-w-0">
                                {title && (
                                    <div className="text-xs font-semibold text-white truncate mb-0.5">
                                        {title}
                                    </div>
                                )}
                                <div className="text-[10px] text-gray-400 truncate">
                                    {siteName || new URL(url).hostname.replace('www.', '')}
                                </div>
                            </div>
                        </div>
                    </div>
                    {/* Arrow */}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
                        <div className="w-2 h-2 bg-gray-900 border-r border-b border-gray-700 transform rotate-45"></div>
                    </div>
                </div>
            )}
        </span>
    );
};

export default CitationBadge;
