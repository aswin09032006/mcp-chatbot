import { AnimatePresence, motion } from 'framer-motion';
import { Mic, MicOff, Volume2, X } from 'lucide-react';
import { useEffect, useRef } from 'react';

const VoiceZenOverlay = ({ 
    isOpen, 
    onClose, 
    isListening, 
    isSpeaking, 
    lastTranscript, 
    analyser,
    onToggleListen
}) => {
    const canvasRef = useRef(null);
    const animationRef = useRef(null);

    useEffect(() => {
        if (!isOpen || !canvasRef.current || !analyser) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const draw = () => {
            animationRef.current = requestAnimationFrame(draw);
            analyser.getByteFrequencyData(dataArray);

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;
            const radius = 100;

            // Draw circular visualizer
            ctx.beginPath();
            ctx.strokeStyle = isSpeaking ? '#3b82f6' : (isListening ? '#10b981' : '#64748b');
            ctx.lineWidth = 3;

            for (let i = 0; i < bufferLength; i++) {
                const angle = (i / bufferLength) * Math.PI * 2;
                const amplitude = (dataArray[i] / 255.0) * 50;
                const x = centerX + (radius + amplitude) * Math.cos(angle);
                const y = centerY + (radius + amplitude) * Math.sin(angle);

                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.stroke();

            // Inner pulse
            const average = dataArray.reduce((a, b) => a + b) / bufferLength;
            const pulseRadius = radius * (1 + (average / 512));
            ctx.beginPath();
            ctx.arc(centerX, centerY, pulseRadius, 0, Math.PI * 2);
            ctx.fillStyle = isSpeaking ? 'rgba(59, 130, 246, 0.1)' : 'rgba(16, 185, 129, 0.1)';
            ctx.fill();
        };

        draw();

        return () => {
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
        };
    }, [isOpen, analyser, isListening, isSpeaking]);

    if (!isOpen) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-[#020617]/95 backdrop-blur-2xl flex flex-col items-center justify-center p-8"
        >
            {/* Top Bar */}
            <div className="absolute top-8 left-8 right-8 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-creozen-accent-blue/10 rounded-xl flex items-center justify-center border border-creozen-accent-blue/20">
                        <Volume2 size={20} className="text-creozen-accent-blue" />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-white uppercase tracking-widest">Zen Mode</h2>
                        <p className="text-[10px] text-creozen-text-muted">Immersive Interaction Active</p>
                    </div>
                </div>
                <button 
                    onClick={onClose}
                    className="p-3 bg-white/5 hover:bg-white/10 rounded-full text-white/50 hover:text-white transition-all border border-white/10"
                >
                    <X size={24} />
                </button>
            </div>

            {/* Main Visualizer */}
            <div className="relative w-full max-w-2xl flex-1 flex flex-col items-center justify-center">
                <canvas 
                    ref={canvasRef} 
                    width={600} 
                    height={400} 
                    className="max-w-full"
                />
                
                {/* Visual state indicator */}
                <motion.div
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ repeat: Infinity, duration: 4 }}
                    className="absolute inset-0 flex items-center justify-center pointer-events-none"
                >
                    <div className={`w-48 h-48 rounded-full blur-[100px] opacity-20 ${isSpeaking ? 'bg-blue-500' : (isListening ? 'bg-emerald-500' : 'bg-slate-500')}`} />
                </motion.div>

                {/* Subtitles */}
                <div className="mt-12 text-center max-w-xl mx-auto min-h-[100px]">
                    <AnimatePresence mode="wait">
                        <motion.p
                            key={lastTranscript || 'idle'}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className={`text-xl lg:text-3xl font-medium tracking-tight leading-relaxed ${isSpeaking ? 'text-blue-200' : 'text-emerald-500'}`}
                        >
                            {lastTranscript || (
                                isSpeaking 
                                ? "AI is speaking..." 
                                : (isListening ? "Listening for your voice..." : "Voice interaction paused")
                            )}
                        </motion.p>
                    </AnimatePresence>
                </div>
            </div>

            {/* Bottom Controls */}
            <div className="mb-12 flex items-center gap-8">
                <button
                    onClick={onToggleListen}
                    className={`
                        w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 border-2
                        ${isListening 
                            ? 'bg-emerald-500/10 border-emerald-500 text-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.3)]' 
                            : 'bg-white/5 border-white/10 text-white/40 hover:text-white hover:border-white/30'}
                    `}
                >
                    {isListening ? <Mic size={28} /> : <MicOff size={28} />}
                </button>
                
                <div className="text-xs text-creozen-text-muted font-medium bg-white/5 px-4 py-2 rounded-full border border-white/5">
                    Say "Close" or click X to exit
                </div>
            </div>

            {/* Subtle background glow */}
            <div className="fixed -bottom-64 -left-64 w-[600px] h-[600px] bg-creozen-accent-blue/10 rounded-full blur-[150px] pointer-events-none" />
            <div className="fixed -top-64 -right-64 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-[150px] pointer-events-none" />
        </motion.div>
    );
};

export default VoiceZenOverlay;
