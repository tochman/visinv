import { useState } from 'react';

export default function UserEditModal({ user, onClose, onSave }) {
  const [form, setForm] = useState({
    full_name: user.full_name || '',
    email: user.email || '',
    plan_type: user.plan_type || 'free',
  });
  const [saving, setSaving] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(form);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50" data-cy="edit-user-modal">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative max-w-md w-full mx-auto mt-24 bg-white dark:bg-gray-800 rounded-sm shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Edit User</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Full Name</label>
            <input
              name="full_name"
              value={form.full_name}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              data-cy="edit-full-name"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Email</label>
            <input
              name="email"
              value={form.email}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              data-cy="edit-email"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Plan</label>
            <select
              name="plan_type"
              value={form.plan_type}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              data-cy="edit-plan"
            >
              <option value="free">free</option>
              <option value="premium">premium</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded-sm" data-cy="cancel-edit" disabled={saving}>Cancel</button>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-sm" data-cy="save-edit" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
