import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { XMarkIcon } from '@heroicons/react/24/outline';

export default function NpsDialog({ isOpen, onClose, onSubmit }) {
  const { t } = useTranslation();
  const [selectedScore, setSelectedScore] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleScoreSelect = async (score) => {
    setSelectedScore(score);
    setIsSubmitting(true);
    
    try {
      await onSubmit(score);
      // Small delay to show selection before closing
      setTimeout(() => {
        onClose();
        setSelectedScore(null);
        setIsSubmitting(false);
      }, 500);
    } catch (error) {
      console.error('Failed to submit NPS:', error);
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end p-4 pointer-events-none">
      <div className="bg-white dark:bg-gray-800 rounded-sm shadow-2xl dark:shadow-gray-900/40 w-full max-w-md pointer-events-auto animate-slide-up">
        {/* Header with logo and close button */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2">
            {/* Logo circles - brand colors */}
            <div className="flex items-center -space-x-1">
              <div className="w-4 h-4 rounded-full bg-pink-200 dark:bg-pink-400"></div>
              <div className="w-4 h-4 rounded-full bg-purple-300 dark:bg-purple-400"></div>
              <div className="w-4 h-4 rounded-full bg-purple-400 dark:bg-purple-500"></div>
            </div>
            <div className="w-4 h-4 rounded-full bg-purple-300 dark:bg-purple-400 ml-1"></div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
              aria-label={t('common.cancel')}
            >
              <span className="text-xl">—</span>
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
              aria-label={t('common.cancel')}
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-gradient-to-r from-yellow-400 via-orange-400 to-orange-500 dark:from-yellow-500 dark:via-orange-500 dark:to-orange-600"></div>

        {/* Content */}
        <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            {t('nps.question')}
          </h3>

          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            {t('nps.selectOption')}
          </p>

          {/* Score buttons */}
          <div className="grid grid-cols-11 gap-1 mb-4">
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
              <button
                key={score}
                onClick={() => handleScoreSelect(score)}
                disabled={isSubmitting}
                className={`
                  aspect-square flex items-center justify-center text-sm font-medium rounded transition-all
                  ${selectedScore === score
                    ? 'bg-blue-600 text-white ring-2 ring-blue-600 ring-offset-2 dark:ring-offset-gray-800'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }
                  ${isSubmitting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
              >
                {score}
              </button>
            ))}
          </div>

          {/* Labels */}
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>{t('nps.notLikely')}</span>
            <span>{t('nps.veryLikely')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
