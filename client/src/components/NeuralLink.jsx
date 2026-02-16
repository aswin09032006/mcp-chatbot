import { AnimatePresence, motion } from 'framer-motion';
import { Brain, Database, Globe, Server } from 'lucide-react';
import useNeuralLinkStore from '../store/neuralLinkStore';

const NODE_POSITIONS_DEFAULT = {
  brain: { x: 50, y: 50 },
  google: { x: 15, y: 50 }, 
  browser: { x: 85, y: 50 },
  echo: { x: 50, y: 15 },
};

const NODE_POSITIONS_LINEAR = {
  brain: { x: 50, y: 50 },
  google: { x: 20, y: 50 },
  browser: { x: 80, y: 50 },
  echo: { x: 50, y: 20 }, // Still slightly offset or maybe inline? Let's keep it inline-ish or ignored.
                             // Actually better: Google - Echo - Brain - Browser?
                             // Let's go: Google(15) - Brain(50) - Browser(85). Echo can be hidden or tiny above.
                             // Let's Keep Echo at {x:50, y:20} which is "above" brain in the narrow strip.
};

const NodeIcon = ({ id, className }) => {
    if (id === 'brain') return <Brain className={className} />;
    if (id === 'google') return <Database className={className} />; // Represents Google data
    if (id === 'browser') return <Globe className={className} />;
    return <Server className={className} />;
};

const NeuralLink = ({ className = "", variant = "default" }) => {
  const { nodes, signals, logs } = useNeuralLinkStore();
  
  const POSITIONS = variant === 'linear' ? NODE_POSITIONS_LINEAR : NODE_POSITIONS_DEFAULT;

  return (
    <div className={`relative pointer-events-none z-50 font-mono text-[10px] ${className} ${variant === 'default' ? 'w-32 h-14' : 'w-full h-full'}`}>
        {/* Container for the Holographic effect */}
        <div className={`relative w-full h-full bg-black/80 backdrop-blur-md border border-cyan-500/30 shadow-[0_0_30px_rgba(6,182,212,0.15)] overflow-hidden ${variant === 'linear' ? 'rounded-lg' : 'rounded-full'}`}>
            
            {/* Grid Background */}
            <div className="absolute inset-0 opacity-10" 
                 style={{ backgroundImage: 'radial-gradient(circle, #06b6d4 1px, transparent 1px)', backgroundSize: '10px 10px' }} 
            />

            {/* Connecting Lines */}
            <svg className="absolute inset-0 w-full h-full opacity-30">
                {Object.entries(POSITIONS).map(([id, pos]) => 
                    id !== 'brain' && (
                        <line 
                            key={id}
                            x1={`${POSITIONS.brain.x}%`} 
                            y1={`${POSITIONS.brain.y}%`}
                            x2={`${pos.x}%`} 
                            y2={`${pos.y}%`}
                            stroke="#06b6d4" 
                            strokeWidth="1"
                        />
                    )
                )}
            </svg>

            {/* Signals (Data Packets) */}
            <AnimatePresence>
                {signals.map(signal => {
                    const start = POSITIONS[signal.from];
                    const end = POSITIONS[signal.to];
                    if (!start || !end) return null;

                    return (
                        <motion.div
                            key={signal.id}
                            initial={{ left: `${start.x}%`, top: `${start.y}%`, opacity: 0, scale: 0 }}
                            animate={{ left: `${end.x}%`, top: `${end.y}%`, opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0 }}
                            transition={{ duration: 1, ease: "easeInOut" }}
                            className="absolute w-1.5 h-1.5 bg-white rounded-full shadow-[0_0_10px_white]"
                            style={{ transform: 'translate(-50%, -50%)' }}
                        />
                    );
                })}
            </AnimatePresence>

            {/* Nodes */}
            {nodes.map(node => {
                const pos = POSITIONS[node.id];
                if (!pos) return null;

                const isActive = node.status === 'active';

                return (
                    <motion.div
                        key={node.id}
                        animate={{ 
                            scale: isActive ? 1.1 : 1,
                            boxShadow: isActive ? '0 0 15px #06b6d4' : '0 0 0px transparent'
                        }}
                        className={`absolute flex items-center justify-center w-6 h-6 rounded-full border border-cyan-500/50 bg-black/50 transition-colors duration-300
                            ${isActive ? 'bg-cyan-500/20 border-cyan-400' : 'text-cyan-700'}
                        `}
                        style={{ left: `${pos.x}%`, top: `${pos.y}%`, transform: 'translate(-50%, -50%)' }}
                    >
                        <NodeIcon id={node.id} className={`w-3 h-3 ${isActive ? 'text-white' : 'text-cyan-700'}`} />
                        
                        {/* Label tooltip - Hidden in linear mode to save space, or very small */}
                        {variant !== 'linear' && (
                            <div className="absolute top-full mt-1 text-center whitespace-nowrap text-cyan-500/70 text-[8px] tracking-widest uppercase">
                                {node.label}
                            </div>
                        )}
                    </motion.div>
                );
            })}

            {/* Logs Overlay - Hidden in linear mode */}
            {variant !== 'linear' && (
                <div className="absolute bottom-6 left-0 right-0 flex flex-col items-center gap-1 pointer-events-none">
                    <AnimatePresence>
                        {logs.map(log => (
                            <motion.div
                                key={log.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                className="bg-black/60 px-2 py-0.5 rounded text-cyan-400 text-[9px]"
                            >
                                {log.text}
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}
            
             {/* Scanline Effect */}
             <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-500/5 to-transparent h-4 w-full animate-scanline pointer-events-none" />

        </div>
    </div>
  );
};

export default NeuralLink;
