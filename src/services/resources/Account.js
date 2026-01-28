import { BaseResource } from './BaseResource';

/**
 * Account Resource
 * Handles all chart of accounts data operations
 * Follows Swedish BAS 2024 accounting standard
 */
class AccountResource extends BaseResource {
  constructor() {
    super('accounts');
  }

  /**
   * Get all accounts for the specified organization
   * @param {Object} options - Query options
   * @param {string} options.organizationId - Organization ID to filter by (required)
   * @param {string} options.accountClass - Filter by account class (optional)
   * @param {boolean} options.activeOnly - Only return active accounts (default: true)
   * @returns {Promise<{data: Array|null, error: Error|null}>}
   */
  async index(options = {}) {
    const { 
      organizationId, 
      accountClass, 
      activeOnly = true,
      ...restOptions 
    } = options;

    // organizationId is required - caller must provide it from Redux state
    if (!organizationId) {
      return { data: null, error: new Error('Organization ID is required') };
    }

    const filters = [{ column: 'organization_id', value: organizationId }];

    if (accountClass) {
      filters.push({ column: 'account_class', value: accountClass });
    }

    if (activeOnly) {
      filters.push({ column: 'is_active', value: true });
    }

    return super.index({
      select: '*',
      filters,
      order: 'account_number',
      ascending: true,
      ...restOptions,
    });
  }

  /**
   * Get all accounts including inactive ones
   * @param {string} organizationId - Organization ID
   * @returns {Promise<{data: Array|null, error: Error|null}>}
   */
  async indexAll(organizationId) {
    return this.index({ organizationId, activeOnly: false });
  }

  /**
   * Get accounts by class
   * @param {string} organizationId - Organization ID
   * @param {string} accountClass - Account class (assets, liabilities, equity, revenue, expenses, financial, year_end)
   * @returns {Promise<{data: Array|null, error: Error|null}>}
   */
  async byClass(organizationId, accountClass) {
    return this.index({ organizationId, accountClass });
  }

  /**
   * Get accounts by account number range (useful for reporting)
   * @param {string} organizationId - Organization ID
   * @param {string} startNumber - Start of range (inclusive)
   * @param {string} endNumber - End of range (inclusive)
   * @returns {Promise<{data: Array|null, error: Error|null}>}
   */
  async byRange(organizationId, startNumber, endNumber) {
    if (!organizationId) {
      return { data: null, error: new Error('Organization ID is required') };
    }

    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('organization_id', organizationId)
      .gte('account_number', startNumber)
      .lte('account_number', endNumber)
      .eq('is_active', true)
      .order('account_number', { ascending: true });

    return { data, error };
  }

  /**
   * Search accounts by number or name
   * @param {string} organizationId - Organization ID
   * @param {string} query - Search query
   * @returns {Promise<{data: Array|null, error: Error|null}>}
   */
  async search(organizationId, query) {
    if (!organizationId) {
      return { data: null, error: new Error('Organization ID is required') };
    }

    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .or(`account_number.ilike.%${query}%,name.ilike.%${query}%,name_en.ilike.%${query}%`)
      .order('account_number', { ascending: true });

    return { data, error };
  }

  /**
   * Get child accounts of a parent account
   * @param {string} parentAccountId - Parent account ID
   * @returns {Promise<{data: Array|null, error: Error|null}>}
   */
  async children(parentAccountId) {
    return this.where([
      { column: 'parent_account_id', value: parentAccountId },
      { column: 'is_active', value: true }
    ]);
  }

