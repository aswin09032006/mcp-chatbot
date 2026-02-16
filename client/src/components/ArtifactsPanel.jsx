import { Code, Eye, FileText, Layout as LayoutIcon, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import useArtifactsStore from '../store/artifactsStore';
import ArtifactPreview from './ArtifactPreview';

const ArtifactsPanel = () => {
    const { artifacts, activeArtifactId, addArtifact, setActiveArtifact, deleteArtifact, updateArtifact } = useArtifactsStore();
    const activeArtifact = artifacts.find(a => a.id === activeArtifactId);
    const [viewMode, setViewMode] = useState('code'); // 'code' or 'preview'

    const handleCreate = () => {
        addArtifact({ title: 'Untitled Snippet', content: '// Start coding...', language: 'javascript' });
        setViewMode('code');
    };

    return (
        <div className="flex h-full bg-creozen-bg text-creozen-text-primary">
            {/* Sidebar List */}
            <div className="w-64 border-r border-creozen-border flex flex-col">
                <div className="p-3 border-b border-creozen-border flex justify-between items-center">
                    <span className="font-semibold text-sm text-creozen-text-muted">Artifacts</span>
                    <button 
                        onClick={handleCreate}
                        className="p-1.5 hover:bg-creozen-text-primary/10 rounded-lg text-creozen-text-muted hover:text-creozen-text-primary transition-colors"
                    >
                        <Plus size={16} />
                    </button>
                </div>
                
                <div className="flex-1 overflow-y-auto">
                    {artifacts.map(artifact => (
                        <div 
                            key={artifact.id}
                            onClick={() => setActiveArtifact(artifact.id)}
                            className={`
                                p-3 cursor-pointer border-b border-creozen-border hover:bg-creozen-text-primary/5 transition-colors
                                ${activeArtifactId === artifact.id ? 'bg-creozen-text-primary/10 border-l-2 border-l-creozen-accent-blue' : 'border-l-2 border-l-transparent'}
                            `}
                        >
                            <div className="flex items-center gap-2 mb-1">
                                {artifact.type === 'code' ? <Code size={14} className="text-blue-500" /> : <FileText size={14} className="text-green-500" />}
                                <span className="text-sm font-medium truncate">{artifact.title}</span>
                            </div>
                            <div className="text-[10px] text-creozen-text-muted truncate">{new Date(artifact.createdAt).toLocaleDateString()}</div>
                        </div>
                    ))}
                    
                    {artifacts.length === 0 && (
                        <div className="p-4 text-center text-creozen-text-muted text-sm mt-10">
                            No artifacts yet.
                            <br />
                            Create one to get started.
                        </div>
                    )}
                </div>
            </div>

            {/* Editor / Preview Area */}
            <div className="flex-1 flex flex-col bg-creozen-bg/50">
                {activeArtifact ? (
                    <>
                        <div className="h-12 border-b border-creozen-border flex items-center px-4 justify-between bg-creozen-card/50">
                            <div className="flex items-center gap-4 flex-1">
                                <input 
                                    type="text" 
                                    value={activeArtifact.title}
                                    onChange={(e) => updateArtifact(activeArtifact.id, { title: e.target.value })}
                                    className="bg-transparent text-creozen-text-primary font-medium focus:outline-none w-1/3"
                                />
                                <div className="flex p-1 bg-creozen-bg border border-creozen-border rounded-lg">
                                    <button 
                                        onClick={() => setViewMode('code')}
                                        className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold transition-all ${viewMode === 'code' ? 'bg-creozen-accent-blue text-creozen-bg shadow-sm' : 'text-creozen-text-muted hover:text-creozen-text-primary'}`}
                                    >
                                        <Code size={14} />
                                        Code
                                    </button>
                                    <button 
                                        onClick={() => setViewMode('preview')}
                                        className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold transition-all ${viewMode === 'preview' ? 'bg-creozen-accent-blue text-creozen-bg shadow-sm' : 'text-creozen-text-muted hover:text-creozen-text-primary'}`}
                                    >
                                        <Eye size={14} />
                                        Preview
                                    </button>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <select 
                                    value={activeArtifact.language}
                                    onChange={(e) => updateArtifact(activeArtifact.id, { language: e.target.value })}
                                    className="bg-creozen-bg text-xs text-creozen-text-muted border border-creozen-border rounded px-2 py-1 focus:outline-none"
                                >
                                    <option value="javascript">JavaScript</option>
                                    <option value="python">Python</option>
                                    <option value="html">HTML</option>
                                    <option value="css">CSS</option>
                                    <option value="json">JSON</option>
                                    <option value="markdown">Markdown</option>
                                    <option value="text">Text</option>
                                </select>
                                <button 
                                    onClick={() => deleteArtifact(activeArtifact.id)}
                                    className="p-1.5 text-creozen-text-muted hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                        
                        <div className="flex-1 relative overflow-hidden">
                            {viewMode === 'code' ? (
                                <textarea 
                                    value={activeArtifact.content}
                                    onChange={(e) => updateArtifact(activeArtifact.id, { content: e.target.value })}
                                    className="absolute inset-0 w-full h-full bg-transparent text-creozen-text-primary p-4 font-mono text-sm resize-none focus:outline-none"
                                    spellCheck="false"
                                />
                            ) : (
                                <div className="absolute inset-0 p-4 pb-12">
                                    <ArtifactPreview artifact={activeArtifact} />
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-creozen-text-muted gap-4">
                        <div className="p-4 bg-creozen-text-primary/5 rounded-full">
                            <LayoutIcon size={48} className="opacity-20" />
                        </div>
                        <div className="text-center">
                            <h3 className="font-semibold text-creozen-text-primary">Interactive Workspace</h3>
                            <p className="text-sm">Select an artifact to begin designing</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ArtifactsPanel;
