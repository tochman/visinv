import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { SupplierInboxItem } from '../../services/resources';

/**
 * Fetch inbox items for an organization
 */
export const fetchInboxItems = createAsyncThunk(
  'supplierInbox/fetchInboxItems',
  async ({ organizationId, options = {} }, { rejectWithValue }) => {
    const { data, error } = await SupplierInboxItem.getByOrganization(organizationId, options);
    if (error) return rejectWithValue(error.message);
    return data;
  }
);

/**
 * Fetch count of new inbox items (for badge)
 */
export const fetchNewInboxCount = createAsyncThunk(
  'supplierInbox/fetchNewInboxCount',
  async (organizationId, { rejectWithValue }) => {
    const { count, error } = await SupplierInboxItem.getNewCount(organizationId);
    if (error) return rejectWithValue(error.message);
    return count;
  }
);

/**
 * Mark an inbox item as processed
 */
export const markInboxItemProcessed = createAsyncThunk(
  'supplierInbox/markProcessed',
  async ({ id, supplierInvoiceId }, { rejectWithValue }) => {
    const { data, error } = await SupplierInboxItem.markProcessed(id, supplierInvoiceId);
    if (error) return rejectWithValue(error.message);
    return data;
  }
);

/**
 * Archive an inbox item
 */
export const archiveInboxItem = createAsyncThunk(
  'supplierInbox/archive',
  async ({ id, userId }, { rejectWithValue }) => {
    const { data, error } = await SupplierInboxItem.archive(id, userId);
    if (error) return rejectWithValue(error.message);
    return data;
  }
);

/**
 * Archive multiple inbox items
 */
export const archiveInboxItems = createAsyncThunk(
  'supplierInbox/archiveMany',
  async ({ ids, userId }, { rejectWithValue }) => {
    const { data, error } = await SupplierInboxItem.archiveMany(ids, userId);
    if (error) return rejectWithValue(error.message);
    return data;
  }
);

/**
 * Delete an inbox item
 */
export const deleteInboxItem = createAsyncThunk(
  'supplierInbox/delete',
  async (id, { rejectWithValue }) => {
    const { error } = await SupplierInboxItem.deleteWithFile(id);
    if (error) return rejectWithValue(error.message);
    return id;
  }
);

/**
 * Delete multiple inbox items
 */
export const deleteInboxItems = createAsyncThunk(
  'supplierInbox/deleteMany',
  async (ids, { rejectWithValue }) => {
    const { error } = await SupplierInboxItem.deleteManyWithFiles(ids);
    if (error) return rejectWithValue(error.message);
    return ids;
  }
);

/**
 * Get download URL for an inbox item's file
 */
export const getInboxItemFileUrl = createAsyncThunk(
  'supplierInbox/getFileUrl',
  async (storagePath, { rejectWithValue }) => {
    const { url, error } = await SupplierInboxItem.getFileUrl(storagePath);
    if (error) return rejectWithValue(error.message);
    return url;
  }
);

const initialState = {
  items: [],
  loading: false,
  error: null,
  newCount: 0,
  newCountLoading: false,
  filters: {
    status: null, // null = all, 'new', 'processed', 'archived'
    search: ''
  },
  selectedIds: [],
  pagination: {
    limit: 50,
    offset: 0,
    hasMore: true
  }
};

const supplierInboxSlice = createSlice({
  name: 'supplierInbox',
  initialState,
  reducers: {
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
      state.pagination.offset = 0; // Reset pagination when filters change
    },
    clearFilters: (state) => {
      state.filters = { status: null, search: '' };
      state.pagination.offset = 0;
    },
    setSelectedIds: (state, action) => {
      state.selectedIds = action.payload;
    },
    toggleSelectItem: (state, action) => {
      const id = action.payload;
      const index = state.selectedIds.indexOf(id);
      if (index === -1) {
        state.selectedIds.push(id);
      } else {
        state.selectedIds.splice(index, 1);
      }
    },
    selectAll: (state) => {
      state.selectedIds = state.items.map(item => item.id);
    },
    clearSelection: (state) => {
      state.selectedIds = [];
    },
    decrementNewCount: (state) => {
      if (state.newCount > 0) {
        state.newCount -= 1;
      }
    },
    incrementNewCount: (state) => {
      state.newCount += 1;
    },
    setNewCount: (state, action) => {
      state.newCount = action.payload;
    },
    clearInbox: (state) => {
      state.items = [];
      state.selectedIds = [];
      state.pagination.offset = 0;
      state.pagination.hasMore = true;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch inbox items
      .addCase(fetchInboxItems.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchInboxItems.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload || [];
        state.pagination.hasMore = (action.payload?.length || 0) >= state.pagination.limit;
      })
      .addCase(fetchInboxItems.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Fetch new count
      .addCase(fetchNewInboxCount.pending, (state) => {
        state.newCountLoading = true;
      })
      .addCase(fetchNewInboxCount.fulfilled, (state, action) => {
        state.newCountLoading = false;
        state.newCount = action.payload || 0;
      })
      .addCase(fetchNewInboxCount.rejected, (state) => {
        state.newCountLoading = false;
      })

      // Mark processed
      .addCase(markInboxItemProcessed.fulfilled, (state, action) => {
        const index = state.items.findIndex(item => item.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
        // Decrement new count if item was new
        if (state.newCount > 0) {
          state.newCount -= 1;
        }
      })

      // Archive single
      .addCase(archiveInboxItem.fulfilled, (state, action) => {
        const index = state.items.findIndex(item => item.id === action.payload.id);
        if (index !== -1) {
          const wasNew = state.items[index].status === 'new';
          state.items[index] = action.payload;
          if (wasNew && state.newCount > 0) {
            state.newCount -= 1;
          }
        }
      })

      // Archive many
      .addCase(archiveInboxItems.fulfilled, (state, action) => {
        const archivedIds = action.payload.map(item => item.id);
        let newCountDecrease = 0;
        
        state.items = state.items.map(item => {
          if (archivedIds.includes(item.id)) {
            if (item.status === 'new') {
              newCountDecrease += 1;
            }
            return action.payload.find(p => p.id === item.id) || item;
          }
          return item;
        });
        
        state.newCount = Math.max(0, state.newCount - newCountDecrease);
        state.selectedIds = [];
      })

      // Delete single
      .addCase(deleteInboxItem.fulfilled, (state, action) => {
        const deletedItem = state.items.find(item => item.id === action.payload);
        state.items = state.items.filter(item => item.id !== action.payload);
        state.selectedIds = state.selectedIds.filter(id => id !== action.payload);
        
        if (deletedItem?.status === 'new' && state.newCount > 0) {
          state.newCount -= 1;
        }
      })

      // Delete many
      .addCase(deleteInboxItems.fulfilled, (state, action) => {
        const deletedIds = action.payload;
        let newCountDecrease = 0;
        
        state.items.forEach(item => {
          if (deletedIds.includes(item.id) && item.status === 'new') {
            newCountDecrease += 1;
          }
        });
        
        state.items = state.items.filter(item => !deletedIds.includes(item.id));
        state.selectedIds = [];
        state.newCount = Math.max(0, state.newCount - newCountDecrease);
      });
  }
});

export const {
  setFilters,
  clearFilters,
  setSelectedIds,
  toggleSelectItem,
  selectAll,
  clearSelection,
  decrementNewCount,
  incrementNewCount,
  setNewCount,
  clearInbox
} = supplierInboxSlice.actions;

export default supplierInboxSlice.reducer;
