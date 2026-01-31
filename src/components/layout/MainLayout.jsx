import { Outlet } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import Sidebar from './Sidebar';
import Header from './Header';
import NpsDialog from '../common/NpsDialog';
import npsService from '../../services/npsService';

export default function MainLayout() {
  const { user } = useSelector((state) => state.auth);
  const [showNps, setShowNps] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(false); // Reset on desktop
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Check if we should show NPS dialog
  useEffect(() => {
    if (!user?.id) return;

    // Delay showing NPS dialog to let user interact with the app first
    const timer = setTimeout(() => {
      if (npsService.canShowNps(user.id)) {
        setShowNps(true);
      }
    }, 30000); // Show after 30 seconds of usage

    return () => clearTimeout(timer);
  }, [user?.id]);

  const handleNpsSubmit = async (score) => {
    if (!user?.id) return;
    await npsService.submitNps(user.id, score);
  };

  const handleNpsClose = () => {
    if (user?.id) {
      npsService.dismiss(user.id);
    }
    setShowNps(false);
  };

  return (
    <div data-cy="main-layout" className="flex h-screen bg-gray-100 dark:bg-gray-900">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          data-cy="sidebar-overlay"
        />
      )}
      
      {/* Sidebar - hidden on mobile by default, shown when sidebarOpen */}
      <div
        className={`fixed inset-y-0 left-0 z-40 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>
      
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header onMenuClick={() => setSidebarOpen(true)} sidebarOpen={sidebarOpen} />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
      
      {/* NPS Dialog */}
      <NpsDialog 
        isOpen={showNps}
        onClose={handleNpsClose}
        onSubmit={handleNpsSubmit}
      />
    </div>
  );
}
