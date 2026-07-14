import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from './store';
import { initializeTheme } from './store/themeSlice';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import HCPList from './pages/HCPList';
import HCPDetails from './pages/HCPDetails';
import LogInteraction from './pages/LogInteraction';
import InteractionHistory from './pages/InteractionHistory';
import Analytics from './pages/Analytics';
import Sidebar from './components/Sidebar';
import Header from './components/Header';

// Protected Route Layout Wrapper
const ProtectedLayout = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-55 dark:bg-slate-950 text-slate-800 dark:text-slate-200 flex">
      <Sidebar />
      <div className="flex-1 pl-64 flex flex-col min-h-screen">
        <Header />
        {/* pt-20 accommodates the h-16 header bar */}
        <main className="flex-grow pt-20 px-6 pb-8 max-w-7xl w-full mx-auto animate-fadeIn">
          {children}
        </main>
      </div>
    </div>
  );
};

function App() {
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    // Sync dark mode configuration on reload
    dispatch(initializeTheme());
  }, [dispatch]);

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      
      <Route path="/dashboard" element={
        <ProtectedLayout>
          <Dashboard />
        </ProtectedLayout>
      } />
      
      <Route path="/hcps" element={
        <ProtectedLayout>
          <HCPList />
        </ProtectedLayout>
      } />

      <Route path="/hcps/:id" element={
        <ProtectedLayout>
          <HCPDetails />
        </ProtectedLayout>
      } />

      <Route path="/log-interaction" element={
        <ProtectedLayout>
          <LogInteraction />
        </ProtectedLayout>
      } />

      <Route path="/history" element={
        <ProtectedLayout>
          <InteractionHistory />
        </ProtectedLayout>
      } />

      <Route path="/analytics" element={
        <ProtectedLayout>
          <Analytics />
        </ProtectedLayout>
      } />

      {/* Fallback redirect */}
      <Route path="*" element={<Navigate to="/log-interaction" replace />} />
    </Routes>
  );
}

export default App;
