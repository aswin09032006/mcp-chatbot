import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

const Login = () => {
    const handleLogin = () => {
        window.location.href = '/auth/google';
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-creozen-bg text-creozen-text-primary relative overflow-hidden font-sans">
            {/* Background Effects matching Chat.jsx */}
            <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-creozen-accent-blue/10 via-transparent to-transparent pointer-events-none" />
            
            {/* Animated Orbs */}
            <motion.div 
                animate={{ 
                    scale: [1, 1.2, 1],
                    opacity: [0.3, 0.5, 0.3],
                }}
                transition={{ 
                    duration: 8,
                    repeat: Infinity,
                    ease: "easeInOut" 
                }}
                className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-creozen-accent-blue/20 rounded-full blur-[128px] pointer-events-none" 
            />
            <motion.div 
                animate={{ 
                    scale: [1, 1.1, 1],
                    opacity: [0.2, 0.4, 0.2],
                }}
                transition={{ 
                    duration: 10,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 1
                }}
                className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-creozen-accent-blue/10 rounded-full blur-[128px] pointer-events-none" 
            />

            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="w-full max-w-md p-1"
            >
                <div className="bg-creozen-card/40 backdrop-blur-xl border border-creozen-border rounded-3xl p-8 shadow-2xl relative overflow-hidden group">
                    {/* Inner highlight */}
                    <div className="absolute inset-0 bg-gradient-to-b from-creozen-text-primary/5 to-transparent pointer-events-none" />
                    
                    <div className="relative z-10 flex flex-col items-center text-center">
                        <img src="../../public/logo.png" alt="" className='h-16 mb-2'/>                       
                        <h1 className="text-4xl font-bold mb-3 tracking-tight text-creozen-text-primary">Cortex</h1>
                        <p className="text-creozen-text-muted mb-10 text-lg leading-relaxed">
                            Your intelligent workspace companion.<br/>
                            <span className="text-sm opacity-70">Seamlessly integrated with Google Workspace.</span>
                        </p>

                        <button 
                            onClick={handleLogin}
                            className="w-full h-14 bg-creozen-text-primary text-creozen-bg font-semibold rounded-xl flex items-center justify-center gap-3 hover:opacity-90 transition-all active:scale-[0.98] group relative overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-creozen-bg/10 to-transparent translate-x-[-200%] group-hover:animate-shimmer" />
                            <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
                            <span className="text-[15px]">Continue with Google</span>
                            <ArrowRight size={18} className="opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
                        </button>
                    </div>
                </div>
                
                <p className="mt-8 text-center text-xs text-creozen-text-muted/40">
                    By continuing, you agree to our Terms of Service.
                </p>
            </motion.div>
        </div>
    );
};

export default Login;
