import { motion } from 'framer-motion';
import { Bot, Calendar, Cpu, Globe, Mail, Sparkles, Zap } from 'lucide-react';

const CapabilityCard = ({ icon: Icon, title, items, color, delay }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay }}
        className="bg-creozen-card/50 backdrop-blur-sm border border-creozen-border rounded-2xl p-5 hover:bg-creozen-card hover:border-creozen-accent-blue/30 transition-all duration-300 group"
    >
        <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
            <Icon size={20} className="text-white" />
        </div>
        <h3 className="text-sm font-semibold text-creozen-text-primary mb-3">{title}</h3>
        <ul className="space-y-2">
            {items.map((item, i) => (
                <li key={i} className="flex items-center gap-2 text-xs text-creozen-text-secondary">
                    <div className="w-1 h-1 rounded-full bg-creozen-border group-hover:bg-creozen-accent-blue/50 transition-colors" />
                    {item}
                </li>
            ))}
        </ul>
    </motion.div>
);

const Capabilities = ({ user }) => {
    const firstName = user?.name?.split(' ')[0] || 'User';

    const capabilities = [
        {
            icon: Zap,
            title: "Google Workspace",
            color: "bg-blue-500/20 text-blue-400 border border-blue-500/30",
            items: [
                "Read & Send Emails",
                "Manage Calendar Events",
                "Check Availability"
            ]
        },
        {
            icon: Globe,
            title: "Web Agent",
            color: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
            items: [
                "Deep Research & Analysis",
                "Read & Summarize Pages",
                "Interact with Web Apps"
            ]
        },
        {
            icon: Cpu,
            title: "Neural Memory",
            color: "bg-purple-500/20 text-purple-400 border border-purple-500/30",
            items: [
                "Long-term Context Recall",
                "Learns User Preferences",
                "Cross-Session Memory"
            ]
        }
    ];

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] max-w-4xl mx-auto px-4">
            
            {/* Header / Greeting */}
            <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="text-center mb-12"
            >
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-creozen-accent-blue/10 border border-creozen-accent-blue/20 text-creozen-accent-blue text-xs font-medium mb-6">
                    <Sparkles size={12} />
                    <span>System Online</span>
                </div>
                
                <h1 className="text-4xl md:text-5xl font-medium tracking-tight text-creozen-text-primary mb-4">
                    Good evening, {firstName}
                </h1>
                <p className="text-creozen-text-secondary text-lg max-w-lg mx-auto">
                    I am your intelligent assistant, connected to your world.
                    <br />
                    How can I help you achieve your goals today?
                </p>
            </motion.div>

            {/* Capabilities Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
                {capabilities.map((cap, idx) => (
                    <CapabilityCard 
                        key={idx}
                        {...cap}
                        delay={0.2 + (idx * 0.1)}
                    />
                ))}
            </div>

            {/* Neural Link Status (Subtle) */}
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1, duration: 1 }}
                className="mt-16 flex items-center gap-6 opacity-30 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-500"
            >
                <div className="flex items-center gap-2 text-xs">
                    <Bot size={14} />
                    <span>LLM Connected</span>
                </div>
                 <div className="w-px h-3 bg-current" />
                <div className="flex items-center gap-2 text-xs">
                    <Mail size={14} />
                    <span>Gmail Active</span>
                </div>
                <div className="w-px h-3 bg-current" />
                <div className="flex items-center gap-2 text-xs">
                    <Calendar size={14} />
                    <span>Calendar Synced</span>
                </div>
            </motion.div>

        </div>
    );
};

export default Capabilities;
