import { useTranslation } from 'react-i18next';

export default function Templates() {
  const { t } = useTranslation();

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">{t('nav.templates')}</h1>
      <div className="bg-white dark:bg-gray-800 rounded-sm shadow dark:shadow-gray-900/20 p-6">
        <p className="text-gray-600 dark:text-gray-400">Template gallery will be displayed here.</p>
      </div>
    </div>
  );
}
