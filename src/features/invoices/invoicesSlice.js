import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { Invoice } from '../../services/resources';

export const fetchInvoices = createAsyncThunk(
  'invoices/fetchInvoices',
  async (_, { rejectWithValue }) => {
    const { data, error } = await Invoice.index();
    if (error) return rejectWithValue(error.message);
    return data;
  }
);

export const fetchInvoice = createAsyncThunk(
  'invoices/fetchInvoice',
  async (id, { rejectWithValue }) => {
    const { data, error } = await Invoice.show(id);
    if (error) return rejectWithValue(error.message);
    return data;
  }
);

export const checkInvoiceNumberExists = createAsyncThunk(
  'invoices/checkInvoiceNumberExists',
  async (invoiceNumber, { getState, rejectWithValue }) => {
    const { organizations } = getState();
    const currentOrganization = organizations?.currentOrganization;
    
    if (!currentOrganization) {
      return rejectWithValue('No organization found');
    }
    
    const { exists, error } = await Invoice.checkDuplicateNumber(
      invoiceNumber,
      currentOrganization.id
    );
    
    if (error) return rejectWithValue(error.message);
    return { invoiceNumber, exists };
  }
);

export const createInvoice = createAsyncThunk(
  'invoices/createInvoice',
  async (invoiceData, { getState, rejectWithValue }) => {
    // Get organization from Redux state - following architecture pattern
    const { organizations } = getState();
    const currentOrganization = organizations?.currentOrganization;
    
    if (!currentOrganization) {
      return rejectWithValue('No organization found');
    }
    
    // Pass organization data to Resource so it doesn't need to fetch it
    const { data, error } = await Invoice.create({
      ...invoiceData,
      organization: currentOrganization
    });
    if (error) return rejectWithValue(error.message);
    return data;
  }
);

export const updateInvoice = createAsyncThunk(
  'invoices/updateInvoice',
  async ({ id, updates }, { rejectWithValue }) => {
    const { data, error } = await Invoice.update(id, updates);
    if (error) return rejectWithValue(error.message);
    return data;
  }
);

export const deleteInvoice = createAsyncThunk(
  'invoices/deleteInvoice',
  async (id, { rejectWithValue }) => {
    const { error } = await Invoice.delete(id);
    if (error) return rejectWithValue(error.message);
    return id;
  }
);

export const markInvoiceAsSent = createAsyncThunk(
  'invoices/markAsSent',
  async (id, { rejectWithValue }) => {
    const { data, error } = await Invoice.markAsSent(id);
    if (error) return rejectWithValue(error.message);
    return data;
  }
);

export const markInvoiceAsPaid = createAsyncThunk(
  'invoices/markAsPaid',
  async ({ id, paidAt }, { rejectWithValue }) => {
    const { data, error } = await Invoice.markAsPaid(id, paidAt);
    if (error) return rejectWithValue(error.message);
    return data;
  }
);

const invoicesSlice = createSlice({
  name: 'invoices',
  initialState: {
    items: [],
    currentInvoice: null,
    loading: false,
    error: null,
  },
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearCurrentInvoice: (state) => {
      state.currentInvoice = null;
    },
    // Optimistic update for template selection (no loading state)
    setInvoiceTemplate: (state, action) => {
      const { invoiceId, templateId, template } = action.payload;
      const index = state.items.findIndex(item => item.id === invoiceId);
      if (index !== -1) {
        state.items[index].invoice_template_id = templateId;
        state.items[index].invoice_template = template;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchInvoices.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchInvoices.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchInvoices.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchInvoice.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchInvoice.fulfilled, (state, action) => {
        state.loading = false;
        state.currentInvoice = action.payload;
      })
      .addCase(fetchInvoice.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(createInvoice.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createInvoice.fulfilled, (state, action) => {
        state.loading = false;
        state.items.unshift(action.payload);
      })
      .addCase(createInvoice.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(updateInvoice.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateInvoice.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.items.findIndex(item => item.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
        if (state.currentInvoice?.id === action.payload.id) {
          state.currentInvoice = action.payload;
        }
      })
      .addCase(updateInvoice.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(deleteInvoice.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteInvoice.fulfilled, (state, action) => {
        state.loading = false;
        state.items = state.items.filter(item => item.id !== action.payload);
      })
      .addCase(deleteInvoice.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(markInvoiceAsSent.fulfilled, (state, action) => {
        const index = state.items.findIndex(item => item.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
      })
      .addCase(markInvoiceAsPaid.fulfilled, (state, action) => {
        const index = state.items.findIndex(item => item.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
      });
  },
});

export const { clearError, clearCurrentInvoice, setInvoiceTemplate } = invoicesSlice.actions;

// Optimistic update for template selection - updates UI immediately, saves in background
export const updateInvoiceTemplate = ({ invoiceId, templateId, template }) => async (dispatch) => {
  // Optimistic update - immediate UI change
  dispatch(setInvoiceTemplate({ invoiceId, templateId, template }));
  
  // Background save via Resource pattern
  const { error } = await Invoice.update(invoiceId, { invoice_template_id: templateId });
  if (error) {
    console.error('Failed to save template selection:', error);
    // Could dispatch a rollback action here if needed
  }
};

export default invoicesSlice.reducer;
