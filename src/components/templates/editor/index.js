// Template Editor - Modular Components
// This index file exports all editor components for easy importing

export { default as BlockPalette, LAYOUT_BLOCKS } from './BlockPalette';
export { default as VariablesPanel } from './VariablesPanel';
export { default as EditorHeader } from './EditorHeader';
export { default as SettingsPanel } from './SettingsPanel';
export { default as CodeEditorPanel, highlightCode, formatCode, getEditorStyles } from './CodeEditorPanel';
export { default as PreviewPanel } from './PreviewPanel';
export { default as EditorSidebar } from './EditorSidebar';
export { DESIGN_THEMES, generateThemeCSS, generateHtmlDocument } from './themes';
