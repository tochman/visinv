/// <reference types="cypress" />

/**
 * US-264a: Organization Email Slug Management
 * Tests for displaying, copying, editing, and validating email slugs
 */

describe('Organization Email Slug Management', () => {
  const navigateToOrgSettings = () => {
    cy.getByCy('sidebar-nav-settings').click();
    cy.getByCy('tab-settings').click();
    cy.getByCy('email-slug-section').scrollIntoView();
  };

  describe('Email Slug Display', () => {
    beforeEach(() => {
      cy.setupCommonIntercepts({
        invoices: [],
        clients: [],
        products: []
      });

      // Intercept slug history
      cy.intercept('GET', '**/rest/v1/organization_email_slug_history*', {
        statusCode: 200,
        body: []
      }).as('getSlugHistory');

      cy.login('admin');
      navigateToOrgSettings();
    });

    it('is expected to display email slug section in organization settings', () => {
      // Should show the email slug section
      cy.getByCy('email-slug-section').should('be.visible');
      cy.getByCy('email-slug-address').should('be.visible');
      cy.getByCy('email-slug-address').should('contain', 'test_organization@dortal.resend.app');
    });

    it('is expected to display copy button', () => {
      cy.getByCy('copy-email-slug').should('be.visible');
    });

    it('is expected to display edit button for owner', () => {
      cy.getByCy('edit-email-slug').should('be.visible');
    });

    it('is expected to copy email address to clipboard', () => {
      // Click copy button
      cy.getByCy('copy-email-slug').click();
      
      // Should show "Copied!" feedback
      cy.getByCy('copy-email-slug').should('contain', 'Copied');
      
      // Should revert back after timeout
      cy.wait(2500);
      cy.getByCy('copy-email-slug').should('not.contain', 'Copied');
    });
  });

  describe('Email Slug Change Modal', () => {
    beforeEach(() => {
      cy.setupCommonIntercepts({
        invoices: [],
        clients: [],
        products: []
      });

      cy.intercept('GET', '**/rest/v1/organization_email_slug_history*', {
        statusCode: 200,
        body: []
      }).as('getSlugHistory');

      cy.login('admin');
      navigateToOrgSettings();
    });

    it('is expected to open change modal when edit button clicked', () => {
      cy.getByCy('edit-email-slug').click();
      
      cy.getByCy('email-slug-modal').should('exist');
      cy.getByCy('new-slug-input').should('exist');
    });

    it('is expected to close modal when cancel button clicked', () => {
      cy.getByCy('edit-email-slug').click();
      cy.getByCy('email-slug-modal').should('exist');
      
      cy.getByCy('cancel-slug-change').click();
      
      cy.getByCy('email-slug-modal').should('not.exist');
    });

    it('is expected to show current address in modal', () => {
      cy.getByCy('edit-email-slug').click();
      
      cy.getByCy('email-slug-modal').should('contain', 'test_organization@dortal.resend.app');
    });

    it('is expected to pre-fill input with current slug', () => {
      cy.getByCy('edit-email-slug').click();
      
      cy.getByCy('new-slug-input').should('have.value', 'test_organization');
    });
  });

  describe('Email Slug Validation', () => {
    beforeEach(() => {
      cy.setupCommonIntercepts({
        invoices: [],
        clients: [],
        products: []
      });

      cy.intercept('GET', '**/rest/v1/organization_email_slug_history*', {
        statusCode: 200,
        body: []
      }).as('getSlugHistory');

      // Mock availability check - returns available by default
      cy.intercept('GET', '**/rest/v1/organizations?email_slug=eq.*', {
        statusCode: 200,
        body: []
      }).as('checkSlugAvailability');

      cy.login('admin');
      navigateToOrgSettings();
      cy.getByCy('edit-email-slug').click();
    });

    it('is expected to show validation error for too short slug', () => {
      cy.getByCy('new-slug-input').clear().type('ab');
      
      cy.getByCy('slug-validation-error').scrollIntoView();
      cy.getByCy('slug-validation-error').should('be.visible');
      cy.getByCy('slug-validation-error').should('contain', 'at least 3 characters');
    });

    it('is expected to force lowercase input', () => {
      cy.getByCy('new-slug-input').clear().type('MyCompany');
      
      // Should be converted to lowercase
      cy.getByCy('new-slug-input').should('have.value', 'mycompany');
    });

    it('is expected to replace spaces with underscores', () => {
      cy.getByCy('new-slug-input').clear().type('my company');
      
      cy.getByCy('new-slug-input').should('have.value', 'my_company');
    });

    it('is expected to remove invalid characters', () => {
      cy.getByCy('new-slug-input').clear().type('my-company@123!');
      
      // Should only contain valid characters (hyphens and special chars removed)
      cy.getByCy('new-slug-input').should('have.value', 'mycompany123');
    });

    it('is expected to show preview of new email address', () => {
      cy.getByCy('new-slug-input').clear().type('new_company');
      
      cy.getByCy('email-slug-modal').should('contain', 'new_company@dortal.resend.app');
    });

    it('is expected to disable continue button for invalid slug', () => {
      cy.getByCy('new-slug-input').clear().type('ab');
      
      cy.getByCy('proceed-slug-change').should('be.disabled');
    });
  });

  describe('Email Slug Change Confirmation', () => {
    beforeEach(() => {
      cy.setupCommonIntercepts({
        invoices: [],
        clients: [],
        products: []
      });

      cy.intercept('GET', '**/rest/v1/organization_email_slug_history*', {
        statusCode: 200,
        body: []
      }).as('getSlugHistory');

      // Mock availability check - use wildcard pattern for any organizations query with email_slug
      cy.intercept('GET', '**/rest/v1/organizations*email_slug*', {
        statusCode: 200,
        body: []
      }).as('checkSlugAvailability');

      // Mock history availability check
      cy.intercept('GET', '**/rest/v1/organization_email_slug_history*slug=eq*', {
        statusCode: 200,
        body: []
      }).as('checkHistoryAvailability');

      cy.login('admin');
      navigateToOrgSettings();
    });

    it('is expected to show confirmation step before saving', () => {
      cy.getByCy('edit-email-slug').click();
      cy.getByCy('new-slug-input').clear().type('new_company');
      
      // Wait for availability check and button to become enabled
      cy.getByCy('proceed-slug-change').should('not.be.disabled');
      cy.getByCy('proceed-slug-change').click();
      
      // Should show confirmation warnings
      cy.getByCy('email-slug-modal').should('contain', 'confirm');
    });

    it('is expected to show old and new addresses in confirmation', () => {
      cy.getByCy('edit-email-slug').click();
      cy.getByCy('new-slug-input').clear().type('new_company');
      
      cy.getByCy('proceed-slug-change').should('not.be.disabled');
      cy.getByCy('proceed-slug-change').click();
      
      cy.getByCy('email-slug-modal').should('contain', 'test_organization@dortal.resend.app');
      cy.getByCy('email-slug-modal').should('contain', 'new_company@dortal.resend.app');
    });

    it('is expected to allow going back from confirmation', () => {
      cy.getByCy('edit-email-slug').click();
      cy.getByCy('new-slug-input').clear().type('new_company');
      
      cy.getByCy('proceed-slug-change').should('not.be.disabled');
      cy.getByCy('proceed-slug-change').click();
      
      cy.getByCy('back-slug-change').click();
      
      // Should be back to edit view
      cy.getByCy('new-slug-input').should('exist');
      cy.getByCy('new-slug-input').should('have.value', 'new_company');
    });

    it('is expected to save slug change when confirmed', () => {
      // Mock the update endpoint
      cy.intercept('PATCH', '**/rest/v1/organizations*', (req) => {
        expect(req.body.email_slug).to.equal('new_company');
        req.reply({
          statusCode: 200,
          body: { id: 'test-org-id', email_slug: 'new_company' }
        });
      }).as('updateSlug');

      cy.getByCy('edit-email-slug').click();
      cy.getByCy('new-slug-input').clear().type('new_company');
      
      cy.getByCy('proceed-slug-change').should('not.be.disabled');
      cy.getByCy('proceed-slug-change').click();
      
      cy.getByCy('confirm-slug-change').click();
      
      cy.wait('@updateSlug');
      
      // Modal should close after successful save
      cy.getByCy('email-slug-modal').should('not.exist');
    });
  });

  describe('Email Slug History', () => {
    beforeEach(() => {
      cy.setupCommonIntercepts({
        invoices: [],
        clients: [],
        products: []
      });

      // Mock history with previous slugs
      cy.intercept('GET', '**/rest/v1/organization_email_slug_history*', {
        statusCode: 200,
        body: [
          {
            id: 'history-1',
            organization_id: 'test-org-id',
            slug: 'old_company_name',
            created_at: '2024-01-15T10:00:00Z',
            replaced_at: '2024-06-15T10:00:00Z'
          },
          {
            id: 'history-2',
            organization_id: 'test-org-id',
            slug: 'very_old_name',
            created_at: '2023-06-01T10:00:00Z',
            replaced_at: '2024-01-15T10:00:00Z'
          }
        ]
      }).as('getSlugHistory');

      cy.login('admin');
      navigateToOrgSettings();
    });

    it('is expected to display previous email addresses', () => {
      cy.getByCy('email-slug-history').scrollIntoView();
      cy.getByCy('email-slug-history').should('be.visible');
      cy.getByCy('email-slug-history').should('contain', 'old_company_name@dortal.resend.app');
      cy.getByCy('email-slug-history').should('contain', 'very_old_name@dortal.resend.app');
    });
  });

  describe('Generate Slug Button', () => {
    beforeEach(() => {
      cy.setupCommonIntercepts({
        invoices: [],
        clients: [],
        products: []
      });

      cy.intercept('GET', '**/rest/v1/organization_email_slug_history*', {
        statusCode: 200,
        body: []
      }).as('getSlugHistory');

      cy.intercept('GET', '**/rest/v1/organizations?email_slug=eq.*', {
        statusCode: 200,
        body: []
      }).as('checkSlugAvailability');

      cy.login('admin');
      navigateToOrgSettings();
    });

    it('is expected to generate slug from organization name', () => {
      cy.getByCy('edit-email-slug').click();
      cy.getByCy('new-slug-input').clear();
      
      cy.getByCy('generate-slug').click();
      
      // Should generate slug from "Test Organization"
      cy.getByCy('new-slug-input').should('have.value', 'test_organization');
    });
  });
});
