import React from 'react';

/**
 * PreviewPanel - Displays rendered template preview
 */
export default function PreviewPanel({
  preview,
  isCompleteHtmlDocument,
  templateContent,
  onSwitchToCode
}) {
  return (
    <div className="flex-1 flex flex-col bg-gray-100 dark:bg-gray-700">
      <div className="bg-gray-200 dark:bg-gray-800 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Förhandsvisning</span>
          {isCompleteHtmlDocument && (
            <span className="text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded">
              Komplett HTML-mall
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {isCompleteHtmlDocument && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Redigera med <button onClick={onSwitchToCode} className="text-blue-600 dark:text-blue-400 hover:underline font-medium">Kodläge</button>
            </span>
          )}
          <span className="text-xs text-gray-500 dark:text-gray-400">A4-format (210×297mm)</span>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-6">
        {preview ? (
          <div className="mx-auto" style={{ maxWidth: '794px' }}>
            <iframe
              srcDoc={preview}
              className="bg-white shadow-2xl mx-auto border-0 w-full rounded-sm"
              style={{ height: '1123px' }}
              title="Template Preview"
            />
            <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-4">
              Detta visar hur fakturan kommer se ut med verklig data
            </p>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            <div className="text-center">
              <svg className="w-16 h-16 mx-auto mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Ingen förhandsvisning tillgänglig</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Ange mallinnehåll för att se förhandsvisningen</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
