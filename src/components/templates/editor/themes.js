// Design themes with complete styling for invoice templates
export const DESIGN_THEMES = {
  modern: {
    name: 'Modern',
    description: 'Clean and minimal',
    colors: {
      primary: '#3b82f6',
      secondary: '#64748b',
      accent: '#0ea5e9',
      background: '#ffffff',
      surface: '#f8fafc',
      text: '#1e293b',
      textMuted: '#64748b',
      border: '#e2e8f0'
    }
  },
  professional: {
    name: 'Professionell',
    description: 'Classic business style',
    colors: {
      primary: '#1e40af',
      secondary: '#374151',
      accent: '#059669',
      background: '#ffffff',
      surface: '#f9fafb',
      text: '#111827',
      textMuted: '#6b7280',
      border: '#d1d5db'
    }
  },
  warm: {
    name: 'Varm',
    description: 'Friendly and inviting',
    colors: {
      primary: '#ea580c',
      secondary: '#78716c',
      accent: '#f59e0b',
      background: '#fffbeb',
      surface: '#fef3c7',
      text: '#292524',
      textMuted: '#78716c',
      border: '#fcd34d'
    }
  },
  dark: {
    name: 'Mörk',
    description: 'Dark mode elegance',
    colors: {
      primary: '#60a5fa',
      secondary: '#9ca3af',
      accent: '#34d399',
      background: '#1f2937',
      surface: '#374151',
      text: '#f9fafb',
      textMuted: '#9ca3af',
      border: '#4b5563'
    }
  },
  nature: {
    name: 'Natur',
    description: 'Green and organic',
    colors: {
      primary: '#16a34a',
      secondary: '#57534e',
      accent: '#84cc16',
      background: '#f0fdf4',
      surface: '#dcfce7',
      text: '#14532d',
      textMuted: '#57534e',
      border: '#86efac'
    }
  },
  corporate: {
    name: 'Företag',
    description: 'Formal and structured',
    colors: {
      primary: '#475569',
      secondary: '#64748b',
      accent: '#0284c7',
      background: '#ffffff',
      surface: '#f1f5f9',
      text: '#0f172a',
      textMuted: '#475569',
      border: '#cbd5e1'
    }
  }
};

// Generate CSS for a theme
export const generateThemeCSS = (theme) => {
  const c = theme.colors;
  return `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      line-height: 1.7;
      color: ${c.text};
      background: ${c.background};
      padding: 48px;
    }
    
    /* Typography */
    h1 { 
      font-size: 2rem; 
      font-weight: 700; 
      margin-bottom: 0.75rem; 
      color: ${c.text};
      border-bottom: 3px solid ${c.primary};
      padding-bottom: 0.5rem;
    }
    h2 { 
      font-size: 1.5rem; 
      font-weight: 600; 
      margin-bottom: 0.75rem; 
      margin-top: 2rem;
      color: ${c.primary};
    }
    h3 { 
      font-size: 1.125rem; 
      font-weight: 600; 
      margin-bottom: 0.5rem; 
      color: ${c.secondary};
    }
    p { margin-bottom: 0.75rem; }
    strong { font-weight: 600; }
    
    /* Lists */
    ul, ol { 
      margin-bottom: 1rem; 
      padding-left: 1.5rem; 
    }
    li { 
      margin-bottom: 0.5rem;
      padding: 0.5rem;
      background: ${c.surface};
      border-radius: 4px;
      list-style-position: inside;
    }
    
    /* Tables */
    table { 
      width: 100%; 
      border-collapse: collapse; 
      margin: 1rem 0;
      background: ${c.background};
    }
    th { 
      background: ${c.primary}; 
      color: white;
      padding: 12px 16px; 
      text-align: left; 
      font-weight: 600;
    }
    td { 
      padding: 10px 16px; 
      border-bottom: 1px solid ${c.border};
    }
    tr:nth-child(even) td {
      background: ${c.surface};
    }
    
    /* Cards/Sections */
    .section {
      margin: 1.5rem 0;
      padding: 1rem;
      background: ${c.surface};
      border-radius: 8px;
      border-left: 4px solid ${c.primary};
    }
    .card {
      margin: 0.75rem 0;
      padding: 1rem;
      background: ${c.background};
      border: 1px solid ${c.border};
      border-radius: 6px;
    }
    
    /* Item blocks */
    .item {
      margin: 0.5rem 0;
      padding: 0.75rem 1rem;
      background: ${c.surface};
      border-left: 4px solid ${c.accent};
      border-radius: 0 4px 4px 0;
    }
    .item-name {
      font-weight: 600;
      color: ${c.text};
    }
    .item-meta {
      font-size: 0.875rem;
      color: ${c.textMuted};
      margin-top: 0.25rem;
    }
    
    /* Stats */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1rem;
      margin: 1.5rem 0;
    }
    .stat-box {
      text-align: center;
      padding: 1.5rem;
      background: ${c.surface};
      border-radius: 8px;
      border: 1px solid ${c.border};
    }
    .stat-value {
      font-size: 2.5rem;
      font-weight: 700;
      color: ${c.primary};
    }
    .stat-label {
      font-size: 0.875rem;
      color: ${c.textMuted};
      margin-top: 0.25rem;
    }
    
    /* Footer */
    .footer {
      margin-top: 3rem;
      padding-top: 1rem;
      border-top: 1px solid ${c.border};
      font-size: 0.875rem;
      color: ${c.textMuted};
    }
    
    /* Layout Grid */
    .two-columns {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.5rem;
    }
    .three-columns {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1rem;
    }
    .four-columns {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1rem;
    }
    .sidebar-layout {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 2rem;
    }
    .main-content {
      min-width: 0;
    }
    .sidebar {
      min-width: 0;
    }
    
    /* Print */
    .page-break { page-break-before: always; }
    .no-break { page-break-inside: avoid; }
    
    /* Column Extension Styles */
    .column-block {
      width: 100%;
      display: grid;
      grid-auto-flow: column;
      grid-auto-columns: 1fr;
      gap: 24px;
      padding: 8px 0;
    }
    .column {
      overflow: auto;
      border: 1px ${c.border} dashed;
      border-radius: 8px;
      padding: 8px;
      margin: -8px;
    }
    
    @media print {
      body { padding: 20px; }
      .column { border: none; margin: 0; }
    }
  `;
};

// Generate full HTML document (or pass through if already complete)
export const generateHtmlDocument = (content, theme) => {
  // If the content is already a complete HTML document, return it as-is
  if (content && content.trim().toLowerCase().startsWith('<!doctype html')) {
    return content;
  }
  
  // Otherwise, wrap the content in a basic HTML document with theme styles
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <script src="https://cdn.tailwindcss.com"></script>
  <style>${generateThemeCSS(theme)}</style>
</head>
<body>
${content}
</body>
</html>`;
};
