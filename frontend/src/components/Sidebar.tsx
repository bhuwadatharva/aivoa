import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { 
  LayoutDashboard, 
  Users, 
  History, 
  BarChart3, 
  PenBox, 
  LogOut, 
  ShieldAlert 
} from 'lucide-react';
import { RootState, AppDispatch } from '../store';
import { logout } from '../store/authSlice';

const Sidebar = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { user } = useSelector((state: RootState) => state.auth);

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to end your secure session?")) {
      dispatch(logout());
      navigate('/login');
    }
  };

  const navLinks = [
    { to: '/log-interaction', label: 'AI Log Interaction', icon: PenBox },
    { to: '/history', label: 'Past Visits', icon: History },
    { to: '/hcps', label: 'HCP Directory', icon: Users },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 text-white flex flex-col justify-between h-screen fixed top-0 left-0 z-20">
      
      {/* Brand logo details */}
      <div className="p-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-healthcare-600 flex items-center justify-center border border-healthcare-500 shadow-md shadow-healthcare-600/10">
            <ShieldAlert className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-extrabold text-sm tracking-tight text-white">Aivoa CRM</h2>
            <p className="text-[9px] text-teal-400 font-semibold tracking-wider uppercase">Life Sciences MSL</p>
          </div>
        </div>
      </div>

      {/* Navigation menu list */}
      <nav className="flex-1 px-4 py-4 space-y-1.5 overflow-y-auto">
        {navLinks.map((link) => {
          const Icon = link.icon;
          return (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) => `
                flex items-center gap-3.5 px-4 py-3 rounded-xl text-xs font-semibold tracking-wide transition-all duration-200 group
                ${isActive 
                  ? 'bg-healthcare-600 text-white shadow-lg shadow-healthcare-600/15' 
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                }
              `}
            >
              <Icon className="w-4.5 h-4.5 flex-shrink-0" />
              <span>{link.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Bottom Profile card and logout Option */}
      <div className="p-4 border-t border-slate-800/80">
        
        {user && (
          <div className="p-3.5 rounded-2xl bg-slate-800/40 border border-slate-800/50 flex items-center justify-between mb-3.5">
            <div className="min-w-0">
              <h4 className="text-xs font-bold text-slate-200 truncate">{user.full_name}</h4>
              <span className="text-[9px] text-teal-400 font-semibold uppercase block mt-0.5 tracking-wider truncate">{user.role}</span>
            </div>
          </div>
        )}

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3.5 px-4 py-3 text-xs font-semibold text-red-400 hover:bg-red-500/10 rounded-xl transition-all duration-200"
        >
          <LogOut className="w-4.5 h-4.5" />
          <span>Secured Sign Out</span>
        </button>

      </div>

    </aside>
  );
};

export default Sidebar;
