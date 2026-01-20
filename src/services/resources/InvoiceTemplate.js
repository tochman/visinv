import BaseResource from './BaseResource';

/**
 * InvoiceTemplate Resource
 * Handles CRUD operations for invoice templates
 */
class InvoiceTemplateResource extends BaseResource {
  constructor() {
    super('invoice_templates');
  }

  /**
   * Get all invoice templates for the current user
   * Includes both user templates and system templates
   * @returns {Promise<{data: Array|null, error: Error|null}>}
   */
  async index() {
    const { data: user } = await this.getCurrentUser();
    if (!user) return { data: null, error: new Error('Not authenticated') };

    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .or(`user_id.eq.${user.id},is_system.eq.true`)
      .order('is_system', { ascending: false })
      .order('name', { ascending: true });

    return { data, error };
  }

  /**
   * Create a new template
   * @param {Object} templateData - Template data
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  async create(templateData) {
    const { data: user } = await this.getCurrentUser();
    if (!user) return { data: null, error: new Error('Not authenticated') };

    const { data, error } = await this.supabase
      .from(this.tableName)
      .insert({
        ...templateData,
        user_id: user.id,
        is_system: false,
      })
      .select()
      .single();

    return { data, error };
  }

  /**
   * Clone a system template for editing
   * @param {string} templateId - Template ID to clone
   * @param {string} newName - Name for the cloned template
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  async clone(templateId, newName) {
    const { data: user } = await this.getCurrentUser();
    if (!user) return { data: null, error: new Error('Not authenticated') };

    // Fetch the template to clone
    const { data: template, error: fetchError } = await this.show(templateId);
    if (fetchError) return { data: null, error: fetchError };

    // Create a new template based on the original
    const { data, error } = await this.supabase
      .from(this.tableName)
      .insert({
        name: newName || `${template.name} (Copy)`,
        content: template.content,
        variables: template.variables,
        is_system: false,
        user_id: user.id,
      })
      .select()
      .single();

    return { data, error };
  }

  /**
   * Get default templates
   * @returns {Array} Default template definitions
   */
  getDefaultTemplates() {
    return [
      {
        name: 'Modern',
        content: `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; padding: 40px; }
    .header { border-bottom: 3px solid #3b82f6; padding-bottom: 20px; margin-bottom: 30px; }
    .invoice-number { font-size: 24px; font-weight: bold; color: #3b82f6; }
    .details { margin: 20px 0; }
    .table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    .table th { background: #f3f4f6; padding: 10px; text-align: left; }
    .table td { padding: 10px; border-bottom: 1px solid #e5e7eb; }
    .total { text-align: right; font-size: 18px; font-weight: bold; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="invoice-number">{{invoice_number}}</div>
    <div>{{client_name}}</div>
  </div>
  
  <div class="details">
    <p><strong>Issue Date:</strong> {{issue_date}}</p>
    <p><strong>Due Date:</strong> {{due_date}}</p>
  </div>

  <table class="table">
    <thead>
      <tr>
        <th>Description</th>
        <th>Quantity</th>
        <th>Unit Price</th>
        <th>Amount</th>
      </tr>
    </thead>
    <tbody>
      {{#each line_items}}
      <tr>
        <td>{{description}}</td>
        <td>{{quantity}}</td>
        <td>{{unit_price}}</td>
        <td>{{amount}}</td>
      </tr>
      {{/each}}
    </tbody>
  </table>

  <div class="total">
    <div>Subtotal: {{subtotal}}</div>
    <div>Tax ({{tax_rate}}%): {{tax_amount}}</div>
    <div style="color: #3b82f6;">Total: {{total}} {{currency}}</div>
  </div>
</body>
</html>`,
        variables: ['invoice_number', 'client_name', 'issue_date', 'due_date', 'line_items', 'subtotal', 'tax_rate', 'tax_amount', 'total', 'currency'],
        is_system: true,
      },
      {
        name: 'Classic',
        content: `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Times New Roman', serif; padding: 40px; }
    .header { text-align: center; margin-bottom: 40px; }
    .invoice-title { font-size: 28px; font-weight: bold; }
    .info-box { background: #f9fafb; padding: 15px; margin: 20px 0; border: 1px solid #d1d5db; }
    .table { width: 100%; border: 1px solid #000; border-collapse: collapse; margin: 20px 0; }
    .table th, .table td { border: 1px solid #000; padding: 8px; }
    .table th { background: #e5e7eb; }
    .footer { margin-top: 40px; text-align: right; }
  </style>
</head>
<body>
  <div class="header">
    <div class="invoice-title">INVOICE</div>
    <div>{{invoice_number}}</div>
  </div>

  <div class="info-box">
    <strong>Bill To:</strong><br>
    {{client_name}}
  </div>

  <div class="info-box">
    <strong>Issue Date:</strong> {{issue_date}}<br>
    <strong>Due Date:</strong> {{due_date}}
  </div>

  <table class="table">
    <thead>
      <tr>
        <th>Item</th>
        <th>Qty</th>
        <th>Price</th>
        <th>Total</th>
      </tr>
    </thead>
    <tbody>
      {{#each line_items}}
      <tr>
        <td>{{description}}</td>
        <td>{{quantity}}</td>
        <td>{{unit_price}}</td>
        <td>{{amount}}</td>
      </tr>
      {{/each}}
    </tbody>
  </table>

  <div class="footer">
    <p>Subtotal: {{subtotal}} {{currency}}</p>
    <p>Tax ({{tax_rate}}%): {{tax_amount}} {{currency}}</p>
    <p><strong>Total Due: {{total}} {{currency}}</strong></p>
  </div>
</body>
</html>`,
        variables: ['invoice_number', 'client_name', 'issue_date', 'due_date', 'line_items', 'subtotal', 'tax_rate', 'tax_amount', 'total', 'currency'],
        is_system: true,
      },
    ];
  }
}

export default new InvoiceTemplateResource();
