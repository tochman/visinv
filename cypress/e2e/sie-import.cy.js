/// <reference types="cypress" />

describe('SIE File Import (US-122)', () => {
  // Sample SIE4 file content - matches the default test organization
  const sampleSIE4 = `#FLAGGA 0
#FORMAT PC8
#SIETYP 4
#PROGRAM "Test Program" 1.0
#GEN 20240101
#FNAMN "Test Organization"
#RAR 0 20240101 20241231
#KPTYP EUBAS97
#KONTO 1510 "Kundfordringar"
#SRU 1510 7251
#KONTO 1930 "Företagskonto"
#SRU 1930 7281
#KONTO 2440 "Leverantörsskulder"
#SRU 2440 7365
#KONTO 3010 "Försäljning varor 25%"
#SRU 3010 301
#KONTO 4010 "Inköp material"
#SRU 4010 401
#IB 0 1510 100000
#UB 0 1510 150000
`;

  // Sample SIE5 XML file content - matches the default test organization
  const sampleSIE5 = `<?xml version="1.0" encoding="utf-8"?>
<Sie xmlns="http://www.sie.se/sie5">
  <FileInfo>
    <SoftwareProduct name="Test Software" version="2.0" />
    <Company name="Test Organization" />
    <FiscalYears>
      <FiscalYear start="2024-01" end="2024-12" primary="true" />
    </FiscalYears>
    <AccountingCurrency currency="SEK" />
  </FileInfo>
  <Accounts>
    <Account id="1510" name="Kundfordringar" type="asset">
      <OpeningBalance month="2024-01" amount="50000" />
    </Account>
    <Account id="2440" name="Leverantörsskulder" type="liability" />
    <Account id="3010" name="Försäljning" type="income" />
  </Accounts>
</Sie>`;

  // Helper to upload a SIE file
  const uploadSIEFile = (content, filename) => {
    cy.getByCy('sie-file-input').selectFile(
      {
        contents: Cypress.Buffer.from(content),
        fileName: filename,
        mimeType: 'text/plain'
      },
      { force: true }
    )
  }

  beforeEach(() => {
    cy.login('admin')
    cy.setupCommonIntercepts({
      accounts: []
    })
  })

  describe('Navigation', () => {
    it('is expected to have SIE Import link in Accounting section of sidebar', () => {
      // The SIE Import link is in the Accounting section
      // data-cy is sidebar-nav-import/sie due to path /import/sie
      cy.get('[data-cy="sidebar-nav-import/sie"]').scrollIntoView().should('be.visible')
    })

    it('is expected to navigate to /import/sie route', () => {
      cy.get('[data-cy="sidebar-nav-import/sie"]').click()
      cy.url().should('include', '/import/sie')
    })

    it('is expected to display the SIE import page with title', () => {
      cy.get('[data-cy="sidebar-nav-import/sie"]').click()
      cy.getByCy('sie-import-page-title').should('be.visible')
      cy.getByCy('sie-import-page-title').should('contain', 'SIE Import')
    })
  })

  describe('Happy Path - SIE4 File Upload', () => {
    beforeEach(() => {
      cy.get('[data-cy="sidebar-nav-import/sie"]').click()
    })

    it('is expected to display the drop zone', () => {
      cy.getByCy('sie-drop-zone').should('be.visible')
    })

    it('is expected to accept a .se file', () => {
      uploadSIEFile(sampleSIE4, 'test-accounts.se')
      cy.getByCy('sie-drop-zone').should('contain', 'test-accounts.se')
    })

    it('is expected to parse SIE4 file and show validation results', () => {
      uploadSIEFile(sampleSIE4, 'test-accounts.se')
      cy.getByCy('parse-file-button').should('not.be.disabled').click()

      cy.getByCy('validation-status').should('be.visible')
      cy.getByCy('validation-status').should('contain', 'validation passed')
      cy.getByCy('account-count').should('contain', '5')
    })

    it('is expected to show preview with accounts list', () => {
      uploadSIEFile(sampleSIE4, 'test-accounts.se')
      cy.getByCy('parse-file-button').should('not.be.disabled').click()
      cy.getByCy('proceed-to-preview-button').click()

      cy.getByCy('import-accounts-checkbox').should('be.checked')
      cy.getByCy('skip-existing-checkbox').should('be.checked')
      cy.contains('1510').should('be.visible')
      cy.contains('Kundfordringar').should('be.visible')
    })

    it('is expected to import accounts successfully', () => {
      // Mock the check for existing account numbers - returns empty so all accounts are imported
      cy.intercept('GET', '**/rest/v1/accounts?select=account_number*', {
        statusCode: 200,
        body: []
      }).as('getExistingAccountNumbers')

      // Mock accounts fetch for opening balance preparation (does NOT have select=account_number)
      cy.intercept('GET', /\/rest\/v1\/accounts\?.*order=.*organization_id/, {
        statusCode: 200,
        body: [
          { id: 'new-0', account_number: '1510', name: 'Kundfordringar' },
          { id: 'new-1', account_number: '1930', name: 'Företagskonto' },
          { id: 'new-2', account_number: '2440', name: 'Leverantörsskulder' },
          { id: 'new-3', account_number: '3010', name: 'Försäljning varor 25%' },
          { id: 'new-4', account_number: '4010', name: 'Inköp material' }
        ]
      }).as('getAccountsForOpeningBalances')

      cy.intercept('POST', '**/rest/v1/accounts*', (req) => {
        req.reply({
          statusCode: 201,
          body: req.body.map((acc, i) => ({ id: `new-${i}`, ...acc }))
        })
      }).as('importAccounts')

      // Mock fiscal years import (also enabled by default)
      cy.intercept('GET', /\/rest\/v1\/fiscal_years/, {
        statusCode: 200,
        body: []
      }).as('getExistingFiscalYears')

      cy.intercept('POST', '**/rest/v1/fiscal_years*', (req) => {
        req.reply({
          statusCode: 201,
          body: [{ id: 'fy-1', ...req.body }]
        })
      }).as('importFiscalYears')

      // Mock journal entries for opening balance import
      cy.intercept('GET', '**/rest/v1/journal_entries?*', {
        statusCode: 200,
        body: []
      }).as('getExistingJournalEntries')

      cy.intercept('POST', '**/rest/v1/journal_entries*', (req) => {
        req.reply({
          statusCode: 201,
          body: { id: 'je-1', ...req.body }
        })
      }).as('importJournalEntries')

      cy.intercept('POST', '**/rest/v1/journal_entry_lines*', {
        statusCode: 201,
        body: []
      }).as('importJournalEntryLines')

      cy.intercept('PATCH', '**/rest/v1/journal_entries*', {
        statusCode: 200,
        body: {}
      }).as('updateJournalEntry')

      // Navigate to dashboard first to clear any state, then back to SIE import
      cy.getByCy('sidebar-nav-dashboard').click()
      cy.get('[data-cy="sidebar-nav-import/sie"]').scrollIntoView().click()
      cy.getByCy('sie-drop-zone', { timeout: 10000 }).should('be.visible')

      uploadSIEFile(sampleSIE4, 'test-accounts.se')
      cy.getByCy('parse-file-button').should('not.be.disabled').click()
      cy.getByCy('proceed-to-preview-button').click()
      cy.getByCy('import-button').click()

      // Wait for the import API calls to complete
      cy.wait('@importAccounts')

      // Check for successful import result with increased timeout
      cy.getByCy('import-accounts-result', { timeout: 15000 }).should('contain', '5 accounts imported')
      cy.getByCy('go-to-accounts-button').should('be.visible')
    })
  })

  describe('Happy Path - SIE5 File Upload', () => {
    beforeEach(() => {
      cy.get('[data-cy="sidebar-nav-import/sie"]').click()
    })

    it('is expected to accept a .sie file', () => {
      uploadSIEFile(sampleSIE5, 'test-accounts.sie')
      cy.getByCy('sie-drop-zone').should('contain', 'test-accounts.sie')
    })

    it('is expected to parse SIE5 XML file and show validation results', () => {
      uploadSIEFile(sampleSIE5, 'test-accounts.sie')
      cy.getByCy('parse-file-button').should('not.be.disabled').click()

      cy.getByCy('validation-status').should('be.visible')
      cy.getByCy('validation-status').should('contain', 'validation passed')
      cy.getByCy('account-count').should('contain', '3')
    })
  })

  describe('Happy Path - Import Options', () => {
    beforeEach(() => {
      cy.get('[data-cy="sidebar-nav-import/sie"]').click()
      uploadSIEFile(sampleSIE4, 'test-accounts.se')
      cy.getByCy('parse-file-button').should('not.be.disabled').click()
      cy.getByCy('proceed-to-preview-button').click()
    })

    it('is expected to allow disabling account import', () => {
      cy.getByCy('import-accounts-checkbox').uncheck()
      // Import button should still be enabled if fiscal years is checked
      cy.getByCy('import-fiscal-years-checkbox').should('be.checked')
      cy.getByCy('import-button').should('not.be.disabled')
      
      // Uncheck opening balances first (while fiscal years is still checked)
      cy.getByCy('import-opening-balances-checkbox').uncheck()
      
      // Then uncheck fiscal years
      cy.getByCy('import-fiscal-years-checkbox').uncheck()
      
      // Now import button should be disabled (all options unchecked)
      cy.getByCy('import-button').should('be.disabled')
    })

    it('is expected to allow disabling skip existing option', () => {
      cy.getByCy('skip-existing-checkbox').uncheck()
      cy.getByCy('skip-existing-checkbox').should('not.be.checked')
    })
  })

  describe('Happy Path - Skip Existing Accounts', () => {
    it('is expected to show import option for skipping existing accounts', () => {
      // Simply verify the skip existing checkbox is available and works
      cy.get('[data-cy="sidebar-nav-import/sie"]').click()
      uploadSIEFile(sampleSIE4, 'test-accounts.se')
      cy.getByCy('parse-file-button').should('not.be.disabled').click()
      cy.getByCy('proceed-to-preview-button').click()
      
      // Verify skip existing option is checked by default
      cy.getByCy('skip-existing-checkbox').should('be.checked')
      
      // Verify it can be toggled
      cy.getByCy('skip-existing-checkbox').uncheck()
      cy.getByCy('skip-existing-checkbox').should('not.be.checked')
    })
  })

  describe('Sad Path - Invalid File', () => {
    beforeEach(() => {
      cy.get('[data-cy="sidebar-nav-import/sie"]').click()
    })

    it('is expected to show error for invalid file extension', () => {
      // Try to upload via the input with invalid extension
      cy.getByCy('sie-file-input').selectFile(
        {
          contents: Cypress.Buffer.from('invalid content'),
          fileName: 'test-accounts.txt',
          mimeType: 'text/plain'
        },
        { force: true }
      )
      
      cy.getByCy('sie-import-error').should('be.visible')
      cy.getByCy('sie-import-error').should('contain', 'Invalid file type')
    })

    it('is expected to show warning for empty file', () => {
      uploadSIEFile('', 'empty.se')
      cy.getByCy('parse-file-button').should('not.be.disabled').click()

      // Empty file still passes validation but shows warnings
      cy.getByCy('validation-status').should('be.visible')
      // Should show warning about no accounts
      cy.contains('No accounts found').should('be.visible')
    })

    it('is expected to show warning for malformed SIE file', () => {
      const invalidSIE = `#FLAGGA 0
#FORMAT PC8
INVALID CONTENT HERE
`
      uploadSIEFile(invalidSIE, 'invalid.se')
      cy.getByCy('parse-file-button').should('not.be.disabled').click()

      // Malformed file still passes validation but shows warnings
      cy.getByCy('validation-status').should('be.visible')
      // Warning message about no accounts is displayed
      cy.contains('No accounts found').should('be.visible')
    })
  })

  describe('Sad Path - Import Errors', () => {
    it('is expected to show import button disabled when all options are unchecked', () => {
      // Test the UI behavior - import button disabled when no import options selected
      cy.get('[data-cy="sidebar-nav-import/sie"]').click()
      uploadSIEFile(sampleSIE4, 'test-accounts.se')
      cy.getByCy('parse-file-button').should('not.be.disabled').click()
      cy.getByCy('proceed-to-preview-button').click()

      // Import button should be enabled when accounts checkbox is checked
      cy.getByCy('import-button').should('not.be.disabled')
      
      // Uncheck accounts checkbox - button still enabled because fiscal years is checked
      cy.getByCy('import-accounts-checkbox').uncheck()
      cy.getByCy('import-button').should('not.be.disabled')
      
      // Uncheck opening balances first (while fiscal years is still checked)
      cy.getByCy('import-opening-balances-checkbox').uncheck()
      
      // Then uncheck fiscal years
      cy.getByCy('import-fiscal-years-checkbox').uncheck()
      
      // Now import button should be disabled (all options unchecked)
      cy.getByCy('import-button').should('be.disabled')
    })
  })

  describe('Wizard Navigation', () => {
    beforeEach(() => {
      cy.get('[data-cy="sidebar-nav-import/sie"]').click()
      uploadSIEFile(sampleSIE4, 'test-accounts.se')
    })

    it('is expected to allow going back from validation step', () => {
      cy.getByCy('parse-file-button').should('not.be.disabled').click()
      cy.getByCy('validation-status').should('be.visible')
      
      cy.contains('button', 'Back').click()
      cy.getByCy('sie-drop-zone').should('be.visible')
    })

    it('is expected to allow going back from preview step', () => {
      cy.getByCy('parse-file-button').should('not.be.disabled').click()
      cy.getByCy('proceed-to-preview-button').click()
      
      cy.contains('button', 'Back').click()
      cy.getByCy('validation-status').should('be.visible')
    })

    // TODO: Flaky test - needs investigation into import completion timing
    it.skip('is expected to allow importing another file after completion', () => {
      // Mock accounts fetch for opening balance import - put broad matcher FIRST
      // (more specific matchers below will override for their specific patterns)
      cy.intercept('GET', /\/rest\/v1\/accounts\?.*organization_id/, {
        statusCode: 200,
        body: []
      }).as('getAccountsForOB')

      // More specific intercept for account_number check (overrides the broad one)
      cy.intercept('GET', '**/rest/v1/accounts?select=account_number*', {
        statusCode: 200,
        body: []
      }).as('getExistingAccountNumbers')

      // Mock account import - return structure expected by the component
      cy.intercept('POST', '**/rest/v1/accounts*', {
        statusCode: 201,
        body: { imported: [], skipped: 0 }
      }).as('importAccounts')

      // Mock fiscal years import
      cy.intercept('GET', /\/rest\/v1\/fiscal_years/, {
        statusCode: 200,
        body: []
      }).as('getExistingFiscalYears')

      // Mock fiscal year import - return structure expected by the component
      cy.intercept('POST', '**/rest/v1/fiscal_years*', {
        statusCode: 201,
        body: { imported: 0, skipped: 0 }
      }).as('importFiscalYears')

      // Mock journal entries import (used for opening balances)
      cy.intercept('POST', '**/rest/v1/journal_entries*', {
        statusCode: 201,
        body: { imported: 0, skipped: 0 }
      }).as('importJournalEntries')

      cy.getByCy('parse-file-button').should('not.be.disabled').click()
      cy.getByCy('proceed-to-preview-button').click()
      
      // Wait for preview to be ready (fiscal years check complete)
      cy.getByCy('preview-step-ready', { timeout: 10000 }).should('exist')
      
      cy.getByCy('import-button').click()

      // Wait for the import to complete by checking for the "Import Another File" button
      cy.getByCy('import-another-button', { timeout: 15000 }).should('be.visible').click()
      cy.getByCy('sie-drop-zone').should('be.visible')
    })
  })

  describe('Organization Mismatch Handling', () => {
    // SIE file with org number that doesn't match current org
    const sieMismatchOrgNumber = `#FLAGGA 0
#FORMAT PC8
#SIETYP 4
#PROGRAM "Test Program" 1.0
#GEN 20240101
#FNAMN "Different Company AB"
#ORGNR 999888-7777
#RAR 0 20240101 20241231
#KONTO 1510 "Kundfordringar"
#KONTO 1930 "Företagskonto"
`;

    // SIE file with name mismatch but no org number (for future tests)
    const _sieMismatchName = `#FLAGGA 0
#FORMAT PC8
#SIETYP 4
#PROGRAM "Test Program" 1.0
#GEN 20240101
#FNAMN "Completely Different Company"
#RAR 0 20240101 20241231
#KONTO 1510 "Kundfordringar"
`;

    // All tests in this block need the organization loaded first
    beforeEach(() => {
      cy.wait('@getDefaultOrg')
    })

    it('is expected to show organization mismatch warning when org numbers differ', () => {
      // Navigate to SIE import page
      cy.get('[data-cy="sidebar-nav-import/sie"]').click()
      
      uploadSIEFile(sieMismatchOrgNumber, 'mismatch.se')
      cy.getByCy('parse-file-button').should('not.be.disabled').click()
      cy.getByCy('proceed-to-preview-button').click()

      // Should show org mismatch screen
      cy.getByCy('org-mismatch-warning').should('be.visible')
      cy.contains('Organization Mismatch').should('be.visible')
      
      // Should display both organizations
      cy.getByCy('sie-org-name').should('contain', 'Different Company AB')
      cy.getByCy('sie-org-number').should('contain', '999888-7777')
      cy.getByCy('current-org-name').should('be.visible')
    })

    it('is expected to allow creating new organization from SIE data', () => {
      // Navigate to SIE import page
      cy.get('[data-cy="sidebar-nav-import/sie"]').click()

      uploadSIEFile(sieMismatchOrgNumber, 'mismatch.se')
      cy.getByCy('parse-file-button').should('not.be.disabled').click()
      cy.getByCy('proceed-to-preview-button').click()

      // Should be on org mismatch step
      cy.getByCy('org-mismatch-warning').should('be.visible')

      // Set up intercepts for org creation BEFORE clicking button
      cy.intercept('POST', '**/rest/v1/organizations*', (req) => {
        req.reply({
          statusCode: 201,
          body: {
            id: 'new-org-id',
            name: req.body.name,
            organization_number: req.body.organization_number
          }
        })
      }).as('createOrganization')

      // The OrganizationContext will reload organizations after creation
      cy.intercept('GET', '**/rest/v1/organization_members*', {
        statusCode: 200,
        body: [{
          role: 'owner',
          is_default: true,
          joined_at: new Date().toISOString(),
          organizations: {
            id: 'new-org-id',
            name: 'Different Company AB',
            organization_number: '999888-7777'
          }
        }]
      }).as('getOrganizationsAfterCreate')

      cy.intercept('PATCH', '**/rest/v1/organization_members*', {
        statusCode: 200,
        body: {}
      }).as('setDefaultOrg')

      // Click create new organization button
      cy.getByCy('create-new-org-button').click()

      // Should proceed to preview step after org created
      cy.contains('Import Preview').should('be.visible')
      cy.getByCy('import-accounts-checkbox').should('be.visible')
    })

    it('is expected to allow using current organization despite mismatch', () => {
      // Navigate to SIE import page
      cy.get('[data-cy="sidebar-nav-import/sie"]').click()

      uploadSIEFile(sieMismatchOrgNumber, 'mismatch.se')
      cy.getByCy('parse-file-button').should('not.be.disabled').click()
      cy.getByCy('proceed-to-preview-button').click()

      // Should be on org mismatch step
      cy.getByCy('org-mismatch-warning').should('be.visible')

      // Click use current org button
      cy.getByCy('use-current-org-button').click()

      // Should proceed to preview step
      cy.contains('Import Preview').should('be.visible')
      cy.getByCy('import-accounts-checkbox').should('be.visible')
    })

    it('is expected to allow canceling from org mismatch screen', () => {
      // Navigate to SIE import page
      cy.get('[data-cy="sidebar-nav-import/sie"]').click()

      uploadSIEFile(sieMismatchOrgNumber, 'mismatch.se')
      cy.getByCy('parse-file-button').should('not.be.disabled').click()
      cy.getByCy('proceed-to-preview-button').click()

      // Should be on org mismatch step
      cy.getByCy('org-mismatch-warning').should('be.visible')

      // Click cancel
      cy.contains('button', 'Cancel').click()

      // Should go back to upload step
      cy.getByCy('sie-drop-zone').should('be.visible')
    })

    it('is expected to skip mismatch dialog when organizations match', () => {
      // SIE file that matches the current org (which has empty org number by default)
      // So we need a SIE file without org number, matching by name
      const sieMatchingOrg = `#FLAGGA 0
#FORMAT PC8
#SIETYP 4
#PROGRAM "Test Program" 1.0
#GEN 20240101
#FNAMN "Test Organization"
#RAR 0 20240101 20241231
#KONTO 1510 "Kundfordringar"
`;

      // Navigate to SIE import via sidebar
      cy.get('[data-cy="sidebar-nav-import/sie"]').click()
      
      uploadSIEFile(sieMatchingOrg, 'matching.se')
      cy.getByCy('parse-file-button').should('not.be.disabled').click()
      cy.getByCy('proceed-to-preview-button').click()

      // Should go directly to preview (no mismatch)
      cy.contains('Import Preview').should('be.visible')
      cy.getByCy('org-mismatch-warning').should('not.exist')
    })

    it('is expected to handle org creation error gracefully', () => {
      cy.intercept('POST', '**/rest/v1/organizations*', {
        statusCode: 400,
        body: { message: 'Organization number already exists' }
      }).as('createOrgError')

      // Navigate to SIE import page
      cy.get('[data-cy="sidebar-nav-import/sie"]').click()

      uploadSIEFile(sieMismatchOrgNumber, 'mismatch.se')
      cy.getByCy('parse-file-button').should('not.be.disabled').click()
      cy.getByCy('proceed-to-preview-button').click()

      cy.getByCy('create-new-org-button').click()

      // Should show error message
      cy.getByCy('sie-import-error').should('be.visible')
      cy.getByCy('sie-import-error').should('contain', 'Failed to create organization')
    })
  })

  describe('US-123: Fiscal Years Import', () => {
    // SIE file with fiscal year records
    const sieWithFiscalYears = `#FLAGGA 0
#FORMAT PC8
#SIETYP 4
#PROGRAM "Test Program" 1.0
#GEN 20240101
#FNAMN "Test Organization"
#RAR 0 20240101 20241231
#RAR -1 20230101 20231231
#KPTYP EUBAS97
#KONTO 1510 "Kundfordringar"
#KONTO 1930 "Företagskonto"
#IB 0 1510 100000
#UB 0 1510 150000
`;

    beforeEach(() => {
      cy.get('[data-cy="sidebar-nav-import/sie"]').click()
    })

    it('is expected to show fiscal year count in validation results', () => {
      uploadSIEFile(sieWithFiscalYears, 'test-fiscal-years.se')
      cy.getByCy('parse-file-button').click()

      cy.getByCy('fiscal-year-count').should('contain', '2')
    })

    it('is expected to show import fiscal years checkbox in preview', () => {
      uploadSIEFile(sieWithFiscalYears, 'test-fiscal-years.se')
      cy.getByCy('parse-file-button').click()
      cy.getByCy('proceed-to-preview-button').click()

      cy.getByCy('import-fiscal-years-checkbox').should('be.visible')
      cy.getByCy('import-fiscal-years-checkbox').should('be.checked')
    })

    it('is expected to allow disabling fiscal year import', () => {
      uploadSIEFile(sieWithFiscalYears, 'test-fiscal-years.se')
      cy.getByCy('parse-file-button').click()
      cy.getByCy('proceed-to-preview-button').click()

      cy.getByCy('import-fiscal-years-checkbox').uncheck()
      cy.getByCy('import-fiscal-years-checkbox').should('not.be.checked')
    })

    it('is expected to import fiscal years successfully', () => {
      // Set up intercepts BEFORE any actions
      cy.intercept('GET', '**/rest/v1/accounts?select=account_number*', {
        statusCode: 200,
        body: []
      }).as('getExistingAccountNumbers')

      cy.intercept('POST', '**/rest/v1/accounts*', {
        statusCode: 201,
        body: []
      }).as('importAccounts')

      cy.intercept('GET', '**/rest/v1/fiscal_years*', {
        statusCode: 200,
        body: []
      }).as('getFiscalYears')

      cy.intercept('POST', '**/rest/v1/fiscal_years*', (req) => {
        req.reply({
          statusCode: 201,
          body: req.body.map((fy, i) => ({ id: `fy-${i}`, ...fy }))
        })
      }).as('importFiscalYears')

      // Mock accounts fetch for opening balance import
      cy.intercept('GET', '**/rest/v1/accounts?*order=*', {
        statusCode: 200,
        body: []
      }).as('getAccountsForOB')

      // Mock journal entries import (used for opening balances)
      cy.intercept('POST', '**/rest/v1/journal_entries*', {
        statusCode: 201,
        body: []
      }).as('importJournalEntries')

      // Navigate to dashboard first to clear any state, then back to SIE import
      cy.getByCy('sidebar-nav-dashboard').click()
      cy.get('[data-cy="sidebar-nav-import/sie"]').scrollIntoView().click()
      cy.getByCy('sie-drop-zone', { timeout: 10000 }).should('be.visible')

      // Now do the user actions
      uploadSIEFile(sieWithFiscalYears, 'test-fiscal-years.se')
      cy.getByCy('parse-file-button').click()
      cy.getByCy('proceed-to-preview-button').click()
      
      // Wait for preview step to be ready before clicking import
      cy.getByCy('preview-step-ready', { timeout: 10000 }).should('exist')
      
      // Verify fiscal years checkbox is checked before import
      cy.getByCy('import-fiscal-years-checkbox').should('be.checked')
      
      cy.getByCy('import-button').click()

      // Wait for the fiscal years import call
      cy.wait('@importFiscalYears')

      cy.getByCy('import-fiscal-years-result', { timeout: 15000 }).should('be.visible')
    })
  })

  describe('US-123: Journal Entries Import', () => {
    // SIE file with vouchers/transactions
    const sieWithJournalEntries = `#FLAGGA 0
#FORMAT PC8
#SIETYP 4
#PROGRAM "Test Program" 1.0
#GEN 20240101
#FNAMN "Test Organization"
#RAR 0 20240101 20241231
#KPTYP EUBAS97
#KONTO 1510 "Kundfordringar"
#KONTO 2440 "Leverantörsskulder"
#KONTO 3010 "Försäljning varor 25%"
#KONTO 6230 "Datakommunikation"
#VER A 1 20240115 "Invoice Payment"
{
#TRANS 1510 {} 1000.00 20240115 "Customer payment"
#TRANS 3010 {} -1000.00 20240115 "Sales"
}
#VER A 2 20240120 "Expense"
{
#TRANS 2440 {} -500.00 20240120 "Supplier"
#TRANS 6230 {} 500.00 20240120 "Internet"
}
`;

    beforeEach(() => {
      cy.get('[data-cy="sidebar-nav-import/sie"]').click()
    })

    it('is expected to show voucher and transaction counts in validation results', () => {
      uploadSIEFile(sieWithJournalEntries, 'test-vouchers.se')
      cy.getByCy('parse-file-button').click()

      cy.getByCy('voucher-count').should('contain', '2')
      cy.getByCy('transaction-count').should('contain', '4')
    })

    it('is expected to show import journal entries checkbox in preview', () => {
      uploadSIEFile(sieWithJournalEntries, 'test-vouchers.se')
      cy.getByCy('parse-file-button').click()
      cy.getByCy('proceed-to-preview-button').click()

      cy.getByCy('import-journal-entries-checkbox').should('be.visible')
      cy.getByCy('import-journal-entries-checkbox').should('be.checked')
    })

    it('is expected to allow disabling journal entries import', () => {
      uploadSIEFile(sieWithJournalEntries, 'test-vouchers.se')
      cy.getByCy('parse-file-button').click()
      cy.getByCy('proceed-to-preview-button').click()

      cy.getByCy('import-journal-entries-checkbox').uncheck()
      cy.getByCy('import-journal-entries-checkbox').should('not.be.checked')
    })

    it('is expected to import journal entries successfully', () => {
      // Mock account lookup for existing accounts check
      cy.intercept('GET', '**/rest/v1/accounts?select=account_number*', {
        statusCode: 200,
        body: [
          { account_number: '1510' },
          { account_number: '2440' },
          { account_number: '3010' },
          { account_number: '6230' }
        ]
      }).as('getExistingAccountNumbers')

      // Mock accounts fetch for building account map
      cy.intercept('GET', '**/rest/v1/accounts*', {
        statusCode: 200,
        body: [
          { id: 'acc-1510', account_number: '1510', name: 'Kundfordringar' },
          { id: 'acc-2440', account_number: '2440', name: 'Leverantörsskulder' },
          { id: 'acc-3010', account_number: '3010', name: 'Försäljning' },
          { id: 'acc-6230', account_number: '6230', name: 'Datakommunikation' }
        ]
      }).as('getAccounts')

      // Mock fiscal years fetch
      cy.intercept('GET', '**/rest/v1/fiscal_years*', {
        statusCode: 200,
        body: [
          { id: 'fy-2024', name: '2024', start_date: '2024-01-01', end_date: '2024-12-31' }
        ]
      }).as('getFiscalYears')

      // Mock existing journal entries check (for duplicate detection)
      cy.intercept('GET', '**/rest/v1/journal_entries?select=description*', {
        statusCode: 200,
        body: [] // No existing entries
      }).as('getExistingJournalEntries')

      // Mock verification number RPC
      cy.intercept('POST', '**/rest/v1/rpc/get_next_verification_number*', {
        statusCode: 200,
        body: 1
      }).as('getVerificationNumber')

      // Mock journal entry creation - Supabase returns the created row
      let jeCounter = 0
      cy.intercept('POST', '**/rest/v1/journal_entries?select=*', (req) => {
        jeCounter++
        req.reply({
          statusCode: 201,
          body: {
            id: `je-${jeCounter}`,
            ...req.body,
            status: 'draft',
            created_at: new Date().toISOString()
          }
        })
      }).as('createJournalEntry')

      // Mock journal entry lines creation
      cy.intercept('POST', '**/rest/v1/journal_entry_lines*', {
        statusCode: 201,
        body: []
      }).as('createJournalLines')

      // Mock journal entry status update (posting)
      cy.intercept('PATCH', '**/rest/v1/journal_entries*', {
        statusCode: 200,
        body: {}
      }).as('updateJournalEntry')

      // Navigate to dashboard first to clear any state, then back to SIE import
      cy.getByCy('sidebar-nav-dashboard').click()
      cy.get('[data-cy="sidebar-nav-import/sie"]').scrollIntoView().click()
      cy.getByCy('sie-drop-zone', { timeout: 10000 }).should('be.visible')

      uploadSIEFile(sieWithJournalEntries, 'test-vouchers.se')
      cy.getByCy('parse-file-button').click()
      cy.getByCy('proceed-to-preview-button').click()

      // Wait for preview step to be ready before making changes
      cy.getByCy('preview-step-ready', { timeout: 10000 }).should('exist')

      // Uncheck accounts since they already exist
      cy.getByCy('import-accounts-checkbox').uncheck()

      cy.getByCy('import-button').click()

      // Should show journal entries import result
      cy.getByCy('import-journal-entries-result', { timeout: 15000 }).should('be.visible')
    })
  })

  describe('US-123: Missing Fiscal Years Detection', () => {
    // SIE file with vouchers but fiscal year not in current organization
    const sieWithMissingFiscalYear = `#FLAGGA 0
#FORMAT PC8
#SIETYP 4
#PROGRAM "Test Program" 1.0
#GEN 20240101
#FNAMN "Test Organization"
#RAR 0 20230101 20231231
#KPTYP EUBAS97
#KONTO 1510 "Kundfordringar"
#KONTO 3010 "Försäljning"
#VER A 1 20230615 "Invoice"
{
#TRANS 1510 {} 1000.00 20230615 "Customer payment"
#TRANS 3010 {} -1000.00 20230615 "Sales"
}
`;

    beforeEach(() => {
      // Mock that no fiscal years exist in the organization - set up before navigation
      cy.intercept('GET', /\/rest\/v1\/fiscal_years/, (req) => {
        req.reply({
          statusCode: 200,
          body: []
        })
      }).as('getEmptyFiscalYears')
      
      cy.get('[data-cy="sidebar-nav-import/sie"]').click()
      // Wait for the SIE import page to load
      cy.getByCy('sie-import-page-title').should('be.visible')
      
      // Ensure organization is set in Redux before proceeding
      cy.window().its('store').invoke('getState').its('organizations.currentOrganization.id').should('exist')
    })

    // TODO: Flaky test - fiscal years intercept timing issue in full suite
    it.skip('is expected to show missing fiscal years warning and checkbox when importing journal entries', () => {
      // Explicitly intercept fiscal years to return empty for this specific test
      cy.intercept('GET', /\/rest\/v1\/fiscal_years/, {
        statusCode: 200,
        body: []
      }).as('getEmptyFiscalYearsForWarningTest')
      
      uploadSIEFile(sieWithMissingFiscalYear, 'test-missing-fy.se')
      cy.getByCy('parse-file-button').click()
      
      // Wait for validation to appear before proceeding
      cy.getByCy('proceed-to-preview-button').should('not.be.disabled').click()

      // Wait for the preview step to be fully ready (fiscal years check complete)
      // This is the key - we wait for the application to signal it's done checking
      cy.getByCy('preview-step-ready', { timeout: 15000 }).should('exist')

      // Now the warning should be visible with the checkbox
      cy.getByCy('missing-fiscal-years-warning').should('be.visible')
      cy.getByCy('create-missing-fiscal-years-checkbox').should('be.visible')
    })

    // TODO: Flaky test - fiscal years intercept timing issue in full suite
    it.skip('is expected to hide missing fiscal years warning when journal entries unchecked', () => {
      // Explicitly intercept fiscal years to return empty (override any previous intercepts)
      cy.intercept('GET', /\/rest\/v1\/fiscal_years/, {
        statusCode: 200,
        body: []
      }).as('getEmptyFiscalYearsForHideTest')
      
      uploadSIEFile(sieWithMissingFiscalYear, 'test-missing-fy.se')
      cy.getByCy('parse-file-button').click()
      
      // Wait for validation to complete before proceeding
      cy.getByCy('proceed-to-preview-button').should('not.be.disabled').click()

      // Wait for the preview step to be fully ready
      cy.getByCy('preview-step-ready', { timeout: 15000 }).should('exist')
      
      // Verify the warning is visible
      cy.getByCy('missing-fiscal-years-warning').should('be.visible')
      cy.getByCy('create-missing-fiscal-years-checkbox').should('be.visible')

      // Uncheck journal entries
      cy.getByCy('import-journal-entries-checkbox').uncheck()

      // Warning should disappear
      cy.getByCy('missing-fiscal-years-warning').should('not.exist')
    })

    it('is expected to create missing fiscal years when checkbox is checked', () => {
      // Track whether fiscal year has been created to return it in subsequent GET requests
      let fiscalYearCreated = false
      const createdFiscalYear = {
        id: 'fy-2023',
        name: '2023',
        start_date: '2023-01-01',
        end_date: '2023-12-31',
        organization_id: 'test-org-id'
      }

      cy.intercept('GET', '**/rest/v1/accounts?select=account_number*', {
        statusCode: 200,
        body: [{ account_number: '1510' }, { account_number: '3010' }]
      }).as('getExistingAccountNumbers')

      cy.intercept('GET', '**/rest/v1/accounts*', {
        statusCode: 200,
        body: [
          { id: 'acc-1510', account_number: '1510', name: 'Kundfordringar' },
          { id: 'acc-3010', account_number: '3010', name: 'Försäljning' }
        ]
      }).as('getAccounts')

      // Mock fiscal years POST for creation - set flag when created
      cy.intercept('POST', '**/rest/v1/fiscal_years*', (req) => {
        fiscalYearCreated = true
        req.reply({
          statusCode: 201,
          body: [{ ...createdFiscalYear, ...req.body }]
        })
      }).as('createFiscalYear')

      // Mock fiscal years GET - return created fiscal year after it's been created
      // This overrides the beforeEach empty array intercept
      cy.intercept('GET', '**/rest/v1/fiscal_years*', (req) => {
        req.reply({
          statusCode: 200,
          body: fiscalYearCreated ? [createdFiscalYear] : []
        })
      }).as('getFiscalYearsForImport')

      // Mock existing journal entries check (empty - no duplicates)
      cy.intercept('GET', '**/rest/v1/journal_entries?select=description*', {
        statusCode: 200,
        body: []
      }).as('getExistingJournalEntries')

      cy.intercept('POST', '**/rest/v1/journal_entries?select=*', (req) => {
        req.reply({
          statusCode: 201,
          body: { id: 'je-new', ...req.body, status: 'draft' }
        })
      }).as('createJournalEntry')

      cy.intercept('POST', '**/rest/v1/journal_entry_lines*', {
        statusCode: 201,
        body: []
      }).as('createJournalLines')

      cy.intercept('PATCH', '**/rest/v1/journal_entries*', {
        statusCode: 200,
        body: {}
      }).as('updateJournalEntry')

      cy.intercept('POST', '**/rest/v1/rpc/get_next_verification_number*', {
        statusCode: 200,
        body: 1
      }).as('getVerificationNumber')

      // Navigate to dashboard first to clear any state, then back to SIE import
      cy.getByCy('sidebar-nav-dashboard').click()
      cy.get('[data-cy="sidebar-nav-import/sie"]').scrollIntoView().click()
      cy.getByCy('sie-drop-zone', { timeout: 10000 }).should('be.visible')

      uploadSIEFile(sieWithMissingFiscalYear, 'test-missing-fy.se')
      cy.getByCy('parse-file-button').click()
      cy.getByCy('proceed-to-preview-button').click()

      // Wait for the preview step to be fully ready
      cy.getByCy('preview-step-ready', { timeout: 15000 }).should('exist')

      // Ensure create missing fiscal years is checked
      cy.getByCy('create-missing-fiscal-years-checkbox').check()

      // Uncheck accounts import (they exist)
      cy.getByCy('import-accounts-checkbox').uncheck()

      cy.getByCy('import-button').click()

      // Should create fiscal year first
      cy.wait('@createFiscalYear')

      // Should create journal entry (using the newly created fiscal year)
      cy.wait('@createJournalEntry')

      // Should show results without warnings about missing fiscal years
      cy.getByCy('import-fiscal-years-result').should('be.visible')
      cy.getByCy('import-journal-entries-result').should('be.visible')
      
      // Should NOT show the "no fiscal year found" warning
      cy.contains('No fiscal year found').should('not.exist')
    })
  })

  describe('US-123: Opening Balances Import', () => {
    const sieWithOpeningBalances = `#FLAGGA 0
#FORMAT PC8
#SIETYP 4
#PROGRAM "Test Program" 1.0
#GEN 20240101
#FNAMN "Test Organization"
#RAR 0 20240101 20241231
#KPTYP EUBAS97
#KONTO 1510 "Kundfordringar"
#KONTO 1930 "Företagskonto"
#IB 0 1510 100000.00
#IB 0 1930 50000.00
#UB 0 1510 150000.00
#UB 0 1930 75000.00
`;

    beforeEach(() => {
      cy.get('[data-cy="sidebar-nav-import/sie"]').click()
    })

    it('is expected to show import opening balances checkbox in preview', () => {
      uploadSIEFile(sieWithOpeningBalances, 'test-balances.se')
      cy.getByCy('parse-file-button').click()
      cy.getByCy('proceed-to-preview-button').click()

      cy.getByCy('import-opening-balances-checkbox').should('be.visible')
    })

    it('is expected to allow toggling opening balances import', () => {
      uploadSIEFile(sieWithOpeningBalances, 'test-balances.se')
      cy.getByCy('parse-file-button').click()
      cy.getByCy('proceed-to-preview-button').click()

      // Should be checked by default
      cy.getByCy('import-opening-balances-checkbox').should('be.checked')

      // Should be able to uncheck
      cy.getByCy('import-opening-balances-checkbox').uncheck()
      cy.getByCy('import-opening-balances-checkbox').should('not.be.checked')
    })
  })
})
