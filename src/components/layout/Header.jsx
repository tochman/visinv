import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { signOut } from '../../features/auth/authSlice';
import { useNavigate, Link } from 'react-router-dom';
import { Bars3Icon } from '@heroicons/react/24/outline';
import ThemeToggle from '../common/ThemeToggle';

export default function Header({ onMenuClick, sidebarOpen }) {
  const { t, i18n } = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, profile } = useSelector((state) => state.auth);

  const handleSignOut = async () => {
    await dispatch(signOut());
    navigate('/auth/signin');
  };

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'sv' : 'en';
    i18n.changeLanguage(newLang);
    localStorage.setItem('language', newLang);
  };

  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm dark:shadow-gray-900/20">
      <div className="flex items-center justify-between px-4 lg:px-6 py-4">
        {/* Mobile menu button */}
        <div className="flex items-center">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 -ml-2 mr-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-sm"
            data-cy="mobile-menu-button"
            aria-label="Open menu"
          >
            <Bars3Icon className="h-6 w-6" />
          </button>
          {/* Mobile logo */}
          <img 
            src="/svethna_logo.svg" 
            alt="Svethna" 
            className="h-8 w-auto lg:hidden dark:invert-0 invert" 
          />
        </div>

        <div className="flex items-center space-x-2 lg:space-x-4">
          <ThemeToggle />
          
          <button
            onClick={toggleLanguage}
            className="hidden sm:block px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-sm"
          >
            {i18n.language === 'en' ? '🇸🇪 Svenska' : '🇬🇧 English'}
          </button>
          {/* Compact language toggle on mobile */}
          <button
            onClick={toggleLanguage}
            className="sm:hidden p-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-sm"
            aria-label="Toggle language"
          >
            {i18n.language === 'en' ? '🇸🇪' : '🇬🇧'}
          </button>

          <div className="flex items-center space-x-2 lg:space-x-3">
            <Link 
              to="/settings"
              className="flex items-center space-x-2 lg:space-x-3 hover:opacity-80 transition-opacity"
            >
              {profile?.avatar_url ? (
                <img 
                  src={profile.avatar_url} 
                  alt={profile.full_name || user?.email}
                  className="w-8 h-8 rounded-full object-cover ring-2 ring-gray-200 dark:ring-gray-700"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center ring-2 ring-gray-200 dark:ring-gray-700">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {(profile?.full_name || user?.email || '?')[0].toUpperCase()}
                  </span>
                </div>
              )}
              {/* Hide name on mobile */}
              <p className="hidden md:block text-sm font-medium text-gray-900 dark:text-white">
                {profile?.full_name || user?.email}
              </p>
            </Link>
            <button
              onClick={handleSignOut}
              className="px-2 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-sm"
            >
              {t('auth.signOut')}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
