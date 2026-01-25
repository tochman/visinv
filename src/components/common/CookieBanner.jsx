import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  acceptAllCookies,
  rejectNonEssentialCookies,
  openCookieSettings,
  selectShowBanner,
} from '../../features/cookieConsent/cookieConsentSlice';

export default function CookieBanner() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const showBanner = useSelector(selectShowBanner);

  // Prevent body scroll when banner is shown
  useEffect(() => {
    if (showBanner) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showBanner]);

  if (!showBanner) return null;

  const handleAcceptAll = () => {
    dispatch(acceptAllCookies());
  };

  const handleRejectNonEssential = () => {
    dispatch(rejectNonEssentialCookies());
  };

  const handleCustomize = () => {
    dispatch(openCookieSettings());
  };

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
        data-cy="cookie-banner-overlay"
      />

      {/* Banner */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 transform transition-transform duration-300"
        data-cy="cookie-banner"
      >
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="rounded-lg bg-white dark:bg-gray-800 shadow-2xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              {/* Content */}
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {t('cookieConsent.banner.title')}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                  {t('cookieConsent.banner.description')}
                </p>
                <button
                  onClick={() => navigate('/cookie-policy')}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline bg-transparent border-none cursor-pointer p-0"
                  data-cy="cookie-learn-more"
                >
                  {t('cookieConsent.banner.learnMore')} →
                </button>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3 lg:ml-6">
                <button
                  onClick={handleRejectNonEssential}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors"
                  data-cy="cookie-reject-btn"
                >
                  {t('cookieConsent.banner.rejectNonEssential')}
                </button>
                <button
                  onClick={handleCustomize}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md transition-colors"
                  data-cy="cookie-customize-btn"
                >
                  {t('cookieConsent.banner.customize')}
                </button>
                <button
                  onClick={handleAcceptAll}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors shadow-sm"
                  data-cy="cookie-accept-btn"
                >
                  {t('cookieConsent.banner.acceptAll')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
