import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { appConfig } from '../../config/constants';

export default function UpgradeModal({ isOpen, onClose }) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleUpgrade = () => {
    onClose();
    navigate('/subscription');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" data-cy="upgrade-modal">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black/50 transition-opacity" 
          onClick={onClose}
          data-cy="upgrade-modal-backdrop"
        />

        {/* Modal */}
        <div className="relative bg-white dark:bg-gray-800 rounded-sm shadow-xl w-full max-w-md p-6">
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white" data-cy="upgrade-modal-title">
              {t('upgrade.limitReached')}
            </h2>
          </div>

          <div className="mb-6">
            <p className="text-gray-600 dark:text-gray-300 mb-4" data-cy="upgrade-modal-message">
              {t('upgrade.freeInvoiceLimit', { limit: appConfig.freeInvoiceLimit })}
            </p>
            <p className="text-gray-600 dark:text-gray-300">
              {t('upgrade.upgradePrompt')}
            </p>
          </div>

          <div className="flex gap-3 justify-end">
            <button
              onClick={onClose}
              data-cy="upgrade-modal-cancel"
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-sm hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={handleUpgrade}
              data-cy="upgrade-modal-confirm"
              className="px-4 py-2 bg-blue-600 text-white rounded-sm hover:bg-blue-700 transition-colors"
            >
              {t('upgrade.viewPlans')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
