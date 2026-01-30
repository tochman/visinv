/// <reference types="cypress" />

/**
 * E2E Tests for Organization Logo Upload (US-053)
 * Tests organization logo upload, display, and deletion functionality
 */

describe('Organization Logo Upload', () => {
  const mockOrganization = {
    id: 'org-123',
    name: 'Test Company AB',
    organization_number: '556677-8899',
    vat_number: 'SE556677889901',
    address: 'Test Street 123',
    city: 'Stockholm',
    postal_code: '111 22',
    municipality: 'Stockholm',
    country: 'Sweden',
    logo_url: null,
  };

  beforeEach(() => {
    // Setup common intercepts
    cy.setupCommonIntercepts({ clients: [], products: [] });
    
    // Intercept organization fetch
    cy.intercept('GET', '**/rest/v1/organization_members?*', {
      statusCode: 200,
      body: [{
        role: 'owner',
        is_default: true,
        joined_at: '2024-01-01T00:00:00Z',
        organizations: mockOrganization,
      }],
    }).as('getOrganizations');

    // Login and navigate to settings
    cy.login('admin');
    
    cy.visit('/settings');
    cy.wait('@getOrganizations');
    
    // Click on Organization Settings tab (should be default, but ensure)
    cy.get('[data-cy="tab-settings"]').click();
  });

  describe('Happy Path - Success Scenarios', () => {
    it('is expected to display the organization settings with logo placeholder', () => {
      // Should show placeholder when no logo exists
      cy.get('[data-cy="organization-logo-placeholder"]').should('be.visible');
      
      // Should show upload button
      cy.get('[data-cy="organization-upload-logo-button"]').should('be.visible');
      
      // Should NOT show remove button when no logo
      cy.get('[data-cy="organization-remove-logo-button"]').should('not.exist');
    });

    it('is expected to upload a logo successfully', () => {
      // Mock the upload and update operations
      cy.intercept('POST', '**/storage/v1/object/logos/**', {
        statusCode: 200,
        body: { Key: 'logos/user-123/logo.png' },
      }).as('uploadLogo');

      cy.intercept('PATCH', '**/rest/v1/organizations?id=eq.*', {
        statusCode: 200,
        body: [{
          ...mockOrganization,
          logo_url: 'https://example.com/logos/user-123/logo.png',
        }],
      }).as('updateOrganization');

      // Refresh organization list after update
      cy.intercept('GET', '**/rest/v1/organization_members?*', {
        statusCode: 200,
        body: [{
          role: 'owner',
          is_default: true,
          joined_at: '2024-01-01T00:00:00Z',
          organizations: {
            ...mockOrganization,
            logo_url: 'https://example.com/logos/user-123/logo.png',
          },
        }],
      }).as('getOrganizationsUpdated');

      // Select a file
      cy.get('[data-cy="organization-logo-input"]').selectFile('cypress/fixtures/test-logo.png', { force: true });

      // Wait for upload
      cy.wait('@uploadLogo');
      cy.wait('@updateOrganization');

      // Should show success message
      cy.get('[data-cy="success-message"]').should('be.visible');
      cy.get('[data-cy="success-message"]').should('contain', 'Logo uploaded successfully');
    });

    it('is expected to display uploaded logo image', () => {
      // Mock organization with logo
      const orgWithLogo = {
        ...mockOrganization,
        logo_url: 'https://example.com/logos/user-123/logo.png',
      };

      cy.intercept('GET', '**/rest/v1/organization_members?*', {
        statusCode: 200,
        body: [{
          role: 'owner',
          is_default: true,
          joined_at: '2024-01-01T00:00:00Z',
          organizations: orgWithLogo,
        }],
      }).as('getOrganizationsWithLogo');

      // Reload page
      cy.reload();
      cy.wait('@getOrganizationsWithLogo');
      cy.get('[data-cy="tab-settings"]').click();

      // Should show logo image instead of placeholder
      cy.get('[data-cy="organization-logo-image"]').should('be.visible');
      cy.get('[data-cy="organization-logo-image"]').should('have.attr', 'src', orgWithLogo.logo_url);
      
      // Should show remove button
      cy.get('[data-cy="organization-remove-logo-button"]').should('be.visible');
    });

    it('is expected to delete logo successfully', () => {
      // Mock organization with logo
      const orgWithLogo = {
        ...mockOrganization,
        logo_url: 'https://example.com/logos/user-123/logo.png',
      };

      cy.intercept('GET', '**/rest/v1/organization_members?*', {
        statusCode: 200,
        body: [{
          role: 'owner',
          is_default: true,
          joined_at: '2024-01-01T00:00:00Z',
          organizations: orgWithLogo,
        }],
      }).as('getOrganizationsWithLogo');

      cy.reload();
      cy.wait('@getOrganizationsWithLogo');
      cy.get('[data-cy="tab-settings"]').click();

      // Mock delete operations
      cy.intercept('DELETE', '**/storage/v1/object/logos/**', {
        statusCode: 200,
        body: { message: 'Deleted' },
      }).as('deleteLogo');

      cy.intercept('PATCH', '**/rest/v1/organizations?id=eq.*', {
        statusCode: 200,
        body: [{
          ...mockOrganization,
          logo_url: null,
        }],
      }).as('updateOrganizationRemove');

      cy.intercept('GET', '**/rest/v1/organization_members?*', {
        statusCode: 200,
        body: [{
          role: 'owner',
          is_default: true,
          joined_at: '2024-01-01T00:00:00Z',
          organizations: mockOrganization,
        }],
      }).as('getOrganizationsNoLogo');

      // Stub window.confirm to return true
      cy.window().then((win) => {
        cy.stub(win, 'confirm').returns(true);
      });

      // Click remove button
      cy.get('[data-cy="organization-remove-logo-button"]').click();

      // Wait for operations
      cy.wait('@deleteLogo');
      cy.wait('@updateOrganizationRemove');

      // Should show success message
      cy.get('[data-cy="success-message"]').should('be.visible');
      cy.get('[data-cy="success-message"]').should('contain', 'Logo removed successfully');

      // Should show placeholder again
      cy.get('[data-cy="organization-logo-placeholder"]').should('be.visible');
    });

    it('is expected to replace existing logo with new upload', () => {
      // Mock organization with existing logo
      const orgWithLogo = {
        ...mockOrganization,
        logo_url: 'https://example.com/logos/user-123/old-logo.png',
      };

      cy.intercept('GET', '**/rest/v1/organization_members?*', {
        statusCode: 200,
        body: [{
          role: 'owner',
          is_default: true,
          joined_at: '2024-01-01T00:00:00Z',
          organizations: orgWithLogo,
        }],
      }).as('getOrganizationsWithLogo');

      cy.reload();
      cy.wait('@getOrganizationsWithLogo');
      cy.get('[data-cy="tab-settings"]').click();

      // Mock delete old logo
      cy.intercept('DELETE', '**/storage/v1/object/logos/**old-logo.png', {
        statusCode: 200,
        body: { message: 'Deleted' },
      }).as('deleteOldLogo');

      // Mock upload new logo
      cy.intercept('POST', '**/storage/v1/object/logos/**', {
        statusCode: 200,
        body: { Key: 'logos/user-123/new-logo.png' },
      }).as('uploadNewLogo');

      cy.intercept('PATCH', '**/rest/v1/organizations?id=eq.*', {
        statusCode: 200,
        body: [{
          ...mockOrganization,
          logo_url: 'https://example.com/logos/user-123/new-logo.png',
        }],
      }).as('updateOrganization');

      // Upload new file (should replace old one)
      cy.get('[data-cy="organization-logo-input"]').selectFile('cypress/fixtures/test-logo.png', { force: true });

      cy.wait('@uploadNewLogo');
      cy.wait('@updateOrganization');

      // Should show success message
      cy.get('[data-cy="success-message"]').should('be.visible');
    });
  });

  describe('Sad Path - Error Scenarios', () => {
    it('is expected to display error when logo upload fails', () => {
      // Mock failed upload
      cy.intercept('POST', '**/storage/v1/object/logos/**', {
        statusCode: 500,
        body: { error: 'Upload failed' },
      }).as('uploadLogoFail');

      // Try to upload
      cy.get('[data-cy="organization-logo-input"]').selectFile('cypress/fixtures/test-logo.png', { force: true });

      cy.wait('@uploadLogoFail');

      // Should show error message
      cy.get('.border-red-400').should('be.visible');
      cy.get('.text-red-700').should('contain', 'Upload failed');
    });

    it('is expected to display error when logo delete fails', () => {
      // Mock organization with logo
      const orgWithLogo = {
        ...mockOrganization,
        logo_url: 'https://example.com/logos/user-123/logo.png',
      };

      cy.intercept('GET', '**/rest/v1/organization_members?*', {
        statusCode: 200,
        body: [{
          role: 'owner',
          is_default: true,
          joined_at: '2024-01-01T00:00:00Z',
          organizations: orgWithLogo,
        }],
      }).as('getOrganizationsWithLogo');

      cy.reload();
      cy.wait('@getOrganizationsWithLogo');
      cy.get('[data-cy="tab-settings"]').click();

      // Mock failed delete
      cy.intercept('DELETE', '**/storage/v1/object/logos/**', {
        statusCode: 500,
        body: { error: 'Delete failed' },
      }).as('deleteLogoFail');

      // Stub window.confirm
      cy.window().then((win) => {
        cy.stub(win, 'confirm').returns(true);
      });

      // Try to delete
      cy.get('[data-cy="organization-remove-logo-button"]').click();

      cy.wait('@deleteLogoFail');

      // Should show error message
      cy.get('.border-red-400').should('be.visible');
      cy.get('.text-red-700').should('contain', 'Delete failed');
    });

    it('is expected to handle cancel confirmation for logo delete', () => {
      // Mock organization with logo
      const orgWithLogo = {
        ...mockOrganization,
        logo_url: 'https://example.com/logos/user-123/logo.png',
      };

      cy.intercept('GET', '**/rest/v1/organization_members?*', {
        statusCode: 200,
        body: [{
          role: 'owner',
          is_default: true,
          joined_at: '2024-01-01T00:00:00Z',
          organizations: orgWithLogo,
        }],
      }).as('getOrganizationsWithLogo');

      cy.reload();
      cy.wait('@getOrganizationsWithLogo');
      cy.get('[data-cy="tab-settings"]').click();

      // Stub window.confirm to return false (cancel)
      cy.window().then((win) => {
        cy.stub(win, 'confirm').returns(false);
      });

      // Click remove button
      cy.get('[data-cy="organization-remove-logo-button"]').click();

      // Logo should still be visible (delete was cancelled)
      cy.get('[data-cy="organization-logo-image"]').should('be.visible');
    });
  });
});
