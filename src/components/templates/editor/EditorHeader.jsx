import React from 'react';

/**
 * EditorHeader - Top toolbar for the template editor
 * Contains: name input, mode switcher, action buttons
 */
export default function EditorHeader({
  name,
  onNameChange,
  validation,
  editorMode,
  onModeSwitch,
  showSidebar,
  onToggleSidebar,
  showSettings,
  onToggleSettings,
  onExport,
  isExporting,
  preview,
  onCancel,
  onSave,
  isSaving
}) {
  // Icon button component for toolbar
  const IconButton = ({ onClick, active, disabled, title, children }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`p-2 rounded-sm transition-all ${
        active 
          ? 'bg-blue-100 text-blue-700' 
          : disabled 
            ? 'text-gray-300 cursor-not-allowed'
            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
      }`}
    >
      {children}
    </button>
  );

  return (
    <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
      <div className="flex items-center justify-between gap-4">
        {/* Left: Title input */}
        <div className="flex items-center gap-3 flex-1 max-w-md">
          <input
            type="text"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            className="flex-1 px-3 py-1.5 text-lg font-semibold border-0 border-b-2 border-transparent focus:border-blue-500 focus:ring-0 bg-transparent dark:text-white"
            placeholder="Mallnamn..."
          />
          {!validation.valid && (
            <span className="text-red-500" title={validation.error}>
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </span>
          )}
        </div>

        {/* Center: 3-Mode toggle */}
        <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-sm p-0.5">
          <button
            onClick={() => onModeSwitch('visual')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition ${
              editorMode === 'visual' 
                ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm' 
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
            title="Visuell redigering"
          >
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Redigera
            </span>
          </button>
          <button
            onClick={() => onModeSwitch('code')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition ${
              editorMode === 'code' 
                ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm' 
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
            title="Redigera HTML/Handlebars-kod"
          >
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
              Kod
            </span>
          </button>
          <button
            onClick={() => onModeSwitch('preview')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition ${
              editorMode === 'preview' 
                ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm' 
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
            title="Förhandsgranska med verklig data"
          >
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              Förhandsvisa
            </span>
          </button>
        </div>

        {/* Right: Icon buttons */}
        <div className="flex items-center gap-1">
          {/* Only show sidebar toggle when not in preview mode */}
          {editorMode !== 'preview' && (
            <IconButton 
              onClick={onToggleSidebar} 
              active={showSidebar}
              title="Verktygspanel (Block & Variabler)"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
              </svg>
            </IconButton>
          )}
          <IconButton 
            onClick={onToggleSettings} 
            active={showSettings}
            title="Inställningar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </IconButton>
          
          <div className="w-px h-6 bg-gray-300 mx-2" />
          
          <IconButton 
            onClick={onExport}
            disabled={!preview || isExporting}
            title="Exportera PDF"
          >
            {isExporting ? (
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            )}
          </IconButton>

          <div className="w-px h-6 bg-gray-300 mx-2" />

          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-sm transition"
          >
            Avbryt
          </button>
          <button
            onClick={onSave}
            disabled={!validation.valid || !name.trim() || isSaving}
            className="px-4 py-1.5 text-sm bg-green-600 hover:bg-green-700 text-white rounded-sm transition disabled:opacity-50 flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Sparar...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Spara
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
