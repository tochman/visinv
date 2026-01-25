import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import {
  updateCookiePreferences,
  closeCookieSettings,
  acceptAllCookies,
  rejectNonEssentialCookies,
  selectShowSettings,
  selectCookieConsent,
} from '../../features/cookieConsent/cookieConsentSlice';

export default function CookieSettings() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const showSettings = useSelector(selectShowSettings);
  const currentConsent = useSelector(selectCookieConsent);

  const [preferences, setPreferences] = useState({
    analytics: currentConsent.analytics,
    marketing: currentConsent.marketing,
    preferences: currentConsent.preferences,
  });

  if (!showSettings) return null;

  const handleToggle = (category) => {
    setPreferences((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  const handleSave = () => {
    dispatch(updateCookiePreferences(preferences));
  };

  const handleAcceptAll = () => {
    dispatch(acceptAllCookies());
  };

  const handleRejectAll = () => {
    dispatch(rejectNonEssentialCookies());
  };

  const handleClose = () => {
    dispatch(closeCookieSettings());
  };

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
        onClick={handleClose}
        data-cy="cookie-settings-overlay"
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
          data-cy="cookie-settings-modal"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {t('cookieConsent.settings.title')}
              </h2>
              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                data-cy="cookie-settings-close"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              {t('cookieConsent.settings.description')}
            </p>
          </div>

          {/* Content */}
          <div className="px-6 py-4 overflow-y-auto max-h-[calc(90vh-200px)]">
            <div className="space-y-6">
              {/* Essential Cookies */}
              <div className="border-b border-gray-200 dark:border-gray-700 pb-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                      {t('cookieConsent.categories.essential.title')}
                    </h3>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                      {t('cookieConsent.categories.essential.description')}
                    </p>
                  </div>
                  <span className="ml-4 px-3 py-1 text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded">
                    {t('cookieConsent.categories.essential.alwaysActive')}
                  </span>
                </div>
              </div>

              {/* Analytics Cookies */}
              <div className="border-b border-gray-200 dark:border-gray-700 pb-6" data-cy="cookie-category-analytics">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                      {t('cookieConsent.categories.analytics.title')}
                    </h3>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                      {t('cookieConsent.categories.analytics.description')}
                    </p>
                  </div>
                  <button
                    onClick={() => handleToggle('analytics')}
                    className={`ml-4 relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                      preferences.analytics ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                    }`}
                    data-cy="cookie-toggle-analytics"
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        preferences.analytics ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Marketing Cookies */}
              <div className="border-b border-gray-200 dark:border-gray-700 pb-6" data-cy="cookie-category-marketing">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                      {t('cookieConsent.categories.marketing.title')}
                    </h3>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                      {t('cookieConsent.categories.marketing.description')}
                    </p>
                  </div>
                  <button
                    onClick={() => handleToggle('marketing')}
                    className={`ml-4 relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                      preferences.marketing ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                    }`}
                    data-cy="cookie-toggle-marketing"
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        preferences.marketing ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Preference Cookies */}
              <div className="pb-2" data-cy="cookie-category-preferences">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                      {t('cookieConsent.categories.preferences.title')}
                    </h3>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                      {t('cookieConsent.categories.preferences.description')}
                    </p>
                  </div>
                  <button
                    onClick={() => handleToggle('preferences')}
                    className={`ml-4 relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                      preferences.preferences ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                    }`}
                    data-cy="cookie-toggle-preferences"
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        preferences.preferences ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleRejectAll}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors"
              data-cy="cookie-settings-reject-all"
            >
              {t('cookieConsent.settings.rejectAll')}
            </button>
            <button
              onClick={handleAcceptAll}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors"
              data-cy="cookie-settings-accept-all"
            >
              {t('cookieConsent.settings.acceptAll')}
            </button>
            <button
              onClick={handleSave}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors shadow-sm"
              data-cy="cookie-settings-save"
            >
              {t('cookieConsent.settings.savePreferences')}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
