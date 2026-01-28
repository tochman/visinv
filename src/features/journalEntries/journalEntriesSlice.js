import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { JournalEntry } from '../../services/resources';

/**
 * Fetch all journal entries for the organization
 * @param {Object} params - Query parameters
 * @param {string} params.organizationId - Organization ID (required)
 * @param {string} params.fiscalYearId - Filter by fiscal year (optional)
 * @param {string} params.status - Filter by status (optional)
 */
export const fetchJournalEntries = createAsyncThunk(
  'journalEntries/fetchJournalEntries',
  async ({ organizationId, fiscalYearId, status }, { rejectWithValue }) => {
    if (!organizationId) {
      return rejectWithValue('No organization selected');
    }

    const { data, error } = await JournalEntry.index({
      organizationId,
      fiscalYearId,
      status,
    });

    if (error) return rejectWithValue(error.message);
    return data;
  }
);

/**
 * Fetch a single journal entry by ID
 */
export const fetchJournalEntry = createAsyncThunk(
  'journalEntries/fetchJournalEntry',
  async (id, { rejectWithValue }) => {
    const { data, error } = await JournalEntry.show(id);
    if (error) return rejectWithValue(error.message);
    return data;
  }
);

/**
 * Create a new journal entry
 * @param {Object} entryData - Journal entry data including lines
 */
export const createJournalEntry = createAsyncThunk(
  'journalEntries/createJournalEntry',
  async (entryData, { rejectWithValue }) => {
    const { data, error } = await JournalEntry.create(entryData);
    if (error) return rejectWithValue(error.message);
    return data;
  }
);

/**
 * Update an existing journal entry
 */
export const updateJournalEntry = createAsyncThunk(
  'journalEntries/updateJournalEntry',
  async ({ id, updates }, { rejectWithValue }) => {
    const { data, error } = await JournalEntry.update(id, updates);
    if (error) return rejectWithValue(error.message);
    return data;
  }
);

/**
 * Post a draft journal entry
 */
export const postJournalEntry = createAsyncThunk(
  'journalEntries/postJournalEntry',
  async (id, { rejectWithValue }) => {
    const { data, error } = await JournalEntry.post(id);
    if (error) return rejectWithValue(error.message);
    return data;
  }
);

/**
 * Void a posted journal entry
 */
export const voidJournalEntry = createAsyncThunk(
  'journalEntries/voidJournalEntry',
  async ({ id, reason }, { rejectWithValue }) => {
    const { data, error } = await JournalEntry.void(id, reason);
    if (error) return rejectWithValue(error.message);
    return data;
  }
);

/**
 * Delete a draft journal entry
 */
export const deleteJournalEntry = createAsyncThunk(
  'journalEntries/deleteJournalEntry',
  async (id, { rejectWithValue }) => {
    const { error } = await JournalEntry.delete(id);
    if (error) return rejectWithValue(error.message);
    return id;
  }
);

/**
 * Fetch ledger data for a specific account
 * US-220: General Ledger View
 * @param {Object} params - Query parameters
 * @param {string} params.organizationId - Organization ID (required)
 * @param {string} params.accountId - Account ID (required)
 * @param {string} params.fiscalYearId - Fiscal year ID (optional)
 * @param {string} params.startDate - Start date filter (optional)
 * @param {string} params.endDate - End date filter (optional)
 */
export const fetchLedgerData = createAsyncThunk(
  'journalEntries/fetchLedgerData',
  async ({ organizationId, accountId, fiscalYearId, startDate, endDate }, { rejectWithValue }) => {
    if (!organizationId || !accountId) {
      return rejectWithValue('Organization ID and Account ID are required');
    }

    // Get opening balance if we have a start date filter
    let openingBalance = 0;
    if (startDate) {
      const { data: balance, error: balanceError } = await JournalEntry.getOpeningBalance({
        organizationId,
        accountId,
        fiscalYearId,
        beforeDate: startDate,
      });
      if (balanceError) return rejectWithValue(balanceError.message);
      openingBalance = balance;
    }

    // Get ledger entries
    const { data, error } = await JournalEntry.getLedgerData({
      organizationId,
      accountId,
      fiscalYearId,
      startDate,
      endDate,
    });

    if (error) return rejectWithValue(error.message);

    // Adjust running balances to include opening balance
    const adjustedData = (data || []).map((entry) => ({
      ...entry,
      balance: Math.round((entry.balance + openingBalance) * 100) / 100,
    }));

    return {
      entries: adjustedData,
      openingBalance,
      accountId,
    };
  }
);

