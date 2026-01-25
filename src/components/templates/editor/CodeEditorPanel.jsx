import React from 'react';
import CodeEditor from 'react-simple-code-editor';
import Prism from 'prismjs';
import 'prismjs/components/prism-markup';

/**
 * Syntax highlighting function for HTML + Handlebars
 */
export function highlightCode(code, isDarkMode = false) {
  if (!code) return '';
  
  // First highlight HTML with Prism
  let html = Prism.highlight(code, Prism.languages.markup, 'markup');
  
  // Then add custom Handlebars highlighting on top
  // Handlebars blocks: {{#each}}, {{#if}}, {{/each}}, {{/if}}, {{else}}
  html = html.replace(
    /(\{\{)(#(?:each|if|unless)|\/(?:each|if|unless)|else)(\s*)([^}]*)(\}\})/g,
    '<span class="token handlebars-delimiter">$1</span><span class="token handlebars-block">$2</span>$3<span class="token handlebars-variable">$4</span><span class="token handlebars-delimiter">$5</span>'
  );
  
  // Handlebars helpers: {{formatDate x}}, {{uppercase x}}, etc.
  html = html.replace(
    /(\{\{)(formatDate|formatDateTime|uppercase|lowercase|truncate|pluralize|add|subtract|multiply|divide|ifEquals|ifContains|json)(\s+)([^}]+)(\}\})/g,
    '<span class="token handlebars-delimiter">$1</span><span class="token handlebars-helper">$2</span>$3<span class="token handlebars-variable">$4</span><span class="token handlebars-delimiter">$5</span>'
  );
  
  // Simple Handlebars variables: {{variable}}, {{object.property}}
  html = html.replace(
    /(\{\{)([^#/][^}]*)(\}\})/g,
    '<span class="token handlebars-delimiter">$1</span><span class="token handlebars-variable">$2</span><span class="token handlebars-delimiter">$3</span>'
  );
  
  return html;
}

/**
 * Format HTML/Handlebars code with proper indentation
 */
export function formatCode(content) {
  if (!content) return content;
  
  let formatted = content;
  
  // Step 1: Add newlines around tags and Handlebars blocks
  formatted = formatted
    .replace(/>\s*</g, '>\n<')  // Between HTML tags
    .replace(/(\{\{#(?:each|if|unless)[^}]*\}\})/g, '\n$1\n')  // Opening blocks
    .replace(/(\{\{\/(?:each|if|unless)\}\})/g, '\n$1\n')  // Closing blocks
    .replace(/(\{\{else\}\})/g, '\n$1\n');  // else blocks
  
  // Step 2: Split into lines and clean up
  let lines = formatted.split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);
  
  // Step 3: Add proper indentation
  let indent = 0;
  const indentedLines = [];
  
  for (let line of lines) {
    // Decrease indent BEFORE adding line for closing tags/blocks
    if (line.match(/^<\//) || line.match(/^\{\{\/(?:each|if|unless)\}\}/)) {
      indent = Math.max(0, indent - 1);
    }
    
    // Add indented line
    indentedLines.push('  '.repeat(indent) + line);
    
    // Check if this is an opening tag/block that should increase indent
    const isOpeningTag = line.match(/^<([a-z][a-z0-9]*)\b[^>]*>$/i) && !line.match(/<\/\1>/);
    const isHandlebarsBlock = line.match(/^\{\{#(?:each|if|unless)/);
    const isSelfClosing = line.match(/\/>$/);
    
    if ((isOpeningTag || isHandlebarsBlock) && !isSelfClosing) {
      indent++;
    }
  }
  
  return indentedLines.join('\n');
}

/**
 * Get editor styles for syntax highlighting based on theme
 */
export function getEditorStyles(isDarkMode) {
  return `
    .code-editor-container {
      min-height: 100%;
    }
    .code-editor-container textarea {
      outline: none !important;
      color: ${isDarkMode ? '#abb2bf' : '#24292e'} !important;
      caret-color: ${isDarkMode ? '#fff' : '#000'} !important;
    }
    .code-editor-container pre {
      min-height: 100%;
    }
    /* Custom Handlebars/HTML highlighting - adapts to theme */
    .token.tag { color: ${isDarkMode ? '#e06c75' : '#22863a'}; }
    .token.attr-name { color: ${isDarkMode ? '#d19a66' : '#6f42c1'}; }
    .token.attr-value { color: ${isDarkMode ? '#98c379' : '#032f62'}; }
    .token.punctuation { color: ${isDarkMode ? '#abb2bf' : '#24292e'}; }
    .token.comment { color: ${isDarkMode ? '#5c6370' : '#6a737d'}; font-style: italic; }
    .token.handlebars-delimiter { color: ${isDarkMode ? '#c678dd' : '#d73a49'}; font-weight: bold; }
    .token.handlebars-variable { color: ${isDarkMode ? '#61afef' : '#005cc5'}; }
    .token.handlebars-helper { color: ${isDarkMode ? '#c678dd' : '#6f42c1'}; }
    .token.handlebars-block { color: ${isDarkMode ? '#e5c07b' : '#e36209'}; }
  `;
}

/**
 * CodeEditorPanel - Code editor with syntax highlighting
 */
export default function CodeEditorPanel({
  value,
  onChange,
  validation,
  onFormat,
  isDarkMode = false
}) {
  const highlight = (code) => highlightCode(code, isDarkMode);

  return (
    <>
      <div className={`px-4 py-2 flex items-center justify-between ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100 border-b border-gray-200'}`}>
        <div className="flex items-center gap-4">
          <span className={`text-xs font-mono ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>HTML / Handlebars</span>
          <button
            onClick={onFormat}
            className={`text-xs px-2 py-1 rounded transition flex items-center gap-1 ${isDarkMode ? 'text-gray-400 hover:text-white hover:bg-gray-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'}`}
            title="Formatera kod (indentation)"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h8m-8 6h16" />
            </svg>
            Formatera
          </button>
        </div>
        {validation.valid ? (
          <span className="text-xs text-green-500 flex items-center gap-1">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Giltig syntax
          </span>
        ) : (
          <span className="text-xs text-red-500 flex items-center gap-1">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {validation.error}
          </span>
        )}
      </div>
      <div className="flex-1 overflow-auto" style={{ background: isDarkMode ? '#1d1f21' : '#fafafa' }}>
        <CodeEditor
          value={value}
          onValueChange={onChange}
          highlight={highlight}
          padding={16}
          style={{
            fontFamily: '"JetBrains Mono", "Fira Code", "Consolas", monospace',
            fontSize: 14,
            lineHeight: 1.6,
            minHeight: '100%',
            color: isDarkMode ? '#abb2bf' : '#24292e',
          }}
          className="code-editor-container"
          textareaId="template-editor"
          placeholder="Skriv din mall här... Använd {{variabler}} och {{#each loops}}...{{/each}}"
        />
      </div>
      <style>{getEditorStyles(isDarkMode)}</style>
    </>
  );
}
