import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { adminService } from '../../services/adminService';

export default function AdminDashboard() {
  const { t } = useTranslation();
  const [stats, setStats] = useState({ users: 0, orgs: 0, invoices: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await adminService.getStats();
        setStats(data);
      } catch (error) {
        console.error('Failed to load admin stats', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return (
    <div data-cy="admin-dashboard-page" className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6 animate-fade-in-up">
        {t('nav.admin')}
      </h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Users Stat */}
        <div 
          data-cy="stats-users" 
          className="bg-white dark:bg-gray-800 p-6 rounded-sm shadow-sm border border-gray-200 dark:border-gray-700"
        >
          <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Total Users</div>
          <div data-cy="stats-users-count" className="text-3xl font-bold text-gray-900 dark:text-white">
            {loading ? '-' : stats.users}
          </div>
        </div>

        {/* Organizations Stat */}
        <div 
          data-cy="stats-orgs" 
          className="bg-white dark:bg-gray-800 p-6 rounded-sm shadow-sm border border-gray-200 dark:border-gray-700"
        >
          <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Organizations</div>
          <div data-cy="stats-orgs-count" className="text-3xl font-bold text-gray-900 dark:text-white">
            {loading ? '-' : stats.orgs}
          </div>
        </div>

        {/* Invoices Stat */}
        <div 
          data-cy="stats-invoices" 
          className="bg-white dark:bg-gray-800 p-6 rounded-sm shadow-sm border border-gray-200 dark:border-gray-700"
        >
          <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Total Invoices</div>
          <div data-cy="stats-invoices-count" className="text-3xl font-bold text-gray-900 dark:text-white">
            {loading ? '-' : stats.invoices}
          </div>
        </div>
      </div>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Common Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <a href="/admin/users" data-cy="admin-users-link" className="p-4 border rounded-sm hover:bg-gray-50 dark:hover:bg-gray-700">
            <div className="text-sm text-gray-500">User Management</div>
            <div className="text-base font-medium">View & Edit Users</div>
          </a>
        </div>
      </div>
    </div>
  );
}
