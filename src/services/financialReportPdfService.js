/**
 * Financial Report PDF Service
 * Generates professional HTML/PDF for financial reports
 * (Balance Sheet, Income Statement, VAT Report)
 * 
 * Detail levels:
 * - 'summary': Only main totals (assets, liabilities, revenue, expenses)
 * - 'standard': Group totals with subtotals
 * - 'detailed': Full account-level breakdown
 */

import { exportToPDF } from './templateService';

/**
 * Get all labels based on locale
 */
const getLabels = (locale) => {
  const isSv = locale === 'sv-SE' || locale === 'sv';
  
  return {
    balanceSheet: {
      title: isSv ? 'Balansräkning' : 'Balance Sheet',
      asOfDate: isSv ? 'Per datum' : 'As of',
      comparativeDate: isSv ? 'Jämförelseperiod' : 'Comparative',
      assets: isSv ? 'TILLGÅNGAR' : 'ASSETS',
      fixedAssets: isSv ? 'Anläggningstillgångar' : 'Fixed Assets',
      currentAssets: isSv ? 'Omsättningstillgångar' : 'Current Assets',
      account: isSv ? 'Konto' : 'Account',
      amount: isSv ? 'Belopp' : 'Amount',
      totalAssets: isSv ? 'SUMMA TILLGÅNGAR' : 'TOTAL ASSETS',
      equityAndLiabilities: isSv ? 'EGET KAPITAL OCH SKULDER' : 'EQUITY AND LIABILITIES',
      equity: isSv ? 'Eget kapital' : 'Equity',
      longTermLiabilities: isSv ? 'Långfristiga skulder' : 'Long-term Liabilities',
      shortTermLiabilities: isSv ? 'Kortfristiga skulder' : 'Short-term Liabilities',
      totalEquityAndLiabilities: isSv ? 'SUMMA EGET KAPITAL OCH SKULDER' : 'TOTAL EQUITY AND LIABILITIES',
      difference: isSv ? 'Differens (ska vara 0)' : 'Difference (should be 0)',
      balanced: isSv ? 'Balanserad' : 'Balanced',
    },
    incomeStatement: {
      title: isSv ? 'Resultaträkning' : 'Income Statement',
      period: isSv ? 'Period' : 'Period',
      comparativePeriod: isSv ? 'Jämförelseperiod' : 'Comparative Period',
      account: isSv ? 'Konto' : 'Account',
      currentPeriod: isSv ? 'Aktuell period' : 'Current Period',
      revenue: isSv ? 'Intäkter' : 'Revenue',
      costOfGoodsSold: isSv ? 'Kostnad för sålda varor' : 'Cost of Goods Sold',
      grossProfit: isSv ? 'BRUTTOVINST' : 'GROSS PROFIT',
      operatingExpenses: isSv ? 'Rörelsekostnader' : 'Operating Expenses',
      operatingProfit: isSv ? 'RÖRELSERESULTAT' : 'OPERATING PROFIT',
      financialItems: isSv ? 'Finansiella poster' : 'Financial Items',
      profitBeforeTax: isSv ? 'RESULTAT FÖRE SKATT' : 'PROFIT BEFORE TAX',
      taxes: isSv ? 'Skatter' : 'Taxes',
      netProfit: isSv ? 'ÅRETS RESULTAT' : 'NET PROFIT',
    },
    vatReport: {
      title: isSv ? 'Momsrapport' : 'VAT Report',
      subtitle: isSv ? 'Underlag för momsdeklaration' : 'VAT Declaration Summary',
      period: isSv ? 'Redovisningsperiod' : 'Reporting Period',
      orgNumber: isSv ? 'Organisationsnummer' : 'Organization Number',
      vatNumber: isSv ? 'Momsregistreringsnummer' : 'VAT Registration Number',
      description: isSv ? 'Beskrivning' : 'Description',
      taxBase: isSv ? 'Underlag' : 'Tax Base',
      vatAmount: isSv ? 'Momsbelopp' : 'VAT Amount',
      outputVat: isSv ? 'UTGÅENDE MOMS' : 'OUTPUT VAT',
      salesDomestic: isSv ? 'Försäljning inom Sverige' : 'Domestic Sales',
      rate25: isSv ? 'Moms 25%' : 'VAT 25%',
      rate12: isSv ? 'Moms 12%' : 'VAT 12%',
      rate6: isSv ? 'Moms 6%' : 'VAT 6%',
      rate0: isSv ? 'Momsfri försäljning' : 'VAT Exempt Sales',
      totalOutputVat: isSv ? 'Summa utgående moms' : 'Total Output VAT',
      inputVat: isSv ? 'INGÅENDE MOMS' : 'INPUT VAT',
      deductibleVat: isSv ? 'Avdragsgill ingående moms' : 'Deductible Input VAT',
      totalInputVat: isSv ? 'Summa ingående moms' : 'Total Input VAT',
      summary: isSv ? 'SAMMANSTÄLLNING' : 'SUMMARY',
      vatToPay: isSv ? 'Moms att betala' : 'VAT to Pay',
      vatToReceive: isSv ? 'Moms att återfå' : 'VAT to Receive',
      payNote: isSv ? 'Betalas till Skatteverket senast deklarationsdatum' : 'Pay to tax authority by filing deadline',
      receiveNote: isSv ? 'Återbetalas av Skatteverket efter granskning' : 'Refunded by tax authority after review',
      disclaimer: isSv 
        ? 'Detta är en intern sammanställning. Momsdeklaration görs via Skatteverkets e-tjänst.'
        : 'This is an internal summary. VAT declaration is filed via the tax authority\'s e-service.',
    },
    common: {
      generatedOn: isSv ? 'Genererad' : 'Generated',
      page: isSv ? 'Sida' : 'Page',
      currency: isSv ? 'Valuta' : 'Currency',
      detailLevel: isSv ? 'Detaljnivå' : 'Detail Level',
      summary: isSv ? 'Sammanfattning' : 'Summary',
      standard: isSv ? 'Standard' : 'Standard',
      detailed: isSv ? 'Detaljerad' : 'Detailed',
    },
  };
};

