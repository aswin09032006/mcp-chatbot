import { motion } from 'framer-motion';

const Orb = () => {
  return (
    <div className="relative w-64 h-64 flex items-center justify-center">
      <motion.div 
        className="absolute inset-0 rounded-full bg-creozen-accent-blue/10 blur-3xl"
        animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.2, 0.4, 0.2]
        }}
        transition={{ 
            duration: 4, 
            repeat: Infinity,
            ease: "easeInOut" 
        }}
      />
      <motion.div
        className="w-32 h-32 rounded-full bg-gradient-to-br from-creozen-accent-blue to-cyan-500 shadow-[0_0_60px_rgba(0,144,255,0.3)] z-10 opacity-90"
        animate={{ y: [-10, 10, -10] }}
        transition={{ 
            duration: 6, 
            repeat: Infinity,
            ease: "easeInOut" 
        }}
      >
        <div className="absolute inset-0 rounded-full bg-white/10 backdrop-blur-sm" />
      </motion.div>
    </div>
  );
};

export default Orb;
