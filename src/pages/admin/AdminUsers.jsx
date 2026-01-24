import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { User } from '../../services/resources';
import UserEditModal from '../../components/admin/UserEditModal';

export default function AdminUsers() {
  const { t } = useTranslation();
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const { data, error } = await User.index();
        if (error) throw error;
        setUsers(data || []);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return users;
    return users.filter(u =>
      (u.email || '').toLowerCase().includes(term) ||
      (u.full_name || '').toLowerCase().includes(term)
    );
  }, [users, search]);

  const handleSave = async (updates) => {
    const { data: updated, error } = await User.update(selectedUser.id, updates);
    if (error) {
      console.error('Failed to update user:', error);
      return;
    }
    setUsers(prev => prev.map(u => u.id === updated.id ? updated : u));
    setSelectedUser(null);
  };

  const formatDate = (iso) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString();
  };

  return (
    <div data-cy="admin-users-page" className="p-6 space-y-6">
      <div className="flex items-center justify-between animate-fade-in-up">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">{t('adminUsers.title') || 'Users'}</h1>
      </div>

      <div className="flex mb-4 animate-fade-in-up animate-delay-100">
        <input
          data-cy="search-users"
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder={t('adminUsers.search') || 'Search users...'}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-sm overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700/40">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('adminUsers.name') || 'Name'}</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('adminUsers.email') || 'Email'}</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('adminUsers.plan') || 'Plan'}</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('adminUsers.registered') || 'Registered'}</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('adminUsers.lastLogin') || 'Last Login'}</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{t('common.actions') || 'Actions'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {loading ? (
              <tr><td className="px-4 py-6 text-gray-500" colSpan={6}>Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td className="px-4 py-6 text-gray-500" colSpan={6}>No users found</td></tr>
            ) : filtered.map((u) => (
              <tr key={u.id} data-cy={`user-row-${u.id}`}>
                <td className="px-4 py-3 text-sm text-gray-900 dark:text-white" data-cy={`user-name-${u.id}`}>{u.full_name || '—'}</td>
                <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300" data-cy={`user-email-${u.id}`}>{u.email}</td>
                <td className="px-4 py-3 text-sm" data-cy={`user-plan-${u.id}`}>
                  <span className="px-2 py-1 text-xs rounded bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">{u.plan_type || 'free'}</span>
                </td>
                <td className="px-4 py-3 text-sm" data-cy={`user-registered-${u.id}`}>{formatDate(u.created_at)}</td>
                <td className="px-4 py-3 text-sm" data-cy={`user-last-login-${u.id}`}>{formatDate(u.updated_at)}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    data-cy={`edit-user-${u.id}`}
                    className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"
                    onClick={() => setSelectedUser(u)}
                  >
                    {t('common.edit') || 'Edit'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedUser && (
        <UserEditModal 
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
