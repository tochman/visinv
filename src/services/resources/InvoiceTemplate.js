import { BaseResource } from './BaseResource';

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
    const { user } = await this.getCurrentUser();
    if (!user) return { data: null, error: new Error('Not authenticated') };

    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .or(`user_id.eq.${user.id},user_id.is.null`)
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
    const { user } = await this.getCurrentUser();
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
    const { user } = await this.getCurrentUser();
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
<html lang="sv">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Faktura {{invoice_number}}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    @media print {
      body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
      .no-print { display: none; }
    }
  </style>
</head>
<body class="bg-gray-50 p-8">
  <div class="max-w-5xl mx-auto bg-white shadow-lg">
    
    <div class="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-10 py-8">
      <div class="flex justify-between items-start">
        <div>
          <h1 class="text-5xl font-bold tracking-tight mb-3">FAKTURA</h1>
          <div class="bg-white/20 backdrop-blur-sm px-4 py-2 rounded inline-block">
            <p class="text-xl font-semibold">{{invoice_number}}</p>
          </div>
        </div>
        <div class="text-right">
          <p class="text-2xl font-bold mb-1">{{organization_name}}</p>
          <p class="text-sm opacity-90">Org.nr: {{organization_number}}</p>
          {{#if organization_vat_number}}
          <p class="text-sm opacity-90">Moms nr: {{organization_vat_number}}</p>
          {{/if}}
        </div>
      </div>
    </div>

    <div class="px-10 py-8">
      
      {{#if organization_f_skatt_approved}}
      <div class="bg-green-50 border-l-4 border-green-500 px-6 py-4 rounded-r mb-8 flex items-center">
        <svg class="w-6 h-6 text-green-600 mr-3" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
        </svg>
        <p class="text-green-900 font-semibold text-lg">Godkänd för F-skatt</p>
      </div>
      {{/if}}

      <div class="grid grid-cols-2 gap-6 mb-10">
        
        <div class="bg-gradient-to-br from-slate-50 to-slate-100 p-6 rounded-lg border border-slate-200">
          <div class="flex items-center mb-4">
            <div class="bg-blue-600 rounded-full p-2 mr-3">
              <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
              </svg>
            </div>
            <h3 class="text-xs font-bold text-slate-500 uppercase tracking-wider">Fakturamottagare</h3>
          </div>
          <div class="space-y-1">
            <p class="text-lg font-bold text-slate-900">{{client_name}}</p>
            <p class="text-sm text-slate-600">{{client_address}}</p>
            <p class="text-sm text-slate-600">{{client_postal_code}} {{client_city}}</p>
            {{#if client_country}}
            <p class="text-sm text-slate-600">{{client_country}}</p>
            {{/if}}
            {{#if client_email}}
            <p class="text-sm text-blue-600 mt-2">{{client_email}}</p>
            {{/if}}
          </div>
        </div>

        <div class="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-lg border border-blue-200">
          <div class="flex items-center mb-4">
            <div class="bg-blue-600 rounded-full p-2 mr-3">
              <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
            </div>
            <h3 class="text-xs font-bold text-blue-700 uppercase tracking-wider">Fakturadetaljer</h3>
          </div>
          <div class="space-y-2">
            <div class="flex justify-between items-center">
              <span class="text-sm text-slate-600 font-medium">Fakturadatum:</span>
              <span class="text-sm font-bold text-slate-900">{{issue_date}}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-sm text-slate-600 font-medium">Leveransdatum:</span>
              <span class="text-sm font-bold text-slate-900">{{delivery_date}}</span>
            </div>
            <div class="flex justify-between items-center bg-blue-200/50 px-3 py-2 rounded">
              <span class="text-sm text-blue-900 font-semibold">Förfallodatum:</span>
              <span class="text-sm font-bold text-blue-900">{{due_date}}</span>
            </div>
            {{#if reference}}
            <div class="flex justify-between items-center pt-2 border-t border-blue-200">
              <span class="text-sm text-slate-600 font-medium">Er referens:</span>
              <span class="text-sm font-semibold text-slate-900">{{reference}}</span>
            </div>
            {{/if}}
          </div>
        </div>
      </div>

      <div class="mb-8 overflow-hidden rounded-lg border border-slate-200">
        <table class="w-full">
          <thead>
            <tr class="bg-gradient-to-r from-slate-700 to-slate-800 text-white">
              <th class="text-left px-4 py-4 font-semibold text-sm">Beskrivning</th>
              <th class="text-center px-4 py-4 font-semibold text-sm w-24">Antal</th>
              <th class="text-right px-4 py-4 font-semibold text-sm w-32">Á-pris</th>
              <th class="text-right px-4 py-4 font-semibold text-sm w-24">Moms</th>
              <th class="text-right px-4 py-4 font-semibold text-sm w-32 bg-slate-800">Belopp</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-slate-200">
            {{#each line_items}}
            <tr class="hover:bg-slate-50 transition-colors">
              <td class="px-4 py-4 text-slate-900">{{description}}</td>
              <td class="text-center px-4 py-4 text-slate-600 font-medium">{{quantity}} {{unit}}</td>
              <td class="text-right px-4 py-4 text-slate-600 tabular-nums">{{unit_price}} {{../currency}}</td>
              <td class="text-right px-4 py-4 text-slate-600 font-medium">{{tax_rate}}%</td>
              <td class="text-right px-4 py-4 font-bold text-slate-900 bg-slate-50 tabular-nums">{{amount}} {{../currency}}</td>
            </tr>
            {{/each}}
          </tbody>
        </table>
      </div>

      <div class="flex justify-end mb-10">
        <div class="w-96">
          <div class="bg-slate-50 rounded-lg p-6 border border-slate-200">
            <div class="space-y-3">
              <div class="flex justify-between items-center text-slate-700">
                <span class="font-medium">Delsumma:</span>
                <span class="font-semibold tabular-nums">{{subtotal}} {{currency}}</span>
              </div>
              
              {{#each vat_groups}}
              <div class="flex justify-between items-center text-slate-600 text-sm">
                <span>Moms {{rate}}% ({{base}} {{../currency}}):</span>
                <span class="font-semibold tabular-nums">{{vat}} {{../currency}}</span>
              </div>
              {{/each}}
              
              <div class="border-t-2 border-blue-600 pt-4 mt-4">
                <div class="flex justify-between items-center">
                  <span class="text-xl font-bold text-blue-600">Att betala:</span>
                  <span class="text-2xl font-bold text-blue-600 tabular-nums">{{total}} {{currency}}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {{#if payment_reference}}
      <div class="bg-gradient-to-r from-amber-50 to-yellow-50 border-l-4 border-amber-500 p-6 rounded-r mb-8">
        <h3 class="text-sm font-bold text-amber-900 uppercase tracking-wider mb-3 flex items-center">
          <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z"/>
            <path fill-rule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clip-rule="evenodd"/>
          </svg>
          Betalningsinformation
        </h3>
        <div class="flex items-center justify-between bg-white/60 px-4 py-3 rounded">
          <span class="text-amber-900 font-semibold">OCR-nummer:</span>
          <span class="font-mono text-xl font-bold text-amber-900 tracking-wider">{{payment_reference}}</span>
        </div>
        <p class="text-sm text-amber-800 mt-3">
          <strong>Viktigt:</strong> Ange alltid OCR-nummer vid betalning för snabb och korrekt hantering.
        </p>
      </div>
      {{/if}}

      <div class="grid grid-cols-1 gap-6 mb-8">
        {{#if notes}}
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-5">
          <h3 class="text-sm font-bold text-blue-900 uppercase tracking-wider mb-2 flex items-center">
            <svg class="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/>
            </svg>
            Noteringar
          </h3>
          <p class="text-slate-700">{{notes}}</p>
        </div>
        {{/if}}
        
        {{#if terms}}
        <div class="bg-slate-50 border border-slate-200 rounded-lg p-5">
          <h3 class="text-sm font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center">
            <svg class="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clip-rule="evenodd"/>
            </svg>
            Betalningsvillkor
          </h3>
          <p class="text-slate-700">{{terms}}</p>
        </div>
        {{/if}}
      </div>

      <div class="border-t-2 border-slate-200 pt-6 mt-8">
        <div class="grid grid-cols-2 gap-6 text-xs text-slate-600">
          <div>
            <h4 class="font-bold text-slate-700 mb-2">Betalning sker till:</h4>
            <p class="font-semibold text-slate-900">{{organization_name}}</p>
            <p>{{organization_address}}</p>
            <p>{{organization_postal_code}} {{organization_city}}</p>
            {{#if organization_municipality}}
            <p>{{organization_municipality}} kommun</p>
            {{/if}}
            {{#if organization_email}}
            <p class="mt-2">E-post: {{organization_email}}</p>
            {{/if}}
            {{#if organization_phone}}
            <p>Telefon: {{organization_phone}}</p>
            {{/if}}
          </div>
          <div class="text-right">
            <div class="bg-slate-100 p-4 rounded">
              <p class="text-slate-700 leading-relaxed">
                Denna faktura är upprättad enligt <strong>Bokföringslagen (1999:1078)</strong> 
                och <strong>Mervärdesskattelagen (2023:200)</strong>
              </p>
            </div>
          </div>
        </div>
      </div>

    </div>
  </div>
</body>
</html><!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; padding: 40px; color: #1e293b; }
    .header { border-bottom: 3px solid #3b82f6; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; }
    .header-left { flex: 1; }
    .header-right { flex: 1; text-align: right; }
    .invoice-title { font-size: 32px; font-weight: bold; color: #3b82f6; margin-bottom: 10px; }
    .invoice-number { font-size: 18px; color: #64748b; }
    .section { margin: 20px 0; }
    .section-title { font-size: 14px; font-weight: bold; color: #64748b; text-transform: uppercase; margin-bottom: 8px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin: 30px 0; }
    .info-box { background: #f8fafc; padding: 15px; border-radius: 4px; }
    .info-box strong { display: block; color: #64748b; font-size: 12px; margin-bottom: 4px; }
    .table { width: 100%; border-collapse: collapse; margin: 30px 0; }
    .table th { background: #f1f5f9; padding: 12px; text-align: left; font-weight: 600; color: #475569; border-bottom: 2px solid #cbd5e1; }
    .table td { padding: 12px; border-bottom: 1px solid #e2e8f0; }
    .table tbody tr:hover { background: #f8fafc; }
    .totals { margin-top: 30px; }
    .totals-table { width: 300px; margin-left: auto; }
    .totals-table td { padding: 8px 12px; }
    .totals-table .label { text-align: right; color: #64748b; }
    .totals-table .amount { text-align: right; font-weight: 600; }
    .total-row { border-top: 2px solid #3b82f6; font-size: 18px; font-weight: bold; color: #3b82f6; }
    .footer { margin-top: 60px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; }
    .f-skatt { background: #dbeafe; border-left: 4px solid #3b82f6; padding: 10px 15px; margin: 20px 0; font-weight: 600; color: #1e40af; }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      <div class="invoice-title">FAKTURA</div>
      <div class="invoice-number">{{invoice_number}}</div>
    </div>
    <div class="header-right">
      <strong>{{organization_name}}</strong><br>
      Org.nr: {{organization_number}}<br>
      {{#if organization_vat_number}}Moms nr: {{organization_vat_number}}<br>{{/if}}
      {{organization_address}}<br>
      {{organization_postal_code}} {{organization_city}}<br>
      {{#if organization_municipality}}{{organization_municipality}} kommun<br>{{/if}}
      {{#if organization_email}}{{organization_email}}<br>{{/if}}
      {{#if organization_phone}}{{organization_phone}}{{/if}}
    </div>
  </div>

  {{#if organization_f_skatt_approved}}
  <div class="f-skatt">
    ✓ Godkänd för F-skatt
  </div>
  {{/if}}

  <div class="info-grid">
    <div class="info-box">
      <div class="section-title">Fakturamottagare</div>
      <strong>{{client_name}}</strong><br>
      {{client_address}}<br>
      {{client_postal_code}} {{client_city}}{{#if client_country}}, {{client_country}}{{/if}}<br>
      {{#if client_email}}{{client_email}}{{/if}}
    </div>
    
    <div class="info-box">
      <strong>Fakturadatum</strong>
      <div>{{issue_date}}</div>
      
      <strong style="margin-top: 12px;">Leveransdatum</strong>
      <div>{{delivery_date}}</div>
      
      <strong style="margin-top: 12px;">Förfallodatum</strong>
      <div>{{due_date}}</div>
      
      {{#if reference}}
      <strong style="margin-top: 12px;">Er referens</strong>
      <div>{{reference}}</div>
      {{/if}}
    </div>
  </div>

  <table class="table">
    <thead>
      <tr>
        <th>Beskrivning</th>
        <th style="text-align: center;">Antal</th>
        <th style="text-align: center;">Enhet</th>
        <th style="text-align: right;">Á-pris</th>
        <th style="text-align: right;">Moms %</th>
        <th style="text-align: right;">Belopp</th>
      </tr>
    </thead>
    <tbody>
      {{#each line_items}}
      <tr>
        <td>{{description}}</td>
        <td style="text-align: center;">{{quantity}}</td>
        <td style="text-align: center;">{{unit}}</td>
        <td style="text-align: right;">{{unit_price}} {{../currency}}</td>
        <td style="text-align: right;">{{tax_rate}}%</td>
        <td style="text-align: right;">{{amount}} {{../currency}}</td>
      </tr>
      {{/each}}
    </tbody>
  </table>

  <div class="totals">
    <table class="totals-table">
      <tr>
        <td class="label">Delsumma:</td>
        <td class="amount">{{subtotal}} {{currency}}</td>
      </tr>
      {{#each vat_groups}}
      <tr>
        <td class="label">Moms {{rate}}% ({{base}} {{../currency}}):</td>
        <td class="amount">{{vat}} {{../currency}}</td>
      </tr>
      {{/each}}
      <tr class="total-row">
        <td class="label">Att betala:</td>
        <td class="amount">{{total}} {{currency}}</td>
      </tr>
    </table>
  </div>

  {{#if notes}}
  <div class="section">
    <div class="section-title">Noteringar</div>
    <p>{{notes}}</p>
  </div>
  {{/if}}

  {{#if terms}}
  <div class="section">
    <div class="section-title">Betalningsvillkor</div>
    <p>{{terms}}</p>
  </div>
  {{/if}}

  {{#if payment_reference}}
  <div class="section">
    <div class="section-title">Betalningsinformation</div>
    <p><strong>OCR-nummer:</strong> {{payment_reference}}</p>
    <p>Ange alltid OCR-nummer vid betalning för snabb och korrekt hantering.</p>
  </div>
  {{/if}}

  <div class="footer">
    <p>Betalning sker till: {{organization_name}}</p>
    <p>Denna faktura är upprättad enligt Bokföringslagen (1999:1078) och Mervärdesskattelagen (2023:200)</p>
  </div>
</body>
</html>`,
        variables: ['invoice_number', 'payment_reference', 'issue_date', 'delivery_date', 'due_date', 'reference', 'client_name', 'client_address', 'client_city', 'client_postal_code', 'client_country', 'client_email', 'organization_name', 'organization_number', 'organization_vat_number', 'organization_municipality', 'organization_address', 'organization_city', 'organization_postal_code', 'organization_email', 'organization_phone', 'organization_f_skatt_approved', 'line_items', 'subtotal', 'vat_groups', 'total', 'currency', 'notes', 'terms'],
        is_system: true,
      },
      {
        name: 'Classic',
        content: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Times New Roman', serif; padding: 40px; color: #000; }
    .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #000; padding-bottom: 20px; }
    .invoice-title { font-size: 32px; font-weight: bold; letter-spacing: 2px; }
    .invoice-number { font-size: 16px; margin-top: 10px; }
    .org-info { text-align: center; margin-bottom: 30px; line-height: 1.6; }
    .f-skatt { text-align: center; background: #f0f0f0; border: 2px solid #000; padding: 10px; margin: 20px auto; width: fit-content; font-weight: bold; }
    .info-section { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin: 30px 0; }
    .info-box { background: #f9fafb; padding: 15px; border: 1px solid #d1d5db; }
    .info-box strong { display: block; font-size: 14px; margin-bottom: 8px; text-transform: uppercase; }
    .table { width: 100%; border: 1px solid #000; border-collapse: collapse; margin: 30px 0; }
    .table th, .table td { border: 1px solid #000; padding: 10px; }
    .table th { background: #e5e7eb; font-weight: bold; text-align: left; }
    .table td { text-align: left; }
    .table td.number { text-align: right; }
    .table td.center { text-align: center; }
    .totals { margin-top: 30px; }
    .totals-table { width: 350px; margin-left: auto; border: 1px solid #000; }
    .totals-table td { padding: 8px 12px; border-bottom: 1px solid #d1d5db; }
    .totals-table .label { text-align: right; }
    .totals-table .amount { text-align: right; font-weight: 600; }
    .total-row { border-top: 2px solid #000; font-size: 18px; font-weight: bold; }
    .total-row td { border-bottom: none; }
    .footer { margin-top: 60px; padding-top: 20px; border-top: 1px solid #000; font-size: 11px; text-align: center; }
    .section { margin: 25px 0; }
    .section-title { font-weight: bold; margin-bottom: 8px; text-decoration: underline; }
  </style>
</head>
<body>
  <div class="header">
    <div class="invoice-title">FAKTURA</div>
    <div class="invoice-number">{{invoice_number}}</div>
  </div>

  <div class="org-info">
    <strong style="font-size: 18px;">{{organization_name}}</strong><br>
    Organisationsnummer: {{organization_number}}<br>
    {{#if organization_vat_number}}Momsregistreringsnummer: {{organization_vat_number}}<br>{{/if}}
    {{organization_address}}, {{organization_postal_code}} {{organization_city}}<br>
    {{#if organization_municipality}}{{organization_municipality}} kommun<br>{{/if}}
    {{#if organization_email}}E-post: {{organization_email}}{{/if}}
    {{#if organization_phone}} | Tel: {{organization_phone}}{{/if}}
  </div>

  {{#if organization_f_skatt_approved}}
  <div class="f-skatt">
    GODKÄND FÖR F-SKATT
  </div>
  {{/if}}

  <div class="info-section">
    <div class="info-box">
      <strong>Fakturamottagare</strong>
      {{client_name}}<br>
      {{client_address}}<br>
      {{client_postal_code}} {{client_city}}{{#if client_country}}<br>{{client_country}}{{/if}}
      {{#if client_email}}<br>E-post: {{client_email}}{{/if}}
    </div>
    
    <div class="info-box">
      <strong>Fakturainformation</strong>
      <strong>Fakturadatum:</strong> {{issue_date}}<br>
      <strong>Leveransdatum:</strong> {{delivery_date}}<br>
      <strong>Förfallodatum:</strong> {{due_date}}
      {{#if reference}}<br><strong>Er referens:</strong> {{reference}}{{/if}}
    </div>
  </div>

  <table class="table">
    <thead>
      <tr>
        <th>Beskrivning</th>
        <th style="width: 80px; text-align: center;">Antal</th>
        <th style="width: 60px; text-align: center;">Enh</th>
        <th style="width: 100px; text-align: right;">Á-pris</th>
        <th style="width: 80px; text-align: right;">Moms %</th>
        <th style="width: 120px; text-align: right;">Belopp</th>
      </tr>
    </thead>
    <tbody>
      {{#each line_items}}
      <tr>
        <td>{{description}}</td>
        <td class="center">{{quantity}}</td>
        <td class="center">{{unit}}</td>
        <td class="number">{{unit_price}} {{../currency}}</td>
        <td class="number">{{tax_rate}}%</td>
        <td class="number">{{amount}} {{../currency}}</td>
      </tr>
      {{/each}}
    </tbody>
  </table>

  <div class="totals">
    <table class="totals-table">
      <tr>
        <td class="label">Delsumma:</td>
        <td class="amount">{{subtotal}} {{currency}}</td>
      </tr>
      {{#each vat_groups}}
      <tr>
        <td class="label">Moms {{rate}}% (på {{base}} {{../currency}}):</td>
        <td class="amount">{{vat}} {{../currency}}</td>
      </tr>
      {{/each}}
      <tr class="total-row">
        <td class="label"><strong>ATT BETALA:</strong></td>
        <td class="amount">{{total}} {{currency}}</td>
      </tr>
    </table>
  </div>

  {{#if notes}}
  <div class="section">
    <div class="section-title">Noteringar</div>
    <p>{{notes}}</p>
  </div>
  {{/if}}

  {{#if terms}}
  <div class="section">
    <div class="section-title">Betalningsvillkor</div>
    <p>{{terms}}</p>
  </div>
  {{/if}}

  {{#if payment_reference}}
  <div class="section">
    <div class="section-title">Betalningsinformation</div>
    <p><strong>OCR-nummer:</strong> {{payment_reference}}</p>
    <p>Ange alltid OCR-nummer vid betalning för snabb och korrekt hantering.</p>
  </div>
  {{/if}}

  <div class="footer">
    <p><strong>{{organization_name}}</strong></p>
    <p>Denna faktura är upprättad i enlighet med Bokföringslagen (1999:1078) och Mervärdesskattelagen (2023:200)</p>
  </div>
</body>
</html>`,
        variables: ['invoice_number', 'payment_reference', 'issue_date', 'delivery_date', 'due_date', 'reference', 'client_name', 'client_address', 'client_city', 'client_postal_code', 'client_country', 'client_email', 'organization_name', 'organization_number', 'organization_vat_number', 'organization_municipality', 'organization_address', 'organization_city', 'organization_postal_code', 'organization_email', 'organization_phone', 'organization_f_skatt_approved', 'line_items', 'subtotal', 'vat_groups', 'total', 'currency', 'notes', 'terms'],
        is_system: true,
      },
    ];
  }
}

export default new InvoiceTemplateResource();