/**
 * Professional styles for financial reports
 */
const getStyles = () => `
<style>
  @page {
    size: A4;
    margin: 15mm 15mm 20mm 15mm;
  }
  
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }
  
  body {
    font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
    font-size: 9pt;
    line-height: 1.4;
    color: #1a1a1a;
    background: white;
  }
  
  .report-container {
    max-width: 210mm;
    margin: 0 auto;
    padding: 0;
  }
  
  /* Header */
  .report-header {
    border-bottom: 3px solid #1e3a5f;
    padding-bottom: 15px;
    margin-bottom: 20px;
  }
  
  .company-name {
    font-size: 14pt;
    font-weight: 600;
    color: #1e3a5f;
    margin-bottom: 2px;
  }
  
  .company-details {
    font-size: 8pt;
    color: #666;
    margin-bottom: 10px;
  }
  
  .report-title {
    font-size: 18pt;
    font-weight: 700;
    color: #1e3a5f;
    margin: 10px 0 5px 0;
  }
  
  .report-period {
    font-size: 10pt;
    color: #444;
  }
  
  /* Sections */
  .section {
    margin-bottom: 20px;
    page-break-inside: avoid;
  }
  
  .section-header {
    background: #1e3a5f;
    color: white;
    padding: 8px 12px;
    font-size: 10pt;
    font-weight: 600;
    letter-spacing: 0.5px;
  }
  
  /* Tables */
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 9pt;
  }
  
  th {
    background: #f5f5f5;
    border-bottom: 2px solid #1e3a5f;
    padding: 8px 10px;
    text-align: left;
    font-weight: 600;
    font-size: 8pt;
    color: #333;
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }
  
  th.amount {
    text-align: right;
    width: 120px;
  }
  
  td {
    padding: 6px 10px;
    border-bottom: 1px solid #e5e5e5;
    vertical-align: top;
  }
  
  td.amount {
    text-align: right;
    font-family: 'Consolas', 'Courier New', monospace;
    font-size: 9pt;
  }
  
  /* Row types */
  .row-group {
    background: #f8f9fa;
    font-weight: 600;
  }
  
  .row-subgroup {
    padding-left: 20px !important;
  }
  
  .row-account {
    padding-left: 35px !important;
    color: #555;
    font-size: 8.5pt;
  }
  
  .row-account .account-number {
    color: #888;
    font-size: 8pt;
    margin-right: 8px;
  }
  
  .row-subtotal {
    background: #eef2f7;
    font-weight: 600;
    border-top: 1px solid #ccc;
  }
  
  .row-total {
    background: #1e3a5f;
    color: white;
    font-weight: 700;
    font-size: 10pt;
  }
  
  .row-total td {
    border-bottom: none;
    padding: 10px;
  }
  
  .row-grand-total {
    background: #0d2137;
    color: white;
    font-weight: 700;
    font-size: 11pt;
  }
  
  .row-grand-total td {
    border-bottom: none;
    padding: 12px 10px;
  }
  
  /* Amounts */
  .negative {
    color: #c41e3a;
  }
  
  .positive {
    color: #1a7f37;
  }
  
  .zero {
    color: #888;
  }
  
  /* VAT specific */
  .vat-summary-box {
    background: linear-gradient(135deg, #1e3a5f 0%, #2d5a8f 100%);
    color: white;
    padding: 20px;
    margin: 20px 0;
    border-radius: 4px;
  }
  
  .vat-summary-title {
    font-size: 10pt;
    font-weight: 600;
    margin-bottom: 10px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  
  .vat-summary-amount {
    font-size: 24pt;
    font-weight: 700;
    margin-bottom: 5px;
  }
  
  .vat-summary-note {
    font-size: 9pt;
    opacity: 0.9;
  }
  
  /* Footer */
  .report-footer {
    margin-top: 30px;
    padding-top: 15px;
    border-top: 1px solid #ddd;
    font-size: 8pt;
    color: #888;
    display: flex;
    justify-content: space-between;
  }
  
  .disclaimer {
    background: #fff9e6;
    border: 1px solid #f0d860;
    padding: 10px 12px;
    font-size: 8pt;
    color: #665500;
    margin-top: 20px;
    border-radius: 3px;
  }
  
  /* Print adjustments */
  @media print {
    body {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    
    .section {
      page-break-inside: avoid;
    }
    
    .row-total, .row-grand-total {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
  }
</style>
`;

