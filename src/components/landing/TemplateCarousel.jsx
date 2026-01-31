import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { fetchSystemTemplates } from '../../services/publicTemplateService';
import TemplatePreview, { TemplatePreviewModal } from '../templates/TemplatePreview';

export default function TemplateCarousel() {
  const { t } = useTranslation();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [previewTemplate, setPreviewTemplate] = useState(null);

  // Fetch system templates on mount
  useEffect(() => {
    async function loadTemplates() {
      setLoading(true);
      const systemTemplates = await fetchSystemTemplates();
      setTemplates(systemTemplates);
      setLoading(false);
    }
    loadTemplates();
  }, []);

  const nextTemplate = () => {
    setCurrentIndex((prev) => (prev + 1) % templates.length);
  };

  const prevTemplate = () => {
    setCurrentIndex((prev) => (prev - 1 + templates.length) % templates.length);
  };

  const goToTemplate = (index) => {
    setCurrentIndex(index);
  };

  // Show loading state
  if (loading) {
    return (
      <section className="py-20 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-64 mx-auto mb-4"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-96 mx-auto"></div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // Don't render if no templates
  if (templates.length === 0) {
    return null;
  }

  return (
    <section className="py-24 bg-gradient-to-b from-white to-gray-50 dark:from-gray-900 dark:to-gray-800 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-6">
            {t('landing.templates.title')}
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            {t('landing.templates.subtitle')}
          </p>
          <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
            {templates.length} {t('landing.templates.available', { defaultValue: 'professional templates available' })}
          </div>
        </div>

        {/* Carousel */}
        <div className="relative">
          {/* Template Cards Stack */}
          <div className="relative h-[480px] sm:h-[520px] flex items-center justify-center px-4">
            {templates.map((template, index) => {
              const offset = index - currentIndex;
              const isActive = offset === 0;
              const isPrev = offset === -1;
              const isNext = offset === 1;
              const isVisible = Math.abs(offset) <= 1;

              if (!isVisible && Math.abs(offset) > 1) return null;

              return (
                <div
                  key={template.id}
                  className={`absolute w-[320px] sm:w-[380px] transition-all duration-700 ease-out ${
                    isActive
                      ? 'z-30 scale-100 opacity-100'
                      : isPrev || isNext
                      ? 'z-20 scale-90 opacity-50 blur-sm'
                      : 'z-10 scale-75 opacity-0'
                  }`}
                  style={{
                    transform: `
                      translateX(${offset * 90}%) 
                      scale(${isActive ? 1 : 0.85}) 
                      rotateY(${offset * 20}deg)
                    `,
                  }}
                >
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-700">
                    {/* Template Preview - Full Width */}
                    <div 
                      className="relative overflow-hidden cursor-pointer group"
                      style={{ height: '300px' }}
                      onClick={() => setPreviewTemplate(template)}
                    >
                      <div 
                        className="absolute top-0 left-0 origin-top-left"
                        style={{ 
                          transform: 'scale(0.479)',
                          width: '794px'
                        }}
                      >
                        <TemplatePreview 
                          template={template}
                          scale={1}
                        />
                      </div>
                      {/* Hover overlay */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center">
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-white dark:bg-gray-800 px-4 py-2 rounded-lg shadow-lg">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {t('landing.templates.clickToPreview', { defaultValue: 'Click to preview' })}
                          </p>
                        </div>
                      </div>
                    </div>
                    {/* Template Info */}
                    <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700">
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                        {template.name}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                        {template.description || t('landing.templates.subtitle')}
                      </p>
                      <div className="flex items-center gap-2 mt-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200">
                          {template.name.includes('English') || template.name.includes('Studio') || template.name.includes('Elegant Floral') ? 'English' : 'Svenska'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Navigation Buttons */}
          <button
            onClick={prevTemplate}
            className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-40 p-3 sm:p-4 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-full shadow-xl hover:bg-white dark:hover:bg-gray-700 transition-all hover:scale-110 border border-gray-200 dark:border-gray-600"
            aria-label="Previous template"
          >
            <ChevronLeftIcon className="h-5 w-5 sm:h-6 sm:w-6 text-gray-900 dark:text-white" />
          </button>
          <button
            onClick={nextTemplate}
            className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-40 p-3 sm:p-4 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-full shadow-xl hover:bg-white dark:hover:bg-gray-700 transition-all hover:scale-110 border border-gray-200 dark:border-gray-600"
            aria-label="Next template"
          >
            <ChevronRightIcon className="h-5 w-5 sm:h-6 sm:w-6 text-gray-900 dark:text-white" />
          </button>

          {/* Dots Indicator */}
          <div className="flex justify-center gap-3 mt-12">
            {templates.map((_, index) => (
              <button
                key={index}
                onClick={() => goToTemplate(index)}
                className={`h-2.5 rounded-full transition-all duration-300 ${
                  index === currentIndex
                    ? 'w-10 bg-blue-600 dark:bg-blue-500'
                    : 'w-2.5 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500'
                }`}
                aria-label={`Go to template ${index + 1}`}
              />
            ))}
          </div>

          {/* Template Counter */}
          <div className="text-center mt-6">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {currentIndex + 1} / {templates.length}
            </p>
          </div>
        </div>
      </div>
      
      {/* Full Template Preview Modal */}
      {previewTemplate && (
        <TemplatePreviewModal
          template={previewTemplate}
          isOpen={!!previewTemplate}
          onClose={() => setPreviewTemplate(null)}
        />
      )}
    </section>
  );
}
