import { useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { openCookieSettings } from '../features/cookieConsent/cookieConsentSlice';

export default function CookiePolicy() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleOpenSettings = () => {
    dispatch(openCookieSettings());
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12" data-cy="cookie-policy-page">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Navigation */}
        <div className="mb-6">
          <button
            onClick={handleGoBack}
            className="inline-flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            data-cy="cookie-policy-back"
          >
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            {t('common.back')}
          </button>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8">
          {/* Header */}
          <div className="mb-8" data-cy="cookie-policy-header">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {t('cookieConsent.policy.title')}
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('cookieConsent.policy.lastUpdated')}: {new Date().toLocaleDateString()}
            </p>
          </div>

          {/* Content */}
          <div className="prose prose-blue dark:prose-invert max-w-none space-y-6">
            {/* What are cookies */}
            <section data-cy="policy-section-what-are-cookies">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-3">
                {t('cookieConsent.policy.whatAreCookies')}
              </h2>
              <p className="text-gray-700 dark:text-gray-300">
                {t('cookieConsent.policy.whatAreCookiesText')}
              </p>
            </section>

            {/* How we use cookies */}
            <section data-cy="policy-section-how-we-use">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-3">
                {t('cookieConsent.policy.howWeUseCookies')}
              </h2>
              <p className="text-gray-700 dark:text-gray-300">
                {t('cookieConsent.policy.howWeUseCookiesText')}
              </p>
            </section>

            {/* Types of cookies */}
            <section data-cy="policy-section-types">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                {t('cookieConsent.policy.cookieTypes')}
              </h2>
              
              <div className="space-y-4">
                {/* Essential */}
                <div className="border-l-4 border-blue-500 pl-4 py-2" data-cy="policy-category-essential">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
                    {t('cookieConsent.categories.essential.title')}
                  </h3>
                  <p className="text-gray-700 dark:text-gray-300">
                    {t('cookieConsent.categories.essential.description')}
                  </p>
                </div>

                {/* Analytics */}
                <div className="border-l-4 border-green-500 pl-4 py-2" data-cy="policy-category-analytics">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
                    {t('cookieConsent.categories.analytics.title')}
                  </h3>
                  <p className="text-gray-700 dark:text-gray-300">
                    {t('cookieConsent.categories.analytics.description')}
                  </p>
                </div>

                {/* Marketing */}
                <div className="border-l-4 border-purple-500 pl-4 py-2" data-cy="policy-category-marketing">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
                    {t('cookieConsent.categories.marketing.title')}
                  </h3>
                  <p className="text-gray-700 dark:text-gray-300">
                    {t('cookieConsent.categories.marketing.description')}
                  </p>
                </div>

                {/* Preferences */}
                <div className="border-l-4 border-orange-500 pl-4 py-2" data-cy="policy-category-preferences">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
                    {t('cookieConsent.categories.preferences.title')}
                  </h3>
                  <p className="text-gray-700 dark:text-gray-300">
                    {t('cookieConsent.categories.preferences.description')}
                  </p>
                </div>
              </div>
            </section>

            {/* Managing cookies */}
            <section data-cy="policy-section-manage">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-3">
                {t('cookieConsent.policy.manageCookies')}
              </h2>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                {t('cookieConsent.policy.manageCookiesText')}
              </p>
              <button
                onClick={handleOpenSettings}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors shadow-sm"
                data-cy="open-cookie-settings-btn"
              >
                {t('cookieConsent.policy.goToSettings')}
              </button>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
