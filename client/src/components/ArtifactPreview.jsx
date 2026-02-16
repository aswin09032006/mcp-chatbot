import { useMemo } from 'react';

const ArtifactPreview = ({ artifact }) => {
    const { content, language } = artifact;

    const srcDoc = useMemo(() => {
        if (language === 'html' || language === 'javascript' || language === 'css') {
            // For simple web artifacts, we bundle them into a single HTML structure
            return `
                <!DOCTYPE html>
                <html>
                    <head>
                        <style>
                            body { 
                                margin: 0; 
                                padding: 20px; 
                                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                                color: #d1d5db;
                                background: #0f172a;
                            }
                            ${language === 'css' ? content : ''}
                        </style>
                    </head>
                    <body>
                        ${language === 'html' ? content : ''}
                        ${language === 'javascript' ? `<script>${content}<\/script>` : ''}
                    </body>
                </html>
            `;
        }
        
        // Default fall-back for other languages (just show as text or placeholder)
        return `
            <div style="padding: 40px; text-align: center; color: #64748b; font-family: sans-serif;">
                <h3 style="margin-bottom: 10px;">Preview not supported for ${language} yet</h3>
                <p style="font-size: 0.9em;">Switch to 'Code' view to see the implementation details.</p>
            </div>
        `;
    }, [content, language]);

    return (
        <div className="w-full h-full bg-creozen-bg rounded-xl overflow-hidden shadow-inner border border-creozen-border">
            <iframe
                title="Artifact Preview"
                srcDoc={srcDoc}
                sandbox="allow-scripts allow-modals"
                className="w-full h-full border-none"
            />
        </div>
    );
};

export default ArtifactPreview;
