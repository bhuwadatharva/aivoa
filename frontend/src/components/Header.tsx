import React from 'react';
import { useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Sun, Moon, Bell } from 'lucide-react';
import { RootState, AppDispatch } from '../store';
import { toggleDarkMode } from '../store/themeSlice';

const Header = () => {
  const dispatch = useDispatch<AppDispatch>();
  const location = useLocation();
  const { darkMode } = useSelector((state: RootState) => state.theme);

  // Derive header title from location path
  const getHeaderTitle = () => {
    const path = location.pathname;
    if (path.startsWith('/dashboard')) return 'Territory Dashboard';
    if (path.startsWith('/hcps')) return 'Healthcare Professional Directory';
    if (path.startsWith('/log-interaction')) return 'AI Detailing Call logger';
    if (path.startsWith('/history')) return 'Call History & Records';
    if (path.startsWith('/analytics')) return 'Territory Metrics & Charts';
    return 'Liaison Interaction Workspace';
  };

  return (
    <header className="h-16 border-b border-slate-200/60 dark:border-slate-800/40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md px-6 flex items-center justify-between fixed top-0 right-0 left-64 z-10">
      
      {/* Title */}
      <h1 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">
        {getHeaderTitle()}
      </h1>

      {/* Global settings / theme toggles */}
      <div className="flex items-center gap-4">
        
        {/* Toggle dark mode */}
        <button
          onClick={() => dispatch(toggleDarkMode())}
          className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {darkMode ? (
            <Sun className="w-4 h-4 text-amber-500" />
          ) : (
            <Moon className="w-4 h-4 text-slate-500" />
          )}
        </button>

        {/* Dummy Notifications icon */}
        <button
          className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-550 hover:bg-slate-50 dark:hover:bg-slate-800 relative transition-colors"
          title="System alerts"
        >
          <Bell className="w-4 h-4 text-slate-500" />
          {/* Notification Badge */}
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500"></span>
        </button>

      </div>

    </header>
  );
};

export default Header;
