import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';

export default function Dashboard() {
  const { t } = useTranslation();
  const { user } = useSelector((state) => state.auth);
  const { isPremium, invoiceCount } = useSelector((state) => state.subscriptions);

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">{t('nav.dashboard')}</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500">Account Type</div>
          <div className="mt-2 text-2xl font-bold text-gray-900">
            {isPremium ? 'Premium' : 'Free'}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500">Invoices Created</div>
          <div className="mt-2 text-2xl font-bold text-gray-900">{invoiceCount}</div>
          {!isPremium && (
            <div className="mt-1 text-sm text-gray-500">
              {10 - invoiceCount} remaining
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500">Email</div>
          <div className="mt-2 text-lg font-medium text-gray-900">{user?.email}</div>
        </div>
      </div>

      <div className="mt-8 bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Welcome to VisInv!</h2>
        <p className="text-gray-600">
          Get started by creating your first invoice or managing your clients.
        </p>
      </div>
    </div>
  );
}
