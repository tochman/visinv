import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { signOut } from '../../features/auth/authSlice';
import { useNavigate } from 'react-router-dom';

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
    <header className="bg-white shadow-sm">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex-1"></div>

        <div className="flex items-center space-x-4">
          <button
            onClick={toggleLanguage}
            className="px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            {i18n.language === 'en' ? '🇸🇪 Svenska' : '🇬🇧 English'}
          </button>

          <div className="flex items-center space-x-3">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">{user?.email}</p>
            </div>
            <button
              onClick={handleSignOut}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg"
            >
              {t('auth.signOut')}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