  /**
   * Create a new account
   * @param {Object} accountData - Account attributes
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  async create(accountData) {
    // Validate required fields
    if (!accountData.organization_id) {
      return { data: null, error: new Error('Organization ID is required') };
    }
    if (!accountData.account_number) {
      return { data: null, error: new Error('Account number is required') };
    }
    if (!accountData.name) {
      return { data: null, error: new Error('Account name is required') };
    }
    if (!accountData.account_class) {
      return { data: null, error: new Error('Account class is required') };
    }

    // Trim strings before creating
    const dataToCreate = {
      ...accountData,
      account_number: accountData.account_number.trim(),
      name: accountData.name.trim(),
      name_en: accountData.name_en?.trim() || null,
      description: accountData.description?.trim() || null,
    };

    return super.create(dataToCreate);
  }

  /**
   * Update an existing account
   * @param {string} id - Account ID
   * @param {Object} updates - Attributes to update
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  async update(id, updates) {
    // Don't allow updating system accounts
    const { data: existing } = await this.show(id);
    if (existing?.is_system) {
      return { data: null, error: new Error('System accounts cannot be modified') };
    }

    // Trim strings if being updated
    const dataToUpdate = {
      ...updates,
      ...(updates.account_number && { account_number: updates.account_number.trim() }),
      ...(updates.name && { name: updates.name.trim() }),
      ...(updates.name_en !== undefined && { name_en: updates.name_en?.trim() || null }),
      ...(updates.description !== undefined && { description: updates.description?.trim() || null }),
    };

    return super.update(id, dataToUpdate);
  }

  /**
   * Activate an account
   * @param {string} id - Account ID
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  async activate(id) {
    return super.update(id, { is_active: true });
  }

  /**
   * Deactivate an account (soft delete)
   * @param {string} id - Account ID
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  async deactivate(id) {
    // Don't allow deactivating system accounts
    const { data: existing } = await this.show(id);
    if (existing?.is_system) {
      return { data: null, error: new Error('System accounts cannot be deactivated') };
    }

    return super.update(id, { is_active: false });
  }

  /**
   * Check if an account number is unique for the organization
   * @param {string} organizationId - Organization ID
   * @param {string} accountNumber - Account number to check
   * @param {string} excludeId - Account ID to exclude (for updates)
   * @returns {Promise<{isUnique: boolean, error: Error|null}>}
   */
  async isAccountNumberUnique(organizationId, accountNumber, excludeId = null) {
    let query = this.supabase
      .from(this.tableName)
      .select('id')
      .eq('organization_id', organizationId)
      .eq('account_number', accountNumber.trim());

    if (excludeId) {
      query = query.neq('id', excludeId);
    }

    const { data, error } = await query;
    
    if (error) {
      return { isUnique: false, error };
    }

    return { isUnique: data.length === 0, error: null };
  }

  /**
   * Get account class mapping for BAS standard
   * Returns the account class based on account number prefix
   * @param {string} accountNumber - Account number
   * @returns {string} Account class
   */
  static getClassFromNumber(accountNumber) {
    const prefix = accountNumber.charAt(0);
    const classMap = {
      '1': 'assets',
      '2': 'liabilities',
      '3': 'revenue',
      '4': 'expenses',
      '5': 'expenses',
      '6': 'expenses',
      '7': 'expenses',
      '8': 'financial',
    };
    return classMap[prefix] || 'expenses';
  }

