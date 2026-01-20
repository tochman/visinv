import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { supabase } from '../../services/supabase';

export const fetchTemplates = createAsyncThunk(
  'templates/fetchTemplates',
  async (_, { rejectWithValue }) => {
    const { data, error } = await supabase
      .from('templates')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) return rejectWithValue(error.message);
    return data;
  }
);

export const createTemplate = createAsyncThunk(
  'templates/createTemplate',
  async (templateData, { rejectWithValue }) => {
    const { data, error } = await supabase
      .from('templates')
      .insert(templateData)
      .select()
      .single();
    
    if (error) return rejectWithValue(error.message);
    return data;
  }
);

export const updateTemplate = createAsyncThunk(
  'templates/updateTemplate',
  async ({ id, updates }, { rejectWithValue }) => {
    const { data, error } = await supabase
      .from('templates')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) return rejectWithValue(error.message);
    return data;
  }
);

export const deleteTemplate = createAsyncThunk(
  'templates/deleteTemplate',
  async (id, { rejectWithValue }) => {
    const { error } = await supabase
      .from('templates')
      .delete()
      .eq('id', id);
    
    if (error) return rejectWithValue(error.message);
    return id;
  }
);

const templatesSlice = createSlice({
  name: 'templates',
  initialState: {
    items: [],
    loading: false,
    error: null,
    selectedTemplate: null,
  },
  reducers: {
    setSelectedTemplate: (state, action) => {
      state.selectedTemplate = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTemplates.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchTemplates.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchTemplates.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(createTemplate.fulfilled, (state, action) => {
        state.items.unshift(action.payload);
      })
      .addCase(updateTemplate.fulfilled, (state, action) => {
        const index = state.items.findIndex(t => t.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
      })
      .addCase(deleteTemplate.fulfilled, (state, action) => {
        state.items = state.items.filter(t => t.id !== action.payload);
      });
  },
});

export const { setSelectedTemplate, clearError } = templatesSlice.actions;
export default templatesSlice.reducer;
