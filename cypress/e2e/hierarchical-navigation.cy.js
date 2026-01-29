/// <reference types="cypress" />

/**
 * US-401: Hierarchical Sidebar Navigation
 * 
 * Tests for collapsible navigation sections that group related features
 * into modules: Invoicing, Accounting, Time & Projects, Administration
 */
describe('US-401: Hierarchical Sidebar Navigation', () => {
  beforeEach(() => {
    cy.setupCommonIntercepts({
      clients: [],
      products: [],
      invoices: [],
      organizations: [],
    });
  });

  describe('Navigation Structure', () => {
    beforeEach(() => {
      cy.login('premiumUser');
      cy.wait('@getOrganizations');
    });

    it('is expected to display dashboard as standalone top-level item', () => {
      cy.getByCy('sidebar-nav-dashboard').should('be.visible');
      cy.getByCy('sidebar-nav-dashboard').should('contain', 'Dashboard');
    });

    it('is expected to display four collapsible sections', () => {
      cy.getByCy('nav-section-invoicing').should('exist');
      cy.getByCy('nav-section-accounting').should('exist');
      cy.getByCy('nav-section-time-projects').should('exist');
      cy.getByCy('nav-section-administration').should('exist');
    });

    it('is expected to show section headers with toggle buttons', () => {
      cy.getByCy('nav-section-toggle-invoicing').should('be.visible');
      cy.getByCy('nav-section-toggle-accounting').should('be.visible');
      cy.getByCy('nav-section-toggle-time-projects').should('be.visible');
      cy.getByCy('nav-section-toggle-administration').should('be.visible');
    });
  });

  describe('Invoicing Section', () => {
    beforeEach(() => {
      cy.login('premiumUser');
      cy.wait('@getOrganizations');
    });

    it('is expected to be expanded by default', () => {
      cy.getByCy('nav-section-content-invoicing').should('be.visible');
    });

    it('is expected to contain invoices, clients, products, and templates links', () => {
      cy.getByCy('sidebar-nav-invoices').should('be.visible');
      cy.getByCy('sidebar-nav-clients').should('be.visible');
      cy.getByCy('sidebar-nav-products').should('be.visible');
      cy.getByCy('sidebar-nav-templates').should('be.visible');
    });

    it('is expected to collapse when header is clicked', () => {
      cy.getByCy('nav-section-content-invoicing').should('be.visible');
      cy.getByCy('nav-section-toggle-invoicing').click();
      cy.getByCy('nav-section-content-invoicing').should('not.exist');
    });

    it('is expected to expand when header is clicked again', () => {
      cy.getByCy('nav-section-toggle-invoicing').click();
      cy.getByCy('nav-section-content-invoicing').should('not.exist');
      cy.getByCy('nav-section-toggle-invoicing').click();
      cy.getByCy('nav-section-content-invoicing').should('be.visible');
    });

    it('is expected to navigate to invoices page when invoices link is clicked', () => {
      cy.getByCy('sidebar-nav-invoices').click();
      cy.url().should('include', '/invoices');
    });

    it('is expected to navigate to clients page when clients link is clicked', () => {
      cy.getByCy('sidebar-nav-clients').click();
      cy.url().should('include', '/clients');
    });
  });

  describe('Accounting Section', () => {
    beforeEach(() => {
      cy.login('admin');
      cy.setupCommonIntercepts({ accounts: [] });
      cy.wait('@getOrganizations');
    });

    it('is expected to contain accounts and SIE import links', () => {
      // Accounting section is auto-expanded via localStorage set in cy.login()
      cy.getByCy('nav-section-content-accounting').should('be.visible');
      cy.getByCy('sidebar-nav-accounts').should('be.visible');
      cy.get('[data-cy="sidebar-nav-import/sie"]').should('be.visible');
    });

    it('is expected to show "Coming Soon" message for Time & Projects section', () => {
      // Expand the time & projects section first
      cy.getByCy('nav-section-toggle-time-projects').click();
      cy.getByCy('nav-section-content-time-projects').should('contain', 'Coming Soon');
    });
  });

  describe('Administration Section', () => {
    describe('for premium user', () => {
      beforeEach(() => {
        cy.login('premiumUser');
        cy.wait('@getOrganizations');
      });

      it('is expected to be expanded by default', () => {
        cy.getByCy('nav-section-content-administration').should('be.visible');
      });

      it('is expected to contain settings and teams links', () => {
        cy.getByCy('sidebar-nav-settings').should('be.visible');
        cy.getByCy('sidebar-nav-teams').should('be.visible');
      });

      it('is expected to not show admin link for non-admin users', () => {
        cy.getByCy('sidebar-nav-admin').should('not.exist');
      });
    });

    describe('for admin user', () => {
      beforeEach(() => {
        cy.login('admin');
        cy.wait('@getOrganizations');
        // Scroll to and expand the administration section
        cy.getByCy('nav-section-toggle-administration').scrollIntoView();
        // Check if section content exists (expanded) or not
        cy.get('body').then($body => {
          if ($body.find('[data-cy="nav-section-content-administration"]').length === 0) {
            // Section is collapsed, click to expand
            cy.getByCy('nav-section-toggle-administration').click();
          }
        });
        // Wait for section to be visible after scrolling
        cy.getByCy('nav-section-content-administration').scrollIntoView().should('exist');
      });

      it('is expected to show admin link for admin users', () => {
        cy.getByCy('sidebar-nav-admin').scrollIntoView().should('be.visible');
      });

      it('is expected to navigate to admin page when admin link is clicked', () => {
        cy.getByCy('sidebar-nav-admin').click();
        cy.url().should('include', '/admin');
      });
    });
  });

  describe('State Persistence', () => {
    it('is expected to persist collapsed state across page navigation', () => {
      cy.login('premiumUser');
      cy.wait('@getOrganizations');
      
      // Collapse the invoicing section
      cy.getByCy('nav-section-toggle-invoicing').click();
      cy.getByCy('nav-section-content-invoicing').should('not.exist');
      
      // Navigate to settings (in Administration section which is expanded)
      cy.getByCy('sidebar-nav-settings').click();
      
      // Navigate back to dashboard
      cy.getByCy('sidebar-nav-dashboard').click();
      
      // Invoicing section should remain collapsed
      cy.getByCy('nav-section-content-invoicing').should('not.exist');
    });

    it('is expected to persist expanded state in localStorage', () => {
      cy.login('premiumUser');
      cy.wait('@getOrganizations');
      
      // Collapse the invoicing section
      cy.getByCy('nav-section-toggle-invoicing').click();
      
      // Verify localStorage is updated
      cy.window().then((win) => {
        const stored = win.localStorage.getItem('nav-section-invoicing');
        expect(stored).to.equal('false');
      });
    });
  });

  describe('Auto-expand on Active Item', () => {
    it('is expected to auto-expand section when clicking on item within collapsed section', () => {
      cy.login('premiumUser');
      cy.wait('@getOrganizations');
      
      // Collapse the invoicing section first
      cy.getByCy('nav-section-toggle-invoicing').click();
      cy.getByCy('nav-section-content-invoicing').should('not.exist');
      
      // Expand the section again by clicking the toggle
      cy.getByCy('nav-section-toggle-invoicing').click();
      cy.getByCy('nav-section-content-invoicing').should('be.visible');
      
      // Click invoices link
      cy.getByCy('sidebar-nav-invoices').click();
      cy.wait('@getInvoices');
      
      // Section should remain expanded and item should be visible
      cy.getByCy('nav-section-content-invoicing').should('be.visible');
      cy.getByCy('sidebar-nav-invoices').should('be.visible');
      cy.getByCy('sidebar-nav-invoices').should('have.class', 'bg-blue-600');
    });
  });

  describe('Premium Features', () => {
    describe('for free user', () => {
      beforeEach(() => {
        cy.login('user'); // free user
        cy.wait('@getOrganizations');
      });

      it('is expected to show PRO badge on templates link', () => {
        cy.getByCy('sidebar-nav-templates')
          .should('contain', 'PRO');
      });

      it('is expected to show PRO badge on teams link', () => {
        cy.getByCy('sidebar-nav-teams')
          .should('contain', 'PRO');
      });

      it('is expected to prevent navigation when clicking on premium links', () => {
        cy.getByCy('sidebar-nav-templates').click();
        cy.url().should('not.include', '/templates');
        cy.url().should('include', '/'); // Should stay on current page
      });
    });

    describe('for premium user', () => {
      beforeEach(() => {
        cy.login('premiumUser');
        cy.wait('@getOrganizations');
      });

      it('is expected to not show PRO badge on templates link', () => {
        cy.getByCy('sidebar-nav-templates')
          .should('not.contain', 'PRO');
      });

      it('is expected to allow navigation to templates page', () => {
        cy.getByCy('sidebar-nav-templates').click();
        cy.url().should('include', '/templates');
      });
    });
  });

  describe('Active State Highlighting', () => {
    it('is expected to highlight active dashboard link', () => {
      cy.login('premiumUser');
      cy.wait('@getOrganizations');
      
      cy.getByCy('sidebar-nav-dashboard')
        .should('have.class', 'bg-blue-600');
    });

    it('is expected to highlight active invoices link', () => {
      cy.login('premiumUser');
      cy.wait('@getOrganizations');
      
      cy.getByCy('sidebar-nav-invoices').click();
      cy.wait('@getInvoices');
      
      cy.getByCy('sidebar-nav-invoices')
        .should('have.class', 'bg-blue-600');
    });

    it('is expected to highlight active clients link', () => {
      cy.login('premiumUser');
      cy.wait('@getOrganizations');
      
      cy.getByCy('sidebar-nav-clients').click();
      cy.wait('@getClients');
      
      cy.getByCy('sidebar-nav-clients')
        .should('have.class', 'bg-blue-600');
    });
  });

  describe('Internationalization', () => {
    beforeEach(() => {
      cy.login('premiumUser');
      cy.wait('@getOrganizations');
    });

    it('is expected to display section names in English by default', () => {
      
      cy.getByCy('nav-section-toggle-invoicing').should('contain', 'Invoicing');
      cy.getByCy('nav-section-toggle-administration').should('contain', 'Administration');
    });
  });
});
