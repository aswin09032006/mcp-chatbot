import axios from 'axios';
import { AnimatePresence, motion } from 'framer-motion';
import { Brain, Clock, Database, Search, Tag, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
const MemoryInspector = ({ isOpen, onClose, user }) => {
    const [facts, setFacts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    const fetchFacts = async () => {
        if (!user?._id) return;
        setLoading(true);
        try {
            // We'll use the existing chat API or a new endpoint to list facts
            // For now, let's assume we have an endpoint. 
            // In a real scenario, we might call the MCP's list_all_facts tool via the server.
            const response = await axios.get(`/api/memory/facts/${user._id}`);
            setFacts(response.data.facts || []);
        } catch (error) {
            console.error('Failed to fetch facts:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) fetchFacts();
    }, [isOpen]);

    const handleDelete = async (text) => {
        try {
            await axios.delete(`/api/memory/facts`, { data: { text, userId: user._id } });
            setFacts(prev => prev.filter(f => f.text !== text));
        } catch (error) {
            console.error('Failed to delete fact:', error);
        }
    };

    const filteredFacts = facts.filter(f => 
        f.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.category.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-creozen-bg/80 backdrop-blur-sm"
                    />
                    
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative w-full max-w-2xl bg-creozen-card border border-creozen-border rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-creozen-border flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-creozen-accent-blue/10 rounded-xl">
                                    <Brain className="text-creozen-accent-blue" size={24} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-creozen-text-primary">Cognitive Map</h2>
                                    <p className="text-xs text-creozen-text-muted">Extracted facts and personalized context</p>
                                </div>
                            </div>
                            <button onClick={onClose} className="p-2 hover:bg-creozen-text-primary/10 rounded-full transition-colors">
                                <X size={20} className="text-creozen-text-muted" />
                            </button>
                        </div>

                        {/* Search */}
                        <div className="px-6 py-4 bg-creozen-bg/50 border-b border-creozen-border">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-creozen-text-muted" size={16} />
                                <input
                                    type="text"
                                    placeholder="Search your memories..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-creozen-bg border border-creozen-border rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-creozen-accent-blue/50 transition-all"
                                />
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-hide">
                            {loading ? (
                                <div className="flex flex-col items-center justify-center py-20 gap-3 text-creozen-text-muted">
                                    <Database className="animate-pulse" size={32} />
                                    <span className="text-sm font-medium">Accessing long-term storage...</span>
                                </div>
                            ) : filteredFacts.length > 0 ? (
                                filteredFacts.map((fact, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.05 }}
                                        className="group bg-creozen-bg/30 border border-creozen-border hover:border-creozen-accent-blue/30 rounded-2xl p-4 transition-all"
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1 space-y-2">
                                                <p className="text-sm text-creozen-text-primary leading-relaxed">{fact.text}</p>
                                                <div className="flex items-center gap-3">
                                                    <span className="flex items-center gap-1 text-[10px] bg-creozen-accent-blue/10 text-creozen-accent-blue px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                                                        <Tag size={10} />
                                                        {fact.category}
                                                    </span>
                                                    <span className="flex items-center gap-1 text-[10px] text-creozen-text-muted">
                                                        <Clock size={10} />
                                                        {new Date(fact.timestamp).toLocaleDateString()}
                                                    </span>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => handleDelete(fact.text)}
                                                className="p-2 opacity-0 group-hover:opacity-100 text-creozen-text-muted hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </motion.div>
                                ))
                            ) : (
                                <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
                                    <div className="p-4 bg-creozen-text-primary/5 rounded-full">
                                        <Search size={32} className="text-creozen-text-muted" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-semibold text-creozen-text-primary">No memories found</h3>
                                        <p className="text-xs text-creozen-text-muted">I'll start building your cognitive map as we talk.</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-4 bg-creozen-bg/50 border-t border-creozen-border text-center">
                            <p className="text-[10px] text-creozen-text-muted uppercase tracking-widest font-bold">
                                Powered by LanceDB Vector Storage & Neural Link
                            </p>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default MemoryInspector;
