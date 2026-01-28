import { BaseResource } from './BaseResource';

/**
 * JournalEntry Resource
 * Handles journal entries (verifikationer) for double-entry bookkeeping
 * US-210: Manual Journal Entry
 */
class JournalEntryResource extends BaseResource {
  constructor() {
    super('journal_entries');
  }

  /**
   * Get all journal entries for an organization
   * @param {Object} options - Query options
   * @param {string} options.organizationId - Organization ID (required)
   * @param {string} options.fiscalYearId - Filter by fiscal year (optional)
   * @param {string} options.status - Filter by status (optional)
   * @param {string} options.sourceType - Filter by source type (optional)
   * @returns {Promise<{data: Array|null, error: Error|null}>}
   */
  async index(options = {}) {
    const {
      organizationId,
      fiscalYearId,
      status,
      sourceType,
    } = options;

    if (!organizationId) {
      return { data: null, error: new Error('Organization ID is required') };
    }

    let query = this.supabase
      .from(this.tableName)
      .select(`
        *,
        fiscal_year:fiscal_years(id, name, start_date, end_date),
        lines:journal_entry_lines(
          id,
          account_id,
          account:accounts(id, account_number, name),
          debit_amount,
          credit_amount,
          description,
          vat_code,
          line_order
        )
      `)
      .eq('organization_id', organizationId)
      .order('entry_date', { ascending: false })
      .order('verification_number', { ascending: false });

    if (fiscalYearId) {
      query = query.eq('fiscal_year_id', fiscalYearId);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (sourceType) {
      query = query.eq('source_type', sourceType);
    }

    const { data, error } = await query;

    // Sort lines by line_order
    if (data) {
      data.forEach((entry) => {
        if (entry.lines) {
          entry.lines.sort((a, b) => a.line_order - b.line_order);
        }
      });
    }

    return { data, error };
  }

  /**
   * Get a single journal entry with its lines
   * @param {string} id - Journal entry ID
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  async show(id) {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select(`
        *,
        fiscal_year:fiscal_years(id, name, start_date, end_date),
        lines:journal_entry_lines(
          id,
          account_id,
          account:accounts(id, account_number, name),
          debit_amount,
          credit_amount,
          description,
          vat_code,
          vat_amount,
          cost_center,
          line_order
        )
      `)
      .eq('id', id)
      .single();

    // Sort lines by line_order
    if (data?.lines) {
      data.lines.sort((a, b) => a.line_order - b.line_order);
    }

    return { data, error };
  }

  /**
   * Create a new journal entry with lines
   * @param {Object} entry - Journal entry data
   * @param {string} entry.organization_id - Organization ID
   * @param {string} entry.fiscal_year_id - Fiscal year ID
   * @param {string} entry.entry_date - Entry date (YYYY-MM-DD)
   * @param {string} entry.description - Entry description
   * @param {string} entry.status - Status (draft or posted)
   * @param {Array} entry.lines - Array of line items
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  async create(entry) {
    const { lines, ...entryData } = entry;

    // Get the current user for created_by
    const { user, error: authError } = await this.getCurrentUser();
    if (authError || !user) {
      return { data: null, error: authError || new Error('Not authenticated') };
    }

    // Validate that the entry is balanced if posting
    if (entryData.status === 'posted') {
      const balanceError = this.validateBalance(lines);
      if (balanceError) {
        return { data: null, error: new Error(balanceError) };
      }
    }

    // Get the next verification number
    const { data: verificationNumber, error: verNumError } = await this.supabase.rpc(
      'get_next_verification_number',
      {
        p_organization_id: entryData.organization_id,
        p_fiscal_year_id: entryData.fiscal_year_id,
      }
    );

    if (verNumError) {
      return { data: null, error: verNumError };
    }

    // Create the journal entry
    const { data: createdEntry, error: createError } = await this.supabase
      .from(this.tableName)
      .insert({
        ...entryData,
        verification_number: verificationNumber,
        created_by: user.id,
        posted_at: entryData.status === 'posted' ? new Date().toISOString() : null,
        posted_by: entryData.status === 'posted' ? user.id : null,
      })
      .select()
      .single();

    if (createError) {
      return { data: null, error: createError };
    }

    // Create the lines
    if (lines && lines.length > 0) {
      const linesWithEntryId = lines.map((line, index) => ({
        journal_entry_id: createdEntry.id,
        account_id: line.account_id,
        debit_amount: line.debit_amount || 0,
        credit_amount: line.credit_amount || 0,
        description: line.description || null,
        vat_code: line.vat_code || null,
        vat_amount: line.vat_amount || null,
        cost_center: line.cost_center || null,
        line_order: line.line_order ?? index,
      }));

      const { error: linesError } = await this.supabase
        .from('journal_entry_lines')
        .insert(linesWithEntryId);

      if (linesError) {
        // Rollback: delete the created entry
        await this.delete(createdEntry.id);
        return { data: null, error: linesError };
      }
    }

    // Return the full entry with lines
    return this.show(createdEntry.id);
  }

  /**
   * Update a journal entry and its lines
   * Only draft entries can be updated
   * @param {string} id - Journal entry ID
   * @param {Object} entry - Updated entry data
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  async update(id, entry) {
    const { lines, ...entryData } = entry;

    // Validate balance if posting
    if (entryData.status === 'posted' && lines) {
      const balanceError = this.validateBalance(lines);
      if (balanceError) {
        return { data: null, error: new Error(balanceError) };
      }
    }

    // Get current user for posted_by
    const { user, error: authError } = await this.getCurrentUser();
    if (authError || !user) {
      return { data: null, error: authError || new Error('Not authenticated') };
    }

    // Update the entry
    const updateData = { ...entryData, updated_at: new Date().toISOString() };
    
    if (entryData.status === 'posted') {
      updateData.posted_at = new Date().toISOString();
      updateData.posted_by = user.id;
    }

    const { data: updatedEntry, error: updateError } = await this.supabase
      .from(this.tableName)
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return { data: null, error: updateError };
    }

    // Update lines if provided
    if (lines) {
      // Delete existing lines
      const { error: deleteError } = await this.supabase
        .from('journal_entry_lines')
        .delete()
        .eq('journal_entry_id', id);

      if (deleteError) {
        return { data: null, error: deleteError };
      }

      // Insert new lines
      if (lines.length > 0) {
        const linesWithEntryId = lines.map((line, index) => ({
          journal_entry_id: id,
          account_id: line.account_id,
          debit_amount: line.debit_amount || 0,
          credit_amount: line.credit_amount || 0,
          description: line.description || null,
          vat_code: line.vat_code || null,
          vat_amount: line.vat_amount || null,
          cost_center: line.cost_center || null,
          line_order: line.line_order ?? index,
        }));

        const { error: insertError } = await this.supabase
          .from('journal_entry_lines')
          .insert(linesWithEntryId);

        if (insertError) {
          return { data: null, error: insertError };
        }
      }
    }

    return this.show(id);
  }

  /**
   * Post a draft journal entry
   * @param {string} id - Journal entry ID
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  async post(id) {
    // Get the entry with lines first to validate balance
    const { data: entry, error: fetchError } = await this.show(id);
    if (fetchError) {
      return { data: null, error: fetchError };
    }

    if (entry.status !== 'draft') {
      return { data: null, error: new Error('Only draft entries can be posted') };
    }

    const balanceError = this.validateBalance(entry.lines);
    if (balanceError) {
      return { data: null, error: new Error(balanceError) };
    }

    return this.update(id, { status: 'posted' });
  }

  /**
   * Void a posted journal entry
   * Creates a reversing entry instead of deleting
   * @param {string} id - Journal entry ID
   * @param {string} reason - Reason for voiding
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  async void(id, reason = '') {
    const { user, error: authError } = await this.getCurrentUser();
    if (authError || !user) {
      return { data: null, error: authError || new Error('Not authenticated') };
    }

    const { data: voidedEntry, error: voidError } = await this.supabase
      .from(this.tableName)
      .update({
        status: 'voided',
        description: reason ? `VOIDED: ${reason}` : 'VOIDED',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('status', 'posted') // Can only void posted entries
      .select()
      .single();

    if (voidError) {
      return { data: null, error: voidError };
    }

    return { data: voidedEntry, error: null };
  }

  /**
   * Get entries by verification number range
   * Useful for reports
   * @param {string} organizationId - Organization ID
   * @param {string} fiscalYearId - Fiscal year ID
   * @param {number} startNumber - Start verification number
   * @param {number} endNumber - End verification number
   * @returns {Promise<{data: Array|null, error: Error|null}>}
   */
  async byVerificationRange(organizationId, fiscalYearId, startNumber, endNumber) {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select(`
        *,
        lines:journal_entry_lines(
          id,
          account_id,
          account:accounts(id, account_number, name),
          debit_amount,
          credit_amount,
          description,
          line_order
        )
      `)
      .eq('organization_id', organizationId)
      .eq('fiscal_year_id', fiscalYearId)
      .gte('verification_number', startNumber)
      .lte('verification_number', endNumber)
      .order('verification_number', { ascending: true });

    return { data, error };
  }

  /**
   * Get entries for a specific account
   * Useful for ledger/account reports
   * @param {string} organizationId - Organization ID
   * @param {string} accountId - Account ID
   * @param {string} fiscalYearId - Fiscal year ID (optional)
   * @returns {Promise<{data: Array|null, error: Error|null}>}
   */
  async byAccount(organizationId, accountId, fiscalYearId = null) {
    let query = this.supabase
      .from('journal_entry_lines')
      .select(`
        *,
        journal_entry:journal_entries!inner(
          id,
          organization_id,
          fiscal_year_id,
          verification_number,
          entry_date,
          description,
          status
        )
      `)
      .eq('account_id', accountId)
      .eq('journal_entry.organization_id', organizationId)
      .eq('journal_entry.status', 'posted')
      .order('journal_entry(entry_date)', { ascending: true });

    if (fiscalYearId) {
      query = query.eq('journal_entry.fiscal_year_id', fiscalYearId);
    }

    const { data, error } = await query;
    return { data, error };
  }

  /**
   * Get ledger data for an account with optional date range filter
   * US-220: General Ledger View
   * @param {Object} options - Query options
   * @param {string} options.organizationId - Organization ID (required)
   * @param {string} options.accountId - Account ID (required)
   * @param {string} options.fiscalYearId - Fiscal year ID (optional)
   * @param {string} options.startDate - Start date filter YYYY-MM-DD (optional)
   * @param {string} options.endDate - End date filter YYYY-MM-DD (optional)
   * @returns {Promise<{data: Array|null, error: Error|null}>}
   */
  async getLedgerData({ organizationId, accountId, fiscalYearId = null, startDate = null, endDate = null }) {
    if (!organizationId || !accountId) {
      return { data: null, error: new Error('Organization ID and Account ID are required') };
    }

    let query = this.supabase
      .from('journal_entry_lines')
      .select(`
        id,
        account_id,
        debit_amount,
        credit_amount,
        description,
        journal_entry:journal_entries!inner(
          id,
          organization_id,
          fiscal_year_id,
          verification_number,
          entry_date,
          description,
          status
        )
      `)
      .eq('account_id', accountId)
      .eq('journal_entry.organization_id', organizationId)
      .eq('journal_entry.status', 'posted')
      .order('journal_entry(entry_date)', { ascending: true })
      .order('journal_entry(verification_number)', { ascending: true });

    if (fiscalYearId) {
      query = query.eq('journal_entry.fiscal_year_id', fiscalYearId);
    }

    if (startDate) {
      query = query.gte('journal_entry.entry_date', startDate);
    }

    if (endDate) {
      query = query.lte('journal_entry.entry_date', endDate);
    }

    const { data, error } = await query;

    if (error) {
      return { data: null, error };
    }

    // Calculate running balance for each transaction
    // For balance sheet accounts (assets, liabilities, equity): Debit increases, Credit decreases for assets; opposite for liabilities/equity
    // For income statement accounts (revenue, expenses): Revenue credits, Expenses debits
    // Simple approach: running balance = sum of (debit - credit) for each line
    let runningBalance = 0;
    const ledgerEntries = (data || []).map((line) => {
      const debit = parseFloat(line.debit_amount) || 0;
      const credit = parseFloat(line.credit_amount) || 0;
      runningBalance += debit - credit;

      return {
        id: line.id,
        journalEntryId: line.journal_entry.id,
        verificationNumber: line.journal_entry.verification_number,
        entryDate: line.journal_entry.entry_date,
        entryDescription: line.journal_entry.description,
        lineDescription: line.description,
        debit,
        credit,
        balance: Math.round(runningBalance * 100) / 100,
      };
    });

    return { data: ledgerEntries, error: null };
  }

  /**
   * Get opening balance for an account before a given date
   * @param {Object} options - Query options
   * @param {string} options.organizationId - Organization ID (required)
   * @param {string} options.accountId - Account ID (required)
   * @param {string} options.fiscalYearId - Fiscal year ID (optional)
   * @param {string} options.beforeDate - Date to calculate opening balance before
   * @returns {Promise<{data: number, error: Error|null}>}
   */
  async getOpeningBalance({ organizationId, accountId, fiscalYearId = null, beforeDate }) {
    if (!organizationId || !accountId) {
      return { data: 0, error: new Error('Organization ID and Account ID are required') };
    }

    let query = this.supabase
      .from('journal_entry_lines')
      .select(`
        debit_amount,
        credit_amount,
        journal_entry:journal_entries!inner(
          organization_id,
          fiscal_year_id,
          entry_date,
          status
        )
      `)
      .eq('account_id', accountId)
      .eq('journal_entry.organization_id', organizationId)
      .eq('journal_entry.status', 'posted');

    if (fiscalYearId) {
      query = query.eq('journal_entry.fiscal_year_id', fiscalYearId);
    }

    if (beforeDate) {
      query = query.lt('journal_entry.entry_date', beforeDate);
    }

    const { data, error } = await query;

    if (error) {
      return { data: 0, error };
    }

    // Sum all debits - credits to get opening balance
    const balance = (data || []).reduce((sum, line) => {
      const debit = parseFloat(line.debit_amount) || 0;
      const credit = parseFloat(line.credit_amount) || 0;
      return sum + debit - credit;
    }, 0);

    return { data: Math.round(balance * 100) / 100, error: null };
  }

  /**
   * Get all accounts with transactions (for showing all accounts in General Ledger)
   * US-220: General Ledger View - Show all accounts by default
   * @param {Object} options - Query options
   * @param {string} options.organizationId - Organization ID (required)
   * @param {string} options.fiscalYearId - Fiscal year ID (optional)
   * @param {string} options.startDate - Start date filter YYYY-MM-DD (optional)
   * @param {string} options.endDate - End date filter YYYY-MM-DD (optional)
   * @returns {Promise<{data: Array|null, error: Error|null}>} - Array of accounts with their transactions grouped
   */
  async getAllAccountsLedger({ organizationId, fiscalYearId = null, startDate = null, endDate = null }) {
    if (!organizationId) {
      return { data: null, error: new Error('Organization ID is required') };
    }

    let query = this.supabase
      .from('journal_entry_lines')
      .select(`
        id,
        account_id,
        debit_amount,
        credit_amount,
        description,
        account:accounts!inner(
          id,
          account_number,
          name,
          name_en,
          account_class
        ),
        journal_entry:journal_entries!inner(
          id,
          organization_id,
          fiscal_year_id,
          verification_number,
          entry_date,
          description,
          status
        )
      `)
      .eq('journal_entry.organization_id', organizationId)
      .eq('journal_entry.status', 'posted')
      .order('account(account_number)', { ascending: true })
      .order('journal_entry(entry_date)', { ascending: true })
      .order('journal_entry(verification_number)', { ascending: true });

    if (fiscalYearId) {
      query = query.eq('journal_entry.fiscal_year_id', fiscalYearId);
    }

    if (startDate) {
      query = query.gte('journal_entry.entry_date', startDate);
    }

    if (endDate) {
      query = query.lte('journal_entry.entry_date', endDate);
    }

    const { data, error } = await query;

    if (error) {
      return { data: null, error };
    }

    // Group transactions by account and calculate running balances
    const accountsMap = new Map();

    (data || []).forEach((line) => {
      const accountId = line.account_id;
      const debit = parseFloat(line.debit_amount) || 0;
      const credit = parseFloat(line.credit_amount) || 0;

      if (!accountsMap.has(accountId)) {
        accountsMap.set(accountId, {
          account: {
            id: line.account.id,
            account_number: line.account.account_number,
            name: line.account.name,
            name_en: line.account.name_en,
            account_class: line.account.account_class,
          },
          entries: [],
          totalDebit: 0,
          totalCredit: 0,
          closingBalance: 0,
          runningBalance: 0,
        });
      }

      const accountData = accountsMap.get(accountId);
      accountData.runningBalance += debit - credit;
      accountData.totalDebit += debit;
      accountData.totalCredit += credit;

      accountData.entries.push({
        id: line.id,
        journalEntryId: line.journal_entry.id,
        verificationNumber: line.journal_entry.verification_number,
        entryDate: line.journal_entry.entry_date,
        entryDescription: line.journal_entry.description,
        lineDescription: line.description,
        debit,
        credit,
        balance: Math.round(accountData.runningBalance * 100) / 100,
      });
    });

    // Convert map to array and finalize
    const accountsWithLedger = Array.from(accountsMap.values()).map((acc) => ({
      ...acc,
      closingBalance: Math.round(acc.runningBalance * 100) / 100,
      totalDebit: Math.round(acc.totalDebit * 100) / 100,
      totalCredit: Math.round(acc.totalCredit * 100) / 100,
    }));

    // Sort by account number
    accountsWithLedger.sort((a, b) => 
      a.account.account_number.localeCompare(b.account.account_number)
    );

    return { data: accountsWithLedger, error: null };
  }

  /**
   * Calculate totals for journal entry lines
   * @param {Array} lines - Array of line items
   * @returns {{totalDebit: number, totalCredit: number, difference: number}}
   */
  calculateTotals(lines) {
    const totalDebit = lines.reduce((sum, line) => sum + (parseFloat(line.debit_amount) || 0), 0);
    const totalCredit = lines.reduce((sum, line) => sum + (parseFloat(line.credit_amount) || 0), 0);
    return {
      totalDebit: Math.round(totalDebit * 100) / 100,
      totalCredit: Math.round(totalCredit * 100) / 100,
      difference: Math.round((totalDebit - totalCredit) * 100) / 100,
    };
  }

  /**
   * Validate that a journal entry is balanced
   * @param {Array} lines - Array of line items
   * @returns {string|null} Error message if not balanced, null if balanced
   */
  validateBalance(lines) {
    if (!lines || lines.length < 2) {
      return 'Journal entry must have at least two lines';
    }

    const { totalDebit, totalCredit, difference } = this.calculateTotals(lines);

    if (difference !== 0) {
      return `Entry is not balanced. Debit: ${totalDebit}, Credit: ${totalCredit}, Difference: ${difference}`;
    }

    return null;
  }

  /**
   * Bulk import journal entries from SIE file
   * US-123: SIE Import Fiscal Years and Transactions
   * @param {Array} entries - Array of journal entry objects with lines
   * @param {Object} options - Import options
   * @param {boolean} options.skipExisting - Skip entries with same source_reference
   * @returns {Promise<{data: Object, error: Error|null}>}
   */
  async bulkImport(entries, options = { skipExisting: true }) {
    if (!entries || entries.length === 0) {
      return { data: { imported: 0, skipped: 0, errors: [] }, error: null };
    }

    const { user, error: authError } = await this.getCurrentUser();
    if (authError || !user) {
      return { data: null, error: authError || new Error('Not authenticated') };
    }

    const organizationId = entries[0].organization_id;
    const importErrors = [];
    let imported = 0;
    let skipped = 0;

    // Get existing entries with sie_import source type
    // Use description to track duplicates since source_reference column doesn't exist
    const { data: existing, error: fetchError } = await this.supabase
      .from(this.tableName)
      .select('description')
      .eq('organization_id', organizationId)
      .eq('source_type', 'sie_import');

    if (fetchError) {
      return { data: null, error: fetchError };
    }

    // Build set of existing SIE references (stored in description as "SIE Import A1" etc)
    const existingRefs = new Set(
      (existing || [])
        .map((e) => {
          // Extract SIE reference from description like "SIE Import A1" -> "A1"
          const match = e.description?.match(/^SIE Import (.+)$/);
          return match ? match[1] : null;
        })
        .filter(Boolean)
    );

    // Group entries by fiscal year for verification number assignment
    const entriesByFiscalYear = new Map();
    entries.forEach((entry) => {
      if (!entriesByFiscalYear.has(entry.fiscal_year_id)) {
        entriesByFiscalYear.set(entry.fiscal_year_id, []);
      }
      entriesByFiscalYear.get(entry.fiscal_year_id).push(entry);
    });

    // Process each fiscal year's entries
    for (const [fiscalYearId, yearEntries] of entriesByFiscalYear) {
      // Sort entries by date and original SIE number
      yearEntries.sort((a, b) => {
        const dateCompare = (a.entry_date || '').localeCompare(b.entry_date || '');
        if (dateCompare !== 0) return dateCompare;
        return (a.sie_number || 0) - (b.sie_number || 0);
      });

      for (const entry of yearEntries) {
        // Extract the SIE reference (e.g., "A1" from "SIE Import A1")
        const sieRef = entry.source_reference || `${entry.sie_series || ''}${entry.sie_number || ''}`;
        
        // Skip if already imported
        if (options.skipExisting && existingRefs.has(sieRef)) {
          skipped++;
          continue;
        }

        // Remove non-database fields from entry
        const { lines, sie_series, sie_number, is_opening_balance, source_reference, ...entryData } = entry;

        try {
          // Get the next verification number
          const { data: verificationNumber, error: verNumError } = await this.supabase.rpc(
            'get_next_verification_number',
            {
              p_organization_id: organizationId,
              p_fiscal_year_id: fiscalYearId,
            }
          );

          if (verNumError) {
            importErrors.push({
              entry: sieRef,
              error: `Failed to get verification number: ${verNumError.message}`,
            });
            continue;
          }

          // Create the journal entry as draft first (RLS requires draft status for line inserts)
          const shouldBePosted = entry.status === 'posted';
          const { data: createdEntry, error: createError } = await this.supabase
            .from(this.tableName)
            .insert({
              ...entryData,
              verification_number: verificationNumber,
              created_by: user.id,
              status: 'draft', // Always create as draft first to allow line inserts
              posted_at: null,
              posted_by: null,
            })
            .select()
            .single();

          if (createError) {
            importErrors.push({
              entry: sieRef,
              error: `Failed to create entry: ${createError.message}`,
            });
            continue;
          }

          // Create the lines
          if (lines && lines.length > 0) {
            const linesWithEntryId = lines.map((line, index) => ({
              journal_entry_id: createdEntry.id,
              account_id: line.account_id,
              debit_amount: line.debit_amount || 0,
              credit_amount: line.credit_amount || 0,
              description: line.description || null,
              vat_code: line.vat_code || null,
              vat_amount: line.vat_amount || null,
              cost_center: line.cost_center || null,
              line_order: line.line_order ?? index,
            }));

            const { error: linesError } = await this.supabase
              .from('journal_entry_lines')
              .insert(linesWithEntryId);

            if (linesError) {
              // Rollback: delete the created entry
              await this.delete(createdEntry.id);
              importErrors.push({
                entry: sieRef,
                error: `Failed to create lines: ${linesError.message}`,
              });
              continue;
            }
          }

          // Now update the entry to posted status if needed
          if (shouldBePosted) {
            const { error: postError } = await this.supabase
              .from(this.tableName)
              .update({
                status: 'posted',
                posted_at: new Date().toISOString(),
                posted_by: user.id,
              })
              .eq('id', createdEntry.id);

            if (postError) {
              // Entry and lines were created, but posting failed - log warning but count as imported
              importErrors.push({
                entry: sieRef,
                error: `Entry imported but failed to post: ${postError.message}`,
              });
            }
          }

          imported++;
        } catch (err) {
          importErrors.push({
            entry: sieRef,
            error: err.message,
          });
        }
      }
    }

    return {
      data: {
        imported,
        skipped,
        errors: importErrors,
      },
      error: null,
    };
  }
}

export const JournalEntry = new JournalEntryResource();
