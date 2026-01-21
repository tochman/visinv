-- Migration 022: Add English invoice templates
-- Two professional English templates: Studio Dark and Elegant Floral

-- Insert "Studio Dark" template - Professional dark header style
INSERT INTO invoice_templates (name, content, variables, is_system, user_id)
VALUES 
(
  'Studio Dark',
  '<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice {{invoice_number}}</title>
  <style>
    @import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap");
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: "Inter", -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: 14px;
      line-height: 1.5;
      color: #333;
      background: #f5f5f5;
    }
    .invoice-container {
      max-width: 800px;
      margin: 0 auto;
      background: #fff;
    }
    .header {
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
      color: #fff;
      padding: 40px;
      position: relative;
      overflow: hidden;
    }
    .header::before {
      content: "";
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: radial-gradient(circle at 20% 50%, rgba(255,255,255,0.1) 0%, transparent 50%),
                  radial-gradient(circle at 80% 30%, rgba(255,255,255,0.08) 0%, transparent 40%),
                  radial-gradient(circle at 40% 80%, rgba(255,255,255,0.05) 0%, transparent 30%);
      pointer-events: none;
    }
    .header-content {
      position: relative;
      z-index: 1;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .header-left h1 {
      font-size: 28px;
      font-weight: 700;
      margin-bottom: 8px;
      letter-spacing: 1px;
    }
    .header-dates {
      font-size: 13px;
      opacity: 0.9;
    }
    .header-dates p {
      margin-bottom: 4px;
    }
    .header-right {
      text-align: right;
    }
    .company-name {
      font-size: 24px;
      font-weight: 700;
      letter-spacing: 2px;
    }
    .main-content {
      padding: 40px;
    }
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
      margin-bottom: 40px;
      padding-bottom: 30px;
      border-bottom: 1px solid #e5e5e5;
    }
    .info-section h3 {
      font-size: 14px;
      font-weight: 700;
      color: #333;
      margin-bottom: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .info-section p {
      margin-bottom: 4px;
      color: #555;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin: 30px 0;
    }
    .items-table thead tr {
      background: #333;
      color: #fff;
    }
    .items-table th {
      padding: 14px 16px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      text-align: left;
    }
    .items-table th.right { text-align: right; }
    .items-table th.center { text-align: center; }
    .items-table tbody tr {
      border-bottom: 1px solid #e5e5e5;
    }
    .items-table tbody tr:nth-child(even) {
      background: #fafafa;
    }
    .items-table td {
      padding: 16px;
      vertical-align: top;
    }
    .items-table td.right { text-align: right; }
    .items-table td.center { text-align: center; }
    .item-name { font-weight: 500; }
    .item-desc { color: #666; font-size: 13px; margin-top: 4px; }
    .bottom-section {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
      margin-top: 40px;
    }
    .payment-section h4 {
      font-size: 14px;
      font-weight: 700;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .payment-section h4::before {
      content: ">>>";
      font-weight: 900;
      color: #333;
    }
    .payment-info {
      font-size: 13px;
      color: #555;
      line-height: 1.8;
    }
    .notes-section {
      margin-top: 30px;
    }
    .notes-section h4 {
      font-size: 14px;
      font-weight: 700;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .notes-section h4::before {
      content: ">>>";
      font-weight: 900;
      color: #333;
    }
    .notes-section p {
      font-size: 13px;
      color: #555;
      line-height: 1.7;
    }
    .totals-section {
      margin-left: auto;
      width: 280px;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 12px 16px;
      border-bottom: 1px solid #e5e5e5;
    }
    .total-row.grand {
      background: #333;
      color: #fff;
      font-weight: 700;
      font-size: 15px;
      border: none;
    }
    .signature-section {
      margin-top: 40px;
      text-align: right;
    }
    .signature-line {
      font-family: "Brush Script MT", "Segoe Script", cursive;
      font-size: 32px;
      margin-bottom: 8px;
    }
    .signature-name {
      font-weight: 600;
    }
    .signature-title {
      font-size: 13px;
      color: #666;
    }
    .footer {
      margin-top: 50px;
      padding: 20px 40px;
      background: #f8f8f8;
      display: flex;
      justify-content: space-between;
      font-size: 13px;
      color: #666;
    }
    .footer-item {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    @media print {
      body { background: #fff; }
      .invoice-container { box-shadow: none; }
    }
  </style>
</head>
<body>
  <div class="invoice-container">
    <div class="header">
      <div class="header-content">
        <div class="header-left">
          <h1>Invoice</h1>
          <div class="header-dates">
            <p>Due Date: {{due_date}}</p>
            <p>Date of Issue: {{invoice_date}}</p>
          </div>
        </div>
        <div class="header-right">
          <div class="company-name">{{organization_name}}</div>
        </div>
      </div>
    </div>

    <div class="main-content">
      <div class="info-grid">
        <div class="info-section">
          <h3>Client Information</h3>
          <p><strong>{{client_name}}</strong></p>
          {{#if client_company}}
          <p>{{client_company}}</p>
          {{/if}}
          <p>{{client_address}}</p>
          <p>{{client_postal_code}} {{client_city}}</p>
          {{#if client_email}}
          <p>{{client_email}}</p>
          {{/if}}
        </div>
        <div class="info-section">
          <h3>Invoice Details</h3>
          <p><strong>Invoice Number:</strong> {{invoice_number}}</p>
          <p><strong>Issue Date:</strong> {{invoice_date}}</p>
          <p><strong>Due Date:</strong> {{due_date}}</p>
          {{#if payment_reference}}
          <p><strong>Reference:</strong> {{payment_reference}}</p>
          {{/if}}
        </div>
      </div>

      <table class="items-table">
        <thead>
          <tr>
            <th style="width: 40%;">Service / Deliverable</th>
            <th class="center">Qty</th>
            <th class="right">Unit Price</th>
            <th class="right">Total</th>
          </tr>
        </thead>
        <tbody>
          {{#each items}}
          <tr>
            <td>
              <div class="item-name">{{name}}</div>
              {{#if description}}
              <div class="item-desc">{{description}}</div>
              {{/if}}
            </td>
            <td class="center">{{quantity}} {{#if unit}}{{unit}}{{/if}}</td>
            <td class="right">{{formatCurrency price}}</td>
            <td class="right">{{formatCurrency total}}</td>
          </tr>
          {{/each}}
        </tbody>
      </table>

      <div class="bottom-section">
        <div class="left-section">
          <div class="payment-section">
            <h4>Payment Method</h4>
            <div class="payment-info">
              {{#if organization_bank_name}}
              <p>Bank: {{organization_bank_name}}</p>
              {{/if}}
              {{#if organization_bank_account}}
              <p>Account: {{organization_bank_account}}</p>
              {{/if}}
              {{#if organization_iban}}
              <p>IBAN: {{organization_iban}}</p>
              {{/if}}
              {{#if organization_bic}}
              <p>BIC/SWIFT: {{organization_bic}}</p>
              {{/if}}
            </div>
          </div>

          {{#if notes}}
          <div class="notes-section">
            <h4>Notes</h4>
            <p>{{notes}}</p>
          </div>
          {{/if}}
        </div>

        <div class="totals-section">
          <div class="total-row">
            <span>Subtotal:</span>
            <span>{{formatCurrency subtotal}}</span>
          </div>
          {{#if vat_amount}}
          <div class="total-row">
            <span>VAT ({{vat_rate}}%):</span>
            <span>{{formatCurrency vat_amount}}</span>
          </div>
          {{/if}}
          <div class="total-row grand">
            <span>Total Amount Due:</span>
            <span>{{formatCurrency total}}</span>
          </div>
        </div>
      </div>

      <div class="signature-section">
        <div class="signature-line">{{organization_name}}</div>
        <div class="signature-name">{{organization_name}}</div>
        <div class="signature-title">Authorized Signature</div>
      </div>
    </div>

    <div class="footer">
      {{#if organization_phone}}
      <div class="footer-item">📞 {{organization_phone}}</div>
      {{/if}}
      {{#if organization_address}}
      <div class="footer-item">📍 {{organization_address}}, {{organization_city}}</div>
      {{/if}}
      {{#if organization_email}}
      <div class="footer-item">🌐 {{organization_email}}</div>
      {{/if}}
    </div>
  </div>
</body>
</html>',
  ARRAY['invoice_number', 'invoice_date', 'due_date', 'client_name', 'client_company', 'client_address', 'client_postal_code', 'client_city', 'client_email', 'organization_name', 'organization_phone', 'organization_email', 'organization_address', 'organization_city', 'organization_bank_name', 'organization_bank_account', 'organization_iban', 'organization_bic', 'payment_reference', 'items', 'subtotal', 'vat_rate', 'vat_amount', 'total', 'notes'],
  true,
  NULL
);

-- Insert "Elegant Floral" template - Clean white design with decorative elements
INSERT INTO invoice_templates (name, content, variables, is_system, user_id)
VALUES 
(
  'Elegant Floral',
  '<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice {{invoice_number}}</title>
  <style>
    @import url("https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Inter:wght@400;500;600&display=swap");
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: "Inter", -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: 14px;
      line-height: 1.6;
      color: #333;
      background: #fff;
      padding: 40px;
    }
    .invoice-container {
      max-width: 800px;
      margin: 0 auto;
      position: relative;
    }
    /* Decorative floral corner elements */
    .invoice-container::before {
      content: "";
      position: absolute;
      top: 0;
      left: 0;
      width: 200px;
      height: 300px;
      background-image: url("data:image/svg+xml,%3Csvg xmlns=''http://www.w3.org/2000/svg'' viewBox=''0 0 200 300'' fill=''none'' stroke=''%23e0e0e0'' stroke-width=''1''%3E%3Cpath d=''M20 280 Q60 250 40 200 Q20 150 60 120 Q100 90 80 40'' /%3E%3Cpath d=''M40 260 Q80 230 60 180 Q40 130 80 100 Q120 70 100 20'' /%3E%3Cpath d=''M60 240 C80 220 70 190 90 170 C110 150 100 120 120 100'' /%3E%3Ccircle cx=''80'' cy=''40'' r=''15'' /%3E%3Ccircle cx=''100'' cy=''20'' r=''10'' /%3E%3Ccircle cx=''120'' cy=''100'' r=''12'' /%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-size: contain;
      opacity: 0.6;
      pointer-events: none;
    }
    .invoice-container::after {
      content: "";
      position: absolute;
      bottom: 0;
      right: 0;
      width: 150px;
      height: 200px;
      background-image: url("data:image/svg+xml,%3Csvg xmlns=''http://www.w3.org/2000/svg'' viewBox=''0 0 150 200'' fill=''none'' stroke=''%23e0e0e0'' stroke-width=''1''%3E%3Cpath d=''M130 20 Q90 50 110 100 Q130 150 90 180'' /%3E%3Cpath d=''M110 40 Q70 70 90 120 Q110 170 70 200'' /%3E%3Ccircle cx=''70'' cy=''180'' r=''12'' /%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-size: contain;
      opacity: 0.6;
      pointer-events: none;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 50px;
      position: relative;
      z-index: 1;
    }
    .company-section h1 {
      font-family: "Playfair Display", Georgia, serif;
      font-size: 36px;
      font-weight: 700;
      line-height: 1.1;
      margin-bottom: 10px;
    }
    .company-section .address {
      font-size: 13px;
      color: #666;
      line-height: 1.6;
    }
    .invoice-section {
      text-align: right;
    }
    .invoice-title {
      font-family: "Playfair Display", Georgia, serif;
      font-size: 42px;
      font-weight: 400;
      font-style: italic;
      letter-spacing: 2px;
      text-decoration: underline;
      text-underline-offset: 8px;
      margin-bottom: 15px;
    }
    .invoice-meta {
      font-size: 13px;
      color: #666;
      line-height: 1.8;
    }
    .details-section {
      display: flex;
      justify-content: space-between;
      margin-bottom: 40px;
      position: relative;
      z-index: 1;
    }
    .bill-to h3, .payment-method h3 {
      font-weight: 700;
      font-size: 14px;
      margin-bottom: 10px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .bill-to p, .payment-method p {
      font-size: 13px;
      color: #555;
      margin-bottom: 3px;
    }
    .payment-method {
      text-align: right;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin: 30px 0;
      position: relative;
      z-index: 1;
    }
    .items-table th {
      padding: 12px 16px;
      font-size: 13px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      text-align: left;
      border-bottom: 2px solid #333;
    }
    .items-table th.right { text-align: right; }
    .items-table th.center { text-align: center; }
    .items-table tbody tr {
      border-bottom: 1px solid #e5e5e5;
    }
    .items-table td {
      padding: 16px;
      vertical-align: top;
    }
    .items-table td.right { text-align: right; }
    .items-table td.center { text-align: center; }
    .item-number {
      font-weight: 600;
      color: #333;
    }
    .item-name {
      font-weight: 600;
    }
    .item-desc {
      color: #666;
      font-size: 13px;
      margin-top: 4px;
      font-style: italic;
    }
    .totals-wrapper {
      display: flex;
      justify-content: flex-end;
      margin: 30px 0;
      position: relative;
      z-index: 1;
    }
    .totals-section {
      width: 280px;
      border-top: 1px solid #333;
      padding-top: 20px;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      font-size: 14px;
    }
    .total-row.grand {
      border-top: 1px solid #333;
      margin-top: 10px;
      padding-top: 15px;
      font-weight: 700;
      font-size: 16px;
    }
    .bottom-section {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-top: 60px;
      position: relative;
      z-index: 1;
    }
    .terms-section h4 {
      font-weight: 700;
      font-size: 14px;
      margin-bottom: 8px;
    }
    .terms-section p {
      font-size: 12px;
      color: #666;
      font-style: italic;
      max-width: 300px;
      line-height: 1.6;
    }
    .signature-section {
      text-align: right;
    }
    .signature-line {
      font-family: "Brush Script MT", "Segoe Script", cursive;
      font-size: 36px;
      margin-bottom: 8px;
    }
    .signature-name {
      font-weight: 700;
      font-size: 14px;
    }
    .signature-title {
      font-size: 13px;
      color: #666;
    }
    @media print {
      body { padding: 20px; }
      .invoice-container::before,
      .invoice-container::after { opacity: 0.4; }
    }
  </style>
</head>
<body>
  <div class="invoice-container">
    <div class="header">
      <div class="company-section">
        <h1>{{organization_name}}</h1>
        <div class="address">
          {{#if organization_address}}
          {{organization_address}}<br>
          {{/if}}
          {{#if organization_city}}
          {{organization_postal_code}} {{organization_city}}<br>
          {{/if}}
          {{#if organization_phone}}
          {{organization_phone}}
          {{/if}}
        </div>
      </div>
      <div class="invoice-section">
        <div class="invoice-title">INVOICE</div>
        <div class="invoice-meta">
          Invoice Number: #{{invoice_number}}<br>
          Date: {{invoice_date}}<br>
          Due Date: {{due_date}}
        </div>
      </div>
    </div>

    <div class="details-section">
      <div class="bill-to">
        <h3>Bill To:</h3>
        <p><strong>{{client_name}}</strong></p>
        {{#if client_address}}
        <p>{{client_address}}</p>
        {{/if}}
        {{#if client_city}}
        <p>{{client_postal_code}} {{client_city}}</p>
        {{/if}}
        {{#if client_phone}}
        <p>{{client_phone}}</p>
        {{/if}}
      </div>
      <div class="payment-method">
        <h3>Payment Method</h3>
        {{#if organization_bank_name}}
        <p>{{organization_bank_name}}</p>
        {{/if}}
        {{#if organization_bank_account}}
        <p>{{organization_bank_account}}</p>
        {{/if}}
        {{#if organization_iban}}
        <p>IBAN: {{organization_iban}}</p>
        {{/if}}
      </div>
    </div>

    <table class="items-table">
      <thead>
        <tr>
          <th style="width: 50px;">No</th>
          <th>Item Description</th>
          <th class="right">Price</th>
          <th class="center">Qty</th>
          <th class="right">Total</th>
        </tr>
      </thead>
      <tbody>
        {{#each items}}
        <tr>
          <td class="item-number">{{@index_plus_one}}</td>
          <td>
            <div class="item-name">{{name}}</div>
            {{#if description}}
            <div class="item-desc">{{description}}</div>
            {{/if}}
          </td>
          <td class="right">{{formatCurrency price}}</td>
          <td class="center">{{quantity}}</td>
          <td class="right">{{formatCurrency total}}</td>
        </tr>
        {{/each}}
      </tbody>
    </table>

    <div class="totals-wrapper">
      <div class="totals-section">
        <div class="total-row">
          <span>Total</span>
          <span>{{formatCurrency subtotal}}</span>
        </div>
        {{#if vat_amount}}
        <div class="total-row">
          <span>Tax ({{vat_rate}}%)</span>
          <span>{{formatCurrency vat_amount}}</span>
        </div>
        {{else}}
        <div class="total-row">
          <span>Tax</span>
          <span>-</span>
        </div>
        {{/if}}
        {{#if discount}}
        <div class="total-row">
          <span>Discount</span>
          <span>-{{formatCurrency discount}}</span>
        </div>
        {{else}}
        <div class="total-row">
          <span>Discount</span>
          <span>-</span>
        </div>
        {{/if}}
        <div class="total-row grand">
          <span>Sub Total</span>
          <span>{{formatCurrency total}}</span>
        </div>
      </div>
    </div>

    <div class="bottom-section">
      <div class="terms-section">
        <h4>Terms and Conditions:</h4>
        {{#if terms}}
        <p>{{terms}}</p>
        {{else}}
        <p>Payment is due within the specified due date. Please include the invoice number in your payment reference.</p>
        {{/if}}
      </div>
      <div class="signature-section">
        <div class="signature-line">{{organization_name}}</div>
        <div class="signature-name">{{organization_name}}</div>
        <div class="signature-title">Manager</div>
      </div>
    </div>
  </div>
</body>
</html>',
  ARRAY['invoice_number', 'invoice_date', 'due_date', 'client_name', 'client_address', 'client_postal_code', 'client_city', 'client_phone', 'organization_name', 'organization_address', 'organization_postal_code', 'organization_city', 'organization_phone', 'organization_bank_name', 'organization_bank_account', 'organization_iban', 'items', 'subtotal', 'vat_rate', 'vat_amount', 'discount', 'total', 'terms'],
  true,
  NULL
);
