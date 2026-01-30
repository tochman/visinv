import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { Account } from '../../services/resources/Account';

/**
 * Fetch all accounts for the organization
 * @param {Object} params - Parameters
 * @param {string} params.organizationId - Organization ID (required)
 * @param {string} params.accountClass - Filter by account class (optional)
 * @param {boolean} params.includeInactive - Include inactive accounts (optional)
 */
export const fetchAccounts = createAsyncThunk(
  'accounts/fetchAccounts',
  async ({ organizationId, accountClass, includeInactive = false }, { rejectWithValue }) => {
    if (!organizationId) {
      return rejectWithValue('No organization selected');
    }

    const { data, error } = await Account.index({
      organizationId,
      accountClass,
      activeOnly: !includeInactive,
    });

    if (error) return rejectWithValue(error.message);
    return data;
  }
);

/**
 * Search accounts by number or name
 */
export const searchAccounts = createAsyncThunk(
  'accounts/searchAccounts',
  async ({ organizationId, query }, { rejectWithValue }) => {
    if (!organizationId) {
      return rejectWithValue('No organization selected');
    }

    const { data, error } = await Account.search(organizationId, query);
    if (error) return rejectWithValue(error.message);
    return data;
  }
);

/**
 * Create a new account
 */
export const createAccount = createAsyncThunk(
  'accounts/createAccount',
  async (accountData, { rejectWithValue }) => {
    // Check if account number is unique
    const { isUnique, error: uniqueError } = await Account.isAccountNumberUnique(
      accountData.organization_id,
      accountData.account_number
    );

    if (uniqueError) return rejectWithValue(uniqueError.message);
    if (!isUnique) return rejectWithValue('Account number already exists');

    const { data, error } = await Account.create(accountData);
    if (error) return rejectWithValue(error.message);
    return data;
  }
);

/**
 * Update an existing account
 */
export const updateAccount = createAsyncThunk(
  'accounts/updateAccount',
  async ({ id, updates, organizationId }, { rejectWithValue }) => {
    // If account number is being updated, check uniqueness
    if (updates.account_number) {
      const { isUnique, error: uniqueError } = await Account.isAccountNumberUnique(
        organizationId,
        updates.account_number,
        id // Exclude current account from check
      );

      if (uniqueError) return rejectWithValue(uniqueError.message);
      if (!isUnique) return rejectWithValue('Account number already exists');
    }

    const { data, error } = await Account.update(id, updates);
    if (error) return rejectWithValue(error.message);
    return data;
  }
);

/**
 * Activate an account
 */
export const activateAccount = createAsyncThunk(
  'accounts/activateAccount',
  async (id, { rejectWithValue }) => {
    const { data, error } = await Account.activate(id);
    if (error) return rejectWithValue(error.message);
    return data;
  }
);

/**
 * Deactivate an account (soft delete)
 */
export const deactivateAccount = createAsyncThunk(
  'accounts/deactivateAccount',
  async (id, { rejectWithValue }) => {
    const { data, error } = await Account.deactivate(id);
    if (error) return rejectWithValue(error.message);
    return data;
  }
);

/**
 * Seed BAS 2024 standard accounts for organization
 */
export const seedBASAccounts = createAsyncThunk(
  'accounts/seedBASAccounts',
  async (organizationId, { rejectWithValue }) => {
    if (!organizationId) {
      return rejectWithValue('No organization selected');
    }

    const { data, error } = await Account.seedBASAccounts(organizationId);
    if (error) return rejectWithValue(error.message);
    return data;
  }
);

/**
 * Import accounts from SIE file data
 * @param {Object} params - Import parameters
 * @param {string} params.organizationId - Organization ID
 * @param {Array} params.accounts - Array of account objects to import
 * @param {boolean} params.skipExisting - Skip accounts that already exist (default: true)
 */
export const importAccounts = createAsyncThunk(
  'accounts/importAccounts',
  async ({ organizationId, accounts, skipExisting = true }, { rejectWithValue }) => {
    if (!organizationId) {
      return rejectWithValue('No organization selected');
    }

    if (!accounts || accounts.length === 0) {
      return rejectWithValue('No accounts to import');
    }

    const { data, error } = await Account.bulkImport(organizationId, accounts, skipExisting);
    if (error) return rejectWithValue(error.message);
    return data;
  }
);

/**
 * Fetch account summaries with balances and transaction counts
 * @param {Object} params - Parameters
 * @param {string} params.organizationId - Organization ID (required)
 * @param {Array} params.accountIds - Array of account IDs (optional)
 * @param {string} params.endDate - End date for balance calculation (optional)
 */
export const fetchAccountsSummary = createAsyncThunk(
  'accounts/fetchAccountsSummary',
  async ({ organizationId, accountIds, endDate }, { rejectWithValue }) => {
    if (!organizationId) {
      return rejectWithValue('No organization selected');
    }

    const { data, error } = await Account.getAccountsSummary(organizationId, accountIds, endDate);
    if (error) return rejectWithValue(error.message);
    return data;
  }
);

