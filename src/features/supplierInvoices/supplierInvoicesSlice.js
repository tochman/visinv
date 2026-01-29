import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { SupplierInvoice } from '../../services/resources/SupplierInvoice';

// Async thunks

/**
 * Fetch all supplier invoices for an organization
 * @param {Object} options - Query options
 */
export const fetchSupplierInvoices = createAsyncThunk(
  'supplierInvoices/fetchSupplierInvoices',
  async (options = {}, { rejectWithValue }) => {
    const { data, error } = await SupplierInvoice.index(options);
    if (error) return rejectWithValue(error.message);
    return data;
  }
);

/**
 * Fetch a single supplier invoice by ID
 * @param {string} id - Supplier invoice ID
 */
export const fetchSupplierInvoice = createAsyncThunk(
  'supplierInvoices/fetchSupplierInvoice',
  async (id, { rejectWithValue }) => {
    const { data, error } = await SupplierInvoice.show(id);
    if (error) return rejectWithValue(error.message);
    return data;
  }
);

/**
 * Create a new supplier invoice
 * @param {Object} invoiceData - Supplier invoice data including lines
 */
export const createSupplierInvoice = createAsyncThunk(
  'supplierInvoices/createSupplierInvoice',
  async (invoiceData, { rejectWithValue }) => {
    const { data, error } = await SupplierInvoice.create(invoiceData);
    if (error) return rejectWithValue(error.message);
    return data;
  }
);

/**
 * Update an existing supplier invoice
 * @param {Object} params - Update parameters
 * @param {string} params.id - Supplier invoice ID
 * @param {Object} params.updates - Updated invoice data
 */
export const updateSupplierInvoice = createAsyncThunk(
  'supplierInvoices/updateSupplierInvoice',
  async ({ id, ...updates }, { rejectWithValue }) => {
    const { data, error } = await SupplierInvoice.update(id, updates);
    if (error) return rejectWithValue(error.message);
    return data;
  }
);

/**
 * Approve a supplier invoice and create journal entry
 * @param {Object} params - Approval parameters
 * @param {string} params.id - Supplier invoice ID
 * @param {string} params.fiscalYearId - Fiscal year ID
 */
export const approveSupplierInvoice = createAsyncThunk(
  'supplierInvoices/approveSupplierInvoice',
  async ({ id, fiscalYearId }, { rejectWithValue }) => {
    const { data, error } = await SupplierInvoice.approve(id, fiscalYearId);
    if (error) return rejectWithValue(error.message);
    return data;
  }
);

/**
 * Mark a supplier invoice as paid
 * @param {Object} params - Payment parameters
 * @param {string} params.id - Supplier invoice ID
 * @param {Object} params.paymentData - Payment details
 */
export const markSupplierInvoicePaid = createAsyncThunk(
  'supplierInvoices/markSupplierInvoicePaid',
  async ({ id, paymentData }, { rejectWithValue }) => {
    const { data, error } = await SupplierInvoice.markPaid(id, paymentData);
    if (error) return rejectWithValue(error.message);
    return data;
  }
);

/**
 * Cancel a supplier invoice
 * @param {string} id - Supplier invoice ID
 */
export const cancelSupplierInvoice = createAsyncThunk(
  'supplierInvoices/cancelSupplierInvoice',
  async (id, { rejectWithValue }) => {
    const { data, error } = await SupplierInvoice.cancel(id);
    if (error) return rejectWithValue(error.message);
    return data;
  }
);

/**
 * Delete a supplier invoice
 * @param {string} id - Supplier invoice ID
 */
export const deleteSupplierInvoice = createAsyncThunk(
  'supplierInvoices/deleteSupplierInvoice',
  async (id, { rejectWithValue }) => {
    const { data, error} = await SupplierInvoice.delete(id);
    if (error) return rejectWithValue(error.message);
    return id;
  }
);

// Initial state
const initialState = {
  items: [],
  currentInvoice: null,
  loading: false,
  submitting: false,
  error: null,
};

// Slice
const supplierInvoicesSlice = createSlice({
  name: 'supplierInvoices',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearCurrentInvoice: (state) => {
      state.currentInvoice = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchSupplierInvoices
      .addCase(fetchSupplierInvoices.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSupplierInvoices.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchSupplierInvoices.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // fetchSupplierInvoice
      .addCase(fetchSupplierInvoice.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSupplierInvoice.fulfilled, (state, action) => {
        state.loading = false;
        state.currentInvoice = action.payload;
      })
      .addCase(fetchSupplierInvoice.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // createSupplierInvoice
      .addCase(createSupplierInvoice.pending, (state) => {
        state.submitting = true;
        state.error = null;
      })
      .addCase(createSupplierInvoice.fulfilled, (state, action) => {
        state.submitting = false;
        state.items.unshift(action.payload);
        state.currentInvoice = action.payload;
      })
      .addCase(createSupplierInvoice.rejected, (state, action) => {
        state.submitting = false;
        state.error = action.payload;
      })
      // updateSupplierInvoice
      .addCase(updateSupplierInvoice.pending, (state) => {
        state.submitting = true;
        state.error = null;
      })
      .addCase(updateSupplierInvoice.fulfilled, (state, action) => {
        state.submitting = false;
        const index = state.items.findIndex((inv) => inv.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
        state.currentInvoice = action.payload;
      })
      .addCase(updateSupplierInvoice.rejected, (state, action) => {
        state.submitting = false;
        state.error = action.payload;
      })
      // approveSupplierInvoice
      .addCase(approveSupplierInvoice.pending, (state) => {
        state.submitting = true;
        state.error = null;
      })
      .addCase(approveSupplierInvoice.fulfilled, (state, action) => {
        state.submitting = false;
        const index = state.items.findIndex((inv) => inv.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
        state.currentInvoice = action.payload;
      })
      .addCase(approveSupplierInvoice.rejected, (state, action) => {
        state.submitting = false;
        state.error = action.payload;
      })
      // markSupplierInvoicePaid
      .addCase(markSupplierInvoicePaid.pending, (state) => {
        state.submitting = true;
        state.error = null;
      })
      .addCase(markSupplierInvoicePaid.fulfilled, (state, action) => {
        state.submitting = false;
        const index = state.items.findIndex((inv) => inv.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
        state.currentInvoice = action.payload;
      })
      .addCase(markSupplierInvoicePaid.rejected, (state, action) => {
        state.submitting = false;
        state.error = action.payload;
      })
      // cancelSupplierInvoice
      .addCase(cancelSupplierInvoice.pending, (state) => {
        state.submitting = true;
        state.error = null;
      })
      .addCase(cancelSupplierInvoice.fulfilled, (state, action) => {
        state.submitting = false;
        const index = state.items.findIndex((inv) => inv.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
        state.currentInvoice = action.payload;
      })
      .addCase(cancelSupplierInvoice.rejected, (state, action) => {
        state.submitting = false;
        state.error = action.payload;
      })
      // deleteSupplierInvoice
      .addCase(deleteSupplierInvoice.pending, (state) => {
        state.submitting = true;
        state.error = null;
      })
      .addCase(deleteSupplierInvoice.fulfilled, (state, action) => {
        state.submitting = false;
        state.items = state.items.filter((inv) => inv.id !== action.payload);
        if (state.currentInvoice?.id === action.payload) {
          state.currentInvoice = null;
        }
      })
      .addCase(deleteSupplierInvoice.rejected, (state, action) => {
        state.submitting = false;
        state.error = action.payload;
      });
  },
});

export const { clearError, clearCurrentInvoice } = supplierInvoicesSlice.actions;
export default supplierInvoicesSlice.reducer;
