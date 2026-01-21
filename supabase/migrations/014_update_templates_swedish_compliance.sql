-- Migration 014: Update invoice templates for Swedish compliance
-- Updates system templates (Modern and Classic) to include all mandatory Swedish fields
-- Addresses US-067, US-069, US-070, US-071

-- Delete old system templates
DELETE FROM invoice_templates WHERE is_system = true;

-- Insert updated Modern template with Swedish compliance
INSERT INTO invoice_templates (name, content, variables, is_system, user_id)
VALUES 
(
  'Modern',
  '<!DOCTYPE html>
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

  <div class="footer">
    <p>Betalning sker till: {{organization_name}}</p>
    <p>Denna faktura är upprättad enligt Bokföringslagen (1999:1078) och Mervärdesskattelagen (2023:200)</p>
  </div>
</body>
</html>',
  ARRAY['invoice_number', 'issue_date', 'delivery_date', 'due_date', 'reference', 'client_name', 'client_address', 'client_city', 'client_postal_code', 'client_country', 'client_email', 'organization_name', 'organization_number', 'organization_vat_number', 'organization_municipality', 'organization_address', 'organization_city', 'organization_postal_code', 'organization_email', 'organization_phone', 'organization_f_skatt_approved', 'line_items', 'subtotal', 'vat_groups', 'total', 'currency', 'notes', 'terms'],
  true,
  NULL
),
(
  'Classic',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: ''Times New Roman'', serif; padding: 40px; color: #000; }
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

  <div class="footer">
    <p><strong>{{organization_name}}</strong></p>
    <p>Denna faktura är upprättad i enlighet med Bokföringslagen (1999:1078) och Mervärdesskattelagen (2023:200)</p>
  </div>
</body>
</html>',
  ARRAY['invoice_number', 'issue_date', 'delivery_date', 'due_date', 'reference', 'client_name', 'client_address', 'client_city', 'client_postal_code', 'client_country', 'client_email', 'organization_name', 'organization_number', 'organization_vat_number', 'organization_municipality', 'organization_address', 'organization_city', 'organization_postal_code', 'organization_email', 'organization_phone', 'organization_f_skatt_approved', 'line_items', 'subtotal', 'vat_groups', 'total', 'currency', 'notes', 'terms'],
  true,
  NULL
);
