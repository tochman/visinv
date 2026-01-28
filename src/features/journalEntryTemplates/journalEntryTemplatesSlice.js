import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { JournalEntryTemplate } from '../../services/resources';

/**
 * Fetch all journal entry templates for the organization
 */
export const fetchJournalEntryTemplates = createAsyncThunk(
  'journalEntryTemplates/fetchJournalEntryTemplates',
  async (organizationId, { rejectWithValue }) => {
    if (!organizationId) {
      return rejectWithValue('No organization selected');
    }

    const { data, error } = await JournalEntryTemplate.index(organizationId);
    if (error) return rejectWithValue(error.message);
    return data;
  }
);

/**
 * Fetch a single template by ID
 */
export const fetchJournalEntryTemplate = createAsyncThunk(
  'journalEntryTemplates/fetchJournalEntryTemplate',
  async (id, { rejectWithValue }) => {
    const { data, error } = await JournalEntryTemplate.show(id);
    if (error) return rejectWithValue(error.message);
    return data;
  }
);

/**
 * Create a new template
 */
export const createJournalEntryTemplate = createAsyncThunk(
  'journalEntryTemplates/createJournalEntryTemplate',
  async (templateData, { rejectWithValue }) => {
    const { data, error } = await JournalEntryTemplate.create(templateData);
    if (error) return rejectWithValue(error.message);
    return data;
  }
);

/**
 * Update an existing template
 */
export const updateJournalEntryTemplate = createAsyncThunk(
  'journalEntryTemplates/updateJournalEntryTemplate',
  async ({ id, updates }, { rejectWithValue }) => {
    const { data, error } = await JournalEntryTemplate.update(id, updates);
    if (error) return rejectWithValue(error.message);
    return data;
  }
);

/**
 * Delete a template
 */
export const deleteJournalEntryTemplate = createAsyncThunk(
  'journalEntryTemplates/deleteJournalEntryTemplate',
  async (id, { rejectWithValue }) => {
    const { error } = await JournalEntryTemplate.delete(id);
    if (error) return rejectWithValue(error.message);
    return id;
  }
);

/**
 * Use a template to create journal entry data
 */
export const useJournalEntryTemplate = createAsyncThunk(
  'journalEntryTemplates/useJournalEntryTemplate',
  async ({ templateId, overrides }, { rejectWithValue }) => {
    const { data, error } = await JournalEntryTemplate.toJournalEntry(templateId, overrides);
    if (error) return rejectWithValue(error.message);
    return data;
  }
);

const initialState = {
  items: [],
  currentTemplate: null,
  loading: false,
  submitting: false,
  error: null,
};

const journalEntryTemplatesSlice = createSlice({
  name: 'journalEntryTemplates',
  initialState,
  reducers: {
    clearJournalEntryTemplates: (state) => {
      state.items = [];
      state.currentTemplate = null;
      state.error = null;
    },
    setCurrentTemplate: (state, action) => {
      state.currentTemplate = action.payload;
    },
    clearCurrentTemplate: (state) => {
      state.currentTemplate = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchJournalEntryTemplates
      .addCase(fetchJournalEntryTemplates.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchJournalEntryTemplates.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload || [];
      })
      .addCase(fetchJournalEntryTemplates.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // fetchJournalEntryTemplate
      .addCase(fetchJournalEntryTemplate.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchJournalEntryTemplate.fulfilled, (state, action) => {
        state.loading = false;
        state.currentTemplate = action.payload;
      })
      .addCase(fetchJournalEntryTemplate.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // createJournalEntryTemplate
      .addCase(createJournalEntryTemplate.pending, (state) => {
        state.submitting = true;
        state.error = null;
      })
      .addCase(createJournalEntryTemplate.fulfilled, (state, action) => {
        state.submitting = false;
        state.items.unshift(action.payload);
        state.currentTemplate = action.payload;
      })
      .addCase(createJournalEntryTemplate.rejected, (state, action) => {
        state.submitting = false;
        state.error = action.payload;
      })
      // updateJournalEntryTemplate
      .addCase(updateJournalEntryTemplate.pending, (state) => {
        state.submitting = true;
        state.error = null;
      })
      .addCase(updateJournalEntryTemplate.fulfilled, (state, action) => {
        state.submitting = false;
        const index = state.items.findIndex((t) => t.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
        state.currentTemplate = action.payload;
      })
      .addCase(updateJournalEntryTemplate.rejected, (state, action) => {
        state.submitting = false;
        state.error = action.payload;
      })
      // deleteJournalEntryTemplate
      .addCase(deleteJournalEntryTemplate.pending, (state) => {
        state.submitting = true;
        state.error = null;
      })
      .addCase(deleteJournalEntryTemplate.fulfilled, (state, action) => {
        state.submitting = false;
        state.items = state.items.filter((t) => t.id !== action.payload);
        if (state.currentTemplate?.id === action.payload) {
          state.currentTemplate = null;
        }
      })
      .addCase(deleteJournalEntryTemplate.rejected, (state, action) => {
        state.submitting = false;
        state.error = action.payload;
      })
      // useJournalEntryTemplate - just sets the current template data
      .addCase(useJournalEntryTemplate.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(useJournalEntryTemplate.fulfilled, (state) => {
        state.loading = false;
        // The actual entry data is returned via the thunk result, not stored in state
      })
      .addCase(useJournalEntryTemplate.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const {
  clearJournalEntryTemplates,
  setCurrentTemplate,
  clearCurrentTemplate,
  clearError,
} = journalEntryTemplatesSlice.actions;

// Selectors
export const selectJournalEntryTemplates = (state) => state.journalEntryTemplates.items;
export const selectCurrentJournalEntryTemplate = (state) => state.journalEntryTemplates.currentTemplate;
export const selectJournalEntryTemplatesLoading = (state) => state.journalEntryTemplates.loading;
export const selectJournalEntryTemplatesSubmitting = (state) => state.journalEntryTemplates.submitting;
export const selectJournalEntryTemplatesError = (state) => state.journalEntryTemplates.error;

// Sorted selectors
export const selectTemplatesByUsage = (state) =>
  [...state.journalEntryTemplates.items].sort((a, b) => (b.use_count || 0) - (a.use_count || 0));

export const selectTemplatesByName = (state) =>
  [...state.journalEntryTemplates.items].sort((a, b) => a.name.localeCompare(b.name));

export default journalEntryTemplatesSlice.reducer;
