import { useTranslation } from 'react-i18next';
import { useState, useEffect, useRef } from 'react';
import { Profile } from '../../services/resources/Profile';

export default function ProfileSettings() {
  const { t } = useTranslation();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [fullName, setFullName] = useState('');
  const fileInputRef = useRef(null);

  // Fetch profile on mount
  useEffect(() => {
    loadProfile();
  }, []);

  // Update local state when profile changes
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
    }
  }, [profile]);

  const loadProfile = async () => {
    setLoading(true);
    const { data, error: profileError } = await Profile.getCurrent();
    
    if (profileError) {
      setError(profileError.message);
    } else {
      setProfile(data);
    }
    
    setLoading(false);
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    setSuccess('');

    const { data, error: uploadError } = await Profile.uploadAvatarImage(file);

    if (uploadError) {
      setError(uploadError.message);
    } else {
      setSuccess(t('profile.avatarUploadSuccess'));
      setProfile(data);
    }

    setUploading(false);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleAvatarRemove = async () => {
    if (!window.confirm(t('profile.confirmDeleteAvatar'))) {
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess('');

    const { data, error: deleteError } = await Profile.deleteAvatarImage();

    if (deleteError) {
      setError(deleteError.message);
    } else {
      setSuccess(t('profile.avatarDeleteSuccess'));
      setProfile(data);
    }

    setUploading(false);
  };

  const handleNameSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess('');

    const { data, error: updateError } = await Profile.updateCurrent({
      full_name: fullName.trim(),
    });

    if (updateError) {
      setError(updateError.message);
    } else {
      setSuccess(t('profile.updateSuccess'));
      setProfile(data);
      setIsEditingName(false);
    }

    setSaving(false);
  };

  const handleNameCancel = () => {
    setFullName(profile?.full_name || '');
    setIsEditingName(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-sm shadow-md p-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
        {t('profile.title')}
      </h2>

      {/* Error Message */}
      {error && (
        <div data-cy="profile-error" className="mb-4 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-sm">
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div data-cy="profile-success" className="mb-4 p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-sm">
          <p className="text-green-600 dark:text-green-400">{success}</p>
        </div>
      )}

      {/* Avatar Section */}
      <div className="mb-8 pb-8 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          {t('profile.avatar')}
        </h3>

        <div className="flex items-start space-x-6">
          {/* Avatar Display */}
          <div className="flex-shrink-0">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.full_name || t('profile.avatar')}
                className="w-24 h-24 rounded-full object-cover border-2 border-gray-200 dark:border-gray-700"
                data-cy="profile-avatar-image"
              />
            ) : (
              <div 
                className="w-24 h-24 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center"
                data-cy="profile-avatar-placeholder"
              >
                <svg className="w-12 h-12 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            )}
          </div>

          {/* Avatar Controls */}
          <div className="flex-1">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              {t('profile.avatarHint')}
            </p>

            <div className="flex space-x-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={handleAvatarChange}
                className="hidden"
                data-cy="profile-avatar-input"
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium rounded-sm transition-colors"
                data-cy="profile-upload-avatar-button"
              >
                {uploading ? t('common.saving') : (profile?.avatar_url ? t('profile.changeAvatar') : t('profile.uploadAvatar'))}
              </button>

              {profile?.avatar_url && (
                <button
                  type="button"
                  onClick={handleAvatarRemove}
                  disabled={uploading}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white text-sm font-medium rounded-sm transition-colors"
                  data-cy="profile-remove-avatar-button"
                >
                  {t('profile.removeAvatar')}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Personal Info Section */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          {t('profile.personalInfo')}
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('profile.fullName')}
            </label>
            {isEditingName ? (
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  data-cy="profile-full-name-input"
                />
                <button
                  type="button"
                  onClick={handleNameSave}
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium rounded-sm transition-colors"
                  data-cy="profile-save-name-button"
                >
                  {saving ? t('common.saving') : t('common.save')}
                </button>
                <button
                  type="button"
                  onClick={handleNameCancel}
                  disabled={saving}
                  className="px-4 py-2 bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-900 dark:text-white text-sm font-medium rounded-sm transition-colors"
                  data-cy="profile-cancel-name-button"
                >
                  {t('common.cancel')}
                </button>
              </div>
            ) : (
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={profile?.full_name || ''}
                  readOnly
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white cursor-not-allowed"
                  data-cy="profile-full-name"
                />
                <button
                  type="button"
                  onClick={() => setIsEditingName(true)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-sm transition-colors"
                  data-cy="profile-edit-name-button"
                >
                  {t('common.edit')}
                </button>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('profile.email')}
            </label>
            <input
              type="email"
              value={profile?.email || ''}
              readOnly
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white cursor-not-allowed"
              data-cy="profile-email"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {t('profile.emailReadonly')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
