import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { 
  setSelectedScore, 
  setFeedback, 
  submitNpsResponse, 
  dismissNpsSurvey, 
  closeNpsModal 
} from '../../features/nps/npsSlice';

export default function NpsModal() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { showModal, selectedScore, feedback, loading, currentResponseId } = useSelector(
    (state) => state.nps
  );

  if (!showModal) return null;

  const handleScoreClick = (score) => {
    dispatch(setSelectedScore(score));
  };

  const handleFeedbackChange = (e) => {
    dispatch(setFeedback(e.target.value));
  };

  const handleSubmit = () => {
    if (selectedScore !== null && currentResponseId) {
      dispatch(submitNpsResponse({ 
        responseId: currentResponseId, 
        score: selectedScore, 
        feedback 
      }));
    }
  };

  const handleDismiss = () => {
    if (currentResponseId) {
      dispatch(dismissNpsSurvey(currentResponseId));
    } else {
      dispatch(closeNpsModal());
    }
  };

  // Helper function to get score button color
  const getScoreButtonClass = (score) => {
    const isSelected = selectedScore === score;
    let colorClass = '';
    
    // Detractors: 0-6 (red)
    if (score <= 6) {
      colorClass = isSelected
        ? 'bg-red-600 text-white border-red-600'
        : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-red-400 dark:hover:border-red-500';
    }
    // Passives: 7-8 (yellow)
    else if (score <= 8) {
      colorClass = isSelected
        ? 'bg-yellow-500 text-white border-yellow-500'
        : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-yellow-400 dark:hover:border-yellow-500';
    }
    // Promoters: 9-10 (green)
    else {
      colorClass = isSelected
        ? 'bg-green-600 text-white border-green-600'
        : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-green-400 dark:hover:border-green-500';
    }

    return `w-12 h-12 sm:w-14 sm:h-14 border-2 rounded-sm font-semibold transition-all ${colorClass} ${
      isSelected ? 'scale-110 shadow-lg' : 'hover:scale-105'
    }`;
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={handleDismiss}
        data-cy="nps-modal-backdrop"
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="bg-white dark:bg-gray-800 rounded-sm shadow-2xl max-w-2xl w-full overflow-hidden"
          data-cy="nps-modal"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {t('nps.title')}
              </h2>
              <button
                onClick={handleDismiss}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                data-cy="nps-modal-close"
                aria-label={t('common.close')}
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-6">
            {/* NPS Question */}
            <p className="text-lg text-gray-900 dark:text-white font-medium mb-6">
              {t('nps.question')}
            </p>

            {/* Score Buttons (0-10) */}
            <div className="mb-6">
              <div className="flex flex-wrap justify-center gap-2 mb-3">
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
                  <button
                    key={score}
                    onClick={() => handleScoreClick(score)}
                    className={getScoreButtonClass(score)}
                    data-cy={`nps-score-${score}`}
                    type="button"
                  >
                    {score}
                  </button>
                ))}
              </div>

              {/* Labels */}
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 px-1">
                <span>{t('nps.notLikely')}</span>
                <span>{t('nps.veryLikely')}</span>
              </div>
            </div>

            {/* Feedback Text Area - Only show if score selected */}
            {selectedScore !== null && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('nps.feedbackLabel')}
                </label>
                <textarea
                  value={feedback}
                  onChange={handleFeedbackChange}
                  placeholder={t('nps.feedbackPlaceholder')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows="4"
                  data-cy="nps-feedback-input"
                />
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
            <button
              onClick={handleDismiss}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-sm hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
              data-cy="nps-dismiss-button"
              disabled={loading}
            >
              {t('nps.maybeLater')}
            </button>
            <button
              onClick={handleSubmit}
              disabled={selectedScore === null || loading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-sm hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              data-cy="nps-submit-button"
            >
              {loading ? t('common.submitting') : t('nps.submit')}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
