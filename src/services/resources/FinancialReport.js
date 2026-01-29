import { BaseResource } from './BaseResource';

/**
 * FinancialReport Resource
 * Handles financial report generation (Balance Sheet, Income Statement)
 * US-230: Balance Sheet (Balansräkning)
 * US-231: Income Statement (Resultaträkning)
 */
class FinancialReportResource extends BaseResource {
  constructor() {
    super('journal_entry_lines');
  }

  /**
   * Get account balances aggregated by account class for financial reports
   * @param {Object} options - Query options
   * @param {string} options.organizationId - Organization ID (required)
   * @param {string} options.asOfDate - Date to calculate balances as of (required for Balance Sheet)
   * @param {string} options.startDate - Period start date (required for Income Statement)
   * @param {string} options.endDate - Period end date (required for Income Statement)
   * @param {string} options.fiscalYearId - Fiscal year ID (optional)
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  async getAccountBalances({ organizationId, asOfDate, startDate, endDate, fiscalYearId = null }) {
    if (!organizationId) {
      return { data: null, error: new Error('Organization ID is required') };
    }

    // Build the query for account balances
    let query = this.supabase
      .from('journal_entry_lines')
      .select(`
        account_id,
        debit_amount,
        credit_amount,
        account:accounts!inner(
          id,
          account_number,
          name,
          name_en,
          account_class,
          account_type
        ),
        journal_entry:journal_entries!inner(
          id,
          organization_id,
          fiscal_year_id,
          entry_date,
          status
        )
      `)
      .eq('journal_entry.organization_id', organizationId)
      .eq('journal_entry.status', 'posted');

    if (fiscalYearId) {
      query = query.eq('journal_entry.fiscal_year_id', fiscalYearId);
    }

    // Apply date filters
    if (asOfDate) {
      query = query.lte('journal_entry.entry_date', asOfDate);
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

    // Aggregate balances by account
    const accountBalances = new Map();

    (data || []).forEach((line) => {
      const accountId = line.account_id;
      const debit = parseFloat(line.debit_amount) || 0;
      const credit = parseFloat(line.credit_amount) || 0;

      if (!accountBalances.has(accountId)) {
        accountBalances.set(accountId, {
          account: line.account,
          totalDebit: 0,
          totalCredit: 0,
          balance: 0,
        });
      }

      const acc = accountBalances.get(accountId);
      acc.totalDebit += debit;
      acc.totalCredit += credit;
    });

    // Calculate balance for each account
    // Balance sheet accounts: balance = debit - credit (assets are positive with debits)
    // Income statement accounts: balance = credit - debit (revenue is positive with credits)
    const results = Array.from(accountBalances.values()).map((acc) => {
      const { account, totalDebit, totalCredit } = acc;
      let balance;

      // For assets (1xxx) and expenses (4xxx-7xxx): balance = debit - credit
      // For liabilities (2xxx), equity (2xxx), and revenue (3xxx): balance = credit - debit
      const accountNum = parseInt(account.account_number, 10);
      if (accountNum < 2000 || (accountNum >= 4000 && accountNum < 8000)) {
        // Assets (1xxx) or Expenses (4xxx-7xxx)
        balance = totalDebit - totalCredit;
      } else {
        // Liabilities, Equity (2xxx), Revenue (3xxx), Financial (8xxx)
        balance = totalCredit - totalDebit;
      }

      return {
        ...acc,
        balance: Math.round(balance * 100) / 100,
        totalDebit: Math.round(totalDebit * 100) / 100,
        totalCredit: Math.round(totalCredit * 100) / 100,
      };
    });

    // Sort by account number
    results.sort((a, b) => 
      a.account.account_number.localeCompare(b.account.account_number)
    );

    return { data: results, error: null };
  }

  /**
   * Generate Balance Sheet (Balansräkning) data
   * US-230: Balance Sheet
   * Swedish ÅRL format: Assets, Equity & Liabilities
   * @param {Object} options - Query options
   * @param {string} options.organizationId - Organization ID (required)
   * @param {string} options.asOfDate - Balance sheet date (required)
   * @param {string} options.comparativeDate - Comparative period date (optional)
   * @param {string} options.fiscalYearId - Fiscal year ID (optional)
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  async getBalanceSheet({ organizationId, asOfDate, comparativeDate = null, fiscalYearId = null }) {
    if (!organizationId || !asOfDate) {
      return { data: null, error: new Error('Organization ID and asOfDate are required') };
    }

    // Get current period balances
    const { data: currentBalances, error: currentError } = await this.getAccountBalances({
      organizationId,
      asOfDate,
      fiscalYearId,
    });

    if (currentError) {
      return { data: null, error: currentError };
    }

    // Get comparative period balances if requested
    let comparativeBalances = null;
    if (comparativeDate) {
      const { data: compData, error: compError } = await this.getAccountBalances({
        organizationId,
        asOfDate: comparativeDate,
        fiscalYearId,
      });

      if (compError) {
        return { data: null, error: compError };
      }
      comparativeBalances = compData;
    }

    // Build balance sheet structure
    const balanceSheet = this.buildBalanceSheet(currentBalances, comparativeBalances);

    return { data: balanceSheet, error: null };
  }

  /**
   * Build balance sheet structure from account balances
   * Swedish ÅRL format
   */
  buildBalanceSheet(currentBalances, comparativeBalances = null) {
    // Create comparative lookup map
    const comparativeMap = new Map();
    if (comparativeBalances) {
      comparativeBalances.forEach((acc) => {
        comparativeMap.set(acc.account.id, acc.balance);
      });
    }

    // Group accounts by category based on BAS account numbers
    const groups = {
      // TILLGÅNGAR (Assets)
      assets: {
        fixedAssets: {
          name: 'Anläggningstillgångar',
          nameEn: 'Fixed Assets',
          accounts: [],
          total: 0,
          comparativeTotal: 0,
          subgroups: {
            intangible: { name: 'Immateriella anläggningstillgångar', nameEn: 'Intangible Assets', accounts: [], total: 0, comparativeTotal: 0, range: [1000, 1099] },
            tangible: { name: 'Materiella anläggningstillgångar', nameEn: 'Tangible Assets', accounts: [], total: 0, comparativeTotal: 0, range: [1100, 1299] },
            financial: { name: 'Finansiella anläggningstillgångar', nameEn: 'Financial Assets', accounts: [], total: 0, comparativeTotal: 0, range: [1300, 1399] },
          },
        },
        currentAssets: {
          name: 'Omsättningstillgångar',
          nameEn: 'Current Assets',
          accounts: [],
          total: 0,
          comparativeTotal: 0,
          subgroups: {
            inventory: { name: 'Varulager m.m.', nameEn: 'Inventory', accounts: [], total: 0, comparativeTotal: 0, range: [1400, 1499] },
            receivables: { name: 'Kortfristiga fordringar', nameEn: 'Short-term Receivables', accounts: [], total: 0, comparativeTotal: 0, range: [1500, 1799] },
            investments: { name: 'Kortfristiga placeringar', nameEn: 'Short-term Investments', accounts: [], total: 0, comparativeTotal: 0, range: [1800, 1899] },
            cash: { name: 'Kassa och bank', nameEn: 'Cash and Bank', accounts: [], total: 0, comparativeTotal: 0, range: [1900, 1999] },
          },
        },
      },
      // EGET KAPITAL OCH SKULDER (Equity and Liabilities)
      equityAndLiabilities: {
        equity: {
          name: 'Eget kapital',
          nameEn: 'Equity',
          accounts: [],
          total: 0,
          comparativeTotal: 0,
          subgroups: {
            shareCapital: { name: 'Bundet eget kapital', nameEn: 'Restricted Equity', accounts: [], total: 0, comparativeTotal: 0, range: [2080, 2089] },
            retained: { name: 'Fritt eget kapital', nameEn: 'Non-restricted Equity', accounts: [], total: 0, comparativeTotal: 0, range: [2090, 2099] },
          },
        },
        untaxedReserves: {
          name: 'Obeskattade reserver',
          nameEn: 'Untaxed Reserves',
          accounts: [],
          total: 0,
          comparativeTotal: 0,
          range: [2100, 2199],
        },
        provisions: {
          name: 'Avsättningar',
          nameEn: 'Provisions',
          accounts: [],
          total: 0,
          comparativeTotal: 0,
          range: [2200, 2299],
        },
        longTermLiabilities: {
          name: 'Långfristiga skulder',
          nameEn: 'Long-term Liabilities',
          accounts: [],
          total: 0,
          comparativeTotal: 0,
          range: [2300, 2399],
        },
        shortTermLiabilities: {
          name: 'Kortfristiga skulder',
          nameEn: 'Short-term Liabilities',
          accounts: [],
          total: 0,
          comparativeTotal: 0,
          range: [2400, 2999],
        },
      },
    };

    // Categorize accounts
    currentBalances.forEach((accData) => {
      const accountNum = parseInt(accData.account.account_number, 10);
      const comparativeBalance = comparativeMap.get(accData.account.id) || 0;

      const accountEntry = {
        ...accData,
        comparativeBalance,
      };

      // Assets (1xxx)
      if (accountNum >= 1000 && accountNum < 2000) {
        // Fixed Assets
        if (accountNum < 1400) {
          const assetGroups = groups.assets.fixedAssets.subgroups;
          if (accountNum < 1100) {
            assetGroups.intangible.accounts.push(accountEntry);
            assetGroups.intangible.total += accData.balance;
            assetGroups.intangible.comparativeTotal += comparativeBalance;
          } else if (accountNum < 1300) {
            assetGroups.tangible.accounts.push(accountEntry);
            assetGroups.tangible.total += accData.balance;
            assetGroups.tangible.comparativeTotal += comparativeBalance;
          } else {
            assetGroups.financial.accounts.push(accountEntry);
            assetGroups.financial.total += accData.balance;
            assetGroups.financial.comparativeTotal += comparativeBalance;
          }
          groups.assets.fixedAssets.total += accData.balance;
          groups.assets.fixedAssets.comparativeTotal += comparativeBalance;
        }
        // Current Assets
        else {
          const assetGroups = groups.assets.currentAssets.subgroups;
          if (accountNum < 1500) {
            assetGroups.inventory.accounts.push(accountEntry);
            assetGroups.inventory.total += accData.balance;
            assetGroups.inventory.comparativeTotal += comparativeBalance;
          } else if (accountNum < 1800) {
            assetGroups.receivables.accounts.push(accountEntry);
            assetGroups.receivables.total += accData.balance;
            assetGroups.receivables.comparativeTotal += comparativeBalance;
          } else if (accountNum < 1900) {
            assetGroups.investments.accounts.push(accountEntry);
            assetGroups.investments.total += accData.balance;
            assetGroups.investments.comparativeTotal += comparativeBalance;
          } else {
            assetGroups.cash.accounts.push(accountEntry);
            assetGroups.cash.total += accData.balance;
            assetGroups.cash.comparativeTotal += comparativeBalance;
          }
          groups.assets.currentAssets.total += accData.balance;
          groups.assets.currentAssets.comparativeTotal += comparativeBalance;
        }
      }
      // Equity and Liabilities (2xxx)
      else if (accountNum >= 2000 && accountNum < 3000) {
        const eqGroups = groups.equityAndLiabilities;
        if (accountNum < 2100) {
          // Equity
          if (accountNum < 2090) {
            eqGroups.equity.subgroups.shareCapital.accounts.push(accountEntry);
            eqGroups.equity.subgroups.shareCapital.total += accData.balance;
            eqGroups.equity.subgroups.shareCapital.comparativeTotal += comparativeBalance;
          } else {
            eqGroups.equity.subgroups.retained.accounts.push(accountEntry);
            eqGroups.equity.subgroups.retained.total += accData.balance;
            eqGroups.equity.subgroups.retained.comparativeTotal += comparativeBalance;
          }
          eqGroups.equity.total += accData.balance;
          eqGroups.equity.comparativeTotal += comparativeBalance;
        } else if (accountNum < 2200) {
          eqGroups.untaxedReserves.accounts.push(accountEntry);
          eqGroups.untaxedReserves.total += accData.balance;
          eqGroups.untaxedReserves.comparativeTotal += comparativeBalance;
        } else if (accountNum < 2300) {
          eqGroups.provisions.accounts.push(accountEntry);
          eqGroups.provisions.total += accData.balance;
          eqGroups.provisions.comparativeTotal += comparativeBalance;
        } else if (accountNum < 2400) {
          eqGroups.longTermLiabilities.accounts.push(accountEntry);
          eqGroups.longTermLiabilities.total += accData.balance;
          eqGroups.longTermLiabilities.comparativeTotal += comparativeBalance;
        } else {
          eqGroups.shortTermLiabilities.accounts.push(accountEntry);
          eqGroups.shortTermLiabilities.total += accData.balance;
          eqGroups.shortTermLiabilities.comparativeTotal += comparativeBalance;
        }
      }
    });

    // Calculate totals
    const totalAssets =
      groups.assets.fixedAssets.total + groups.assets.currentAssets.total;
    const comparativeTotalAssets =
      groups.assets.fixedAssets.comparativeTotal + groups.assets.currentAssets.comparativeTotal;

    const eqGroups = groups.equityAndLiabilities;
    const totalEquityAndLiabilities =
      eqGroups.equity.total +
      eqGroups.untaxedReserves.total +
      eqGroups.provisions.total +
      eqGroups.longTermLiabilities.total +
      eqGroups.shortTermLiabilities.total;
    const comparativeTotalEquityAndLiabilities =
      eqGroups.equity.comparativeTotal +
      eqGroups.untaxedReserves.comparativeTotal +
      eqGroups.provisions.comparativeTotal +
      eqGroups.longTermLiabilities.comparativeTotal +
      eqGroups.shortTermLiabilities.comparativeTotal;

    // Round all totals
    const roundTotals = (obj) => {
      if (typeof obj.total === 'number') {
        obj.total = Math.round(obj.total * 100) / 100;
      }
      if (typeof obj.comparativeTotal === 'number') {
        obj.comparativeTotal = Math.round(obj.comparativeTotal * 100) / 100;
      }
      if (obj.subgroups) {
        Object.values(obj.subgroups).forEach(roundTotals);
      }
    };

    Object.values(groups.assets).forEach(roundTotals);
    Object.values(groups.equityAndLiabilities).forEach(roundTotals);

    return {
      groups,
      totals: {
        assets: Math.round(totalAssets * 100) / 100,
        assetsComparative: Math.round(comparativeTotalAssets * 100) / 100,
        equityAndLiabilities: Math.round(totalEquityAndLiabilities * 100) / 100,
        equityAndLiabilitiesComparative: Math.round(comparativeTotalEquityAndLiabilities * 100) / 100,
        isBalanced: Math.abs(totalAssets - totalEquityAndLiabilities) < 0.01,
      },
    };
  }

