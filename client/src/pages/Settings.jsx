import axios from 'axios';
import { AnimatePresence } from 'framer-motion';
import { Check, Database, Github, LogOut, Moon, Palette, Shield, Sun, Trash2, User as UserIcon } from 'lucide-react';
import { useState } from 'react';
import Layout from '../components/Layout';
import Toast from '../components/Toast';
import useThemeStore from '../store/themeStore';

const Settings = ({ user, onLogout }) => {
  const { currentTheme, setTheme } = useThemeStore();
  const [githubToken, setGithubToken] = useState(user.githubToken || '');
  const [isSavingToken, setIsSavingToken] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message, type) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSaveGithubToken = async () => {
    setIsSavingToken(true);
    try {
        const res = await axios.put('/api/user/github-token', { token: githubToken });
        if (res.data.success) {
            showToast('GitHub token updated successfully', 'success');
        } else {
            showToast('Failed to update token', 'error');
        }
    } catch (err) {
        console.error(err);
        showToast('Error saving GitHub token', 'error');
    } finally {
        setIsSavingToken(false);
    }
  };

  const themes = [
    { id: 'default', name: 'Dark Mode', icon: Moon, color: 'bg-[#0a0a0b]' },
    { id: 'light', name: 'Light Mode', icon: Sun, color: 'bg-white' },
  ];

  return (
    <Layout user={user} onLogout={onLogout}>
        <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
            <h1 className="text-3xl font-medium tracking-tight text-[var(--color-text-primary)] mb-8">Settings</h1>

            {/* Appearance Section */}
            <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-3xl p-6 backdrop-blur-xl">
                <h2 className="text-[13px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-6 flex items-center gap-2">
                    <Palette size={14} className="text-[var(--accent-color)]" />
                    Appearance
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {themes.map((theme) => (
                        <button
                            key={theme.id}
                            onClick={() => setTheme(theme.id)}
                            className={`relative p-4 rounded-xl border transition-all duration-200 group text-left ${
                                currentTheme === theme.id 
                                ? 'border-[var(--accent-color)] ring-1 ring-[var(--accent-color)] bg-[var(--accent-color)]/5' 
                                : 'border-[var(--border-color)] hover:border-[var(--color-text-secondary)] bg-transparent'
                            }`}
                        >
                            <div className={`h-8 w-8 rounded-full mb-3 ${theme.color} border border-creozen-border shadow-sm flex items-center justify-center`}>
                                <theme.icon size={14} className={theme.id === 'light' ? 'text-gray-800' : 'text-gray-100'} />
                            </div>
                            <span className={`text-sm font-medium block ${currentTheme === theme.id ? 'text-[var(--accent-color)]' : 'text-[var(--color-text-primary)]'}`}>
                                {theme.name}
                            </span>
                             {currentTheme === theme.id && (
                                <div className="absolute top-3 right-3 text-[var(--accent-color)]">
                                    <Check size={14} />
                                </div>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Profile Section */}
            <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-3xl p-6 backdrop-blur-xl">
                <h2 className="text-[13px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-6 flex items-center gap-2">
                    <Shield size={14} className="text-[var(--accent-color)]" />
                    Profile & Account
                </h2>
                <div className="flex items-center gap-6">
                    <div className="h-20 w-20 rounded-full border-2 border-creozen-border flex items-center justify-center overflow-hidden bg-[var(--bg-primary)]">
                        {user.picture ? (
                            <img src={user.picture} alt={user.name} className="w-full h-full object-cover" />
                        ) : (
                            <div className="text-2xl font-medium text-[var(--color-text-secondary)]">
                                {user.name ? user.name.charAt(0).toUpperCase() : <UserIcon size={32} />}
                            </div>
                        )}
                    </div>
                    <div className="flex-1">
                        <h3 className="text-xl font-medium text-[var(--color-text-primary)]">{user.name}</h3>
                        <p className="text-sm text-[var(--color-text-secondary)] mt-1">{user.email}</p>
                        <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--accent-color)]/10 text-[var(--accent-color)] text-xs font-medium border border-[var(--accent-color)]/20">
                            <Check size={12} />
                            Active Subscription
                        </div>
                    </div>
                </div>
            </div>

            {/* Integrations Section */}
            <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-3xl p-6 backdrop-blur-xl">
                <h2 className="text-[13px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-6 flex items-center gap-2">
                    <Database size={14} className="text-[var(--accent-color)]" />
                    Workspace Integrations
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                    {[
                        { name: 'Gmail', icon: 'https://upload.wikimedia.org/wikipedia/commons/7/7e/Gmail_icon_%282020%29.svg' },
                        { name: 'Google Calendar', icon: 'https://upload.wikimedia.org/wikipedia/commons/a/a5/Google_Calendar_icon_%282020%29.svg' },
                        { name: 'Google Docs', icon: 'https://upload.wikimedia.org/wikipedia/commons/0/01/Google_Docs_logo_%282014-2020%29.svg' },
                        { name: 'Google Sheets', icon: 'https://upload.wikimedia.org/wikipedia/commons/3/30/Google_Sheets_logo_%282014-2020%29.svg' },
                    ].map((app) => (
                        <div key={app.name} className="flex items-center justify-between p-4 rounded-xl bg-creozen-card/50 border border-creozen-border hover:bg-creozen-card hover:border-creozen-text-primary/10 transition-all group cursor-default">
                            <div className="flex items-center gap-3">
                                <img src={app.icon} alt={app.name} className="h-6 w-6 opacity-80 group-hover:opacity-100 transition-opacity" />
                                <span className="text-sm font-medium text-[var(--color-text-secondary)] group-hover:text-[var(--color-text-primary)] transition-colors">{app.name}</span>
                            </div>
                            <div className="flex items-center gap-2 text-[var(--accent-color)] text-xs font-medium bg-[var(--accent-color)]/10 px-2 py-1 rounded-md">
                                <Check size={12} />
                                <span>Connected</span>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="border-t border-[var(--border-color)] pt-6">
                    <div className="flex items-start gap-4 p-4 rounded-2xl bg-creozen-card/50 border border-creozen-border">
                        <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-white">
                            <Github size={20} />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-sm font-medium text-[var(--color-text-primary)] mb-1">GitHub Agency</h3>
                            <p className="text-xs text-[var(--color-text-secondary)] mb-4 leading-relaxed">
                                Connect your GitHub Personal Access Token (PAT) to enable the AI to manage repositories, create PRs, and analyze issues.
                            </p>
                            <div className="flex gap-2">
                                <input 
                                    type="password"
                                    value={githubToken}
                                    onChange={(e) => setGithubToken(e.target.value)}
                                    placeholder="ghp_xxxxxxxxxxxx"
                                    className="flex-1 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg px-3 py-1.5 text-xs text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-color)] transition-all"
                                />
                                <button 
                                    onClick={handleSaveGithubToken}
                                    disabled={isSavingToken}
                                    className="px-4 py-1.5 bg-[var(--accent-color)] text-[var(--bg-primary)] rounded-lg text-xs font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
                                >
                                    {isSavingToken ? 'Saving...' : 'Connect'}
                                </button>
                            </div>
                            <p className="mt-2 text-[10px] text-[var(--color-text-secondary)]">
                                Ensure your token has <code className="bg-[var(--bg-primary)] px-1 rounded">repo</code> and <code className="bg-[var(--bg-primary)] px-1 rounded">read:user</code> scopes. 
                                <a 
                                    href="https://github.com/settings/tokens/new" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="ml-1 text-[var(--accent-color)] hover:underline"
                                >
                                    Generate token →
                                </a>
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* MCP Architecture Section */}
            <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-3xl p-6 backdrop-blur-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                    <Database size={100} />
                </div>
                <h2 className="text-[13px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-6 flex items-center gap-2">
                    <Database size={14} className="text-emerald-400" />
                    Model Context Protocol
                </h2>
                <div className="flex items-start gap-4">
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                        <Database size={24} />
                    </div>
                    <div>
                        <h3 className="text-lg font-medium text-[var(--color-text-primary)] flex items-center gap-2">
                            MCP Server Active
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-wider border border-emerald-500/10">
                                Native
                            </span>
                        </h3>
                        <p className="text-sm text-[var(--color-text-secondary)] mt-1 max-w-md">
                            Your chatbot is powered by the <strong>Model Context Protocol</strong>, allowing it to connect securely to local tools and data.
                        </p>
                        
                        <div className="mt-4 grid grid-cols-2 gap-3">
                            <div className="p-3 rounded-lg bg-creozen-card/50 border border-creozen-border">
                                <span className="text-xs text-[var(--color-text-secondary)] uppercase font-bold tracking-wider">Transport</span>
                                <p className="text-sm font-mono text-[var(--color-text-primary)] mt-0.5">stdio (local)</p>
                            </div>
                            <div className="p-3 rounded-lg bg-creozen-card/50 border border-creozen-border">
                                <span className="text-xs text-[var(--color-text-secondary)] uppercase font-bold tracking-wider">Server</span>
                                <p className="text-sm font-mono text-[var(--color-text-primary)] mt-0.5">mcp-chatbot-server</p>
                            </div>
                        </div>


                    </div>
                </div>
            </div>

            {/* Actions / Logout */}
            <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-3xl p-6 backdrop-blur-xl">
                 <h2 className="text-[13px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-6">Account Actions</h2>
                 <div className="space-y-3">
                    <button onClick={onLogout} className="w-full flex items-center justify-between p-4 rounded-xl bg-creozen-card/50 border border-creozen-border hover:bg-red-500/10 hover:border-red-500/20 hover:text-red-400 transition-all group text-left">
                        <div className="flex items-center gap-3">
                            <LogOut size={18} className="text-[var(--color-text-secondary)] group-hover:text-red-400 transition-colors" />
                            <div>
                                <span className="text-sm font-medium text-[var(--color-text-secondary)] group-hover:text-red-400 transition-colors">Sign Out</span>
                                <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">End session on this device</p>
                            </div>
                        </div>
                    </button>
                    
                     <button className="w-full flex items-center justify-between p-4 rounded-xl bg-creozen-card/50 border border-creozen-border hover:bg-red-500/10 hover:border-red-500/20 hover:text-red-400 transition-all group text-left">
                        <div className="flex items-center gap-3">
                            <Trash2 size={18} className="text-[var(--color-text-secondary)] group-hover:text-red-400 transition-colors" />
                            <div>
                                <span className="text-sm font-medium text-[var(--color-text-secondary)] group-hover:text-red-400 transition-colors">Delete Account</span>
                                <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">Permanently remove all data</p>
                            </div>
                        </div>
                    </button>
                 </div>
            </div>
            
            <p className="text-center text-xs text-[var(--color-text-secondary)] pt-8">
                Cortex v4.0.2 • Build 2026.02.10
            </p>

            <AnimatePresence>
                {toast && (
                    <Toast 
                        message={toast.message} 
                        type={toast.type} 
                        onClose={() => setToast(null)} 
                    />
                )}
            </AnimatePresence>
        </div>
    </Layout>
  );
};

export default Settings;
