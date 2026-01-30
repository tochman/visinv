/// <reference types="cypress" />

/**
 * E2E Tests for OCR Supplier Invoice Upload (US-263)
 * 
 * Wizard Flow: Upload → Processing → Review → Supplier → Kontering → Create Invoice
 */

describe('OCR Upload for Supplier Invoices', () => {
  // Mock data
  const mockSuppliers = [
    {
      id: 'supplier-1',
      name: 'Telia Company AB',
      organization_number: '556103-4249',
      email: 'faktura@telia.se',
      organization_id: 'test-org-id'
    },
    {
      id: 'supplier-2',
      name: 'Tele2 Sverige AB',
      organization_number: '556267-5164',
      email: 'invoice@tele2.se',
      organization_id: 'test-org-id'
    }
  ];

  const mockAccounts = [
    { id: 'account-1', account_number: '4010', name: 'Inköp av varor', organization_id: 'test-org-id' },
    { id: 'account-2', account_number: '6211', name: 'Telefon', organization_id: 'test-org-id' },
    { id: 'account-3', account_number: '6212', name: 'Mobiltelefon', organization_id: 'test-org-id' },
    { id: 'account-4', account_number: '6230', name: 'Datakommunikation', organization_id: 'test-org-id' }
  ];

  const mockExtractedData = {
    supplier: {
      name: 'Telia Company AB',
      organization_number: '556103-4249',
      vat_number: 'SE556103424901',
      address: 'Stjärntorget 1',
      postal_code: '169 79',
      city: 'Solna'
    },
    invoice: {
      invoice_number: 'INV-2024-001',
      invoice_date: '2024-01-15',
      due_date: '2024-02-15',
      currency: 'SEK',
      description: 'Telefoniabonnemang',
      payment_reference: '12345678901234'
    },
    line_items: [
      {
        description: 'Abonnemang Mobil Pro',
        quantity: 1,
        unit_price: 399,
        amount: 399,
        vat_rate: 25,
        vat_amount: 99.75
      },
      {
        description: 'Datatillägg 10GB',
        quantity: 1,
        unit_price: 149,
        amount: 149,
        vat_rate: 25,
        vat_amount: 37.25
      }
    ],
    totals: {
      subtotal: 548,
      vat: 137,
      total: 685
    },
    matchedSupplier: {
      id: 'supplier-1',
      name: 'Telia Company AB',
      match_type: 'organization_number',
      confidence: 0.95
    }
  };

  beforeEach(() => {
    cy.setupCommonIntercepts({
      suppliers: mockSuppliers,
      accounts: mockAccounts
    });
    cy.login('premiumUser');
  });

  describe('Happy Path - Complete Wizard Flow', () => {
    beforeEach(() => {
      // Mock the OCR extraction endpoint
      cy.intercept('POST', '**/functions/v1/extract-invoice-data', {
        statusCode: 200,
        body: mockExtractedData
      }).as('extractInvoice');

      // Mock supplier invoice creation
      cy.intercept('POST', '**/rest/v1/supplier_invoices*', {
        statusCode: 201,
        body: { id: 'new-invoice-id', ...mockExtractedData.invoice }
      }).as('createSupplierInvoice');

      // Mock supplier invoice lines creation
      cy.intercept('POST', '**/rest/v1/supplier_invoice_lines*', {
        statusCode: 201,
        body: []
      }).as('createSupplierInvoiceLines');
    });

    it('is expected to complete full wizard flow: upload → review → supplier → kontering → create invoice', () => {
      // Navigate to supplier invoices page
      cy.get('[data-cy="nav-supplier-invoices"]').click();
      cy.get('[data-cy="ocr-upload-button"]').click();

      // Step 1: Upload
      cy.get('[data-cy="ocr-upload-modal"]').should('be.visible');
      cy.get('[data-cy="ocr-upload-dropzone"]').should('be.visible');
      
      // Upload a file
      const testFile = new File(['dummy pdf content'], 'test-invoice.pdf', { type: 'application/pdf' });
      cy.get('[data-cy="ocr-upload-input"]').selectFile({ contents: testFile, fileName: 'test-invoice.pdf' }, { force: true });

      cy.get('[data-cy="selected-file-name"]').should('contain', 'test-invoice.pdf');
      cy.get('[data-cy="ocr-process-button"]').click();

      // Step 2: Processing (brief state)
      cy.get('[data-cy="ocr-processing-state"]').should('be.visible');
      cy.wait('@extractInvoice');

      // Step 3: Review - verify extracted data is displayed
      cy.get('[data-cy="ocr-review-state"]').should('be.visible');
      cy.get('[data-cy="extracted-data-form"]').should('be.visible');
      cy.get('input[name="invoice_number"]').should('have.value', 'INV-2024-001');
      cy.get('input[name="invoice_date"]').should('have.value', '2024-01-15');
      
      // Proceed to supplier step
      cy.get('[data-cy="ocr-next-button"]').click();

      // Step 4: Supplier selection - verify fuzzy match
      cy.get('[data-cy="ocr-supplier-state"]').should('be.visible');
      cy.get('[data-cy="supplier-option-supplier-1"]').should('be.visible');
      cy.get('[data-cy="supplier-option-supplier-1"]').should('contain', 'Telia Company AB');
      
      // Select the matched supplier
      cy.get('[data-cy="supplier-option-supplier-1"]').click();
      cy.get('[data-cy="ocr-next-button"]').click();

      // Step 5: Kontering - assign accounts
      cy.get('[data-cy="ocr-kontering-state"]').should('be.visible');
      
      // Use "set all accounts" feature
      cy.get('[data-cy="set-all-accounts-select"]').select('account-2');
      
      // Verify accounts were set for all lines
      cy.get('[data-cy="kontering-account-0"]').should('have.value', 'account-2');
      cy.get('[data-cy="kontering-account-1"]').should('have.value', 'account-2');
      
      // Change one line to a different account
      cy.get('[data-cy="kontering-account-1"]').select('account-4');

      // Confirm and create invoice
      cy.get('[data-cy="ocr-confirm-button"]').click();

      // Verify API calls
      cy.wait('@createSupplierInvoice').its('request.body').should((body) => {
        expect(body.invoice_number).to.eq('INV-2024-001');
        expect(body.supplier_id).to.eq('supplier-1');
      });

      // Modal should close
      cy.get('[data-cy="ocr-upload-modal"]').should('not.exist');
    });

    it('is expected to allow navigation back through wizard steps', () => {
      cy.get('[data-cy="nav-supplier-invoices"]').click();
      cy.get('[data-cy="ocr-upload-button"]').click();

      // Upload file and process
      const testFile = new File(['dummy pdf content'], 'test-invoice.pdf', { type: 'application/pdf' });
      cy.get('[data-cy="ocr-upload-input"]').selectFile({ contents: testFile, fileName: 'test-invoice.pdf' }, { force: true });
      cy.get('[data-cy="ocr-process-button"]').click();
      cy.wait('@extractInvoice');

      // Navigate forward to kontering
      cy.get('[data-cy="ocr-next-button"]').click();
      cy.get('[data-cy="ocr-supplier-state"]').should('be.visible');
      cy.get('[data-cy="supplier-option-supplier-1"]').click();
      cy.get('[data-cy="ocr-next-button"]').click();
      cy.get('[data-cy="ocr-kontering-state"]').should('be.visible');

      // Navigate back to supplier
      cy.get('[data-cy="ocr-back-button"]').click();
      cy.get('[data-cy="ocr-supplier-state"]').should('be.visible');

      // Navigate back to review
      cy.get('[data-cy="ocr-back-button"]').click();
      cy.get('[data-cy="ocr-review-state"]').should('be.visible');
    });

    it('is expected to create new supplier when none exists', () => {
      const extractedDataWithUnknownSupplier = {
        ...mockExtractedData,
        supplier: {
          name: 'Nytt Företag AB',
          organization_number: '559999-9999',
          address: 'Ny Gatan 1',
          city: 'Stockholm'
        },
        matchedSupplier: null
      };

      // Override extraction mock for this test
      cy.intercept('POST', '**/functions/v1/extract-invoice-data', {
        statusCode: 200,
        body: extractedDataWithUnknownSupplier
      }).as('extractInvoice');

      // Mock supplier creation
      cy.intercept('POST', '**/rest/v1/suppliers*', {
        statusCode: 201,
        body: { id: 'new-supplier-id', name: 'Nytt Företag AB' }
      }).as('createSupplier');

      cy.get('[data-cy="nav-supplier-invoices"]').click();
      cy.get('[data-cy="ocr-upload-button"]').click();

      const testFile = new File(['dummy pdf content'], 'test-invoice.pdf', { type: 'application/pdf' });
      cy.get('[data-cy="ocr-upload-input"]').selectFile({ contents: testFile, fileName: 'test-invoice.pdf' }, { force: true });
      cy.get('[data-cy="ocr-process-button"]').click();
      cy.wait('@extractInvoice');

      // Proceed to supplier step
      cy.get('[data-cy="ocr-next-button"]').click();

      // Select "Create new supplier" option
      cy.get('[data-cy="create-new-supplier-option"]').click();
      cy.get('[data-cy="ocr-next-button"]').click();

      // Complete kontering
      cy.get('[data-cy="set-all-accounts-select"]').select('account-1');
      cy.get('[data-cy="ocr-confirm-button"]').click();

      // Verify supplier was created
      cy.wait('@createSupplier').its('request.body').should((body) => {
        expect(body.name).to.eq('Nytt Företag AB');
        expect(body.organization_number).to.eq('559999-9999');
      });

      cy.wait('@createSupplierInvoice');
    });

    it('is expected to allow editing extracted data and search suppliers', () => {
      cy.get('[data-cy="nav-supplier-invoices"]').click();
      cy.get('[data-cy="ocr-upload-button"]').click();

      const testFile = new File(['dummy pdf content'], 'test-invoice.pdf', { type: 'application/pdf' });
      cy.get('[data-cy="ocr-upload-input"]').selectFile({ contents: testFile, fileName: 'test-invoice.pdf' }, { force: true });
      cy.get('[data-cy="ocr-process-button"]').click();
      cy.wait('@extractInvoice');

      // Edit invoice number
      cy.get('input[name="invoice_number"]').clear().type('EDITED-001');
      
      // Edit invoice date
      cy.get('input[name="invoice_date"]').clear().type('2024-06-01');

      // Continue to supplier step
      cy.get('[data-cy="ocr-next-button"]').click();
      
      // Search for Tele2 to test filtering
      cy.get('[data-cy="supplier-search-input"]').clear().type('Tele2');
      cy.get('[data-cy="supplier-option-supplier-2"]').should('be.visible');
      cy.get('[data-cy="supplier-option-supplier-1"]').should('not.exist');
      
      // Select Tele2
      cy.get('[data-cy="supplier-option-supplier-2"]').click();
      cy.get('[data-cy="ocr-next-button"]').click();
      
      cy.get('[data-cy="set-all-accounts-select"]').select('account-1');
      cy.get('[data-cy="ocr-confirm-button"]').click();

      // Verify edited data was sent
      cy.wait('@createSupplierInvoice').its('request.body').should((body) => {
        expect(body.invoice_number).to.eq('EDITED-001');
        expect(body.invoice_date).to.eq('2024-06-01');
        expect(body.supplier_id).to.eq('supplier-2');
      });
    });

    it('is expected to expand document preview in review step', () => {
      cy.get('[data-cy="nav-supplier-invoices"]').click();
      cy.get('[data-cy="ocr-upload-button"]').click();

      const testFile = new File(['dummy pdf content'], 'test-invoice.pdf', { type: 'application/pdf' });
      cy.get('[data-cy="ocr-upload-input"]').selectFile({ contents: testFile, fileName: 'test-invoice.pdf' }, { force: true });
      cy.get('[data-cy="ocr-process-button"]').click();
      cy.wait('@extractInvoice');

      // Expand preview
      cy.get('[data-cy="expand-preview-button"]').click();
      cy.get('[data-cy="expanded-preview-modal"]').should('be.visible');

      // Close expanded preview
      cy.get('[data-cy="close-expanded-preview"]').click();
      cy.get('[data-cy="expanded-preview-modal"]').should('not.exist');
    });
  });

  describe('Sad Path - Error Handling', () => {
    it('is expected to show error when OCR extraction fails', () => {
      cy.intercept('POST', '**/functions/v1/extract-invoice-data', {
        statusCode: 500,
        body: { error: 'AI service unavailable' }
      }).as('extractInvoiceFail');

      cy.get('[data-cy="nav-supplier-invoices"]').click();
      cy.get('[data-cy="ocr-upload-button"]').click();

      const testFile = new File(['dummy pdf content'], 'test-invoice.pdf', { type: 'application/pdf' });
      cy.get('[data-cy="ocr-upload-input"]').selectFile({ contents: testFile, fileName: 'test-invoice.pdf' }, { force: true });
      cy.get('[data-cy="ocr-process-button"]').click();

      cy.wait('@extractInvoiceFail');
      
      // Should return to upload step and show error toast
      cy.get('[data-cy="ocr-upload-dropzone"]').should('be.visible');
      cy.contains('Failed to process').should('be.visible');
    });

    it('is expected to require supplier selection before proceeding', () => {
      cy.intercept('POST', '**/functions/v1/extract-invoice-data', {
        statusCode: 200,
        body: { ...mockExtractedData, matchedSupplier: null }
      }).as('extractInvoice');

      cy.get('[data-cy="nav-supplier-invoices"]').click();
      cy.get('[data-cy="ocr-upload-button"]').click();

      const testFile = new File(['dummy pdf content'], 'test-invoice.pdf', { type: 'application/pdf' });
      cy.get('[data-cy="ocr-upload-input"]').selectFile({ contents: testFile, fileName: 'test-invoice.pdf' }, { force: true });
      cy.get('[data-cy="ocr-process-button"]').click();
      cy.wait('@extractInvoice');

      // Go to supplier step without selecting
      cy.get('[data-cy="ocr-next-button"]').click();
      cy.get('[data-cy="ocr-supplier-state"]').should('be.visible');

      // Try to proceed without selecting supplier
      cy.get('[data-cy="ocr-next-button"]').click();
      
      // Should show error and stay on supplier step
      cy.contains('supplier').should('be.visible');
      cy.get('[data-cy="ocr-supplier-state"]').should('be.visible');
    });

    it('is expected to require at least one line with account before creating invoice', () => {
      cy.intercept('POST', '**/functions/v1/extract-invoice-data', {
        statusCode: 200,
        body: mockExtractedData
      }).as('extractInvoice');

      cy.get('[data-cy="nav-supplier-invoices"]').click();
      cy.get('[data-cy="ocr-upload-button"]').click();

      const testFile = new File(['dummy pdf content'], 'test-invoice.pdf', { type: 'application/pdf' });
      cy.get('[data-cy="ocr-upload-input"]').selectFile({ contents: testFile, fileName: 'test-invoice.pdf' }, { force: true });
      cy.get('[data-cy="ocr-process-button"]').click();
      cy.wait('@extractInvoice');

      // Navigate through to kontering without setting accounts
      cy.get('[data-cy="ocr-next-button"]').click();
      cy.get('[data-cy="supplier-option-supplier-1"]').click();
      cy.get('[data-cy="ocr-next-button"]').click();

      // Try to confirm without setting any accounts
      cy.get('[data-cy="ocr-confirm-button"]').click();

      // Should show error and stay on kontering step
      cy.contains('least one line').should('be.visible');
      cy.get('[data-cy="ocr-kontering-state"]').should('be.visible');
    });

    it('is expected to show error when invoice creation fails with duplicate', () => {
      cy.intercept('POST', '**/functions/v1/extract-invoice-data', {
        statusCode: 200,
        body: mockExtractedData
      }).as('extractInvoice');

      cy.intercept('POST', '**/rest/v1/supplier_invoices*', {
        statusCode: 409,
        body: { message: 'unique_supplier_invoice_number' }
      }).as('createSupplierInvoiceFail');

      cy.get('[data-cy="nav-supplier-invoices"]').click();
      cy.get('[data-cy="ocr-upload-button"]').click();

      const testFile = new File(['dummy pdf content'], 'test-invoice.pdf', { type: 'application/pdf' });
      cy.get('[data-cy="ocr-upload-input"]').selectFile({ contents: testFile, fileName: 'test-invoice.pdf' }, { force: true });
      cy.get('[data-cy="ocr-process-button"]').click();
      cy.wait('@extractInvoice');

      cy.get('[data-cy="ocr-next-button"]').click();
      cy.get('[data-cy="supplier-option-supplier-1"]').click();
      cy.get('[data-cy="ocr-next-button"]').click();
      cy.get('[data-cy="set-all-accounts-select"]').select('account-1');
      cy.get('[data-cy="ocr-confirm-button"]').click();

      cy.wait('@createSupplierInvoiceFail');
      
      // Should show duplicate invoice error
      cy.contains('duplicate').should('be.visible');
    });
  });

  describe('Edge Cases', () => {
    it('is expected to close modal and reset state on reopen', () => {
      cy.intercept('POST', '**/functions/v1/extract-invoice-data', {
        statusCode: 200,
        body: mockExtractedData
      }).as('extractInvoice');

      cy.get('[data-cy="nav-supplier-invoices"]').click();
      cy.get('[data-cy="ocr-upload-button"]').click();

      const testFile = new File(['dummy pdf content'], 'test-invoice.pdf', { type: 'application/pdf' });
      cy.get('[data-cy="ocr-upload-input"]').selectFile({ contents: testFile, fileName: 'test-invoice.pdf' }, { force: true });
      cy.get('[data-cy="ocr-process-button"]').click();
      cy.wait('@extractInvoice');

      // Close modal
      cy.get('[data-cy="ocr-close-button"]').click();
      cy.get('[data-cy="ocr-upload-modal"]').should('not.exist');

      // Reopen - should be reset to upload step
      cy.get('[data-cy="ocr-upload-button"]').click();
      cy.get('[data-cy="ocr-upload-dropzone"]').should('be.visible');
      cy.get('[data-cy="selected-file-name"]').should('not.exist');
    });

    it('is expected to remove selected file and handle different file types', () => {
      cy.intercept('POST', '**/functions/v1/extract-invoice-data', {
        statusCode: 200,
        body: mockExtractedData
      }).as('extractInvoice');

      cy.get('[data-cy="nav-supplier-invoices"]').click();
      cy.get('[data-cy="ocr-upload-button"]').click();

      // Upload PDF
      const pdfFile = new File(['dummy pdf content'], 'test-invoice.pdf', { type: 'application/pdf' });
      cy.get('[data-cy="ocr-upload-input"]').selectFile({ contents: pdfFile, fileName: 'test-invoice.pdf' }, { force: true });

      cy.get('[data-cy="selected-file-name"]').should('contain', 'test-invoice.pdf');
      
      // Remove file
      cy.get('[data-cy="remove-file-button"]').click();
      cy.get('[data-cy="selected-file-name"]').should('not.exist');
      cy.get('[data-cy="ocr-process-button"]').should('be.disabled');
      
      // Upload PNG instead
      const pngFile = new File(['dummy png content'], 'invoice.png', { type: 'image/png' });
      cy.get('[data-cy="ocr-upload-input"]').selectFile({ contents: pngFile, fileName: 'invoice.png' }, { force: true });

      cy.get('[data-cy="selected-file-name"]').should('contain', 'invoice.png');
      cy.get('[data-cy="ocr-process-button"]').should('not.be.disabled');
    });

    it('is expected to handle empty line items gracefully', () => {
      const dataWithEmptyLines = {
        ...mockExtractedData,
        line_items: []
      };

      cy.intercept('POST', '**/functions/v1/extract-invoice-data', {
        statusCode: 200,
        body: dataWithEmptyLines
      }).as('extractInvoice');

      cy.get('[data-cy="nav-supplier-invoices"]').click();
      cy.get('[data-cy="ocr-upload-button"]').click();

      const testFile = new File(['dummy pdf content'], 'test-invoice.pdf', { type: 'application/pdf' });
      cy.get('[data-cy="ocr-upload-input"]').selectFile({ contents: testFile, fileName: 'test-invoice.pdf' }, { force: true });
      cy.get('[data-cy="ocr-process-button"]').click();
      cy.wait('@extractInvoice');

      // Should still show review step
      cy.get('[data-cy="ocr-review-state"]').should('be.visible');
      
      // User can add lines manually
      cy.get('[data-cy="add-line-item-button"]').should('be.visible');
    });
  });
});
