import { BaseResource } from './BaseResource';

/**
 * SupplierInboxItem Resource
 * Handles CRUD operations for supplier invoice inbox items received via email
 * US-264b: Inbound Email Processing
 */
class SupplierInboxItemResource extends BaseResource {
  constructor() {
    super('supplier_inbox_items');
  }

  /**
   * Get all inbox items for an organization with optional filters
   * @param {string} organizationId - Organization ID
   * @param {Object} options - Filter options
   * @param {string} options.status - Filter by status ('new', 'processed', 'archived', 'duplicate', 'no_attachment')
   * @param {string} options.search - Search by sender email or subject
   * @param {number} options.limit - Maximum number of results
   * @param {number} options.offset - Offset for pagination
   * @returns {Promise<{data: Array|null, error: Error|null}>}
   */
  async getByOrganization(organizationId, options = {}) {
    let query = this.supabase
      .from(this.tableName)
      .select('*, supplier_invoices(id, invoice_number)')
      .eq('organization_id', organizationId)
      .order('received_at', { ascending: false });

    if (options.status) {
      query = query.eq('status', options.status);
    }

    if (options.search) {
      query = query.or(`sender_email.ilike.%${options.search}%,subject.ilike.%${options.search}%`);
    }

    if (options.limit) {
      query = query.limit(options.limit);
    }

    if (options.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
    }

    const { data, error } = await query;
    return { data, error };
  }

  /**
   * Get count of inbox items by status
   * @param {string} organizationId - Organization ID
   * @param {string} status - Optional status filter
   * @returns {Promise<{count: number|null, error: Error|null}>}
   */
  async getCount(organizationId, status = null) {
    let query = this.supabase
      .from(this.tableName)
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId);

    if (status) {
      query = query.eq('status', status);
    }

    const { count, error } = await query;
    return { count, error };
  }

  /**
   * Get count of new (unprocessed) inbox items
   * @param {string} organizationId - Organization ID
   * @returns {Promise<{count: number|null, error: Error|null}>}
   */
  async getNewCount(organizationId) {
    return this.getCount(organizationId, 'new');
  }

  /**
   * Check if a file is a duplicate within the last 90 days
   * @param {string} organizationId - Organization ID
   * @param {string} fileHash - SHA-256 hash of the file
   * @returns {Promise<{isDuplicate: boolean, duplicateOf: string|null, error: Error|null}>}
   */
  async checkDuplicate(organizationId, fileHash) {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('id')
      .eq('organization_id', organizationId)
      .eq('file_hash', fileHash)
      .neq('status', 'duplicate')
      .gte('created_at', ninetyDaysAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      return { isDuplicate: false, duplicateOf: null, error };
    }

    return {
      isDuplicate: !!data,
      duplicateOf: data?.id || null,
      error: null
    };
  }

  /**
   * Mark an inbox item as processed
   * @param {string} id - Inbox item ID
   * @param {string} supplierInvoiceId - Created supplier invoice ID
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  async markProcessed(id, supplierInvoiceId) {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .update({
        status: 'processed',
        supplier_invoice_id: supplierInvoiceId
      })
      .eq('id', id)
      .select()
      .single();

    return { data, error };
  }

  /**
   * Archive an inbox item
   * @param {string} id - Inbox item ID
   * @param {string} userId - User performing the action
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  async archive(id, userId) {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .update({
        status: 'archived',
        archived_at: new Date().toISOString(),
        archived_by: userId
      })
      .eq('id', id)
      .select()
      .single();

    return { data, error };
  }

  /**
   * Archive multiple inbox items
   * @param {string[]} ids - Array of inbox item IDs
   * @param {string} userId - User performing the action
   * @returns {Promise<{data: Array|null, error: Error|null}>}
   */
  async archiveMany(ids, userId) {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .update({
        status: 'archived',
        archived_at: new Date().toISOString(),
        archived_by: userId
      })
      .in('id', ids)
      .select();

    return { data, error };
  }

  /**
   * Delete an inbox item and its associated storage file
   * @param {string} id - Inbox item ID
   * @returns {Promise<{error: Error|null}>}
   */
  async deleteWithFile(id) {
    // First get the item to find the storage path
    const { data: item, error: fetchError } = await this.supabase
      .from(this.tableName)
      .select('storage_path')
      .eq('id', id)
      .single();

    if (fetchError) {
      return { error: fetchError };
    }

    // Delete the file from storage if it exists
    if (item?.storage_path) {
      const { error: storageError } = await this.supabase
        .storage
        .from('supplier-inbox')
        .remove([item.storage_path]);

      if (storageError) {
        console.error('Failed to delete storage file:', storageError);
        // Continue with database deletion even if storage deletion fails
      }
    }

    // Delete the database record
    const { error } = await this.supabase
      .from(this.tableName)
      .delete()
      .eq('id', id);

    return { error };
  }

  /**
   * Delete multiple inbox items and their associated storage files
   * @param {string[]} ids - Array of inbox item IDs
   * @returns {Promise<{error: Error|null}>}
   */
  async deleteManyWithFiles(ids) {
    // Get all items to find storage paths
    const { data: items, error: fetchError } = await this.supabase
      .from(this.tableName)
      .select('id, storage_path')
      .in('id', ids);

    if (fetchError) {
      return { error: fetchError };
    }

    // Delete files from storage
    const storagePaths = items
      .filter(item => item.storage_path)
      .map(item => item.storage_path);

    if (storagePaths.length > 0) {
      const { error: storageError } = await this.supabase
        .storage
        .from('supplier-inbox')
        .remove(storagePaths);

      if (storageError) {
        console.error('Failed to delete storage files:', storageError);
        // Continue with database deletion
      }
    }

    // Delete database records
    const { error } = await this.supabase
      .from(this.tableName)
      .delete()
      .in('id', ids);

    return { error };
  }

  /**
   * Get the download URL for an inbox item's file
   * @param {string} storagePath - Storage path of the file
   * @param {number} expiresIn - Expiry time in seconds (default 60)
   * @returns {Promise<{url: string|null, error: Error|null}>}
   */
  async getFileUrl(storagePath, expiresIn = 60) {
    const { data, error } = await this.supabase
      .storage
      .from('supplier-inbox')
      .createSignedUrl(storagePath, expiresIn);

    return { url: data?.signedUrl || null, error };
  }

  /**
   * Download the file for an inbox item
   * @param {string} storagePath - Storage path of the file
   * @returns {Promise<{data: Blob|null, error: Error|null}>}
   */
  async downloadFile(storagePath) {
    const { data, error } = await this.supabase
      .storage
      .from('supplier-inbox')
      .download(storagePath);

    return { data, error };
  }
}

export const SupplierInboxItem = new SupplierInboxItemResource();
