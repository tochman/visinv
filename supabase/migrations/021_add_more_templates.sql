-- Migration 021: Add 4 more professional Swedish invoice templates

-- Template 3: "Ren" - Clean minimal with payment highlight box
INSERT INTO invoice_templates (name, content, variables, is_system, user_id)
VALUES 
(
  'Ren - Minimalistisk',
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
    .invoice-container { max-width: 800px; margin: 0 auto; }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 40px;
    }
    .company-name {
      font-size: 28px;
      font-weight: 700;
      font-style: italic;
      color: #1a5f7a;
    }
    .invoice-title {
      font-size: 32px;
      font-weight: 700;
      color: #333;
      letter-spacing: 1px;
    }
    .top-section {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
      margin-bottom: 30px;
    }
    .details-left {
      font-size: 12px;
      color: #555;
    }
    .details-left .row {
      display: flex;
      margin-bottom: 6px;
    }
    .details-left .label {
      width: 130px;
      color: #888;
    }
    .details-left .value {
      font-weight: 500;
      color: #333;
    }
    .client-block {
      text-align: right;
      font-size: 13px;
    }
    .client-name { font-weight: 600; }
    .client-address { color: #555; }
    .payment-note {
      font-size: 11px;
      color: #888;
      font-style: italic;
      margin: 20px 0 30px 0;
    }
    .payment-highlight {
      background: #f8f9fa;
      border: 1px solid #e5e5e5;
      padding: 20px 24px;
      margin-bottom: 30px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .payment-highlight .left .label {
      font-size: 12px;
      color: #666;
      margin-bottom: 2px;
    }
    .payment-highlight .left .amount {
      font-size: 24px;
      font-weight: 700;
      color: #1a5f7a;
    }
    .payment-highlight .right {
      text-align: right;
      font-size: 13px;
    }
    .payment-highlight .right .label {
      color: #666;
    }
    .payment-highlight .right .value {
      font-weight: 600;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }
    .items-table thead tr {
      border-bottom: 2px solid #1a5f7a;
    }
    .items-table th {
      padding: 12px 0;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      text-align: left;
      color: #333;
    }
    .items-table th.right { text-align: right; }
    .items-table th.center { text-align: center; }
    .items-table tbody tr {
      border-bottom: 1px solid #eee;
    }
    .items-table td {
      padding: 14px 0;
      vertical-align: top;
    }
    .items-table td.right { text-align: right; }
    .items-table td.center { text-align: center; }
    .item-name { font-weight: 500; }
    .item-desc { color: #888; font-size: 12px; }
    .free-text-row td {
      font-style: italic;
      color: #888;
      padding: 10px 0;
      font-size: 12px;
    }
    .totals-section {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      margin-bottom: 40px;
    }
    .totals-rows { width: 300px; }
    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 6px 0;
      font-size: 13px;
    }
    .total-label { color: #666; }
    .total-value { font-weight: 500; text-align: right; }
    .grand-total {
      border-top: 2px solid #1a5f7a;
      padding-top: 12px;
      margin-top: 8px;
      font-size: 16px;
      font-weight: 700;
    }
    .grand-total .total-label,
    .grand-total .total-value { color: #1a5f7a; }
    .footer {
      margin-top: 50px;
      padding: 24px;
      border: 1px solid #e5e5e5;
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 24px;
      font-size: 11px;
    }
    .footer-section .footer-label {
      font-size: 10px;
      color: #888;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 6px;
    }
    .footer-section .footer-company { font-weight: 600; }
    .footer-section .footer-text { color: #555; line-height: 1.6; }
    .f-skatt {
      text-align: right;
      margin-top: 16px;
      color: #888;
      font-size: 11px;
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

    <div class="top-section">
      <div class="details-left">
        <div class="row"><span class="label">Fakturanr</span><span class="value">{{invoice_number}}</span></div>
        <div class="row"><span class="label">Kundnr</span><span class="value">{{client_number}}</span></div>
        <div class="row"><span class="label">Fakturadatum</span><span class="value">{{issue_date}}</span></div>
        <div class="row"><span class="label">Betalningsvillkor</span><span class="value">{{payment_terms}}</span></div>
      </div>
      <div class="client-block">
        <div class="client-name">{{client_name}}</div>
        <div class="client-address">
          {{client_address}}<br>
          {{client_postal_code}} {{client_city}}
          {{#if client_country}}<br>{{client_country}}{{/if}}
        </div>
      </div>
    </div>

    <div class="payment-note">Efter förfallodagen debiteras ränta enligt räntelagen</div>

    <div class="payment-highlight">
      <div class="left">
        <div class="label">Att betala</div>
        <div class="amount">{{total}} {{currency}}</div>
      </div>
      <div class="right">
        <div class="label">Förfallodatum:</div>
        <div class="value">{{due_date}}</div>
      </div>
    </div>

    <table class="items-table">
      <thead>
        <tr>
          <th style="width: 35%;">Produkt / tjänst</th>
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
        <div class="total-row grand-total">
          <span class="total-label">Summa att betala:</span>
          <span class="total-value">{{total}} {{currency}}</span>
        </div>
      </div>
    </div>

    <div class="footer">
      <div class="footer-section">
        <div class="footer-label">Adress</div>
        <div class="footer-company">{{organization_name}}</div>
        <div class="footer-text">
          {{organization_postal_code}} {{organization_city}}<br>
          {{#if organization_bic}}<strong>BIC/SWIFT</strong><br>{{organization_bic}}{{/if}}
        </div>
      </div>
      <div class="footer-section">
        <div class="footer-label">Telefon</div>
        <div class="footer-text">{{organization_phone}}</div>
        {{#if organization_iban}}
        <div style="margin-top: 10px;">
          <div class="footer-label">IBAN</div>
          <div class="footer-text">{{organization_iban}}</div>
        </div>
        {{/if}}
      </div>
      <div class="footer-section">
        <div class="footer-label">Webbplats</div>
        <div class="footer-text">{{organization_website}}</div>
        <div style="margin-top: 10px;">
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
  ARRAY['invoice_number', 'payment_reference', 'issue_date', 'delivery_date', 'due_date', 'reference', 'client_name', 'client_number', 'client_address', 'client_city', 'client_postal_code', 'client_country', 'client_email', 'organization_name', 'organization_number', 'organization_vat_number', 'organization_address', 'organization_city', 'organization_postal_code', 'organization_email', 'organization_phone', 'organization_website', 'organization_bankgiro', 'organization_plusgiro', 'organization_iban', 'organization_bic', 'organization_f_skatt_approved', 'payment_terms', 'line_items', 'subtotal', 'vat_groups', 'total', 'currency', 'notes', 'terms'],
  true,
  NULL
);

-- Template 4: "Understruken" - Company name with underline, OCR/reference box
INSERT INTO invoice_templates (name, content, variables, is_system, user_id)
VALUES 
(
  'Understruken - Elegant',
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
      font-size: 13px;
      line-height: 1.5;
      color: #333;
      background: #fff;
      padding: 40px;
    }
    .invoice-container { max-width: 800px; margin: 0 auto; }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 40px;
    }
    .company-name {
      font-size: 32px;
      font-weight: 800;
      color: #1a5f7a;
      border-bottom: 4px solid #1a5f7a;
      padding-bottom: 8px;
      display: inline-block;
    }
    .header-right { text-align: right; }
    .invoice-title {
      font-size: 28px;
      font-weight: 400;
      color: #1a5f7a;
      margin-bottom: 4px;
    }
    .invoice-number {
      font-size: 14px;
      color: #666;
    }
    .top-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
      margin-bottom: 30px;
    }
    .client-block {
      text-align: right;
    }
    .client-name { font-weight: 600; font-size: 14px; }
    .client-address { color: #555; font-size: 13px; }
    .details-list {
      font-size: 12px;
    }
    .details-list .row {
      display: flex;
      margin-bottom: 6px;
    }
    .details-list .label {
      width: 130px;
      color: #888;
    }
    .details-list .value {
      font-weight: 500;
    }
    .payment-note {
      font-size: 11px;
      color: #888;
      font-style: italic;
      margin-bottom: 20px;
    }
    .payment-box {
      background: #f8f9fa;
      border: 1px solid #ddd;
      padding: 16px 20px;
      margin-bottom: 30px;
    }
    .payment-box .row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
    }
    .payment-box .row:last-child { margin-bottom: 0; }
    .payment-box .label { color: #555; }
    .payment-box .value { font-weight: 600; }
    .payment-box .value.large { font-size: 18px; color: #1a5f7a; }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }
    .items-table thead tr {
      background: #1a5f7a;
      color: #fff;
    }
    .items-table th {
      padding: 12px 14px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      text-align: left;
    }
    .items-table th.right { text-align: right; }
    .items-table th.center { text-align: center; }
    .items-table tbody tr { border-bottom: 1px solid #eee; }
    .items-table td {
      padding: 14px;
      vertical-align: top;
    }
    .items-table td.right { text-align: right; }
    .items-table td.center { text-align: center; }
    .item-name { font-weight: 500; }
    .item-desc { color: #888; font-size: 12px; }
    .free-text-row td {
      font-style: italic;
      color: #888;
      font-size: 12px;
    }
    .totals-section {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 40px;
    }
    .totals-box {
      width: 320px;
      border: 2px solid #1a5f7a;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 10px 16px;
      border-bottom: 1px solid #eee;
    }
    .total-row:last-child { border-bottom: none; }
    .total-label { color: #555; }
    .total-value { font-weight: 500; }
    .total-row.grand {
      background: #1a5f7a;
      color: #fff;
      font-weight: 700;
    }
    .footer {
      margin-top: 50px;
      padding-top: 20px;
      border-top: 1px solid #ddd;
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 24px;
      font-size: 11px;
    }
    .footer-section .footer-label {
      font-size: 10px;
      color: #888;
      text-transform: uppercase;
      margin-bottom: 4px;
    }
    .footer-section .footer-text { color: #555; }
    .footer-section .footer-company { font-weight: 600; margin-bottom: 4px; }
    .f-skatt {
      text-align: right;
      margin-top: 12px;
      color: #888;
      font-size: 11px;
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
      <div class="header-right">
        <div class="invoice-title">Faktura</div>
        <div class="invoice-number">{{invoice_number}}</div>
      </div>
    </div>

    <div class="top-grid">
      <div class="details-list">
        <div class="row"><span class="label">Kundnr</span><span class="value">{{client_number}}</span></div>
        <div class="row"><span class="label">Fakturanr</span><span class="value">{{invoice_number}}</span></div>
        <div class="row"><span class="label">Er referens</span><span class="value">{{reference}}</span></div>
        <div class="row"><span class="label">Vår referens</span><span class="value">{{our_reference}}</span></div>
        <div class="row"><span class="label">Betalningsvillkor</span><span class="value">{{payment_terms}}</span></div>
        <div class="row"><span class="label">Fakturadatum</span><span class="value">{{issue_date}}</span></div>
      </div>
      <div class="client-block">
        <div class="client-name">{{client_name}}</div>
        <div class="client-address">
          {{client_address}}<br>
          {{client_postal_code}} {{client_city}}
          {{#if client_country}}<br>{{client_country}}{{/if}}
        </div>
      </div>
    </div>

    <div class="payment-note">Efter förfallodagen debiteras ränta enligt räntelagen</div>

    <div class="payment-box">
      <div class="row">
        <span class="label">Att betala</span>
        <span class="value large">{{total}} {{currency}}</span>
      </div>
      <div class="row">
        <span class="label">Förfallodatum</span>
        <span class="value">{{due_date}}</span>
      </div>
      {{#if payment_reference}}
      <div class="row">
        <span class="label">Referensnr/OCR</span>
        <span class="value">{{payment_reference}}</span>
      </div>
      {{/if}}
    </div>

    <table class="items-table">
      <thead>
        <tr>
          <th style="width: 35%;">Produkt / tjänst</th>
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

    <div class="footer">
      <div class="footer-section">
        <div class="footer-label">Adress</div>
        <div class="footer-company">{{organization_name}}, {{organization_postal_code}},</div>
        <div class="footer-text">{{organization_city}}</div>
        {{#if organization_f_skatt_approved}}
        <div class="footer-text" style="margin-top: 8px;">Godkänd för F-skatt</div>
        {{/if}}
        {{#if organization_bic}}
        <div class="footer-text" style="margin-top: 8px;"><strong>BIC/SWIFT</strong><br>{{organization_bic}}</div>
        {{/if}}
      </div>
      <div class="footer-section">
        <div class="footer-label">Telefon</div>
        <div class="footer-text">{{organization_phone}}</div>
        {{#if organization_iban}}
        <div style="margin-top: 10px;">
          <div class="footer-label">IBAN</div>
          <div class="footer-text">{{organization_iban}}</div>
        </div>
        {{/if}}
      </div>
      <div class="footer-section">
        <div class="footer-label">Webbplats</div>
        <div class="footer-text">{{organization_website}}</div>
        <div style="margin-top: 10px;">
          <div class="footer-label">Företagets E-Post</div>
          <div class="footer-text">{{organization_email}}</div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>',
  ARRAY['invoice_number', 'payment_reference', 'issue_date', 'delivery_date', 'due_date', 'reference', 'our_reference', 'client_name', 'client_number', 'client_address', 'client_city', 'client_postal_code', 'client_country', 'client_email', 'organization_name', 'organization_number', 'organization_vat_number', 'organization_address', 'organization_city', 'organization_postal_code', 'organization_email', 'organization_phone', 'organization_website', 'organization_bankgiro', 'organization_plusgiro', 'organization_iban', 'organization_bic', 'organization_f_skatt_approved', 'payment_terms', 'line_items', 'subtotal', 'vat_groups', 'total', 'currency', 'notes', 'terms'],
  true,
  NULL
);

-- Template 5: "Sidebar" - Two column layout with metadata sidebar
INSERT INTO invoice_templates (name, content, variables, is_system, user_id)
VALUES 
(
  'Sidebar - Tvåkolumn',
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
      font-size: 13px;
      line-height: 1.5;
      color: #333;
      background: #fff;
      padding: 40px;
    }
    .invoice-container { max-width: 800px; margin: 0 auto; }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 4px solid #1a5f7a;
    }
    .company-name {
      font-size: 28px;
      font-weight: 800;
      color: #1a5f7a;
    }
    .header-right { text-align: right; }
    .invoice-title {
      font-size: 28px;
      font-weight: 700;
      color: #333;
      letter-spacing: 2px;
    }
    .invoice-number {
      font-size: 14px;
      color: #666;
      margin-top: 4px;
    }
    .main-grid {
      display: grid;
      grid-template-columns: 200px 1fr;
      gap: 40px;
    }
    .sidebar {
      font-size: 12px;
    }
    .sidebar-section {
      margin-bottom: 24px;
    }
    .sidebar-label {
      font-size: 10px;
      font-weight: 700;
      color: #1a5f7a;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
    }
    .sidebar-value {
      color: #333;
      line-height: 1.6;
    }
    .sidebar-value strong { font-weight: 600; }
    .content-area { }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }
    .items-table thead tr {
      background: #1a5f7a;
      color: #fff;
    }
    .items-table th {
      padding: 12px 14px;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      text-align: left;
    }
    .items-table th.right { text-align: right; }
    .items-table th.center { text-align: center; }
    .items-table tbody tr { border-bottom: 1px solid #eee; }
    .items-table td {
      padding: 14px;
      vertical-align: top;
    }
    .items-table td.right { text-align: right; }
    .items-table td.center { text-align: center; }
    .item-name { font-weight: 600; text-transform: uppercase; font-size: 12px; }
    .item-desc { color: #666; font-size: 11px; margin-top: 2px; }
    .free-text-row td {
      font-style: italic;
      color: #888;
      font-size: 12px;
    }
    .totals-box {
      background: #f8f9fa;
      border: 1px solid #e5e5e5;
      padding: 20px;
      margin-bottom: 20px;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
      font-size: 13px;
    }
    .total-row:last-child { margin-bottom: 0; }
    .total-label { color: #666; }
    .total-value { font-weight: 500; }
    .grand-total {
      border-top: 2px solid #1a5f7a;
      padding-top: 12px;
      margin-top: 12px;
      font-size: 18px;
      font-weight: 700;
    }
    .grand-total .total-label,
    .grand-total .total-value { color: #1a5f7a; }
    .footer {
      margin-top: 40px;
      padding: 20px;
      background: #f8f9fa;
      border-top: 4px solid #1a5f7a;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      font-size: 11px;
    }
    .footer-left { }
    .footer-right { text-align: right; }
    .footer-company { font-weight: 600; }
    .footer-text { color: #555; margin-top: 4px; }
    .footer-label {
      font-size: 10px;
      color: #888;
      text-transform: uppercase;
      margin-top: 12px;
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
      <div class="header-right">
        <div class="invoice-title">FAKTURA</div>
        <div class="invoice-number">{{invoice_number}}</div>
      </div>
    </div>

    <div class="main-grid">
      <div class="sidebar">
        <div class="sidebar-section">
          <div class="sidebar-label">Faktureringsadress</div>
          <div class="sidebar-value">
            <strong>{{client_name}}</strong><br>
            {{client_address}}<br>
            {{client_postal_code}} {{client_city}}
            {{#if client_country}}<br>{{client_country}}{{/if}}
          </div>
        </div>

        <div class="sidebar-section">
          <div class="sidebar-label">Förfallodatum</div>
          <div class="sidebar-value"><strong>{{due_date}}</strong></div>
        </div>

        {{#if reference}}
        <div class="sidebar-section">
          <div class="sidebar-label">Vår referens</div>
          <div class="sidebar-value">{{reference}}</div>
        </div>
        {{/if}}

        <div class="sidebar-section">
          <div class="sidebar-label">Betalningsvillkor</div>
          <div class="sidebar-value">{{payment_terms}}</div>
        </div>

        <div class="sidebar-section">
          <div class="sidebar-label">Fakturadatum</div>
          <div class="sidebar-value">{{issue_date}}</div>
        </div>

        <div class="sidebar-section">
          <div class="sidebar-label">Kundnr</div>
          <div class="sidebar-value">{{client_number}}</div>
        </div>

        <div class="sidebar-section">
          <div class="sidebar-label">Betalningsinfo</div>
          <div class="sidebar-value">
            Efter förfallodagen debiteras ränta enligt räntelagen
          </div>
        </div>
      </div>

      <div class="content-area">
        <table class="items-table">
          <thead>
            <tr>
              <th style="width: 40%;">Produkt / Tjänst</th>
              <th class="center" style="width: 15%;">Antal</th>
              <th class="right" style="width: 20%;">Å-pris</th>
              <th class="right" style="width: 25%;">Belopp</th>
            </tr>
          </thead>
          <tbody>
            {{#each line_items}}
            <tr>
              <td>
                <div class="item-name">{{description}}</div>
                {{#if notes}}<div class="item-desc">{{notes}}</div>{{/if}}
              </td>
              <td class="center">{{quantity}}</td>
              <td class="right">{{unit_price}}</td>
              <td class="right">{{amount}}</td>
            </tr>
            {{/each}}
            {{#if ../notes}}
            <tr class="free-text-row">
              <td colspan="4">{{../notes}}</td>
            </tr>
            {{/if}}
          </tbody>
        </table>

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
          <div class="total-row grand-total">
            <span class="total-label">Summa att betala:</span>
            <span class="total-value">{{total}} {{currency}}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="footer">
      <div class="footer-left">
        <div class="footer-company">{{organization_name}}</div>
        <div class="footer-text">{{organization_postal_code}}, {{organization_city}}</div>
        <div class="footer-text">
          <strong>E</strong> {{organization_email}}<br>
          <strong>W</strong> {{organization_website}}<br>
          <strong>P</strong> {{organization_phone}}
        </div>
        {{#if organization_f_skatt_approved}}
        <div class="footer-text" style="margin-top: 8px;">Godkänd för F-skatt</div>
        {{/if}}
      </div>
      <div class="footer-right">
        {{#if organization_bic}}
        <div class="footer-label">BIC/SWIFT</div>
        <div class="footer-text">{{organization_bic}}</div>
        {{/if}}
        {{#if organization_iban}}
        <div class="footer-label">IBAN</div>
        <div class="footer-text">{{organization_iban}}</div>
        {{/if}}
      </div>
    </div>
  </div>
</body>
</html>',
  ARRAY['invoice_number', 'payment_reference', 'issue_date', 'delivery_date', 'due_date', 'reference', 'our_reference', 'client_name', 'client_number', 'client_address', 'client_city', 'client_postal_code', 'client_country', 'client_email', 'organization_name', 'organization_number', 'organization_vat_number', 'organization_address', 'organization_city', 'organization_postal_code', 'organization_email', 'organization_phone', 'organization_website', 'organization_bankgiro', 'organization_plusgiro', 'organization_iban', 'organization_bic', 'organization_f_skatt_approved', 'payment_terms', 'line_items', 'subtotal', 'vat_groups', 'total', 'currency', 'notes', 'terms'],
  true,
  NULL
);

-- Template 6: "Kompakt" - Compact single-column professional
INSERT INTO invoice_templates (name, content, variables, is_system, user_id)
VALUES 
(
  'Kompakt - Enkel',
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
      font-size: 12px;
      line-height: 1.5;
      color: #333;
      background: #fff;
      padding: 30px;
    }
    .invoice-container { max-width: 800px; margin: 0 auto; }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 20px;
      border-bottom: 2px solid #1a5f7a;
      margin-bottom: 20px;
    }
    .company-name {
      font-size: 22px;
      font-weight: 700;
      color: #1a5f7a;
    }
    .invoice-badge {
      background: #1a5f7a;
      color: #fff;
      padding: 8px 16px;
    }
    .invoice-badge .title {
      font-size: 16px;
      font-weight: 700;
      letter-spacing: 1px;
    }
    .invoice-badge .number {
      font-size: 11px;
      opacity: 0.9;
    }
    .info-row {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 20px;
      margin-bottom: 20px;
      padding: 16px;
      background: #f8f9fa;
    }
    .info-group .label {
      font-size: 9px;
      font-weight: 700;
      color: #888;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 2px;
    }
    .info-group .value {
      font-weight: 600;
      color: #333;
    }
    .client-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 20px;
      padding-bottom: 16px;
      border-bottom: 1px solid #eee;
    }
    .client-info .label {
      font-size: 9px;
      font-weight: 700;
      color: #1a5f7a;
      text-transform: uppercase;
      margin-bottom: 4px;
    }
    .client-info .name { font-weight: 600; }
    .client-info .address { color: #666; font-size: 11px; }
    .payment-info {
      text-align: right;
      background: #1a5f7a;
      color: #fff;
      padding: 12px 16px;
    }
    .payment-info .amount {
      font-size: 20px;
      font-weight: 700;
    }
    .payment-info .due {
      font-size: 11px;
      opacity: 0.9;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    .items-table thead tr {
      border-bottom: 2px solid #333;
    }
    .items-table th {
      padding: 10px 8px;
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      text-align: left;
      color: #555;
    }
    .items-table th.right { text-align: right; }
    .items-table th.center { text-align: center; }
    .items-table tbody tr { border-bottom: 1px solid #eee; }
    .items-table td {
      padding: 10px 8px;
      vertical-align: top;
    }
    .items-table td.right { text-align: right; }
    .items-table td.center { text-align: center; }
    .item-name { font-weight: 500; }
    .item-desc { color: #888; font-size: 10px; }
    .free-text-row td {
      font-style: italic;
      color: #888;
      font-size: 10px;
    }
    .totals-row {
      display: flex;
      justify-content: flex-end;
    }
    .totals-box {
      width: 260px;
      font-size: 11px;
    }
    .total-line {
      display: flex;
      justify-content: space-between;
      padding: 4px 0;
    }
    .total-line .label { color: #666; }
    .total-line .value { font-weight: 500; }
    .total-line.grand {
      border-top: 2px solid #1a5f7a;
      margin-top: 8px;
      padding-top: 8px;
      font-weight: 700;
      color: #1a5f7a;
    }
    .footer {
      margin-top: 30px;
      padding-top: 16px;
      border-top: 2px solid #1a5f7a;
      display: flex;
      justify-content: space-between;
      font-size: 10px;
      color: #666;
    }
    .footer-left { }
    .footer-right { text-align: right; }
    .footer strong { color: #333; }
    @media print {
      body { padding: 15px; }
      @page { size: A4; margin: 10mm; }
    }
  </style>
</head>
<body>
  <div class="invoice-container">
    <div class="header">
      <div class="company-name">{{organization_name}}</div>
      <div class="invoice-badge">
        <div class="title">FAKTURA</div>
        <div class="number">Nr: {{invoice_number}}</div>
      </div>
    </div>

    <div class="info-row">
      <div class="info-group">
        <div class="label">Fakturadatum</div>
        <div class="value">{{issue_date}}</div>
      </div>
      <div class="info-group">
        <div class="label">Betalningsvillkor</div>
        <div class="value">{{payment_terms}}</div>
      </div>
      <div class="info-group">
        <div class="label">Kundnummer</div>
        <div class="value">{{client_number}}</div>
      </div>
    </div>

    <div class="client-row">
      <div class="client-info">
        <div class="label">Faktureras</div>
        <div class="name">{{client_name}}</div>
        <div class="address">
          {{client_address}}, {{client_postal_code}} {{client_city}}
          {{#if client_country}}, {{client_country}}{{/if}}
        </div>
      </div>
      <div class="payment-info">
        <div class="amount">{{total}} {{currency}}</div>
        <div class="due">Förfaller: {{due_date}}</div>
      </div>
    </div>

    <table class="items-table">
      <thead>
        <tr>
          <th style="width: 40%;">Beskrivning</th>
          <th class="center" style="width: 15%;">Antal</th>
          <th class="right" style="width: 20%;">Pris</th>
          <th class="right" style="width: 25%;">Summa</th>
        </tr>
      </thead>
      <tbody>
        {{#each line_items}}
        <tr>
          <td>
            <div class="item-name">{{description}}</div>
            {{#if notes}}<div class="item-desc">{{notes}}</div>{{/if}}
          </td>
          <td class="center">{{quantity}}</td>
          <td class="right">{{unit_price}}</td>
          <td class="right">{{amount}}</td>
        </tr>
        {{/each}}
        {{#if ../notes}}
        <tr class="free-text-row">
          <td colspan="4">{{../notes}}</td>
        </tr>
        {{/if}}
      </tbody>
    </table>

    <div class="totals-row">
      <div class="totals-box">
        <div class="total-line">
          <span class="label">Netto</span>
          <span class="value">{{subtotal}} {{currency}}</span>
        </div>
        {{#each vat_groups}}
        <div class="total-line">
          <span class="label">Moms {{rate}}%</span>
          <span class="value">{{vat}} {{../currency}}</span>
        </div>
        {{/each}}
        <div class="total-line grand">
          <span class="label">ATT BETALA</span>
          <span class="value">{{total}} {{currency}}</span>
        </div>
      </div>
    </div>

    <div class="footer">
      <div class="footer-left">
        <strong>{{organization_name}}</strong><br>
        {{organization_address}}, {{organization_postal_code}} {{organization_city}}<br>
        Tel: {{organization_phone}} | E-post: {{organization_email}}<br>
        {{#if organization_f_skatt_approved}}Godkänd för F-skatt{{/if}}
      </div>
      <div class="footer-right">
        {{#if organization_bankgiro}}<strong>Bankgiro:</strong> {{organization_bankgiro}}<br>{{/if}}
        {{#if organization_plusgiro}}<strong>Plusgiro:</strong> {{organization_plusgiro}}<br>{{/if}}
        {{#if organization_iban}}<strong>IBAN:</strong> {{organization_iban}}<br>{{/if}}
        {{#if organization_bic}}<strong>BIC:</strong> {{organization_bic}}{{/if}}
      </div>
    </div>
  </div>
</body>
</html>',
  ARRAY['invoice_number', 'payment_reference', 'issue_date', 'delivery_date', 'due_date', 'reference', 'client_name', 'client_number', 'client_address', 'client_city', 'client_postal_code', 'client_country', 'client_email', 'organization_name', 'organization_number', 'organization_vat_number', 'organization_address', 'organization_city', 'organization_postal_code', 'organization_email', 'organization_phone', 'organization_website', 'organization_bankgiro', 'organization_plusgiro', 'organization_iban', 'organization_bic', 'organization_f_skatt_approved', 'payment_terms', 'line_items', 'subtotal', 'vat_groups', 'total', 'currency', 'notes', 'terms'],
  true,
  NULL
);
