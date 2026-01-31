/// <reference types="cypress" />

/**
 * E2E Tests for Profile Proficiency Level Settings (US-124)
 * Tests ability to view and update proficiency level in profile settings
 */

describe('Profile Proficiency Level', () => {
  const mockProfile = {
    id: 'user-123',
    email: 'test@example.com',
    full_name: 'Test User',
    avatar_url: null,
    proficiency_level: 'novice',
  };

  beforeEach(() => {
    // Setup common intercepts
    cy.setupCommonIntercepts({ clients: [], products: [] });

    // Intercept profile fetch - uses .single() so returns object
    cy.intercept('GET', '**/rest/v1/profiles?id=eq.*', {
      statusCode: 200,
      body: mockProfile,
    }).as('getProfile');

    // Login and navigate to settings
    cy.login('admin');

    cy.visit('/settings');

    // Click on Profile tab
    cy.get('[data-cy="tab-profile"]').click();
    cy.wait('@getProfile');
    
    // Scroll proficiency section into view
    cy.get('[data-cy="profile-proficiency-section"]').scrollIntoView();
  });

  describe('Happy Path - Success Scenarios', () => {
    it('is expected to display the proficiency section with current level', () => {
      // Should show proficiency section
      cy.get('[data-cy="profile-proficiency-section"]').should('exist');

      // Should show section title
      cy.get('[data-cy="profile-proficiency-section"]')
        .find('h3')
        .should('contain', 'Experience Level');

      // Should have proficiency selector
      cy.get('[data-cy="proficiency-selector"]').should('exist');

      // Current level (novice) should be selected
      cy.get('[data-cy="proficiency-option-novice"]').should(
        'have.attr',
        'aria-selected',
        'true'
      );
    });

    it('is expected to show all four proficiency levels', () => {
      cy.get('[data-cy="proficiency-option-novice"]').should('exist');
      cy.get('[data-cy="proficiency-option-basic"]').should('exist');
      cy.get('[data-cy="proficiency-option-proficient"]').should('exist');
      cy.get('[data-cy="proficiency-option-expert"]').should('exist');
    });

    it('is expected to display journey-focused labels', () => {
      // Should show journey-focused labels, not technical terms
      cy.get('[data-cy="proficiency-option-novice"]').should(
        'contain',
        'Getting Started'
      );
      cy.get('[data-cy="proficiency-option-basic"]').should(
        'contain',
        'Building Confidence'
      );
      cy.get('[data-cy="proficiency-option-proficient"]').should(
        'contain',
        'Taking Control'
      );
      cy.get('[data-cy="proficiency-option-expert"]').should(
        'contain',
        'Full Power'
      );
    });

    it('is expected to update proficiency level successfully', () => {
      // Mock the update operation - returns single object, not array
      cy.intercept('PATCH', '**/rest/v1/profiles?id=eq.*', {
        statusCode: 200,
        body: {
          ...mockProfile,
          proficiency_level: 'proficient',
        },
      }).as('updateProfile');

      // Click on a different proficiency level
      cy.get('[data-cy="proficiency-option-proficient"]').click();

      // Wait for update
      cy.wait('@updateProfile');

      // Should show success toast
      cy.get('[data-cy="toast-success"]').should('exist');
      cy.get('[data-cy="toast-success"]').should(
        'contain',
        'Experience level updated'
      );

      // New level should be selected - wait for the DOM to update
      cy.get('[data-cy="proficiency-option-proficient"]', { timeout: 5000 }).should(
        'have.attr',
        'aria-selected',
        'true'
      );
    });

    it('is expected to persist proficiency selection on page reload', () => {
      // Update mock profile to return updated proficiency
      const updatedProfile = { ...mockProfile, proficiency_level: 'expert' };

      // PATCH returns single object (uses .single())
      cy.intercept('PATCH', '**/rest/v1/profiles?id=eq.*', {
        statusCode: 200,
        body: updatedProfile,
      }).as('updateProfile');

      // Change to expert
      cy.get('[data-cy="proficiency-option-expert"]').click();
      cy.wait('@updateProfile');

      // Setup intercept BEFORE tab switch - GET also uses .single() so returns object
      cy.intercept('GET', '**/rest/v1/profiles*', {
        statusCode: 200,
        body: updatedProfile,
      }).as('getUpdatedProfile');

      // Switch tabs to trigger profile reload
      cy.get('[data-cy="tab-settings"]').click(); // Switch tab
      cy.get('[data-cy="tab-profile"]').click(); // Switch back to reload profile
      cy.wait('@getUpdatedProfile');
      
      // Scroll into view again
      cy.get('[data-cy="profile-proficiency-section"]').scrollIntoView();

      // Expert should still be selected
      cy.get('[data-cy="proficiency-option-expert"]').should(
        'have.attr',
        'aria-selected',
        'true'
      );
    });
  });

  describe('Sad Path - Error Scenarios', () => {
    it('is expected to display error toast when update fails', () => {
      // Mock the update to fail
      cy.intercept('PATCH', '**/rest/v1/profiles?id=eq.*', {
        statusCode: 500,
        body: { message: 'Database error' },
      }).as('updateProfileError');

      // Try to change proficiency level
      cy.get('[data-cy="proficiency-option-expert"]').click();

      // Wait for failed update
      cy.wait('@updateProfileError');

      // Should show error toast
      cy.get('[data-cy="toast-error"]').should('exist');
    });
  });

  describe('Edge Cases', () => {
    it('is expected to handle profile without proficiency_level (default to novice)', () => {
      // Mock profile without proficiency_level field
      const profileWithoutProficiency = {
        id: 'user-456',
        email: 'new@example.com',
        full_name: 'New User',
        avatar_url: null,
        // No proficiency_level field - component defaults to 'novice'
      };

      // Setup intercept for when we switch tabs - uses .single() so returns object
      cy.intercept('GET', '**/rest/v1/profiles*', {
        statusCode: 200,
        body: profileWithoutProficiency,
      }).as('getProfileNoProficiency');

      // Switch tabs to reload profile data
      cy.get('[data-cy="tab-settings"]').click(); // Switch away
      cy.get('[data-cy="tab-profile"]').click(); // Switch back
      cy.wait('@getProfileNoProficiency');
      
      // Scroll into view
      cy.get('[data-cy="profile-proficiency-section"]').scrollIntoView();

      // Should default to novice
      cy.get('[data-cy="proficiency-option-novice"]').should(
        'have.attr',
        'aria-selected',
        'true'
      );
    });
  });
});
