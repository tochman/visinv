/**
 * SIE File Parser
 * Supports both SIE4 (text format, .se) and SIE5 (XML format, .sie)
 * 
 * SIE (Standard Import Export) is the Swedish standard for 
 * exchanging accounting data between systems.
 */

// Account type mapping from SIE to our system
const ACCOUNT_TYPE_MAP = {
  // SIE5 types
  asset: 'assets',
  liability: 'liabilities',
  equity: 'equity',
  income: 'revenue',
  cost: 'expenses',
  // SIE4 uses account number ranges
};

/**
 * Determine account class from account number (BAS standard)
 */
function getAccountClassFromNumber(accountNumber) {
  const num = parseInt(accountNumber, 10);
  if (num >= 1000 && num < 2000) return 'assets';
  if (num >= 2000 && num < 2100) return 'equity';
  if (num >= 2100 && num < 3000) return 'liabilities';
  if (num >= 3000 && num < 4000) return 'revenue';
  if (num >= 4000 && num < 8000) return 'expenses';
  if (num >= 8000 && num < 9000) return 'financial';
  return 'expenses'; // Default
}

/**
 * Parse SIE4 text format (.se files)
 * Format uses # prefixed records with quoted strings
 */
function parseSIE4(content) {
  const result = {
    format: 'SIE4',
    company: {},
    fiscalYears: [],
    accounts: [],
    openingBalances: [],
    closingBalances: [],
    vouchers: [],
    errors: [],
  };

  // Handle different encodings - SIE4 often uses CP437 or Latin-1
  // The content may already be decoded by the browser
  const lines = content.split(/\r?\n/);

  let currentVoucher = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || !line.startsWith('#')) continue;

    try {
      // Parse the record type and content
      const match = line.match(/^#(\w+)\s*(.*)/);
      if (!match) continue;

      const [, recordType, rest] = match;

      switch (recordType) {
        case 'FLAGGA':
          result.flagga = parseInt(rest, 10);
          break;

        case 'FORMAT':
          result.encoding = rest;
          break;

        case 'SIETYP':
          result.sieType = parseInt(rest, 10);
          break;

        case 'PROGRAM':
          result.program = parseQuotedString(rest);
          break;

        case 'GEN':
          result.generatedDate = rest;
          break;

        case 'FNAMN':
          result.company.name = parseQuotedString(rest);
          break;

        case 'FNR':
          result.company.clientId = parseQuotedString(rest);
          break;

        case 'ORGNR':
          result.company.organizationNumber = rest.trim();
          break;

        case 'ADRESS':
          result.company.address = parseQuotedStrings(rest);
          break;

        case 'RAR': {
          // Fiscal year: #RAR 0 20160101 20161231
          const [yearIndex, start, end] = rest.split(/\s+/);
          result.fiscalYears.push({
            index: parseInt(yearIndex, 10),
            start: parseDate(start),
            end: parseDate(end),
          });
          break;
        }

        case 'KPTYP':
          result.chartOfAccountsType = rest.trim();
          break;

        case 'KONTO': {
          // Account: #KONTO 1510 "Kundfordringar"
          const accountMatch = rest.match(/^(\d+)\s+"([^"]+)"/);
          if (accountMatch) {
            const [, number, name] = accountMatch;
            result.accounts.push({
              account_number: number,
              name: name,
              account_class: getAccountClassFromNumber(number),
              account_type: 'detail',
            });
          }
          break;
        }

        case 'SRU': {
          // SRU code for tax reporting - link to last account
          // #SRU 1510 7251
          const sruMatch = rest.match(/^(\d+)\s+(\d+)/);
          if (sruMatch && result.accounts.length > 0) {
            const lastAccount = result.accounts[result.accounts.length - 1];
            if (lastAccount.account_number === sruMatch[1]) {
              lastAccount.sru_code = sruMatch[2];
            }
          }
          break;
        }

        case 'IB': {
          // Opening balance: #IB 0 1510 432056
          const ibMatch = rest.match(/^(-?\d+)\s+(\d+)\s+([\d.-]+)/);
          if (ibMatch) {
            const [, yearIndex, account, amount] = ibMatch;
            result.openingBalances.push({
              yearIndex: parseInt(yearIndex, 10),
              account_number: account,
              amount: parseFloat(amount),
            });
          }
          break;
        }

        case 'UB': {
          // Closing balance: #UB 0 1510 550231
          const ubMatch = rest.match(/^(-?\d+)\s+(\d+)\s+([\d.-]+)/);
          if (ubMatch) {
            const [, yearIndex, account, amount] = ubMatch;
            result.closingBalances.push({
              yearIndex: parseInt(yearIndex, 10),
              account_number: account,
              amount: parseFloat(amount),
            });
          }
          break;
        }

        case 'RES': {
          // Result balance (for income statement accounts)
          const resMatch = rest.match(/^(-?\d+)\s+(\d+)\s+([\d.-]+)/);
          if (resMatch) {
            const [, yearIndex, account, amount] = resMatch;
            result.closingBalances.push({
              yearIndex: parseInt(yearIndex, 10),
              account_number: account,
              amount: parseFloat(amount),
              isResult: true,
            });
          }
          break;
        }

        case 'VER': {
          // Voucher header: #VER A 1 20140102 "Text" or #VER "A" 1 20140102 "Text"
          // SIE4 can have series with or without quotes
          const verMatch = rest.match(/^"?([A-Za-z]*)"?\s*(\d+)\s+(\d{8})\s+"([^"]*)"/);
          if (verMatch) {
            const [, series, number, date, text] = verMatch;
            currentVoucher = {
              series: series || 'A', // Default to 'A' if no series
              number: parseInt(number, 10),
              date: parseDate(date),
              text,
              transactions: [],
            };
            result.vouchers.push(currentVoucher);
          }
          break;
        }

        case 'TRANS': {
          // Transaction line: #TRANS 1510 {} 100.00 20140102 "Text"
          // Format: #TRANS account {dimensions} amount [date] ["text"]
          if (currentVoucher) {
            // Match: account, {dimensions}, amount, optional date, optional text
            const transMatch = rest.match(/^(\d+)\s*\{([^}]*)\}\s*([\d.-]+)(?:\s+(\d{8}))?(?:\s+"([^"]*)")?/);
            if (transMatch) {
              const [, account, _dimensions, amount, date, text] = transMatch;
              currentVoucher.transactions.push({
                account_number: account,
                amount: parseFloat(amount),
                date: date ? parseDate(date) : currentVoucher.date, // Use voucher date if not specified
                text: text || currentVoucher.text, // Use voucher text if not specified
              });
            }
          }
          break;
        }

        default:
          // Unknown record type - ignore
          break;
      }
    } catch (err) {
      result.errors.push({
        line: i + 1,
        content: line.substring(0, 50),
        error: err.message,
      });
    }
  }

  return result;
}