const initialState = {
  items: [],
  currentEntry: null,
  loading: false,
  submitting: false,
  error: null,
  filters: {
    fiscalYearId: null,
    status: null,
    searchQuery: '',
  },
  // General Ledger state (US-220)
  ledger: {
    entries: [],
    openingBalance: 0,
    accountId: null,
    loading: false,
    error: null,
  },
};

const journalEntriesSlice = createSlice({
  name: 'journalEntries',
  initialState,
  reducers: {
    clearJournalEntries: (state) => {
      state.items = [];
      state.currentEntry = null;
      state.error = null;
    },
    setCurrentEntry: (state, action) => {
      state.currentEntry = action.payload;
    },
    clearCurrentEntry: (state) => {
      state.currentEntry = null;
    },
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = {
        fiscalYearId: null,
        status: null,
        searchQuery: '',
      };
    },
    clearError: (state) => {
      state.error = null;
    },
    clearLedger: (state) => {
      state.ledger = {
        entries: [],
        openingBalance: 0,
        accountId: null,
        loading: false,
        error: null,
      };
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchJournalEntries
      .addCase(fetchJournalEntries.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchJournalEntries.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload || [];
      })
      .addCase(fetchJournalEntries.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // fetchJournalEntry
      .addCase(fetchJournalEntry.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchJournalEntry.fulfilled, (state, action) => {
        state.loading = false;
        state.currentEntry = action.payload;
      })
      .addCase(fetchJournalEntry.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // createJournalEntry
      .addCase(createJournalEntry.pending, (state) => {
        state.submitting = true;
        state.error = null;
      })
      .addCase(createJournalEntry.fulfilled, (state, action) => {
        state.submitting = false;
        state.items.unshift(action.payload);
        state.currentEntry = action.payload;
      })
      .addCase(createJournalEntry.rejected, (state, action) => {
        state.submitting = false;
        state.error = action.payload;
      })
      // updateJournalEntry
      .addCase(updateJournalEntry.pending, (state) => {
        state.submitting = true;
        state.error = null;
      })
      .addCase(updateJournalEntry.fulfilled, (state, action) => {
        state.submitting = false;
        const index = state.items.findIndex((entry) => entry.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
        state.currentEntry = action.payload;
      })
      .addCase(updateJournalEntry.rejected, (state, action) => {
        state.submitting = false;
        state.error = action.payload;
      })
      // postJournalEntry
      .addCase(postJournalEntry.pending, (state) => {
        state.submitting = true;
        state.error = null;
      })
      .addCase(postJournalEntry.fulfilled, (state, action) => {
        state.submitting = false;
        const index = state.items.findIndex((entry) => entry.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
        state.currentEntry = action.payload;
      })
      .addCase(postJournalEntry.rejected, (state, action) => {
        state.submitting = false;
        state.error = action.payload;
      })
      // voidJournalEntry
      .addCase(voidJournalEntry.pending, (state) => {
        state.submitting = true;
        state.error = null;
      })
      .addCase(voidJournalEntry.fulfilled, (state, action) => {
        state.submitting = false;
        const index = state.items.findIndex((entry) => entry.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
        if (state.currentEntry?.id === action.payload.id) {
          state.currentEntry = action.payload;
        }
      })
      .addCase(voidJournalEntry.rejected, (state, action) => {
        state.submitting = false;
        state.error = action.payload;
      })
      // deleteJournalEntry
      .addCase(deleteJournalEntry.pending, (state) => {
        state.submitting = true;
        state.error = null;
      })
      .addCase(deleteJournalEntry.fulfilled, (state, action) => {
        state.submitting = false;
        state.items = state.items.filter((entry) => entry.id !== action.payload);
        if (state.currentEntry?.id === action.payload) {
          state.currentEntry = null;
        }
      })
      .addCase(deleteJournalEntry.rejected, (state, action) => {
        state.submitting = false;
        state.error = action.payload;
      })
      // fetchLedgerData (US-220)
      .addCase(fetchLedgerData.pending, (state) => {
        state.ledger.loading = true;
        state.ledger.error = null;
      })
      .addCase(fetchLedgerData.fulfilled, (state, action) => {
        state.ledger.loading = false;
        state.ledger.entries = action.payload.entries;
        state.ledger.openingBalance = action.payload.openingBalance;
        state.ledger.accountId = action.payload.accountId;
      })
      .addCase(fetchLedgerData.rejected, (state, action) => {
        state.ledger.loading = false;
        state.ledger.error = action.payload;
      });
  },
});

export const {
  clearJournalEntries,
  setCurrentEntry,
  clearCurrentEntry,
  setFilters,
  clearFilters,
  clearError,
  clearLedger,
} = journalEntriesSlice.actions;

// Selectors
export const selectJournalEntries = (state) => state.journalEntries.items;
export const selectCurrentJournalEntry = (state) => state.journalEntries.currentEntry;
export const selectJournalEntriesLoading = (state) => state.journalEntries.loading;
export const selectJournalEntriesSubmitting = (state) => state.journalEntries.submitting;
export const selectJournalEntriesError = (state) => state.journalEntries.error;
export const selectJournalEntriesFilters = (state) => state.journalEntries.filters;

// Ledger selectors (US-220)
export const selectLedgerEntries = (state) => state.journalEntries.ledger.entries;
export const selectLedgerOpeningBalance = (state) => state.journalEntries.ledger.openingBalance;
export const selectLedgerAccountId = (state) => state.journalEntries.ledger.accountId;
export const selectLedgerLoading = (state) => state.journalEntries.ledger.loading;
export const selectLedgerError = (state) => state.journalEntries.ledger.error;

// Ledger totals selector
export const selectLedgerTotals = (state) => {
  const entries = state.journalEntries.ledger.entries;
  const openingBalance = state.journalEntries.ledger.openingBalance;
  
  const totalDebit = entries.reduce((sum, e) => sum + e.debit, 0);
  const totalCredit = entries.reduce((sum, e) => sum + e.credit, 0);
  const closingBalance = entries.length > 0 
    ? entries[entries.length - 1].balance 
    : openingBalance;
  
  return {
    openingBalance: Math.round(openingBalance * 100) / 100,
    totalDebit: Math.round(totalDebit * 100) / 100,
    totalCredit: Math.round(totalCredit * 100) / 100,
    closingBalance: Math.round(closingBalance * 100) / 100,
  };
};

// Filtered selectors
export const selectDraftEntries = (state) => 
  state.journalEntries.items.filter((entry) => entry.status === 'draft');
export const selectPostedEntries = (state) => 
  state.journalEntries.items.filter((entry) => entry.status === 'posted');
export const selectVoidedEntries = (state) => 
  state.journalEntries.items.filter((entry) => entry.status === 'voided');

// Entry totals selector
export const selectEntryTotals = (state) => {
  const entry = state.journalEntries.currentEntry;
  if (!entry?.lines) return { totalDebit: 0, totalCredit: 0, isBalanced: true };
  
  const totalDebit = entry.lines.reduce((sum, line) => sum + (parseFloat(line.debit_amount) || 0), 0);
  const totalCredit = entry.lines.reduce((sum, line) => sum + (parseFloat(line.credit_amount) || 0), 0);
  
  return {
    totalDebit: Math.round(totalDebit * 100) / 100,
    totalCredit: Math.round(totalCredit * 100) / 100,
    isBalanced: Math.abs(totalDebit - totalCredit) < 0.01,
  };
};

export default journalEntriesSlice.reducer;
