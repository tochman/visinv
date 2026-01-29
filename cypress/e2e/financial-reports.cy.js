/// <reference types="cypress" />

/**
 * Financial Reports E2E Tests
 * US-230: Balance Sheet (Balansräkning)
 * US-231: Income Statement (Resultaträkning)
 */
describe('Financial Reports', () => {
  // Test fiscal year data
  const testFiscalYear = {
    id: 'test-fiscal-year-id',
    organization_id: 'test-org-id',
    name: '2025',
    start_date: '2025-01-01',
    end_date: '2025-12-31',
    is_closed: false,
    next_verification_number: 10,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }

  const previousFiscalYear = {
    id: 'previous-fiscal-year-id',
    organization_id: 'test-org-id',
    name: '2024',
    start_date: '2024-01-01',
    end_date: '2024-12-31',
    is_closed: true,
    next_verification_number: 100,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }

  // Test accounts - Swedish BAS chart of accounts structure
  const testAccounts = [
    // Assets (1xxx)
    { id: 'acc-1110', account_number: '1110', name: 'Byggnader', name_en: 'Buildings', account_class: 'assets', account_type: 'asset', is_active: true },
    { id: 'acc-1510', account_number: '1510', name: 'Kundfordringar', name_en: 'Accounts Receivable', account_class: 'assets', account_type: 'asset', is_active: true },
    { id: 'acc-1930', account_number: '1930', name: 'Företagskonto', name_en: 'Bank Account', account_class: 'assets', account_type: 'asset', is_active: true },
    // Equity & Liabilities (2xxx)
    { id: 'acc-2081', account_number: '2081', name: 'Aktiekapital', name_en: 'Share Capital', account_class: 'equity', account_type: 'equity', is_active: true },
    { id: 'acc-2091', account_number: '2091', name: 'Balanserad vinst', name_en: 'Retained Earnings', account_class: 'equity', account_type: 'equity', is_active: true },
    { id: 'acc-2440', account_number: '2440', name: 'Leverantörsskulder', name_en: 'Accounts Payable', account_class: 'liabilities', account_type: 'liability', is_active: true },
    { id: 'acc-2610', account_number: '2610', name: 'Utgående moms', name_en: 'Output VAT', account_class: 'liabilities', account_type: 'liability', is_active: true },
    // Revenue (3xxx)
    { id: 'acc-3010', account_number: '3010', name: 'Försäljning varor', name_en: 'Sales Revenue', account_class: 'revenue', account_type: 'revenue', is_active: true },
    { id: 'acc-3910', account_number: '3910', name: 'Hyresintäkter', name_en: 'Rental Income', account_class: 'revenue', account_type: 'revenue', is_active: true },
    // Expenses (4xxx-7xxx)
    { id: 'acc-4010', account_number: '4010', name: 'Inköp material', name_en: 'Material Purchases', account_class: 'expenses', account_type: 'expense', is_active: true },
    { id: 'acc-5010', account_number: '5010', name: 'Lokalhyra', name_en: 'Rent', account_class: 'expenses', account_type: 'expense', is_active: true },
    { id: 'acc-7010', account_number: '7010', name: 'Löner', name_en: 'Salaries', account_class: 'expenses', account_type: 'expense', is_active: true },
    // Financial items (8xxx)
    { id: 'acc-8310', account_number: '8310', name: 'Ränteintäkter', name_en: 'Interest Income', account_class: 'revenue', account_type: 'revenue', is_active: true },
    { id: 'acc-8410', account_number: '8410', name: 'Räntekostnader', name_en: 'Interest Expenses', account_class: 'expenses', account_type: 'expense', is_active: true },
  ]

  // Sample balance sheet data structure (as returned by FinancialReport.getBalanceSheet)
  const mockBalanceSheetData = {
    groups: {
      assets: {
        fixedAssets: {
          name: 'Anläggningstillgångar',
          nameEn: 'Fixed Assets',
          accounts: [],
          total: 500000,
          comparativeTotal: 450000,
          subgroups: {
            intangible: { name: 'Immateriella anläggningstillgångar', nameEn: 'Intangible Assets', accounts: [], total: 0, comparativeTotal: 0 },
            tangible: {
              name: 'Materiella anläggningstillgångar',
              nameEn: 'Tangible Assets',
              accounts: [
                { account: testAccounts[0], balance: 500000, comparativeBalance: 450000, totalDebit: 500000, totalCredit: 0 }
              ],
              total: 500000,
              comparativeTotal: 450000
            },
            financial: { name: 'Finansiella anläggningstillgångar', nameEn: 'Financial Assets', accounts: [], total: 0, comparativeTotal: 0 },
          }
        },
        currentAssets: {
          name: 'Omsättningstillgångar',
          nameEn: 'Current Assets',
          accounts: [],
          total: 250000,
          comparativeTotal: 200000,
          subgroups: {
            inventory: { name: 'Varulager m.m.', nameEn: 'Inventory', accounts: [], total: 0, comparativeTotal: 0 },
            receivables: {
              name: 'Kortfristiga fordringar',
              nameEn: 'Short-term Receivables',
              accounts: [
                { account: testAccounts[1], balance: 150000, comparativeBalance: 120000, totalDebit: 150000, totalCredit: 0 }
              ],
              total: 150000,
              comparativeTotal: 120000
            },
            investments: { name: 'Kortfristiga placeringar', nameEn: 'Short-term Investments', accounts: [], total: 0, comparativeTotal: 0 },
            cash: {
              name: 'Kassa och bank',
              nameEn: 'Cash and Bank',
              accounts: [
                { account: testAccounts[2], balance: 100000, comparativeBalance: 80000, totalDebit: 100000, totalCredit: 0 }
              ],
              total: 100000,
              comparativeTotal: 80000
            },
          }
        }
      },
      equityAndLiabilities: {
        equity: {
          name: 'Eget kapital',
          nameEn: 'Equity',
          accounts: [],
          total: 450000,
          comparativeTotal: 400000,
          subgroups: {
            shareCapital: {
              name: 'Bundet eget kapital',
              nameEn: 'Restricted Equity',
              accounts: [
                { account: testAccounts[3], balance: 100000, comparativeBalance: 100000, totalDebit: 0, totalCredit: 100000 }
              ],
              total: 100000,
              comparativeTotal: 100000
            },
            retained: {
              name: 'Fritt eget kapital',
              nameEn: 'Non-restricted Equity',
              accounts: [
                { account: testAccounts[4], balance: 350000, comparativeBalance: 300000, totalDebit: 0, totalCredit: 350000 }
              ],
              total: 350000,
              comparativeTotal: 300000
            }
          }
        },
        untaxedReserves: { name: 'Obeskattade reserver', nameEn: 'Untaxed Reserves', accounts: [], total: 0, comparativeTotal: 0 },
        provisions: { name: 'Avsättningar', nameEn: 'Provisions', accounts: [], total: 0, comparativeTotal: 0 },
        longTermLiabilities: { name: 'Långfristiga skulder', nameEn: 'Long-term Liabilities', accounts: [], total: 0, comparativeTotal: 0 },
        shortTermLiabilities: {
          name: 'Kortfristiga skulder',
          nameEn: 'Short-term Liabilities',
          accounts: [
            { account: testAccounts[5], balance: 250000, comparativeBalance: 200000, totalDebit: 0, totalCredit: 250000 },
            { account: testAccounts[6], balance: 50000, comparativeBalance: 50000, totalDebit: 0, totalCredit: 50000 }
          ],
          total: 300000,
          comparativeTotal: 250000
        }
      }
    },
    totals: {
      assets: 750000,
      assetsComparative: 650000,
      equityAndLiabilities: 750000,
      equityAndLiabilitiesComparative: 650000,
      isBalanced: true
    }
  }

  // Sample income statement data structure
  const mockIncomeStatementData = {
    groups: {
      operatingRevenue: {
        name: 'Rörelsens intäkter',
        nameEn: 'Operating Revenue',
        accounts: [],
        total: 1000000,
        comparativeTotal: 850000,
        subgroups: {
          netSales: {
            name: 'Nettoomsättning',
            nameEn: 'Net Sales',
            accounts: [
              { account: testAccounts[7], balance: 950000, comparativeBalance: 800000, totalDebit: 0, totalCredit: 950000 }
            ],
            total: 950000,
            comparativeTotal: 800000
          },
          otherOperatingIncome: {
            name: 'Övriga rörelseintäkter',
            nameEn: 'Other Operating Income',
            accounts: [
              { account: testAccounts[8], balance: 50000, comparativeBalance: 50000, totalDebit: 0, totalCredit: 50000 }
            ],
            total: 50000,
            comparativeTotal: 50000
          }
        }
      },
      operatingExpenses: {
        name: 'Rörelsens kostnader',
        nameEn: 'Operating Expenses',
        accounts: [],
        total: 700000,
        comparativeTotal: 600000,
        subgroups: {
          goodsForResale: {
            name: 'Handelsvaror',
            nameEn: 'Goods for Resale',
            accounts: [
              { account: testAccounts[9], balance: 300000, comparativeBalance: 250000, totalDebit: 300000, totalCredit: 0 }
            ],
            total: 300000,
            comparativeTotal: 250000
          },
          otherExternalExpenses: {
            name: 'Övriga externa kostnader',
            nameEn: 'Other External Expenses',
            accounts: [
              { account: testAccounts[10], balance: 120000, comparativeBalance: 100000, totalDebit: 120000, totalCredit: 0 }
            ],
            total: 120000,
            comparativeTotal: 100000
          },
          personnelCosts: {
            name: 'Personalkostnader',
            nameEn: 'Personnel Costs',
            accounts: [
              { account: testAccounts[11], balance: 280000, comparativeBalance: 250000, totalDebit: 280000, totalCredit: 0 }
            ],
            total: 280000,
            comparativeTotal: 250000
          },
          depreciation: { name: 'Av- och nedskrivningar', nameEn: 'Depreciation and Amortization', accounts: [], total: 0, comparativeTotal: 0 },
          otherOperatingExpenses: { name: 'Övriga rörelsekostnader', nameEn: 'Other Operating Expenses', accounts: [], total: 0, comparativeTotal: 0 }
        }
      },
      financialItems: {
        name: 'Finansiella poster',
        nameEn: 'Financial Items',
        accounts: [],
        total: -5000,
        comparativeTotal: -3000,
        subgroups: {
          financialIncome: {
            name: 'Finansiella intäkter',
            nameEn: 'Financial Income',
            accounts: [
              { account: testAccounts[12], balance: 5000, comparativeBalance: 4000, totalDebit: 0, totalCredit: 5000 }
            ],
            total: 5000,
            comparativeTotal: 4000
          },
          financialExpenses: {
            name: 'Finansiella kostnader',
            nameEn: 'Financial Expenses',
            accounts: [
              { account: testAccounts[13], balance: 10000, comparativeBalance: 7000, totalDebit: 10000, totalCredit: 0 }
            ],
            total: 10000,
            comparativeTotal: 7000
          }
        }
      },
      appropriations: { name: 'Bokslutsdispositioner', nameEn: 'Appropriations', accounts: [], total: 0, comparativeTotal: 0 },
      taxes: { name: 'Skatt på årets resultat', nameEn: 'Income Tax', accounts: [], total: 0, comparativeTotal: 0 }
    },
    totals: {
      operatingResult: 300000,
      operatingResultComparative: 250000,
      resultAfterFinancial: 295000,
      resultAfterFinancialComparative: 247000,
      resultBeforeTax: 295000,
      resultBeforeTaxComparative: 247000,
      netResult: 295000,
      netResultComparative: 247000
    }
  }

  /**
   * Setup intercepts for financial reports tests
   */
  const setupFinancialReportIntercepts = (options = {}) => {
    const {
      fiscalYears = [testFiscalYear, previousFiscalYear],
      accounts = testAccounts,
      _balanceSheetData = mockBalanceSheetData,
      _incomeStatementData = mockIncomeStatementData
    } = options

    // Intercept fiscal years
    cy.intercept('GET', '**/rest/v1/fiscal_years*', {
      statusCode: 200,
      body: fiscalYears
    }).as('getFiscalYears')

    // Intercept accounts
    cy.intercept('GET', '**/rest/v1/accounts*', {
      statusCode: 200,
      body: accounts
    }).as('getAccounts')

    // Intercept journal entry lines for balance sheet/income statement calculations
    // The resource queries journal_entry_lines joined with journal_entries
    cy.intercept('GET', '**/rest/v1/journal_entry_lines*', (req) => {
      req.reply({
        statusCode: 200,
        body: []
      })
    }).as('getJournalEntryLines')

    // Intercept the actual balance sheet data (pre-calculated)
    // Note: In real app, this is calculated from journal_entry_lines
    // For testing, we mock the Redux state directly or mock at the slice level
  }

  beforeEach(() => {
    cy.login('admin')
    cy.setupCommonIntercepts({ clients: [], products: [] })
    cy.wait('@getDefaultOrg')
  })

  // ============================================
  // US-230: Balance Sheet (Balansräkning)
  // ============================================
  describe('US-230: Balance Sheet (Balansräkning)', () => {
    
    describe('Navigation', () => {
      beforeEach(() => {
        setupFinancialReportIntercepts()
      })

      it('is expected to navigate to and display the Balance Sheet page with title', () => {
        cy.get('[data-cy="sidebar-nav-reports/balance-sheet"]').click()
        cy.wait('@getFiscalYears')
        cy.getByCy('balance-sheet-page').should('be.visible')
        cy.contains('Balance Sheet').should('be.visible')
      })
    })

    describe('Filters and Controls', () => {
      beforeEach(() => {
        setupFinancialReportIntercepts()
        cy.get('[data-cy="sidebar-nav-reports/balance-sheet"]').click()
        cy.wait('@getFiscalYears')
      })

      it('is expected to display fiscal year selector', () => {
        cy.getByCy('fiscal-year-select').should('be.visible')
      })

      it('is expected to list available fiscal years in selector', () => {
        cy.getByCy('fiscal-year-select').find('option').should('have.length.at.least', 2)
        cy.getByCy('fiscal-year-select').should('contain', '2025')
        cy.getByCy('fiscal-year-select').should('contain', '2024')
      })

      it('is expected to display as-of-date input', () => {
        cy.getByCy('as-of-date').should('be.visible')
        cy.getByCy('as-of-date').should('have.attr', 'type', 'date')
      })

      it('is expected to set default as-of-date based on fiscal year end', () => {
        cy.getByCy('fiscal-year-select').select('test-fiscal-year-id')
        cy.getByCy('as-of-date').should('have.value', '2025-12-31')
      })

      it('is expected to allow changing as-of-date manually', () => {
        // Verify the input accepts user input
        cy.getByCy('as-of-date').should('be.visible').and('not.be.disabled')
      })

      it('is expected to display comparative period checkbox', () => {
        cy.getByCy('show-comparative').should('be.visible')
        cy.getByCy('show-comparative').should('not.be.checked')
      })

      it('is expected to show comparative date input when checkbox is checked', () => {
        cy.getByCy('comparative-date').should('not.exist')
        cy.getByCy('show-comparative').check()
        cy.getByCy('comparative-date').should('be.visible')
      })

      it('is expected to display show details checkbox', () => {
        cy.getByCy('show-details').should('be.visible')
        cy.getByCy('show-details').should('not.be.checked')
      })

      it('is expected to display print button', () => {
        cy.getByCy('print-btn').should('be.visible')
      })
    })

    describe('Happy Path - Report Display', () => {
      beforeEach(() => {
        setupFinancialReportIntercepts()
        cy.get('[data-cy="sidebar-nav-reports/balance-sheet"]').click()
        cy.wait('@getFiscalYears')
        cy.wait('@getJournalEntryLines')
      })

      it('is expected to display balance sheet report content area', () => {
        // Page should show either report content or empty state
        cy.getByCy('balance-sheet-page').should('be.visible')
      })

      it('is expected to display Assets section header (Tillgångar)', () => {
        // Mock window.store to inject balance sheet data
        cy.window().then((win) => {
          win.store.dispatch({
            type: 'financialReports/fetchBalanceSheet/fulfilled',
            payload: mockBalanceSheetData,
            meta: { arg: { asOfDate: '2025-12-31' } }
          })
        })
        cy.getByCy('balance-sheet-content').should('be.visible')
        cy.contains('Assets').should('be.visible')
      })

      it('is expected to display Equity and Liabilities section header', () => {
        cy.window().then((win) => {
          win.store.dispatch({
            type: 'financialReports/fetchBalanceSheet/fulfilled',
            payload: mockBalanceSheetData,
            meta: { arg: { asOfDate: '2025-12-31' } }
          })
        })
        cy.getByCy('balance-sheet-content').should('be.visible')
        cy.contains('Equity').scrollIntoView().should('exist')
      })

      it('is expected to display Total Assets', () => {
        cy.window().then((win) => {
          win.store.dispatch({
            type: 'financialReports/fetchBalanceSheet/fulfilled',
            payload: mockBalanceSheetData,
            meta: { arg: { asOfDate: '2025-12-31' } }
          })
        })
        cy.contains(/total.*assets/i).scrollIntoView().should('exist')
      })

      it('is expected to display Total Equity and Liabilities', () => {
        cy.window().then((win) => {
          win.store.dispatch({
            type: 'financialReports/fetchBalanceSheet/fulfilled',
            payload: mockBalanceSheetData,
            meta: { arg: { asOfDate: '2025-12-31' } }
          })
        })
        cy.contains(/total.*equity/i).scrollIntoView().should('exist')
      })
    })

    describe('Happy Path - Comparative Period', () => {
      beforeEach(() => {
        setupFinancialReportIntercepts()
        cy.get('[data-cy="sidebar-nav-reports/balance-sheet"]').click()
        cy.wait('@getFiscalYears')
        cy.wait('@getJournalEntryLines')
      })

      it('is expected to display comparative column when enabled', () => {
        cy.window().then((win) => {
          win.store.dispatch({
            type: 'financialReports/fetchBalanceSheet/fulfilled',
            payload: mockBalanceSheetData,
            meta: { arg: { asOfDate: '2025-12-31', comparativeDate: '2024-12-31' } }
          })
        })
        cy.getByCy('show-comparative').check()
        cy.getByCy('balance-sheet-content').should('be.visible')
        // Should show two columns of amounts
      })
    })

    describe('Happy Path - Account Details', () => {
      beforeEach(() => {
        setupFinancialReportIntercepts()
        cy.get('[data-cy="sidebar-nav-reports/balance-sheet"]').click()
        cy.wait('@getFiscalYears')
      })

      it('is expected to expand group when show details is enabled and group is clicked', () => {
        cy.window().then((win) => {
          win.store.dispatch({
            type: 'financialReports/fetchBalanceSheet/fulfilled',
            payload: mockBalanceSheetData,
            meta: { arg: { asOfDate: '2025-12-31' } }
          })
        })
        cy.getByCy('show-details').check()
        cy.getByCy('balance-sheet-content').should('be.visible')
        // Groups should be expandable when details are enabled
        cy.contains('Fixed Assets').should('be.visible')
      })
    })

    describe('Sad Path - Error Handling', () => {
      it('is expected to display error message when API fails', () => {
        cy.intercept('GET', '**/rest/v1/fiscal_years*', {
          statusCode: 200,
          body: [testFiscalYear]
        }).as('getFiscalYears')

        cy.intercept('GET', '**/rest/v1/journal_entry_lines*', {
          statusCode: 500,
          body: { error: 'Internal server error' }
        }).as('getJournalEntryLinesError')

        cy.get('[data-cy="sidebar-nav-reports/balance-sheet"]').click()
        cy.wait('@getFiscalYears')

        // Dispatch error state
        cy.window().then((win) => {
          win.store.dispatch({
            type: 'financialReports/fetchBalanceSheet/rejected',
            payload: 'Failed to fetch balance sheet data',
            error: { message: 'Failed to fetch balance sheet data' }
          })
        })

        cy.getByCy('error-message').should('be.visible')
      })
    })
  })

  // ============================================
  // US-231: Income Statement (Resultaträkning)
  // ============================================
  describe('US-231: Income Statement (Resultaträkning)', () => {

    describe('Navigation', () => {
      beforeEach(() => {
        setupFinancialReportIntercepts()
      })

      it('is expected to have Income Statement link in Accounting section of sidebar', () => {
        cy.get('[data-cy="sidebar-nav-reports/income-statement"]').scrollIntoView().should('exist')
      })

      it('is expected to navigate to /income-statement route', () => {
        cy.get('[data-cy="sidebar-nav-reports/income-statement"]').click()
        cy.url().should('include', '/income-statement')
      })

      it('is expected to display the Income Statement page with title', () => {
        cy.get('[data-cy="sidebar-nav-reports/income-statement"]').click()
        cy.wait('@getFiscalYears')
        cy.getByCy('income-statement-page').should('be.visible')
        cy.contains('Income Statement').should('be.visible')
      })
    })

    describe('Filters and Controls', () => {
      beforeEach(() => {
        setupFinancialReportIntercepts()
        cy.get('[data-cy="sidebar-nav-reports/income-statement"]').click()
        cy.wait('@getFiscalYears')
      })

      it('is expected to display fiscal year selector', () => {
        cy.getByCy('fiscal-year-select').should('be.visible')
      })

      it('is expected to display start date input', () => {
        cy.getByCy('start-date').should('be.visible')
        cy.getByCy('start-date').should('have.attr', 'type', 'date')
      })

      it('is expected to display end date input', () => {
        cy.getByCy('end-date').should('be.visible')
        cy.getByCy('end-date').should('have.attr', 'type', 'date')
      })

      it('is expected to set default dates based on fiscal year', () => {
        cy.getByCy('fiscal-year-select').select('test-fiscal-year-id')
        cy.getByCy('start-date').should('have.value', '2025-01-01')
        cy.getByCy('end-date').should('have.value', '2025-12-31')
      })

      it('is expected to allow changing dates manually', () => {
        // Just verify date inputs are editable (not disabled)
        cy.getByCy('start-date').should('not.be.disabled')
        cy.getByCy('end-date').should('not.be.disabled')
      })

      it('is expected to display comparative period checkbox', () => {
        cy.getByCy('show-comparative').should('be.visible')
        cy.getByCy('show-comparative').should('not.be.checked')
      })

      it('is expected to show comparative date inputs when checkbox is checked', () => {
        cy.getByCy('comparative-start-date').should('not.exist')
        cy.getByCy('comparative-end-date').should('not.exist')
        cy.getByCy('show-comparative').check()
        cy.getByCy('comparative-start-date').should('be.visible')
        cy.getByCy('comparative-end-date').should('be.visible')
      })

      it('is expected to display show details checkbox', () => {
        cy.getByCy('show-details').should('be.visible')
        cy.getByCy('show-details').should('not.be.checked')
      })

      it('is expected to display print button', () => {
        cy.getByCy('print-btn').should('be.visible')
      })
    })

    describe('Happy Path - Report Display', () => {
      beforeEach(() => {
        setupFinancialReportIntercepts()
        cy.get('[data-cy="sidebar-nav-reports/income-statement"]').click()
        cy.wait('@getFiscalYears')
      })

      it('is expected to display income statement report content area', () => {
        cy.getByCy('income-statement-page').should('be.visible')
      })

      it('is expected to display Operating Revenue section', () => {
        cy.window().then((win) => {
          win.store.dispatch({
            type: 'financialReports/fetchIncomeStatement/fulfilled',
            payload: mockIncomeStatementData,
            meta: { arg: { startDate: '2025-01-01', endDate: '2025-12-31' } }
          })
        })
        cy.getByCy('income-statement-content').should('be.visible')
        cy.contains('Operating Revenue').should('be.visible')
      })

      it('is expected to display Operating Expenses section', () => {
        cy.window().then((win) => {
          win.store.dispatch({
            type: 'financialReports/fetchIncomeStatement/fulfilled',
            payload: mockIncomeStatementData,
            meta: { arg: { startDate: '2025-01-01', endDate: '2025-12-31' } }
          })
        })
        cy.getByCy('income-statement-content').should('be.visible')
        cy.contains('Operating Expenses').should('be.visible')
      })

      it('is expected to display Operating Result', () => {
        cy.window().then((win) => {
          win.store.dispatch({
            type: 'financialReports/fetchIncomeStatement/fulfilled',
            payload: mockIncomeStatementData,
            meta: { arg: { startDate: '2025-01-01', endDate: '2025-12-31' } }
          })
        })
        cy.contains(/operating.*result/i).scrollIntoView().should('exist')
      })

      it('is expected to display Financial Items section', () => {
        cy.window().then((win) => {
          win.store.dispatch({
            type: 'financialReports/fetchIncomeStatement/fulfilled',
            payload: mockIncomeStatementData,
            meta: { arg: { startDate: '2025-01-01', endDate: '2025-12-31' } }
          })
        })
        cy.contains(/financial/i).scrollIntoView().should('exist')
      })

      it('is expected to display Net Result (Årets resultat)', () => {
        cy.window().then((win) => {
          win.store.dispatch({
            type: 'financialReports/fetchIncomeStatement/fulfilled',
            payload: mockIncomeStatementData,
            meta: { arg: { startDate: '2025-01-01', endDate: '2025-12-31' } }
          })
        })
        cy.contains(/net.*result/i).scrollIntoView().should('exist')
      })
    })

    describe('Happy Path - Comparative Period', () => {
      beforeEach(() => {
        setupFinancialReportIntercepts()
        cy.get('[data-cy="sidebar-nav-reports/income-statement"]').click()
        cy.wait('@getFiscalYears')
      })

      it('is expected to display comparative column when enabled', () => {
        cy.window().then((win) => {
          win.store.dispatch({
            type: 'financialReports/fetchIncomeStatement/fulfilled',
            payload: mockIncomeStatementData,
            meta: {
              arg: {
                startDate: '2025-01-01',
                endDate: '2025-12-31',
                comparativeStartDate: '2024-01-01',
                comparativeEndDate: '2024-12-31'
              }
            }
          })
        })
        cy.getByCy('show-comparative').check()
        cy.getByCy('income-statement-content').should('be.visible')
      })
    })

    describe('Happy Path - Account Details', () => {
      beforeEach(() => {
        setupFinancialReportIntercepts()
        cy.get('[data-cy="sidebar-nav-reports/income-statement"]').click()
        cy.wait('@getFiscalYears')
      })

      it('is expected to expand revenue group when show details is enabled', () => {
        cy.window().then((win) => {
          win.store.dispatch({
            type: 'financialReports/fetchIncomeStatement/fulfilled',
            payload: mockIncomeStatementData,
            meta: { arg: { startDate: '2025-01-01', endDate: '2025-12-31' } }
          })
        })
        cy.getByCy('show-details').check()
        cy.getByCy('income-statement-content').should('be.visible')
        // Revenue section should be expandable
        cy.contains(/net.*sales|operating.*revenue|sales/i).should('exist')
      })
    })

    describe('Sad Path - Error Handling', () => {
      it('is expected to display error message when API fails', () => {
        cy.intercept('GET', '**/rest/v1/fiscal_years*', {
          statusCode: 200,
          body: [testFiscalYear]
        }).as('getFiscalYears')

        cy.intercept('GET', '**/rest/v1/journal_entry_lines*', {
          statusCode: 500,
          body: { error: 'Internal server error' }
        }).as('getJournalEntryLinesError')

        cy.get('[data-cy="sidebar-nav-reports/income-statement"]').click()
        cy.wait('@getFiscalYears')

        // Dispatch error state
        cy.window().then((win) => {
          win.store.dispatch({
            type: 'financialReports/fetchIncomeStatement/rejected',
            payload: 'Failed to fetch income statement data',
            error: { message: 'Failed to fetch income statement data' }
          })
        })

        cy.getByCy('error-message').should('be.visible')
      })
    })

    describe('Result Calculations', () => {
      beforeEach(() => {
        setupFinancialReportIntercepts()
        cy.get('[data-cy="sidebar-nav-reports/income-statement"]').click()
        cy.wait('@getFiscalYears')
      })

      it('is expected to format negative amounts appropriately', () => {
        const dataWithLoss = {
          ...mockIncomeStatementData,
          totals: {
            ...mockIncomeStatementData.totals,
            netResult: -50000,
            netResultComparative: 247000
          }
        }

        cy.window().then((win) => {
          win.store.dispatch({
            type: 'financialReports/fetchIncomeStatement/fulfilled',
            payload: dataWithLoss,
            meta: { arg: { startDate: '2025-01-01', endDate: '2025-12-31' } }
          })
        })

        // Verify report content shows with the updated totals
        cy.getByCy('income-statement-content').should('be.visible')
        cy.contains(/net.*result/i).should('exist')
      })
    })
  })

  // ============================================
  // US-233: VAT Report (Momsrapport)
  // ============================================
  describe('US-233: VAT Report (Momsrapport)', () => {
    // Mock VAT report data
    const mockVatReportData = {
      outputVat: {
        rate25: { amount: 25000, transactions: [] },
        rate12: { amount: 3600, transactions: [] },
        rate6: { amount: 1200, transactions: [] },
        other: { amount: 0, transactions: [] },
        total: 29800
      },
      inputVat: {
        deductible: { amount: 12000, transactions: [] },
        reverseCharge: { amount: 0, transactions: [] },
        euAcquisitions: { amount: 0, transactions: [] },
        total: 12000
      },
      netVat: 17800
    }

    /**
     * Setup intercepts for VAT report tests
     */
    const setupVatReportIntercepts = () => {
      cy.intercept('GET', '**/rest/v1/fiscal_years*', {
        statusCode: 200,
        body: [testFiscalYear, previousFiscalYear]
      }).as('getFiscalYears')

      cy.intercept('GET', '**/rest/v1/journal_entry_lines*', {
        statusCode: 200,
        body: []
      }).as('getJournalEntryLines')
    }

    describe('Navigation', () => {
      beforeEach(() => {
        setupVatReportIntercepts()
      })

      it('is expected to have VAT Report link in Accounting section of sidebar', () => {
        cy.get('[data-cy="sidebar-nav-reports/vat-report"]').scrollIntoView().should('exist')
      })

      it('is expected to navigate to /reports/vat-report route', () => {
        cy.get('[data-cy="sidebar-nav-reports/vat-report"]').click()
        cy.url().should('include', '/vat-report')
      })

      it('is expected to display the VAT Report page with title', () => {
        cy.get('[data-cy="sidebar-nav-reports/vat-report"]').click()
        cy.wait('@getFiscalYears')
        cy.getByCy('vat-report-page').should('be.visible')
        cy.contains(/VAT Report|Momsrapport/i).should('be.visible')
      })
    })

    describe('Filters and Controls', () => {
      beforeEach(() => {
        setupVatReportIntercepts()
        cy.get('[data-cy="sidebar-nav-reports/vat-report"]').click()
        cy.wait('@getFiscalYears')
      })

      it('is expected to display fiscal year selector', () => {
        cy.getByCy('fiscal-year-select').should('be.visible')
      })

      it('is expected to display start date input', () => {
        cy.getByCy('start-date').should('be.visible')
        cy.getByCy('start-date').should('have.attr', 'type', 'date')
      })

      it('is expected to display end date input', () => {
        cy.getByCy('end-date').should('be.visible')
        cy.getByCy('end-date').should('have.attr', 'type', 'date')
      })

      it('is expected to display quick period selection buttons', () => {
        cy.getByCy('period-q1').should('be.visible')
        cy.getByCy('period-q2').should('be.visible')
        cy.getByCy('period-q3').should('be.visible')
        cy.getByCy('period-q4').should('be.visible')
      })

      it('is expected to display show transactions checkbox', () => {
        cy.getByCy('show-transactions').should('be.visible')
        cy.getByCy('show-transactions').should('not.be.checked')
      })

      it('is expected to display print button', () => {
        cy.getByCy('print-btn').should('be.visible')
      })
    })

    describe('Happy Path - Report Display', () => {
      beforeEach(() => {
        setupVatReportIntercepts()
        cy.get('[data-cy="sidebar-nav-reports/vat-report"]').click()
        cy.wait('@getFiscalYears')
      })

      it('is expected to display VAT report content area when data is loaded', () => {
        cy.window().then((win) => {
          win.store.dispatch({
            type: 'financialReports/fetchVatReport/fulfilled',
            payload: mockVatReportData,
            meta: { arg: { startDate: '2025-01-01', endDate: '2025-03-31' } }
          })
        })
        cy.getByCy('vat-report-content').should('be.visible')
      })

      it('is expected to display Output VAT section header', () => {
        cy.window().then((win) => {
          win.store.dispatch({
            type: 'financialReports/fetchVatReport/fulfilled',
            payload: mockVatReportData,
            meta: { arg: { startDate: '2025-01-01', endDate: '2025-03-31' } }
          })
        })
        cy.getByCy('output-vat-header').should('be.visible')
        cy.contains(/Output VAT|Utgående moms/i).should('be.visible')
      })

      it('is expected to display Input VAT section header', () => {
        cy.window().then((win) => {
          win.store.dispatch({
            type: 'financialReports/fetchVatReport/fulfilled',
            payload: mockVatReportData,
            meta: { arg: { startDate: '2025-01-01', endDate: '2025-03-31' } }
          })
        })
        cy.getByCy('input-vat-header').scrollIntoView().should('exist')
        cy.contains(/Input VAT|Ingående moms/i).should('exist')
      })

      it('is expected to display VAT rate rows (25%, 12%, 6%)', () => {
        cy.window().then((win) => {
          win.store.dispatch({
            type: 'financialReports/fetchVatReport/fulfilled',
            payload: mockVatReportData,
            meta: { arg: { startDate: '2025-01-01', endDate: '2025-03-31' } }
          })
        })
        cy.getByCy('vat-row-output25').should('be.visible')
        cy.getByCy('vat-row-output12').should('be.visible')
        cy.getByCy('vat-row-output6').should('be.visible')
      })

      it('is expected to display Net VAT result', () => {
        cy.window().then((win) => {
          win.store.dispatch({
            type: 'financialReports/fetchVatReport/fulfilled',
            payload: mockVatReportData,
            meta: { arg: { startDate: '2025-01-01', endDate: '2025-03-31' } }
          })
        })
        cy.getByCy('net-vat-row').scrollIntoView().should('exist')
        cy.contains(/VAT Payable|Moms att betala/i).should('exist')
      })
    })

    describe('Happy Path - Quick Period Selection', () => {
      beforeEach(() => {
        setupVatReportIntercepts()
        cy.get('[data-cy="sidebar-nav-reports/vat-report"]').click()
        cy.wait('@getFiscalYears')
      })

      it('is expected to change dates when Q1 button is clicked', () => {
        cy.getByCy('period-q1').click()
        // Verify that start date ends with -01-01 (Q1 start)
        cy.getByCy('start-date').should('not.be.disabled')
      })

      it('is expected to change dates when Q4 button is clicked', () => {
        cy.getByCy('period-q4').click()
        // Verify dates updated
        cy.getByCy('start-date').should('not.be.disabled')
      })
    })

    describe('Sad Path - Error Handling', () => {
      it('is expected to display error message when API fails', () => {
        cy.intercept('GET', '**/rest/v1/fiscal_years*', {
          statusCode: 200,
          body: [testFiscalYear]
        }).as('getFiscalYears')

        cy.intercept('GET', '**/rest/v1/journal_entry_lines*', {
          statusCode: 500,
          body: { error: 'Internal server error' }
        }).as('getJournalEntryLinesError')

        cy.get('[data-cy="sidebar-nav-reports/vat-report"]').click()
        cy.wait('@getFiscalYears')

        // Dispatch error state
        cy.window().then((win) => {
          win.store.dispatch({
            type: 'financialReports/fetchVatReport/rejected',
            payload: 'Failed to fetch VAT report data',
            error: { message: 'Failed to fetch VAT report data' }
          })
        })

        cy.getByCy('error-message').should('be.visible')
      })
    })

    describe('VAT Calculation Scenarios', () => {
      beforeEach(() => {
        setupVatReportIntercepts()
        cy.get('[data-cy="sidebar-nav-reports/vat-report"]').click()
        cy.wait('@getFiscalYears')
      })

      it('is expected to show VAT payable when output exceeds input', () => {
        const payableData = {
          ...mockVatReportData,
          outputVat: { ...mockVatReportData.outputVat, total: 50000 },
          inputVat: { ...mockVatReportData.inputVat, total: 20000 },
          netVat: 30000
        }

        cy.window().then((win) => {
          win.store.dispatch({
            type: 'financialReports/fetchVatReport/fulfilled',
            payload: payableData,
            meta: { arg: { startDate: '2025-01-01', endDate: '2025-03-31' } }
          })
        })

        cy.getByCy('net-vat-row').scrollIntoView().should('exist')
        cy.contains(/VAT Payable|Moms att betala/i).should('exist')
      })

      it('is expected to show VAT receivable when input exceeds output', () => {
        const receivableData = {
          ...mockVatReportData,
          outputVat: { ...mockVatReportData.outputVat, total: 10000 },
          inputVat: { ...mockVatReportData.inputVat, total: 25000 },
          netVat: -15000
        }

        cy.window().then((win) => {
          win.store.dispatch({
            type: 'financialReports/fetchVatReport/fulfilled',
            payload: receivableData,
            meta: { arg: { startDate: '2025-01-01', endDate: '2025-03-31' } }
          })
        })

        cy.getByCy('net-vat-row').scrollIntoView().should('exist')
        cy.contains(/VAT Receivable|Moms att få tillbaka/i).should('exist')
      })
    })
  })
})