  /**
   * Generate Income Statement (Resultaträkning) data
   * US-231: Income Statement
   * Swedish ÅRL format: Revenue, Costs, Operating Result, Financial Items, Net Result
   * @param {Object} options - Query options
   * @param {string} options.organizationId - Organization ID (required)
   * @param {string} options.startDate - Period start date (required)
   * @param {string} options.endDate - Period end date (required)
   * @param {string} options.comparativeStartDate - Comparative period start (optional)
   * @param {string} options.comparativeEndDate - Comparative period end (optional)
   * @param {string} options.fiscalYearId - Fiscal year ID (optional)
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  async getIncomeStatement({
    organizationId,
    startDate,
    endDate,
    comparativeStartDate = null,
    comparativeEndDate = null,
    fiscalYearId = null,
  }) {
    if (!organizationId || !startDate || !endDate) {
      return { data: null, error: new Error('Organization ID, startDate, and endDate are required') };
    }

    // Get current period balances
    const { data: currentBalances, error: currentError } = await this.getAccountBalances({
      organizationId,
      startDate,
      endDate,
      fiscalYearId,
    });

    if (currentError) {
      return { data: null, error: currentError };
    }

    // Get comparative period balances if requested
    let comparativeBalances = null;
    if (comparativeStartDate && comparativeEndDate) {
      const { data: compData, error: compError } = await this.getAccountBalances({
        organizationId,
        startDate: comparativeStartDate,
        endDate: comparativeEndDate,
        fiscalYearId,
      });

      if (compError) {
        return { data: null, error: compError };
      }
      comparativeBalances = compData;
    }

    // Build income statement structure
    const incomeStatement = this.buildIncomeStatement(currentBalances, comparativeBalances);

    return { data: incomeStatement, error: null };
  }

  /**
   * Build income statement structure from account balances
   * Swedish ÅRL format
   */
  buildIncomeStatement(currentBalances, comparativeBalances = null) {
    // Create comparative lookup map
    const comparativeMap = new Map();
    if (comparativeBalances) {
      comparativeBalances.forEach((acc) => {
        comparativeMap.set(acc.account.id, acc.balance);
      });
    }

    // Group accounts by category based on BAS account numbers
    const groups = {
      // RÖRELSENS INTÄKTER (Operating Revenue)
      operatingRevenue: {
        name: 'Rörelsens intäkter',
        nameEn: 'Operating Revenue',
        accounts: [],
        total: 0,
        comparativeTotal: 0,
        subgroups: {
          netSales: { name: 'Nettoomsättning', nameEn: 'Net Sales', accounts: [], total: 0, comparativeTotal: 0, range: [3000, 3799] },
          otherOperatingIncome: { name: 'Övriga rörelseintäkter', nameEn: 'Other Operating Income', accounts: [], total: 0, comparativeTotal: 0, range: [3900, 3999] },
        },
      },
      // RÖRELSENS KOSTNADER (Operating Expenses)
      operatingExpenses: {
        name: 'Rörelsens kostnader',
        nameEn: 'Operating Expenses',
        accounts: [],
        total: 0,
        comparativeTotal: 0,
        subgroups: {
          goodsForResale: { name: 'Handelsvaror', nameEn: 'Goods for Resale', accounts: [], total: 0, comparativeTotal: 0, range: [4000, 4999] },
          otherExternalExpenses: { name: 'Övriga externa kostnader', nameEn: 'Other External Expenses', accounts: [], total: 0, comparativeTotal: 0, range: [5000, 6999] },
          personnelCosts: { name: 'Personalkostnader', nameEn: 'Personnel Costs', accounts: [], total: 0, comparativeTotal: 0, range: [7000, 7699] },
          depreciation: { name: 'Av- och nedskrivningar', nameEn: 'Depreciation and Amortization', accounts: [], total: 0, comparativeTotal: 0, range: [7700, 7899] },
          otherOperatingExpenses: { name: 'Övriga rörelsekostnader', nameEn: 'Other Operating Expenses', accounts: [], total: 0, comparativeTotal: 0, range: [7900, 7999] },
        },
      },
      // FINANSIELLA POSTER (Financial Items)
      financialItems: {
        name: 'Finansiella poster',
        nameEn: 'Financial Items',
        accounts: [],
        total: 0,
        comparativeTotal: 0,
        subgroups: {
          financialIncome: { name: 'Finansiella intäkter', nameEn: 'Financial Income', accounts: [], total: 0, comparativeTotal: 0, range: [8000, 8399] },
          financialExpenses: { name: 'Finansiella kostnader', nameEn: 'Financial Expenses', accounts: [], total: 0, comparativeTotal: 0, range: [8400, 8699] },
        },
      },
      // BOKSLUTSDISPOSITIONER (Appropriations)
      appropriations: {
        name: 'Bokslutsdispositioner',
        nameEn: 'Appropriations',
        accounts: [],
        total: 0,
        comparativeTotal: 0,
        range: [8800, 8899],
      },
      // SKATTER (Taxes)
      taxes: {
        name: 'Skatt på årets resultat',
        nameEn: 'Income Tax',
        accounts: [],
        total: 0,
        comparativeTotal: 0,
        range: [8900, 8999],
      },
    };

    // Categorize accounts
    currentBalances.forEach((accData) => {
      const accountNum = parseInt(accData.account.account_number, 10);
      const comparativeBalance = comparativeMap.get(accData.account.id) || 0;

      // Skip balance sheet accounts (1xxx, 2xxx)
      if (accountNum < 3000) return;

      const accountEntry = {
        ...accData,
        comparativeBalance,
      };

      // Revenue (3xxx)
      if (accountNum >= 3000 && accountNum < 4000) {
        if (accountNum < 3800) {
          groups.operatingRevenue.subgroups.netSales.accounts.push(accountEntry);
          groups.operatingRevenue.subgroups.netSales.total += accData.balance;
          groups.operatingRevenue.subgroups.netSales.comparativeTotal += comparativeBalance;
        } else if (accountNum >= 3900) {
          groups.operatingRevenue.subgroups.otherOperatingIncome.accounts.push(accountEntry);
          groups.operatingRevenue.subgroups.otherOperatingIncome.total += accData.balance;
          groups.operatingRevenue.subgroups.otherOperatingIncome.comparativeTotal += comparativeBalance;
        }
        groups.operatingRevenue.total += accData.balance;
        groups.operatingRevenue.comparativeTotal += comparativeBalance;
      }
      // Goods/COGS (4xxx)
      else if (accountNum >= 4000 && accountNum < 5000) {
        groups.operatingExpenses.subgroups.goodsForResale.accounts.push(accountEntry);
        groups.operatingExpenses.subgroups.goodsForResale.total += accData.balance;
        groups.operatingExpenses.subgroups.goodsForResale.comparativeTotal += comparativeBalance;
        groups.operatingExpenses.total += accData.balance;
        groups.operatingExpenses.comparativeTotal += comparativeBalance;
      }
      // Other external expenses (5xxx-6xxx)
      else if (accountNum >= 5000 && accountNum < 7000) {
        groups.operatingExpenses.subgroups.otherExternalExpenses.accounts.push(accountEntry);
        groups.operatingExpenses.subgroups.otherExternalExpenses.total += accData.balance;
        groups.operatingExpenses.subgroups.otherExternalExpenses.comparativeTotal += comparativeBalance;
        groups.operatingExpenses.total += accData.balance;
        groups.operatingExpenses.comparativeTotal += comparativeBalance;
      }
      // Personnel costs (7xxx)
      else if (accountNum >= 7000 && accountNum < 7700) {
        groups.operatingExpenses.subgroups.personnelCosts.accounts.push(accountEntry);
        groups.operatingExpenses.subgroups.personnelCosts.total += accData.balance;
        groups.operatingExpenses.subgroups.personnelCosts.comparativeTotal += comparativeBalance;
        groups.operatingExpenses.total += accData.balance;
        groups.operatingExpenses.comparativeTotal += comparativeBalance;
      }
      // Depreciation (77xx-78xx)
      else if (accountNum >= 7700 && accountNum < 7900) {
        groups.operatingExpenses.subgroups.depreciation.accounts.push(accountEntry);
        groups.operatingExpenses.subgroups.depreciation.total += accData.balance;
        groups.operatingExpenses.subgroups.depreciation.comparativeTotal += comparativeBalance;
        groups.operatingExpenses.total += accData.balance;
        groups.operatingExpenses.comparativeTotal += comparativeBalance;
      }
      // Other operating expenses (79xx)
      else if (accountNum >= 7900 && accountNum < 8000) {
        groups.operatingExpenses.subgroups.otherOperatingExpenses.accounts.push(accountEntry);
        groups.operatingExpenses.subgroups.otherOperatingExpenses.total += accData.balance;
        groups.operatingExpenses.subgroups.otherOperatingExpenses.comparativeTotal += comparativeBalance;
        groups.operatingExpenses.total += accData.balance;
        groups.operatingExpenses.comparativeTotal += comparativeBalance;
      }
      // Financial income (80xx-83xx)
      else if (accountNum >= 8000 && accountNum < 8400) {
        groups.financialItems.subgroups.financialIncome.accounts.push(accountEntry);
        groups.financialItems.subgroups.financialIncome.total += accData.balance;
        groups.financialItems.subgroups.financialIncome.comparativeTotal += comparativeBalance;
        groups.financialItems.total += accData.balance;
        groups.financialItems.comparativeTotal += comparativeBalance;
      }
      // Financial expenses (84xx-86xx)
      else if (accountNum >= 8400 && accountNum < 8700) {
        groups.financialItems.subgroups.financialExpenses.accounts.push(accountEntry);
        groups.financialItems.subgroups.financialExpenses.total += accData.balance;
        groups.financialItems.subgroups.financialExpenses.comparativeTotal += comparativeBalance;
        groups.financialItems.total += accData.balance;
        groups.financialItems.comparativeTotal += comparativeBalance;
      }
      // Appropriations (88xx)
      else if (accountNum >= 8800 && accountNum < 8900) {
        groups.appropriations.accounts.push(accountEntry);
        groups.appropriations.total += accData.balance;
        groups.appropriations.comparativeTotal += comparativeBalance;
      }
      // Taxes (89xx)
      else if (accountNum >= 8900 && accountNum < 9000) {
        groups.taxes.accounts.push(accountEntry);
        groups.taxes.total += accData.balance;
        groups.taxes.comparativeTotal += comparativeBalance;
      }
    });

    // Calculate key figures
    const operatingResult = groups.operatingRevenue.total - groups.operatingExpenses.total;
    const operatingResultComparative = groups.operatingRevenue.comparativeTotal - groups.operatingExpenses.comparativeTotal;

    const resultAfterFinancial = operatingResult + groups.financialItems.total;
    const resultAfterFinancialComparative = operatingResultComparative + groups.financialItems.comparativeTotal;

    const resultBeforeTax = resultAfterFinancial + groups.appropriations.total;
    const resultBeforeTaxComparative = resultAfterFinancialComparative + groups.appropriations.comparativeTotal;

    const netResult = resultBeforeTax - groups.taxes.total;
    const netResultComparative = resultBeforeTaxComparative - groups.taxes.comparativeTotal;

    // Round all totals
    const roundTotals = (obj) => {
      if (typeof obj.total === 'number') {
        obj.total = Math.round(obj.total * 100) / 100;
      }
      if (typeof obj.comparativeTotal === 'number') {
        obj.comparativeTotal = Math.round(obj.comparativeTotal * 100) / 100;
      }
      if (obj.subgroups) {
        Object.values(obj.subgroups).forEach(roundTotals);
      }
    };

    Object.values(groups).forEach(roundTotals);

    return {
      groups,
      totals: {
        operatingResult: Math.round(operatingResult * 100) / 100,
        operatingResultComparative: Math.round(operatingResultComparative * 100) / 100,
        resultAfterFinancial: Math.round(resultAfterFinancial * 100) / 100,
        resultAfterFinancialComparative: Math.round(resultAfterFinancialComparative * 100) / 100,
        resultBeforeTax: Math.round(resultBeforeTax * 100) / 100,
        resultBeforeTaxComparative: Math.round(resultBeforeTaxComparative * 100) / 100,
        netResult: Math.round(netResult * 100) / 100,
        netResultComparative: Math.round(netResultComparative * 100) / 100,
      },
    };
  }

