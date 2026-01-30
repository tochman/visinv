import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * DocumentPreview Component
 * Displays uploaded documents (images and PDFs) with thumbnail and expanded views
 * US-263: Supplier Invoice & Receipt OCR Upload
 */
export default function DocumentPreview({ preview, fileName, expanded = false, onExpand }) {
  const { t } = useTranslation();
  const [pdfPage, setPdfPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pdfLoaded, setPdfLoaded] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [pdfDoc, setPdfDoc] = useState(null);
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  // Load PDF document
  useEffect(() => {
    let cancelled = false;
    
    async function loadPdfDocument() {
      if (!preview?.url || preview?.type !== 'pdf' || !window.pdfjsLib) return;

      try {
        const loadingTask = window.pdfjsLib.getDocument(preview.url);
        const pdf = await loadingTask.promise;
        if (!cancelled) {
          setTotalPages(pdf.numPages);
          setPdfDoc(pdf);
          setPdfLoaded(true);
        }
      } catch (error) {
        console.error('Error loading PDF:', error);
      }
    }
    
    loadPdfDocument();
    
    return () => {
      cancelled = true;
    };
  }, [preview?.url, preview?.type]);

  // Render PDF page when pdfDoc, pdfPage, zoomLevel, or expanded changes
  useEffect(() => {
    async function renderPage() {
      if (!pdfDoc || !canvasRef.current) return;

      try {
        const page = await pdfDoc.getPage(pdfPage);
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        const viewport = page.getViewport({ scale: expanded ? 2.0 * zoomLevel : 1.0 * zoomLevel });

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({
          canvasContext: context,
          viewport: viewport,
        }).promise;
      } catch (error) {
        console.error('Error rendering PDF page:', error);
      }
    }
    
    renderPage();
  }, [pdfDoc, pdfPage, zoomLevel, expanded]);

  // Handle zoom
  const handleZoom = (direction) => {
    setZoomLevel((prev) => {
      const newZoom = direction === 'in' ? prev + 0.25 : prev - 0.25;
      return Math.max(0.5, Math.min(3, newZoom));
    });
  };

  // Render image preview
  if (preview?.type === 'image') {
    return (
      <div
        ref={containerRef}
        className={`
          relative overflow-auto rounded-sm border border-gray-200 dark:border-gray-700
          ${expanded ? 'max-h-[80vh]' : 'max-h-80'}
        `}
        data-cy="document-preview-image"
      >
        <img
          src={preview.url}
          alt={fileName || 'Document preview'}
          className={`
            w-full object-contain
            ${expanded ? 'max-w-full' : 'max-h-80'}
          `}
          style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top left' }}
        />
        
        {/* Zoom controls */}
        {expanded && (
          <div className="absolute bottom-4 right-4 flex space-x-2 bg-white dark:bg-gray-800 rounded-sm shadow-lg p-2">
            <button
              onClick={() => handleZoom('out')}
              disabled={zoomLevel <= 0.5}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
              data-cy="zoom-out-button"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
            </button>
            <span className="px-2 py-1 text-sm text-gray-600 dark:text-gray-400">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={() => handleZoom('in')}
              disabled={zoomLevel >= 3}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
              data-cy="zoom-in-button"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
        )}
        
        {/* Expand button for thumbnail mode */}
        {!expanded && onExpand && (
          <button
            onClick={onExpand}
            className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors flex items-center justify-center group"
            data-cy="expand-preview-overlay"
          >
            <span className="opacity-0 group-hover:opacity-100 bg-black/60 text-white px-3 py-2 rounded transition-opacity">
              {t('ocrUpload.clickToExpand')}
            </span>
          </button>
        )}
      </div>
    );
  }

  // Render PDF preview
  if (preview?.type === 'pdf') {
    return (
      <div
        ref={containerRef}
        className={`
          relative overflow-auto rounded-sm border border-gray-200 dark:border-gray-700
          ${expanded ? 'max-h-[80vh]' : 'max-h-80'}
        `}
        data-cy="document-preview-pdf"
      >
        {/* PDF Canvas */}
        <canvas
          ref={canvasRef}
          className={expanded ? '' : 'max-h-80 w-full object-contain'}
        />

        {/* PDF loading state */}
        {!pdfLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-700">
            <div className="text-center">
              <svg className="animate-spin h-8 w-8 text-gray-400 mx-auto" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                {t('ocrUpload.loadingPdf')}
              </p>
            </div>
          </div>
        )}

        {/* PDF Controls */}
        {pdfLoaded && totalPages > 1 && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center space-x-4 bg-white dark:bg-gray-800 rounded-sm shadow-lg px-4 py-2">
            <button
              onClick={() => {
                const newPage = Math.max(1, pdfPage - 1);
                setPdfPage(newPage);
              }}
              disabled={pdfPage === 1}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
              data-cy="pdf-prev-page"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-sm text-gray-600 dark:text-gray-400" data-cy="pdf-page-indicator">
              {pdfPage} / {totalPages}
            </span>
            <button
              onClick={() => {
                const newPage = Math.min(totalPages, pdfPage + 1);
                setPdfPage(newPage);
              }}
              disabled={pdfPage === totalPages}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
              data-cy="pdf-next-page"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}

        {/* Zoom controls for expanded mode */}
        {expanded && pdfLoaded && (
          <div className="absolute bottom-4 right-4 flex space-x-2 bg-white dark:bg-gray-800 rounded-sm shadow-lg p-2">
            <button
              onClick={() => handleZoom('out')}
              disabled={zoomLevel <= 0.5}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
              data-cy="zoom-out-button"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
            </button>
            <span className="px-2 py-1 text-sm text-gray-600 dark:text-gray-400">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={() => handleZoom('in')}
              disabled={zoomLevel >= 3}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
              data-cy="zoom-in-button"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
        )}

        {/* Expand button for thumbnail mode */}
        {!expanded && onExpand && (
          <button
            onClick={onExpand}
            className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors flex items-center justify-center group"
            data-cy="expand-preview-overlay"
          >
            <span className="opacity-0 group-hover:opacity-100 bg-black/60 text-white px-3 py-2 rounded transition-opacity">
              {t('ocrUpload.clickToExpand')}
            </span>
          </button>
        )}

        {/* Fallback: Link to open PDF in new tab if canvas fails */}
        {!pdfLoaded && preview.url && (
          <a
            href={preview.url}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute bottom-4 right-4 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 bg-white dark:bg-gray-800 px-3 py-1 rounded shadow"
          >
            {t('ocrUpload.openInNewTab')}
          </a>
        )}
      </div>
    );
  }

  // No preview available
  return (
    <div
      className="flex items-center justify-center h-64 rounded-sm border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900"
      data-cy="document-preview-empty"
    >
      <div className="text-center">
        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          {t('ocrUpload.noPreview')}
        </p>
        {fileName && (
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">{fileName}</p>
        )}
      </div>
    </div>
  );
}
