import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { supabase } from '../../services/supabase';

export const fetchClients = createAsyncThunk(
  'clients/fetchClients',
  async (_, { rejectWithValue }) => {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('name');
    
    if (error) return rejectWithValue(error.message);
    return data;
  }
);

export const createClient = createAsyncThunk(
  'clients/createClient',
  async (clientData, { rejectWithValue }) => {
    const { data, error } = await supabase
      .from('clients')
      .insert(clientData)
      .select()
      .single();
    
    if (error) return rejectWithValue(error.message);
    return data;
  }
);

export const updateClient = createAsyncThunk(
  'clients/updateClient',
  async ({ id, updates }, { rejectWithValue }) => {
    const { data, error } = await supabase
      .from('clients')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) return rejectWithValue(error.message);
    return data;
  }
);

export const deleteClient = createAsyncThunk(
  'clients/deleteClient',
  async (id, { rejectWithValue }) => {
    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', id);
    
    if (error) return rejectWithValue(error.message);
    return id;
  }
);

const clientsSlice = createSlice({
  name: 'clients',
  initialState: {
    items: [],
    loading: false,
    error: null,
  },
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchClients.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchClients.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchClients.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(createClient.fulfilled, (state, action) => {
        state.items.push(action.payload);
      })
      .addCase(updateClient.fulfilled, (state, action) => {
        const index = state.items.findIndex(c => c.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
      })
      .addCase(deleteClient.fulfilled, (state, action) => {
        state.items = state.items.filter(c => c.id !== action.payload);
      });
  },
});

export const { clearError } = clientsSlice.actions;
export default clientsSlice.reducer;