  /**
   * Seed standard BAS accounts for a new organization
   * @param {string} organizationId - Organization ID
   * @returns {Promise<{data: Array|null, error: Error|null}>}
   */
  async seedBASAccounts(organizationId) {
    if (!organizationId) {
      return { data: null, error: new Error('Organization ID is required') };
    }

    // Key BAS 2024 accounts - a minimal but useful starter set
    const basAccounts = [
      // Class 1 - Assets (Tillgångar)
      { account_number: '1510', name: 'Kundfordringar', name_en: 'Accounts Receivable', account_class: 'assets', account_type: 'detail' },
      { account_number: '1910', name: 'Kassa', name_en: 'Cash', account_class: 'assets', account_type: 'detail' },
      { account_number: '1920', name: 'Plusgiro', name_en: 'Plusgiro', account_class: 'assets', account_type: 'detail' },
      { account_number: '1930', name: 'Företagskonto/checkkonto/affärskonto', name_en: 'Business Account', account_class: 'assets', account_type: 'detail' },
      { account_number: '1940', name: 'Övriga bankkonton', name_en: 'Other Bank Accounts', account_class: 'assets', account_type: 'detail' },

      // Class 2 - Liabilities (Skulder och eget kapital)
      { account_number: '2010', name: 'Eget kapital', name_en: 'Equity', account_class: 'equity', account_type: 'detail' },
      { account_number: '2440', name: 'Leverantörsskulder', name_en: 'Accounts Payable', account_class: 'liabilities', account_type: 'detail' },
      { account_number: '2610', name: 'Utgående moms 25%', name_en: 'Output VAT 25%', account_class: 'liabilities', account_type: 'detail', default_vat_rate: 25 },
      { account_number: '2620', name: 'Utgående moms 12%', name_en: 'Output VAT 12%', account_class: 'liabilities', account_type: 'detail', default_vat_rate: 12 },
      { account_number: '2630', name: 'Utgående moms 6%', name_en: 'Output VAT 6%', account_class: 'liabilities', account_type: 'detail', default_vat_rate: 6 },
      { account_number: '2640', name: 'Ingående moms', name_en: 'Input VAT', account_class: 'liabilities', account_type: 'detail' },
      { account_number: '2650', name: 'Redovisningskonto för moms', name_en: 'VAT Settlement Account', account_class: 'liabilities', account_type: 'detail' },
      { account_number: '2710', name: 'Personalskatt', name_en: 'Employee Withholding Tax', account_class: 'liabilities', account_type: 'detail' },
      { account_number: '2910', name: 'Upplupna löner', name_en: 'Accrued Wages', account_class: 'liabilities', account_type: 'detail' },
      { account_number: '2920', name: 'Upplupna semesterlöner', name_en: 'Accrued Vacation Pay', account_class: 'liabilities', account_type: 'detail' },

      // Class 3 - Revenue (Intäkter)
      { account_number: '3000', name: 'Försäljning och utfört arbete samt övriga momspliktiga intäkter', name_en: 'Sales Revenue', account_class: 'revenue', account_type: 'header' },
      { account_number: '3010', name: 'Försäljning varor 25% moms', name_en: 'Sales Goods 25% VAT', account_class: 'revenue', account_type: 'detail', default_vat_rate: 25 },
      { account_number: '3011', name: 'Försäljning varor 12% moms', name_en: 'Sales Goods 12% VAT', account_class: 'revenue', account_type: 'detail', default_vat_rate: 12 },
      { account_number: '3012', name: 'Försäljning varor 6% moms', name_en: 'Sales Goods 6% VAT', account_class: 'revenue', account_type: 'detail', default_vat_rate: 6 },
      { account_number: '3040', name: 'Försäljning tjänster 25% moms', name_en: 'Sales Services 25% VAT', account_class: 'revenue', account_type: 'detail', default_vat_rate: 25 },
      { account_number: '3041', name: 'Försäljning tjänster 12% moms', name_en: 'Sales Services 12% VAT', account_class: 'revenue', account_type: 'detail', default_vat_rate: 12 },
      { account_number: '3042', name: 'Försäljning tjänster 6% moms', name_en: 'Sales Services 6% VAT', account_class: 'revenue', account_type: 'detail', default_vat_rate: 6 },
      { account_number: '3100', name: 'Försäljning momsfri', name_en: 'Tax-Exempt Sales', account_class: 'revenue', account_type: 'detail', default_vat_rate: 0 },
      { account_number: '3300', name: 'Export', name_en: 'Export Sales', account_class: 'revenue', account_type: 'detail', default_vat_rate: 0 },
      { account_number: '3740', name: 'Öres- och kronutjämning', name_en: 'Rounding Adjustment', account_class: 'revenue', account_type: 'detail' },

      // Class 4 - Cost of Goods Sold (Kostnader för varor)
      { account_number: '4000', name: 'Varuinköp', name_en: 'Purchases', account_class: 'expenses', account_type: 'header' },
      { account_number: '4010', name: 'Inköp material och varor', name_en: 'Materials and Goods Purchases', account_class: 'expenses', account_type: 'detail' },

      // Class 5 - Operating Expenses (Övriga externa kostnader)
      { account_number: '5000', name: 'Lokalkostnader', name_en: 'Premises Costs', account_class: 'expenses', account_type: 'header' },
      { account_number: '5010', name: 'Lokalhyra', name_en: 'Rent', account_class: 'expenses', account_type: 'detail' },
      { account_number: '5400', name: 'Förbrukningsinventarier och förbrukningsmaterial', name_en: 'Consumable Equipment', account_class: 'expenses', account_type: 'header' },
      { account_number: '5410', name: 'Förbrukningsinventarier', name_en: 'Consumable Supplies', account_class: 'expenses', account_type: 'detail' },
      { account_number: '5800', name: 'Resekostnader', name_en: 'Travel Expenses', account_class: 'expenses', account_type: 'header' },
      { account_number: '5810', name: 'Biljetter', name_en: 'Travel Tickets', account_class: 'expenses', account_type: 'detail' },
      { account_number: '5900', name: 'Reklam och PR', name_en: 'Advertising and PR', account_class: 'expenses', account_type: 'header' },
      { account_number: '5910', name: 'Annonsering', name_en: 'Advertising', account_class: 'expenses', account_type: 'detail' },

      // Class 6 - Other Operating Expenses
      { account_number: '6000', name: 'Övriga försäljningskostnader', name_en: 'Other Sales Expenses', account_class: 'expenses', account_type: 'header' },
      { account_number: '6100', name: 'Kontorsmaterial och trycksaker', name_en: 'Office Supplies', account_class: 'expenses', account_type: 'header' },
      { account_number: '6110', name: 'Kontorsmaterial', name_en: 'Office Materials', account_class: 'expenses', account_type: 'detail' },
      { account_number: '6200', name: 'Tele och post', name_en: 'Telephone and Postage', account_class: 'expenses', account_type: 'header' },
      { account_number: '6210', name: 'Telekommunikation', name_en: 'Telecommunications', account_class: 'expenses', account_type: 'detail' },
      { account_number: '6500', name: 'Övriga externa tjänster', name_en: 'Other External Services', account_class: 'expenses', account_type: 'header' },
      { account_number: '6530', name: 'Redovisningstjänster', name_en: 'Accounting Services', account_class: 'expenses', account_type: 'detail' },
      { account_number: '6540', name: 'IT-tjänster', name_en: 'IT Services', account_class: 'expenses', account_type: 'detail' },
      { account_number: '6570', name: 'Bankkostnader', name_en: 'Bank Fees', account_class: 'expenses', account_type: 'detail' },

      // Class 7 - Personnel Costs (Personalkostnader)
      { account_number: '7000', name: 'Löner till kollektivanställda', name_en: 'Wages Collective Employees', account_class: 'expenses', account_type: 'header' },
      { account_number: '7010', name: 'Löner till kollektivanställda', name_en: 'Wages Collective', account_class: 'expenses', account_type: 'detail' },
      { account_number: '7200', name: 'Löner till tjänstemän och företagsledare', name_en: 'Salaries Management', account_class: 'expenses', account_type: 'header' },
      { account_number: '7210', name: 'Löner till tjänstemän', name_en: 'Salaries Employees', account_class: 'expenses', account_type: 'detail' },
      { account_number: '7500', name: 'Sociala och andra avgifter enligt lag och avtal', name_en: 'Social Contributions', account_class: 'expenses', account_type: 'header' },
      { account_number: '7510', name: 'Arbetsgivaravgifter', name_en: 'Employer Contributions', account_class: 'expenses', account_type: 'detail' },

      // Class 8 - Financial Items (Finansiella poster)
      { account_number: '8000', name: 'Finansiella intäkter', name_en: 'Financial Income', account_class: 'financial', account_type: 'header' },
      { account_number: '8300', name: 'Ränteintäkter', name_en: 'Interest Income', account_class: 'financial', account_type: 'detail' },
      { account_number: '8400', name: 'Räntekostnader', name_en: 'Interest Expenses', account_class: 'financial', account_type: 'detail' },
      { account_number: '8910', name: 'Skatt på årets resultat', name_en: 'Income Tax', account_class: 'year_end', account_type: 'detail' },
      { account_number: '8990', name: 'Resultat', name_en: 'Net Income', account_class: 'year_end', account_type: 'total' },
    ];

    // Add organization_id and system flag to each account
    const accountsToInsert = basAccounts.map(account => ({
      ...account,
      organization_id: organizationId,
      is_system: true,
      is_active: true,
    }));

    // Insert all accounts
    const { data, error } = await this.supabase
      .from(this.tableName)
      .insert(accountsToInsert)
      .select();

    return { data, error };
  }

