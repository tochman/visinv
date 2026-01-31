import { BaseResource } from './BaseResource';

/**
 * OrganizationEmailSlugHistory Resource
 * Handles querying historical email slugs for organizations
 * US-264a: Organization Email Slug Management
 */
class OrganizationEmailSlugHistoryResource extends BaseResource {
  constructor() {
    super('organization_email_slug_history');
  }

  /**
   * Get all historical slugs for an organization
   * @param {string} organizationId - Organization ID
   * @returns {Promise<{data: Array|null, error: Error|null}>}
   */
  async getByOrganization(organizationId) {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    return { data, error };
  }

  /**
   * Check if a slug is available (not used by any organization)
   * @param {string} slug - Slug to check
   * @param {string} excludeOrgId - Organization ID to exclude from check (for updates)
   * @returns {Promise<{available: boolean, error: Error|null}>}
   */
  async isSlugAvailable(slug, excludeOrgId = null) {
    // Check reserved slugs
    const reservedSlugs = [
      'admin', 'support', 'billing', 'help', 'info', 'noreply',
      'postmaster', 'abuse', 'security', 'sales', 'contact',
      'system', 'test', 'invoice', 'invoices', 'mail', 'email',
      'dortal', 'svethna', 'api', 'app', 'www', 'ftp', 'smtp'
    ];

    if (reservedSlugs.includes(slug.toLowerCase())) {
      return { available: false, error: null };
    }

    // Check current slugs in organizations table
    let query = this.supabase
      .from('organizations')
      .select('id')
      .eq('email_slug', slug);

    if (excludeOrgId) {
      query = query.neq('id', excludeOrgId);
    }

    const { data: currentOrgs, error: currentError } = await query;
    if (currentError) {
      return { available: false, error: currentError };
    }

    if (currentOrgs && currentOrgs.length > 0) {
      return { available: false, error: null };
    }

    // Check historical slugs
    let historyQuery = this.supabase
      .from(this.tableName)
      .select('id')
      .eq('slug', slug);

    if (excludeOrgId) {
      historyQuery = historyQuery.neq('organization_id', excludeOrgId);
    }

    const { data: historyOrgs, error: historyError } = await historyQuery;
    if (historyError) {
      return { available: false, error: historyError };
    }

    if (historyOrgs && historyOrgs.length > 0) {
      return { available: false, error: null };
    }

    return { available: true, error: null };
  }

  /**
   * Generate a slug from organization name
   * Follows same rules as database function:
   * - Transliterate Swedish characters
   * - Lowercase, replace spaces with underscores
   * - Remove special characters
   * - Truncate to 50 chars
   * @param {string} name - Organization name
   * @returns {string} - Generated slug
   */
  generateSlug(name) {
    if (!name || name.trim() === '') {
      return 'organization';
    }

    let slug = name;

    // Transliterate Swedish characters
    const swedishMap = { 'å': 'a', 'ä': 'a', 'ö': 'o', 'Å': 'A', 'Ä': 'A', 'Ö': 'O' };
    slug = slug.replace(/[åäöÅÄÖ]/g, (char) => swedishMap[char] || char);

    // Transliterate other common diacritics
    const diacriticsMap = {
      'à': 'a', 'á': 'a', 'â': 'a', 'ã': 'a', 'é': 'e', 'è': 'e', 'ê': 'e', 'ë': 'e',
      'í': 'i', 'ì': 'i', 'î': 'i', 'ï': 'i', 'ó': 'o', 'ò': 'o', 'ô': 'o', 'õ': 'o',
      'ú': 'u', 'ù': 'u', 'û': 'u', 'ü': 'u', 'ñ': 'n', 'ç': 'c',
      'À': 'A', 'Á': 'A', 'Â': 'A', 'Ã': 'A', 'É': 'E', 'È': 'E', 'Ê': 'E', 'Ë': 'E',
      'Í': 'I', 'Ì': 'I', 'Î': 'I', 'Ï': 'I', 'Ó': 'O', 'Ò': 'O', 'Ô': 'O', 'Õ': 'O',
      'Ú': 'U', 'Ù': 'U', 'Û': 'U', 'Ü': 'U', 'Ñ': 'N', 'Ç': 'C'
    };
    slug = slug.replace(/[àáâãéèêëíìîïóòôõúùûüñçÀÁÂÃÉÈÊËÍÌÎÏÓÒÔÕÚÙÛÜÑÇ]/g, 
      (char) => diacriticsMap[char] || char);

    // Convert to lowercase
    slug = slug.toLowerCase();

    // Replace spaces and common separators with underscores
    slug = slug.replace(/[\s\-.]+/g, '_');

    // Remove all non-alphanumeric characters except underscores
    slug = slug.replace(/[^a-z0-9_]/g, '');

    // Remove consecutive underscores
    slug = slug.replace(/_+/g, '_');

    // Remove leading/trailing underscores
    slug = slug.replace(/^_+|_+$/g, '');

    // Truncate to 50 characters at word boundary
    if (slug.length > 50) {
      slug = slug.substring(0, 50);
      const lastUnderscore = slug.lastIndexOf('_');
      if (lastUnderscore > 30) {
        slug = slug.substring(0, lastUnderscore);
      }
    }

    // Ensure minimum length
    if (slug.length < 3) {
      slug = slug + '_org';
    }

    return slug;
  }

  /**
   * Validate a slug format
   * @param {string} slug - Slug to validate
   * @returns {{ valid: boolean, error: string|null }}
   */
  validateSlugFormat(slug) {
    if (!slug || slug.trim() === '') {
      return { valid: false, error: 'Slug cannot be empty' };
    }

    if (slug.length < 3) {
      return { valid: false, error: 'Slug must be at least 3 characters' };
    }

    if (slug.length > 50) {
      return { valid: false, error: 'Slug cannot exceed 50 characters' };
    }

    if (!/^[a-z0-9_]+$/.test(slug)) {
      return { valid: false, error: 'Slug can only contain lowercase letters, numbers, and underscores' };
    }

    if (slug.startsWith('_') || slug.endsWith('_')) {
      return { valid: false, error: 'Slug cannot start or end with an underscore' };
    }

    if (/__/.test(slug)) {
      return { valid: false, error: 'Slug cannot contain consecutive underscores' };
    }

    return { valid: true, error: null };
  }
}

// Export singleton instance
export const OrganizationEmailSlugHistory = new OrganizationEmailSlugHistoryResource();
