import { useTranslation } from 'react-i18next';

export default function AdminDashboard() {
  const { t } = useTranslation();

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">{t('nav.admin')}</h1>
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-600">Admin dashboard with user management and analytics.</p>
      </div>
    </div>
  );
}
