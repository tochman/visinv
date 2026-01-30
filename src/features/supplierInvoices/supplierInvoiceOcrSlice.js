import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { SupplierInvoice } from '../../services/resources/SupplierInvoice';

/**
 * Redux slice for OCR-based invoice data extraction
 * US-263: Supplier Invoice & Receipt OCR Upload
 */

// Processing step constants
export const PROCESSING_STEPS = {
  IDLE: 'idle',
  UPLOADING: 'uploading',
  EXTRACTING: 'extracting',
  ANALYZING: 'analyzing',
  MATCHING: 'matching',
  COMPLETE: 'complete',
};

// Async thunks

/**
 * Upload document and extract invoice data using AI
 * @param {Object} params - Upload parameters
 * @param {string} params.fileBase64 - Base64 encoded file content
 * @param {string} params.fileType - MIME type of the file
 * @param {string} params.fileName - Original filename
 * @param {string} params.organizationId - Organization ID
 * @param {Array} params.existingSuppliers - List of existing suppliers for matching
 */
export const uploadAndExtract = createAsyncThunk(
  'supplierInvoiceOcr/uploadAndExtract',
  async ({ fileBase64, fileType, fileName, organizationId, existingSuppliers }, { rejectWithValue, dispatch }) => {
    try {
      // Update step to extracting
      dispatch(setProcessingStep(PROCESSING_STEPS.EXTRACTING));

      // Call AI extraction
      const { data, error } = await SupplierInvoice.extractInvoiceData({
        fileBase64,
        fileType,
        organizationId,
        existingSuppliers,
      });

      if (error) {
        return rejectWithValue(error.message || 'Failed to extract invoice data');
      }

      // Update step to matching
      dispatch(setProcessingStep(PROCESSING_STEPS.MATCHING));

      // Check for matched supplier
      const matchedSupplier = data.matched_supplier || null;

      // Complete
      dispatch(setProcessingStep(PROCESSING_STEPS.COMPLETE));

      return {
        extractedData: data,
        matchedSupplier,
        fileName,
        fileType,
      };
    } catch (err) {
      return rejectWithValue(err.message || 'An unexpected error occurred');
    }
  }
);

/**
 * Upload document to storage
 * @param {Object} params - Upload parameters
 * @param {string} params.organizationId - Organization ID
 * @param {File} params.file - File to upload
 * @param {string} params.fileName - Original filename
 */
export const uploadDocument = createAsyncThunk(
  'supplierInvoiceOcr/uploadDocument',
  async ({ organizationId, file, fileName }, { rejectWithValue }) => {
    const { data, error } = await SupplierInvoice.uploadDocument(organizationId, file, fileName);
    if (error) {
      return rejectWithValue(error.message || 'Failed to upload document');
    }
    return data;
  }
);

/**
 * Create invoice from extracted OCR data
 * @param {Object} params - Creation parameters
 * @param {Object} params.extractedData - Extracted invoice data
 * @param {Object} params.options - Additional options (organizationId, attachment, supplierId)
 */
export const createFromExtractedData = createAsyncThunk(
  'supplierInvoiceOcr/createFromExtractedData',
  async ({ extractedData, options }, { rejectWithValue }) => {
    const { data, error } = await SupplierInvoice.createFromOcr(extractedData, options);
    if (error) {
      return rejectWithValue(error.message || 'Failed to create invoice');
    }
    return data;
  }
);

// Initial state
const initialState = {
  loading: false,
  error: null,
  processingStep: PROCESSING_STEPS.IDLE,
  extractedData: null,
  matchedSupplier: null,
  uploadedDocument: null,
  fileName: null,
  fileType: null,
};

// Slice
const supplierInvoiceOcrSlice = createSlice({
  name: 'supplierInvoiceOcr',
  initialState,
  reducers: {
    /**
     * Clear all OCR data
     */
    clearOcrData: (state) => {
      state.loading = false;
      state.error = null;
      state.processingStep = PROCESSING_STEPS.IDLE;
      state.extractedData = null;
      state.matchedSupplier = null;
      state.uploadedDocument = null;
      state.fileName = null;
      state.fileType = null;
    },
    /**
     * Set the current processing step
     */
    setProcessingStep: (state, action) => {
      state.processingStep = action.payload;
    },
    /**
     * Update extracted data (for user edits)
     */
    setExtractedData: (state, action) => {
      state.extractedData = action.payload;
    },
    /**
     * Set matched supplier
     */
    setMatchedSupplier: (state, action) => {
      state.matchedSupplier = action.payload;
    },
    /**
     * Set error message
     */
    setError: (state, action) => {
      state.error = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // uploadAndExtract
      .addCase(uploadAndExtract.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.processingStep = PROCESSING_STEPS.UPLOADING;
      })
      .addCase(uploadAndExtract.fulfilled, (state, action) => {
        state.loading = false;
        state.extractedData = action.payload.extractedData;
        state.matchedSupplier = action.payload.matchedSupplier;
        state.fileName = action.payload.fileName;
        state.fileType = action.payload.fileType;
        state.processingStep = PROCESSING_STEPS.COMPLETE;
      })
      .addCase(uploadAndExtract.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to extract invoice data';
        state.processingStep = PROCESSING_STEPS.IDLE;
      })
      // uploadDocument
      .addCase(uploadDocument.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(uploadDocument.fulfilled, (state, action) => {
        state.loading = false;
        state.uploadedDocument = action.payload;
      })
      .addCase(uploadDocument.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to upload document';
      })
      // createFromExtractedData
      .addCase(createFromExtractedData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createFromExtractedData.fulfilled, (state) => {
        state.loading = false;
        // Clear data after successful creation
        state.extractedData = null;
        state.matchedSupplier = null;
        state.uploadedDocument = null;
        state.processingStep = PROCESSING_STEPS.IDLE;
      })
      .addCase(createFromExtractedData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to create invoice';
      });
  },
});

// Export actions
export const {
  clearOcrData,
  setProcessingStep,
  setExtractedData,
  setMatchedSupplier,
  setError,
} = supplierInvoiceOcrSlice.actions;

// Selectors
export const selectOcrLoading = (state) => state.supplierInvoiceOcr?.loading ?? false;
export const selectOcrError = (state) => state.supplierInvoiceOcr?.error;
export const selectProcessingStep = (state) => state.supplierInvoiceOcr?.processingStep ?? PROCESSING_STEPS.IDLE;
export const selectExtractedData = (state) => state.supplierInvoiceOcr?.extractedData;
export const selectMatchedSupplier = (state) => state.supplierInvoiceOcr?.matchedSupplier;
export const selectUploadedDocument = (state) => state.supplierInvoiceOcr?.uploadedDocument;
export const selectFileName = (state) => state.supplierInvoiceOcr?.fileName;
export const selectFileType = (state) => state.supplierInvoiceOcr?.fileType;

// Export reducer
export default supplierInvoiceOcrSlice.reducer;
