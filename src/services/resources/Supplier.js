import { BaseResource } from './BaseResource';

/**
 * Supplier Resource - US-261
 * Manages supplier/vendor register for tracking business expenses
 * Similar to Client resource but for vendors/suppliers
 */
class SupplierResource extends BaseResource {
  constructor() {
    super('suppliers');
  }

  /**
   * Get all suppliers for an organization
   * @param {string} organizationId 
   * @param {boolean} activeOnly - Return only active suppliers
   * @returns {Promise<{data: Array, error: Error|null}>}
   */
  async getByOrganization(organizationId, activeOnly = false) {
    let conditions = [
      { column: 'organization_id', value: organizationId }
    ];

    if (activeOnly) {
      conditions.push({ column: 'is_active', value: true });
    }

    return this.where(conditions, {
      orderBy: { column: 'name', ascending: true }
    });
  }

  /**
   * Create a new supplier (user_id not needed since RLS uses organization_id)
   * @param {Object} supplierData 
   * @returns {Promise<{data: Object, error: Error|null}>}
   */
  async create(supplierData) {
    // Don't add user_id since suppliers table doesn't have it
    // RLS policies use organization_id via organization_members
    return super.create(supplierData, false);
  }

  /**
   * Search suppliers by name, org number, or VAT number
   * @param {string} organizationId 
   * @param {string} searchTerm 
   * @returns {Promise<{data: Array, error: Error|null}>}
   */
  async search(organizationId, searchTerm) {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .eq('organization_id', organizationId)
        .or(`name.ilike.%${searchTerm}%,organization_number.ilike.%${searchTerm}%,vat_number.ilike.%${searchTerm}%`)
        .order('name', { ascending: true });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error(`Error searching ${this.tableName}:`, error);
      return { data: null, error };
    }
  }

  /**
   * Get supplier with transaction history
   * @param {string} supplierId 
   * @returns {Promise<{data: Object, error: Error|null}>}
   */
  async getWithTransactionHistory(supplierId) {
    try {
      // Get supplier details
      const { data: supplier, error: supplierError } = await this.show(supplierId);
      if (supplierError) throw supplierError;

      // TODO: Get supplier invoices when supplier invoice feature is implemented (US-260)
      // For now, return supplier without transactions
      return {
        data: {
          ...supplier,
          transactions: []
        },
        error: null
      };
    } catch (error) {
      console.error('Error getting supplier with transaction history:', error);
      return { data: null, error };
    }
  }

  /**
   * Toggle supplier active status
   * @param {string} supplierId 
   * @param {boolean} isActive 
   * @returns {Promise<{data: Object, error: Error|null}>}
   */
  async setActiveStatus(supplierId, isActive) {
    return this.update(supplierId, { is_active: isActive });
  }
}

export const Supplier = new SupplierResource();
