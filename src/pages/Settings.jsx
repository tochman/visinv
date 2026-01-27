import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useOrganization } from '../contexts/OrganizationContext';
import { OrganizationSettings, OrganizationMembers } from '../components/organization';
import { openCookieSettings } from '../features/cookieConsent/cookieConsentSlice';

const TABS = {
  SETTINGS: 'settings',
  MEMBERS: 'members',
  PRIVACY: 'privacy',
};

export default function Settings() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { currentOrganization, loading } = useOrganization();
  const [activeTab, setActiveTab] = useState(TABS.SETTINGS);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-600 dark:text-gray-400">{t('common.loading')}</div>
      </div>
    );
  }

  if (!currentOrganization) {
    return (
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">{t('nav.settings')}</h1>
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-sm p-6">
          <p className="text-yellow-800 dark:text-yellow-200">{t('organization.noOrganization')}</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6 animate-fade-in-up">{t('nav.settings')}</h1>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-6 animate-fade-in-up animate-delay-100">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab(TABS.SETTINGS)}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === TABS.SETTINGS
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
            data-cy="tab-settings"
          >
            {t('organization.settings')}
          </button>
          <button
            onClick={() => setActiveTab(TABS.MEMBERS)}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === TABS.MEMBERS
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
            data-cy="tab-members"
          >
            {t('organization.members')}
          </button>
          <button
            onClick={() => setActiveTab(TABS.PRIVACY)}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === TABS.PRIVACY
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
            data-cy="tab-privacy"
          >
            Privacy
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="animate-fade-in-up animate-delay-200">
        {activeTab === TABS.SETTINGS && <OrganizationSettings />}
        {activeTab === TABS.MEMBERS && <OrganizationMembers />}
        {activeTab === TABS.PRIVACY && (
          <div className="bg-white dark:bg-gray-800 rounded-sm shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Privacy Settings</h2>
            <div className="space-y-4">
              <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Cookie Preferences</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                  Manage how we use cookies and similar technologies to improve your experience.
                </p>
                <button
                  onClick={() => dispatch(openCookieSettings())}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors"
                  data-cy="open-cookie-settings"
                >
                  Manage Cookie Settings
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