/**
 * Format currency amount
 */
const formatAmount = (amount, currency = 'SEK', locale = 'sv-SE') => {
  if (amount === null || amount === undefined) return '-';
  if (amount === 0) return '-';
  
  const formatted = new Intl.NumberFormat(locale === 'sv-SE' ? 'sv-SE' : 'en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(amount));
  
  return amount < 0 ? `-${formatted}` : formatted;
};

/**
 * Format date
 */
const formatDate = (dateString, locale = 'sv-SE') => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString(locale === 'sv-SE' ? 'sv-SE' : 'en-GB', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

/**
 * Get amount CSS class
 */
const getAmountClass = (amount) => {
  if (amount === 0 || amount === null || amount === undefined) return 'amount zero';
  return amount < 0 ? 'amount negative' : 'amount';
};

// ============================================
// BALANCE SHEET
// ============================================

/**
 * Generate Balance Sheet PDF HTML
 * @param {Object} data - Balance sheet data with groups structure
 * @param {Object} options - Options including locale, detailLevel, etc.
 */
export const generateBalanceSheetHTML = (data, options = {}) => {
  const {
    organizationName = '',
    organizationNumber = '',
    asOfDate = '',
    showComparative = false,
    comparativeDate = '',
    currency = 'SEK',
    locale = 'sv-SE',
    detailLevel = 'standard', // 'summary', 'standard', 'detailed'
  } = options;

  const L = getLabels(locale);

  /**
   * Render a balance sheet section (group with optional subgroups)
   * @param {Object} section - Section object with name, total, subgroups, accounts
   * @param {number} level - Nesting level (0 = main, 1 = subgroup, 2 = account)
   */
  const renderSection = (section, level = 0) => {
    if (!section || section.total === 0) return '';
    
    let html = '';
    const sectionName = locale === 'sv-SE' ? (section.name || '') : (section.nameEn || section.name || '');
    
    // Main section header row
    if (level === 0) {
      html += `
        <tr class="row-group">
          <td>${sectionName}</td>
          <td class="${getAmountClass(section.total)}">${formatAmount(section.total, currency, locale)}</td>
          ${showComparative ? `<td class="${getAmountClass(section.comparativeTotal)}">${formatAmount(section.comparativeTotal, currency, locale)}</td>` : ''}
        </tr>
      `;
    }
    
    // Render subgroups if in standard or detailed mode
    if (section.subgroups && detailLevel !== 'summary') {
      for (const [key, subgroup] of Object.entries(section.subgroups)) {
        if (subgroup.total === 0 && (!subgroup.accounts || subgroup.accounts.length === 0)) continue;
        
        const subgroupName = locale === 'sv-SE' ? (subgroup.name || '') : (subgroup.nameEn || subgroup.name || '');
        
        html += `
          <tr class="row-subgroup">
            <td>${subgroupName}</td>
            <td class="${getAmountClass(subgroup.total)}">${formatAmount(subgroup.total, currency, locale)}</td>
            ${showComparative ? `<td class="${getAmountClass(subgroup.comparativeTotal)}">${formatAmount(subgroup.comparativeTotal, currency, locale)}</td>` : ''}
          </tr>
        `;
        
        // Render individual accounts in detailed mode
        if (detailLevel === 'detailed' && subgroup.accounts && subgroup.accounts.length > 0) {
          for (const accData of subgroup.accounts) {
            const accountName = locale === 'sv-SE' ? accData.account.name : (accData.account.name_en || accData.account.name);
            html += `
              <tr class="row-account">
                <td><span class="account-number">${accData.account.account_number}</span>${accountName}</td>
                <td class="${getAmountClass(accData.balance)}">${formatAmount(accData.balance, currency, locale)}</td>
                ${showComparative ? `<td class="${getAmountClass(accData.comparativeBalance || 0)}">${formatAmount(accData.comparativeBalance || 0, currency, locale)}</td>` : ''}
              </tr>
            `;
          }
        }
      }
    }
    
    // For sections without subgroups (like untaxedReserves, provisions, longTermLiabilities, shortTermLiabilities)
    if (!section.subgroups && section.accounts && detailLevel === 'detailed') {
      for (const accData of section.accounts) {
        const accountName = locale === 'sv-SE' ? accData.account.name : (accData.account.name_en || accData.account.name);
        html += `
          <tr class="row-account">
            <td><span class="account-number">${accData.account.account_number}</span>${accountName}</td>
            <td class="${getAmountClass(accData.balance)}">${formatAmount(accData.balance, currency, locale)}</td>
            ${showComparative ? `<td class="${getAmountClass(accData.comparativeBalance || 0)}">${formatAmount(accData.comparativeBalance || 0, currency, locale)}</td>` : ''}
          </tr>
        `;
      }
    }
    
    return html;
  };

  // Extract data - balance sheet returns {groups, totals}
  const groups = data?.groups || {};
  const totals = data?.totals || {};
  const assetsTotal = totals.totalAssets || 0;
  const eqLiabTotal = totals.totalEquityAndLiabilities || 0;
  const difference = assetsTotal - eqLiabTotal;

  return `
<!DOCTYPE html>
<html lang="${locale === 'sv-SE' ? 'sv' : 'en'}">
<head>
  <meta charset="UTF-8">
  <title>${L.balanceSheet.title} - ${organizationName}</title>
  ${getStyles()}
</head>
<body>
  <div class="report-container">
    <div class="report-header">
      <div class="company-name">${organizationName}</div>
      ${organizationNumber ? `<div class="company-details">${organizationNumber}</div>` : ''}
      <div class="report-title">${L.balanceSheet.title}</div>
      <div class="report-period">${L.balanceSheet.asOfDate} ${formatDate(asOfDate, locale)}</div>
    </div>

    <!-- ASSETS -->
    <div class="section">
      <div class="section-header">${L.balanceSheet.assets}</div>
      <table>
        <thead>
          <tr>
            <th>${L.balanceSheet.account}</th>
            <th class="amount">${formatDate(asOfDate, locale)}</th>
            ${showComparative ? `<th class="amount">${formatDate(comparativeDate, locale)}</th>` : ''}
          </tr>
        </thead>
        <tbody>
          ${groups.assets?.fixedAssets ? renderSection(groups.assets.fixedAssets, 0) : ''}
          ${groups.assets?.currentAssets ? renderSection(groups.assets.currentAssets, 0) : ''}
          <tr class="row-total">
            <td>${L.balanceSheet.totalAssets}</td>
            <td class="amount">${formatAmount(assetsTotal, currency, locale)}</td>
            ${showComparative ? `<td class="amount">${formatAmount(totals.comparativeTotalAssets || 0, currency, locale)}</td>` : ''}
          </tr>
        </tbody>
      </table>
    </div>

    <!-- EQUITY AND LIABILITIES -->
    <div class="section">
      <div class="section-header">${L.balanceSheet.equityAndLiabilities}</div>
      <table>
        <thead>
          <tr>
            <th>${L.balanceSheet.account}</th>
            <th class="amount">${formatDate(asOfDate, locale)}</th>
            ${showComparative ? `<th class="amount">${formatDate(comparativeDate, locale)}</th>` : ''}
          </tr>
        </thead>
        <tbody>
          ${groups.equityAndLiabilities?.equity ? renderSection(groups.equityAndLiabilities.equity, 0) : ''}
          ${groups.equityAndLiabilities?.untaxedReserves ? renderSection(groups.equityAndLiabilities.untaxedReserves, 0) : ''}
          ${groups.equityAndLiabilities?.provisions ? renderSection(groups.equityAndLiabilities.provisions, 0) : ''}
          ${groups.equityAndLiabilities?.longTermLiabilities ? renderSection(groups.equityAndLiabilities.longTermLiabilities, 0) : ''}
          ${groups.equityAndLiabilities?.shortTermLiabilities ? renderSection(groups.equityAndLiabilities.shortTermLiabilities, 0) : ''}
          <tr class="row-total">
            <td>${L.balanceSheet.totalEquityAndLiabilities}</td>
            <td class="amount">${formatAmount(eqLiabTotal, currency, locale)}</td>
            ${showComparative ? `<td class="amount">${formatAmount(totals.comparativeTotalEquityAndLiabilities || 0, currency, locale)}</td>` : ''}
          </tr>
        </tbody>
      </table>
    </div>

    <!-- BALANCE CHECK -->
    <div class="section">
      <table>
        <tbody>
          <tr class="row-grand-total">
            <td>${L.balanceSheet.difference}</td>
            <td class="amount">${Math.abs(difference) < 0.01 ? L.balanceSheet.balanced : formatAmount(difference, currency, locale)}</td>
            ${showComparative ? `<td class="amount">-</td>` : ''}
          </tr>
        </tbody>
      </table>
    </div>

    <div class="report-footer">
      <span>${L.common.generatedOn} ${formatDate(new Date().toISOString(), locale)}</span>
      <span>${L.common.currency}: ${currency}</span>
    </div>
  </div>
</body>
</html>
`;
};

// ============================================
// INCOME STATEMENT
// ============================================

/**
 * Generate Income Statement PDF HTML
 */
export const generateIncomeStatementHTML = (data, options = {}) => {
  const {
    organizationName = '',
    organizationNumber = '',
    startDate = '',
    endDate = '',
    showComparative = false,
    comparativeStartDate = '',
    comparativeEndDate = '',
    currency = 'SEK',
    locale = 'sv-SE',
    detailLevel = 'standard',
  } = options;

  const L = getLabels(locale);

  /**
   * Render an income statement section
   */
  const renderSection = (section, level = 0) => {
    if (!section) return '';
    
    let html = '';
    const sectionName = locale === 'sv-SE' ? (section.name || '') : (section.nameEn || section.name || '');
    
    // Main section header row
    if (level === 0 && detailLevel !== 'summary') {
      html += `
        <tr class="row-group">
          <td>${sectionName}</td>
          <td class="${getAmountClass(section.total)}">${formatAmount(section.total, currency, locale)}</td>
          ${showComparative ? `<td class="${getAmountClass(section.comparativeTotal)}">${formatAmount(section.comparativeTotal, currency, locale)}</td>` : ''}
        </tr>
      `;
    }
    
    // Render subgroups if in standard or detailed mode
    if (section.subgroups && detailLevel !== 'summary') {
      for (const [key, subgroup] of Object.entries(section.subgroups)) {
        if (subgroup.total === 0 && (!subgroup.accounts || subgroup.accounts.length === 0)) continue;
        
        const subgroupName = locale === 'sv-SE' ? (subgroup.name || '') : (subgroup.nameEn || subgroup.name || '');
        
        html += `
          <tr class="row-subgroup">
            <td>${subgroupName}</td>
            <td class="${getAmountClass(subgroup.total)}">${formatAmount(subgroup.total, currency, locale)}</td>
            ${showComparative ? `<td class="${getAmountClass(subgroup.comparativeTotal)}">${formatAmount(subgroup.comparativeTotal, currency, locale)}</td>` : ''}
          </tr>
        `;
        
        // Render individual accounts in detailed mode
        if (detailLevel === 'detailed' && subgroup.accounts && subgroup.accounts.length > 0) {
          for (const accData of subgroup.accounts) {
            const accountName = locale === 'sv-SE' ? accData.account.name : (accData.account.name_en || accData.account.name);
            html += `
              <tr class="row-account">
                <td><span class="account-number">${accData.account.account_number}</span>${accountName}</td>
                <td class="${getAmountClass(accData.balance)}">${formatAmount(accData.balance, currency, locale)}</td>
                ${showComparative ? `<td class="${getAmountClass(accData.comparativeBalance || 0)}">${formatAmount(accData.comparativeBalance || 0, currency, locale)}</td>` : ''}
              </tr>
            `;
          }
        }
      }
    }
    
    // For sections without subgroups (like taxes, appropriations)
    if (!section.subgroups && section.accounts && detailLevel === 'detailed') {
      for (const accData of section.accounts) {
        const accountName = locale === 'sv-SE' ? accData.account.name : (accData.account.name_en || accData.account.name);
        html += `
          <tr class="row-account">
            <td><span class="account-number">${accData.account.account_number}</span>${accountName}</td>
            <td class="${getAmountClass(accData.balance)}">${formatAmount(accData.balance, currency, locale)}</td>
            ${showComparative ? `<td class="${getAmountClass(accData.comparativeBalance || 0)}">${formatAmount(accData.comparativeBalance || 0, currency, locale)}</td>` : ''}
          </tr>
        `;
      }
    }
    
    return html;
  };

  const renderTotalRow = (label, amount, comparativeAmount, isGrand = false) => {
    const rowClass = isGrand ? 'row-grand-total' : 'row-subtotal';
    return `
      <tr class="${rowClass}">
        <td>${label}</td>
        <td class="amount">${formatAmount(amount, currency, locale)}</td>
        ${showComparative ? `<td class="amount">${formatAmount(comparativeAmount, currency, locale)}</td>` : ''}
      </tr>
    `;
  };

  // Extract data - income statement returns {groups, totals}
  const groups = data?.groups || {};
  const totals = data?.totals || {};

  return `
<!DOCTYPE html>
<html lang="${locale === 'sv-SE' ? 'sv' : 'en'}">
<head>
  <meta charset="UTF-8">
  <title>${L.incomeStatement.title} - ${organizationName}</title>
  ${getStyles()}
</head>
<body>
  <div class="report-container">
    <div class="report-header">
      <div class="company-name">${organizationName}</div>
      ${organizationNumber ? `<div class="company-details">${organizationNumber}</div>` : ''}
      <div class="report-title">${L.incomeStatement.title}</div>
      <div class="report-period">${L.incomeStatement.period}: ${formatDate(startDate, locale)} - ${formatDate(endDate, locale)}</div>
      ${showComparative ? `<div class="report-period">${L.incomeStatement.comparativePeriod}: ${formatDate(comparativeStartDate, locale)} - ${formatDate(comparativeEndDate, locale)}</div>` : ''}
    </div>

    <div class="section">
      <table>
        <thead>
          <tr>
            <th>${L.incomeStatement.account}</th>
            <th class="amount">${L.incomeStatement.currentPeriod}</th>
            ${showComparative ? `<th class="amount">${L.incomeStatement.comparativePeriod}</th>` : ''}
          </tr>
        </thead>
        <tbody>
          <!-- Revenue -->
          ${groups.operatingRevenue ? renderSection(groups.operatingRevenue, 0) : ''}
          
          <!-- Expenses -->
          ${groups.operatingExpenses ? renderSection(groups.operatingExpenses, 0) : ''}
          
          <!-- Operating Result -->
          ${renderTotalRow(L.incomeStatement.operatingProfit, totals.operatingResult || 0, totals.operatingResultComparative || 0)}

          <!-- Financial Items -->
          ${groups.financialItems ? renderSection(groups.financialItems, 0) : ''}
          
          <!-- Result After Financial -->
          ${totals.resultAfterFinancial !== undefined ? renderTotalRow(
            locale === 'sv-SE' ? 'Resultat efter finansiella poster' : 'Result After Financial Items', 
            totals.resultAfterFinancial, 
            totals.resultAfterFinancialComparative || 0
          ) : ''}

          <!-- Appropriations (if any) -->
          ${groups.appropriations && groups.appropriations.total !== 0 ? renderSection(groups.appropriations, 0) : ''}
          
          <!-- Result Before Tax -->
          ${renderTotalRow(L.incomeStatement.profitBeforeTax, totals.resultBeforeTax || 0, totals.resultBeforeTaxComparative || 0)}

          <!-- Taxes -->
          ${groups.taxes ? renderSection(groups.taxes, 0) : ''}

          <!-- Net Result -->
          ${renderTotalRow(L.incomeStatement.netProfit, totals.netResult || 0, totals.netResultComparative || 0, true)}
        </tbody>
      </table>
    </div>

    <div class="report-footer">
      <span>${L.common.generatedOn} ${formatDate(new Date().toISOString(), locale)}</span>
      <span>${L.common.currency}: ${currency}</span>
    </div>
  </div>
</body>
</html>
`;
};

// ============================================
// VAT REPORT
// ============================================

/**
 * Generate VAT Report PDF HTML
 */
export const generateVatReportHTML = (data, options = {}) => {
  const {
    organizationName = '',
    organizationNumber = '',
    vatNumber = '',
    startDate = '',
    endDate = '',
    currency = 'SEK',
    locale = 'sv-SE',
    detailLevel = 'standard',
  } = options;

  const L = getLabels(locale);
  
  const outputTotal = data?.output?.total || 0;
  const inputTotal = data?.input?.total || 0;
  const netVat = data?.netVat || (outputTotal - inputTotal);
  const isPayable = netVat > 0;

  const renderVatRow = (label, base, amount) => `
    <tr>
      <td>${label}</td>
      <td class="amount">${formatAmount(base, currency, locale)}</td>
      <td class="${getAmountClass(amount)}">${formatAmount(amount, currency, locale)}</td>
    </tr>
  `;

  return `
<!DOCTYPE html>
<html lang="${locale === 'sv-SE' ? 'sv' : 'en'}">
<head>
  <meta charset="UTF-8">
  <title>${L.vatReport.title} - ${organizationName}</title>
  ${getStyles()}
</head>
<body>
  <div class="report-container">
    <div class="report-header">
      <div class="company-name">${organizationName}</div>
      <div class="company-details">
        ${organizationNumber ? `${L.vatReport.orgNumber}: ${organizationNumber}` : ''}
        ${vatNumber ? ` | ${L.vatReport.vatNumber}: ${vatNumber}` : ''}
      </div>
      <div class="report-title">${L.vatReport.title}</div>
      <div class="report-period">${L.vatReport.period}: ${formatDate(startDate, locale)} - ${formatDate(endDate, locale)}</div>
    </div>

    <!-- OUTPUT VAT -->
    <div class="section">
      <div class="section-header">${L.vatReport.outputVat}</div>
      <table>
        <thead>
          <tr>
            <th>${L.vatReport.description}</th>
            <th class="amount">${L.vatReport.taxBase}</th>
            <th class="amount">${L.vatReport.vatAmount}</th>
          </tr>
        </thead>
        <tbody>
          ${renderVatRow(L.vatReport.rate25, data?.output?.rate25?.base || 0, data?.output?.rate25?.amount || 0)}
          ${renderVatRow(L.vatReport.rate12, data?.output?.rate12?.base || 0, data?.output?.rate12?.amount || 0)}
          ${renderVatRow(L.vatReport.rate6, data?.output?.rate6?.base || 0, data?.output?.rate6?.amount || 0)}
          ${renderVatRow(L.vatReport.rate0, data?.output?.rate0?.base || 0, 0)}
          <tr class="row-subtotal">
            <td>${L.vatReport.totalOutputVat}</td>
            <td class="amount">-</td>
            <td class="amount">${formatAmount(outputTotal, currency, locale)}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- INPUT VAT -->
    <div class="section">
      <div class="section-header">${L.vatReport.inputVat}</div>
      <table>
        <thead>
          <tr>
            <th>${L.vatReport.description}</th>
            <th class="amount">${L.vatReport.taxBase}</th>
            <th class="amount">${L.vatReport.vatAmount}</th>
          </tr>
        </thead>
        <tbody>
          ${renderVatRow(L.vatReport.deductibleVat, data?.input?.deductible?.base || 0, data?.input?.deductible?.amount || 0)}
          <tr class="row-subtotal">
            <td>${L.vatReport.totalInputVat}</td>
            <td class="amount">-</td>
            <td class="amount">${formatAmount(inputTotal, currency, locale)}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- SUMMARY BOX -->
    <div class="vat-summary-box">
      <div class="vat-summary-title">${isPayable ? L.vatReport.vatToPay : L.vatReport.vatToReceive}</div>
      <div class="vat-summary-amount">${formatAmount(Math.abs(netVat), currency, locale)} ${currency}</div>
      <div class="vat-summary-note">${isPayable ? L.vatReport.payNote : L.vatReport.receiveNote}</div>
    </div>

    <div class="disclaimer">
      ${L.vatReport.disclaimer}
    </div>

    <div class="report-footer">
      <span>${L.common.generatedOn} ${formatDate(new Date().toISOString(), locale)}</span>
      <span>${L.common.currency}: ${currency}</span>
    </div>
  </div>
</body>
</html>
`;
};

// ============================================
// EXPORT FUNCTIONS
// ============================================

/**
 * Export Balance Sheet to PDF
 */
export const exportBalanceSheetToPDF = async (data, options) => {
  const html = generateBalanceSheetHTML(data, options);
  const filename = `balansrakning-${options.asOfDate || new Date().toISOString().split('T')[0]}.pdf`;
  return exportToPDF(html, filename);
};

/**
 * Export Income Statement to PDF
 */
export const exportIncomeStatementToPDF = async (data, options) => {
  const html = generateIncomeStatementHTML(data, options);
  const filename = `resultatrakning-${options.startDate || ''}-${options.endDate || ''}.pdf`;
  return exportToPDF(html, filename);
};

/**
 * Export VAT Report to PDF
 */
export const exportVatReportToPDF = async (data, options) => {
  const html = generateVatReportHTML(data, options);
  const filename = `momsrapport-${options.startDate || ''}-${options.endDate || ''}.pdf`;
  return exportToPDF(html, filename);
};
