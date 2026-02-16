import { AnimatePresence, motion } from 'framer-motion';
import {
    Calendar,
    CheckCircle,
    FileText,
    HardDrive,
    Loader2,
    Mail,
    MessageSquare,
    Search,
    Server,
    Table,
    User,
    Wrench
} from 'lucide-react';
import { useEffect, useState } from 'react';

const getToolIcon = (name) => {
    if (name.includes('calendar')) return Calendar;
    if (name.includes('email') || name.includes('gmail')) return Mail;
    if (name.includes('drive') || name.includes('file')) return HardDrive;
    if (name.includes('doc') || name.includes('text')) return FileText;
    if (name.includes('sheet')) return Table;
    if (name.includes('contact')) return User;
    if (name.includes('search')) return Search;
    return Wrench;
};

const getToolName = (name) => {
    return name.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

const WorkflowSidebar = ({ isLoading, trace }) => {
    // If no active processing and no previous trace, show nothing or placeholder
    const [displaySteps, setDisplaySteps] = useState([]);

    useEffect(() => {
        if (isLoading) {
            setDisplaySteps([{ type: 'processing', name: 'Processing Request', status: 'active' }]);
        } else if (trace && trace.length > 0) {
            // Process trace into visual steps
            const steps = [];
            
            // 1. Initial Server Step
            steps.push({ type: 'start', name: 'Request Received', status: 'completed' });

            // 2. Map trace items
            let currentTool = null;
            
            trace.forEach(item => {
                if (item.type === 'step') return; // Skip initial step as we hardcode start
                
                if (item.type === 'tool_start') {
                    currentTool = { 
                        type: 'tool', 
                        name: getToolName(item.name), 
                        rawName: item.name,
                        status: 'active',
                        args: item.args 
                    };
                    steps.push(currentTool);
                } else if (item.type === 'tool_end' && currentTool) {
                    currentTool.status = 'completed';
                    currentTool = null;
                } else if (item.type === 'tool_error' && currentTool) {
                    currentTool.status = 'error';
                    currentTool.error = item.error;
                    currentTool = null;
                } else if (item.type === 'complete') {
                    steps.push({ type: 'end', name: 'Response Generated', status: 'completed' });
                }
            });

            setDisplaySteps(steps);
        }
    }, [isLoading, trace]);

    if (!isLoading && (!trace || trace.length === 0)) return null;

    return (
        <div className="w-80 border-l border-creozen-border bg-creozen-card/30 backdrop-blur-sm flex flex-col h-full overflow-hidden hidden lg:flex">
            <div className="p-4 border-b border-creozen-border bg-creozen-card/50">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Server size={16} className="text-creozen-accent-blue" />
                    Workflow Trace
                </h3>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 relative">
                {/* Connecting Line */}
                <div className="absolute left-[38px] top-6 bottom-6 w-0.5 bg-creozen-border z-0" />

                <AnimatePresence mode='popLayout'>
                    {displaySteps.map((step, idx) => (
                        <motion.div
                            key={idx}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            className="relative z-10 flex gap-4"
                        >
                            {/* Icon Bubble */}
                            <div className={`
                                w-8 h-8 rounded-full flex items-center justify-center shrink-0 ring-4 ring-creozen-bg
                                ${step.status === 'active' ? 'bg-creozen-accent-blue animate-pulse' : 
                                  step.status === 'error' ? 'bg-creozen-accent-red' : 'bg-creozen-card border border-creozen-border'}
                            `}>
                                {step.type === 'processing' ? (
                                    <Loader2 size={16} className="text-white animate-spin" />
                                ) : step.type === 'start' ? (
                                    <Server size={14} className="text-gray-400" />
                                ) : step.type === 'end' ? (
                                    <MessageSquare size={14} className="text-creozen-accent-green" />
                                ) : step.type === 'tool' ? (
                                    (() => {
                                        const Icon = getToolIcon(step.rawName);
                                        return <Icon size={14} className="text-white" />;
                                    })()
                                ) : (
                                    <div className="w-2 h-2 rounded-full bg-gray-500" />
                                )}
                            </div>

                            {/* Content */}
                            <div className="flex-1 pt-1">
                                <p className={`text-sm font-medium ${step.status === 'active' ? 'text-creozen-accent-blue' : 'text-gray-300'}`}>
                                    {step.name}
                                </p>
                                {step.status === 'active' && (
                                    <p className="text-xs text-creozen-text-muted mt-0.5">Processing...</p>
                                )}
                                {step.status === 'error' && (
                                    <p className="text-xs text-creozen-accent-red mt-0.5">{step.error}</p>
                                )}
                                {step.type === 'tool' && step.status === 'completed' && (
                                    <div className="flex items-center gap-1 text-xs text-creozen-accent-green mt-1">
                                        <CheckCircle size={10} />
                                        <span>Completed</span>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default WorkflowSidebar;
