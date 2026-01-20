import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';

export default function Dashboard() {
  const { t } = useTranslation();
  const { user } = useSelector((state) => state.auth);
  const { isPremium, invoiceCount } = useSelector((state) => state.subscriptions);

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">{t('nav.dashboard')}</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-sm shadow dark:shadow-gray-900/20 p-6">
          <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Account Type</div>
          <div className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
            {isPremium ? 'Premium' : 'Free'}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-sm shadow dark:shadow-gray-900/20 p-6">
          <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Invoices Created</div>
          <div className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{invoiceCount}</div>
          {!isPremium && (
            <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {10 - invoiceCount} remaining
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-sm shadow dark:shadow-gray-900/20 p-6">
          <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Email</div>
          <div className="mt-2 text-lg font-medium text-gray-900 dark:text-white">{user?.email}</div>
        </div>
      </div>

      <div className="mt-8 bg-white dark:bg-gray-800 rounded-sm shadow dark:shadow-gray-900/20 p-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Welcome to VisInv!</h2>
        <p className="text-gray-600 dark:text-gray-400">
          Get started by creating your first invoice or managing your clients.
        </p>
      </div>
    </div>
  );
}
