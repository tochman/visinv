import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { RecurringInvoice } from '../../services/resources/RecurringInvoice';

/**
 * Fetch all recurring invoices for the current organization
 */
export const fetchRecurringInvoices = createAsyncThunk(
  'recurringInvoices/fetchRecurringInvoices',
  async (organizationId, { rejectWithValue }) => {
    if (!organizationId) {
      return rejectWithValue('No organization selected');
    }
    
    const { data, error } = await RecurringInvoice.index({ organizationId });
    if (error) return rejectWithValue(error.message);
    return data;
  }
);

/**
 * Fetch a single recurring invoice by ID
 */
export const fetchRecurringInvoice = createAsyncThunk(
  'recurringInvoices/fetchRecurringInvoice',
  async (id, { rejectWithValue }) => {
    const { data, error } = await RecurringInvoice.show(id);
    if (error) return rejectWithValue(error.message);
    return data;
  }
);

/**
 * Create a new recurring invoice schedule
 */
export const createRecurringInvoice = createAsyncThunk(
  'recurringInvoices/createRecurringInvoice',
  async ({ organizationId, ...data }, { rejectWithValue }) => {
    if (!organizationId) {
      return rejectWithValue('No organization selected');
    }
    
    const { data: created, error } = await RecurringInvoice.create({ ...data, organizationId });
    if (error) return rejectWithValue(error.message);
    return created;
  }
);

/**
 * Update an existing recurring invoice schedule
 */
export const updateRecurringInvoice = createAsyncThunk(
  'recurringInvoices/updateRecurringInvoice',
  async ({ id, updates }, { rejectWithValue }) => {
    const { data, error } = await RecurringInvoice.update(id, updates);
    if (error) return rejectWithValue(error.message);
    return data;
  }
);

/**
 * Delete a recurring invoice schedule
 */
export const deleteRecurringInvoice = createAsyncThunk(
  'recurringInvoices/deleteRecurringInvoice',
  async (id, { rejectWithValue }) => {
    const { error } = await RecurringInvoice.delete(id);
    if (error) return rejectWithValue(error.message);
    return id;
  }
);

/**
 * Pause a recurring invoice schedule
 */
export const pauseRecurringInvoice = createAsyncThunk(
  'recurringInvoices/pauseRecurringInvoice',
  async (id, { rejectWithValue }) => {
    const { data, error } = await RecurringInvoice.pause(id);
    if (error) return rejectWithValue(error.message);
    return data;
  }
);

/**
 * Resume a paused recurring invoice schedule
 */
export const resumeRecurringInvoice = createAsyncThunk(
  'recurringInvoices/resumeRecurringInvoice',
  async (id, { rejectWithValue }) => {
    const { data, error } = await RecurringInvoice.resume(id);
    if (error) return rejectWithValue(error.message);
    return data;
  }
);

/**
 * Cancel a recurring invoice schedule
 */
export const cancelRecurringInvoice = createAsyncThunk(
  'recurringInvoices/cancelRecurringInvoice',
  async (id, { rejectWithValue }) => {
    const { data, error } = await RecurringInvoice.cancel(id);
    if (error) return rejectWithValue(error.message);
    return data;
  }
);

/**
 * Generate an invoice from a recurring schedule
 */
export const generateInvoiceFromRecurring = createAsyncThunk(
  'recurringInvoices/generateInvoice',
  async (id, { rejectWithValue }) => {
    const { data, error } = await RecurringInvoice.generateInvoice(id);
    if (error) return rejectWithValue(error.message);
    return { recurringInvoiceId: id, invoice: data };
  }
);

const recurringInvoicesSlice = createSlice({
  name: 'recurringInvoices',
  initialState: {
    items: [],
    currentItem: null,
    loading: false,
    error: null,
    generatingInvoice: false,
  },
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearCurrentItem: (state) => {
      state.currentItem = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch all
      .addCase(fetchRecurringInvoices.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchRecurringInvoices.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchRecurringInvoices.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Fetch single
      .addCase(fetchRecurringInvoice.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchRecurringInvoice.fulfilled, (state, action) => {
        state.loading = false;
        state.currentItem = action.payload;
      })
      .addCase(fetchRecurringInvoice.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Create
      .addCase(createRecurringInvoice.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createRecurringInvoice.fulfilled, (state, action) => {
        state.loading = false;
        state.items.unshift(action.payload);
      })
      .addCase(createRecurringInvoice.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Update
      .addCase(updateRecurringInvoice.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateRecurringInvoice.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.items.findIndex(item => item.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
        if (state.currentItem?.id === action.payload.id) {
          state.currentItem = action.payload;
        }
      })
      .addCase(updateRecurringInvoice.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Delete
      .addCase(deleteRecurringInvoice.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteRecurringInvoice.fulfilled, (state, action) => {
        state.loading = false;
        state.items = state.items.filter(item => item.id !== action.payload);
        if (state.currentItem?.id === action.payload) {
          state.currentItem = null;
        }
      })
      .addCase(deleteRecurringInvoice.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Pause
      .addCase(pauseRecurringInvoice.fulfilled, (state, action) => {
        const index = state.items.findIndex(item => item.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
      })
      // Resume
      .addCase(resumeRecurringInvoice.fulfilled, (state, action) => {
        const index = state.items.findIndex(item => item.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
      })
      // Cancel
      .addCase(cancelRecurringInvoice.fulfilled, (state, action) => {
        const index = state.items.findIndex(item => item.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
      })
      // Generate invoice
      .addCase(generateInvoiceFromRecurring.pending, (state) => {
        state.generatingInvoice = true;
        state.error = null;
      })
      .addCase(generateInvoiceFromRecurring.fulfilled, (state, action) => {
        state.generatingInvoice = false;
        // Update the recurring invoice in the list (invoice_count, next_invoice_date, etc.)
        const index = state.items.findIndex(item => item.id === action.payload.recurringInvoiceId);
        if (index !== -1) {
          state.items[index].invoice_count = (state.items[index].invoice_count || 0) + 1;
          state.items[index].last_invoice_date = new Date().toISOString().split('T')[0];
        }
      })
      .addCase(generateInvoiceFromRecurring.rejected, (state, action) => {
        state.generatingInvoice = false;
        state.error = action.payload;
      });
  },
});

export const { clearError, clearCurrentItem } = recurringInvoicesSlice.actions;
export default recurringInvoicesSlice.reducer;
