import { useTranslation } from 'react-i18next';

export default function Templates() {
  const { t } = useTranslation();

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">{t('nav.templates')}</h1>
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-600">Template gallery will be displayed here.</p>
      </div>
    </div>
  );
}
