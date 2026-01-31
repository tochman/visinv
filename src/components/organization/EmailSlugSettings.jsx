import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { 
  ClipboardDocumentIcon, 
  PencilSquareIcon, 
  CheckIcon,
  InformationCircleIcon,
  EnvelopeIcon
} from '@heroicons/react/24/outline';
import { updateEmailSlug, fetchEmailSlugHistory } from '../../features/organizations/organizationsSlice';
import EmailSlugChangeModal from './EmailSlugChangeModal';

const EMAIL_DOMAIN = 'dortal.resend.app';

/**
 * EmailSlugSettings Component
 * Displays and manages the organization's email slug for receiving supplier invoices
 * US-264a: Organization Email Slug Management
 */
export default function EmailSlugSettings({ organization, onSlugUpdated }) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const [copied, setCopied] = useState(false);
  const [showChangeModal, setShowChangeModal] = useState(false);
  const [updateError, setUpdateError] = useState(null);
  const [updating, setUpdating] = useState(false);
  
  const { emailSlugHistory, slugHistoryLoading } = useSelector(state => state.organizations);

  // Fetch slug history when component mounts or organization changes
  useEffect(() => {
    if (organization?.id) {
      dispatch(fetchEmailSlugHistory(organization.id));
    }
  }, [dispatch, organization?.id]);

  const emailAddress = organization?.email_slug 
    ? `${organization.email_slug}@${EMAIL_DOMAIN}` 
    : null;

  const handleCopy = async () => {
    if (!emailAddress) return;
    
    try {
      await navigator.clipboard.writeText(emailAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleSlugChange = async (newSlug) => {
    setUpdateError(null);
    setUpdating(true);
    
    try {
      const result = await dispatch(updateEmailSlug({ 
        id: organization.id, 
        slug: newSlug 
      })).unwrap();
      
      // Refresh history after successful update
      dispatch(fetchEmailSlugHistory(organization.id));
      
      if (onSlugUpdated) {
        onSlugUpdated(newSlug);
      }
      
      setShowChangeModal(false);
    } catch (error) {
      setUpdateError(error);
    } finally {
      setUpdating(false);
    }
  };

  if (!organization) return null;

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 pt-6 mt-6" data-cy="email-slug-section">
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <EnvelopeIcon className="w-6 h-6" />
        {t('organization.emailSlug.title')}
      </h2>
      
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        {t('organization.emailSlug.description')}
      </p>

      {/* Current Email Address */}
      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-sm p-4 mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {t('organization.emailSlug.currentAddress')}
        </label>
        
        {emailAddress ? (
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <code 
              className="flex-1 bg-white dark:bg-gray-800 px-4 py-2 rounded border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white font-mono text-sm break-all"
              data-cy="email-slug-address"
            >
              {emailAddress}
            </code>
            
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                data-cy="copy-email-slug"
              >
                {copied ? (
                  <>
                    <CheckIcon className="w-4 h-4 text-green-500" />
                    {t('common.copied')}
                  </>
                ) : (
                  <>
                    <ClipboardDocumentIcon className="w-4 h-4" />
                    {t('common.copy')}
                  </>
                )}
              </button>
              
              {/* Only owner can edit */}
              {organization.role === 'owner' && (
                <button
                  type="button"
                  onClick={() => setShowChangeModal(true)}
                  className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  data-cy="edit-email-slug"
                >
                  <PencilSquareIcon className="w-4 h-4" />
                  {t('common.edit')}
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="text-gray-500 dark:text-gray-400 italic">
            {t('organization.emailSlug.notConfigured')}
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-sm border border-blue-200 dark:border-blue-800">
        <InformationCircleIcon className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800 dark:text-blue-300">
          <p>{t('organization.emailSlug.infoText')}</p>
        </div>
      </div>

      {/* Historical Addresses */}
      {emailSlugHistory && emailSlugHistory.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('organization.emailSlug.previousAddresses')}
          </h3>
          <div className="space-y-2" data-cy="email-slug-history">
            {emailSlugHistory.map((history) => (
              <div 
                key={history.id}
                className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400"
              >
                <EnvelopeIcon className="w-4 h-4 flex-shrink-0" />
                <code className="font-mono">
                  {history.slug}@{EMAIL_DOMAIN}
                </code>
                <span className="text-gray-400 dark:text-gray-500">
                  ({t('organization.emailSlug.stillActive')})
                </span>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
            {t('organization.emailSlug.historyNote')}
          </p>
        </div>
      )}

      {/* Change Slug Modal */}
      {showChangeModal && (
        <EmailSlugChangeModal
          organization={organization}
          currentSlug={organization.email_slug}
          onClose={() => {
            setShowChangeModal(false);
            setUpdateError(null);
          }}
          onSave={handleSlugChange}
          saving={updating}
          error={updateError}
        />
      )}
    </div>
  );
}
