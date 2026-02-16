import { useState } from 'react';
import Sidebar from './Sidebar';

const Layout = ({ children, user, onLogout }) => {
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);

  return (
    <div className="flex h-screen bg-creozen-bg text-creozen-text-primary font-sans overflow-hidden selection:bg-creozen-accent-blue/20">
        {/* Background Grid Pattern */}
        <div className="fixed inset-0 z-0 pointer-events-none bg-grid-pattern opacity-[0.4]" />

        {/* Sidebar */}
        <Sidebar user={user} onLogout={onLogout} isSidebarVisible={isSidebarVisible} setIsSidebarVisible={setIsSidebarVisible} />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col relative z-10 overflow-hidden transition-all duration-300 ease-in-out">
            <main className="flex-[2] overflow-y-auto relative scroll-smooth">
                {children}
            </main>
        </div>
    </div>
  );
};

export default Layout;
