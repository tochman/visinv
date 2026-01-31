import { useTranslation } from 'react-i18next';
import { useState, useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { Profile } from '../../services/resources/Profile';
import { updateProficiency } from '../../features/auth/authSlice';
import { useToast } from '../../context/ToastContext';
import ProficiencySelector from '../common/ProficiencySelector';
import { ArrowUpTrayIcon, TrashIcon } from '@heroicons/react/24/outline';

export default function ProfileSettings() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const toast = useToast();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingProficiency, setSavingProficiency] = useState(false);
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
      toast.error(profileError.message);
    } else {
      setProfile(data);
    }
    
    setLoading(false);
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);

    const { data, error: uploadError } = await Profile.uploadAvatarImage(file);

    if (uploadError) {
      toast.error(uploadError.message);
    } else {
      toast.success(t('profile.avatarUploadSuccess'));
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

    const { data, error: deleteError } = await Profile.deleteAvatarImage();

    if (deleteError) {
      toast.error(deleteError.message);
    } else {
      toast.success(t('profile.avatarDeleteSuccess'));
      setProfile(data);
    }

    setUploading(false);
  };

  const handleNameSave = async () => {
    setSaving(true);

    const { data, error: updateError } = await Profile.updateCurrent({
      full_name: fullName.trim(),
    });

    if (updateError) {
      toast.error(updateError.message);
    } else {
      toast.success(t('profile.updateSuccess'));
      setProfile(data);
      setIsEditingName(false);
    }

    setSaving(false);
  };

  const handleNameCancel = () => {
    setFullName(profile?.full_name || '');
    setIsEditingName(false);
  };

  const handleProficiencyChange = async (level) => {
    setSavingProficiency(true);

    const { data, error: updateError } = await Profile.updateProficiency(level);

    if (updateError) {
      toast.error(updateError.message);
    } else {
      toast.success(t('profile.proficiencyUpdateSuccess'));
      setProfile(data);
      // Also update Redux state
      dispatch(updateProficiency(level));
    }

    setSavingProficiency(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-sm shadow-md p-4 sm:p-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
        {t('profile.title')}
      </h2>

      {/* Responsive two-column layout: stacked on mobile, side-by-side on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column: Avatar + Personal Info (stacked vertically) */}
        <div className="space-y-8">
          {/* Avatar Section */}
          <div className="lg:border-r lg:border-gray-200 lg:dark:border-gray-700 lg:pr-8">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              {t('profile.avatar')}
            </h3>

            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
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
              <div className="flex-1 text-center sm:text-left">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  {t('profile.avatarHint')}
                </p>

                <div className="flex justify-center sm:justify-start space-x-2">
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
                    title={profile?.avatar_url ? t('profile.changeAvatar') : t('profile.uploadAvatar')}
                    className="p-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 rounded-sm transition-colors"
                    data-cy="profile-upload-avatar-button"
                  >
                    <ArrowUpTrayIcon className="w-5 h-5" />
                  </button>

                  {profile?.avatar_url && (
                    <button
                      type="button"
                      onClick={handleAvatarRemove}
                      disabled={uploading}
                      title={t('profile.removeAvatar')}
                      className="p-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 rounded-sm transition-colors"
                      data-cy="profile-remove-avatar-button"
                    >
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Personal Info Section - same column, below avatar */}
          <div className="lg:border-r lg:border-gray-200 lg:dark:border-gray-700 lg:pr-8">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              {t('profile.personalInfo')}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('profile.fullName')}
                </label>
                {isEditingName ? (
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                      data-cy="profile-full-name-input"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleNameSave}
                        disabled={saving}
                        className="flex-1 sm:flex-none px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium rounded-sm transition-colors"
                        data-cy="profile-save-name-button"
                      >
                        {saving ? t('common.saving') : t('common.save')}
                      </button>
                      <button
                        type="button"
                        onClick={handleNameCancel}
                        disabled={saving}
                        className="flex-1 sm:flex-none px-4 py-2 bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-900 dark:text-white text-sm font-medium rounded-sm transition-colors"
                        data-cy="profile-cancel-name-button"
                      >
                        {t('common.cancel')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row gap-2">
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
                      className="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-sm transition-colors"
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

        {/* Right Column: Proficiency */}
        <div>
          <div data-cy="profile-proficiency-section">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {t('profile.proficiencyLevel')}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {t('profile.proficiencyDescription')}
            </p>
            <ProficiencySelector
              value={profile?.proficiency_level || 'novice'}
              onChange={handleProficiencyChange}
              loading={savingProficiency}
              compact={false}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
