import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { InvoiceTemplate } from '../../services/resources';

// Async thunks
export const fetchTemplates = createAsyncThunk(
  'invoiceTemplates/fetchTemplates',
  async (_, { rejectWithValue }) => {
    const { data, error } = await InvoiceTemplate.index();
    if (error) return rejectWithValue(error.message);
    return data;
  }
);

export const fetchTemplate = createAsyncThunk(
  'invoiceTemplates/fetchTemplate',
  async (id, { rejectWithValue }) => {
    const { data, error } = await InvoiceTemplate.show(id);
    if (error) return rejectWithValue(error.message);
    return data;
  }
);

export const createTemplate = createAsyncThunk(
  'invoiceTemplates/createTemplate',
  async (templateData, { rejectWithValue }) => {
    const { data, error } = await InvoiceTemplate.create(templateData);
    if (error) return rejectWithValue(error.message);
    return data;
  }
);

export const updateTemplate = createAsyncThunk(
  'invoiceTemplates/updateTemplate',
  async ({ id, updates }, { rejectWithValue }) => {
    const { data, error } = await InvoiceTemplate.update(id, updates);
    if (error) return rejectWithValue(error.message);
    return data;
  }
);

export const deleteTemplate = createAsyncThunk(
  'invoiceTemplates/deleteTemplate',
  async (id, { rejectWithValue }) => {
    const { error } = await InvoiceTemplate.destroy(id);
    if (error) return rejectWithValue(error.message);
    return id;
  }
);

export const cloneTemplate = createAsyncThunk(
  'invoiceTemplates/cloneTemplate',
  async ({ id, name }, { rejectWithValue }) => {
    const { data, error } = await InvoiceTemplate.clone(id, name);
    if (error) return rejectWithValue(error.message);
    return data;
  }
);

const invoiceTemplatesSlice = createSlice({
  name: 'invoiceTemplates',
  initialState: {
    items: [],
    currentTemplate: null,
    loading: false,
    error: null,
  },
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearCurrentTemplate: (state) => {
      state.currentTemplate = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch templates
      .addCase(fetchTemplates.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTemplates.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchTemplates.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Fetch single template
      .addCase(fetchTemplate.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTemplate.fulfilled, (state, action) => {
        state.loading = false;
        state.currentTemplate = action.payload;
      })
      .addCase(fetchTemplate.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Create template
      .addCase(createTemplate.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createTemplate.fulfilled, (state, action) => {
        state.loading = false;
        state.items.push(action.payload);
      })
      .addCase(createTemplate.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Update template
      .addCase(updateTemplate.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateTemplate.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.items.findIndex(t => t.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
        if (state.currentTemplate?.id === action.payload.id) {
          state.currentTemplate = action.payload;
        }
      })
      .addCase(updateTemplate.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Delete template
      .addCase(deleteTemplate.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteTemplate.fulfilled, (state, action) => {
        state.loading = false;
        state.items = state.items.filter(t => t.id !== action.payload);
        if (state.currentTemplate?.id === action.payload) {
          state.currentTemplate = null;
        }
      })
      .addCase(deleteTemplate.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Clone template
      .addCase(cloneTemplate.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(cloneTemplate.fulfilled, (state, action) => {
        state.loading = false;
        state.items.push(action.payload);
      })
      .addCase(cloneTemplate.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearError, clearCurrentTemplate } = invoiceTemplatesSlice.actions;
export default invoiceTemplatesSlice.reducer;
