import { useTranslation } from 'react-i18next';
import { ExclamationTriangleIcon, XMarkIcon } from '@heroicons/react/24/outline';

/**
 * ConfirmDialog - A reusable confirmation dialog component
 * Replaces window.confirm with a proper modal dialog
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the dialog is visible
 * @param {Function} props.onClose - Called when dialog is closed (cancel)
 * @param {Function} props.onConfirm - Called when user confirms the action
 * @param {string} props.title - Dialog title
 * @param {string} props.message - Confirmation message
 * @param {string} props.confirmText - Text for confirm button (default: "Confirm")
 * @param {string} props.cancelText - Text for cancel button (default: "Cancel")
 * @param {string} props.variant - 'danger' | 'warning' | 'info' (default: 'danger')
 * @param {boolean} props.loading - Whether confirm action is in progress
 */
export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText,
  cancelText,
  variant = 'danger',
  loading = false,
}) {
  const { t } = useTranslation();

  if (!isOpen) return null;

  const variantStyles = {
    danger: {
      icon: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
      button: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
    },
    warning: {
      icon: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400',
      button: 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500',
    },
    info: {
      icon: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
      button: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
    },
  };

  const styles = variantStyles[variant] || variantStyles.danger;

  const handleConfirm = () => {
    if (!loading) {
      onConfirm();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape' && !loading) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      aria-labelledby="confirm-dialog-title"
      role="dialog"
      aria-modal="true"
      onKeyDown={handleKeyDown}
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 dark:bg-black/70 transition-opacity"
        onClick={!loading ? onClose : undefined}
        data-cy="confirm-dialog-backdrop"
      />

      {/* Dialog */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className="relative transform overflow-hidden rounded-sm bg-white dark:bg-gray-800 shadow-xl transition-all w-full max-w-md"
          data-cy="confirm-dialog"
        >
          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400 disabled:opacity-50"
            data-cy="confirm-dialog-close"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>

          <div className="p-6">
            {/* Icon and content */}
            <div className="flex items-start gap-4">
              <div className={`flex-shrink-0 rounded-full p-2 ${styles.icon}`}>
                <ExclamationTriangleIcon className="h-6 w-6" />
              </div>
              <div className="flex-1 pt-0.5">
                <h3
                  id="confirm-dialog-title"
                  className="text-lg font-semibold text-gray-900 dark:text-white"
                  data-cy="confirm-dialog-title"
                >
                  {title}
                </h3>
                <p
                  className="mt-2 text-sm text-gray-600 dark:text-gray-400"
                  data-cy="confirm-dialog-message"
                >
                  {message}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-sm hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50"
                data-cy="confirm-dialog-cancel"
              >
                {cancelText || t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={loading}
                className={`px-4 py-2 text-sm font-medium text-white rounded-sm focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 ${styles.button}`}
                data-cy="confirm-dialog-confirm"
              >
                {loading ? t('common.loading') : (confirmText || t('common.confirm'))}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
