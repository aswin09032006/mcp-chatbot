import axios from 'axios';
import { useEffect, useState } from 'react';
import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import Chat from './pages/Chat';
import Login from './pages/Login';
import Settings from './pages/Settings';
import Tasks from './pages/Tasks';

import { setupTabListeners } from './store/tabsStore';

// Configure axios defaults
axios.defaults.withCredentials = true;

// Add global error handling interceptor
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Redirect to login on 401, but avoid infinite loops
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    } else if (error.response?.status === 429) {
      // Handle rate limiting
      console.warn('Rate limit exceeded');
      // Dispatch a custom event that components can listen to
      window.dispatchEvent(new CustomEvent('rate-limit-exceeded'));
    }
    return Promise.reject(error);
  }
);

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Enable Electron tab listeners
    setupTabListeners();

    const checkAuth = async () => {
      try {
        const res = await axios.get('/api/user/me');
        setUser(res.data);
      } catch (err) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  const handleLogout = async () => {
    try {
        await axios.post('/auth/logout');
        setUser(null);
    } catch (error) {
        console.error('Logout failed', error);
    }
  };

  if (loading) {
    return <div className="flex h-screen items-center justify-center bg-dark text-white">Loading...</div>;
  }

  return (
    <Router>
       <Routes>
         <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
         <Route path="/" element={user ? <Chat user={user} onLogout={handleLogout} /> : <Navigate to="/login" />} />
         <Route path="/c/:chatId" element={user ? <Chat user={user} onLogout={handleLogout} /> : <Navigate to="/login" />} />
         <Route path="/settings" element={user ? <Settings user={user} onLogout={handleLogout} /> : <Navigate to="/login" />} />
         <Route path="/tasks" element={user ? <Tasks user={user} onLogout={handleLogout} /> : <Navigate to="/login" />} />
       </Routes>
    </Router>
  );
}

export default App;
