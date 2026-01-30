/// <reference types="cypress" />

/**
 * E2E Tests for User Avatar Upload (US-003)
 * Tests profile avatar upload, display, and deletion functionality
 */

describe('Profile Avatar Upload', () => {
  const mockProfile = {
    id: 'user-123',
    email: 'test@example.com',
    full_name: 'Test User',
    avatar_url: null,
  };

  beforeEach(() => {
    // Setup common intercepts
    cy.setupCommonIntercepts({ clients: [], products: [] });
    
    // Intercept profile fetch
    cy.intercept('GET', '**/rest/v1/profiles?id=eq.*', {
      statusCode: 200,
      body: [mockProfile],
    }).as('getProfile');

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
      cy.get('[data-cy="profile-avatar-placeholder"]').should('be.visible');
      
      // Should show upload button
      cy.get('[data-cy="profile-upload-avatar-button"]').should('be.visible');
      
      // Should NOT show remove button when no avatar
      cy.get('[data-cy="profile-remove-avatar-button"]').should('not.exist');
      
      // Should display profile info
      cy.get('[data-cy="profile-full-name"]').should('have.value', 'Test User');
      cy.get('[data-cy="profile-email"]').should('have.value', 'test@example.com');
    });

    it('is expected to upload an avatar successfully', () => {
      // Mock the upload and update operations
      cy.intercept('POST', '**/storage/v1/object/avatars/**', {
        statusCode: 200,
        body: { Key: 'avatars/user-123/avatar.jpg' },
      }).as('uploadAvatar');

      cy.intercept('PATCH', '**/rest/v1/profiles?id=eq.*', {
        statusCode: 200,
        body: [{
          ...mockProfile,
          avatar_url: 'https://example.com/avatars/user-123/avatar.jpg',
        }],
      }).as('updateProfile');

      // Select a file
      cy.get('[data-cy="profile-avatar-input"]').selectFile('cypress/fixtures/test-avatar.png', { force: true });

      // Wait for upload
      cy.wait('@uploadAvatar');
      cy.wait('@updateProfile');

      // Should show success message
      cy.get('[data-cy="profile-success"]').should('be.visible');
      cy.get('[data-cy="profile-success"]').should('contain', 'Avatar uploaded successfully');
    });

    it('is expected to display uploaded avatar image', () => {
      // Mock profile with avatar
      const profileWithAvatar = {
        ...mockProfile,
        avatar_url: 'https://example.com/avatars/user-123/avatar.jpg',
      };

      cy.intercept('GET', '**/rest/v1/profiles?id=eq.*', {
        statusCode: 200,
        body: [profileWithAvatar],
      }).as('getProfileWithAvatar');

      // Reload page
      cy.reload();
      cy.wait('@getProfileWithAvatar');

      // Should show avatar image instead of placeholder
      cy.get('[data-cy="profile-avatar-image"]').should('be.visible');
      cy.get('[data-cy="profile-avatar-image"]').should('have.attr', 'src', profileWithAvatar.avatar_url);
      
      // Should show remove button
      cy.get('[data-cy="profile-remove-avatar-button"]').should('be.visible');
    });

    it('is expected to delete avatar successfully', () => {
      // Mock profile with avatar
      const profileWithAvatar = {
        ...mockProfile,
        avatar_url: 'https://example.com/avatars/user-123/avatar.jpg',
      };

      cy.intercept('GET', '**/rest/v1/profiles?id=eq.*', {
        statusCode: 200,
        body: [profileWithAvatar],
      }).as('getProfileWithAvatar');

      cy.reload();
      cy.wait('@getProfileWithAvatar');

      // Mock delete operations
      cy.intercept('DELETE', '**/storage/v1/object/avatars/**', {
        statusCode: 200,
        body: { message: 'Deleted' },
      }).as('deleteAvatar');

      cy.intercept('PATCH', '**/rest/v1/profiles?id=eq.*', {
        statusCode: 200,
        body: [{
          ...mockProfile,
          avatar_url: null,
        }],
      }).as('updateProfileRemove');

      // Stub window.confirm to return true
      cy.window().then((win) => {
        cy.stub(win, 'confirm').returns(true);
      });

      // Click remove button
      cy.get('[data-cy="profile-remove-avatar-button"]').click();

      // Wait for operations
      cy.wait('@deleteAvatar');
      cy.wait('@updateProfileRemove');

      // Should show success message
      cy.get('[data-cy="profile-success"]').should('be.visible');
      cy.get('[data-cy="profile-success"]').should('contain', 'Avatar removed successfully');

      // Should show placeholder again
      cy.get('[data-cy="profile-avatar-placeholder"]').should('be.visible');
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

      // Should show error message
      cy.get('[data-cy="profile-error"]').should('be.visible');
      cy.get('[data-cy="profile-error"]').should('contain', 'Upload failed');
    });

    it('is expected to display error when avatar delete fails', () => {
      // Mock profile with avatar
      const profileWithAvatar = {
        ...mockProfile,
        avatar_url: 'https://example.com/avatars/user-123/avatar.jpg',
      };

      cy.intercept('GET', '**/rest/v1/profiles?id=eq.*', {
        statusCode: 200,
        body: [profileWithAvatar],
      }).as('getProfileWithAvatar');

      cy.reload();
      cy.wait('@getProfileWithAvatar');

      // Mock failed delete
      cy.intercept('DELETE', '**/storage/v1/object/avatars/**', {
        statusCode: 500,
        body: { error: 'Delete failed' },
      }).as('deleteAvatarFail');

      // Stub window.confirm
      cy.window().then((win) => {
        cy.stub(win, 'confirm').returns(true);
      });

      // Try to delete
      cy.get('[data-cy="profile-remove-avatar-button"]').click();

      cy.wait('@deleteAvatarFail');

      // Should show error message
      cy.get('[data-cy="profile-error"]').should('be.visible');
      cy.get('[data-cy="profile-error"]').should('contain', 'Delete failed');
    });

    it('is expected to handle cancel confirmation for avatar delete', () => {
      // Mock profile with avatar
      const profileWithAvatar = {
        ...mockProfile,
        avatar_url: 'https://example.com/avatars/user-123/avatar.jpg',
      };

      cy.intercept('GET', '**/rest/v1/profiles?id=eq.*', {
        statusCode: 200,
        body: [profileWithAvatar],
      }).as('getProfileWithAvatar');

      cy.reload();
      cy.wait('@getProfileWithAvatar');

      // Stub window.confirm to return false (cancel)
      cy.window().then((win) => {
        cy.stub(win, 'confirm').returns(false);
      });

      // Click remove button
      cy.get('[data-cy="profile-remove-avatar-button"]').click();

      // Avatar should still be visible (delete was cancelled)
      cy.get('[data-cy="profile-avatar-image"]').should('be.visible');
    });
  });
});