  /**
   * Generate VAT Report (Momsrapport) data
   * US-233: VAT Report
   * Swedish Skatteverket format: Output VAT, Input VAT, Net VAT by rate
   * 
   * Swedish VAT rates:
   * - 25% (standard rate)
   * - 12% (food, hotels, camping)
   * - 6% (books, newspapers, public transport, cultural events)
   * - 0% (exports, healthcare, education)
   * 
   * BAS account structure for VAT:
   * - 2610: Output VAT 25% (Utgående moms 25%)
   * - 2620: Output VAT 12% (Utgående moms 12%)
   * - 2630: Output VAT 6% (Utgående moms 6%)
   * - 2640: Input VAT (Ingående moms)
   * - 2650: Input VAT reverse charge (Ingående moms omvänd skattskyldighet)
   * - 2660: VAT on EU acquisitions (Moms på varuförvärv från EU)
   * 
   * @param {Object} options - Query options
   * @param {string} options.organizationId - Organization ID (required)
   * @param {string} options.startDate - Period start date (required)
   * @param {string} options.endDate - Period end date (required)
   * @param {string} options.fiscalYearId - Fiscal year ID (optional)
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  async getVatReport({ organizationId, startDate, endDate, fiscalYearId = null }) {
    if (!organizationId || !startDate || !endDate) {
      return { data: null, error: new Error('Organization ID, startDate, and endDate are required') };
    }

    // Fetch VAT-related transactions
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
          account_type
        ),
        journal_entry:journal_entries!inner(
          id,
          organization_id,
          fiscal_year_id,
          entry_date,
          verification_number,
          description,
          status
        )
      `)
      .eq('journal_entry.organization_id', organizationId)
      .eq('journal_entry.status', 'posted')
      .gte('journal_entry.entry_date', startDate)
      .lte('journal_entry.entry_date', endDate);

    if (fiscalYearId) {
      query = query.eq('journal_entry.fiscal_year_id', fiscalYearId);
    }

    // Filter for VAT accounts (26xx in BAS standard)
    query = query.like('account.account_number', '26%');

    const { data, error } = await query;

    if (error) {
      return { data: null, error };
    }

    // Build VAT report structure
    const vatReport = this.buildVatReport(data || []);

    return { data: vatReport, error: null };
  }

  /**
   * Build VAT report structure from journal entry lines
   * Categorizes VAT by type (output/input) and rate
   */
  buildVatReport(lines) {
    // Initialize VAT categories
    const vatData = {
      outputVat: {
        rate25: { amount: 0, transactions: [] },
        rate12: { amount: 0, transactions: [] },
        rate6: { amount: 0, transactions: [] },
        other: { amount: 0, transactions: [] },
        total: 0,
      },
      inputVat: {
        deductible: { amount: 0, transactions: [] },
        reverseCharge: { amount: 0, transactions: [] },
        euAcquisitions: { amount: 0, transactions: [] },
        total: 0,
      },
      netVat: 0,
    };

    lines.forEach((line) => {
      const accountNumber = line.account.account_number;
      const debit = parseFloat(line.debit_amount) || 0;
      const credit = parseFloat(line.credit_amount) || 0;
      
      // VAT liability accounts are credit accounts, so balance = credit - debit
      // Output VAT (2610, 2620, 2630) increases with credit (VAT collected)
      // Input VAT (2640, 2650, 2660) increases with debit (VAT paid)
      
      const transactionInfo = {
        id: line.id,
        date: line.journal_entry.entry_date,
        entryNumber: line.journal_entry.verification_number,
        description: line.description || line.journal_entry.description,
        accountNumber,
        accountName: line.account.name,
        debit,
        credit,
      };

      // Categorize by account number
      if (accountNumber.startsWith('2610') || accountNumber === '2611' || accountNumber === '2612') {
        // Output VAT 25%
        const amount = credit - debit;
        vatData.outputVat.rate25.amount += amount;
        vatData.outputVat.rate25.transactions.push(transactionInfo);
      } else if (accountNumber.startsWith('2620') || accountNumber === '2621' || accountNumber === '2622') {
        // Output VAT 12%
        const amount = credit - debit;
        vatData.outputVat.rate12.amount += amount;
        vatData.outputVat.rate12.transactions.push(transactionInfo);
      } else if (accountNumber.startsWith('2630') || accountNumber === '2631' || accountNumber === '2632') {
        // Output VAT 6%
        const amount = credit - debit;
        vatData.outputVat.rate6.amount += amount;
        vatData.outputVat.rate6.transactions.push(transactionInfo);
      } else if (accountNumber.startsWith('2640') || accountNumber === '2641') {
        // Input VAT (deductible)
        const amount = debit - credit;
        vatData.inputVat.deductible.amount += amount;
        vatData.inputVat.deductible.transactions.push(transactionInfo);
      } else if (accountNumber.startsWith('2650')) {
        // Input VAT reverse charge
        const amount = debit - credit;
        vatData.inputVat.reverseCharge.amount += amount;
        vatData.inputVat.reverseCharge.transactions.push(transactionInfo);
      } else if (accountNumber.startsWith('2660')) {
        // VAT on EU acquisitions
        const amount = debit - credit;
        vatData.inputVat.euAcquisitions.amount += amount;
        vatData.inputVat.euAcquisitions.transactions.push(transactionInfo);
      } else if (accountNumber.startsWith('26')) {
        // Other output VAT accounts
        const amount = credit - debit;
        vatData.outputVat.other.amount += amount;
        vatData.outputVat.other.transactions.push(transactionInfo);
      }
    });

    // Calculate totals
    vatData.outputVat.total = 
      vatData.outputVat.rate25.amount +
      vatData.outputVat.rate12.amount +
      vatData.outputVat.rate6.amount +
      vatData.outputVat.other.amount;

    vatData.inputVat.total = 
      vatData.inputVat.deductible.amount +
      vatData.inputVat.reverseCharge.amount +
      vatData.inputVat.euAcquisitions.amount;

    // Net VAT = Output VAT - Input VAT
    // Positive = VAT payable to Skatteverket
    // Negative = VAT receivable from Skatteverket
    vatData.netVat = vatData.outputVat.total - vatData.inputVat.total;

    // Round all amounts
    vatData.outputVat.rate25.amount = Math.round(vatData.outputVat.rate25.amount * 100) / 100;
    vatData.outputVat.rate12.amount = Math.round(vatData.outputVat.rate12.amount * 100) / 100;
    vatData.outputVat.rate6.amount = Math.round(vatData.outputVat.rate6.amount * 100) / 100;
    vatData.outputVat.other.amount = Math.round(vatData.outputVat.other.amount * 100) / 100;
    vatData.outputVat.total = Math.round(vatData.outputVat.total * 100) / 100;
    vatData.inputVat.deductible.amount = Math.round(vatData.inputVat.deductible.amount * 100) / 100;
    vatData.inputVat.reverseCharge.amount = Math.round(vatData.inputVat.reverseCharge.amount * 100) / 100;
    vatData.inputVat.euAcquisitions.amount = Math.round(vatData.inputVat.euAcquisitions.amount * 100) / 100;
    vatData.inputVat.total = Math.round(vatData.inputVat.total * 100) / 100;
    vatData.netVat = Math.round(vatData.netVat * 100) / 100;

    return vatData;
  }
}

export const FinancialReport = new FinancialReportResource();
