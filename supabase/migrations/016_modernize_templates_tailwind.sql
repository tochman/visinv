-- Migration 016: Modernize invoice templates with Tailwind CSS
-- Updates Modern and Classic templates to use Tailwind utility classes
-- Provides professional, responsive design without custom CSS

-- Delete existing system templates
DELETE FROM invoice_templates WHERE is_system = true;

-- Insert Modern template with Tailwind CSS
INSERT INTO invoice_templates (name, content, variables, is_system, user_id)
VALUES 
(
  'Modern',
  '<!DOCTYPE html>
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
    
    <!-- Header Section -->
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
      
      <!-- F-skatt Badge -->
      {{#if organization_f_skatt_approved}}
      <div class="bg-green-50 border-l-4 border-green-500 px-6 py-4 rounded-r mb-8 flex items-center">
        <svg class="w-6 h-6 text-green-600 mr-3" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
        </svg>
        <p class="text-green-900 font-semibold text-lg">Godkänd för F-skatt</p>
      </div>
      {{/if}}

      <!-- Info Grid -->
      <div class="grid grid-cols-2 gap-6 mb-10">
        
        <!-- Client Info -->
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

        <!-- Invoice Details -->
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

      <!-- Line Items Table -->
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

      <!-- Totals Section -->
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

      <!-- Payment Information -->
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

      <!-- Notes & Terms -->
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

      <!-- Footer -->
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
</html>',
  ARRAY['invoice_number', 'payment_reference', 'issue_date', 'delivery_date', 'due_date', 'reference', 'client_name', 'client_address', 'client_city', 'client_postal_code', 'client_country', 'client_email', 'organization_name', 'organization_number', 'organization_vat_number', 'organization_municipality', 'organization_address', 'organization_city', 'organization_postal_code', 'organization_email', 'organization_phone', 'organization_f_skatt_approved', 'line_items', 'subtotal', 'vat_groups', 'total', 'currency', 'notes', 'terms'],
  true,
  NULL
),
(
  'Classic',
  '<!DOCTYPE html>
<html lang="sv">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Faktura {{invoice_number}}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { font-family: "Georgia", "Times New Roman", serif; }
    @media print {
      body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    }
  </style>
</head>
<body class="bg-gray-50 p-8">
  <div class="max-w-5xl mx-auto bg-white shadow-xl border-4 border-double border-gray-800">
    
    <!-- Header -->
    <div class="bg-gray-800 text-white px-10 py-8 border-b-4 border-gray-900">
      <div class="text-center">
        <h1 class="text-5xl font-bold tracking-widest mb-3">FAKTURA</h1>
        <div class="inline-block bg-white text-gray-900 px-6 py-2 mt-2">
          <p class="text-xl font-bold tracking-wide">{{invoice_number}}</p>
        </div>
      </div>
    </div>

    <div class="px-10 py-8">
      
      <!-- Organization Header -->
      <div class="text-center border-b-2 border-gray-300 pb-6 mb-8">
        <p class="text-2xl font-bold text-gray-900 mb-2">{{organization_name}}</p>
        <p class="text-sm text-gray-700">Organisationsnummer: <span class="font-semibold">{{organization_number}}</span></p>
        {{#if organization_vat_number}}
        <p class="text-sm text-gray-700">Momsregistreringsnummer: <span class="font-semibold">{{organization_vat_number}}</span></p>
        {{/if}}
        <p class="text-sm text-gray-700 mt-2">{{organization_address}}, {{organization_postal_code}} {{organization_city}}</p>
        {{#if organization_municipality}}
        <p class="text-sm text-gray-700">{{organization_municipality}} kommun</p>
        {{/if}}
        <div class="mt-2 text-sm text-gray-700">
          {{#if organization_email}}
          <span>E-post: {{organization_email}}</span>
          {{/if}}
          {{#if organization_phone}}
          <span class="mx-2">|</span>
          <span>Tel: {{organization_phone}}</span>
          {{/if}}
        </div>
      </div>

      <!-- F-skatt Badge -->
      {{#if organization_f_skatt_approved}}
      <div class="bg-gray-100 border-4 border-double border-gray-800 p-4 mb-8 w-fit mx-auto">
        <div class="flex items-center">
          <svg class="w-8 h-8 text-gray-800 mr-3" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
          </svg>
          <p class="text-lg font-bold tracking-wider text-gray-900">GODKÄND FÖR F-SKATT</p>
        </div>
      </div>
      {{/if}}

      <!-- Client & Invoice Details -->
      <div class="grid grid-cols-2 gap-6 mb-8">
        
        <!-- Client Info -->
        <div class="border-2 border-gray-800 p-6 bg-gray-50">
          <div class="border-b-2 border-gray-400 pb-2 mb-4">
            <p class="text-xs font-bold uppercase tracking-wider text-gray-700">Fakturamottagare</p>
          </div>
          <div class="space-y-1">
            <p class="text-lg font-bold text-gray-900">{{client_name}}</p>
            <p class="text-sm text-gray-700">{{client_address}}</p>
            <p class="text-sm text-gray-700">{{client_postal_code}} {{client_city}}</p>
            {{#if client_country}}
            <p class="text-sm text-gray-700">{{client_country}}</p>
            {{/if}}
            {{#if client_email}}
            <p class="text-sm text-gray-700 mt-3">E-post: {{client_email}}</p>
            {{/if}}
          </div>
        </div>

        <!-- Invoice Details -->
        <div class="border-2 border-gray-800 p-6 bg-gray-50">
          <div class="border-b-2 border-gray-400 pb-2 mb-4">
            <p class="text-xs font-bold uppercase tracking-wider text-gray-700">Fakturainformation</p>
          </div>
          <div class="space-y-2">
            <div class="flex justify-between">
              <span class="text-sm font-semibold text-gray-700">Fakturadatum:</span>
              <span class="text-sm font-bold text-gray-900">{{issue_date}}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-sm font-semibold text-gray-700">Leveransdatum:</span>
              <span class="text-sm font-bold text-gray-900">{{delivery_date}}</span>
            </div>
            <div class="flex justify-between bg-gray-800 text-white px-3 py-2 -mx-1">
              <span class="text-sm font-semibold">Förfallodatum:</span>
              <span class="text-sm font-bold">{{due_date}}</span>
            </div>
            {{#if reference}}
            <div class="flex justify-between pt-2">
              <span class="text-sm font-semibold text-gray-700">Er referens:</span>
              <span class="text-sm font-bold text-gray-900">{{reference}}</span>
            </div>
            {{/if}}
          </div>
        </div>
      </div>

      <!-- Line Items Table -->
      <div class="mb-8 border-4 border-double border-gray-800 overflow-hidden">
        <table class="w-full">
          <thead>
            <tr class="bg-gray-800 text-white">
              <th class="text-left px-4 py-4 font-bold text-sm border-r border-gray-700">Beskrivning</th>
              <th class="text-center px-4 py-4 font-bold text-sm border-r border-gray-700 w-24">Antal</th>
              <th class="text-center px-4 py-4 font-bold text-sm border-r border-gray-700 w-20">Enh</th>
              <th class="text-right px-4 py-4 font-bold text-sm border-r border-gray-700 w-32">Á-pris</th>
              <th class="text-right px-4 py-4 font-bold text-sm border-r border-gray-700 w-24">Moms %</th>
              <th class="text-right px-4 py-4 font-bold text-sm w-36">Belopp</th>
            </tr>
          </thead>
          <tbody class="bg-white">
            {{#each line_items}}
            <tr class="border-b-2 border-gray-300">
              <td class="px-4 py-4 text-gray-900 border-r border-gray-200">{{description}}</td>
              <td class="text-center px-4 py-4 text-gray-700 font-medium border-r border-gray-200">{{quantity}}</td>
              <td class="text-center px-4 py-4 text-gray-700 border-r border-gray-200">{{unit}}</td>
              <td class="text-right px-4 py-4 text-gray-700 border-r border-gray-200 tabular-nums">{{unit_price}} {{../currency}}</td>
              <td class="text-right px-4 py-4 text-gray-700 font-medium border-r border-gray-200">{{tax_rate}}%</td>
              <td class="text-right px-4 py-4 font-bold text-gray-900 bg-gray-50 tabular-nums">{{amount}} {{../currency}}</td>
            </tr>
            {{/each}}
          </tbody>
        </table>
      </div>

      <!-- Totals Section -->
      <div class="flex justify-end mb-10">
        <div class="w-96 border-4 border-double border-gray-800">
          <div class="bg-white">
            <div class="border-b-2 border-gray-300 px-6 py-3 flex justify-between">
              <span class="font-semibold text-gray-700">Delsumma:</span>
              <span class="font-bold text-gray-900 tabular-nums">{{subtotal}} {{currency}}</span>
            </div>
            
            {{#each vat_groups}}
            <div class="border-b-2 border-gray-300 px-6 py-3 flex justify-between bg-gray-50">
              <span class="text-sm text-gray-700">Moms {{rate}}% (på {{base}} {{../currency}}):</span>
              <span class="font-semibold text-gray-900 tabular-nums">{{vat}} {{../currency}}</span>
            </div>
            {{/each}}
            
            <div class="bg-gray-800 text-white px-6 py-4">
              <div class="flex justify-between items-center">
                <span class="text-xl font-bold tracking-wide">ATT BETALA:</span>
                <span class="text-2xl font-bold tabular-nums">{{total}} {{currency}}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Payment Information -->
      {{#if payment_reference}}
      <div class="border-2 border-gray-800 p-6 mb-8 bg-amber-50">
        <div class="border-b-2 border-amber-600 pb-3 mb-4">
          <h3 class="text-sm font-bold uppercase tracking-wider text-gray-900 flex items-center">
            <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z"/>
              <path fill-rule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clip-rule="evenodd"/>
            </svg>
            Betalningsinformation
          </h3>
        </div>
        <div class="bg-white border-2 border-amber-600 px-4 py-3 mb-3 flex items-center justify-between">
          <span class="font-bold text-gray-900">OCR-nummer:</span>
          <span class="font-mono text-2xl font-bold text-gray-900 tracking-widest">{{payment_reference}}</span>
        </div>
        <p class="text-sm text-gray-800">
          <strong>VIKTIGT:</strong> Ange alltid OCR-nummer vid betalning för snabb och korrekt hantering.
        </p>
      </div>
      {{/if}}

      <!-- Notes & Terms -->
      {{#if notes}}
      <div class="border-2 border-gray-800 p-6 mb-6 bg-blue-50">
        <p class="font-bold underline decoration-2 mb-3 text-gray-900">Noteringar</p>
        <p class="text-gray-800 leading-relaxed">{{notes}}</p>
      </div>
      {{/if}}
      
      {{#if terms}}
      <div class="border-2 border-gray-800 p-6 mb-6 bg-gray-50">
        <p class="font-bold underline decoration-2 mb-3 text-gray-900">Betalningsvillkor</p>
        <p class="text-gray-800 leading-relaxed">{{terms}}</p>
      </div>
      {{/if}}

      <!-- Footer -->
      <div class="border-t-4 border-double border-gray-800 pt-6 mt-10">
        <div class="text-center text-sm text-gray-700">
          <p class="font-bold text-gray-900 text-base mb-2">{{organization_name}}</p>
          <p>{{organization_address}}, {{organization_postal_code}} {{organization_city}}</p>
          {{#if organization_municipality}}
          <p>{{organization_municipality}} kommun</p>
          {{/if}}
          <div class="mt-4 bg-gray-100 border border-gray-300 p-4 mx-auto max-w-3xl">
            <p class="text-xs text-gray-800 leading-relaxed">
              Denna faktura är upprättad i enlighet med 
              <strong>Bokföringslagen (1999:1078)</strong> och 
              <strong>Mervärdesskattelagen (2023:200)</strong>
            </p>
          </div>
        </div>
      </div>

    </div>
  </div>
</body>
</html>',
  ARRAY['invoice_number', 'payment_reference', 'issue_date', 'delivery_date', 'due_date', 'reference', 'client_name', 'client_address', 'client_city', 'client_postal_code', 'client_country', 'client_email', 'organization_name', 'organization_number', 'organization_vat_number', 'organization_municipality', 'organization_address', 'organization_city', 'organization_postal_code', 'organization_email', 'organization_phone', 'organization_f_skatt_approved', 'line_items', 'subtotal', 'vat_groups', 'total', 'currency', 'notes', 'terms'],
  true,
  NULL
);
