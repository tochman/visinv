import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { signIn, signInWithGoogle } from '../../features/auth/authSlice';
import { isSupabaseConfigured } from '../../services/supabase';

export default function SignIn() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error } = useSelector((state) => state.auth);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await dispatch(signIn(formData));
    if (!result.error) {
      navigate('/');
    }
  };

  const handleGoogleSignIn = async () => {
    await dispatch(signInWithGoogle());
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-sm shadow-xl p-8">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">{t('auth.signIn')}</h2>

      {!isSupabaseConfigured && (
        <div className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-sm">
          <p className="text-yellow-800 dark:text-yellow-300 font-medium">⚠️ Supabase not configured</p>
          <p className="text-yellow-700 dark:text-yellow-400 text-sm mt-1">
            To enable authentication, create a <code className="bg-yellow-100 dark:bg-yellow-900/50 px-1 rounded">.env</code> file with:
          </p>
          <pre className="mt-2 text-xs bg-yellow-100 dark:bg-yellow-900/50 p-2 rounded overflow-x-auto text-yellow-900 dark:text-yellow-200">
{`VITE_SUPABASE_URL=your_project_url
VITE_SUPABASE_ANON_KEY=your_anon_key`}
          </pre>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-sm">
          <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('auth.email')}
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('auth.password')}
          </label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-blue-600 text-white rounded-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? t('common.loading') : t('auth.signIn')}
        </button>
      </form>

      <div className="mt-6">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">Or</span>
          </div>
        </div>

        <button
          onClick={handleGoogleSignIn}
          className="mt-4 w-full py-3 border border-gray-300 dark:border-gray-600 rounded-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-center space-x-2 text-gray-900 dark:text-white"
        >
          <span>🔐</span>
          <span>{t('auth.signInWithGoogle')}</span>
        </button>
      </div>

      <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
        {t('auth.dontHaveAccount')}{' '}
        <Link to="/auth/signup" className="text-blue-600 dark:text-blue-400 hover:underline font-medium">
          {t('auth.signUp')}
        </Link>
      </p>
    </div>
  );
}
