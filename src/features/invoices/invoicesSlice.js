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

export const createInvoice = createAsyncThunk(
  'invoices/createInvoice',
  async (invoiceData, { rejectWithValue }) => {
    const { data, error } = await Invoice.create(invoiceData);
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
    const { error } = await Invoice.destroy(id);
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

export const { clearError, clearCurrentInvoice } = invoicesSlice.actions;
export default invoicesSlice.reducer;