/**
 * Parse SIE5 XML format (.sie files)
 */
function parseSIE5(content) {
  const result = {
    format: 'SIE5',
    company: {},
    fiscalYears: [],
    accounts: [],
    openingBalances: [],
    closingBalances: [],
    vouchers: [],
    errors: [],
  };

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, 'text/xml');

    // Check for parse errors
    const parseError = doc.querySelector('parsererror');
    if (parseError) {
      result.errors.push({
        error: 'XML parse error',
        details: parseError.textContent,
      });
      return result;
    }

    // FileInfo
    const fileInfo = doc.querySelector('FileInfo');
    if (fileInfo) {
      // Software
      const software = fileInfo.querySelector('SoftwareProduct');
      if (software) {
        result.program = `${software.getAttribute('name')} ${software.getAttribute('version')}`;
      }

      // Company
      const company = fileInfo.querySelector('Company');
      if (company) {
        result.company = {
          name: company.getAttribute('name'),
          organizationNumber: company.getAttribute('organizationId'),
          clientId: company.getAttribute('clientId'),
        };
      }

      // Fiscal years
      const fiscalYears = fileInfo.querySelectorAll('FiscalYear');
      fiscalYears.forEach((fy, index) => {
        result.fiscalYears.push({
          index: fy.getAttribute('primary') === 'true' ? 0 : -index - 1,
          start: fy.getAttribute('start'),
          end: fy.getAttribute('end'),
          closed: fy.getAttribute('closed') === 'true',
          primary: fy.getAttribute('primary') === 'true',
        });
      });

      // Currency
      const currency = fileInfo.querySelector('AccountingCurrency');
      if (currency) {
        result.currency = currency.getAttribute('currency');
      }
    }

    // Accounts
    const accounts = doc.querySelectorAll('Accounts > Account');
    accounts.forEach((account) => {
      const accountNumber = account.getAttribute('id');
      const sieType = account.getAttribute('type');

      const accountData = {
        account_number: accountNumber,
        name: account.getAttribute('name'),
        account_class: ACCOUNT_TYPE_MAP[sieType] || getAccountClassFromNumber(accountNumber),
        account_type: 'detail',
      };

      result.accounts.push(accountData);

      // Opening balance
      const openingBalance = account.querySelector('OpeningBalance');
      if (openingBalance) {
        result.openingBalances.push({
          account_number: accountNumber,
          month: openingBalance.getAttribute('month'),
          amount: parseFloat(openingBalance.getAttribute('amount')),
        });
      }

      // Closing balance
      const closingBalance = account.querySelector('ClosingBalance');
      if (closingBalance) {
        result.closingBalances.push({
          account_number: accountNumber,
          month: closingBalance.getAttribute('month'),
          amount: parseFloat(closingBalance.getAttribute('amount')),
        });
      }
    });

    // Vouchers
    const vouchers = doc.querySelectorAll('Vouchers > Voucher');
    vouchers.forEach((voucher) => {
      const voucherData = {
        id: voucher.getAttribute('id'),
        date: voucher.getAttribute('date'),
        text: voucher.getAttribute('text'),
        transactions: [],
      };

      const transactions = voucher.querySelectorAll('Transaction');
      transactions.forEach((trans) => {
        voucherData.transactions.push({
          account_number: trans.getAttribute('accountId'),
          amount: parseFloat(trans.getAttribute('amount')),
          text: trans.getAttribute('text'),
        });
      });

      result.vouchers.push(voucherData);
    });
  } catch (err) {
    result.errors.push({
      error: 'XML processing error',
      details: err.message,
    });
  }

  return result;
}

