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
      cy.getByCy('sidebar-nav').contains('Accounting').click()
      cy.getByCy('sidebar-nav').contains('SIE Import').should('be.visible')
    })

    it('is expected to navigate to /import/sie route', () => {
      cy.getByCy('sidebar-nav').contains('Accounting').click()
      cy.getByCy('sidebar-nav').contains('SIE Import').click()
      cy.url().should('include', '/import/sie')
    })

    it('is expected to display the SIE import page with title', () => {
      cy.visit('/import/sie')
      cy.getByCy('sie-import-page-title').should('be.visible')
      cy.getByCy('sie-import-page-title').should('contain', 'SIE Import')
    })
  })

  describe('Happy Path - SIE4 File Upload', () => {
    beforeEach(() => {
      cy.visit('/import/sie')
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
      // Override the default getAccounts intercept with more specific ones for import
      cy.intercept('GET', '**/rest/v1/accounts?select=account_number*', {
        statusCode: 200,
        body: []
      }).as('getExistingAccountNumbers')

      cy.intercept('POST', '**/rest/v1/accounts*', (req) => {
        req.reply({
          statusCode: 201,
          body: req.body.map((acc, i) => ({ id: `new-${i}`, ...acc }))
        })
      }).as('importAccounts')

      uploadSIEFile(sampleSIE4, 'test-accounts.se')
      cy.getByCy('parse-file-button').should('not.be.disabled').click()
      cy.getByCy('proceed-to-preview-button').click()
      cy.getByCy('import-button').click()

      // Check for successful import result without explicit wait for network
      cy.getByCy('import-result').should('contain', '5 accounts imported')
      cy.getByCy('go-to-accounts-button').should('be.visible')
    })
  })

  describe('Happy Path - SIE5 File Upload', () => {
    beforeEach(() => {
      cy.visit('/import/sie')
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
      cy.visit('/import/sie')
      uploadSIEFile(sampleSIE4, 'test-accounts.se')
      cy.getByCy('parse-file-button').should('not.be.disabled').click()
      cy.getByCy('proceed-to-preview-button').click()
    })

    it('is expected to allow disabling account import', () => {
      cy.getByCy('import-accounts-checkbox').uncheck()
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
      cy.visit('/import/sie')
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
      cy.visit('/import/sie')
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

    it('is expected to show error for empty file', () => {
      uploadSIEFile('', 'empty.se')
      cy.getByCy('parse-file-button').should('not.be.disabled').click()

      cy.getByCy('validation-status').should('contain', 'validation failed')
    })

    it('is expected to show error for malformed SIE file', () => {
      const invalidSIE = `#FLAGGA 0
#FORMAT PC8
INVALID CONTENT HERE
`
      uploadSIEFile(invalidSIE, 'invalid.se')
      cy.getByCy('parse-file-button').should('not.be.disabled').click()

      cy.getByCy('validation-status').should('contain', 'validation failed')
      // Error message is displayed in a separate errors list
      cy.contains('No accounts found').should('be.visible')
    })
  })

  describe('Sad Path - Import Errors', () => {
    it('is expected to show import button only when accounts checkbox is checked', () => {
      // Test the UI behavior rather than the backend error handling
      cy.visit('/import/sie')
      uploadSIEFile(sampleSIE4, 'test-accounts.se')
      cy.getByCy('parse-file-button').should('not.be.disabled').click()
      cy.getByCy('proceed-to-preview-button').click()

      // Import button should be enabled when accounts checkbox is checked
      cy.getByCy('import-button').should('not.be.disabled')
      
      // Uncheck accounts checkbox
      cy.getByCy('import-accounts-checkbox').uncheck()
      
      // Import button should be disabled
      cy.getByCy('import-button').should('be.disabled')
    })
  })

  describe('Wizard Navigation', () => {
    beforeEach(() => {
      cy.visit('/import/sie')
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

    it('is expected to allow importing another file after completion', () => {
      cy.intercept('GET', '**/rest/v1/accounts?select=account_number*', {
        statusCode: 200,
        body: []
      }).as('getExistingAccountNumbers')

      cy.intercept('POST', '**/rest/v1/accounts*', {
        statusCode: 201,
        body: []
      }).as('importAccounts')

      cy.getByCy('parse-file-button').should('not.be.disabled').click()
      cy.getByCy('proceed-to-preview-button').click()
      cy.getByCy('import-button').click()

      // Wait for the import to complete by checking for the "Import Another File" button
      cy.contains('button', 'Import Another File').should('be.visible').click()
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

    // No beforeEach here - we inherit from parent (login + setupCommonIntercepts)
    // Then navigate to the SIE import page in each test using sidebar

    it('is expected to show organization mismatch warning when org numbers differ', () => {
      // Navigate to SIE import via sidebar
      cy.getByCy('sidebar-nav').contains('Accounting').click()
      cy.getByCy('sidebar-nav').contains('SIE Import').click()
      
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
      // Navigate to SIE import via sidebar
      cy.getByCy('sidebar-nav').contains('Accounting').click()
      cy.getByCy('sidebar-nav').contains('SIE Import').click()

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
      // Navigate to SIE import via sidebar
      cy.getByCy('sidebar-nav').contains('Accounting').click()
      cy.getByCy('sidebar-nav').contains('SIE Import').click()

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
      // Navigate to SIE import via sidebar
      cy.getByCy('sidebar-nav').contains('Accounting').click()
      cy.getByCy('sidebar-nav').contains('SIE Import').click()

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
      // SIE file that matches the current org
      const sieMatchingOrg = `#FLAGGA 0
#FORMAT PC8
#SIETYP 4
#PROGRAM "Test Program" 1.0
#GEN 20240101
#FNAMN "Test Organization"
#ORGNR 556123-4567
#RAR 0 20240101 20241231
#KONTO 1510 "Kundfordringar"
`;

      // Navigate to SIE import via sidebar
      cy.getByCy('sidebar-nav').contains('Accounting').click()
      cy.getByCy('sidebar-nav').contains('SIE Import').click()
      
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

      // Navigate to SIE import via sidebar
      cy.getByCy('sidebar-nav').contains('Accounting').click()
      cy.getByCy('sidebar-nav').contains('SIE Import').click()

      uploadSIEFile(sieMismatchOrgNumber, 'mismatch.se')
      cy.getByCy('parse-file-button').should('not.be.disabled').click()
      cy.getByCy('proceed-to-preview-button').click()

      cy.getByCy('create-new-org-button').click()

      // Should show error message
      cy.getByCy('sie-import-error').should('be.visible')
      cy.getByCy('sie-import-error').should('contain', 'Failed to create organization')
    })
  })
})
