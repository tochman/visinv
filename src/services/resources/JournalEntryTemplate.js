import { BaseResource } from './BaseResource';

/**
 * JournalEntryTemplate Resource
 * Handles journal entry templates for quick entry creation
 * US-213: Journal Entry Templates
 */
class JournalEntryTemplateResource extends BaseResource {
  constructor() {
    super('journal_entry_templates');
  }

  /**
   * Get all templates for an organization
   * @param {string} organizationId - Organization ID
   * @returns {Promise<{data: Array|null, error: Error|null}>}
   */
  async index(organizationId) {
    if (!organizationId) {
      return { data: null, error: new Error('Organization ID is required') };
    }

    const { data, error } = await this.supabase
      .from(this.tableName)
      .select(`
        *,
        lines:journal_entry_template_lines(
          id,
          account_id,
          account:accounts(id, account_number, name, name_en),
          debit_amount,
          credit_amount,
          description,
          vat_code,
          line_order
        )
      `)
      .eq('organization_id', organizationId)
      .order('use_count', { ascending: false });

    // Sort lines by line_order
    if (data) {
      data.forEach((template) => {
        if (template.lines) {
          template.lines.sort((a, b) => a.line_order - b.line_order);
        }
      });
    }

    return { data, error };
  }

  /**
   * Get a single template with its lines
   * @param {string} id - Template ID
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  async show(id) {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select(`
        *,
        lines:journal_entry_template_lines(
          id,
          account_id,
          account:accounts(id, account_number, name, name_en),
          debit_amount,
          credit_amount,
          description,
          vat_code,
          line_order
        )
      `)
      .eq('id', id)
      .single();

    // Sort lines by line_order
    if (data?.lines) {
      data.lines.sort((a, b) => a.line_order - b.line_order);
    }

    return { data, error };
  }

  /**
   * Create a new template with lines
   * @param {Object} template - Template data
   * @param {string} template.organization_id - Organization ID
   * @param {string} template.name - Template name
   * @param {string} template.description - Template description
   * @param {string} template.default_description - Default entry description
   * @param {Array} template.lines - Array of line items
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  async create(template) {
    const { lines, ...templateData } = template;

    // Get the current user for created_by
    const { user, error: authError } = await this.getCurrentUser();
    if (authError || !user) {
      return { data: null, error: authError || new Error('Not authenticated') };
    }

    // Create the template
    const { data: createdTemplate, error: createError } = await this.supabase
      .from(this.tableName)
      .insert({
        ...templateData,
        created_by: user.id,
      })
      .select()
      .single();

    if (createError) {
      return { data: null, error: createError };
    }

    // Create the lines
    if (lines && lines.length > 0) {
      const linesWithTemplateId = lines
        .filter((line) => line.account_id) // Only include lines with accounts
        .map((line, index) => ({
          template_id: createdTemplate.id,
          account_id: line.account_id,
          debit_amount: parseFloat(line.debit_amount) || 0,
          credit_amount: parseFloat(line.credit_amount) || 0,
          description: line.description || null,
          vat_code: line.vat_code || null,
          line_order: line.line_order ?? index,
        }));

      if (linesWithTemplateId.length > 0) {
        const { error: linesError } = await this.supabase
          .from('journal_entry_template_lines')
          .insert(linesWithTemplateId);

        if (linesError) {
          // Rollback: delete the created template
          await this.delete(createdTemplate.id);
          return { data: null, error: linesError };
        }
      }
    }

    // Return the full template with lines
    return this.show(createdTemplate.id);
  }

  /**
   * Update a template and its lines
   * @param {string} id - Template ID
   * @param {Object} template - Updated template data
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  async update(id, template) {
    const { lines, ...templateData } = template;

    // Update the template
    const { data: updatedTemplate, error: updateError } = await this.supabase
      .from(this.tableName)
      .update({
        ...templateData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return { data: null, error: updateError };
    }

    // Update lines if provided
    if (lines !== undefined) {
      // Delete existing lines
      const { error: deleteError } = await this.supabase
        .from('journal_entry_template_lines')
        .delete()
        .eq('template_id', id);

      if (deleteError) {
        return { data: null, error: deleteError };
      }

      // Insert new lines
      if (lines && lines.length > 0) {
        const linesWithTemplateId = lines
          .filter((line) => line.account_id)
          .map((line, index) => ({
            template_id: id,
            account_id: line.account_id,
            debit_amount: parseFloat(line.debit_amount) || 0,
            credit_amount: parseFloat(line.credit_amount) || 0,
            description: line.description || null,
            vat_code: line.vat_code || null,
            line_order: line.line_order ?? index,
          }));

        if (linesWithTemplateId.length > 0) {
          const { error: insertError } = await this.supabase
            .from('journal_entry_template_lines')
            .insert(linesWithTemplateId);

          if (insertError) {
            return { data: null, error: insertError };
          }
        }
      }
    }

    return this.show(id);
  }

  /**
   * Delete a template
   * @param {string} id - Template ID
   * @returns {Promise<{data: null, error: Error|null}>}
   */
  async delete(id) {
    // Lines will be cascade deleted
    const { error } = await this.supabase
      .from(this.tableName)
      .delete()
      .eq('id', id);

    return { data: null, error };
  }

  /**
   * Increment use count when template is used
   * @param {string} id - Template ID
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  async recordUsage(id) {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .update({
        use_count: this.supabase.rpc('increment_template_use_count', { template_id: id }),
        last_used_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    // If RPC doesn't exist, do a manual increment
    if (error?.message?.includes('function')) {
      const { data: template } = await this.show(id);
      if (template) {
        return this.supabase
          .from(this.tableName)
          .update({
            use_count: (template.use_count || 0) + 1,
            last_used_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', id)
          .select()
          .single();
      }
    }

    return { data, error };
  }

  /**
   * Create a journal entry from a template
   * Returns data formatted for journal entry creation
   * @param {string} templateId - Template ID
   * @param {Object} overrides - Override values
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  async toJournalEntry(templateId, overrides = {}) {
    const { data: template, error } = await this.show(templateId);

    if (error || !template) {
      return { data: null, error: error || new Error('Template not found') };
    }

    // Record usage
    await this.recordUsage(templateId);

    // Format for journal entry
    const entryData = {
      description: overrides.description || template.default_description || template.name,
      entry_date: overrides.entry_date || new Date().toISOString().split('T')[0],
      lines: template.lines.map((line) => ({
        account_id: line.account_id,
        debit_amount: line.debit_amount || 0,
        credit_amount: line.credit_amount || 0,
        description: line.description || '',
      })),
    };

    return { data: entryData, error: null };
  }
}

export const JournalEntryTemplate = new JournalEntryTemplateResource();
