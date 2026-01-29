/**
 * Financial Report PDF Service
 * Generates HTML for financial reports (Balance Sheet, Income Statement, VAT Report)
 * to be converted to PDF via Supabase Edge Function
 */

import { exportToPDF } from './templateService';

/**
 * Get labels for reports based on locale
 */
const getLabels = (locale) => {
  const isSv = locale === 'sv-SE' || locale === 'sv';
  
  return {
    // Balance Sheet
    balanceSheet: {
      title: isSv ? 'Balansräkning' : 'Balance Sheet',
      asOfDate: isSv ? 'Per datum' : 'As of date',
      comparativeDate: isSv ? 'Jämförelseperiod' : 'Comparative date',
      assets: isSv ? 'TILLGÅNGAR' : 'ASSETS',
      account: isSv ? 'Konto' : 'Account',
      amount: isSv ? 'Belopp' : 'Amount',
      totalAssets: isSv ? 'SUMMA TILLGÅNGAR' : 'TOTAL ASSETS',
      equityAndLiabilities: isSv ? 'EGET KAPITAL OCH SKULDER' : 'EQUITY AND LIABILITIES',
      totalEquityAndLiabilities: isSv ? 'SUMMA EGET KAPITAL OCH SKULDER' : 'TOTAL EQUITY AND LIABILITIES',
      difference: isSv ? 'Differens' : 'Difference',
    },
    // Income Statement
    incomeStatement: {
      title: isSv ? 'Resultaträkning' : 'Income Statement',
      period: isSv ? 'Period' : 'Period',
      comparativePeriod: isSv ? 'Jämförelseperiod' : 'Comparative period',
      account: isSv ? 'Konto' : 'Account',
      currentPeriod: isSv ? 'Aktuell period' : 'Current period',
      grossProfit: isSv ? 'Bruttovinst' : 'Gross Profit',
      operatingProfit: isSv ? 'Rörelseresultat' : 'Operating Profit',
      profitBeforeTax: isSv ? 'Resultat före skatt' : 'Profit Before Tax',
      netProfit: isSv ? 'Årets resultat' : 'Net Profit',
    },
    // VAT Report
    vatReport: {
      title: isSv ? 'Momsrapport' : 'VAT Report',
      skatteverketReport: isSv ? 'Momsdeklaration' : 'VAT Declaration',
      period: isSv ? 'Period' : 'Period',
      orgNumber: isSv ? 'Org.nr' : 'Org. No.',
      vatNumber: isSv ? 'Momsreg.nr' : 'VAT No.',
      description: isSv ? 'Beskrivning' : 'Description',
      amount: isSv ? 'Belopp' : 'Amount',
      outputVat: isSv ? 'Utgående moms (försäljning)' : 'Output VAT (Sales)',
      inputVat: isSv ? 'Ingående moms (inköp)' : 'Input VAT (Purchases)',
      sales: isSv ? 'Försäljning' : 'Sales',
      deductibleInputVat: isSv ? 'Avdragsgill ingående moms' : 'Deductible Input VAT',
      totalOutputVat: isSv ? 'Summa utgående moms' : 'Total Output VAT',
      totalInputVat: isSv ? 'Summa ingående moms' : 'Total Input VAT',
      netVat: isSv ? 'Moms att betala/återfå' : 'Net VAT',
      vatPayableNote: isSv ? 'Moms att betala till Skatteverket' : 'VAT payable to tax authority',
      vatReceivableNote: isSv ? 'Moms att återfå från Skatteverket' : 'VAT receivable from tax authority',
      filingInfo: isSv ? 'Deklarationsinformation' : 'Filing Information',
      filingNote: isSv 
        ? 'Denna rapport är för internt bruk. För officiell momsdeklaration, använd Skatteverkets e-tjänster.'
        : 'This report is for internal use. For official VAT filing, use the tax authority\'s online services.',
    },
    common: {
      generatedOn: isSv ? 'Genererad' : 'Generated on',
    },
  };
};

