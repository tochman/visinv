/// <reference types="cypress" />

/**
 * E2E Tests for User Avatar Upload (US-003)
 * Tests profile avatar upload, display, and deletion functionality
 */

describe('Profile Avatar Upload', () => {
  // Use admin user data from cy.login('admin') - must match commands.js
  const mockProfile = {
    id: 'test-admin-user-id',
    email: 'admin@test.com',
    full_name: 'Admin User',
    is_admin: true,
    plan_type: 'premium',
    avatar_url: null,
  };

  beforeEach(() => {
    // Setup common intercepts
    cy.setupCommonIntercepts({ clients: [], products: [] });

    // Login and navigate to settings
    cy.login('admin');
    
    cy.visit('/settings');
    
    // Click on Profile tab
    cy.get('[data-cy="tab-profile"]').click();
    cy.wait('@getProfile');
  });

  describe('Happy Path - Success Scenarios', () => {
    it('is expected to display the profile settings page with avatar placeholder', () => {
      // Should show placeholder when no avatar exists
      cy.get('[data-cy="profile-avatar-placeholder"]').should('exist');
      
      // Should show upload button
      cy.get('[data-cy="profile-upload-avatar-button"]').should('exist');
      
      // Should NOT show remove button when no avatar
      cy.get('[data-cy="profile-remove-avatar-button"]').should('not.exist');
      
      // Should display profile info from admin user
      cy.get('[data-cy="profile-full-name"]').should('have.value', 'Admin User');
      cy.get('[data-cy="profile-email"]').should('have.value', 'admin@test.com');
    });

    it('is expected to upload an avatar successfully', () => {
      // Mock the upload and update operations
      cy.intercept('POST', '**/storage/v1/object/avatars/**', {
        statusCode: 200,
        body: { Key: 'avatars/user-123/avatar.jpg' },
      }).as('uploadAvatar');

      // PATCH returns single object
      cy.intercept('PATCH', '**/rest/v1/profiles?id=eq.*', {
        statusCode: 200,
        body: {
          ...mockProfile,
          avatar_url: 'https://example.com/avatars/user-123/avatar.jpg',
        },
      }).as('updateProfile');

      // Select a file
      cy.get('[data-cy="profile-avatar-input"]').selectFile('cypress/fixtures/test-avatar.png', { force: true });

      // Wait for upload
      cy.wait('@uploadAvatar');
      cy.wait('@updateProfile');

      // Should show success toast
      cy.get('[data-cy="toast-success"]').should('exist');
      cy.get('[data-cy="toast-success"]').should('contain', 'Avatar uploaded successfully');
    });

    it('is expected to display uploaded avatar image', () => {
      // Mock profile with avatar - set up BEFORE visit
      const profileWithAvatar = {
        ...mockProfile,
        avatar_url: 'https://example.com/avatars/test-admin-user-id/avatar.jpg',
      };

      // Override the profile intercept from login with one that has avatar
      cy.intercept('GET', '**/rest/v1/profiles*', {
        statusCode: 200,
        body: profileWithAvatar,
      }).as('getProfileWithAvatar');

      // Visit settings fresh (avoid reload which clears intercepts)
      cy.visit('/settings');
      cy.get('[data-cy="tab-profile"]').click();
      cy.wait('@getProfileWithAvatar');

      // Should show avatar image instead of placeholder
      cy.get('[data-cy="profile-avatar-image"]').should('exist');
      cy.get('[data-cy="profile-avatar-image"]').should('have.attr', 'src', profileWithAvatar.avatar_url);
      
      // Should show remove button
      cy.get('[data-cy="profile-remove-avatar-button"]').should('exist');
    });

    it('is expected to delete avatar successfully', () => {
      // Mock profile with avatar
      const profileWithAvatar = {
        ...mockProfile,
        avatar_url: 'https://example.com/storage/v1/object/public/avatars/test-admin-user-id/avatar.jpg',
      };

      // Override the profile intercept from login with one that has avatar
      cy.intercept('GET', '**/rest/v1/profiles*', {
        statusCode: 200,
        body: profileWithAvatar,
      }).as('getProfileWithAvatar');

      // Mock storage remove - Supabase storage uses this pattern
      cy.intercept('DELETE', '**/storage/**', {
        statusCode: 200,
        body: { message: 'Deleted' },
      }).as('deleteAvatar');

      // PATCH returns single object
      cy.intercept('PATCH', '**/rest/v1/profiles*', {
        statusCode: 200,
        body: {
          ...mockProfile,
          avatar_url: null,
        },
      }).as('updateProfileRemove');

      // Handle confirm dialog automatically
      cy.on('window:confirm', () => true);

      // Visit settings fresh
      cy.visit('/settings');
      cy.get('[data-cy="tab-profile"]').click();
      cy.wait('@getProfileWithAvatar');

      // Verify avatar is displayed
      cy.get('[data-cy="profile-avatar-image"]').should('exist');
      cy.get('[data-cy="profile-remove-avatar-button"]').should('exist');

      // Click remove button
      cy.get('[data-cy="profile-remove-avatar-button"]').click();

      // Wait for operations
      cy.wait('@deleteAvatar');
      cy.wait('@updateProfileRemove');

      // Should show success toast
      cy.get('[data-cy="toast-success"]').should('exist');
      cy.get('[data-cy="toast-success"]').should('contain', 'Avatar removed successfully');

      // Should show placeholder again
      cy.get('[data-cy="profile-avatar-placeholder"]').should('exist');
    });
  });

  describe('Sad Path - Error Scenarios', () => {
    it('is expected to display error when avatar upload fails', () => {
      // Mock failed upload
      cy.intercept('POST', '**/storage/v1/object/avatars/**', {
        statusCode: 500,
        body: { error: 'Upload failed' },
      }).as('uploadAvatarFail');

      // Try to upload
      cy.get('[data-cy="profile-avatar-input"]').selectFile('cypress/fixtures/test-avatar.png', { force: true });

      cy.wait('@uploadAvatarFail');

      // Should show error toast
      cy.get('[data-cy="toast-error"]').should('exist');
    });

    it('is expected to display error when avatar delete fails', () => {
      // Mock profile with avatar
      const profileWithAvatar = {
        ...mockProfile,
        avatar_url: 'https://example.com/storage/v1/object/public/avatars/test-admin-user-id/avatar.jpg',
      };

      // Override the profile intercept from login with one that has avatar
      cy.intercept('GET', '**/rest/v1/profiles*', {
        statusCode: 200,
        body: profileWithAvatar,
      }).as('getProfileWithAvatar');

      // Mock failed delete - use broader pattern
      cy.intercept('DELETE', '**/storage/**', {
        statusCode: 500,
        body: { error: 'Delete failed' },
      }).as('deleteAvatarFail');

      // Handle confirm dialog automatically
      cy.on('window:confirm', () => true);

      // Visit settings fresh
      cy.visit('/settings');
      cy.get('[data-cy="tab-profile"]').click();
      cy.wait('@getProfileWithAvatar');

      // Try to delete
      cy.get('[data-cy="profile-remove-avatar-button"]').click();

      cy.wait('@deleteAvatarFail');

      // Should show error toast
      cy.get('[data-cy="toast-error"]').should('exist');
    });

    it('is expected to handle cancel confirmation for avatar delete', () => {
      // Mock profile with avatar
      const profileWithAvatar = {
        ...mockProfile,
        avatar_url: 'https://example.com/avatars/test-admin-user-id/avatar.jpg',
      };

      // Override the profile intercept from login with one that has avatar
      cy.intercept('GET', '**/rest/v1/profiles*', {
        statusCode: 200,
        body: profileWithAvatar,
      }).as('getProfileWithAvatar');

      // Visit settings fresh
      cy.visit('/settings');
      cy.get('[data-cy="tab-profile"]').click();
      cy.wait('@getProfileWithAvatar');

      // Stub window.confirm to return false (cancel)
      cy.window().then((win) => {
        cy.stub(win, 'confirm').returns(false);
      });

      // Click remove button
      cy.get('[data-cy="profile-remove-avatar-button"]').click();

      // Avatar should still be visible (delete was cancelled)
      cy.get('[data-cy="profile-avatar-image"]').should('exist');
    });
  });
});
