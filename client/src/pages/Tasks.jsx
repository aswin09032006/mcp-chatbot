import axios from 'axios';
import { Calendar, CheckCircle, Clock, RefreshCw, Trash2, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import Layout from '../components/Layout';

const Tasks = ({ user, onLogout }) => {
    const [activeTasks, setActiveTasks] = useState([]);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedTask, setSelectedTask] = useState(null);

    const loadTasks = async () => {
        try {
            const [tasksRes, historyRes] = await Promise.all([
                axios.get('/api/tasks'),
                axios.get('/api/tasks/history?limit=20')
            ]);
            setActiveTasks(tasksRes.data);
            setHistory(historyRes.data);
        } catch (error) {
            console.error('Failed to load tasks:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadTasks();
        // Refresh every 30 seconds
        const interval = setInterval(loadTasks, 30000);
        return () => clearInterval(interval);
    }, []);

    const handleDelete = async (taskId) => {
        if (!confirm('Are you sure you want to delete this task?')) return;
        
        try {
            await axios.delete(`/api/tasks/${taskId}`);
            setActiveTasks(prev => prev.filter(t => t.id !== taskId));
        } catch (error) {
            console.error('Failed to delete task:', error);
            alert('Failed to delete task');
        }
    };

    const parseCron = (cron) => {
        if (!cron) return null;
        // Simple cron parser for display
        const parts = cron.split(' ');
        if (parts[0] === '*/5') return 'Every 5 minutes';
        if (parts[0] === '*/10') return 'Every 10 minutes';
        if (parts[0] === '*/15') return 'Every 15 minutes';
        if (parts[0] === '*/30') return 'Every 30 minutes';
        if (parts[1] === '*' && parts[0] === '0') return 'Every hour';
        return cron;
    };

    const getTaskSchedule = (task) => {
        if (task.cron) {
            return parseCron(task.cron);
        } else if (task.executeAt) {
            const executeDate = new Date(task.executeAt);
            return `Once at ${executeDate.toLocaleString()}`;
        }
        return 'Unknown schedule';
    };

    const formatDate = (date) => {
        return new Date(date).toLocaleString();
    };

    const getStatusIcon = (status) => {
        return status === 'success' 
            ? <CheckCircle className="text-emerald-400" size={16} />
            : <XCircle className="text-red-400" size={16} />;
    };

    if (loading) {
        return (
            <Layout user={user} onLogout={onLogout}>
                <div className="flex justify-center items-center h-full">
                    <div className="text-lg text-[var(--color-text-secondary)]">Loading tasks...</div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout user={user} onLogout={onLogout}>
            <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
                {/* Header */}
                <div className="flex justify-between items-center">
                    <h1 className="text-3xl font-medium tracking-tight text-[var(--color-text-primary)]">
                        Scheduled Tasks
                    </h1>
                    <button 
                        onClick={loadTasks} 
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--accent-color)]/10 border border-[var(--accent-color)]/20 text-[var(--accent-color)] hover:bg-[var(--accent-color)]/20 transition-all duration-200"
                    >
                        <RefreshCw size={16} />
                        <span className="text-sm font-medium">Refresh</span>
                    </button>
                </div>

                {/* Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Active Tasks Section */}
                    <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-3xl p-6 backdrop-blur-xl">
                        <h2 className="text-[13px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-6 flex items-center gap-2">
                            <Calendar size={14} className="text-[var(--accent-color)]" />
                            Active Tasks ({activeTasks.length})
                        </h2>
                        
                        {activeTasks.length === 0 ? (
                            <div className="text-center py-12 text-sm text-[var(--color-text-secondary)]">
                                No active scheduled tasks. Create one by chatting with the assistant!
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {activeTasks.map(task => (
                                    <div 
                                        key={task.id} 
                                        className="p-4 rounded-xl bg-creozen-card/50 border border-creozen-border hover:bg-creozen-card hover:border-creozen-text-primary/10 transition-all group"
                                    >
                                        <div className="flex justify-between items-start gap-4">
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm font-medium text-[var(--color-text-primary)] mb-2">
                                                    {task.instruction}
                                                </div>
                                                <div className="flex items-center gap-3 text-xs text-[var(--color-text-secondary)] flex-wrap">
                                                    <div className="flex items-center gap-1">
                                                        <Clock size={12} />
                                                        <span>{getTaskSchedule(task)}</span>
                                                    </div>
                                                    <span className="text-[var(--color-text-secondary)]/50">•</span>
                                                    <span>Created: {formatDate(task.createdAt)}</span>
                                                </div>
                                            </div>
                                            <div className="flex gap-2 flex-shrink-0">
                                                <button 
                                                    onClick={() => setSelectedTask(task.id)}
                                                    className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[var(--accent-color)]/10 border border-[var(--accent-color)]/20 text-[var(--accent-color)] hover:bg-[var(--accent-color)]/20 transition-all"
                                                >
                                                    View History
                                                </button>
                                                <button 
                                                    onClick={() => handleDelete(task.id)}
                                                    className="p-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Execution History Section */}
                    <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-3xl p-6 backdrop-blur-xl">
                        <h2 className="text-[13px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-6 flex items-center gap-2">
                            <Clock size={14} className="text-[var(--accent-color)]" />
                            Recent Executions
                        </h2>
                        
                        {history.length === 0 ? (
                            <div className="text-center py-12 text-sm text-[var(--color-text-secondary)]">
                                No execution history yet.
                            </div>
                        ) : (
                            <div className="space-y-2 max-h-[600px] overflow-y-auto scrollbar-hide">
                                {history.map(exec => (
                                    <div 
                                        key={exec._id} 
                                        className="group p-3 rounded-xl bg-creozen-card/30 border border-creozen-border hover:bg-creozen-card/60 hover:border-creozen-text-primary/10 transition-all"
                                    >
                                        {/* Header Row */}
                                        <div className="flex items-center justify-between gap-3 mb-2">
                                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                                {/* Status Badge */}
                                                <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider flex-shrink-0 ${
                                                    exec.status === 'success' 
                                                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' 
                                                        : 'bg-red-500/15 text-red-400 border border-red-500/20'
                                                }`}>
                                                    {exec.status === 'success' ? (
                                                        <CheckCircle size={10} />
                                                    ) : (
                                                        <XCircle size={10} />
                                                    )}
                                                    {exec.status}
                                                </div>
                                                
                                                {/* Duration Badge */}
                                                {exec.duration && (
                                                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--accent-color)]/10 border border-[var(--accent-color)]/20 text-[10px] font-medium text-[var(--accent-color)]">
                                                        <Clock size={9} />
                                                        {(exec.duration / 1000).toFixed(2)}s
                                                    </div>
                                                )}
                                            </div>
                                            
                                            {/* Timestamp */}
                                            <span className="text-[10px] text-[var(--color-text-secondary)] flex-shrink-0 font-medium">
                                                {formatDate(exec.executedAt)}
                                            </span>
                                        </div>
                                        
                                        {/* Instruction */}
                                        <div className="text-xs font-medium text-[var(--color-text-primary)] mb-2 leading-relaxed">
                                            {exec.instruction}
                                        </div>
                                        
                                        {/* Result/Error Output */}
                                        {exec.result && (
                                            <div className="mt-2 p-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/15 text-[11px] text-emerald-200/90 font-mono leading-relaxed">
                                                {exec.result}
                                            </div>
                                        )}
                                        
                                        {exec.error && (
                                            <div className="mt-2 p-2.5 rounded-lg bg-red-500/5 border border-red-500/15 text-[11px] text-red-200/90 font-mono leading-relaxed break-words">
                                                {exec.error}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default Tasks;
