import axios from 'axios';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Brain,
  Calendar,
  LogOut,
  Menu,
  PenBox,
  Search,
  Settings,
  Trash2,
  User,
  X
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import logo from '../../public/logo.png';
import useNeuralLinkStore from '../store/neuralLinkStore';

const Sidebar = ({ user, onLogout, isSidebarVisible, setIsSidebarVisible }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [chats, setChats] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const { toggleMemoryInspector } = useNeuralLinkStore();

  // Fetch chats on mount and when location changes (in case new chat created)
  useEffect(() => {
     fetchChats();
  }, [location.pathname]);

  const fetchChats = async () => {
    try {
        const res = await axios.get('/api/chats');
        setChats(res.data);
    } catch (err) {
        console.error("Failed to fetch chats", err);
    }
  };

  const handleDeleteChat = async (e, chatId) => {
    e.stopPropagation(); // Prevent navigation
    if (!window.confirm("Delete this chat?")) return;
    try {
        await axios.delete(`/api/chats/${chatId}`);
        setChats(chats.filter(c => c._id !== chatId));
        if (location.pathname === `/c/${chatId}`) {
            navigate('/');
        }
    } catch (err) {
        console.error("Failed to delete chat", err);
    }
  };

  return (
    <>
      {/* Toggle Button - Visible when sidebar is hidden */}
      <AnimatePresence>
        {!isSidebarVisible && (
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            onClick={() => setIsSidebarVisible(true)}
            className="fixed top-4 left-4 z-50 p-2.5 rounded-lg bg-creozen-card/80 backdrop-blur-xl border border-creozen-border text-creozen-text-muted hover:text-creozen-text-primary hover:bg-creozen-text-primary/10 transition-colors shadow-lg"
            title="Show sidebar"
          >
            <Menu size={20} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.div
        animate={{ 
          width: isSidebarVisible ? 288 : 0,
          opacity: isSidebarVisible ? 1 : 0
        }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="h-full flex flex-col border-r border-creozen-border bg-creozen-card/80 backdrop-blur-xl shrink-0 z-50 overflow-hidden"
        style={{ minWidth: 0 }}
      >
            {/* Header / Brand */}
            <div className="h-16 flex items-center px-6 justify-between">
              <Link to="/" className="flex items-center gap-3 group">
                <div className="w-6 h-6 rounded-xl flex items-center justify-center">
                  <img src={logo} alt="" />
                </div>
                <span className="text-xl font-medium tracking-tight text-creozen-text-primary group-hover:text-creozen-accent-blue transition-colors">Cortex</span>
              </Link>
              
              {/* Close button */}
              <button
                onClick={() => setIsSidebarVisible(false)}
                className="p-1.5 rounded-lg text-creozen-text-muted hover:text-creozen-text-primary hover:bg-creozen-text-primary/10 transition-colors"
                title="Hide sidebar"
              >
                <X size={18} />
              </button>
            </div>


            {/* New Chat Button - Fixed at top */}
            <div className="px-4 pb-4 border-b border-creozen-border">
               <button
                onClick={() => navigate('/')}
                className="w-full h-11 flex items-center gap-2 px-4 rounded-xl text-sm font-semibold bg-creozen-text-primary text-creozen-bg hover:opacity-90 transition-all duration-200 shadow-md shadow-creozen-text-primary/5"
              >
                <PenBox size={18} className="stroke-[2.5]" />
                New Chat
              </button>
            </div>

            {/* Scrollable Chat History */}
            <div className="flex-1 overflow-y-auto py-4 px-4 scrollbar-hide">
              {/* Search Bar */}
              <div className="mb-4">
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-creozen-text-muted" />
                  <input
                    type="text"
                    placeholder="Search chats..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-9 pl-9 pr-3 rounded-lg bg-creozen-bg border border-creozen-border text-sm text-creozen-text-primary placeholder-creozen-text-muted focus:outline-none focus:border-creozen-accent-blue focus:bg-creozen-bg transition-all"
                  />
                </div>
              </div>

              {/* Recent Chats History */}
              <div className="space-y-2">
                <div className="px-2 text-[11px] font-bold text-creozen-text-muted uppercase tracking-wider">Recent Chats</div>
                <div className="space-y-1">
                  {chats.filter(chat => 
                    (chat.title || 'Untitled Chat').toLowerCase().includes(searchQuery.toLowerCase())
                  ).length === 0 ? (
                    <div className="px-2 py-4 text-center text-xs text-creozen-text-muted italic">
                      {searchQuery ? 'No chats found' : 'No recent chats'}
                    </div>
                  ) : (
                    chats.filter(chat => 
                      (chat.title || 'Untitled Chat').toLowerCase().includes(searchQuery.toLowerCase())
                    ).map(chat => (
                      <div
                        key={chat._id}
                        onClick={() => navigate(`/c/${chat._id}`)}
                        className={`group w-full h-10 flex items-center justify-between px-3 rounded-lg text-sm cursor-pointer transition-all duration-200 border border-transparent ${
                          location.pathname === `/c/${chat._id}`
                            ? 'bg-creozen-accent-blue/10 text-creozen-accent-blue border-creozen-accent-blue/20 shadow-sm' 
                            : 'text-creozen-text-muted hover:text-creozen-text-primary hover:bg-creozen-text-primary/5'
                        }`}
                      >
                        <span className="truncate pr-2 font-medium">{chat.title || 'Untitled Chat'}</span>
                        <button 
                          onClick={(e) => handleDeleteChat(e, chat._id)}
                          className="opacity-0 group-hover:opacity-100 p-1.5 text-creozen-text-muted hover:text-red-400 hover:bg-red-500/10 rounded-md transition-all"
                          title="Delete chat"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Footer / Utilities */}
            <div className="p-2 border-t border-creozen-border bg-creozen-bg/20 space-y-1">
              <button
                onClick={toggleMemoryInspector}
                className="w-full h-10 flex items-center gap-3 px-3 rounded-lg text-sm font-medium text-creozen-text-muted hover:text-creozen-text-primary hover:bg-creozen-text-primary/5 transition-colors"
              >
                <Brain size={18} />
                Cognitive Map
              </button>
              <button
                onClick={() => navigate('/tasks')}
                className="w-full h-10 flex items-center gap-3 px-3 rounded-lg text-sm font-medium text-creozen-text-muted hover:text-creozen-text-primary hover:bg-creozen-text-primary/5 transition-colors"
              >
                <Calendar size={18} />
                Scheduled Tasks
              </button>
              <button
                onClick={() => navigate('/settings')}
                className="w-full h-10 mb-2 flex items-center gap-3 px-3 rounded-lg text-sm font-medium text-creozen-text-muted hover:text-creozen-text-primary hover:bg-creozen-text-primary/5 transition-colors"
              >
                <Settings size={18} />
                Settings
              </button>
              
              <div className="pt-2 mt-2 border-t border-creozen-border">
                <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-creozen-text-primary/5 transition-colors cursor-pointer group">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center border border-creozen-border text-creozen-text-primary font-medium text-xs overflow-hidden bg-creozen-card shadow-inner`}>
                    {user?.picture ? (
                      <img src={user.picture} alt={user.name} className="w-full h-full object-cover" />
                    ) : (
                      user?.name?.[0]?.toUpperCase() || <User size={16}/>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-creozen-text-primary truncate transition-colors">{user?.name || 'User'}</p>
                    <button onClick={onLogout} className="text-xs text-creozen-text-muted hover:text-red-400 transition-colors flex items-center gap-1.5 mt-0.5 font-medium">
                      <LogOut size={11} />
                      Sign out
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
    </>
  );
};

export default Sidebar;
