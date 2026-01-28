import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { createFiscalYear } from '../../features/fiscalYears/fiscalYearsSlice';

export default function FiscalYearModal({ organizationId, onClose }) {
  const { t } = useTranslation();
  const dispatch = useDispatch();

  // Default to calendar year
  const currentYear = new Date().getFullYear();
  const [formData, setFormData] = useState({
    name: currentYear.toString(),
    start_date: `${currentYear}-01-01`,
    end_date: `${currentYear}-12-31`,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await dispatch(
        createFiscalYear({
          organization_id: organizationId,
          ...formData,
        })
      ).unwrap();
      onClose(true);
    } catch (err) {
      setError(err);
    } finally {
      setSubmitting(false);
    }
  };

  // Quick presets for common fiscal year types
  const applyPreset = (type) => {
    const year = parseInt(formData.name) || currentYear;
    if (type === 'calendar') {
      setFormData({
        name: year.toString(),
        start_date: `${year}-01-01`,
        end_date: `${year}-12-31`,
      });
    } else if (type === 'broken') {
      // Swedish "brutet räkenskapsår" - May to April
      setFormData({
        name: `${year}/${year + 1}`,
        start_date: `${year}-05-01`,
        end_date: `${year + 1}-04-30`,
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div
        data-cy="fiscal-year-modal"
        className="bg-white dark:bg-gray-800 rounded-sm shadow-xl w-full max-w-md mx-4"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {t('journalEntries.createFiscalYear')}
          </h2>
          <button
            onClick={() => onClose(false)}
            data-cy="close-fiscal-year-modal"
            className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Error */}
          {error && (
            <div
              data-cy="fiscal-year-error"
              className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-sm"
            >
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Presets */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => applyPreset('calendar')}
              data-cy="preset-calendar"
              className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
            >
              {t('journalEntries.calendarYear')}
            </button>
            <button
              type="button"
              onClick={() => applyPreset('broken')}
              data-cy="preset-broken"
              className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
            >
              {t('journalEntries.brokenYear')}
            </button>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('journalEntries.fiscalYearName')}
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              data-cy="fiscal-year-name"
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="2024"
            />
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('journalEntries.startDate')}
              </label>
              <input
                type="date"
                name="start_date"
                value={formData.start_date}
                onChange={handleChange}
                data-cy="fiscal-year-start"
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('journalEntries.endDate')}
              </label>
              <input
                type="date"
                name="end_date"
                value={formData.end_date}
                onChange={handleChange}
                data-cy="fiscal-year-end"
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={() => onClose(false)}
              data-cy="cancel-fiscal-year"
              className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-sm hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={submitting}
              data-cy="save-fiscal-year"
              className="px-4 py-2 bg-blue-600 text-white rounded-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? t('common.saving') : t('common.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
