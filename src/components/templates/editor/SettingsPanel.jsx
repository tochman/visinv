import React from 'react';
import { DESIGN_THEMES } from './themes';

/**
 * SettingsPanel - Collapsible settings section for template editor
 */
export default function SettingsPanel({
  category,
  onCategoryChange,
  selectedTheme,
  onThemeChange,
  description,
  onDescriptionChange,
  theme
}) {
  return (
    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 grid grid-cols-4 gap-4">
      <div>
        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Kategori</label>
        <select
          value={category}
          onChange={(e) => onCategoryChange(e.target.value)}
          className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 dark:text-white"
        >
          <option value="custom">Anpassad</option>
          <option value="monthly">Månatlig</option>
          <option value="activity">Aktivitet</option>
          <option value="summary">Sammanfattning</option>
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Designschema</label>
        <div className="flex items-center gap-2">
          <select
            value={selectedTheme}
            onChange={(e) => onThemeChange(e.target.value)}
            className="flex-1 px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 dark:text-white"
          >
            {Object.entries(DESIGN_THEMES).map(([key, t]) => (
              <option key={key} value={key}>{t.name}</option>
            ))}
          </select>
          <div className="flex gap-0.5">
            {['primary', 'secondary', 'accent'].map(c => (
              <div 
                key={c}
                className="w-4 h-4 rounded-full border border-gray-300 dark:border-gray-600" 
                style={{ background: theme.colors[c] }}
                title={c}
              />
            ))}
          </div>
        </div>
      </div>
      <div className="col-span-2">
        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Beskrivning</label>
        <input
          type="text"
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 dark:text-white"
          placeholder="Valfri beskrivning av mallen"
        />
      </div>
    </div>
  );
}
