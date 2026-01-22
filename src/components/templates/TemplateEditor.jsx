import React, { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../../context/ThemeContext';
import VisualTemplateEditor from './VisualTemplateEditor';

// Import modular editor components
import {
  DESIGN_THEMES,
  generateHtmlDocument,
  LAYOUT_BLOCKS,
  EditorHeader,
  SettingsPanel,
  EditorSidebar,
  CodeEditorPanel,
  PreviewPanel,
  formatCode
} from './editor';

// Import template utilities
import {
  validateTemplate,
  renderTemplate,
  buildTemplateContext,
  getTemplateVariables,
  exportToPDF
} from '../../services/templateService';

/**
 * TemplateEditor - Edit and preview invoice templates
 * Features: Syntax validation, live preview, design themes, visual/code modes
 */
export default function TemplateEditor({ 
  template, 
  onSave, 
  onCancel,
  invoiceData
}) {
  const { theme: appTheme } = useTheme();
  const isDarkMode = appTheme === 'dark';
  
  // Form state
  const [name, setName] = useState(template?.name || '');
  const [description, setDescription] = useState(template?.description || '');
  const [templateContent, setTemplateContent] = useState(template?.template_content || '');
  const [category, setCategory] = useState(template?.category || 'custom');
  const [selectedTheme, setSelectedTheme] = useState('modern');
  
  // UI state
  const [validation, setValidation] = useState({ valid: true, error: null });
  const [preview, setPreview] = useState('');
  const [showSidebar, setShowSidebar] = useState(true);
  const [sidebarTab, setSidebarTab] = useState('blocks');
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Check if template is a complete HTML document
  const isCompleteHtmlDocument = useCallback((content) => {
    if (!content) return false;
    const trimmed = content.trim().toLowerCase();
    return trimmed.startsWith('<!doctype html') || trimmed.startsWith('<html');
  }, []);

  // Start in appropriate mode based on template content
  const [editorMode, setEditorMode] = useState(() => {
    const content = template?.template_content || '';
    if (content.trim().toLowerCase().startsWith('<!doctype html') || 
        content.trim().toLowerCase().startsWith('<html')) {
      return 'preview';
    }
    return 'visual';
  });

  const theme = DESIGN_THEMES[selectedTheme];

  // Sync content when switching modes
  const handleModeSwitch = useCallback((newMode) => {
    // When entering code mode, auto-format the code
    if (newMode === 'code' && templateContent) {
      setTimeout(() => {
        setTemplateContent(formatCode(templateContent));
      }, 10);
    }
    setEditorMode(newMode);
  }, [templateContent]);

  // Validate template and update preview on content or theme change
  useEffect(() => {
    if (templateContent) {
      const result = validateTemplate(templateContent);
      setValidation(result);
      
      if (result.valid) {
        try {
          const context = buildTemplateContext(invoiceData);
          const rendered = renderTemplate(templateContent, context);
          setPreview(generateHtmlDocument(rendered, theme));
        } catch (error) {
          console.error('Template render error:', error);
          setPreview(generateHtmlDocument(`<div style="color: red; padding: 20px;">
            <strong>Preview Error:</strong><br>
            ${error.message}
          </div>`, theme));
        }
      } else {
        setPreview(generateHtmlDocument(`<div style="color: #64748b; padding: 20px; font-style: italic;">
          Template preview will appear here.
        </div>`, theme));
      }
    }
  }, [templateContent, invoiceData, selectedTheme, theme]);

  // Save handler
  const handleSave = async () => {
    if (!validation.valid) {
      alert('Åtgärda mallfel innan du sparar');
      return;
    }

    if (!name.trim()) {
      alert('Ange ett mallnamn');
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        name: name.trim(),
        template_content: templateContent
      });
    } catch (error) {
      alert('Kunde inte spara mall: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Export PDF handler
  const handleExportPreview = async () => {
    if (!templateContent) return;
    
    setIsExporting(true);
    try {
      const context = buildTemplateContext(invoiceData);
      const rendered = renderTemplate(templateContent, context);
      const htmlDocument = generateHtmlDocument(rendered, theme);
      const filename = `${name.replace(/\s+/g, '_').toLowerCase() || 'invoice'}_${Date.now()}.pdf`;
      await exportToPDF(htmlDocument, filename);
    } catch (error) {
      alert('Could not export PDF: ' + error.message);
    } finally {
      setIsExporting(false);
    }
  };

  // Insert variable handler
  const insertVariable = useCallback((variable) => {
    if (editorMode === 'visual') {
      setTemplateContent(prev => prev + variable);
    } else {
      const textarea = document.getElementById('template-editor');
      if (!textarea) return;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = templateContent;
      const before = text.substring(0, start);
      const after = text.substring(end);
      setTemplateContent(before + variable + after);
      
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + variable.length, start + variable.length);
      }, 0);
    }
  }, [editorMode, templateContent]);

  // Insert layout block handler
  const insertBlock = useCallback((blockHtml) => {
    if (editorMode === 'visual') {
      setTemplateContent(prev => prev + '\n' + blockHtml);
    } else {
      const textarea = document.getElementById('template-editor');
      if (!textarea) return;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = templateContent;
      const before = text.substring(0, start);
      const after = text.substring(end);
      const formattedBlock = '\n' + blockHtml + '\n';
      setTemplateContent(before + formattedBlock + after);
      
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + formattedBlock.length, start + formattedBlock.length);
      }, 0);
    }
  }, [editorMode, templateContent]);

  // Insert resizable columns
  const insertColumns = useCallback((preset) => {
    const presetMap = {
      '50-50': `<div class="two-columns">
  <div><p>Kolumn 1</p></div>
  <div><p>Kolumn 2</p></div>
</div>`,
      '33-33-33': `<div class="three-columns">
  <div><p>Kolumn 1</p></div>
  <div><p>Kolumn 2</p></div>
  <div><p>Kolumn 3</p></div>
</div>`,
      '25-25-25-25': `<div class="four-columns">
  <div><p>Kolumn 1</p></div>
  <div><p>Kolumn 2</p></div>
  <div><p>Kolumn 3</p></div>
  <div><p>Kolumn 4</p></div>
</div>`,
      '66-33': `<div class="sidebar-layout">
  <div><p>Huvudinnehåll</p></div>
  <div><p>Sidofält</p></div>
</div>`,
      '33-66': `<div class="sidebar-layout" style="grid-template-columns: 1fr 2fr;">
  <div><p>Sidofält</p></div>
  <div><p>Huvudinnehåll</p></div>
</div>`,
    };
    insertBlock(presetMap[preset] || presetMap['50-50']);
  }, [insertBlock]);

  // Handle block insertion from sidebar
  const handleBlockInsert = useCallback((block) => {
    if (block.isResizable && block.preset) {
      insertColumns(block.preset);
    } else {
      insertBlock(block.html);
    }
  }, [insertBlock, insertColumns]);

  // Format code handler
  const handleFormatCode = useCallback(() => {
    if (templateContent) {
      setTemplateContent(formatCode(templateContent));
    }
  }, [templateContent]);

  return (
    <div className="template-editor h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <EditorHeader
        name={name}
        onNameChange={setName}
        validation={validation}
        editorMode={editorMode}
        onModeSwitch={handleModeSwitch}
        showSidebar={showSidebar}
        onToggleSidebar={() => setShowSidebar(!showSidebar)}
        showSettings={showSettings}
        onToggleSettings={() => setShowSettings(!showSettings)}
        onExport={handleExportPreview}
        isExporting={isExporting}
        preview={preview}
        onCancel={onCancel}
        onSave={handleSave}
        isSaving={isSaving}
      />

      {/* Settings panel (collapsible) */}
      {showSettings && (
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 pb-4">
          <SettingsPanel
            category={category}
            onCategoryChange={setCategory}
            selectedTheme={selectedTheme}
            onThemeChange={setSelectedTheme}
            description={description}
            onDescriptionChange={setDescription}
            theme={theme}
          />
        </div>
      )}

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Tools (only in edit modes) */}
        {showSidebar && editorMode !== 'preview' && (
          <EditorSidebar
            sidebarTab={sidebarTab}
            onTabChange={setSidebarTab}
            onInsertBlock={handleBlockInsert}
            onInsertVariable={insertVariable}
          />
        )}

        {/* Main Editor Area - 3 modes */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Visual Editor Mode */}
          {editorMode === 'visual' && (
            <div className="flex-1 overflow-auto bg-gray-100 dark:bg-gray-700 p-6">
              <div className="mx-auto bg-white dark:bg-gray-800 shadow-xl rounded-lg overflow-hidden" style={{ width: '794px', minHeight: '1123px' }}>
                <VisualTemplateEditor
                  value={templateContent}
                  onChange={setTemplateContent}
                />
              </div>
            </div>
          )}

          {/* Code Editor Mode */}
          {editorMode === 'code' && (
            <CodeEditorPanel
              value={templateContent}
              onChange={setTemplateContent}
              validation={validation}
              onFormat={handleFormatCode}
              isDarkMode={isDarkMode}
            />
          )}

          {/* Preview Mode */}
          {editorMode === 'preview' && (
            <PreviewPanel
              preview={preview}
              isCompleteHtmlDocument={isCompleteHtmlDocument(templateContent)}
              templateContent={templateContent}
              onSwitchToCode={() => handleModeSwitch('code')}
            />
          )}
        </div>
      </div>
    </div>
  );
}
