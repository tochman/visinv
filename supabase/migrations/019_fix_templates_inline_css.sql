-- Migration 019: Fix invoice templates to use inline CSS instead of Tailwind CDN
-- This avoids oklch color parsing issues with html2pdf/html2canvas

-- Delete existing system templates
DELETE FROM invoice_templates WHERE is_system = true;

-- Insert "Hallå" template - Modern/Friendly Swedish style
INSERT INTO invoice_templates (name, content, variables, is_system, user_id)
VALUES 
(
  'Hallå - Modern',
  '<!DOCTYPE html>
<html lang="sv">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Faktura {{invoice_number}}</title>
  <style>
    @import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap");
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: "Inter", -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: 14px;
      line-height: 1.5;
      color: #333;
      background: #fff;
      padding: 40px;
    }
    .invoice-container {
      max-width: 800px;
      margin: 0 auto;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 30px;
    }
    .greeting {
      flex: 1;
    }
    .greeting-text {
      font-size: 72px;
      font-weight: 800;
      color: #1a5f7a;
      line-height: 1;
      margin-bottom: 8px;
    }
    .greeting-sub {
      font-size: 24px;
      color: #333;
      font-weight: 400;
    }
    .company-info {
      text-align: right;
    }
    .company-name {
      font-size: 28px;
      color: #888;
      font-weight: 400;
      margin-bottom: 20px;
    }
    .client-box {
      background: #fff;
      text-align: left;
    }
    .client-name {
      font-weight: 600;
      font-size: 15px;
    }
    .client-address {
      color: #333;
      font-size: 14px;
      line-height: 1.6;
    }
    .details-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 20px;
      margin: 40px 0;
      padding: 20px 0;
      border-bottom: 1px solid #e5e5e5;
    }
    .detail-group label {
      display: block;
      font-size: 11px;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }
    .detail-group span {
      font-weight: 600;
      color: #333;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin: 30px 0;
    }
    .items-table thead tr {
      background: #1a5f7a;
      color: #fff;
    }
    .items-table th {
      padding: 14px 16px;
      font-size: 11px;
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
    .items-table td {
      padding: 16px;
      vertical-align: top;
    }
    .items-table td.right { text-align: right; }
    .items-table td.center { text-align: center; }
    .item-name { font-weight: 500; }
    .item-desc { color: #666; font-size: 13px; margin-top: 2px; }
    .free-text-row td {
      font-style: italic;
      color: #666;
      padding: 12px 16px;
    }
    .bottom-section {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
      margin-top: 40px;
    }
    .payment-box {
      background: #f8f9fa;
      padding: 24px;
      border-radius: 4px;
    }
    .payment-title {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 16px;
    }
    .payment-row {
      margin-bottom: 12px;
      font-size: 14px;
    }
    .payment-row strong {
      color: #1a5f7a;
    }
    .payment-note {
      font-size: 12px;
      color: #666;
      margin-top: 16px;
    }
    .totals-box {
      border: 2px solid #1a5f7a;
      border-radius: 4px;
      overflow: hidden;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 12px 20px;
      border-bottom: 1px solid #e5e5e5;
    }
    .total-row:last-child { border-bottom: none; }
    .total-row.grand {
      background: #1a5f7a;
      color: #fff;
      font-weight: 700;
      font-size: 16px;
    }
    .total-label { color: inherit; }
    .total-value { font-weight: 600; }
    .thank-you {
      margin-top: 50px;
      text-align: left;
    }
    .thank-you-text {
      font-size: 64px;
      font-weight: 800;
      color: #1a5f7a;
      line-height: 1;
    }
    .thank-you-sub {
      font-size: 20px;
      color: #333;
      margin-top: 8px;
    }
    .footer {
      margin-top: 50px;
      padding-top: 24px;
      border-top: 1px solid #e5e5e5;
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 30px;
      font-size: 12px;
    }
    .footer-section label {
      display: block;
      font-weight: 700;
      margin-bottom: 6px;
      color: #333;
    }
    .footer-section p {
      color: #555;
      margin: 2px 0;
    }
    .f-skatt {
      margin-top: 20px;
      color: #666;
      font-size: 12px;
    }
    @media print {
      body { padding: 20px; }
      @page { size: A4; margin: 15mm; }
    }
  </style>
</head>
<body>
  <div class="invoice-container">
    
    <div class="header">
      <div class="greeting">
        <div class="greeting-text">hallå!</div>
        <div class="greeting-sub">Här är din Faktura</div>
      </div>
      <div class="company-info">
        <div class="company-name">{{organization_name}}</div>
        <div class="client-box">
          <div class="client-name">{{client_name}}</div>
          <div class="client-address">
            {{client_address}}<br>
            {{client_postal_code}} {{client_city}}
            {{#if client_country}}<br>{{client_country}}{{/if}}
          </div>
        </div>
      </div>
    </div>

    <div class="details-grid">
      <div class="detail-group">
        <label>Fakturanr</label>
        <span>{{invoice_number}}</span>
      </div>
      <div class="detail-group">
        <label>Kundnr</label>
        <span>{{client_number}}</span>
      </div>
      <div class="detail-group">
        <label>Betalningsvillkor</label>
        <span>{{payment_terms}}</span>
      </div>
      <div class="detail-group">
        <label>Fakturadatum</label>
        <span>{{issue_date}}</span>
      </div>
      <div class="detail-group">
        <label>Förfallodatum</label>
        <span>{{due_date}}</span>
      </div>
      {{#if reference}}
      <div class="detail-group">
        <label>Er referens</label>
        <span>{{reference}}</span>
      </div>
      {{/if}}
    </div>

    <table class="items-table">
      <thead>
        <tr>
          <th style="width: 30%;">Produkt / Tjänst</th>
          <th style="width: 30%;">Beskrivning</th>
          <th class="center" style="width: 12%;">Antal</th>
          <th class="right" style="width: 14%;">Å-pris</th>
          <th class="right" style="width: 14%;">Belopp</th>
        </tr>
      </thead>
      <tbody>
        {{#each line_items}}
        <tr>
          <td class="item-name">{{description}}</td>
          <td class="item-desc">{{notes}}</td>
          <td class="center">{{quantity}}</td>
          <td class="right">{{unit_price}}</td>
          <td class="right">{{amount}}</td>
        </tr>
        {{/each}}
        {{#if notes}}
        <tr class="free-text-row">
          <td colspan="5">{{notes}}</td>
        </tr>
        {{/if}}
      </tbody>
    </table>

    <div class="bottom-section">
      <div class="payment-box">
        <div class="payment-title">Betala till:</div>
        <div class="payment-row">Betala in totalbeloppet senast <strong>{{due_date}}</strong></div>
        {{#if payment_reference}}
        <div class="payment-row">Ange <strong>{{payment_reference}}</strong> som Referensnr/OCR.</div>
        {{/if}}
        {{#if organization_bankgiro}}
        <div class="payment-row">Bankgiro: <strong>{{organization_bankgiro}}</strong></div>
        {{/if}}
        {{#if organization_plusgiro}}
        <div class="payment-row">Plusgiro: <strong>{{organization_plusgiro}}</strong></div>
        {{/if}}
        <div class="payment-note">Efter förfallodagen debiteras ränta enligt räntelagen</div>
      </div>
      
      <div class="totals-box">
        <div class="total-row">
          <span class="total-label">Netto:</span>
          <span class="total-value">{{subtotal}} {{currency}}</span>
        </div>
        {{#each vat_groups}}
        <div class="total-row">
          <span class="total-label">Moms {{rate}}% (beräknad på {{base}} {{../currency}}):</span>
          <span class="total-value">{{vat}} {{../currency}}</span>
        </div>
        {{/each}}
        <div class="total-row">
          <span class="total-label">Öresutjämning:</span>
          <span class="total-value">0,00 {{currency}}</span>
        </div>
        <div class="total-row grand">
          <span class="total-label">SUMMA TOTALT:</span>
          <span class="total-value">{{total}} {{currency}}</span>
        </div>
      </div>
    </div>

    <div class="thank-you">
      <div class="thank-you-text">tack!</div>
      <div class="thank-you-sub">För att du betalar din faktura</div>
    </div>

    <div class="footer">
      <div class="footer-section">
        <label>Adress</label>
        <p>{{organization_name}}</p>
        <p>{{organization_address}}</p>
        <p>{{organization_postal_code}} {{organization_city}}</p>
        {{#if organization_bic}}
        <p style="margin-top: 10px;"><strong>BIC/SWIFT</strong><br>{{organization_bic}}</p>
        {{/if}}
      </div>
      <div class="footer-section">
        <label>Telefon</label>
        <p>{{organization_phone}}</p>
        {{#if organization_iban}}
        <p style="margin-top: 10px;"><strong>IBAN</strong><br>{{organization_iban}}</p>
        {{/if}}
      </div>
      <div class="footer-section">
        <label>Webbplats</label>
        <p>{{organization_website}}</p>
        <p style="margin-top: 10px;"><strong>Företagets e-post</strong><br>{{organization_email}}</p>
      </div>
    </div>
    
    {{#if organization_f_skatt_approved}}
    <div class="f-skatt">Godkänd för F-skatt</div>
    {{/if}}

  </div>
</body>
</html>',
  ARRAY['invoice_number', 'payment_reference', 'issue_date', 'delivery_date', 'due_date', 'reference', 'client_name', 'client_number', 'client_address', 'client_city', 'client_postal_code', 'client_country', 'client_email', 'organization_name', 'organization_number', 'organization_vat_number', 'organization_municipality', 'organization_address', 'organization_city', 'organization_postal_code', 'organization_email', 'organization_phone', 'organization_website', 'organization_bankgiro', 'organization_plusgiro', 'organization_iban', 'organization_bic', 'organization_f_skatt_approved', 'payment_terms', 'line_items', 'subtotal', 'vat_groups', 'total', 'currency', 'notes', 'terms'],
  true,
  NULL
),
(
  'Klassisk - Professionell',
  '<!DOCTYPE html>
<html lang="sv">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Faktura {{invoice_number}}</title>
  <style>
    @import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap");
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: "Inter", -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: 13px;
      line-height: 1.5;
      color: #333;
      background: #fff;
      padding: 40px;
    }
    .invoice-container {
      max-width: 800px;
      margin: 0 auto;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 30px;
    }
    .company-name {
      font-size: 26px;
      font-weight: 700;
      color: #333;
    }
    .invoice-title {
      font-size: 28px;
      font-weight: 600;
      color: #333;
      letter-spacing: 2px;
    }
    .info-section {
      display: grid;
      grid-template-columns: 1.2fr 1fr;
      gap: 30px;
      margin-bottom: 20px;
    }
    .details-box {
      border: 1px solid #ddd;
      padding: 20px;
    }
    .details-grid {
      display: grid;
      grid-template-columns: auto 1fr auto;
      gap: 8px 20px;
      align-items: baseline;
    }
    .detail-label {
      font-size: 11px;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .detail-value {
      font-weight: 600;
    }
    .detail-ref {
      text-align: right;
    }
    .client-box {
      border: 1px solid #1a5f7a;
    }
    .client-header {
      background: #1a5f7a;
      color: #fff;
      padding: 10px 16px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .client-content {
      padding: 16px;
      background: #f8f9fa;
    }
    .client-name {
      font-weight: 600;
      margin-bottom: 4px;
    }
    .client-address {
      color: #555;
      line-height: 1.6;
    }
    .payment-note {
      font-size: 12px;
      color: #666;
      font-style: italic;
      margin: 16px 0 30px 0;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }
    .items-table thead tr {
      border-top: 3px solid #1a5f7a;
      border-bottom: 3px solid #1a5f7a;
    }
    .items-table th {
      padding: 12px 16px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      text-align: left;
      color: #1a5f7a;
    }
    .items-table th.right { text-align: right; }
    .items-table th.center { text-align: center; }
    .items-table tbody tr {
      border-bottom: 1px solid #e5e5e5;
    }
    .items-table td {
      padding: 14px 16px;
      vertical-align: top;
    }
    .items-table td.right { text-align: right; }
    .items-table td.center { text-align: center; }
    .item-name { font-weight: 500; }
    .item-desc { color: #666; font-size: 12px; }
    .free-text-row td {
      font-style: italic;
      color: #666;
      padding: 10px 16px;
      font-size: 12px;
    }
    .totals-section {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      margin-bottom: 20px;
    }
    .totals-rows {
      width: 320px;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      font-size: 13px;
    }
    .total-label { color: #555; }
    .total-value { font-weight: 500; text-align: right; min-width: 100px; }
    .grand-total {
      background: #1a5f7a;
      color: #fff;
      padding: 16px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 18px;
      font-weight: 600;
      margin-top: 10px;
    }
    .footer {
      margin-top: 40px;
      padding: 24px;
      border: 1px solid #ddd;
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 30px;
      font-size: 12px;
    }
    .footer-section {}
    .footer-label {
      font-size: 10px;
      color: #888;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 6px;
    }
    .footer-company {
      font-weight: 600;
      margin-bottom: 4px;
    }
    .footer-text {
      color: #555;
      line-height: 1.5;
    }
    .footer-iban {
      font-weight: 600;
      letter-spacing: 0.5px;
    }
    .f-skatt {
      text-align: right;
      margin-top: 16px;
      color: #666;
      font-size: 12px;
    }
    @media print {
      body { padding: 20px; }
      @page { size: A4; margin: 15mm; }
    }
  </style>
</head>
<body>
  <div class="invoice-container">
    
    <div class="header">
      <div class="company-name">{{organization_name}}</div>
      <div class="invoice-title">FAKTURA</div>
    </div>

    <div class="info-section">
      <div class="details-box">
        <div class="details-grid">
          <span class="detail-label">Fakturanr</span>
          <span class="detail-value">{{invoice_number}}</span>
          <span class="detail-label detail-ref">Vår referens</span>
          
          <span class="detail-label">Kundnr</span>
          <span class="detail-value">{{client_number}}</span>
          <span class="detail-value detail-ref">{{our_reference}}</span>
          
          <span class="detail-label">Fakturadatum</span>
          <span class="detail-value">{{issue_date}}</span>
          <span></span>
          
          <span class="detail-label">Betalningsvillkor</span>
          <span class="detail-value">{{payment_terms}}</span>
          <span></span>
          
          <span class="detail-label">Förfallodatum</span>
          <span class="detail-value">{{due_date}}</span>
          <span></span>
        </div>
      </div>
      
      <div class="client-box">
        <div class="client-header">Faktureringsadress</div>
        <div class="client-content">
          <div class="client-name">{{client_name}}</div>
          <div class="client-address">
            {{client_address}}<br>
            {{client_postal_code}} {{client_city}}
            {{#if client_country}}<br>{{client_country}}{{/if}}
          </div>
        </div>
      </div>
    </div>

    <div class="payment-note">Efter förfallodagen debiteras ränta enligt räntelagen</div>

    <table class="items-table">
      <thead>
        <tr>
          <th style="width: 35%;">Produkt / Tjänst</th>
          <th style="width: 25%;"></th>
          <th class="center" style="width: 12%;">Antal</th>
          <th class="right" style="width: 14%;">Å-pris</th>
          <th class="right" style="width: 14%;">Belopp</th>
        </tr>
      </thead>
      <tbody>
        {{#each line_items}}
        <tr>
          <td class="item-name">{{description}}</td>
          <td class="item-desc">{{notes}}</td>
          <td class="center">{{quantity}}</td>
          <td class="right">{{unit_price}}</td>
          <td class="right">{{amount}}</td>
        </tr>
        {{/each}}
        {{#if notes}}
        <tr class="free-text-row">
          <td colspan="5">{{notes}}</td>
        </tr>
        {{/if}}
      </tbody>
    </table>

    <div class="totals-section">
      <div class="totals-rows">
        <div class="total-row">
          <span class="total-label">Netto:</span>
          <span class="total-value">{{subtotal}} {{currency}}</span>
        </div>
        {{#each vat_groups}}
        <div class="total-row">
          <span class="total-label">Moms {{rate}}% (beräknad på {{base}} {{../currency}}):</span>
          <span class="total-value">{{vat}} {{../currency}}</span>
        </div>
        {{/each}}
        <div class="total-row">
          <span class="total-label">Öresutjämning:</span>
          <span class="total-value">0,00 {{currency}}</span>
        </div>
      </div>
      <div class="grand-total">
        <span>Summa att betala:</span>
        <span>{{total}} {{currency}}</span>
      </div>
    </div>

    <div class="footer">
      <div class="footer-section">
        <div class="footer-label">Adress</div>
        <div class="footer-company">{{organization_name}}</div>
        <div class="footer-text">
          {{organization_postal_code}} {{organization_city}}<br>
          {{#if organization_bic}}BIC/SWIFT<br><strong>{{organization_bic}}</strong>{{/if}}
        </div>
      </div>
      <div class="footer-section">
        <div class="footer-label">Telefon</div>
        <div class="footer-text">{{organization_phone}}</div>
        {{#if organization_iban}}
        <div style="margin-top: 12px;">
          <div class="footer-label">IBAN</div>
          <div class="footer-iban">{{organization_iban}}</div>
        </div>
        {{/if}}
      </div>
      <div class="footer-section">
        <div class="footer-label">Webbplats</div>
        <div class="footer-text">{{organization_website}}</div>
        <div style="margin-top: 12px;">
          <div class="footer-label">Företagets e-post</div>
          <div class="footer-text">{{organization_email}}</div>
        </div>
      </div>
    </div>
    
    {{#if organization_f_skatt_approved}}
    <div class="f-skatt">Godkänd för F-skatt</div>
    {{/if}}

  </div>
</body>
</html>',
  ARRAY['invoice_number', 'payment_reference', 'issue_date', 'delivery_date', 'due_date', 'reference', 'our_reference', 'client_name', 'client_number', 'client_address', 'client_city', 'client_postal_code', 'client_country', 'client_email', 'organization_name', 'organization_number', 'organization_vat_number', 'organization_municipality', 'organization_address', 'organization_city', 'organization_postal_code', 'organization_email', 'organization_phone', 'organization_website', 'organization_bankgiro', 'organization_plusgiro', 'organization_iban', 'organization_bic', 'organization_f_skatt_approved', 'payment_terms', 'line_items', 'subtotal', 'vat_groups', 'total', 'currency', 'notes', 'terms'],
  true,
  NULL
);
