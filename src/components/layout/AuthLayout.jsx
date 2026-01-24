import { Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ThemeToggle from '../common/ThemeToggle';

export default function AuthLayout() {
  const { t } = useTranslation();
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src="/svethna_logo.svg" alt="VisInv" className="h-16 w-auto mx-auto mb-4 dark:invert-0 invert" />
          <p className="text-gray-600 dark:text-gray-400">{t('app.tagline')}</p>
        </div>
        <Outlet />
      </div>
    </div>
  );
}
