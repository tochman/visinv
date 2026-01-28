import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { useOrganization } from '../../contexts/OrganizationContext';
import { ChevronUpDownIcon, PlusIcon, CheckIcon, BuildingOffice2Icon } from '@heroicons/react/24/outline';
import OrganizationSetupWizard from './OrganizationSetupWizard';

export default function OrganizationSwitcher() {
  const { t } = useTranslation();
  const { currentOrganization, organizations, switchOrganization, loading } = useOrganization();
  const { isPremium } = useSelector((state) => state.subscriptions);
  const { isAdmin } = useSelector((state) => state.auth);
  const [isOpen, setIsOpen] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const dropdownRef = useRef(null);

  // Premium users and admins can create multiple organizations
  const canCreateNewOrg = isPremium || isAdmin;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSwitch = async (orgId) => {
    await switchOrganization(orgId);
    setIsOpen(false);
  };

  const handleCreateNew = () => {
    setIsOpen(false);
    setShowWizard(true);
  };

  const handleWizardComplete = () => {
    setShowWizard(false);
  };

  const handleWizardClose = () => {
    setShowWizard(false);
  };

  if (loading) {
    return null;
  }

  // If no current organization but there are organizations, show selector
  // This can happen if org was created but context didn't switch to it
  const hasOrganizations = organizations.length > 0;
  
  // If no organizations at all and can't create, don't show anything
  if (!hasOrganizations && !canCreateNewOrg) {
    return null;
  }

  // Only show switcher if user has multiple orgs OR can create new ones OR needs to select an org
  const showSwitcher = organizations.length > 1 || canCreateNewOrg || !currentOrganization;

  if (!showSwitcher) {
    // Just show the org name without dropdown
    return (
      <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700" data-cy="organization-display">
        <div className="flex items-center gap-2">
          <BuildingOffice2Icon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
            {currentOrganization.name}
          </span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between gap-2 px-3 py-2 text-sm rounded-md bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          data-cy="organization-switcher-button"
        >
          <div className="flex items-center gap-2 min-w-0">
            <BuildingOffice2Icon className="h-5 w-5 text-gray-500 dark:text-gray-400 flex-shrink-0" />
            <span className="text-gray-700 dark:text-gray-300 truncate">
              {currentOrganization?.name || t('organization.selectOrganization')}
            </span>
          </div>
          <ChevronUpDownIcon className="h-4 w-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />
        </button>

        {isOpen && (
          <div className="absolute bottom-full left-4 right-4 mb-2 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 z-50 max-h-64 overflow-y-auto" data-cy="organization-switcher-dropdown">
            <div className="py-1">
              {organizations.map((org) => (
                <button
                  key={org.id}
                  onClick={() => handleSwitch(org.id)}
                  className="w-full flex items-center justify-between px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  data-cy="organization-option"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <BuildingOffice2Icon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <span className="truncate">{org.name}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                      org.role === 'owner' 
                        ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                        : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                    }`}>
                      {t(`organization.roles.${org.role}`)}
                    </span>
                  </div>
                  {currentOrganization && org.id === currentOrganization.id && (
                    <CheckIcon className="h-4 w-4 text-green-500 flex-shrink-0" />
                  )}
                </button>
              ))}

              {canCreateNewOrg && (
                <>
                  <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
                  <button
                    onClick={handleCreateNew}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                    data-cy="create-new-organization-button"
                  >
                    <PlusIcon className="h-4 w-4" />
                    <span>{t('organization.createNew')}</span>
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Organization Setup Wizard Modal */}
      {showWizard && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            {/* Backdrop */}
            <div className="fixed inset-0 transition-opacity" onClick={handleWizardClose}>
              <div className="absolute inset-0 bg-gray-500 dark:bg-gray-900 opacity-75"></div>
            </div>

            {/* Modal Content */}
            <div className="relative inline-block align-bottom bg-white dark:bg-gray-800 rounded-sm text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full z-50">
              <OrganizationSetupWizard 
                onComplete={handleWizardComplete} 
                onClose={handleWizardClose}
                isModal={true}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
