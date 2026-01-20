import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { appConfig } from '../../config/constants';

export default function Sidebar() {
  const { t } = useTranslation();
  const location = useLocation();
  const { user } = useSelector((state) => state.auth);
  const { isPremium } = useSelector((state) => state.subscriptions);

  const isAdmin = user?.email === appConfig.adminEmail;

  const navItems = [
    { path: '/', label: t('nav.dashboard'), icon: '📊' },
    { path: '/invoices', label: t('nav.invoices'), icon: '📄' },
    { path: '/clients', label: t('nav.clients'), icon: '👥' },
    { path: '/templates', label: t('nav.templates'), icon: '🎨', premium: true },
    { path: '/teams', label: t('nav.teams'), icon: '🤝', premium: true },
    { path: '/settings', label: t('nav.settings'), icon: '⚙️' },
  ];

  if (isAdmin) {
    navItems.push({ path: '/admin', label: t('nav.admin'), icon: '🔧' });
  }

  const isActive = (path) => location.pathname === path;

  return (
    <div className="w-64 bg-white shadow-lg">
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-900">VisInv</h1>
        {!isPremium && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm">
            <p className="text-blue-900 font-medium">Free Plan</p>
            <Link to="/settings" className="text-blue-600 hover:underline text-xs">
              Upgrade to Premium
            </Link>
          </div>
        )}
      </div>

      <nav className="px-4 space-y-1">
        {navItems.map((item) => {
          const disabled = item.premium && !isPremium && !isAdmin;
          
          return (
            <Link
              key={item.path}
              to={disabled ? '#' : item.path}
              className={`flex items-center px-4 py-3 rounded-lg transition-colors ${
                isActive(item.path)
                  ? 'bg-blue-600 text-white'
                  : disabled
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
              onClick={(e) => disabled && e.preventDefault()}
            >
              <span className="mr-3 text-xl">{item.icon}</span>
              <span className="flex-1">{item.label}</span>
              {item.premium && !isPremium && !isAdmin && (
                <span className="text-xs bg-yellow-400 text-gray-900 px-2 py-1 rounded">
                  PRO
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