  /**
   * Bulk import accounts from SIE file data
   * @param {string} organizationId - Organization ID
   * @param {Array} accounts - Array of account objects to import
   * @param {boolean} skipExisting - Skip accounts that already exist (default: true)
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  async bulkImport(organizationId, accounts, skipExisting = true) {
    if (!organizationId) {
      return { data: null, error: new Error('Organization ID is required') };
    }

    if (!accounts || accounts.length === 0) {
      return { data: null, error: new Error('No accounts to import') };
    }

    // Get existing account numbers if skipping duplicates
    let existingNumbers = new Set();
    if (skipExisting) {
      const { data: existing } = await this.supabase
        .from(this.tableName)
        .select('account_number')
        .eq('organization_id', organizationId);
      
      if (existing) {
        existingNumbers = new Set(existing.map(a => a.account_number));
      }
    }

    // Filter and prepare accounts for import
    const accountsToInsert = accounts
      .filter(account => {
        if (skipExisting && existingNumbers.has(account.account_number)) {
          return false;
        }
        return true;
      })
      .map(account => ({
        organization_id: organizationId,
        account_number: account.account_number?.trim(),
        name: account.name?.trim(),
        name_en: account.name_en?.trim() || null,
        account_class: account.account_class || 'expenses',
        account_type: account.account_type || 'detail',
        is_system: false,
        is_active: true,
        default_vat_rate: account.default_vat_rate || null,
      }));

    if (accountsToInsert.length === 0) {
      return {
        data: {
          imported: [],
          skipped: accounts.length,
          total: accounts.length,
        },
        error: null,
      };
    }

    // Insert accounts
    const { data, error } = await this.supabase
      .from(this.tableName)
      .insert(accountsToInsert)
      .select();

    if (error) {
      return { data: null, error };
    }

    return {
      data: {
        imported: data,
        skipped: accounts.length - accountsToInsert.length,
        total: accounts.length,
      },
      error: null,
    };
  }
}

// Export singleton instance
export const Account = new AccountResource();
