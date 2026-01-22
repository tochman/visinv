import React, { useRef, useEffect, useCallback, useState } from 'react';

/**
 * VisualTemplateEditor - True WYSIWYG editor for HTML templates
 * Uses an editable iframe to render complete HTML documents with their CSS
 */
export default function VisualTemplateEditor({ value, onChange, className = '' }) {
  const iframeRef = useRef(null);
  const [isReady, setIsReady] = useState(false);

  // Initialize iframe with editable content
  const initializeEditor = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const doc = iframe.contentDocument || iframe.contentWindow.document;
    
    // Write the full HTML document
    doc.open();
    doc.write(value || '<html><body><p>Start typing...</p></body></html>');
    doc.close();

    // Make the body editable
    doc.body.contentEditable = 'true';
    doc.designMode = 'on';

    // Add editing styles
    const style = doc.createElement('style');
    style.textContent = `
      body {
        outline: none;
        cursor: text;
      }
      body:focus {
        outline: none;
      }
      /* Selection highlight */
      ::selection {
        background: rgba(59, 130, 246, 0.3);
      }
    `;
    doc.head.appendChild(style);

    // Listen for changes
    const handleInput = () => {
      // Get the full HTML including doctype and head
      const doctype = doc.doctype 
        ? `<!DOCTYPE ${doc.doctype.name}${doc.doctype.publicId ? ` PUBLIC "${doc.doctype.publicId}"` : ''}${doc.doctype.systemId ? ` "${doc.doctype.systemId}"` : ''}>`
        : '<!DOCTYPE html>';
      
      const html = doc.documentElement.outerHTML;
      const fullHtml = doctype + '\n' + html;
      
      onChange?.(fullHtml);
    };

    doc.body.addEventListener('input', handleInput);
    doc.body.addEventListener('blur', handleInput);

    // Handle keyboard shortcuts
    doc.addEventListener('keydown', (e) => {
      if (e.metaKey || e.ctrlKey) {
        switch (e.key.toLowerCase()) {
          case 'b':
            e.preventDefault();
            doc.execCommand('bold');
            handleInput();
            break;
          case 'i':
            e.preventDefault();
            doc.execCommand('italic');
            handleInput();
            break;
          case 'u':
            e.preventDefault();
            doc.execCommand('underline');
            handleInput();
            break;
          case 'z':
            if (e.shiftKey) {
              e.preventDefault();
              doc.execCommand('redo');
            } else {
              e.preventDefault();
              doc.execCommand('undo');
            }
            handleInput();
            break;
        }
      }
    });

    setIsReady(true);
  }, [value, onChange]);

  // Initialize on mount
  useEffect(() => {
    initializeEditor();
  }, []);

  // Update content when value changes externally (not from user input)
  useEffect(() => {
    if (!isReady) return;
    
    const iframe = iframeRef.current;
    if (!iframe) return;

    const doc = iframe.contentDocument || iframe.contentWindow.document;
    const currentContent = doc.documentElement.outerHTML;
    
    // Only update if value changed from external source
    // (to avoid cursor jumping during typing)
    if (value && !value.includes(doc.body.innerHTML.substring(0, 100))) {
      initializeEditor();
    }
  }, [value, isReady]);

  // Toolbar actions
  const execCommand = (command, value = null) => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    
    const doc = iframe.contentDocument || iframe.contentWindow.document;
    doc.execCommand(command, false, value);
    iframe.contentWindow.focus();
  };

  return (
    <div className={`visual-template-editor ${className}`}>
      {/* Formatting Toolbar */}
      <div className="flex flex-wrap items-center gap-1 p-2 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 rounded-t-lg">
        {/* Undo/Redo */}
        <button
          onClick={() => execCommand('undo')}
          className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
          title="Ångra (Ctrl+Z)"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
          </svg>
        </button>
        <button
          onClick={() => execCommand('redo')}
          className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
          title="Gör om (Ctrl+Y)"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10H11a8 8 0 00-8 8v2m18-10l-6 6m6-6l-6-6" />
          </svg>
        </button>

        <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />

        {/* Text formatting */}
        <button
          onClick={() => execCommand('bold')}
          className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold"
          title="Fet (Ctrl+B)"
        >
          B
        </button>
        <button
          onClick={() => execCommand('italic')}
          className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 italic"
          title="Kursiv (Ctrl+I)"
        >
          I
        </button>
        <button
          onClick={() => execCommand('underline')}
          className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 underline"
          title="Understruken (Ctrl+U)"
        >
          U
        </button>
        <button
          onClick={() => execCommand('strikeThrough')}
          className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 line-through"
          title="Genomstruken"
        >
          S
        </button>

        <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />

        {/* Headings */}
        <select
          onChange={(e) => {
            if (e.target.value === 'p') {
              execCommand('formatBlock', 'p');
            } else {
              execCommand('formatBlock', e.target.value);
            }
          }}
          className="px-2 py-1 rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm"
          title="Rubrikstorlek"
        >
          <option value="p">Normal</option>
          <option value="h1">Rubrik 1</option>
          <option value="h2">Rubrik 2</option>
          <option value="h3">Rubrik 3</option>
          <option value="h4">Rubrik 4</option>
        </select>

        <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />

        {/* Alignment */}
        <button
          onClick={() => execCommand('justifyLeft')}
          className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
          title="Vänsterjustera"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h10M4 18h14" />
          </svg>
        </button>
        <button
          onClick={() => execCommand('justifyCenter')}
          className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
          title="Centrera"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M7 12h10M5 18h14" />
          </svg>
        </button>
        <button
          onClick={() => execCommand('justifyRight')}
          className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
          title="Högerjustera"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M10 12h10M6 18h14" />
          </svg>
        </button>

        <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />

        {/* Lists */}
        <button
          onClick={() => execCommand('insertUnorderedList')}
          className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
          title="Punktlista"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <button
          onClick={() => execCommand('insertOrderedList')}
          className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
          title="Numrerad lista"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 6h13M7 12h13M7 18h13M3 6h.01M3 12h.01M3 18h.01" />
          </svg>
        </button>

        <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />

        {/* Colors */}
        <div className="relative">
          <input
            type="color"
            onChange={(e) => execCommand('foreColor', e.target.value)}
            className="w-8 h-8 cursor-pointer rounded border border-gray-200 dark:border-gray-600"
            title="Textfärg"
          />
        </div>
        <div className="relative">
          <input
            type="color"
            onChange={(e) => execCommand('hiliteColor', e.target.value)}
            className="w-8 h-8 cursor-pointer rounded border border-gray-200 dark:border-gray-600"
            title="Bakgrundsfärg"
            defaultValue="#ffff00"
          />
        </div>

        <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />

        {/* Link */}
        <button
          onClick={() => {
            const url = prompt('Ange URL:');
            if (url) execCommand('createLink', url);
          }}
          className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
          title="Infoga länk"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
        </button>
        <button
          onClick={() => execCommand('unlink')}
          className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
          title="Ta bort länk"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
        </button>
      </div>

      {/* Editable iframe */}
      <iframe
        ref={iframeRef}
        className="w-full bg-white border-0 rounded-b-lg"
        style={{ minHeight: '800px', height: '100%' }}
        title="Template Editor"
      />
    </div>
  );
}
