import { BaseResource } from './BaseResource';

/**
 * ProductPrice Resource
 * Handles product price operations for multi-currency support
 */
class ProductPriceResource extends BaseResource {
  constructor() {
    super('product_prices');
  }

  /**
   * Get all prices for a specific product
   * @param {string} productId - Product ID
   * @returns {Promise<{data: Array|null, error: Error|null}>}
   */
  async getByProduct(productId) {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('product_id', productId)
      .order('currency');

    return { data, error };
  }

  /**
   * Get price for a specific product and currency
   * @param {string} productId - Product ID
   * @param {string} currency - Currency code (SEK, EUR, USD, etc.)
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  async getPrice(productId, currency) {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('product_id', productId)
      .eq('currency', currency)
      .maybeSingle();

    return { data, error };
  }

  /**
   * Set/update price for a product in a specific currency
   * @param {string} productId - Product ID
   * @param {string} currency - Currency code
   * @param {number} price - Price amount
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  async setPrice(productId, currency, price) {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .upsert(
        { product_id: productId, currency, price: parseFloat(price) },
        { onConflict: 'product_id,currency' }
      )
      .select()
      .single();

    return { data, error };
  }

  /**
   * Bulk set prices for a product
   * @param {string} productId - Product ID
   * @param {Array<{currency: string, price: number}>} prices - Array of price objects
   * @returns {Promise<{data: Array|null, error: Error|null}>}
   */
  async bulkSetPrices(productId, prices) {
    const priceRecords = prices.map(p => ({
      product_id: productId,
      currency: p.currency,
      price: parseFloat(p.price),
    }));

    const { data, error } = await this.supabase
      .from(this.tableName)
      .upsert(priceRecords, { onConflict: 'product_id,currency' })
      .select();

    return { data, error };
  }

  /**
   * Delete price for a product in a specific currency
   * @param {string} productId - Product ID
   * @param {string} currency - Currency code
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  async deletePrice(productId, currency) {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .delete()
      .eq('product_id', productId)
      .eq('currency', currency)
      .select()
      .single();

    return { data, error };
  }

  /**
   * Get all products with their prices
   * Joins products with product_prices
   * @returns {Promise<{data: Array|null, error: Error|null}>}
   */
  async getProductsWithPrices() {
    const { data, error } = await this.supabase
      .from('products')
      .select(`
        *,
        prices:product_prices(currency, price)
      `)
      .eq('is_active', true)
      .order('name');

    return { data, error };
  }
}

export const ProductPrice = new ProductPriceResource();
