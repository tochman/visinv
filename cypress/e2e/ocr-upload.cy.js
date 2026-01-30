/**
 * OCR Upload Tests - US-263
 * Supplier Invoice & Receipt OCR Upload
 */
describe('OCR Upload for Supplier Invoices', () => {
  const mockSuppliers = [
    {
      id: 'supplier-uuid-1',
      organization_id: 'test-org-id',
      name: 'Test Supplier AB',
      organization_number: '556789-1234',
      vat_number: 'SE556789123401',
      default_payment_terms_days: 30,
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    },
    {
      id: 'supplier-uuid-2',
      organization_id: 'test-org-id',
      name: 'Another Supplier Co',
      organization_number: '556123-4567',
      default_payment_terms_days: 15,
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    }
  ];

  const mockAccounts = [
    { id: 'acc-1', account_number: '4010', name: 'Office Supplies', account_name: 'Office Supplies', organization_id: 'test-org-id', account_type: 'expense', is_active: true },
    { id: 'acc-2', account_number: '5010', name: 'Rent', account_name: 'Rent', organization_id: 'test-org-id', account_type: 'expense', is_active: true },
    { id: 'acc-3', account_number: '5410', name: 'Consumables', account_name: 'Consumables', organization_id: 'test-org-id', account_type: 'expense', is_active: true },
    { id: 'acc-4', account_number: '6110', name: 'Office Supplies', account_name: 'Office Supplies', organization_id: 'test-org-id', account_type: 'expense', is_active: true },
  ];

  const mockFiscalYears = [
    { id: 'fy-1', organization_id: 'test-org-id', year: 2024, start_date: '2024-01-01', end_date: '2024-12-31', is_locked: false }
  ];

  const mockExtractedData = {
    success: true,
    data: {
      supplier: {
        name: 'Test Supplier AB',
        organization_number: '556789-1234',
        vat_number: 'SE556789123401',
        address: 'Testgatan 123',
        postal_code: '123 45',
        city: 'Stockholm',
      },
      invoice: {
        invoice_number: 'INV-2024-001',
        invoice_date: '2024-06-15',
        due_date: '2024-07-15',
        payment_reference: '1234567890',
        currency: 'SEK',
        description: 'Office supplies purchase'
      },
      line_items: [
        {
          description: 'Paper and pens',
          quantity: 10,
          unit_price: 100,
          amount: 1000,
          vat_rate: 25,
          vat_amount: 250,
          suggested_account: '4010',
          suggested_account_name: 'Office Supplies',
          category: 'office_supplies'
        }
      ],
      totals: {
        subtotal: 1000,
        vat_amount: 250,
        total_amount: 1250
      },
      confidence: {
        overall: 0.85,
        supplier_name: 0.95,
        invoice_number: 0.90,
        amounts: 0.80,
        notes: 'Good quality scan'
      },
      matched_supplier: {
        id: 'supplier-uuid-1',
        name: 'Test Supplier AB',
        match_type: 'organization_number',
        confidence: 1.0
      }
    },
    processing: {
      used_vision: true,
      file_type: 'image/jpeg'
    }
  };

  beforeEach(() => {
    cy.intercept('GET', '**/rest/v1/supplier_invoices*', {
      statusCode: 200,
      body: []
    }).as('getSupplierInvoices');

    cy.intercept('GET', '**/rest/v1/fiscal_years*', {
      statusCode: 200,
      body: mockFiscalYears
    }).as('getFiscalYears');

    cy.setupCommonIntercepts({ 
      clients: [],
      products: [],
      invoices: [],
      suppliers: mockSuppliers,
      accounts: mockAccounts
    });
    
    cy.login('admin');
  });

  describe('Happy Path - Success Scenarios', () => {
    it('is expected to display the upload invoice button on supplier invoices page', () => {
      cy.getByCy('sidebar-nav-supplier-invoices').click();
      cy.url().should('include', '/supplier-invoices');
      cy.getByCy('upload-invoice-button').should('be.visible');
      cy.getByCy('upload-invoice-button').should('contain.text', 'Upload');
    });

    it('is expected to open OCR upload modal when clicking upload button', () => {
      cy.visit('/supplier-invoices');
      cy.wait('@getSupplierInvoices');

      cy.getByCy('upload-invoice-button').click();
      cy.getByCy('ocr-upload-modal').should('be.visible');
      cy.getByCy('ocr-upload-dropzone').should('be.visible');
    });

    it('is expected to accept image file uploads via drag and drop', () => {
      cy.visit('/supplier-invoices');
      cy.wait('@getSupplierInvoices');

      cy.getByCy('upload-invoice-button').click();
      cy.getByCy('ocr-upload-modal').should('be.visible');

      // Create a test image file
      cy.fixture('test-invoice.jpg', 'base64').then((fileContent) => {
        cy.getByCy('ocr-upload-dropzone').selectFile(
          {
            contents: Cypress.Buffer.from(fileContent, 'base64'),
            fileName: 'test-invoice.jpg',
            mimeType: 'image/jpeg'
          },
          { action: 'drag-drop' }
        );
      });

      cy.getByCy('selected-file-name').should('contain.text', 'test-invoice.jpg');
      cy.getByCy('ocr-process-button').should('not.be.disabled');
    });

    it('is expected to accept file uploads via file input click', () => {
      cy.visit('/supplier-invoices');
      cy.wait('@getSupplierInvoices');

      cy.getByCy('upload-invoice-button').click();
      cy.getByCy('ocr-upload-modal').should('be.visible');

      // Upload via file input
      cy.fixture('test-invoice.jpg', 'base64').then((fileContent) => {
        cy.getByCy('ocr-upload-input').selectFile(
          {
            contents: Cypress.Buffer.from(fileContent, 'base64'),
            fileName: 'test-invoice.jpg',
            mimeType: 'image/jpeg'
          },
          { force: true }
        );
      });

      cy.getByCy('selected-file-name').should('be.visible');
    });

    it('is expected to show processing state when extracting invoice data', () => {
      // Intercept the edge function with a delay
      cy.intercept('POST', '**/functions/v1/extract-invoice-data', {
        delay: 1000,
        statusCode: 200,
        body: mockExtractedData
      }).as('extractInvoiceData');

      cy.visit('/supplier-invoices');
      cy.wait('@getSupplierInvoices');

      cy.getByCy('upload-invoice-button').click();
      cy.getByCy('ocr-upload-modal').should('be.visible');

      // Upload file
      cy.fixture('test-invoice.jpg', 'base64').then((fileContent) => {
        cy.getByCy('ocr-upload-input').selectFile(
          {
            contents: Cypress.Buffer.from(fileContent, 'base64'),
            fileName: 'test-invoice.jpg',
            mimeType: 'image/jpeg'
          },
          { force: true }
        );
      });

      cy.getByCy('ocr-process-button').click();
      cy.getByCy('ocr-processing-state').should('be.visible');
    });

    it('is expected to display extracted data in review state', () => {
      cy.intercept('POST', '**/functions/v1/extract-invoice-data', {
        statusCode: 200,
        body: mockExtractedData
      }).as('extractInvoiceData');

      cy.visit('/supplier-invoices');
      cy.wait('@getSupplierInvoices');

      cy.getByCy('upload-invoice-button').click();

      // Upload and process file
      cy.fixture('test-invoice.jpg', 'base64').then((fileContent) => {
        cy.getByCy('ocr-upload-input').selectFile(
          {
            contents: Cypress.Buffer.from(fileContent, 'base64'),
            fileName: 'test-invoice.jpg',
            mimeType: 'image/jpeg'
          },
          { force: true }
        );
      });

      cy.getByCy('ocr-process-button').click();
      cy.wait('@extractInvoiceData');

      // Should show review state with side-by-side view
      cy.getByCy('ocr-review-state').should('be.visible');
      cy.getByCy('extracted-data-form').should('be.visible');
      
      // Check extracted invoice data is displayed
      cy.getByCy('invoice-number-input').should('have.value', 'INV-2024-001');
      cy.getByCy('invoice-date-input').should('have.value', '2024-06-15');
      cy.getByCy('due-date-input').should('have.value', '2024-07-15');
    });

    it('is expected to show matched supplier when organization number matches', () => {
      cy.intercept('POST', '**/functions/v1/extract-invoice-data', {
        statusCode: 200,
        body: mockExtractedData
      }).as('extractInvoiceData');

      cy.visit('/supplier-invoices');
      cy.wait('@getSupplierInvoices');

      cy.getByCy('upload-invoice-button').click();

      cy.fixture('test-invoice.jpg', 'base64').then((fileContent) => {
        cy.getByCy('ocr-upload-input').selectFile(
          {
            contents: Cypress.Buffer.from(fileContent, 'base64'),
            fileName: 'test-invoice.jpg',
            mimeType: 'image/jpeg'
          },
          { force: true }
        );
      });

      cy.getByCy('ocr-process-button').click();
      cy.wait('@extractInvoiceData');

      // Should show matched supplier notice
      cy.getByCy('matched-supplier-notice').should('be.visible');
      cy.getByCy('matched-supplier-notice').should('contain.text', 'organization number');
    });

    it('is expected to allow editing extracted data before confirmation', () => {
      cy.intercept('POST', '**/functions/v1/extract-invoice-data', {
        statusCode: 200,
        body: mockExtractedData
      }).as('extractInvoiceData');

      cy.visit('/supplier-invoices');
      cy.wait('@getSupplierInvoices');

      cy.getByCy('upload-invoice-button').click();

      cy.fixture('test-invoice.jpg', 'base64').then((fileContent) => {
        cy.getByCy('ocr-upload-input').selectFile(
          {
            contents: Cypress.Buffer.from(fileContent, 'base64'),
            fileName: 'test-invoice.jpg',
            mimeType: 'image/jpeg'
          },
          { force: true }
        );
      });

      cy.getByCy('ocr-process-button').click();
      cy.wait('@extractInvoiceData');

      // Edit invoice number
      cy.getByCy('invoice-number-input').clear().type('EDITED-INV-001');
      cy.getByCy('invoice-number-input').should('have.value', 'EDITED-INV-001');

      // Edit description
      cy.getByCy('description-input').clear().type('Edited description');
      cy.getByCy('description-input').should('have.value', 'Edited description');
    });

    it('is expected to open supplier invoice modal with pre-filled data on confirm', () => {
      cy.intercept('POST', '**/functions/v1/extract-invoice-data', {
        statusCode: 200,
        body: mockExtractedData
      }).as('extractInvoiceData');

      cy.visit('/supplier-invoices');
      cy.wait('@getSupplierInvoices');

      cy.getByCy('upload-invoice-button').click();

      cy.fixture('test-invoice.jpg', 'base64').then((fileContent) => {
        cy.getByCy('ocr-upload-input').selectFile(
          {
            contents: Cypress.Buffer.from(fileContent, 'base64'),
            fileName: 'test-invoice.jpg',
            mimeType: 'image/jpeg'
          },
          { force: true }
        );
      });

      cy.getByCy('ocr-process-button').click();
      cy.wait('@extractInvoiceData');

      cy.getByCy('ocr-confirm-button').click();

      // OCR modal should close and supplier invoice modal should open
      cy.getByCy('ocr-upload-modal').should('not.exist');
      cy.getByCy('supplier-invoice-modal').should('be.visible');

      // Should have pre-filled data
      cy.getByCy('invoice-number-input').should('have.value', 'INV-2024-001');
    });

    it('is expected to display confidence indicators for extracted fields', () => {
      cy.intercept('POST', '**/functions/v1/extract-invoice-data', {
        statusCode: 200,
        body: mockExtractedData
      }).as('extractInvoiceData');

      cy.visit('/supplier-invoices');
      cy.wait('@getSupplierInvoices');

      cy.getByCy('upload-invoice-button').click();

      cy.fixture('test-invoice.jpg', 'base64').then((fileContent) => {
        cy.getByCy('ocr-upload-input').selectFile(
          {
            contents: Cypress.Buffer.from(fileContent, 'base64'),
            fileName: 'test-invoice.jpg',
            mimeType: 'image/jpeg'
          },
          { force: true }
        );
      });

      cy.getByCy('ocr-process-button').click();
      cy.wait('@extractInvoiceData');

      // Check confidence indicator is displayed
      cy.get('[data-cy="extracted-data-form"]').should('contain.text', '85%');
    });

    it('is expected to close OCR modal when clicking cancel', () => {
      cy.visit('/supplier-invoices');
      cy.wait('@getSupplierInvoices');

      cy.getByCy('upload-invoice-button').click();
      cy.getByCy('ocr-upload-modal').should('be.visible');

      cy.getByCy('ocr-cancel-button').click();
      cy.getByCy('ocr-upload-modal').should('not.exist');
    });

    it('is expected to close OCR modal when clicking X button', () => {
      cy.visit('/supplier-invoices');
      cy.wait('@getSupplierInvoices');

      cy.getByCy('upload-invoice-button').click();
      cy.getByCy('ocr-upload-modal').should('be.visible');

      cy.getByCy('ocr-close-button').click();
      cy.getByCy('ocr-upload-modal').should('not.exist');
    });

    it('is expected to remove selected file when clicking remove button', () => {
      cy.visit('/supplier-invoices');
      cy.wait('@getSupplierInvoices');

      cy.getByCy('upload-invoice-button').click();

      cy.fixture('test-invoice.jpg', 'base64').then((fileContent) => {
        cy.getByCy('ocr-upload-input').selectFile(
          {
            contents: Cypress.Buffer.from(fileContent, 'base64'),
            fileName: 'test-invoice.jpg',
            mimeType: 'image/jpeg'
          },
          { force: true }
        );
      });

      cy.getByCy('selected-file-name').should('be.visible');
      cy.getByCy('remove-file-button').click();
      cy.getByCy('selected-file-name').should('not.exist');
    });

    it('is expected to go back from review state to upload state', () => {
      cy.intercept('POST', '**/functions/v1/extract-invoice-data', {
        statusCode: 200,
        body: mockExtractedData
      }).as('extractInvoiceData');

      cy.visit('/supplier-invoices');
      cy.wait('@getSupplierInvoices');

      cy.getByCy('upload-invoice-button').click();

      cy.fixture('test-invoice.jpg', 'base64').then((fileContent) => {
        cy.getByCy('ocr-upload-input').selectFile(
          {
            contents: Cypress.Buffer.from(fileContent, 'base64'),
            fileName: 'test-invoice.jpg',
            mimeType: 'image/jpeg'
          },
          { force: true }
        );
      });

      cy.getByCy('ocr-process-button').click();
      cy.wait('@extractInvoiceData');

      cy.getByCy('ocr-review-state').should('be.visible');
      cy.getByCy('ocr-back-button').click();

      cy.getByCy('ocr-upload-dropzone').should('be.visible');
    });
  });

  describe('Sad Path - Error Scenarios', () => {
    it('is expected to show error for invalid file type', () => {
      cy.visit('/supplier-invoices');
      cy.wait('@getSupplierInvoices');

      cy.getByCy('upload-invoice-button').click();

      // Try to upload a text file
      cy.getByCy('ocr-upload-input').selectFile(
        {
          contents: 'This is a text file',
          fileName: 'document.txt',
          mimeType: 'text/plain'
        },
        { force: true }
      );

      // Should show error toast or message
      cy.get('.toast-error, [data-cy="toast-error"]').should('contain.text', 'Invalid file type');
    });

    it('is expected to show error when AI extraction fails', () => {
      cy.intercept('POST', '**/functions/v1/extract-invoice-data', {
        statusCode: 500,
        body: {
          error: 'AI service error',
          code: 'AI_SERVICE_ERROR'
        }
      }).as('extractInvoiceDataError');

      cy.visit('/supplier-invoices');
      cy.wait('@getSupplierInvoices');

      cy.getByCy('upload-invoice-button').click();

      cy.fixture('test-invoice.jpg', 'base64').then((fileContent) => {
        cy.getByCy('ocr-upload-input').selectFile(
          {
            contents: Cypress.Buffer.from(fileContent, 'base64'),
            fileName: 'test-invoice.jpg',
            mimeType: 'image/jpeg'
          },
          { force: true }
        );
      });

      cy.getByCy('ocr-process-button').click();
      cy.wait('@extractInvoiceDataError');

      // Should show error and return to upload state
      cy.get('.toast-error, [data-cy="toast-error"]').should('be.visible');
      cy.getByCy('ocr-upload-dropzone').should('be.visible');
    });

    it('is expected to show error when OpenAI API is not configured', () => {
      cy.intercept('POST', '**/functions/v1/extract-invoice-data', {
        statusCode: 500,
        body: {
          error: 'OpenAI API key not configured',
          code: 'OPENAI_NOT_CONFIGURED'
        }
      }).as('extractInvoiceDataNotConfigured');

      cy.visit('/supplier-invoices');
      cy.wait('@getSupplierInvoices');

      cy.getByCy('upload-invoice-button').click();

      cy.fixture('test-invoice.jpg', 'base64').then((fileContent) => {
        cy.getByCy('ocr-upload-input').selectFile(
          {
            contents: Cypress.Buffer.from(fileContent, 'base64'),
            fileName: 'test-invoice.jpg',
            mimeType: 'image/jpeg'
          },
          { force: true }
        );
      });

      cy.getByCy('ocr-process-button').click();
      cy.wait('@extractInvoiceDataNotConfigured');

      cy.get('.toast-error, [data-cy="toast-error"]').should('be.visible');
    });

    it('is expected to disable process button when no file is selected', () => {
      cy.visit('/supplier-invoices');
      cy.wait('@getSupplierInvoices');

      cy.getByCy('upload-invoice-button').click();
      cy.getByCy('ocr-upload-modal').should('be.visible');

      cy.getByCy('ocr-process-button').should('be.disabled');
    });

    it('is expected to handle low confidence extraction gracefully', () => {
      const lowConfidenceData = {
        ...mockExtractedData,
        data: {
          ...mockExtractedData.data,
          confidence: {
            overall: 0.35,
            supplier_name: 0.40,
            invoice_number: 0.30,
            amounts: 0.35,
            notes: 'Poor quality scan - please verify all fields'
          }
        }
      };

      cy.intercept('POST', '**/functions/v1/extract-invoice-data', {
        statusCode: 200,
        body: lowConfidenceData
      }).as('extractInvoiceDataLowConfidence');

      cy.visit('/supplier-invoices');
      cy.wait('@getSupplierInvoices');

      cy.getByCy('upload-invoice-button').click();

      cy.fixture('test-invoice.jpg', 'base64').then((fileContent) => {
        cy.getByCy('ocr-upload-input').selectFile(
          {
            contents: Cypress.Buffer.from(fileContent, 'base64'),
            fileName: 'test-invoice.jpg',
            mimeType: 'image/jpeg'
          },
          { force: true }
        );
      });

      cy.getByCy('ocr-process-button').click();
      cy.wait('@extractInvoiceDataLowConfidence');

      // Should still show data but with low confidence indicator
      cy.getByCy('extracted-data-form').should('contain.text', '35%');
    });

    it('is expected to show new supplier form when no match is found', () => {
      const noMatchData = {
        ...mockExtractedData,
        data: {
          ...mockExtractedData.data,
          matched_supplier: null
        }
      };

      cy.intercept('POST', '**/functions/v1/extract-invoice-data', {
        statusCode: 200,
        body: noMatchData
      }).as('extractInvoiceDataNoMatch');

      cy.visit('/supplier-invoices');
      cy.wait('@getSupplierInvoices');

      cy.getByCy('upload-invoice-button').click();

      cy.fixture('test-invoice.jpg', 'base64').then((fileContent) => {
        cy.getByCy('ocr-upload-input').selectFile(
          {
            contents: Cypress.Buffer.from(fileContent, 'base64'),
            fileName: 'test-invoice.jpg',
            mimeType: 'image/jpeg'
          },
          { force: true }
        );
      });

      cy.getByCy('ocr-process-button').click();
      cy.wait('@extractInvoiceDataNoMatch');

      // Should show the supplier form for new supplier creation
      cy.getByCy('supplier-select').should('have.value', 'new');
      cy.getByCy('supplier-name-input').should('be.visible');
    });
  });

  describe('Edge Cases', () => {
    it('is expected to handle PDF file uploads', () => {
      cy.intercept('POST', '**/functions/v1/extract-invoice-data', {
        statusCode: 200,
        body: mockExtractedData
      }).as('extractInvoiceData');

      cy.visit('/supplier-invoices');
      cy.wait('@getSupplierInvoices');

      cy.getByCy('upload-invoice-button').click();

      // Upload PDF file
      cy.fixture('test-invoice.pdf', 'base64').then((fileContent) => {
        cy.getByCy('ocr-upload-input').selectFile(
          {
            contents: Cypress.Buffer.from(fileContent, 'base64'),
            fileName: 'test-invoice.pdf',
            mimeType: 'application/pdf'
          },
          { force: true }
        );
      });

      cy.getByCy('selected-file-name').should('contain.text', 'test-invoice.pdf');
    });

    it('is expected to handle PNG file uploads', () => {
      cy.visit('/supplier-invoices');
      cy.wait('@getSupplierInvoices');

      cy.getByCy('upload-invoice-button').click();

      cy.fixture('test-invoice.png', 'base64').then((fileContent) => {
        cy.getByCy('ocr-upload-input').selectFile(
          {
            contents: Cypress.Buffer.from(fileContent, 'base64'),
            fileName: 'test-invoice.png',
            mimeType: 'image/png'
          },
          { force: true }
        );
      });

      cy.getByCy('selected-file-name').should('contain.text', 'test-invoice.png');
    });

    it('is expected to add and remove line items in extracted data', () => {
      cy.intercept('POST', '**/functions/v1/extract-invoice-data', {
        statusCode: 200,
        body: mockExtractedData
      }).as('extractInvoiceData');

      cy.visit('/supplier-invoices');
      cy.wait('@getSupplierInvoices');

      cy.getByCy('upload-invoice-button').click();

      cy.fixture('test-invoice.jpg', 'base64').then((fileContent) => {
        cy.getByCy('ocr-upload-input').selectFile(
          {
            contents: Cypress.Buffer.from(fileContent, 'base64'),
            fileName: 'test-invoice.jpg',
            mimeType: 'image/jpeg'
          },
          { force: true }
        );
      });

      cy.getByCy('ocr-process-button').click();
      cy.wait('@extractInvoiceData');

      // Add a new line item
      cy.getByCy('add-line-item-button').click();
      cy.getByCy('line-item-1').should('be.visible');

      // Remove the added line item
      cy.getByCy('remove-line-1').click();
      cy.getByCy('line-item-1').should('not.exist');
    });

    it('is expected to recalculate totals when line items are edited', () => {
      cy.intercept('POST', '**/functions/v1/extract-invoice-data', {
        statusCode: 200,
        body: mockExtractedData
      }).as('extractInvoiceData');

      cy.visit('/supplier-invoices');
      cy.wait('@getSupplierInvoices');

      cy.getByCy('upload-invoice-button').click();

      cy.fixture('test-invoice.jpg', 'base64').then((fileContent) => {
        cy.getByCy('ocr-upload-input').selectFile(
          {
            contents: Cypress.Buffer.from(fileContent, 'base64'),
            fileName: 'test-invoice.jpg',
            mimeType: 'image/jpeg'
          },
          { force: true }
        );
      });

      cy.getByCy('ocr-process-button').click();
      cy.wait('@extractInvoiceData');

      // Original total should be 1250
      cy.getByCy('total-amount').should('contain.text', '1250');

      // Edit quantity to 20 (should double the amount)
      cy.getByCy('line-quantity-0').clear().type('20');

      // Total should update to 2500
      cy.getByCy('total-amount').should('contain.text', '2500');
    });
  });
});
