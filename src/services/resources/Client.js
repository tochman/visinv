import { BaseResource } from './BaseResource';

/**
 * Client Resource
 * Handles all client-related data operations
 */
class ClientResource extends BaseResource {
  constructor() {
    super('clients');
  }

  /**
   * Get all clients for the current user
   * @param {Object} options - Query options
   * @returns {Promise<{data: Array|null, error: Error|null}>}
   */
  async index(options = {}) {
    return super.index({
      select: '*',
      order: 'name',
      ascending: true,
      ...options,
    });
  }

  /**
   * Create a new client
   * @param {Object} clientData - Client attributes
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  async create(clientData) {
    // Trim name before creating
    const dataToCreate = {
      ...clientData,
      name: clientData.name?.trim(),
    };

    return super.create(dataToCreate);
  }

  /**
   * Update an existing client
   * @param {string} id - Client ID
   * @param {Object} updates - Attributes to update
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  async update(id, updates) {
    // Trim name if it's being updated
    const dataToUpdate = {
      ...updates,
      ...(updates.name && { name: updates.name.trim() }),
    };

    return super.update(id, dataToUpdate);
  }

  /**
   * Search clients by name or email
   * @param {string} query - Search query
   * @returns {Promise<{data: Array|null, error: Error|null}>}
   */
  async search(query) {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .or(`name.ilike.%${query}%,email.ilike.%${query}%`)
      .order('name');

    return { data, error };
  }

  /**
   * Get clients by team
   * @param {string} teamId - Team ID
   * @returns {Promise<{data: Array|null, error: Error|null}>}
   */
  async byTeam(teamId) {
    return this.where([
      { column: 'team_id', value: teamId }
    ]);
  }
}

// Export singleton instance
export const Client = new ClientResource();