/**
 * Common styles for financial report PDFs
 */
const getCommonStyles = () => `
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      font-size: 10pt;
      line-height: 1.4;
      color: #1f2937;
      padding: 20mm;
      background: white;
    }
    .report-header {
      text-align: center;
      margin-bottom: 20px;
      border-bottom: 2px solid #374151;
      padding-bottom: 15px;
    }
    .report-title {
      font-size: 18pt;
      font-weight: bold;
      margin-bottom: 5px;
    }
    .report-subtitle {
      font-size: 12pt;
      color: #4b5563;
    }
    .org-name {
      font-size: 14pt;
      font-weight: 600;
      margin-bottom: 3px;
    }
    .report-period {
      font-size: 10pt;
      color: #6b7280;
    }
    .report-section {
      margin-top: 15px;
    }
    .section-title {
      font-size: 12pt;
      font-weight: bold;
      background: #f3f4f6;
      padding: 8px 10px;
      margin-bottom: 5px;
      border-left: 4px solid #3b82f6;
    }
    .section-title-dark {
      background: #1f2937;
      color: white;
      border-left-color: #60a5fa;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th, td {
      padding: 6px 10px;
      text-align: left;
      border-bottom: 1px solid #e5e7eb;
    }
    th {
      background: #f9fafb;
      font-weight: 600;
      font-size: 9pt;
      color: #6b7280;
    }
    .text-right {
      text-align: right;
    }
    .amount {
      font-family: 'Courier New', monospace;
      text-align: right;
    }
    .negative {
      color: #dc2626;
    }
    .total-row {
      font-weight: bold;
      background: #f3f4f6;
      border-top: 2px solid #d1d5db;
    }
    .subtotal-row {
      font-weight: 600;
      background: #f9fafb;
    }
    .grand-total-row {
      font-weight: bold;
      background: #1f2937;
      color: white;
      font-size: 11pt;
    }
    .indent-1 {
      padding-left: 20px;
    }
    .indent-2 {
      padding-left: 40px;
    }
    .account-number {
      color: #6b7280;
      font-size: 9pt;
    }
    .footer {
      margin-top: 30px;
      padding-top: 15px;
      border-top: 1px solid #e5e7eb;
      font-size: 8pt;
      color: #9ca3af;
      text-align: center;
    }
    .meta-info {
      display: flex;
      justify-content: space-between;
      font-size: 8pt;
      color: #6b7280;
      margin-top: 10px;
    }
    @media print {
      body {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      @page {
        size: A4;
        margin: 10mm;
      }
    }
  </style>
`;

/**
 * Format amount for display
 */
