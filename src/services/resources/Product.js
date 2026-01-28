import { BaseResource } from './BaseResource';
import { ProductPrice } from './ProductPrice';
import { Organization } from './Organization';

/**
 * Product Resource
 * Handles all product catalog operations
 */
class ProductResource extends BaseResource {
  constructor() {
    super('products');
  }

  /**
   * Get all products for the current organization
   * Includes prices for all currencies
   * @param {Object} options - Query options
   * @returns {Promise<{data: Array|null, error: Error|null}>}
   */
  async index(options = {}) {
    // Get current organization to filter by
    const { data: currentOrg, error: orgError } = await Organization.getDefault();
    if (orgError || !currentOrg) {
      return { data: null, error: orgError || new Error('No organization found') };
    }

    const { data, error } = await this.supabase
      .from(this.tableName)
      .select(`
        *,
        prices:product_prices(currency, price)
      `)
      .eq('organization_id', currentOrg.id)
      .eq('is_active', true)
      .order('name');

    return { data, error };
  }

  /**
   * Create a new product with prices
   * @param {Object} productData - Product attributes including prices array
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  async create(productData) {
    const { prices, ...productFields } = productData;
    
    // Trim name and set defaults
    const dataToCreate = {
      ...productFields,
      name: productFields.name?.trim(),
      tax_rate: productFields.tax_rate !== undefined ? parseFloat(productFields.tax_rate) : 25.00,
    };

    // Create product
    const { data: product, error: productError } = await super.create(dataToCreate);
    
    if (productError || !product) {
      return { data: null, error: productError };
    }

    // Create prices if provided
    if (prices && prices.length > 0) {
      const { error: pricesError } = await ProductPrice.bulkSetPrices(
        product.id,
        prices.filter(p => p.price && parseFloat(p.price) > 0)
      );
      
      if (pricesError) {
        return { data: null, error: pricesError };
      }
    }

    // Fetch the complete product with prices
    return this.show(product.id);
  }

  /**
   * Update an existing product
   * @param {string} id - Product ID
   * @param {Object} updates - Attributes to update (including prices array)
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  async update(id, updates) {
    const { prices, ...productFields } = updates;
    
    // Trim name if provided
    const dataToUpdate = {
      ...productFields,
      name: productFields.name?.trim(),
      tax_rate: productFields.tax_rate !== undefined ? parseFloat(productFields.tax_rate) : undefined,
    };

    // Remove undefined values
    Object.keys(dataToUpdate).forEach(key => {
      if (dataToUpdate[key] === undefined) delete dataToUpdate[key];
    });

    // Update product
    const { data: product, error: productError } = await super.update(id, dataToUpdate);
    
    if (productError || !product) {
      return { data: null, error: productError };
    }

    // Update prices if provided
    if (prices) {
      // Delete all existing prices first
      const { data: existingPrices } = await ProductPrice.getByProduct(id);
      if (existingPrices) {
        for (const existing of existingPrices) {
          await ProductPrice.deletePrice(id, existing.currency);
        }
      }
      
      // Insert new prices
      const validPrices = prices.filter(p => p.price && parseFloat(p.price) > 0);
      if (validPrices.length > 0) {
        const { error: pricesError } = await ProductPrice.bulkSetPrices(id, validPrices);
        if (pricesError) {
          return { data: null, error: pricesError };
        }
      }
    }

    // Fetch the complete product with prices
    return this.show(id);
  }

  /**
   * Get a single product with its prices
   * @param {string} id - Product ID
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  async show(id) {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select(`
        *,
        prices:product_prices(currency, price)
      `)
      .eq('id', id)
      .single();

    return { data, error };
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
