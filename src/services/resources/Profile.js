import { BaseResource } from './BaseResource';
import { uploadAvatar, deleteAvatar } from '../storage';

/**
 * Profile Resource
 * Handles user profile data operations
 * US-003: User Avatar Upload
 */
class ProfileResource extends BaseResource {
  constructor() {
    super('profiles');
  }

  /**
   * Get current user's profile
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  async getCurrent() {
    const { user, error: authError } = await this.getCurrentUser();
    if (authError || !user) {
      return { data: null, error: authError || new Error('Not authenticated') };
    }

    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('id', user.id)
      .single();

    return { data, error };
  }

  /**
   * Update current user's profile
   * @param {Object} updates - Profile fields to update
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  async updateCurrent(updates) {
    const { user, error: authError } = await this.getCurrentUser();
    if (authError || !user) {
      return { data: null, error: authError || new Error('Not authenticated') };
    }

    const { data, error } = await this.supabase
      .from(this.tableName)
      .update(updates)
      .eq('id', user.id)
      .select()
      .single();

    return { data, error };
  }

  /**
   * Upload avatar for current user
   * US-003: User Avatar Upload
   * @param {File} file - Avatar image file
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  async uploadAvatarImage(file) {
    const { user, error: authError } = await this.getCurrentUser();
    if (authError || !user) {
      return { data: null, error: authError || new Error('Not authenticated') };
    }

    // Get current profile to delete old avatar if exists
    const { data: profile } = await this.getCurrent();
    const oldAvatarPath = profile?.avatar_url ? this.extractPathFromUrl(profile.avatar_url) : null;

    // Upload new avatar
    const { data: uploadData, error: uploadError } = await uploadAvatar(file, user.id);
    if (uploadError) {
      return { data: null, error: uploadError };
    }

    // Update profile with new avatar URL
    const { data, error } = await this.updateCurrent({
      avatar_url: uploadData.url,
    });

    if (error) {
      // Rollback: delete uploaded file if profile update fails
      await deleteAvatar(uploadData.path);
      return { data: null, error };
    }

    // Delete old avatar if it existed
    if (oldAvatarPath) {
      await deleteAvatar(oldAvatarPath);
    }

    return { data, error: null };
  }

  /**
   * Delete avatar for current user
   * US-003: User Avatar Upload
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  async deleteAvatarImage() {
    const { user, error: authError } = await this.getCurrentUser();
    if (authError || !user) {
      return { data: null, error: authError || new Error('Not authenticated') };
    }

    // Get current profile
    const { data: profile, error: profileError } = await this.getCurrent();
    if (profileError) {
      return { data: null, error: profileError };
    }

    if (!profile?.avatar_url) {
      return { data: profile, error: null }; // Nothing to delete
    }

    const avatarPath = this.extractPathFromUrl(profile.avatar_url);

    // Delete from storage
    const { error: deleteError } = await deleteAvatar(avatarPath);
    if (deleteError) {
      return { data: null, error: deleteError };
    }

    // Update profile to remove avatar URL
    const { data, error } = await this.updateCurrent({
      avatar_url: null,
    });

    return { data, error };
  }

  /**
   * Extract storage path from public URL
   * @param {string} url - Public URL
   * @returns {string|null} - Storage path
   */
  extractPathFromUrl(url) {
    if (!url) return null;
    
    // Extract path from URL like:
    // https://xxx.supabase.co/storage/v1/object/public/avatars/user-id/avatar.jpg
    const match = url.match(/\/avatars\/(.*)/);
    return match ? match[1] : null;
  }

  /**
   * Update proficiency level for current user
   * US-124: User Proficiency Level & Adaptive UI
   * @param {string} level - One of: 'novice', 'basic', 'proficient', 'expert'
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  async updateProficiency(level) {
    const validLevels = ['novice', 'basic', 'proficient', 'expert'];
    if (!validLevels.includes(level)) {
      return { data: null, error: new Error(`Invalid proficiency level: ${level}. Must be one of: ${validLevels.join(', ')}`) };
    }

    return this.updateCurrent({
      proficiency_level: level,
      proficiency_set_at: new Date().toISOString(),
    });
  }
}

// Export singleton instance
export const Profile = new ProfileResource();