/**
 * Helper: Parse quoted string from SIE4 format
 */
function parseQuotedString(str) {
  const match = str.match(/"([^"]*)"/);
  return match ? match[1] : str.trim();
}

/**
 * Helper: Parse multiple quoted strings
 */
function parseQuotedStrings(str) {
  const matches = str.match(/"[^"]*"/g) || [];
  return matches.map((s) => s.replace(/"/g, ''));
}

/**
 * Helper: Parse date from YYYYMMDD format
 */
function parseDate(dateStr) {
  if (!dateStr || dateStr.length < 8) return null;
  const year = dateStr.substring(0, 4);
  const month = dateStr.substring(4, 6);
  const day = dateStr.substring(6, 8);
  return `${year}-${month}-${day}`;
}

/**
 * Detect SIE format from file content
 */
function detectFormat(content) {
  const trimmed = content.trim();
  if (trimmed.startsWith('<?xml') || trimmed.startsWith('<Sie')) {
    return 'SIE5';
  }
  if (trimmed.startsWith('#FLAGGA') || trimmed.startsWith('#FORMAT')) {
    return 'SIE4';
  }
  // Try to detect by looking for common patterns
  if (content.includes('<Account') || content.includes('<Voucher')) {
    return 'SIE5';
  }
  if (content.includes('#KONTO') || content.includes('#VER')) {
    return 'SIE4';
  }
  return 'unknown';
}

/**
 * Main parse function - auto-detects format
 * @param {string} content - File content
 * @param {string} filename - Original filename (for format hints)
 * @returns {Object} Parsed SIE data
 */
export function parseSIE(content, filename = '') {
  // Detect format
  let format = detectFormat(content);

  // Use file extension as hint if detection failed
  if (format === 'unknown') {
    const ext = filename.split('.').pop().toLowerCase();
    if (ext === 'se') format = 'SIE4';
    else if (ext === 'sie') format = 'SIE5';
  }

  if (format === 'SIE4') {
    return parseSIE4(content);
  } else if (format === 'SIE5') {
    return parseSIE5(content);
  }

  return {
    format: 'unknown',
    errors: [{ error: 'Unable to detect SIE format' }],
    accounts: [],
    openingBalances: [],
    closingBalances: [],
    vouchers: [],
  };
}

/**
 * Validate parsed SIE data
 * @param {Object} data - Parsed SIE data
 * @returns {Object} Validation result with errors and warnings
 */
export function validateSIE(data) {
  const errors = [];
  const warnings = [];

  // Check for parse errors
  if (data.errors && data.errors.length > 0) {
    errors.push(...data.errors.map((e) => e.error || e.details || 'Parse error'));
  }

  // Check for company info
  if (!data.company?.name) {
    warnings.push('Company name not found in file');
  }

  // Check for accounts
  if (!data.accounts || data.accounts.length === 0) {
    warnings.push('No accounts found in file');
  }

  // Check for duplicate account numbers
  const accountNumbers = new Set();
  data.accounts?.forEach((account) => {
    if (accountNumbers.has(account.account_number)) {
      warnings.push(`Duplicate account number: ${account.account_number}`);
    }
    accountNumbers.add(account.account_number);
  });

  // Check for invalid account numbers
  data.accounts?.forEach((account) => {
    if (!/^\d{4,6}$/.test(account.account_number)) {
      warnings.push(`Invalid account number format: ${account.account_number}`);
    }
  });

  // Validate vouchers are balanced
  data.vouchers?.forEach((voucher) => {
    if (voucher.transactions && voucher.transactions.length > 0) {
      const totalAmount = voucher.transactions.reduce((sum, t) => sum + (t.amount || 0), 0);
      if (Math.abs(totalAmount) > 0.01) {
        warnings.push(`Voucher ${voucher.series}${voucher.number} is not balanced (off by ${totalAmount.toFixed(2)})`);
      }
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    summary: {
      format: data.format,
      company: data.company?.name,
      accountCount: data.accounts?.length || 0,
      fiscalYearCount: data.fiscalYears?.length || 0,
      voucherCount: data.vouchers?.length || 0,
      transactionCount: data.vouchers?.reduce((sum, v) => sum + (v.transactions?.length || 0), 0) || 0,
      openingBalanceCount: data.openingBalances?.length || 0,
      closingBalanceCount: data.closingBalances?.length || 0,
      hasOpeningBalances: (data.openingBalances?.length || 0) > 0,
      hasClosingBalances: (data.closingBalances?.length || 0) > 0,
      hasFiscalYears: (data.fiscalYears?.length || 0) > 0,
      hasVouchers: (data.vouchers?.length || 0) > 0,
    },
  };
}

/**
 * Convert parsed accounts to format ready for import
 * @param {Array} accounts - Parsed accounts from SIE
 * @param {string} organizationId - Target organization ID
 * @returns {Array} Accounts ready for database import
 */
export function prepareAccountsForImport(accounts, organizationId) {
  return accounts.map((account) => ({
    organization_id: organizationId,
    account_number: account.account_number,
    name: account.name,
    name_en: null, // SIE files typically don't have English names
    account_class: account.account_class,
    account_type: account.account_type || 'detail',
    is_system: false,
    is_active: true,
    default_vat_rate: null,
  }));
}

/**
 * Normalize a SIE date to YYYY-MM-DD format
 * Handles: YYYYMMDD (SIE4), YYYY-MM-DD (ISO), YYYY-MM (SIE5 partial)
 * @param {string} dateStr - Date string from SIE file
 * @param {boolean} isEndDate - If true, use last day of month for partial dates
 * @returns {string} Date in YYYY-MM-DD format
 */
function normalizeSieDate(dateStr, isEndDate = false) {
  if (!dateStr) return null;
  
  // Already in YYYY-MM-DD format
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }
  
  // SIE4 format: YYYYMMDD
  if (/^\d{8}$/.test(dateStr)) {
    return `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`;
  }
  
  // SIE5 format: YYYY-MM (partial date)
  if (/^\d{4}-\d{2}$/.test(dateStr)) {
    const year = parseInt(dateStr.substring(0, 4), 10);
    const month = parseInt(dateStr.substring(5, 7), 10);
    
    if (isEndDate) {
      // Get last day of the month
      const lastDay = new Date(year, month, 0).getDate();
      return `${dateStr}-${String(lastDay).padStart(2, '0')}`;
    } else {
      // First day of the month
      return `${dateStr}-01`;
    }
  }
  
  // Unknown format, return as-is
  return dateStr;
}

/**
 * Convert parsed fiscal years to format ready for import
 * @param {Array} fiscalYears - Parsed fiscal years from SIE (#RAR records)
 * @param {string} organizationId - Target organization ID
 * @returns {Array} Fiscal years ready for database import
 */
export function prepareFiscalYearsForImport(fiscalYears, organizationId) {
  return fiscalYears.map((fy) => {
    // Normalize dates to YYYY-MM-DD format
    const startDate = normalizeSieDate(fy.start, false);
    const endDate = normalizeSieDate(fy.end, true);
    
    // Extract year from start date for name
    const startYear = startDate ? startDate.substring(0, 4) : '';
    const endYear = endDate ? endDate.substring(0, 4) : '';
    
    // Create name: "2016" or "2015/2016" for split years
    const name = startYear === endYear ? startYear : `${startYear}/${endYear}`;
    
    return {
      organization_id: organizationId,
      name: name,
      start_date: startDate,
      end_date: endDate,
      is_closed: fy.closed || fy.index < 0, // Previous years (negative index) are typically closed
      sie_index: fy.index, // Keep track of original SIE index for mapping
    };
  });
}

/**
 * Convert parsed vouchers to journal entries format ready for import
 * @param {Array} vouchers - Parsed vouchers from SIE (#VER with #TRANS)
 * @param {string} organizationId - Target organization ID
 * @param {Map} accountMap - Map of account_number to account_id
 * @param {Map} fiscalYearMap - Map of year (e.g., "2016") to fiscal_year_id
 * @returns {Object} { entries: Array, errors: Array }
 */
export function prepareJournalEntriesForImport(vouchers, organizationId, accountMap, fiscalYearMap) {
  const entries = [];
  const errors = [];

  vouchers.forEach((voucher, index) => {
    // Validate that the voucher has transactions
    if (!voucher.transactions || voucher.transactions.length === 0) {
      errors.push({
        voucher: `${voucher.series}${voucher.number}`,
        error: 'Voucher has no transactions',
      });
      return;
    }

    // Determine fiscal year from voucher date
    const voucherYear = voucher.date ? voucher.date.substring(0, 4) : null;
    const fiscalYearId = voucherYear ? fiscalYearMap.get(voucherYear) : null;

    if (!fiscalYearId) {
      errors.push({
        voucher: `${voucher.series}${voucher.number}`,
        date: voucher.date,
        error: `No fiscal year found for date ${voucher.date}`,
      });
      return;
    }

    // Prepare journal entry lines
    const lines = [];
    let hasAccountError = false;

    voucher.transactions.forEach((trans, lineIndex) => {
      const accountId = accountMap.get(trans.account_number);
      
      if (!accountId) {
        errors.push({
          voucher: `${voucher.series}${voucher.number}`,
          account: trans.account_number,
          error: `Account ${trans.account_number} not found in system`,
        });
        hasAccountError = true;
        return;
      }

      // In SIE, positive amounts are debits, negative amounts are credits
      const amount = trans.amount;
      const debitAmount = amount > 0 ? Math.abs(amount) : 0;
      const creditAmount = amount < 0 ? Math.abs(amount) : 0;

      lines.push({
        account_id: accountId,
        debit_amount: debitAmount,
        credit_amount: creditAmount,
        description: trans.text || voucher.text || null,
        line_order: lineIndex,
      });
    });

    // Skip entry if there were account errors
    if (hasAccountError) {
      return;
    }

    // Validate balance (sum of debits should equal sum of credits)
    const totalDebit = lines.reduce((sum, line) => sum + line.debit_amount, 0);
    const totalCredit = lines.reduce((sum, line) => sum + line.credit_amount, 0);

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      errors.push({
        voucher: `${voucher.series}${voucher.number}`,
        totalDebit,
        totalCredit,
        error: `Voucher is not balanced: debit ${totalDebit.toFixed(2)} != credit ${totalCredit.toFixed(2)}`,
      });
      return;
    }

    // Create the journal entry
    // Always include SIE reference in description for duplicate detection
    const sieRef = `${voucher.series}${voucher.number}`;
    const description = voucher.text
      ? `SIE Import ${sieRef}: ${voucher.text}`
      : `SIE Import ${sieRef}`;

    entries.push({
      organization_id: organizationId,
      fiscal_year_id: fiscalYearId,
      entry_date: voucher.date,
      description,
      source_type: 'sie_import',
      source_reference: sieRef,
      status: 'posted',
      lines,
      // Store original SIE data for reference
      sie_series: voucher.series,
      sie_number: voucher.number,
    });
  });

  return { entries, errors };
}

/**
 * Prepare opening balance journal entries from parsed balances
 * Creates journal entries at the start of each fiscal year with opening balances
 * Handles both SIE4 format (yearIndex) and SIE5 format (month like "2014-01")
 * @param {Array} openingBalances - Parsed #IB records (SIE4) or OpeningBalance elements (SIE5)
 * @param {Array} fiscalYears - Parsed fiscal years 
 * @param {string} organizationId - Target organization ID
 * @param {Map} accountMap - Map of account_number to account_id
 * @param {Map} fiscalYearMap - Map of year to fiscal_year_id
 * @returns {Object} { entries: Array, errors: Array }
 */
export function prepareOpeningBalanceEntries(openingBalances, fiscalYears, organizationId, accountMap, fiscalYearMap) {
  const entries = [];
  const errors = [];

  // Detect format and group opening balances by fiscal year
  // SIE4: uses yearIndex (0, -1, -2, etc.)
  // SIE5: uses month like "2014-01"
  const balancesByYearKey = new Map();
  
  openingBalances.forEach((balance) => {
    let yearKey;
    
    if (balance.yearIndex !== undefined) {
      // SIE4 format - use yearIndex directly
      yearKey = `idx:${balance.yearIndex}`;
    } else if (balance.month) {
      // SIE5 format - extract year from month "2014-01" -> "2014"
      yearKey = `year:${balance.month.substring(0, 4)}`;
    } else {
      errors.push({
        account: balance.account_number,
        error: 'Opening balance has no year reference',
      });
      return;
    }
    
    if (!balancesByYearKey.has(yearKey)) {
      balancesByYearKey.set(yearKey, []);
    }
    balancesByYearKey.get(yearKey).push(balance);
  });

  // Process each year's balances
  balancesByYearKey.forEach((balances, yearKey) => {
    let fiscalYear;
    let fiscalYearId;
    let entryDate;
    let yearLabel;
    
    if (yearKey.startsWith('idx:')) {
      // SIE4 format - find fiscal year by index
      const yearIndex = parseInt(yearKey.substring(4), 10);
      fiscalYear = fiscalYears.find((fy) => fy.index === yearIndex);
      
      if (!fiscalYear) {
        errors.push({
          yearKey,
          error: `No fiscal year found for index ${yearIndex}`,
        });
        return;
      }
      
      const startYear = fiscalYear.start ? fiscalYear.start.substring(0, 4) : null;
      fiscalYearId = startYear ? fiscalYearMap.get(startYear) : null;
      entryDate = normalizeSieDate(fiscalYear.start, false);
      yearLabel = startYear;
    } else {
      // SIE5 format - find fiscal year by year
      const year = yearKey.substring(5); // Remove "year:" prefix
      fiscalYearId = fiscalYearMap.get(year);
      
      // Find matching fiscal year for entry date
      fiscalYear = fiscalYears.find((fy) => {
        const fyStart = fy.start?.substring(0, 4);
        return fyStart === year;
      });
      
      entryDate = fiscalYear ? normalizeSieDate(fiscalYear.start, false) : `${year}-01-01`;
      yearLabel = year;
    }
    
    if (!fiscalYearId) {
      errors.push({
        yearKey,
        error: `Fiscal year ID not found for ${yearLabel}`,
      });
      return;
    }

    const lines = [];
    let hasError = false;

    balances.forEach((balance, lineIndex) => {
      const accountId = accountMap.get(balance.account_number);
      
      if (!accountId) {
        errors.push({
          yearKey,
          account: balance.account_number,
          error: `Account ${balance.account_number} not found for opening balance`,
        });
        hasError = true;
        return;
      }

      // Opening balances: positive amounts are typically debit for assets, credit for liabilities
      // But we store them as the actual balance would appear
      const amount = balance.amount;
      const debitAmount = amount > 0 ? Math.abs(amount) : 0;
      const creditAmount = amount < 0 ? Math.abs(amount) : 0;

      lines.push({
        account_id: accountId,
        debit_amount: debitAmount,
        credit_amount: creditAmount,
        description: 'Opening balance / Ingående balans',
        line_order: lineIndex,
      });
    });

    if (hasError || lines.length === 0) {
      return;
    }

    // Opening balances from SIE should be balanced (assets = liabilities + equity)
    // If not balanced, it's typically because some accounts are missing
    const totalDebit = lines.reduce((sum, line) => sum + line.debit_amount, 0);
    const totalCredit = lines.reduce((sum, line) => sum + line.credit_amount, 0);

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      // Not balanced - this is informational, the entry can still be created
      // but we'll note it as a warning
      errors.push({
        yearKey,
        type: 'warning',
        totalDebit,
        totalCredit,
        error: `Opening balances not balanced: debit ${totalDebit.toFixed(2)} != credit ${totalCredit.toFixed(2)}. Some accounts may be missing.`,
      });
    }

    entries.push({
      organization_id: organizationId,
      fiscal_year_id: fiscalYearId,
      entry_date: entryDate,
      description: `SIE Import IB-${yearLabel}: Opening Balance / Ingående balans`,
      source_type: 'sie_import',
      source_reference: `IB-${yearLabel}`,
      status: 'posted',
      lines,
      is_opening_balance: true,
    });
  });

  return { entries, errors };
}

/**
 * Get summary of importable data from parsed SIE
 * @param {Object} parsedData - Parsed SIE data
 * @returns {Object} Summary of what can be imported
 */
export function getSieImportSummary(parsedData) {
  // Group vouchers by fiscal year
  const vouchersByYear = {};
  parsedData.vouchers?.forEach((voucher) => {
    const year = voucher.date ? voucher.date.substring(0, 4) : 'unknown';
    vouchersByYear[year] = (vouchersByYear[year] || 0) + 1;
  });

  // Group opening balances by year
  const openingBalancesByYear = {};
  parsedData.openingBalances?.forEach((balance) => {
    const yearIndex = balance.yearIndex;
    openingBalancesByYear[yearIndex] = (openingBalancesByYear[yearIndex] || 0) + 1;
  });

  // Group closing balances by year
  const closingBalancesByYear = {};
  parsedData.closingBalances?.forEach((balance) => {
    const yearIndex = balance.yearIndex;
    closingBalancesByYear[yearIndex] = (closingBalancesByYear[yearIndex] || 0) + 1;
  });

  return {
    format: parsedData.format,
    company: parsedData.company?.name,
    accounts: {
      count: parsedData.accounts?.length || 0,
      canImport: (parsedData.accounts?.length || 0) > 0,
    },
    fiscalYears: {
      count: parsedData.fiscalYears?.length || 0,
      years: parsedData.fiscalYears?.map((fy) => ({
        index: fy.index,
        start: fy.start,
        end: fy.end,
        name: fy.start ? fy.start.substring(0, 4) : 'Unknown',
      })) || [],
      canImport: (parsedData.fiscalYears?.length || 0) > 0,
    },
    vouchers: {
      count: parsedData.vouchers?.length || 0,
      transactionCount: parsedData.vouchers?.reduce(
        (sum, v) => sum + (v.transactions?.length || 0),
        0
      ) || 0,
      byYear: vouchersByYear,
      canImport: (parsedData.vouchers?.length || 0) > 0,
    },
    openingBalances: {
      count: parsedData.openingBalances?.length || 0,
      byYearIndex: openingBalancesByYear,
      canImport: (parsedData.openingBalances?.length || 0) > 0,
    },
    closingBalances: {
      count: parsedData.closingBalances?.length || 0,
      byYearIndex: closingBalancesByYear,
      canImport: (parsedData.closingBalances?.length || 0) > 0,
    },
  };
}

/**
 * Detect required fiscal years from vouchers that don't exist in the system
 * @param {Array} vouchers - Parsed vouchers from SIE
 * @param {Array} existingFiscalYears - Existing fiscal years in the system
 * @param {Array} sieFiscalYears - Fiscal years from the SIE file (#RAR records)
 * @returns {Object} { requiredYears, missingYears, canCreateFromSie }
 */
export function detectMissingFiscalYears(vouchers, existingFiscalYears, sieFiscalYears) {
  // Get unique years needed from vouchers
  const requiredYears = new Set();
  vouchers?.forEach((voucher) => {
    if (voucher.date) {
      const year = voucher.date.substring(0, 4);
      requiredYears.add(year);
    }
  });

  // Check which years exist in the system
  const existingYears = new Set();
  existingFiscalYears?.forEach((fy) => {
    const startYear = fy.start_date?.substring(0, 4);
    const endYear = fy.end_date?.substring(0, 4);
    if (startYear) existingYears.add(startYear);
    if (endYear && endYear !== startYear) existingYears.add(endYear);
  });

  // Check which years are in the SIE file
  const sieYearsMap = new Map(); // year -> fiscal year data
  sieFiscalYears?.forEach((fy) => {
    const startYear = fy.start?.substring(0, 4);
    const endYear = fy.end?.substring(0, 4);
    if (startYear) {
      sieYearsMap.set(startYear, fy);
    }
    if (endYear && endYear !== startYear) {
      sieYearsMap.set(endYear, fy);
    }
  });

  // Find missing years
  const missingYears = [];
  requiredYears.forEach((year) => {
    if (!existingYears.has(year)) {
      const sieFiscalYear = sieYearsMap.get(year);
      missingYears.push({
        year,
        inSieFile: !!sieFiscalYear,
        sieFiscalYear: sieFiscalYear || null,
      });
    }
  });

  // Sort by year
  missingYears.sort((a, b) => a.year.localeCompare(b.year));

  return {
    requiredYears: Array.from(requiredYears).sort(),
    missingYears,
    canCreateFromSie: missingYears.some((y) => y.inSieFile),
    allCanBeCreatedFromSie: missingYears.length > 0 && missingYears.every((y) => y.inSieFile),
  };
}

export default {
  parseSIE,
  validateSIE,
  prepareAccountsForImport,
  prepareFiscalYearsForImport,
  prepareJournalEntriesForImport,
  prepareOpeningBalanceEntries,
  getSieImportSummary,
  detectMissingFiscalYears,
  detectFormat,
};
