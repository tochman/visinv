import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { supabase } from '../../services/supabase';
import { createInvoice } from '../invoices/invoicesSlice';

export const fetchSubscription = createAsyncThunk(
  'subscriptions/fetchSubscription',
  async (userId, { rejectWithValue }) => {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      return rejectWithValue(error.message);
    }
    return data || null;
  }
);

export const fetchInvoiceCount = createAsyncThunk(
  'subscriptions/fetchInvoiceCount',
  async (userId, { rejectWithValue }) => {
    const { count, error } = await supabase
      .from('invoices')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);
    
    if (error) return rejectWithValue(error.message);
    return count;
  }
);

const subscriptionsSlice = createSlice({
  name: 'subscriptions',
  initialState: {
    subscription: null,
    invoiceCount: 0,
    loading: false,
    error: null,
    isPremium: false,
  },
  reducers: {
    setSubscription: (state, action) => {
      state.subscription = action.payload;
      state.isPremium = action.payload?.status === 'active';
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSubscription.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchSubscription.fulfilled, (state, action) => {
        state.loading = false;
        state.subscription = action.payload;
        state.isPremium = action.payload?.status === 'active';
      })
      .addCase(fetchSubscription.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchInvoiceCount.fulfilled, (state, action) => {
        state.invoiceCount = action.payload;
      })
      .addCase(createInvoice.fulfilled, (state) => {
        state.invoiceCount += 1;
      });
  },
});

export const { setSubscription, clearError } = subscriptionsSlice.actions;
export default subscriptionsSlice.reducer;
