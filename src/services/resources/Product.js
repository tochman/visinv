import { BaseResource } from './BaseResource';

/**
 * Product Resource
 * Handles all product catalog operations
 */
class ProductResource extends BaseResource {
  constructor() {
    super('products');
  }

  /**
   * Get all products for the current user
   * @param {Object} options - Query options
   * @returns {Promise<{data: Array|null, error: Error|null}>}
   */
  async index(options = {}) {
    return super.index({
      select: '*',
      order: 'name',
      ascending: true,
      filters: [{ column: 'is_active', value: true }],
      ...options,
    });
  }

  /**
   * Create a new product
   * @param {Object} productData - Product attributes
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  async create(productData) {
    // Trim name and ensure unit_price is a number
    const dataToCreate = {
      ...productData,
      name: productData.name?.trim(),
      unit_price: parseFloat(productData.unit_price) || 0,
      tax_rate: productData.tax_rate !== undefined ? parseFloat(productData.tax_rate) : 25.00,
    };

    return super.create(dataToCreate);
  }

  /**
   * Update an existing product
   * @param {string} id - Product ID
   * @param {Object} updates - Attributes to update
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  async update(id, updates) {
    // Trim name if it's being updated and ensure numeric fields are numbers
    const dataToUpdate = {
      ...updates,
      ...(updates.name && { name: updates.name.trim() }),
      ...(updates.unit_price !== undefined && { unit_price: parseFloat(updates.unit_price) }),
      ...(updates.tax_rate !== undefined && { tax_rate: parseFloat(updates.tax_rate) }),
    };

    return super.update(id, dataToUpdate);
  }

  /**
   * Search products by name, description, or SKU
   * @param {string} query - Search query
   * @returns {Promise<{data: Array|null, error: Error|null}>}
   */
  async search(query) {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('is_active', true)
      .or(`name.ilike.%${query}%,description.ilike.%${query}%,sku.ilike.%${query}%`)
      .order('name');

    return { data, error };
  }

  /**
   * Get products by team
   * @param {string} teamId - Team ID
   * @returns {Promise<{data: Array|null, error: Error|null}>}
   */
  async byTeam(teamId) {
    return this.where([
      { column: 'team_id', value: teamId },
      { column: 'is_active', value: true }
    ]);
  }

  /**
   * Soft delete a product (mark as inactive)
   * @param {string} id - Product ID
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  async deactivate(id) {
    return this.update(id, { is_active: false });
  }

  /**
   * Reactivate a product
   * @param {string} id - Product ID
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  async activate(id) {
    return this.update(id, { is_active: true });
  }
}

export const Product = new ProductResource();
