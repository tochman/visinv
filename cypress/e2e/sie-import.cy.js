/// <reference types="cypress" />

describe('SIE File Import (US-122)', () => {
  // Sample SIE4 file content
  const sampleSIE4 = `#FLAGGA 0
#FORMAT PC8
#SIETYP 4
#PROGRAM "Test Program" 1.0
#GEN 20240101
#FNAMN "Test Company AB"
#ORGNR 556123-4567
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

  // Sample SIE5 XML file content
  const sampleSIE5 = `<?xml version="1.0" encoding="utf-8"?>
<Sie xmlns="http://www.sie.se/sie5">
  <FileInfo>
    <SoftwareProduct name="Test Software" version="2.0" />
    <Company organizationId="556789-0123" name="XML Company AB" />
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
      cy.intercept('GET', '**/rest/v1/accounts*select=account_number*', {
        statusCode: 200,
        body: []
      }).as('getExistingAccounts')

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

      cy.wait('@importAccounts')
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
    it('is expected to skip accounts that already exist', () => {
      // Setup: existing account 1510
      cy.intercept('GET', '**/rest/v1/accounts*select=account_number*', {
        statusCode: 200,
        body: [{ account_number: '1510' }]
      }).as('getExistingAccounts')

      cy.intercept('POST', '**/rest/v1/accounts*', (req) => {
        // Should only receive 4 accounts (1510 skipped)
        expect(req.body.length).to.equal(4)
        req.reply({
          statusCode: 201,
          body: req.body.map((acc, i) => ({ id: `new-${i}`, ...acc }))
        })
      }).as('importAccounts')

      cy.visit('/import/sie')
      uploadSIEFile(sampleSIE4, 'test-accounts.se')
      cy.getByCy('parse-file-button').should('not.be.disabled').click()
      cy.getByCy('proceed-to-preview-button').click()
      cy.getByCy('import-button').click()

      cy.wait('@importAccounts')
      cy.getByCy('import-result').should('contain', '4 accounts imported')
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

      cy.getByCy('validation-status').should('contain', 'No accounts found')
    })
  })

  describe('Sad Path - Import Errors', () => {
    it('is expected to show error when import fails', () => {
      cy.intercept('GET', '**/rest/v1/accounts*select=account_number*', {
        statusCode: 200,
        body: []
      }).as('getExistingAccounts')

      cy.intercept('POST', '**/rest/v1/accounts*', {
        statusCode: 500,
        body: { message: 'Database error' }
      }).as('importAccountsFail')

      cy.visit('/import/sie')
      uploadSIEFile(sampleSIE4, 'test-accounts.se')
      cy.getByCy('parse-file-button').should('not.be.disabled').click()
      cy.getByCy('proceed-to-preview-button').click()
      cy.getByCy('import-button').click()

      cy.wait('@importAccountsFail')
      cy.getByCy('sie-import-error').should('be.visible')
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
      cy.intercept('POST', '**/rest/v1/accounts*', {
        statusCode: 201,
        body: []
      }).as('importAccounts')

      cy.getByCy('parse-file-button').should('not.be.disabled').click()
      cy.getByCy('proceed-to-preview-button').click()
      cy.getByCy('import-button').click()

      cy.wait('@importAccounts')
      cy.contains('button', 'Import Another File').click()
      cy.getByCy('sie-drop-zone').should('be.visible')
    })
  })
})
