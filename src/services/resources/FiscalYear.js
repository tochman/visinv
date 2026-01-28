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

  /**
   * Bulk import fiscal years from SIE file
   * @param {Array} fiscalYears - Array of fiscal year objects to import
   * @param {Object} options - Import options
   * @param {boolean} options.skipExisting - Skip years that already exist (by date range)
   * @returns {Promise<{data: Object, error: Error|null}>}
   */
  async bulkImport(fiscalYears, options = { skipExisting: true }) {
    if (!fiscalYears || fiscalYears.length === 0) {
      return { data: { imported: 0, skipped: 0, items: [] }, error: null };
    }

    const organizationId = fiscalYears[0].organization_id;
    
    // Get existing fiscal years for this organization
    const { data: existing, error: fetchError } = await this.index(organizationId);
    if (fetchError) {
      return { data: null, error: fetchError };
    }

    const existingDates = new Set(
      (existing || []).map((fy) => `${fy.start_date}|${fy.end_date}`)
    );

    const toImport = [];
    let skipped = 0;

    for (const fy of fiscalYears) {
      const dateKey = `${fy.start_date}|${fy.end_date}`;
      
      if (options.skipExisting && existingDates.has(dateKey)) {
        skipped++;
        continue;
      }

      // Remove sie_index as it's not a database column
      const { sie_index, ...fiscalYearData } = fy;
      toImport.push(fiscalYearData);
    }

    if (toImport.length === 0) {
      return {
        data: { imported: 0, skipped, items: [] },
        error: null,
      };
    }

    // Insert fiscal years
    const { data: inserted, error: insertError } = await this.supabase
      .from(this.tableName)
      .insert(toImport)
      .select();

    if (insertError) {
      return { data: null, error: insertError };
    }

    // Create a map from sie_index to created fiscal year ID for use in journal entry import
    const importedWithIndex = inserted.map((fy, idx) => ({
      ...fy,
      sie_index: fiscalYears.find(
        (orig) => orig.start_date === fy.start_date && orig.end_date === fy.end_date
      )?.sie_index,
    }));

    return {
      data: {
        imported: inserted.length,
        skipped,
        items: importedWithIndex,
      },
      error: null,
    };
  }

  /**
   * Get fiscal year by date range
   * @param {string} organizationId - Organization ID
   * @param {string} startDate - Start date (YYYY-MM-DD)
   * @param {string} endDate - End date (YYYY-MM-DD)
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  async getByDateRange(organizationId, startDate, endDate) {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('organization_id', organizationId)
      .eq('start_date', startDate)
      .eq('end_date', endDate)
      .single();

    return { data, error };
  }
}

export const FiscalYear = new FiscalYearResource();
