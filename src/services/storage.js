import { supabase } from './supabase';

/**
 * Storage Service
 * Handles file uploads and deletions to Supabase Storage
 * US-003: User Avatar Upload
 * US-053: Organization Logo Upload
 */

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml'];

/**
 * Validate image file before upload
 * @param {File} file - File object to validate
 * @returns {{ valid: boolean, error: string|null }}
 */
export const validateImageFile = (file) => {
  if (!file) {
    return { valid: false, error: 'No file provided' };
  }

  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return { 
      valid: false, 
      error: 'Invalid file type. Allowed types: JPEG, PNG, WebP, SVG' 
    };
  }

  if (file.size > MAX_FILE_SIZE) {
    return { 
      valid: false, 
      error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB` 
    };
  }

  return { valid: true, error: null };
};

/**
 * Upload a file to a Supabase storage bucket
 * @param {Object} params - Upload parameters
 * @param {string} params.bucket - Bucket name ('avatars' or 'logos')
 * @param {File} params.file - File to upload
 * @param {string} params.userId - User ID (for path organization)
 * @param {string} params.fileName - Optional custom file name
 * @returns {Promise<{data: {path: string, url: string}|null, error: Error|null}>}
 */
export const uploadFile = async ({ bucket, file, userId, fileName }) => {
  if (!supabase) {
    return { data: null, error: new Error('Supabase not configured') };
  }

  // Validate file
  const validation = validateImageFile(file);
  if (!validation.valid) {
    return { data: null, error: new Error(validation.error) };
  }

  // Generate unique file path
  const timestamp = Date.now();
  const fileExt = file.name.split('.').pop();
  const sanitizedFileName = fileName 
    ? `${fileName.replace(/[^a-zA-Z0-9-_]/g, '_')}.${fileExt}`
    : `${timestamp}.${fileExt}`;
  const filePath = `${userId}/${sanitizedFileName}`;

  try {
    // Upload file to storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true, // Replace if exists
      });

    if (uploadError) {
      return { data: null, error: uploadError };
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    return {
      data: {
        path: filePath,
        url: publicUrl,
      },
      error: null,
    };
  } catch (err) {
    return { data: null, error: err };
  }
};

/**
 * Delete a file from Supabase storage
 * @param {Object} params - Delete parameters
 * @param {string} params.bucket - Bucket name ('avatars' or 'logos')
 * @param {string} params.path - File path to delete
 * @returns {Promise<{data: {deleted: boolean}|null, error: Error|null}>}
 */
export const deleteFile = async ({ bucket, path }) => {
  if (!supabase) {
    return { data: null, error: new Error('Supabase not configured') };
  }

  if (!path) {
    return { data: { deleted: false }, error: null };
  }

  try {
    const { error: deleteError } = await supabase.storage
      .from(bucket)
      .remove([path]);

    if (deleteError) {
      return { data: null, error: deleteError };
    }

    return { data: { deleted: true }, error: null };
  } catch (err) {
    return { data: null, error: err };
  }
};

/**
 * Upload avatar for a user
 * @param {File} file - Avatar image file
 * @param {string} userId - User ID
 * @returns {Promise<{data: {path: string, url: string}|null, error: Error|null}>}
 */
export const uploadAvatar = async (file, userId) => {
  return uploadFile({
    bucket: 'avatars',
    file,
    userId,
    fileName: 'avatar',
  });
};

/**
 * Delete avatar for a user
 * @param {string} path - Avatar file path
 * @returns {Promise<{data: {deleted: boolean}|null, error: Error|null}>}
 */
export const deleteAvatar = async (path) => {
  return deleteFile({
    bucket: 'avatars',
    path,
  });
};

/**
 * Upload logo for an organization
 * @param {File} file - Logo image file
 * @param {string} userId - User ID (for path organization)
 * @returns {Promise<{data: {path: string, url: string}|null, error: Error|null}>}
 */
export const uploadLogo = async (file, userId) => {
  return uploadFile({
    bucket: 'logos',
    file,
    userId,
    fileName: 'logo',
  });
};

/**
 * Delete logo
 * @param {string} path - Logo file path
 * @returns {Promise<{data: {deleted: boolean}|null, error: Error|null}>}
 */
export const deleteLogo = async (path) => {
  return deleteFile({
    bucket: 'logos',
    path,
  });
};
