import { useState, useCallback, useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { useOrganization } from '../../contexts/OrganizationContext';
import { useToast } from '../../context/ToastContext';
import {
  uploadAndExtract,
  clearOcrData,
  setExtractedData,
  selectOcrLoading,
  selectOcrError,
  selectExtractedData,
  selectProcessingStep,
  selectMatchedSupplier,
} from '../../features/supplierInvoices/supplierInvoiceOcrSlice';
import { createSupplierInvoice } from '../../features/supplierInvoices/supplierInvoicesSlice';
import { createSupplier } from '../../features/suppliers/suppliersSlice';
import { fetchAccounts } from '../../features/accounts/accountsSlice';
import DocumentPreview from './DocumentPreview';
import ExtractedDataForm from './ExtractedDataForm';

const ACCEPTED_FILE_TYPES = {
  'application/pdf': ['.pdf'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Load PDF.js library dynamically
const loadPdfJs = () => {
  return new Promise((resolve, reject) => {
    if (window.pdfjsLib) {
      resolve(window.pdfjsLib);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = 
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      resolve(window.pdfjsLib);
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });
};

// Convert PDF first page to base64 image
const pdfToImage = async (pdfFile) => {
  const pdfjsLib = await loadPdfJs();
  
  const arrayBuffer = await pdfFile.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const page = await pdf.getPage(1);
  
  // Render at 2x scale for better quality
  const scale = 2.0;
  const viewport = page.getViewport({ scale });
  
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  
  const context = canvas.getContext('2d');
  await page.render({
    canvasContext: context,
    viewport: viewport,
  }).promise;
  
  // Convert to base64 (remove data URL prefix)
  const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
  return dataUrl.split(',')[1];
};

export default function OcrUploadModal({ isOpen, onClose, onInvoiceCreated }) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { currentOrganization } = useOrganization();
  const toast = useToast();
  const fileInputRef = useRef(null);

  const loading = useSelector(selectOcrLoading);
  const error = useSelector(selectOcrError);
  const extractedData = useSelector(selectExtractedData);
  const processingStep = useSelector(selectProcessingStep);
  const matchedSupplier = useSelector(selectMatchedSupplier);

  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [step, setStep] = useState('upload'); // 'upload', 'processing', 'review', 'supplier', 'kontering'
  const [isPreviewExpanded, setIsPreviewExpanded] = useState(false);
  const [pdfImageBase64, setPdfImageBase64] = useState(null);
  const [selectedSupplierId, setSelectedSupplierId] = useState(null);
  const [creatingSupplier, setCreatingSupplier] = useState(false);
  const [supplierMatches, setSupplierMatches] = useState([]); // Fuzzy matched suppliers
  const [supplierSearchQuery, setSupplierSearchQuery] = useState('');

  const suppliers = useSelector((state) => state.suppliers?.suppliers || []);
  const accounts = useSelector((state) => state.accounts?.items || []);

  // Load PDF.js and fetch accounts when modal opens
  useEffect(() => {
    if (isOpen) {
      loadPdfJs().catch(console.error);
      if (currentOrganization?.id && accounts.length === 0) {
        dispatch(fetchAccounts({ organizationId: currentOrganization.id }));
      }
    }
  }, [isOpen, currentOrganization?.id, accounts.length, dispatch]);

  // Reset state when modal closes
  const handleClose = useCallback(() => {
    setFile(null);
    setFilePreview(null);
    setPdfImageBase64(null);
    setSelectedSupplierId(null);
    setSupplierMatches([]);
    setSupplierSearchQuery('');
    setStep('upload');
    setIsPreviewExpanded(false);
    dispatch(clearOcrData());
    onClose();
  }, [dispatch, onClose]);

  // Handle file selection
  const handleFileSelect = useCallback(async (selectedFile) => {
    if (!selectedFile) return;

    // Validate file type
    const isValidType = Object.keys(ACCEPTED_FILE_TYPES).includes(selectedFile.type);
    if (!isValidType) {
      toast.error(t('ocrUpload.errors.invalidFileType'));
      return;
    }

    // Validate file size
    if (selectedFile.size > MAX_FILE_SIZE) {
      toast.error(t('ocrUpload.errors.fileTooLarge'));
      return;
    }

    setFile(selectedFile);
    setPdfImageBase64(null);

    // Create preview
    if (selectedFile.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setFilePreview({
          type: 'image',
          url: e.target.result,
        });
      };
      reader.readAsDataURL(selectedFile);
    } else if (selectedFile.type === 'application/pdf') {
      // For PDF, create preview URL and convert first page to image for OCR
      const url = URL.createObjectURL(selectedFile);
      setFilePreview({
        type: 'pdf',
        url,
      });
      
      // Convert PDF to image for AI processing
      try {
        const imageBase64 = await pdfToImage(selectedFile);
        setPdfImageBase64(imageBase64);
        // Also update preview to show the rendered image
        setFilePreview({
          type: 'image',
          url: `data:image/jpeg;base64,${imageBase64}`,
          originalType: 'pdf',
        });
      } catch (err) {
        console.error('Failed to convert PDF to image:', err);
        toast.error(t('ocrUpload.errors.pdfConversionFailed') || 'Failed to process PDF');
      }
    }
  }, [t, toast]);

  // Handle file input change
  const handleInputChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
  };

  // Handle drag events
  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  // Handle drop
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  }, [handleFileSelect]);

  // Process file with OCR
  const handleProcessFile = async () => {
    if (!file || !currentOrganization?.id) return;

    setStep('processing');

    try {
      let base64;
      let fileType = file.type;

      // For PDFs, use the pre-converted image
      if (file.type === 'application/pdf') {
        if (!pdfImageBase64) {
          // Convert now if not already done
          base64 = await pdfToImage(file);
        } else {
          base64 = pdfImageBase64;
        }
        // Send as image since we converted it
        fileType = 'image/jpeg';
      } else {
        // Convert image file to base64
        base64 = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const base64String = reader.result.split(',')[1];
            resolve(base64String);
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      }

      await dispatch(uploadAndExtract({
        fileBase64: base64,
        fileType: fileType,
        fileName: file.name,
        organizationId: currentOrganization.id,
        existingSuppliers: suppliers,
      })).unwrap();

      setStep('review');
    } catch (err) {
      toast.error(err?.message || t('ocrUpload.errors.processingFailed'));
      setStep('upload');
    }
  };

  // Handle form data update
  const handleDataUpdate = (updatedData) => {
    dispatch(setExtractedData(updatedData));
  };

  // Handle supplier selection change
  const handleSupplierChange = (supplierId) => {
    setSelectedSupplierId(supplierId);
  };

  // Fuzzy match function for supplier names
  const fuzzyMatch = (str1, str2) => {
    if (!str1 || !str2) return 0;
    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();
    
    // Exact match
    if (s1 === s2) return 1.0;
    
    // Contains match
    if (s1.includes(s2) || s2.includes(s1)) return 0.8;
    
    // Word-based matching
    const words1 = s1.split(/\s+/);
    const words2 = s2.split(/\s+/);
    let matchingWords = 0;
    
    for (const w1 of words1) {
      for (const w2 of words2) {
        if (w1 === w2 || w1.includes(w2) || w2.includes(w1)) {
          matchingWords++;
          break;
        }
      }
    }
    
    const maxWords = Math.max(words1.length, words2.length);
    return matchingWords / maxWords;
  };

  // Find matching suppliers based on extracted data
  const findMatchingSuppliers = useCallback(() => {
    if (!extractedData?.supplier) return [];
    
    const extractedName = extractedData.supplier.name || '';
    const extractedOrgNumber = extractedData.supplier.organization_number || '';
    
    const matches = suppliers
      .map(supplier => {
        let score = 0;
        let matchType = 'none';
        
        // Exact org number match is highest priority
        if (extractedOrgNumber && supplier.organization_number) {
          const cleanExtracted = extractedOrgNumber.replace(/\D/g, '');
          const cleanSupplier = supplier.organization_number.replace(/\D/g, '');
          if (cleanExtracted === cleanSupplier) {
            score = 1.0;
            matchType = 'organization_number';
          }
        }
        
        // Name fuzzy matching
        if (score < 1.0 && extractedName) {
          const nameScore = fuzzyMatch(extractedName, supplier.name);
          if (nameScore > score) {
            score = nameScore;
            matchType = 'name';
          }
        }
        
        return { ...supplier, matchScore: score, matchType };
      })
      .filter(s => s.matchScore >= 0.3) // Only show reasonably matching suppliers
      .sort((a, b) => b.matchScore - a.matchScore);
    
    return matches;
  }, [extractedData?.supplier, suppliers]);

  // Proceed to supplier step (from review)
  const handleProceedToSupplier = () => {
    const matches = findMatchingSuppliers();
    setSupplierMatches(matches);
    setSupplierSearchQuery(extractedData?.supplier?.name || '');
    
    // Auto-select if there's a high-confidence match
    if (matches.length > 0 && matches[0].matchScore >= 0.9) {
      setSelectedSupplierId(matches[0].id);
    } else {
      setSelectedSupplierId(null);
    }
    
    setStep('supplier');
  };

  // Proceed to kontering step (from supplier)
  const handleProceedToKontering = () => {
    // Validate supplier selection
    if (!selectedSupplierId) {
      toast.error(t('supplierInvoices.errors.supplierRequired'));
      return;
    }
    
    // Set matched supplier if one was selected from the list
    if (selectedSupplierId !== 'new') {
      const supplier = suppliers.find(s => s.id === selectedSupplierId);
      if (supplier) {
        dispatch(setExtractedData({
          ...extractedData,
          matchedSupplier: {
            id: supplier.id,
            name: supplier.name,
            match_type: 'manual',
            confidence: 1.0
          }
        }));
      }
    }
    setStep('kontering');
  };

  // Filter suppliers by search query
  const filteredSuppliers = useCallback(() => {
    if (!supplierSearchQuery.trim()) return supplierMatches;
    
    const query = supplierSearchQuery.toLowerCase();
    return suppliers
      .filter(s => 
        s.name?.toLowerCase().includes(query) ||
        s.organization_number?.includes(query)
      )
      .map(s => ({
        ...s,
        matchScore: fuzzyMatch(supplierSearchQuery, s.name),
        matchType: 'search'
      }))
      .sort((a, b) => b.matchScore - a.matchScore);
  }, [supplierSearchQuery, supplierMatches, suppliers]);

  // Handle line item account change
  const handleLineAccountChange = (index, accountId) => {
    const newLineItems = [...(extractedData?.line_items || [])];
    const account = accounts.find(a => a.id === accountId);
    newLineItems[index] = {
      ...newLineItems[index],
      account_id: accountId,
      suggested_account: account?.account_number || '',
      suggested_account_name: account?.name || '',
    };
    dispatch(setExtractedData({
      ...extractedData,
      line_items: newLineItems,
    }));
  };

  // Handle setting the same account for ALL line items
  const handleSetAllAccounts = (accountId) => {
    if (!accountId) return;
    const account = accounts.find(a => a.id === accountId);
    const newLineItems = (extractedData?.line_items || []).map(item => ({
      ...item,
      account_id: accountId,
      suggested_account: account?.account_number || '',
      suggested_account_name: account?.name || '',
    }));
    dispatch(setExtractedData({
      ...extractedData,
      line_items: newLineItems,
    }));
  };

  // Create new supplier from extracted data
  const handleCreateSupplier = async () => {
    if (!extractedData?.supplier || !currentOrganization?.id) return null;

    // Validate required field
    if (!extractedData.supplier.name?.trim()) {
      toast.error(t('suppliers.nameRequired'));
      return null;
    }

    setCreatingSupplier(true);
    try {
      const supplierData = {
        name: extractedData.supplier.name.trim(),
        organization_number: extractedData.supplier.organization_number || null,
        vat_number: extractedData.supplier.vat_number || null,
        address_line1: extractedData.supplier.address || null, // Map address to address_line1
        postal_code: extractedData.supplier.postal_code || null,
        city: extractedData.supplier.city || null,
        country: extractedData.supplier.country || 'SE', // Use country code
        email: extractedData.supplier.email || null,
        phone: extractedData.supplier.phone || null,
        // bankgiro/plusgiro go into bank_account field
        bank_account: extractedData.supplier.bankgiro || extractedData.supplier.plusgiro || null,
        iban: extractedData.supplier.iban || null,
        swift_bic: extractedData.supplier.bic || null,
        organization_id: currentOrganization.id,
      };

      const result = await dispatch(createSupplier(supplierData)).unwrap();
      setSelectedSupplierId(result.id);
      toast.success(t('suppliers.created'));
      return result;
    } catch (err) {
      toast.error(err?.message || t('suppliers.createError'));
      return null;
    } finally {
      setCreatingSupplier(false);
    }
  };

  // Handle confirm and create invoice directly
  const handleConfirm = async () => {
    if (!extractedData || !currentOrganization?.id) return;

    let finalSupplierId = selectedSupplierId;

    // If creating new supplier
    if (selectedSupplierId === 'new' && extractedData.supplier?.name) {
      const newSupplier = await handleCreateSupplier();
      if (newSupplier) {
        finalSupplierId = newSupplier.id;
      } else {
        return; // Failed to create supplier
      }
    }

    // Validate required fields
    if (!finalSupplierId) {
      toast.error(t('supplierInvoices.errors.supplierRequired'));
      return;
    }

    if (!extractedData.invoice?.invoice_number?.trim()) {
      toast.error(t('supplierInvoices.errors.invoiceNumberRequired'));
      return;
    }

    const lineItems = extractedData.line_items || [];
    const validLines = lineItems.filter((l) => l.account_id);
    if (validLines.length === 0) {
      toast.error(t('supplierInvoices.errors.linesRequired'));
      return;
    }

    setCreatingSupplier(true); // Reuse this for loading state

    try {
      // Build invoice data in the format expected by the API
      const invoiceData = {
        organization_id: currentOrganization.id,
        supplier_id: finalSupplierId,
        invoice_number: extractedData.invoice.invoice_number.trim(),
        invoice_date: extractedData.invoice.invoice_date || new Date().toISOString().split('T')[0],
        due_date: extractedData.invoice.due_date || '',
        description: extractedData.invoice.description || '',
        currency: extractedData.invoice.currency || 'SEK',
        payment_reference: extractedData.invoice.payment_reference || '',
        lines: validLines.map((item) => ({
          account_id: item.account_id,
          description: item.description || '',
          quantity: parseFloat(item.quantity) || 1,
          unit_price: parseFloat(item.unit_price) || 0,
          amount: parseFloat(item.amount) || 0,
          vat_rate: parseFloat(item.vat_rate) || 25,
          vat_amount: parseFloat(item.vat_amount) || 0,
        })),
      };

      await dispatch(createSupplierInvoice(invoiceData)).unwrap();
      toast.success(t('supplierInvoices.createSuccess'));
      
      // Call callback if provided
      if (onInvoiceCreated) {
        onInvoiceCreated();
      }
      
      handleClose();
    } catch (err) {
      const errorMsg = typeof err === 'string' ? err : err?.message || 'An error occurred';
      let displayError = errorMsg;
      
      if (errorMsg.includes('unique_supplier_invoice_number')) {
        displayError = t('supplierInvoices.errors.duplicateInvoiceNumber');
      }
      
      toast.error(displayError);
    } finally {
      setCreatingSupplier(false);
    }
  };

  // Render upload step
  const renderUploadStep = () => (
    <div className="p-6">
      {/* Drag and drop area */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        data-cy="ocr-upload-dropzone"
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
          transition-colors duration-200
          ${dragActive
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
            : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500'
          }
          ${file ? 'bg-green-50 dark:bg-green-900/20 border-green-500' : ''}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={Object.values(ACCEPTED_FILE_TYPES).flat().join(',')}
          onChange={handleInputChange}
          className="hidden"
          data-cy="ocr-upload-input"
        />

        {!file ? (
          <>
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              stroke="currentColor"
              fill="none"
              viewBox="0 0 48 48"
            >
              <path
                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <p className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
              {t('ocrUpload.dropzone.title')}
            </p>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {t('ocrUpload.dropzone.subtitle')}
            </p>
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
              {t('ocrUpload.dropzone.fileTypes')}
            </p>
          </>
        ) : (
          <div className="flex items-center justify-center space-x-4">
            {/* File thumbnail */}
            {filePreview?.type === 'image' && (
              <img
                src={filePreview.url}
                alt="Preview"
                className="h-24 w-24 object-cover rounded"
              />
            )}
            {filePreview?.type === 'pdf' && (
              <div className="h-24 w-24 bg-red-100 dark:bg-red-900/30 rounded flex items-center justify-center">
                <svg className="h-12 w-12 text-red-600 dark:text-red-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                </svg>
              </div>
            )}
            <div className="text-left">
              <p className="text-sm font-medium text-gray-900 dark:text-white" data-cy="selected-file-name">
                {file.name}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {(file.size / 1024).toFixed(1)} KB
              </p>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setFile(null);
                  setFilePreview(null);
                }}
                className="mt-1 text-xs text-red-600 hover:text-red-700 dark:text-red-400"
                data-cy="remove-file-button"
              >
                {t('common.remove')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="mt-6 flex justify-end space-x-3">
        <button
          type="button"
          onClick={handleClose}
          className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
          data-cy="ocr-cancel-button"
        >
          {t('common.cancel')}
        </button>
        <button
          type="button"
          onClick={handleProcessFile}
          disabled={!file || loading}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          data-cy="ocr-process-button"
        >
          {t('ocrUpload.processButton')}
        </button>
      </div>
    </div>
  );

  // Render processing step
  const renderProcessingStep = () => (
    <div className="p-6 text-center" data-cy="ocr-processing-state">
      <div className="animate-spin mx-auto h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full"></div>
      <p className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
        {t(`ocrUpload.processing.${processingStep}`)}
      </p>
      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
        {t('ocrUpload.processing.pleaseWait')}
      </p>
    </div>
  );

  // Render review step (side-by-side view)
  const renderReviewStep = () => (
    <div className="flex flex-col lg:flex-row h-full" data-cy="ocr-review-state">
      {/* Document Preview Side */}
      <div className="lg:w-1/2 border-b lg:border-b-0 lg:border-r border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            {t('ocrUpload.documentPreview')}
          </h3>
          <button
            type="button"
            onClick={() => setIsPreviewExpanded(true)}
            className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
            data-cy="expand-preview-button"
          >
            {t('ocrUpload.expandPreview')}
          </button>
        </div>
        <DocumentPreview
          preview={filePreview}
          fileName={file?.name}
          onExpand={() => setIsPreviewExpanded(true)}
        />
      </div>

      {/* Extracted Data Form Side */}
      <div className="lg:w-1/2 p-4 overflow-auto">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          {t('ocrUpload.extractedData')}
        </h3>
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-md">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}
        <ExtractedDataForm
          data={extractedData}
          matchedSupplier={matchedSupplier}
          onDataUpdate={handleDataUpdate}
          showSupplierSection={false}
        />
        
        {/* Action buttons */}
        <div className="mt-6 flex justify-end space-x-3 sticky bottom-0 bg-white dark:bg-gray-800 py-4">
          <button
            type="button"
            onClick={() => setStep('upload')}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
            data-cy="ocr-back-button"
          >
            {t('common.back')}
          </button>
          <button
            type="button"
            onClick={handleProceedToSupplier}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            data-cy="ocr-next-button"
          >
            {t('ocrUpload.nextSupplier')}
          </button>
        </div>
      </div>

      {/* Expanded Preview Modal */}
      {isPreviewExpanded && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center"
          onClick={() => setIsPreviewExpanded(false)}
          data-cy="expanded-preview-modal"
        >
          <div className="max-w-4xl max-h-[90vh] overflow-auto bg-white dark:bg-gray-800 rounded-lg p-4">
            <DocumentPreview
              preview={filePreview}
              fileName={file?.name}
              expanded
            />
          </div>
          <button
            type="button"
            onClick={() => setIsPreviewExpanded(false)}
            className="absolute top-4 right-4 text-white hover:text-gray-300"
            data-cy="close-expanded-preview"
          >
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );

  // Render supplier selection/creation step
  const renderSupplierStep = () => {
    const extractedSupplier = extractedData?.supplier || {};
    const displayedSuppliers = filteredSuppliers();
    const hasExactMatch = displayedSuppliers.some(s => s.matchScore >= 0.95);

    return (
      <div className="flex flex-col lg:flex-row h-full" data-cy="ocr-supplier-state">
        {/* Document Preview Side (smaller) */}
        <div className="lg:w-1/3 border-b lg:border-b-0 lg:border-r border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              {t('ocrUpload.documentPreview')}
            </h3>
            <button
              type="button"
              onClick={() => setIsPreviewExpanded(true)}
              className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
            >
              {t('ocrUpload.expandPreview')}
            </button>
          </div>
          <DocumentPreview
            preview={filePreview}
            fileName={file?.name}
            onExpand={() => setIsPreviewExpanded(true)}
          />
        </div>

        {/* Supplier Selection Side */}
        <div className="lg:w-2/3 p-4 overflow-auto">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            {t('ocrUpload.selectSupplier')}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            {t('ocrUpload.selectSupplierDescription')}
          </p>

          {/* Extracted Supplier Info */}
          {extractedSupplier.name && (
            <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <h4 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">
                {t('ocrUpload.extractedSupplierInfo')}
              </h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-500 dark:text-gray-400">{t('suppliers.name')}:</span>
                  <span className="ml-2 text-gray-900 dark:text-white font-medium">{extractedSupplier.name}</span>
                </div>
                {extractedSupplier.organization_number && (
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">{t('suppliers.organizationNumber')}:</span>
                    <span className="ml-2 text-gray-900 dark:text-white">{extractedSupplier.organization_number}</span>
                  </div>
                )}
                {extractedSupplier.address && (
                  <div className="col-span-2">
                    <span className="text-gray-500 dark:text-gray-400">{t('suppliers.address')}:</span>
                    <span className="ml-2 text-gray-900 dark:text-white">
                      {extractedSupplier.address}{extractedSupplier.postal_code ? `, ${extractedSupplier.postal_code}` : ''}{extractedSupplier.city ? ` ${extractedSupplier.city}` : ''}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Search Input */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('ocrUpload.searchSuppliers')}
            </label>
            <input
              type="text"
              value={supplierSearchQuery}
              onChange={(e) => setSupplierSearchQuery(e.target.value)}
              placeholder={t('ocrUpload.searchSuppliersPlaceholder')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              data-cy="supplier-search-input"
            />
          </div>

          {/* Supplier List */}
          <div className="space-y-2 max-h-[300px] overflow-auto">
            {displayedSuppliers.length > 0 ? (
              displayedSuppliers.map((supplier) => (
                <div
                  key={supplier.id}
                  onClick={() => setSelectedSupplierId(supplier.id)}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedSupplierId === supplier.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                      : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600'
                  }`}
                  data-cy={`supplier-option-${supplier.id}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        selectedSupplierId === supplier.id
                          ? 'border-blue-500 bg-blue-500'
                          : 'border-gray-300 dark:border-gray-600'
                      }`}>
                        {selectedSupplierId === supplier.id && (
                          <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{supplier.name}</p>
                        {supplier.organization_number && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">{supplier.organization_number}</p>
                        )}
                      </div>
                    </div>
                    {supplier.matchScore >= 0.8 && (
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        supplier.matchScore >= 0.95 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' 
                          : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                      }`}>
                        {supplier.matchScore >= 0.95 ? t('ocrUpload.exactMatch') : t('ocrUpload.partialMatch')}
                      </span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                {t('ocrUpload.noSuppliersFound')}
              </p>
            )}
          </div>

          {/* Create New Supplier Option */}
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div
              onClick={() => setSelectedSupplierId('new')}
              className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                selectedSupplierId === 'new'
                  ? 'border-green-500 bg-green-50 dark:bg-green-900/30'
                  : 'border-gray-200 dark:border-gray-700 hover:border-green-300 dark:hover:border-green-600'
              }`}
              data-cy="create-new-supplier-option"
            >
              <div className="flex items-center space-x-3">
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                  selectedSupplierId === 'new'
                    ? 'border-green-500 bg-green-500'
                    : 'border-gray-300 dark:border-gray-600'
                }`}>
                  {selectedSupplierId === 'new' && (
                    <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-green-700 dark:text-green-300">
                    {t('ocrUpload.createNewSupplier')}
                  </p>
                  {extractedSupplier.name && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {t('ocrUpload.willCreateSupplier', { name: extractedSupplier.name })}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="mt-6 flex justify-end space-x-3 sticky bottom-0 bg-white dark:bg-gray-800 py-4">
            <button
              type="button"
              onClick={() => setStep('review')}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
              data-cy="ocr-back-button"
            >
              {t('common.back')}
            </button>
            <button
              type="button"
              onClick={handleProceedToKontering}
              disabled={!selectedSupplierId}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              data-cy="ocr-next-button"
            >
              {t('ocrUpload.nextKontering')}
            </button>
          </div>
        </div>

        {/* Expanded Preview Modal */}
        {isPreviewExpanded && (
          <div
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center"
            onClick={() => setIsPreviewExpanded(false)}
          >
            <div className="max-w-4xl max-h-[90vh] overflow-auto bg-white dark:bg-gray-800 rounded-lg p-4">
              <DocumentPreview
                preview={filePreview}
                fileName={file?.name}
                expanded
              />
            </div>
            <button
              type="button"
              onClick={() => setIsPreviewExpanded(false)}
              className="absolute top-4 right-4 text-white hover:text-gray-300"
            >
              <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
      </div>
    );
  };

  // Render kontering step
  const renderKonteringStep = () => {
    const lineItems = extractedData?.line_items || [];
    const totals = extractedData?.totals || {};
    
    // Group accounts by type for easier selection
    const expenseAccounts = accounts.filter(a => 
      a.account_number?.startsWith('4') || 
      a.account_number?.startsWith('5') || 
      a.account_number?.startsWith('6') ||
      a.account_number?.startsWith('7')
    );

    return (
      <div className="flex flex-col lg:flex-row h-full" data-cy="ocr-kontering-state">
        {/* Document Preview Side (smaller) */}
        <div className="lg:w-1/3 border-b lg:border-b-0 lg:border-r border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              {t('ocrUpload.documentPreview')}
            </h3>
            <button
              type="button"
              onClick={() => setIsPreviewExpanded(true)}
              className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
            >
              {t('ocrUpload.expandPreview')}
            </button>
          </div>
          <DocumentPreview
            preview={filePreview}
            fileName={file?.name}
            onExpand={() => setIsPreviewExpanded(true)}
          />
          
          {/* Invoice Summary */}
          <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {extractedData?.supplier?.name || t('ocrUpload.unknownSupplier')}
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t('supplierInvoices.invoiceNumber')}: {extractedData?.invoice?.invoice_number || '-'}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t('supplierInvoices.invoiceDate')}: {extractedData?.invoice?.invoice_date || '-'}
            </p>
          </div>
        </div>

        {/* Kontering Form Side */}
        <div className="lg:w-2/3 p-4 overflow-auto">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            {t('ocrUpload.assignAccounts')}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            {t('ocrUpload.assignAccountsDescription')}
          </p>

          {/* Quick Set All Accounts */}
          {lineItems.length > 1 && (
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <label className="text-sm font-medium text-blue-800 dark:text-blue-300 whitespace-nowrap">
                  {t('ocrUpload.setAllAccounts')}:
                </label>
                <select
                  onChange={(e) => handleSetAllAccounts(e.target.value)}
                  className="flex-1 px-3 py-2 text-sm border border-blue-300 dark:border-blue-600 rounded-md 
                             bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  defaultValue=""
                  data-cy="set-all-accounts-select"
                >
                  <option value="">{t('ocrUpload.selectAccountPlaceholder')}</option>
                  {expenseAccounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.account_number} - {account.name}
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                {t('ocrUpload.setAllAccountsHint')}
              </p>
            </div>
          )}

          {/* Line Items with Account Selection */}
          <div className="space-y-4">
            {lineItems.map((item, index) => (
              <div
                key={index}
                className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700/30"
                data-cy={`kontering-line-${index}`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                  {/* Description and amount */}
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {item.description || t('ocrUpload.noDescription')}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {item.quantity} x {parseFloat(item.unit_price || 0).toFixed(2)} = {parseFloat(item.amount || 0).toFixed(2)} {extractedData?.invoice?.currency || 'SEK'}
                      {item.vat_rate > 0 && ` (${item.vat_rate}% ${t('common.vat')})`}
                    </p>
                    {item.suggested_account && (
                      <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                        {t('ocrUpload.aiSuggestion')}: {item.suggested_account} - {item.suggested_account_name}
                      </p>
                    )}
                  </div>

                  {/* Account selector */}
                  <div className="lg:w-72">
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                      {t('ocrUpload.selectAccount')}
                    </label>
                    <select
                      value={item.account_id || ''}
                      onChange={(e) => handleLineAccountChange(index, e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                      data-cy={`kontering-account-${index}`}
                    >
                      <option value="">{t('ocrUpload.selectAccountPlaceholder')}</option>
                      {expenseAccounts.map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.account_number} - {account.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="mt-6 p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-300">{t('invoices.subtotal')}:</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {parseFloat(totals.subtotal || 0).toFixed(2)} {extractedData?.invoice?.currency || 'SEK'}
              </span>
            </div>
            <div className="flex justify-between text-sm mt-1">
              <span className="text-gray-600 dark:text-gray-300">{t('common.vat')}:</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {parseFloat(totals.vat_amount || 0).toFixed(2)} {extractedData?.invoice?.currency || 'SEK'}
              </span>
            </div>
            <div className="flex justify-between text-base font-bold mt-2 pt-2 border-t border-gray-300 dark:border-gray-600">
              <span className="text-gray-900 dark:text-white">{t('invoices.total')}:</span>
              <span className="text-gray-900 dark:text-white">
                {parseFloat(totals.total_amount || 0).toFixed(2)} {extractedData?.invoice?.currency || 'SEK'}
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="mt-6 flex justify-end space-x-3 sticky bottom-0 bg-white dark:bg-gray-800 py-4">
            <button
              type="button"
              onClick={() => setStep('supplier')}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
              data-cy="ocr-back-button"
            >
              {t('common.back')}
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={creatingSupplier}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50"
              data-cy="ocr-confirm-button"
            >
              {creatingSupplier ? t('common.creating') : t('ocrUpload.confirmAndCreate')}
            </button>
          </div>
        </div>

        {/* Expanded Preview Modal */}
        {isPreviewExpanded && (
          <div
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center"
            onClick={() => setIsPreviewExpanded(false)}
          >
            <div className="max-w-4xl max-h-[90vh] overflow-auto bg-white dark:bg-gray-800 rounded-lg p-4">
              <DocumentPreview
                preview={filePreview}
                fileName={file?.name}
                expanded
              />
            </div>
            <button
              type="button"
              onClick={() => setIsPreviewExpanded(false)}
              className="absolute top-4 right-4 text-white hover:text-gray-300"
            >
              <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      data-cy="ocr-upload-modal"
    >
      <div className="flex min-h-full items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/50 transition-opacity"
          onClick={handleClose}
        />

        {/* Modal */}
        <div className={`
          relative bg-white dark:bg-gray-800 rounded-lg shadow-xl 
          ${(step === 'review' || step === 'supplier' || step === 'kontering') ? 'w-full max-w-6xl h-[85vh]' : 'w-full max-w-lg'}
          transform transition-all
        `}>
          {/* Header with Step Indicator */}
          <div className="flex flex-col border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between p-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {t('ocrUpload.title')}
              </h2>
              <button
                type="button"
                onClick={handleClose}
                className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                data-cy="ocr-close-button"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Step Indicator - 3 steps: Review → Supplier → Kontering */}
            {step !== 'upload' && step !== 'processing' && (
              <div className="px-4 pb-3">
                <div className="flex items-center justify-center space-x-2">
                  {/* Step 1: Review */}
                  <div className={`flex items-center ${step === 'review' ? 'text-blue-600' : 'text-green-600'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      step === 'review' ? 'bg-blue-600 text-white' : 'bg-green-600 text-white'
                    }`}>
                      {step === 'review' ? '1' : '✓'}
                    </div>
                    <span className="ml-2 text-sm font-medium hidden sm:inline">{t('ocrUpload.steps.review')}</span>
                  </div>
                  
                  <div className={`w-8 h-0.5 ${step !== 'review' ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}`} />
                  
                  {/* Step 2: Supplier */}
                  <div className={`flex items-center ${
                    step === 'supplier' ? 'text-blue-600' : 
                    step === 'kontering' ? 'text-green-600' : 
                    'text-gray-400 dark:text-gray-500'
                  }`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      step === 'supplier' ? 'bg-blue-600 text-white' : 
                      step === 'kontering' ? 'bg-green-600 text-white' : 
                      'bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-400'
                    }`}>
                      {step === 'kontering' ? '✓' : '2'}
                    </div>
                    <span className="ml-2 text-sm font-medium hidden sm:inline">{t('ocrUpload.steps.supplier')}</span>
                  </div>
                  
                  <div className={`w-8 h-0.5 ${step === 'kontering' ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}`} />
                  
                  {/* Step 3: Kontering */}
                  <div className={`flex items-center ${step === 'kontering' ? 'text-blue-600' : 'text-gray-400 dark:text-gray-500'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      step === 'kontering' ? 'bg-blue-600 text-white' : 'bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-400'
                    }`}>
                      3
                    </div>
                    <span className="ml-2 text-sm font-medium hidden sm:inline">{t('ocrUpload.steps.kontering')}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Content */}
          <div className={(step === 'review' || step === 'supplier' || step === 'kontering') ? 'h-[calc(85vh-6rem)] overflow-hidden' : ''}>
            {step === 'upload' && renderUploadStep()}
            {step === 'processing' && renderProcessingStep()}
            {step === 'review' && renderReviewStep()}
            {step === 'supplier' && renderSupplierStep()}
            {step === 'kontering' && renderKonteringStep()}
          </div>
        </div>
      </div>
    </div>
  );
}
