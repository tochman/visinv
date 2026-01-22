import { useState, useEffect, useRef, useMemo } from 'react';
import { renderTemplate, getSampleInvoiceData } from '../../services/templateService';

/**
 * TemplatePreview - Renders a scaled-down preview of an invoice template
 * Uses an iframe with CSS transform to create a thumbnail view
 */
export default function TemplatePreview({ 
  template, 
  scale = 0.25, 
  width = 210, // A4 width in mm at scale
  height = 297, // A4 height in mm at scale
  className = '',
  onClick = null 
}) {
  const iframeRef = useRef(null);
  const [renderedHtml, setRenderedHtml] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  // Memoize sample data to avoid recreating on every render
  const sampleData = useMemo(() => getSampleInvoiceData(), []);

  // Calculate actual dimensions
  const actualWidth = 794; // A4 at 96 DPI
  const actualHeight = 1123; // A4 at 96 DPI
  const scaledWidth = actualWidth * scale;
  const scaledHeight = actualHeight * scale;

  useEffect(() => {
    if (!template?.content) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Render the template with sample data
      const html = renderTemplate(template.content, sampleData);
      
      // Wrap in a complete HTML document if it's not already
      let fullHtml = html;
      if (!html.trim().toLowerCase().startsWith('<!doctype') && 
          !html.trim().toLowerCase().startsWith('<html')) {
        fullHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <style>
              body {
                margin: 0;
                padding: 20px;
                font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                font-size: 12px;
                line-height: 1.4;
                background: white;
              }
            </style>
          </head>
          <body>${html}</body>
          </html>
        `;
      }

      setRenderedHtml(fullHtml);
    } catch (err) {
      console.error('Template preview error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [template?.content, sampleData]);

  // Update iframe content when rendered HTML changes
  useEffect(() => {
    if (iframeRef.current && renderedHtml) {
      const iframe = iframeRef.current;
      const doc = iframe.contentDocument || iframe.contentWindow.document;
      doc.open();
      doc.write(renderedHtml);
      doc.close();
    }
  }, [renderedHtml]);

  if (!template?.content) {
    return (
      <div 
        className={`bg-gray-100 dark:bg-gray-700 flex items-center justify-center ${className}`}
        style={{ width: scaledWidth, height: scaledHeight }}
      >
        <span className="text-gray-400 dark:text-gray-500 text-xs">No content</span>
      </div>
    );
  }

  if (error) {
    return (
      <div 
        className={`bg-red-50 dark:bg-red-900/20 flex items-center justify-center p-2 ${className}`}
        style={{ width: scaledWidth, height: scaledHeight }}
      >
        <span className="text-red-500 dark:text-red-400 text-xs text-center">
          Preview error
        </span>
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden bg-white border border-gray-200 dark:border-gray-600 rounded shadow-sm ${className}`}
      style={{ 
        width: scaledWidth, 
        height: scaledHeight,
        cursor: onClick ? 'pointer' : 'default'
      }}
      onClick={onClick}
    >
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50 dark:bg-gray-800">
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      
      <div
        style={{
          width: actualWidth,
          height: actualHeight,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          pointerEvents: 'none' // Prevent interaction with iframe content
        }}
      >
        <iframe
          ref={iframeRef}
          title={`Preview of ${template.name}`}
          style={{
            width: actualWidth,
            height: actualHeight,
            border: 'none',
            background: 'white'
          }}
          sandbox="allow-same-origin"
        />
      </div>
    </div>
  );
}

/**
 * TemplatePreviewModal - Full-size preview in a modal
 */
export function TemplatePreviewModal({ template, isOpen, onClose }) {
  const [renderedHtml, setRenderedHtml] = useState('');
  const iframeRef = useRef(null);
  const sampleData = useMemo(() => getSampleInvoiceData(), []);

  useEffect(() => {
    if (!isOpen || !template?.content) return;

    try {
      const html = renderTemplate(template.content, sampleData);
      
      // Wrap in complete HTML if needed
      let fullHtml = html;
      if (!html.trim().toLowerCase().startsWith('<!doctype') && 
          !html.trim().toLowerCase().startsWith('<html')) {
        fullHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <style>
              body {
                margin: 0;
                padding: 20px;
                font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              }
            </style>
          </head>
          <body>${html}</body>
          </html>
        `;
      }

      setRenderedHtml(fullHtml);
    } catch (err) {
      console.error('Template preview modal error:', err);
    }
  }, [isOpen, template?.content, sampleData]);

  useEffect(() => {
    if (iframeRef.current && renderedHtml) {
      const iframe = iframeRef.current;
      const doc = iframe.contentDocument || iframe.contentWindow.document;
      doc.open();
      doc.write(renderedHtml);
      doc.close();
    }
  }, [renderedHtml]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black/60" 
          onClick={onClose} 
        />
        
        {/* Modal */}
        <div className="relative bg-white dark:bg-gray-800 rounded-sm shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {template?.name || 'Template Preview'}
            </h3>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Preview */}
          <div className="p-4 bg-gray-100 dark:bg-gray-900 overflow-auto" style={{ maxHeight: 'calc(90vh - 80px)' }}>
            <div className="mx-auto bg-white shadow-lg" style={{ width: 794 }}>
              <iframe
                ref={iframeRef}
                title={`Full preview of ${template?.name}`}
                style={{
                  width: 794,
                  height: 1123,
                  border: 'none',
                  background: 'white'
                }}
                sandbox="allow-same-origin"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
