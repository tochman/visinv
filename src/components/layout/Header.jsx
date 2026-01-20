import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { signOut } from '../../features/auth/authSlice';
import { useNavigate } from 'react-router-dom';
import ThemeToggle from '../common/ThemeToggle';

export default function Header() {
  const { t, i18n } = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);

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
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex-1"></div>

        <div className="flex items-center space-x-4">
          <ThemeToggle />
          
          <button
            onClick={toggleLanguage}
            className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-sm"
          >
            {i18n.language === 'en' ? '🇸🇪 Svenska' : '🇬🇧 English'}
          </button>

          <div className="flex items-center space-x-3">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900 dark:text-white">{user?.email}</p>
            </div>
            <button
              onClick={handleSignOut}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-sm"
            >
              {t('auth.signOut')}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
