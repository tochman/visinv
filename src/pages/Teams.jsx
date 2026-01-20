import { useTranslation } from 'react-i18next';

export default function Teams() {
  const { t } = useTranslation();

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">{t('nav.teams')}</h1>
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-600">Team management will be displayed here.</p>
      </div>
    </div>
  );
}
