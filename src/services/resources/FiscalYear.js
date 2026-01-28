import { BaseResource } from './BaseResource';

/**
 * FiscalYear Resource
 * Handles fiscal year/räkenskapsår data operations
 */
class FiscalYearResource extends BaseResource {
  constructor() {
    super('fiscal_years');
  }

  /**
   * Get all fiscal years for an organization
   * @param {string} organizationId - Organization ID
   * @returns {Promise<{data: Array|null, error: Error|null}>}
   */
  async index(organizationId) {
    if (!organizationId) {
      return { data: null, error: new Error('Organization ID is required') };
    }

    return super.index({
      select: '*',
      filters: [{ column: 'organization_id', value: organizationId }],
      order: 'start_date',
      ascending: false,
    });
  }

  /**
   * Get the current/active fiscal year for an organization
   * @param {string} organizationId - Organization ID
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  async current(organizationId) {
    if (!organizationId) {
      return { data: null, error: new Error('Organization ID is required') };
    }

    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('organization_id', organizationId)
      .lte('start_date', today)
      .gte('end_date', today)
      .single();

    return { data, error };
  }

  /**
   * Get open (non-closed) fiscal years
   * @param {string} organizationId - Organization ID
   * @returns {Promise<{data: Array|null, error: Error|null}>}
   */
  async open(organizationId) {
    if (!organizationId) {
      return { data: null, error: new Error('Organization ID is required') };
    }

    return super.index({
      select: '*',
      filters: [
        { column: 'organization_id', value: organizationId },
        { column: 'is_closed', value: false },
      ],
      order: 'start_date',
      ascending: false,
    });
  }

  /**
   * Create a new fiscal year
   * @param {Object} attributes - Fiscal year attributes
   * @param {string} attributes.organization_id - Organization ID
   * @param {string} attributes.name - Display name (e.g., "2024")
   * @param {string} attributes.start_date - Start date (YYYY-MM-DD)
   * @param {string} attributes.end_date - End date (YYYY-MM-DD)
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  async create(attributes) {
    // Don't auto-add user_id as fiscal_years doesn't have that column
    return super.create(attributes, false);
  }

  /**
   * Close a fiscal year
   * @param {string} id - Fiscal year ID
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  async close(id) {
    const { user, error: authError } = await this.getCurrentUser();
    if (authError || !user) {
      return { data: null, error: authError || new Error('Not authenticated') };
    }

    return this.update(id, {
      is_closed: true,
      closed_at: new Date().toISOString(),
      closed_by: user.id,
    });
  }

  /**
   * Reopen a fiscal year (admin only)
   * @param {string} id - Fiscal year ID
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  async reopen(id) {
    return this.update(id, {
      is_closed: false,
      closed_at: null,
      closed_by: null,
    });
  }

  /**
   * Get next verification number for a fiscal year
   * Uses database function for atomic increment
   * @param {string} organizationId - Organization ID
   * @param {string} fiscalYearId - Fiscal year ID
   * @returns {Promise<{data: number|null, error: Error|null}>}
   */
  async getNextVerificationNumber(organizationId, fiscalYearId) {
    const { data, error } = await this.supabase.rpc('get_next_verification_number', {
      p_organization_id: organizationId,
      p_fiscal_year_id: fiscalYearId,
    });

    return { data, error };
  }
}

export const FiscalYear = new FiscalYearResource();