const accountsSlice = createSlice({
  name: 'accounts',
  initialState: {
    items: [],
    summaries: {}, // Map of account_id -> summary data (balance, transaction_count)
    loading: false,
    summariesLoading: false,
    error: null,
    filter: {
      accountClass: null,
      searchQuery: '',
      includeInactive: false,
    },
  },
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearAccounts: (state) => {
      state.items = [];
      state.error = null;
    },
    setAccountClassFilter: (state, action) => {
      state.filter.accountClass = action.payload;
    },
    setSearchQuery: (state, action) => {
      state.filter.searchQuery = action.payload;
    },
    setIncludeInactive: (state, action) => {
      state.filter.includeInactive = action.payload;
    },
    clearFilters: (state) => {
      state.filter = {
        accountClass: null,
        searchQuery: '',
        includeInactive: false,
      };
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch accounts
      .addCase(fetchAccounts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAccounts.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchAccounts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Search accounts
      .addCase(searchAccounts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(searchAccounts.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(searchAccounts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Create account
      .addCase(createAccount.pending, (state) => {
        state.error = null;
      })
      .addCase(createAccount.fulfilled, (state, action) => {
        // Insert in sorted order by account_number
        const newAccount = action.payload;
        const insertIndex = state.items.findIndex(
          (a) => a.account_number > newAccount.account_number
        );
        if (insertIndex === -1) {
          state.items.push(newAccount);
        } else {
          state.items.splice(insertIndex, 0, newAccount);
        }
      })
      .addCase(createAccount.rejected, (state, action) => {
        state.error = action.payload;
      })

      // Update account
      .addCase(updateAccount.fulfilled, (state, action) => {
        const index = state.items.findIndex((a) => a.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = action.payload;
          // Re-sort if account number changed
          state.items.sort((a, b) => a.account_number.localeCompare(b.account_number));
        }
      })
      .addCase(updateAccount.rejected, (state, action) => {
        state.error = action.payload;
      })

      // Activate account
      .addCase(activateAccount.fulfilled, (state, action) => {
        const index = state.items.findIndex((a) => a.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
      })

      // Deactivate account
      .addCase(deactivateAccount.fulfilled, (state, action) => {
        const index = state.items.findIndex((a) => a.id === action.payload.id);
        if (index !== -1) {
          // If we're showing only active accounts, remove it
          if (!state.filter.includeInactive) {
            state.items.splice(index, 1);
          } else {
            state.items[index] = action.payload;
          }
        }
      })

      // Seed BAS accounts
      .addCase(seedBASAccounts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(seedBASAccounts.fulfilled, (state, action) => {
        state.loading = false;
        // Add seeded accounts to the list (sorted by account_number)
        state.items = [...state.items, ...action.payload].sort((a, b) =>
          a.account_number.localeCompare(b.account_number)
        );
      })
      .addCase(seedBASAccounts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Import accounts from SIE file
      .addCase(importAccounts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(importAccounts.fulfilled, (state, action) => {
        state.loading = false;
        // Add imported accounts to the list (sorted by account_number)
        if (action.payload.imported && action.payload.imported.length > 0) {
          state.items = [...state.items, ...action.payload.imported].sort((a, b) =>
            a.account_number.localeCompare(b.account_number)
          );
        }
      })
      .addCase(importAccounts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Fetch accounts summary
      .addCase(fetchAccountsSummary.pending, (state) => {
        state.summariesLoading = true;
      })
      .addCase(fetchAccountsSummary.fulfilled, (state, action) => {
        state.summariesLoading = false;
        // Convert array to map for easy lookup
        const summariesMap = {};
        action.payload.forEach((summary) => {
          summariesMap[summary.account_id] = summary;
        });
        state.summaries = summariesMap;
      })
      .addCase(fetchAccountsSummary.rejected, (state, action) => {
        state.summariesLoading = false;
        // Don't set error for summaries as it's not critical
      });
  },
});

export const {
  clearError,
  clearAccounts,
  setAccountClassFilter,
  setSearchQuery,
  setIncludeInactive,
  clearFilters,
} = accountsSlice.actions;

// Selectors
export const selectAccounts = (state) => state.accounts.items;
export const selectAccountsLoading = (state) => state.accounts.loading;
export const selectAccountsError = (state) => state.accounts.error;
export const selectAccountsFilter = (state) => state.accounts.filter;

// Filtered accounts selector
export const selectFilteredAccounts = (state) => {
  const { items } = state.accounts;
  const { accountClass, searchQuery } = state.accounts.filter;

  let filtered = items;

  // Filter by class
  if (accountClass) {
    filtered = filtered.filter((a) => a.account_class === accountClass);
  }

  // Filter by search query
  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    filtered = filtered.filter(
      (a) =>
        a.account_number.toLowerCase().includes(query) ||
        a.name.toLowerCase().includes(query) ||
        (a.name_en && a.name_en.toLowerCase().includes(query))
    );
  }

  return filtered;
};

// Accounts grouped by class selector
export const selectAccountsByClass = (state) => {
  const items = selectFilteredAccounts(state);
  return items.reduce((acc, account) => {
    const classKey = account.account_class;
    if (!acc[classKey]) {
      acc[classKey] = [];
    }
    acc[classKey].push(account);
    return acc;
  }, {});
};

// Summaries selectors
export const selectAccountsSummaries = (state) => state.accounts.summaries;
export const selectAccountsSummariesLoading = (state) => state.accounts.summariesLoading;

// Get summary for specific account
export const selectAccountSummary = (accountId) => (state) => {
  return state.accounts.summaries[accountId] || null;
};

// Get accounts with summary data combined
export const selectAccountsWithSummaries = (state) => {
  const accounts = selectFilteredAccounts(state);
  const summaries = state.accounts.summaries;
  
  return accounts.map((account) => ({
    ...account,
    summary: summaries[account.id] || null,
  }));
};

export default accountsSlice.reducer;
