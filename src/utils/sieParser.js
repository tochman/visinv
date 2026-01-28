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
          // Voucher header: #VER "A" 1 20140102 "Text" 20140103
          const verMatch = rest.match(/^"([^"]*)"\s*(\d+)\s*(\d+)\s*"([^"]*)"/);
          if (verMatch) {
            const [, series, number, date, text] = verMatch;
            currentVoucher = {
              series,
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
          if (currentVoucher) {
            const transMatch = rest.match(/^(\d+)\s*\{[^}]*\}\s*([\d.-]+)/);
            if (transMatch) {
              const [, account, amount] = transMatch;
              currentVoucher.transactions.push({
                account_number: account,
                amount: parseFloat(amount),
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
    errors.push('No accounts found in file');
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

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    summary: {
      format: data.format,
      company: data.company?.name,
      accountCount: data.accounts?.length || 0,
      voucherCount: data.vouchers?.length || 0,
      hasOpeningBalances: (data.openingBalances?.length || 0) > 0,
      hasClosingBalances: (data.closingBalances?.length || 0) > 0,
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

export default {
  parseSIE,
  validateSIE,
  prepareAccountsForImport,
  detectFormat,
};
