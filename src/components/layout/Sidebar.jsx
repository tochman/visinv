import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import {
  HomeIcon,
  DocumentTextIcon,
  UsersIcon,
  CubeIcon,
  SwatchIcon,
  UserGroupIcon,
  Cog6ToothIcon,
  WrenchScrewdriverIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';

export default function Sidebar() {
  const { t } = useTranslation();
  const location = useLocation();
  const { isAdmin } = useSelector((state) => state.auth);
  const { isPremium } = useSelector((state) => state.subscriptions);

  const navItems = [
    { path: '/', label: t('nav.dashboard'), icon: HomeIcon },
    { path: '/invoices', label: t('nav.invoices'), icon: DocumentTextIcon },
    { path: '/clients', label: t('nav.clients'), icon: UsersIcon },
    { path: '/products', label: t('nav.products'), icon: CubeIcon },
    { path: '/templates', label: t('nav.templates'), icon: SwatchIcon, premium: true },
    { path: '/teams', label: t('nav.teams'), icon: UserGroupIcon, premium: true },
    { path: '/settings', label: t('nav.settings'), icon: Cog6ToothIcon },
  ];

  if (isAdmin) {
    navItems.push({ path: '/admin', label: t('nav.admin'), icon: ShieldCheckIcon });
  }

  const isActive = (path) => location.pathname === path;

  // Admins have access to all premium features
  const hasPremiumAccess = isPremium || isAdmin;

  return (
    <div className="w-64 bg-white dark:bg-gray-800 shadow-lg dark:shadow-gray-900/20">
      <div className="p-6">
        <img src="/visinv_logo.svg" alt="VisInv" className="h-10 w-auto dark:invert-0 invert" />
        {isAdmin && (
          <div className="mt-4 p-3 bg-purple-50 dark:bg-purple-900/30 rounded-sm text-sm flex items-center gap-2">
            <ShieldCheckIcon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            <div>
              <p className="text-purple-900 dark:text-purple-300 font-medium">Admin</p>
              <span className="text-purple-600 dark:text-purple-400 text-xs">Full access</span>
            </div>
          </div>
        )}
        {!hasPremiumAccess && (
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-sm text-sm">
            <p className="text-blue-900 dark:text-blue-300 font-medium">Free Plan</p>
            <Link to="/settings" className="text-blue-600 dark:text-blue-400 hover:underline text-xs">
              Upgrade to Premium
            </Link>
          </div>
        )}
      </div>

      <nav className="px-4 space-y-1">
        {navItems.map((item) => {
          const disabled = item.premium && !hasPremiumAccess;
          const Icon = item.icon;
          
          return (
            <Link
              key={item.path}
              to={disabled ? '#' : item.path}
              className={`flex items-center px-4 py-3 rounded-sm transition-colors ${
                isActive(item.path)
                  ? 'bg-blue-600 text-white'
                  : disabled
                  ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
              onClick={(e) => disabled && e.preventDefault()}
            >
              <Icon className="h-5 w-5 mr-3" />
              <span className="flex-1">{item.label}</span>
              {item.premium && !hasPremiumAccess && (
                <span className="text-xs bg-yellow-400 dark:bg-yellow-500 text-gray-900 px-2 py-1 rounded">
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
