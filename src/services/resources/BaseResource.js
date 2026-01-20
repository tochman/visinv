import { supabase } from '../supabase';

/**
 * Base Resource class for REST-like data operations
 * Provides common CRUD methods that can be extended by specific resources
 */
export class BaseResource {
  constructor(tableName) {
    this.tableName = tableName;
    this.supabase = supabase;
  }

  /**
   * Get current authenticated user
   * @returns {Promise<{user: Object|null, error: Error|null}>}
   */
  async getCurrentUser() {
    const { data: { user }, error } = await this.supabase.auth.getUser();
    return { user, error };
  }

  /**
   * Index - Get all records
   * @param {Object} options - Query options
   * @param {string} options.select - Columns to select (default: '*')
   * @param {Array<{column: string, value: any}>} options.filters - Filters to apply
   * @param {string} options.order - Column to order by
   * @param {boolean} options.ascending - Sort direction (default: true)
   * @returns {Promise<{data: Array|null, error: Error|null}>}
   */
  async index({ select = '*', filters = [], order = 'created_at', ascending = false } = {}) {
    let query = this.supabase.from(this.tableName).select(select);

    // Apply filters
    filters.forEach(({ column, value, operator = 'eq' }) => {
      query = query[operator](column, value);
    });

    // Apply ordering
    if (order) {
      query = query.order(order, { ascending });
    }

    const { data, error } = await query;
    return { data, error };
  }

  /**
   * Show - Get a single record by ID
   * @param {string} id - Record ID
   * @param {string} select - Columns to select (default: '*')
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  async show(id, select = '*') {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select(select)
      .eq('id', id)
      .single();

    return { data, error };
  }

  /**
   * Create - Insert a new record
   * @param {Object} attributes - Record attributes
   * @param {boolean} addUserId - Whether to automatically add user_id (default: true)
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  async create(attributes, addUserId = true) {
    let dataToInsert = { ...attributes };

    // Automatically add user_id if needed
    if (addUserId) {
      const { user, error: authError } = await this.getCurrentUser();
      if (authError || !user) {
        return { data: null, error: authError || new Error('Not authenticated') };
      }
      dataToInsert.user_id = user.id;
    }

    const { data, error } = await this.supabase
      .from(this.tableName)
      .insert(dataToInsert)
      .select()
      .single();

    return { data, error };
  }

  /**
   * Update - Update an existing record
   * @param {string} id - Record ID
   * @param {Object} attributes - Attributes to update
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  async update(id, attributes) {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .update(attributes)
      .eq('id', id)
      .select()
      .single();

    return { data, error };
  }

  /**
   * Destroy - Delete a record
   * @param {string} id - Record ID
   * @returns {Promise<{data: null, error: Error|null}>}
   */
  async destroy(id) {
    const { error } = await this.supabase
      .from(this.tableName)
      .delete()
      .eq('id', id);

    return { data: null, error };
  }

  /**
   * Where - Custom query builder
   * @param {Array<{column: string, value: any, operator: string}>} conditions
   * @param {string} select - Columns to select (default: '*')
   * @returns {Promise<{data: Array|null, error: Error|null}>}
   */
  async where(conditions, select = '*') {
    let query = this.supabase.from(this.tableName).select(select);

    conditions.forEach(({ column, value, operator = 'eq' }) => {
      query = query[operator](column, value);
    });

    const { data, error } = await query;
    return { data, error };
  }
}
