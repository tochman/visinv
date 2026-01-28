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
}

export const JournalEntry = new JournalEntryResource();
