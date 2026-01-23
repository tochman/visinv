import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { Client } from '../../services/resources/Client';

export const fetchClients = createAsyncThunk(
  'clients/fetchClients',
  async (_, { rejectWithValue }) => {
    const { data, error } = await Client.index();
    if (error) return rejectWithValue(error.message);
    return data;
  }
);

export const createClient = createAsyncThunk(
  'clients/createClient',
  async (clientData, { rejectWithValue }) => {
    const { data, error } = await Client.create(clientData);
    if (error) return rejectWithValue(error.message);
    return data;
  }
);

export const updateClient = createAsyncThunk(
  'clients/updateClient',
  async ({ id, updates }, { rejectWithValue }) => {
    const { data, error } = await Client.update(id, updates);
    if (error) return rejectWithValue(error.message);
    return data;
  }
);

export const deleteClient = createAsyncThunk(
  'clients/deleteClient',
  async (id, { rejectWithValue }) => {
    const { error } = await Client.delete(id);
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