const formatAmount = (amount, currency = 'SEK', locale = 'sv-SE') => {
  if (amount === 0 || amount === undefined || amount === null) return '-';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

/**
 * Format date for display
 */
const formatDate = (dateString, locale = 'sv-SE') => {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString(locale);
};

/**
 * Get class for amount (negative values get 'negative' class)
 */
const getAmountClass = (amount) => {
  return `amount ${amount < 0 ? 'negative' : ''}`;
};

/**
 * Generate Balance Sheet PDF HTML
 */
export const generateBalanceSheetHTML = (data, options = {}) => {
  const {
    organizationName = '',
    asOfDate = '',
    showComparative = false,
    comparativeDate = '',
    currency = 'SEK',
    locale = 'sv-SE',
  } = options;

  const labels = getLabels(locale);

  const renderGroup = (group, indent = 0) => {
    if (!group) return '';
    let rows = '';
    
    // Group total row
    const indentClass = indent > 0 ? `indent-${Math.min(indent, 2)}` : '';
    const rowClass = indent === 0 ? 'subtotal-row' : '';
    
    rows += `
      <tr class="${rowClass}">
        <td class="${indentClass}">${group.name || group.nameEn || ''}</td>
        <td class="${getAmountClass(group.total)}">${formatAmount(group.total, currency, locale)}</td>
        ${showComparative ? `<td class="${getAmountClass(group.comparativeTotal)}">${formatAmount(group.comparativeTotal, currency, locale)}</td>` : ''}
      </tr>
    `;

    // Subgroups
    if (group.subgroups) {
      for (const [, subgroup] of Object.entries(group.subgroups)) {
        rows += renderGroup(subgroup, indent + 1);
      }
    }

    // Individual accounts
    if (group.accounts && group.accounts.length > 0) {
      for (const accData of group.accounts) {
        rows += `
          <tr>
            <td class="indent-${Math.min(indent + 1, 2)}">
              <span class="account-number">${accData.account.account_number}</span> 
              ${accData.account.name}
            </td>
            <td class="${getAmountClass(accData.balance)}">${formatAmount(accData.balance, currency, locale)}</td>
            ${showComparative ? `<td class="${getAmountClass(accData.comparativeBalance)}">${formatAmount(accData.comparativeBalance, currency, locale)}</td>` : ''}
          </tr>
        `;
      }
    }

    return rows;
  };

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${labels.balanceSheet.title} - ${organizationName}</title>
  ${getCommonStyles()}
</head>
<body>
  <div class="report-header">
    <div class="org-name">${organizationName}</div>
    <div class="report-title">${labels.balanceSheet.title}</div>
    <div class="report-period">${labels.balanceSheet.asOfDate}: ${formatDate(asOfDate, locale)}</div>
    ${showComparative ? `<div class="report-period">${labels.balanceSheet.comparativeDate}: ${formatDate(comparativeDate, locale)}</div>` : ''}
  </div>

  <!-- Assets -->
  <div class="report-section">
    <div class="section-title">${labels.balanceSheet.assets}</div>
    <table>
      <thead>
        <tr>
          <th>${labels.balanceSheet.account}</th>
          <th class="text-right">${formatDate(asOfDate, locale)}</th>
          ${showComparative ? `<th class="text-right">${formatDate(comparativeDate, locale)}</th>` : ''}
        </tr>
      </thead>
      <tbody>
        ${data?.assets?.fixedAssets ? renderGroup(data.assets.fixedAssets) : ''}
        ${data?.assets?.currentAssets ? renderGroup(data.assets.currentAssets) : ''}
        <tr class="total-row">
          <td>${labels.balanceSheet.totalAssets}</td>
          <td class="${getAmountClass(data?.assets?.total)}">${formatAmount(data?.assets?.total, currency, locale)}</td>
          ${showComparative ? `<td class="${getAmountClass(data?.assets?.comparativeTotal)}">${formatAmount(data?.assets?.comparativeTotal, currency, locale)}</td>` : ''}
        </tr>
      </tbody>
    </table>
  </div>

  <!-- Equity and Liabilities -->
  <div class="report-section">
    <div class="section-title">${labels.balanceSheet.equityAndLiabilities}</div>
    <table>
      <thead>
        <tr>
          <th>${labels.balanceSheet.account}</th>
          <th class="text-right">${formatDate(asOfDate, locale)}</th>
          ${showComparative ? `<th class="text-right">${formatDate(comparativeDate, locale)}</th>` : ''}
        </tr>
      </thead>
      <tbody>
        ${data?.equityAndLiabilities?.equity ? renderGroup(data.equityAndLiabilities.equity) : ''}
        ${data?.equityAndLiabilities?.longTermLiabilities ? renderGroup(data.equityAndLiabilities.longTermLiabilities) : ''}
        ${data?.equityAndLiabilities?.shortTermLiabilities ? renderGroup(data.equityAndLiabilities.shortTermLiabilities) : ''}
        <tr class="total-row">
          <td>${labels.balanceSheet.totalEquityAndLiabilities}</td>
          <td class="${getAmountClass(data?.equityAndLiabilities?.total)}">${formatAmount(data?.equityAndLiabilities?.total, currency, locale)}</td>
          ${showComparative ? `<td class="${getAmountClass(data?.equityAndLiabilities?.comparativeTotal)}">${formatAmount(data?.equityAndLiabilities?.comparativeTotal, currency, locale)}</td>` : ''}
        </tr>
      </tbody>
    </table>
  </div>

  <!-- Balance Check -->
  <div class="report-section">
    <table>
      <tbody>
        <tr class="grand-total-row">
          <td>${labels.balanceSheet.difference}</td>
          <td class="amount">${formatAmount((data?.assets?.total || 0) - (data?.equityAndLiabilities?.total || 0), currency, locale)}</td>
          ${showComparative ? `<td class="amount">${formatAmount((data?.assets?.comparativeTotal || 0) - (data?.equityAndLiabilities?.comparativeTotal || 0), currency, locale)}</td>` : ''}
        </tr>
      </tbody>
    </table>
  </div>

  <div class="footer">
    ${labels.common.generatedOn} ${formatDate(new Date().toISOString(), locale)} | VisInv
  </div>
</body>
</html>
`;

  return html;
};

/**
 * Generate Income Statement PDF HTML
 */
export const generateIncomeStatementHTML = (data, options = {}) => {
  const {
    organizationName = '',
    startDate = '',
    endDate = '',
    showComparative = false,
    comparativeStartDate = '',
    comparativeEndDate = '',
    currency = 'SEK',
    locale = 'sv-SE',
  } = options;

  const labels = getLabels(locale);

  const renderGroup = (group, indent = 0) => {
    if (!group) return '';
    let rows = '';
    
    const indentClass = indent > 0 ? `indent-${Math.min(indent, 2)}` : '';
    const rowClass = indent === 0 ? 'subtotal-row' : '';
    
    rows += `
      <tr class="${rowClass}">
        <td class="${indentClass}">${group.name || group.nameEn || ''}</td>
        <td class="${getAmountClass(group.total)}">${formatAmount(group.total, currency, locale)}</td>
        ${showComparative ? `<td class="${getAmountClass(group.comparativeTotal)}">${formatAmount(group.comparativeTotal, currency, locale)}</td>` : ''}
      </tr>
    `;

    if (group.subgroups) {
      for (const [, subgroup] of Object.entries(group.subgroups)) {
        rows += renderGroup(subgroup, indent + 1);
      }
    }

    if (group.accounts && group.accounts.length > 0) {
      for (const accData of group.accounts) {
        rows += `
          <tr>
            <td class="indent-${Math.min(indent + 1, 2)}">
              <span class="account-number">${accData.account.account_number}</span> 
              ${accData.account.name}
            </td>
            <td class="${getAmountClass(accData.amount)}">${formatAmount(accData.amount, currency, locale)}</td>
            ${showComparative ? `<td class="${getAmountClass(accData.comparativeAmount)}">${formatAmount(accData.comparativeAmount, currency, locale)}</td>` : ''}
          </tr>
        `;
      }
    }

    return rows;
  };

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${labels.incomeStatement.title} - ${organizationName}</title>
  ${getCommonStyles()}
</head>
<body>
  <div class="report-header">
    <div class="org-name">${organizationName}</div>
    <div class="report-title">${labels.incomeStatement.title}</div>
    <div class="report-period">${labels.incomeStatement.period}: ${formatDate(startDate, locale)} - ${formatDate(endDate, locale)}</div>
    ${showComparative ? `<div class="report-period">${labels.incomeStatement.comparativePeriod}: ${formatDate(comparativeStartDate, locale)} - ${formatDate(comparativeEndDate, locale)}</div>` : ''}
  </div>

  <table>
    <thead>
      <tr>
        <th>${labels.incomeStatement.account}</th>
        <th class="text-right">${labels.incomeStatement.currentPeriod}</th>
        ${showComparative ? `<th class="text-right">${labels.incomeStatement.comparativePeriod}</th>` : ''}
      </tr>
    </thead>
    <tbody>
      <!-- Revenue -->
      ${data?.revenue ? renderGroup(data.revenue) : ''}
      
      <!-- Cost of Goods Sold -->
      ${data?.costOfGoodsSold ? renderGroup(data.costOfGoodsSold) : ''}
      
      <!-- Gross Profit -->
      <tr class="total-row">
        <td>${labels.incomeStatement.grossProfit}</td>
        <td class="${getAmountClass(data?.grossProfit)}">${formatAmount(data?.grossProfit, currency, locale)}</td>
        ${showComparative ? `<td class="${getAmountClass(data?.comparativeGrossProfit)}">${formatAmount(data?.comparativeGrossProfit, currency, locale)}</td>` : ''}
      </tr>

      <!-- Operating Expenses -->
      ${data?.operatingExpenses ? renderGroup(data.operatingExpenses) : ''}
      
      <!-- Operating Profit -->
      <tr class="total-row">
        <td>${labels.incomeStatement.operatingProfit}</td>
        <td class="${getAmountClass(data?.operatingProfit)}">${formatAmount(data?.operatingProfit, currency, locale)}</td>
        ${showComparative ? `<td class="${getAmountClass(data?.comparativeOperatingProfit)}">${formatAmount(data?.comparativeOperatingProfit, currency, locale)}</td>` : ''}
      </tr>

      <!-- Financial Items -->
      ${data?.financialItems ? renderGroup(data.financialItems) : ''}
      
      <!-- Profit Before Tax -->
      <tr class="total-row">
        <td>${labels.incomeStatement.profitBeforeTax}</td>
        <td class="${getAmountClass(data?.profitBeforeTax)}">${formatAmount(data?.profitBeforeTax, currency, locale)}</td>
        ${showComparative ? `<td class="${getAmountClass(data?.comparativeProfitBeforeTax)}">${formatAmount(data?.comparativeProfitBeforeTax, currency, locale)}</td>` : ''}
      </tr>

      <!-- Tax -->
      ${data?.taxes ? renderGroup(data.taxes) : ''}

      <!-- Net Profit -->
      <tr class="grand-total-row">
        <td>${labels.incomeStatement.netProfit}</td>
        <td class="amount">${formatAmount(data?.netProfit, currency, locale)}</td>
        ${showComparative ? `<td class="amount">${formatAmount(data?.comparativeNetProfit, currency, locale)}</td>` : ''}
      </tr>
    </tbody>
  </table>

  <div class="footer">
    ${labels.common.generatedOn} ${formatDate(new Date().toISOString(), locale)} | VisInv
  </div>
</body>
</html>
`;

  return html;
};

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
  } = options;

  const labels = getLabels(locale);

  const renderVatRow = (label, amount) => `
    <tr>
      <td>${label}</td>
      <td class="${getAmountClass(amount)}">${formatAmount(amount, currency, locale)}</td>
    </tr>
  `;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${labels.vatReport.title} - ${organizationName}</title>
  ${getCommonStyles()}
  <style>
    .vat-summary {
      background: #f0f9ff;
      border: 2px solid #0284c7;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .vat-summary-title {
      font-weight: bold;
      color: #0369a1;
      margin-bottom: 10px;
    }
    .vat-summary-amount {
      font-size: 18pt;
      font-weight: bold;
    }
    .vat-payable {
      color: #dc2626;
    }
    .vat-receivable {
      color: #16a34a;
    }
    .org-details {
      font-size: 9pt;
      color: #6b7280;
      margin-top: 5px;
    }
  </style>
