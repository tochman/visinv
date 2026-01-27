/// <reference types="cypress" />

describe('Multi-Organization Support (US-058)', () => {
  const mockOrganization1 = {
    id: 'org-1-id',
    name: 'Acme AB',
    organization_number: '556677-8899',
    vat_number: 'SE556677889901',
    address: 'Storgatan 1',
    city: 'Stockholm',
    postal_code: '11122',
    municipality: 'Stockholm',
    email: 'info@acme.se',
    phone: '+46 8 123 456',
    bank_giro: '123-4567',
    f_skatt_approved: true,
    invoice_number_prefix: 'INV',
    next_invoice_number: 1,
    default_payment_terms: 30,
    default_currency: 'SEK',
    default_tax_rate: 25,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z'
  };

  const mockOrganization2 = {
    id: 'org-2-id',
    name: 'Beta Corp',
    organization_number: '556677-1234',
    vat_number: 'SE556677123401',
    address: 'Lillgatan 5',
    city: 'Göteborg',
    postal_code: '41123',
    municipality: 'Göteborg',
    email: 'info@beta.se',
    phone: '+46 31 456 789',
    bank_giro: '987-6543',
    f_skatt_approved: true,
    invoice_number_prefix: 'BETA',
    next_invoice_number: 1,
    default_payment_terms: 14,
    default_currency: 'EUR',
    default_tax_rate: 25,
    created_at: '2024-02-01T00:00:00.000Z',
    updated_at: '2024-02-01T00:00:00.000Z'
  };

  const mockMember = {
    id: 'member-1',
    organization_id: mockOrganization1.id,
    user_id: 'test-admin-id',
    role: 'owner',
    is_default: true,
    joined_at: '2024-01-01T00:00:00.000Z'
  };

  // Helper to set up multi-org intercepts
  const setupMultiOrgIntercepts = (orgs = [mockOrganization1]) => {
    // Organization members query (used by OrganizationContext to get user's orgs)
    const memberships = orgs.map((org, index) => ({
      role: index === 0 ? 'owner' : 'associate',
      is_default: index === 0,
      joined_at: org.created_at,
      organizations: org
    }));

    cy.intercept('GET', '**/rest/v1/organization_members?*organizations*', {
      statusCode: 200,
      body: memberships
    }).as('getOrganizations');

    // Default organization query
    cy.intercept('GET', '**/rest/v1/organization_members?*is_default=eq.true*', {
      statusCode: 200,
      body: memberships.length > 0 ? memberships[0] : null
    }).as('getDefaultOrg');

    // Individual organization query
    orgs.forEach(org => {
      cy.intercept('GET', `**/rest/v1/organizations?id=eq.${org.id}*`, {
        statusCode: 200,
        body: org
      }).as(`getOrg-${org.id}`);
    });
  };

  describe('Organization Switcher Display', () => {
    describe('Free User with Single Organization', () => {
      beforeEach(() => {
        cy.login('user', { 
          customOrganization: { ...mockOrganization1, role: 'owner' }
        });
      });

      it('is expected to display organization name without dropdown for free users', () => {
        // Free user with single org should see org name but no switcher
        cy.getByCy('organization-display').should('be.visible');
        cy.getByCy('organization-switcher-button').should('not.exist');
      });
    });

    describe('Premium User with Single Organization', () => {
      beforeEach(() => {
        cy.login('premiumUser', { 
          customOrganization: { ...mockOrganization1, role: 'owner' }
        });
      });

      it('is expected to show organization switcher with create option for premium users', () => {
        cy.getByCy('organization-switcher-button').should('be.visible');
        cy.getByCy('organization-switcher-button').click();
        cy.getByCy('organization-switcher-dropdown').should('be.visible');
        cy.getByCy('create-new-organization-button').should('be.visible');
      });

      it('is expected to show current organization with check mark', () => {
        cy.getByCy('organization-switcher-button').click();
        cy.getByCy('organization-option').should('have.length', 1);
        cy.getByCy('organization-option').within(() => {
          cy.contains('Acme AB').should('be.visible');
          cy.get('svg').should('exist'); // Check icon
        });
      });
    });

    describe('User with Multiple Organizations', () => {
      beforeEach(() => {
        cy.login('premiumUser', { 
          customOrganization: { ...mockOrganization1, role: 'owner' }
        });
        setupMultiOrgIntercepts([mockOrganization1, mockOrganization2]);
        cy.visit('/');
        cy.wait('@getOrganizations');
      });

      it('is expected to display organization switcher', () => {
        cy.getByCy('organization-switcher-button').should('be.visible');
        cy.contains('Acme AB').should('be.visible');
      });

      it('is expected to show all organizations in dropdown', () => {
        cy.getByCy('organization-switcher-button').click();
        cy.getByCy('organization-switcher-dropdown').should('be.visible');
        cy.getByCy('organization-option').should('have.length', 2);
        cy.contains('Acme AB').should('be.visible');
        cy.contains('Beta Corp').should('be.visible');
      });

      it('is expected to display role badges for each organization', () => {
        cy.getByCy('organization-switcher-button').click();
        cy.getByCy('organization-option').first().within(() => {
          cy.contains('Owner').should('be.visible');
        });
        cy.getByCy('organization-option').last().within(() => {
          cy.contains('Associate').should('be.visible');
        });
      });
    });
  });

  describe('Organization Switching', () => {
    beforeEach(() => {
      cy.login('premiumUser', { 
        customOrganization: { ...mockOrganization1, role: 'owner' }
      });
      setupMultiOrgIntercepts([mockOrganization1, mockOrganization2]);

      // Mock the setDefault endpoint
      cy.intercept('PATCH', '**/rest/v1/organization_members?*', {
        statusCode: 200,
        body: {}
      }).as('setDefaultOrg');

      cy.visit('/');
      cy.wait('@getOrganizations');
    });

    it('is expected to switch organization when clicking another org', () => {
      cy.getByCy('organization-switcher-button').click();
      cy.getByCy('organization-option').last().click();
      
      cy.wait('@setDefaultOrg');
    });

    it('is expected to close dropdown after switching', () => {
      cy.getByCy('organization-switcher-button').click();
      cy.getByCy('organization-switcher-dropdown').should('be.visible');
      cy.getByCy('organization-option').last().click();
      
      cy.getByCy('organization-switcher-dropdown').should('not.exist');
    });

    it('is expected to close dropdown when clicking outside', () => {
      cy.getByCy('organization-switcher-button').click();
      cy.getByCy('organization-switcher-dropdown').should('be.visible');
      
      // Click outside the dropdown
      cy.get('body').click(0, 0);
      
      cy.getByCy('organization-switcher-dropdown').should('not.exist');
    });
  });

  describe('Create New Organization (Premium Users)', () => {
    beforeEach(() => {
      cy.login('premiumUser', { 
        customOrganization: { ...mockOrganization1, role: 'owner' }
      });
    });

    it('is expected to show create organization button for premium users', () => {
      cy.getByCy('organization-switcher-button').click();
      cy.getByCy('create-new-organization-button').should('be.visible');
      cy.getByCy('create-new-organization-button').contains('Create New Organization');
    });

    it('is expected to open organization wizard when clicking create', () => {
      cy.getByCy('organization-switcher-button').click();
      cy.getByCy('create-new-organization-button').click();
      
      // Wizard modal should appear
      cy.contains('Set Up Your Organization').should('be.visible');
    });
  });

  describe('Invitation to Additional Organization', () => {
    const invitedEmail = 'user@existing.com';
    const validToken = 'valid-invitation-token-for-second-org';

    const mockInvitation = {
      id: 'invitation-id-1',
      organization_id: mockOrganization2.id,
      email: invitedEmail,
      role: 'associate',
      token: validToken,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: new Date().toISOString(),
      organizations: mockOrganization2
    };

    beforeEach(() => {
      // User already belongs to org1, being invited to org2
      cy.login('user', { 
        customOrganization: { ...mockOrganization1, role: 'owner' }
      });

      // Override user email to match invitation
      cy.window().then((win) => {
        const storageKey = `sb-${Cypress.env('SUPABASE_PROJECT_REF') || 'test'}-auth-token`;
        const sessionData = JSON.parse(win.localStorage.getItem(storageKey));
        if (sessionData) {
          sessionData.user.email = invitedEmail;
          win.localStorage.setItem(storageKey, JSON.stringify(sessionData));
        }
      });

      // Mock getting invitation
      cy.intercept('GET', `**/rest/v1/organization_invitations?*token=eq.${validToken}*`, {
        statusCode: 200,
        body: mockInvitation
      }).as('getInvitation');

      // Mock accepting invitation
      cy.intercept('POST', '**/rest/v1/organization_members*', {
        statusCode: 201,
        body: [{
          id: 'new-member-id',
          organization_id: mockOrganization2.id,
          user_id: 'test-user-id',
          role: 'associate',
          joined_at: new Date().toISOString()
        }]
      }).as('addMember');

      // Mock deleting invitation after acceptance
      cy.intercept('DELETE', '**/rest/v1/organization_invitations?*', {
        statusCode: 204,
        body: null
      }).as('deleteInvitation');

      // Mock auth user endpoint
      cy.intercept('GET', '**/auth/v1/user', {
        statusCode: 200,
        body: {
          id: 'test-user-id',
          email: invitedEmail,
          user_metadata: { full_name: 'Existing User' }
        }
      }).as('getAuthUser');
    });

    it('is expected to allow users to accept invitations to additional organizations', () => {
      cy.visit(`/invite/${validToken}`);
      cy.wait('@getInvitation');
      
      cy.contains(mockOrganization2.name).should('be.visible');
      cy.getByCy('accept-invitation-button').should('be.visible');
    });

    it('is expected to successfully join second organization', () => {
      cy.visit(`/invite/${validToken}`);
      cy.wait('@getInvitation');
      
      cy.getByCy('accept-invitation-button').click();
      
      cy.wait('@addMember');
      cy.getByCy('invitation-accepted').should('be.visible');
    });
  });

  describe('Admin User Multi-Organization', () => {
    beforeEach(() => {
      cy.login('admin', { 
        customOrganization: { ...mockOrganization1, role: 'owner' }
      });
    });

    it('is expected to show create organization button for admin users', () => {
      cy.getByCy('organization-switcher-button').click();
      cy.getByCy('create-new-organization-button').should('be.visible');
    });

    it('is expected to allow admin to create new organization', () => {
      cy.getByCy('organization-switcher-button').click();
      cy.getByCy('create-new-organization-button').click();
      
      // Wizard should open
      cy.contains('Set Up Your Organization').should('be.visible');
    });
  });

  describe('Swedish Language Support', () => {
    beforeEach(() => {
      cy.login('premiumUser', { 
        customOrganization: { ...mockOrganization1, role: 'owner' }
      });
      // Set Swedish language AFTER login and reload to apply it
      // (cy.login sets language to 'en' by default in onBeforeLoad)
      cy.window().then(win => {
        win.localStorage.setItem('language', 'sv');
      });
      cy.reload();
      cy.wait('@getOrganizations');
    });

    it.only('is expected to display Swedish translations in organization switcher', () => {
      cy.getByCy('organization-switcher-button').click();
      cy.getByCy('create-new-organization-button').contains('Skapa ny organisation');
    });

    it.only('is expected to display Swedish role names', () => {
      cy.getByCy('organization-switcher-button').click();
      cy.getByCy('organization-option').first().within(() => {
        cy.contains('Ägare').should('be.visible'); // Owner in Swedish
      });
    });
  });
});
