/// <reference types="cypress" />

/**
 * US-264c: Supplier Invoice Inbox UI E2E Tests
 * Tests for viewing, filtering, and managing supplier invoice inbox items
 */

describe('Supplier Invoice Inbox', () => {
  const mockInboxItems = [
    {
      id: 'inbox-item-1',
      organization_id: 'test-org-id',
      sender_email: 'supplier@example.com',
      from_name: 'Test Supplier',
      subject: 'Invoice #1234',
      received_at: new Date().toISOString(),
      file_name: 'invoice_1234.pdf',
      storage_path: 'test-org-id/abc123-invoice_1234.pdf',
      file_size: 125000,
      content_type: 'application/pdf',
      status: 'new',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'inbox-item-2',
      organization_id: 'test-org-id',
      sender_email: 'another@supplier.com',
      from_name: null,
      subject: 'February invoice',
      received_at: new Date(Date.now() - 86400000).toISOString(),
      file_name: 'feb_invoice.pdf',
      storage_path: 'test-org-id/def456-feb_invoice.pdf',
      file_size: 98000,
      content_type: 'application/pdf',
      status: 'processed',
      supplier_invoice_id: 'supplier-invoice-1',
      created_at: new Date(Date.now() - 86400000).toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'inbox-item-3',
      organization_id: 'test-org-id',
      sender_email: 'duplicate@sender.com',
      from_name: 'Duplicate Sender',
      subject: 'Duplicate invoice',
      received_at: new Date(Date.now() - 172800000).toISOString(),
      file_name: 'dup_invoice.pdf',
      storage_path: 'test-org-id/ghi789-dup_invoice.pdf',
      file_size: 75000,
      content_type: 'application/pdf',
      status: 'duplicate',
      is_duplicate_of: 'inbox-item-1',
      created_at: new Date(Date.now() - 172800000).toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'inbox-item-4',
      organization_id: 'test-org-id',
      sender_email: 'nofile@sender.com',
      from_name: null,
      subject: 'Email without attachment',
      received_at: new Date(Date.now() - 259200000).toISOString(),
      file_name: null,
      storage_path: null,
      file_size: null,
      content_type: null,
      status: 'no_attachment',
      created_at: new Date(Date.now() - 259200000).toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'inbox-item-5',
      organization_id: 'test-org-id',
      sender_email: 'archived@sender.com',
      from_name: 'Archived Supplier',
      subject: 'Archived invoice',
      received_at: new Date(Date.now() - 345600000).toISOString(),
      file_name: 'archived_invoice.pdf',
      storage_path: 'test-org-id/jkl012-archived_invoice.pdf',
      file_size: 110000,
      content_type: 'application/pdf',
      status: 'archived',
      archived_at: new Date().toISOString(),
      archived_by: 'test-user-id',
      created_at: new Date(Date.now() - 345600000).toISOString(),
      updated_at: new Date().toISOString()
    }
  ];

  beforeEach(() => {
    cy.setupCommonIntercepts({
      clients: [],
      products: [],
      suppliers: [],
      supplierInboxItems: mockInboxItems,
      supplierInvoices: []
    });
    
    // Mock fiscal years
    cy.intercept('GET', '**/rest/v1/fiscal_years*', {
      statusCode: 200,
      body: []
    }).as('getFiscalYears');
    
    cy.login('premiumUserWithOrganization');
  });

  describe('Happy Path - Viewing Inbox', () => {
    it('is expected to display the inbox page with items', () => {
      cy.visit('/supplier-invoices/inbox');
      cy.wait('@getSupplierInboxItems');

      cy.getByCy('supplier-inbox-page').should('exist');
      cy.getByCy('inbox-items-list').should('exist');
      cy.getByCy('inbox-item-row').should('have.length', 5);
    });

    it('is expected to show inbox badge in navigation with new item count', () => {
      cy.visit('/supplier-invoices/inbox');
      cy.wait('@getSupplierInboxItems');
      
      // Expand the accounting section to see the badge
      cy.getByCy('nav-section-toggle-accounting').click();
      
      // The badge should show count of 'new' items (only 1 in mockInboxItems)
      cy.getByCy('inbox-badge').should('exist').and('contain', '1');
    });

    it('is expected to display item details correctly', () => {
      cy.visit('/supplier-invoices/inbox');
      cy.wait('@getSupplierInboxItems');

      // Check first item (new status)
      cy.getByCy('inbox-item-row').first().within(() => {
        cy.getByCy('inbox-item-sender').should('contain', 'Test Supplier');
        cy.getByCy('inbox-item-subject').should('contain', 'Invoice #1234');
      });
    });

    it('is expected to show duplicate indicator for duplicate items', () => {
      cy.visit('/supplier-invoices/inbox');
      cy.wait('@getSupplierInboxItems');

      // Find the duplicate item and check for indicator
      cy.contains('[data-cy="inbox-item-row"]', 'Duplicate invoice').within(() => {
        cy.getByCy('inbox-duplicate-indicator').should('exist');
      });
    });

    it('is expected to show no-attachment indicator for emails without files', () => {
      cy.visit('/supplier-invoices/inbox');
      cy.wait('@getSupplierInboxItems');

      // Find the no-attachment item and check for indicator
      cy.contains('[data-cy="inbox-item-row"]', 'Email without attachment').within(() => {
        cy.getByCy('inbox-no-attachment-indicator').should('exist');
      });
    });
  });

  describe('Happy Path - Filtering', () => {
    it('is expected to filter items by status - New', () => {
      cy.setupCommonIntercepts({
        supplierInboxItems: mockInboxItems.filter(i => i.status === 'new')
      });
      
      cy.visit('/supplier-invoices/inbox');
      cy.wait('@getSupplierInboxItems');

      cy.getByCy('inbox-filter-new').click();
      cy.wait('@getSupplierInboxItems');
      
      cy.getByCy('inbox-item-row').should('have.length', 1);
      cy.getByCy('inbox-item-subject').should('contain', 'Invoice #1234');
    });

    it('is expected to filter items by status - Processed', () => {
      cy.setupCommonIntercepts({
        supplierInboxItems: mockInboxItems.filter(i => i.status === 'processed')
      });
      
      cy.visit('/supplier-invoices/inbox');
      cy.wait('@getSupplierInboxItems');

      cy.getByCy('inbox-filter-processed').click();
      cy.wait('@getSupplierInboxItems');
      
      cy.getByCy('inbox-item-row').should('have.length', 1);
      cy.getByCy('inbox-item-subject').should('contain', 'February invoice');
    });

    it('is expected to filter items by status - Archived', () => {
      cy.setupCommonIntercepts({
        supplierInboxItems: mockInboxItems.filter(i => i.status === 'archived')
      });
      
      cy.visit('/supplier-invoices/inbox');
      cy.wait('@getSupplierInboxItems');

      cy.getByCy('inbox-filter-archived').click();
      cy.wait('@getSupplierInboxItems');
      
      cy.getByCy('inbox-item-row').should('have.length', 1);
      cy.getByCy('inbox-item-subject').should('contain', 'Archived invoice');
    });

    it('is expected to search items by sender email', () => {
      cy.visit('/supplier-invoices/inbox');
      cy.wait('@getSupplierInboxItems');

      cy.getByCy('inbox-search-input').type('another@supplier.com');
      
      // Wait for debounced search
      cy.wait(400);
      
      cy.getByCy('inbox-item-row').should('have.length', 1);
      cy.getByCy('inbox-item-sender').should('contain', 'another@supplier.com');
    });

    it('is expected to search items by subject', () => {
      cy.visit('/supplier-invoices/inbox');
      cy.wait('@getSupplierInboxItems');

      cy.getByCy('inbox-search-input').type('February');
      
      // Wait for debounced search
      cy.wait(400);
      
      cy.getByCy('inbox-item-row').should('have.length', 1);
      cy.getByCy('inbox-item-subject').should('contain', 'February invoice');
    });
  });

  describe('Happy Path - Actions', () => {
    it('is expected to archive an item successfully', () => {
      cy.intercept('PATCH', '**/rest/v1/supplier_inbox_items*', {
        statusCode: 200,
        body: { ...mockInboxItems[0], status: 'archived', archived_at: new Date().toISOString() }
      }).as('archiveItem');

      cy.visit('/supplier-invoices/inbox');
      cy.wait('@getSupplierInboxItems');

      // Click archive on first item
      cy.getByCy('inbox-item-row').first().within(() => {
        cy.getByCy('inbox-item-archive').click();
      });

      // Confirm archive
      cy.getByCy('inline-confirm-action').click();
      cy.wait('@archiveItem');

      // Toast should appear
      cy.contains('Item archived successfully').should('be.visible');
    });

    it('is expected to delete an item with confirmation', () => {
      cy.intercept('DELETE', '**/rest/v1/supplier_inbox_items*', {
        statusCode: 204
      }).as('deleteItem');

      // Mock storage delete
      cy.intercept('DELETE', '**/storage/v1/object/supplier-inbox/*', {
        statusCode: 200
      }).as('deleteStorage');

      cy.visit('/supplier-invoices/inbox');
      cy.wait('@getSupplierInboxItems');

      // Click delete on first item
      cy.getByCy('inbox-item-row').first().within(() => {
        cy.getByCy('inbox-item-delete').click();
      });

      // Confirm delete
      cy.getByCy('inline-confirm-action').click();

      // Toast should appear
      cy.contains('Item deleted successfully').should('be.visible');
    });

    it('is expected to cancel delete action', () => {
      cy.visit('/supplier-invoices/inbox');
      cy.wait('@getSupplierInboxItems');

      // Click delete on first item
      cy.getByCy('inbox-item-row').first().within(() => {
        cy.getByCy('inbox-item-delete').click();
      });

      // Cancel delete
      cy.getByCy('inline-confirm-cancel').click();

      // Items should still exist
      cy.getByCy('inbox-item-row').should('have.length', 5);
    });
  });

  describe('Happy Path - Bulk Actions', () => {
    it('is expected to select multiple items', () => {
      cy.visit('/supplier-invoices/inbox');
      cy.wait('@getSupplierInboxItems');

      // Select first two items
      cy.getByCy('inbox-item-row').eq(0).within(() => {
        cy.getByCy('inbox-item-checkbox').check();
      });
      cy.getByCy('inbox-item-row').eq(1).within(() => {
        cy.getByCy('inbox-item-checkbox').check();
      });

      // Bulk actions bar should appear
      cy.getByCy('inbox-bulk-actions').should('be.visible');
      cy.getByCy('inbox-bulk-actions').should('contain', '2 selected');
    });

    it('is expected to select all items', () => {
      cy.visit('/supplier-invoices/inbox');
      cy.wait('@getSupplierInboxItems');

      cy.getByCy('inbox-select-all').check();

      cy.getByCy('inbox-bulk-actions').should('be.visible');
      cy.getByCy('inbox-bulk-actions').should('contain', '5 selected');
    });

    it('is expected to archive selected items', () => {
      cy.intercept('PATCH', '**/rest/v1/supplier_inbox_items*', {
        statusCode: 200,
        body: mockInboxItems.slice(0, 2).map(item => ({ ...item, status: 'archived' }))
      }).as('archiveItems');

      cy.visit('/supplier-invoices/inbox');
      cy.wait('@getSupplierInboxItems');

      // Select first two items
      cy.getByCy('inbox-item-row').eq(0).within(() => {
        cy.getByCy('inbox-item-checkbox').check();
      });
      cy.getByCy('inbox-item-row').eq(1).within(() => {
        cy.getByCy('inbox-item-checkbox').check();
      });

      // Click archive selected
      cy.getByCy('inbox-archive-selected').click();

      // Confirm in modal
      cy.getByCy('inbox-confirm-modal').should('be.visible');
      cy.getByCy('confirm-action').click();

      cy.wait('@archiveItems');
    });

    it('is expected to delete selected items', () => {
      cy.intercept('DELETE', '**/rest/v1/supplier_inbox_items*', {
        statusCode: 204
      }).as('deleteItems');

      cy.intercept('DELETE', '**/storage/v1/object/supplier-inbox/*', {
        statusCode: 200
      }).as('deleteStorage');

      cy.visit('/supplier-invoices/inbox');
      cy.wait('@getSupplierInboxItems');

      // Select first two items
      cy.getByCy('inbox-item-row').eq(0).within(() => {
        cy.getByCy('inbox-item-checkbox').check();
      });
      cy.getByCy('inbox-item-row').eq(1).within(() => {
        cy.getByCy('inbox-item-checkbox').check();
      });

      // Click delete selected
      cy.getByCy('inbox-delete-selected').click();

      // Confirm in modal
      cy.getByCy('inbox-confirm-modal').should('be.visible');
      cy.getByCy('confirm-action').click();
    });
  });

  describe('Sad Path - Empty States', () => {
    it('is expected to display empty state when inbox is empty', () => {
      cy.setupCommonIntercepts({
        supplierInboxItems: []
      });

      cy.visit('/supplier-invoices/inbox');
      cy.wait('@getSupplierInboxItems');

      cy.getByCy('inbox-empty-state').should('be.visible');
      cy.getByCy('inbox-items-list').should('not.exist');
    });

    it('is expected to show setup notice when email slug is not configured', () => {
      // Login with organization that has no email_slug
      cy.login('premiumUser');

      cy.setupCommonIntercepts({
        supplierInboxItems: []
      });

      cy.visit('/supplier-invoices/inbox');

      cy.getByCy('inbox-setup-notice').should('be.visible');
      cy.contains('Email inbox not configured').should('be.visible');
    });
  });

  describe('Navigation', () => {
    it('is expected to access inbox from sidebar navigation', () => {
      cy.setupCommonIntercepts({
        supplierInboxItems: mockInboxItems
      });
      
      cy.visit('/');
      
      // Expand accounting section if collapsed
      cy.getByCy('nav-section-toggle-accounting').click();
      
      // Click on inbox link
      cy.get('[data-cy="sidebar-nav-supplier-invoices-inbox"]').click();
      
      cy.url().should('include', '/supplier-invoices/inbox');
      cy.getByCy('supplier-inbox-page').should('exist');
    });

    it('is expected to navigate to settings from setup notice', () => {
      cy.login('premiumUser');

      cy.setupCommonIntercepts({
        supplierInboxItems: []
      });

      cy.visit('/supplier-invoices/inbox');

      cy.getByCy('inbox-setup-notice').within(() => {
        cy.contains('Go to Settings').click();
      });

      cy.url().should('include', '/settings');
    });
  });
});