</head>
<body>
  <div class="report-header">
    <div class="org-name">${organizationName}</div>
    ${organizationNumber ? `<div class="org-details">${labels.vatReport.orgNumber}: ${organizationNumber}</div>` : ''}
    ${vatNumber ? `<div class="org-details">${labels.vatReport.vatNumber}: ${vatNumber}</div>` : ''}
    <div class="report-title">${labels.vatReport.title}</div>
    <div class="report-subtitle">${labels.vatReport.skatteverketReport}</div>
    <div class="report-period">${labels.vatReport.period}: ${formatDate(startDate, locale)} - ${formatDate(endDate, locale)}</div>
  </div>

  <!-- Output VAT (Utgående moms) -->
  <div class="report-section">
    <div class="section-title">${labels.vatReport.outputVat}</div>
    <table>
      <thead>
        <tr>
          <th>${labels.vatReport.description}</th>
          <th class="text-right">${labels.vatReport.amount}</th>
        </tr>
      </thead>
      <tbody>
        ${renderVatRow(`${labels.vatReport.sales} 25%`, data?.output?.rate25?.amount || 0)}
        ${renderVatRow(`${labels.vatReport.sales} 12%`, data?.output?.rate12?.amount || 0)}
        ${renderVatRow(`${labels.vatReport.sales} 6%`, data?.output?.rate6?.amount || 0)}
        ${renderVatRow(`${labels.vatReport.sales} 0%`, data?.output?.rate0?.amount || 0)}
        <tr class="total-row">
          <td>${labels.vatReport.totalOutputVat}</td>
          <td class="${getAmountClass(data?.output?.total)}">${formatAmount(data?.output?.total, currency, locale)}</td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- Input VAT (Ingående moms) -->
  <div class="report-section">
    <div class="section-title">${labels.vatReport.inputVat}</div>
    <table>
      <thead>
        <tr>
          <th>${labels.vatReport.description}</th>
          <th class="text-right">${labels.vatReport.amount}</th>
        </tr>
      </thead>
      <tbody>
        ${renderVatRow(labels.vatReport.deductibleInputVat, data?.input?.deductible?.amount || 0)}
        <tr class="total-row">
          <td>${labels.vatReport.totalInputVat}</td>
          <td class="${getAmountClass(data?.input?.total)}">${formatAmount(data?.input?.total, currency, locale)}</td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- VAT Summary -->
  <div class="vat-summary">
    <div class="vat-summary-title">${labels.vatReport.netVat}</div>
    <div class="vat-summary-amount ${data?.netVat > 0 ? 'vat-payable' : 'vat-receivable'}">
      ${formatAmount(data?.netVat, currency, locale)}
    </div>
    <div style="margin-top: 10px; font-size: 10pt; color: #6b7280;">
      ${data?.netVat > 0 
        ? labels.vatReport.vatPayableNote 
        : labels.vatReport.vatReceivableNote}
    </div>
  </div>

  <!-- Filing Information -->
  <div class="report-section" style="background: #f9fafb; padding: 15px; border-radius: 4px;">
    <div style="font-weight: bold; margin-bottom: 10px;">${labels.vatReport.filingInfo}</div>
    <div style="font-size: 9pt; color: #6b7280;">
      <p>${labels.vatReport.filingNote}</p>
    </div>
  </div>

  <div class="footer">
    ${labels.common.generatedOn} ${formatDate(new Date().toISOString(), locale)} | VisInv
  </div>
</body>
</html>
`;

  return html;
};

/**
 * Export Balance Sheet to PDF
 */
export const exportBalanceSheetToPDF = async (data, options) => {
  const html = generateBalanceSheetHTML(data, options);
  const filename = `balance-sheet-${options.asOfDate || new Date().toISOString().split('T')[0]}.pdf`;
  return exportToPDF(html, filename);
};

/**
 * Export Income Statement to PDF
 */
export const exportIncomeStatementToPDF = async (data, options) => {
  const html = generateIncomeStatementHTML(data, options);
  const filename = `income-statement-${options.startDate || ''}-${options.endDate || ''}.pdf`;
  return exportToPDF(html, filename);
};

/**
 * Export VAT Report to PDF
 */
export const exportVatReportToPDF = async (data, options) => {
  const html = generateVatReportHTML(data, options);
  const filename = `vat-report-${options.startDate || ''}-${options.endDate || ''}.pdf`;
  return exportToPDF(html, filename);
};
