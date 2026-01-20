import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { supabase } from '../../services/supabase';

// Async thunks
export const fetchInvoices = createAsyncThunk(
  'invoices/fetchInvoices',
  async (_, { rejectWithValue }) => {
    const { data, error } = await supabase
      .from('invoices')
      .select('*, client:clients(*), invoice_rows(*)')
      .order('created_at', { ascending: false });
    
    if (error) return rejectWithValue(error.message);
    return data;
  }
);

export const createInvoice = createAsyncThunk(
  'invoices/createInvoice',
  async (invoiceData, { rejectWithValue }) => {
    const { data, error } = await supabase
      .from('invoices')
      .insert(invoiceData)
      .select()
      .single();
    
    if (error) return rejectWithValue(error.message);
    return data;
  }
);

export const updateInvoice = createAsyncThunk(
  'invoices/updateInvoice',
  async ({ id, updates }, { rejectWithValue }) => {
    const { data, error } = await supabase
      .from('invoices')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) return rejectWithValue(error.message);
    return data;
  }
);

export const deleteInvoice = createAsyncThunk(
  'invoices/deleteInvoice',
  async (id, { rejectWithValue }) => {
    const { error } = await supabase
      .from('invoices')
      .delete()
      .eq('id', id);
    
    if (error) return rejectWithValue(error.message);
    return id;
  }
);

const invoicesSlice = createSlice({
  name: 'invoices',
  initialState: {
    items: [],
    loading: false,
    error: null,
    selectedInvoice: null,
  },
  reducers: {
    setSelectedInvoice: (state, action) => {
      state.selectedInvoice = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Invoices
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
      // Create Invoice
      .addCase(createInvoice.fulfilled, (state, action) => {
        state.items.unshift(action.payload);
      })
      // Update Invoice
      .addCase(updateInvoice.fulfilled, (state, action) => {
        const index = state.items.findIndex(i => i.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
      })
      // Delete Invoice
      .addCase(deleteInvoice.fulfilled, (state, action) => {
        state.items = state.items.filter(i => i.id !== action.payload);
      });
  },
});

export const { setSelectedInvoice, clearError } = invoicesSlice.actions;
export default invoicesSlice.reducer;
