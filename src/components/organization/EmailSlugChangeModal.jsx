import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { XMarkIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { OrganizationEmailSlugHistory } from '../../services/resources/OrganizationEmailSlugHistory';

const EMAIL_DOMAIN = 'dortal.resend.app';

/**
 * EmailSlugChangeModal Component
 * Modal for changing the organization's email slug with validation and warnings
 * US-264a: Organization Email Slug Management
 */
export default function EmailSlugChangeModal({ 
  organization,
  currentSlug, 
  onClose, 
  onSave, 
  saving = false,
  error: externalError = null 
}) {
  const { t } = useTranslation();
  const [newSlug, setNewSlug] = useState(currentSlug || '');
  const [validationError, setValidationError] = useState(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isAvailable, setIsAvailable] = useState(null);
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Validate slug format on change
  useEffect(() => {
    if (newSlug === currentSlug) {
      setValidationError(null);
      setIsAvailable(null);
      return;
    }

    const validation = OrganizationEmailSlugHistory.validateSlugFormat(newSlug);
    if (!validation.valid) {
      setValidationError(t(`organization.emailSlug.errors.${validation.error}`) || validation.error);
      setIsAvailable(null);
      return;
    }

    setValidationError(null);

    // Check availability with debounce
    const timeoutId = setTimeout(async () => {
      setIsChecking(true);
      const { available, error } = await OrganizationEmailSlugHistory.isSlugAvailable(newSlug, organization?.id);
      setIsChecking(false);
      
      if (error) {
        setValidationError(t('organization.emailSlug.errors.checkFailed'));
        setIsAvailable(null);
      } else {
        setIsAvailable(available);
        if (!available) {
          setValidationError(t('organization.emailSlug.errors.notAvailable'));
        }
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [newSlug, currentSlug, organization?.id, t]);

  const handleGenerateSlug = () => {
    if (organization?.name) {
      const generated = OrganizationEmailSlugHistory.generateSlug(organization.name);
      setNewSlug(generated);
    }
  };

  const handleInputChange = (e) => {
    // Force lowercase and replace invalid characters in real-time
    let value = e.target.value.toLowerCase();
    // Replace spaces with underscores
    value = value.replace(/\s/g, '_');
    // Remove invalid characters (keep only a-z, 0-9, underscore)
    value = value.replace(/[^a-z0-9_]/g, '');
    setNewSlug(value);
  };

  const handleProceed = () => {
    if (newSlug === currentSlug) {
      onClose();
      return;
    }
    setShowConfirmation(true);
  };

  const handleConfirm = () => {
    onSave(newSlug);
  };

  const canSave = newSlug && 
    newSlug !== currentSlug && 
    !validationError && 
    isAvailable === true && 
    !isChecking;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" data-cy="email-slug-modal">
      <div className="flex min-h-full items-center justify-center p-4">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black/50 transition-opacity" 
          onClick={onClose}
        />
        
        {/* Modal */}
        <div className="relative bg-white dark:bg-gray-800 rounded-sm shadow-xl w-full max-w-md transform transition-all">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('organization.emailSlug.changeTitle')}
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
              data-cy="close-slug-modal"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4 space-y-4">
            {!showConfirmation ? (
              <>
                {/* Current Address */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('organization.emailSlug.currentAddress')}
                  </label>
                  <code className="block px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded text-sm text-gray-600 dark:text-gray-400 font-mono">
                    {currentSlug}@{EMAIL_DOMAIN}
                  </code>
                </div>

                {/* New Slug Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('organization.emailSlug.newSlug')}
                  </label>
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={newSlug}
                        onChange={handleInputChange}
                        placeholder={t('organization.emailSlug.slugPlaceholder')}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 dark:bg-gray-700 dark:text-white ${
                          validationError 
                            ? 'border-red-300 dark:border-red-600 focus:ring-red-500' 
                            : isAvailable === true
                              ? 'border-green-300 dark:border-green-600 focus:ring-green-500'
                              : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500'
                        }`}
                        data-cy="new-slug-input"
                      />
                      {isChecking && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={handleGenerateSlug}
                      className="px-3 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-colors whitespace-nowrap"
                      data-cy="generate-slug"
                    >
                      {t('organization.emailSlug.generate')}
                    </button>
                  </div>
                  
                  {/* Preview */}
                  {newSlug && !validationError && (
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      {t('organization.emailSlug.preview')}: <code className="font-mono">{newSlug}@{EMAIL_DOMAIN}</code>
                    </p>
                  )}
                  
                  {/* Validation Error */}
                  {validationError && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400" data-cy="slug-validation-error">
                      {validationError}
                    </p>
                  )}
                  
                  {/* Available indicator */}
                  {isAvailable === true && !validationError && newSlug !== currentSlug && (
                    <p className="mt-1 text-sm text-green-600 dark:text-green-400" data-cy="slug-available">
                      {t('organization.emailSlug.available')}
                    </p>
                  )}
                </div>

                {/* Slug rules */}
                <div className="text-xs text-gray-500 dark:text-gray-500 space-y-1">
                  <p>{t('organization.emailSlug.rules.title')}</p>
                  <ul className="list-disc list-inside pl-2 space-y-0.5">
                    <li>{t('organization.emailSlug.rules.lowercase')}</li>
                    <li>{t('organization.emailSlug.rules.length')}</li>
                    <li>{t('organization.emailSlug.rules.characters')}</li>
                  </ul>
                </div>

                {/* External Error */}
                {externalError && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-md border border-red-200 dark:border-red-800">
                    <p className="text-sm text-red-600 dark:text-red-400" data-cy="save-error">
                      {externalError}
                    </p>
                  </div>
                )}
              </>
            ) : (
              /* Confirmation View */
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-sm border border-amber-200 dark:border-amber-800">
                  <ExclamationTriangleIcon className="w-6 h-6 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                  <div className="text-sm text-amber-800 dark:text-amber-300">
                    <p className="font-medium mb-2">{t('organization.emailSlug.confirmTitle')}</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>{t('organization.emailSlug.confirmWarning1')}</li>
                      <li>{t('organization.emailSlug.confirmWarning2')}</li>
                      <li>{t('organization.emailSlug.confirmWarning3')}</li>
                    </ul>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="block text-gray-500 dark:text-gray-400 mb-1">
                      {t('organization.emailSlug.oldAddress')}
                    </span>
                    <code className="block font-mono text-gray-700 dark:text-gray-300">
                      {currentSlug}@{EMAIL_DOMAIN}
                    </code>
                  </div>
                  <div>
                    <span className="block text-gray-500 dark:text-gray-400 mb-1">
                      {t('organization.emailSlug.newAddress')}
                    </span>
                    <code className="block font-mono text-green-600 dark:text-green-400">
                      {newSlug}@{EMAIL_DOMAIN}
                    </code>
                  </div>
                </div>

                {/* External Error in confirmation */}
                {externalError && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-md border border-red-200 dark:border-red-800">
                    <p className="text-sm text-red-600 dark:text-red-400" data-cy="save-error">
                      {externalError}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 p-4 border-t border-gray-200 dark:border-gray-700">
            {!showConfirmation ? (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                  data-cy="cancel-slug-change"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="button"
                  onClick={handleProceed}
                  disabled={!canSave}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  data-cy="proceed-slug-change"
                >
                  {t('common.continue')}
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setShowConfirmation(false)}
                  disabled={saving}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                  data-cy="back-slug-change"
                >
                  {t('common.back')}
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={saving}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  data-cy="confirm-slug-change"
                >
                  {saving ? t('common.saving') : t('organization.emailSlug.confirmButton')}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
