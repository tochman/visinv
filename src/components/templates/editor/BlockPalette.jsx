import React from 'react';

// Visual block templates for invoice templates
export const LAYOUT_BLOCKS = [
  {
    id: 'invoice-header',
    name: 'Fakturahuvud',
    icon: '📄',
    preview: (
      <div className="border-b-2 border-blue-500 pb-1 flex justify-between">
        <div>
          <div className="h-3 bg-gray-800 rounded w-16 mb-0.5"></div>
          <div className="h-2 bg-gray-400 rounded w-12"></div>
        </div>
        <div className="text-right">
          <div className="h-2 bg-gray-600 rounded w-16"></div>
        </div>
      </div>
    ),
    html: `<div class="flex justify-between items-start border-b-3 border-blue-600 pb-5 mb-8">
  <div>
    <h1 class="text-4xl font-bold text-blue-600">FAKTURA</h1>
    <p class="text-lg text-slate-600 mt-2">{{invoice_number}}</p>
  </div>
  <div class="text-right">
    <p class="font-semibold text-slate-800">{{organization_name}}</p>
    <p class="text-sm text-slate-600">Org.nr: {{organization_number}}</p>
  </div>
</div>`
  },
  {
    id: 'client-info',
    name: 'Kundinfo',
    icon: '👤',
    preview: (
      <div className="bg-slate-50 p-2 rounded">
        <div className="text-[8px] font-bold text-slate-500 mb-0.5">FAKTURAMOTTAGARE</div>
        <div className="h-1.5 bg-slate-700 rounded w-3/4 mb-0.5"></div>
        <div className="h-1 bg-slate-400 rounded w-2/3"></div>
      </div>
    ),
    html: `<div class="bg-slate-50 p-4 rounded">
  <h3 class="text-xs font-bold text-slate-500 uppercase mb-2">Fakturamottagare</h3>
  <p class="font-semibold text-slate-900">{{client_name}}</p>
  <p class="text-sm text-slate-600">{{client_address}}</p>
  <p class="text-sm text-slate-600">{{client_postal_code}} {{client_city}}</p>
  {{#if client_email}}<p class="text-sm text-slate-600">{{client_email}}</p>{{/if}}
</div>`
  },
  {
    id: 'organization-info',
    name: 'Företagsinfo',
    icon: '🏢',
    preview: (
      <div className="bg-blue-50 p-2 rounded border-l-4 border-blue-600">
        <div className="h-1.5 bg-blue-800 rounded w-2/3 mb-0.5"></div>
        <div className="h-1 bg-blue-400 rounded w-1/2"></div>
      </div>
    ),
    html: `<div class="bg-blue-50 p-4 rounded border-l-4 border-blue-600">
  <p class="font-bold text-blue-900">{{organization_name}}</p>
  <p class="text-sm text-blue-700">Org.nr: {{organization_number}}</p>
  {{#if organization_vat_number}}<p class="text-sm text-blue-700">Moms nr: {{organization_vat_number}}</p>{{/if}}
  <p class="text-sm text-blue-700">{{organization_address}}</p>
  <p class="text-sm text-blue-700">{{organization_postal_code}} {{organization_city}}</p>
</div>`
  },
  {
    id: 'f-skatt-badge',
    name: 'F-skatt märkning',
    icon: '✓',
    preview: (
      <div className="bg-blue-100 border-l-4 border-blue-600 p-1.5 rounded">
        <div className="text-[10px] font-bold text-blue-800">✓ Godkänd för F-skatt</div>
      </div>
    ),
    html: `{{#if organization_f_skatt_approved}}
<div class="bg-blue-100 border-l-4 border-blue-600 p-3 rounded my-4">
  <p class="text-blue-900 font-semibold">✓ Godkänd för F-skatt</p>
</div>
{{/if}}`
  },
  {
    id: 'invoice-details',
    name: 'Fakturadetaljer',
    icon: '📅',
    preview: (
      <div className="grid grid-cols-2 gap-1">
        <div>
          <div className="text-[6px] text-slate-500 mb-0.5">FAKTURADATUM</div>
          <div className="h-1 bg-slate-400 rounded w-3/4"></div>
        </div>
        <div>
          <div className="text-[6px] text-slate-500 mb-0.5">FÖRFALLODATUM</div>
          <div className="h-1 bg-slate-400 rounded w-3/4"></div>
        </div>
      </div>
    ),
    html: `<div class="grid grid-cols-2 gap-4 my-6">
  <div>
    <p class="text-xs font-bold text-slate-500 uppercase">Fakturadatum</p>
    <p class="text-slate-900">{{issue_date}}</p>
  </div>
  <div>
    <p class="text-xs font-bold text-slate-500 uppercase">Leveransdatum</p>
    <p class="text-slate-900">{{delivery_date}}</p>
  </div>
  <div>
    <p class="text-xs font-bold text-slate-500 uppercase">Förfallodatum</p>
    <p class="text-slate-900">{{due_date}}</p>
  </div>
  {{#if reference}}
  <div>
    <p class="text-xs font-bold text-slate-500 uppercase">Er referens</p>
    <p class="text-slate-900">{{reference}}</p>
  </div>
  {{/if}}
</div>`
  },
  {
    id: 'line-items-table',
    name: 'Radtabell',
    icon: '📋',
    preview: (
      <div className="border border-slate-200 rounded overflow-hidden">
        <div className="bg-slate-100 h-2"></div>
        <div className="grid grid-cols-4 gap-px bg-slate-100 p-px">
          <div className="bg-white h-1.5"></div>
          <div className="bg-white h-1.5"></div>
          <div className="bg-white h-1.5"></div>
          <div className="bg-white h-1.5"></div>
        </div>
      </div>
    ),
    html: `<table class="w-full border-collapse my-8">
  <thead>
    <tr class="bg-slate-100 border-b-2 border-slate-300">
      <th class="text-left p-3 font-semibold text-slate-700">Beskrivning</th>
      <th class="text-center p-3 font-semibold text-slate-700">Antal</th>
      <th class="text-right p-3 font-semibold text-slate-700">Á-pris</th>
      <th class="text-right p-3 font-semibold text-slate-700">Moms %</th>
      <th class="text-right p-3 font-semibold text-slate-700">Belopp</th>
    </tr>
  </thead>
  <tbody>
    {{#each line_items}}
    <tr class="border-b border-slate-200 hover:bg-slate-50">
      <td class="p-3">{{description}}</td>
      <td class="text-center p-3">{{quantity}} {{unit}}</td>
      <td class="text-right p-3">{{unit_price}} {{../currency}}</td>
      <td class="text-right p-3">{{tax_rate}}%</td>
      <td class="text-right p-3 font-semibold">{{amount}} {{../currency}}</td>
    </tr>
    {{/each}}
  </tbody>
</table>`
  },
  {
    id: 'totals-summary',
    name: 'Summering',
    icon: '💰',
    preview: (
      <div className="ml-auto w-2/3">
        <div className="flex justify-between border-b border-slate-200 py-0.5">
          <div className="text-[8px] text-slate-600">Delsumma:</div>
          <div className="text-[8px] font-semibold">1000</div>
        </div>
        <div className="flex justify-between border-t-2 border-blue-600 pt-0.5">
          <div className="text-[9px] font-bold">Att betala:</div>
          <div className="text-[9px] font-bold text-blue-600">1250</div>
        </div>
      </div>
    ),
    html: `<div class="mt-8">
  <div class="ml-auto w-80">
    <div class="flex justify-between py-2 text-slate-600">
      <span>Delsumma:</span>
      <span class="font-semibold">{{subtotal}} {{currency}}</span>
    </div>
    {{#each vat_groups}}
    <div class="flex justify-between py-2 text-slate-600">
      <span>Moms {{rate}}% ({{base}} {{../currency}}):</span>
      <span class="font-semibold">{{vat}} {{../currency}}</span>
    </div>
    {{/each}}
    <div class="flex justify-between py-3 border-t-2 border-blue-600 text-lg font-bold text-blue-600">
      <span>Att betala:</span>
      <span>{{total}} {{currency}}</span>
    </div>
  </div>
</div>`
  },
  {
    id: 'payment-info',
    name: 'Betalningsinfo',
    icon: '💳',
    preview: (
      <div className="bg-slate-50 p-2 rounded border border-slate-200">
        <div className="text-[8px] font-bold text-slate-700 mb-0.5">BETALNINGSINFORMATION</div>
        <div className="h-1 bg-slate-400 rounded w-2/3"></div>
      </div>
    ),
    html: `{{#if payment_reference}}
<div class="bg-slate-50 p-4 rounded border border-slate-200 my-6">
  <h3 class="text-sm font-bold text-slate-700 uppercase mb-2">Betalningsinformation</h3>
  <p class="text-slate-900"><strong>OCR-nummer:</strong> {{payment_reference}}</p>
  <p class="text-sm text-slate-600 mt-2">Ange alltid OCR-nummer vid betalning för snabb och korrekt hantering.</p>
</div>
{{/if}}`
  },
  {
    id: 'notes-section',
    name: 'Noteringar',
    icon: '📝',
    preview: (
      <div className="border-l-4 border-slate-300 pl-2">
        <div className="text-[8px] font-bold text-slate-600 mb-0.5">NOTERINGAR</div>
        <div className="h-1 bg-slate-300 rounded w-full mb-0.5"></div>
        <div className="h-1 bg-slate-300 rounded w-4/5"></div>
      </div>
    ),
    html: `{{#if notes}}
<div class="my-6">
  <h3 class="text-sm font-bold text-slate-700 uppercase mb-2">Noteringar</h3>
  <p class="text-slate-600">{{notes}}</p>
</div>
{{/if}}`
  },
  {
    id: 'terms-section',
    name: 'Betalningsvillkor',
    icon: '📜',
    preview: (
      <div className="border-l-4 border-blue-300 pl-2">
        <div className="text-[8px] font-bold text-blue-700 mb-0.5">BETALNINGSVILLKOR</div>
        <div className="h-1 bg-blue-300 rounded w-full"></div>
      </div>
    ),
    html: `{{#if terms}}
<div class="my-6">
  <h3 class="text-sm font-bold text-slate-700 uppercase mb-2">Betalningsvillkor</h3>
  <p class="text-slate-600">{{terms}}</p>
</div>
{{/if}}`
  },
  {
    id: 'invoice-footer',
    name: 'Sidfot',
    icon: '⬇️',
    preview: (
      <div className="border-t border-slate-300 pt-1">
        <div className="h-1 bg-slate-300 rounded w-2/3 mb-0.5"></div>
        <div className="h-1 bg-slate-200 rounded w-full"></div>
      </div>
    ),
    html: `<div class="mt-16 pt-4 border-t border-slate-200 text-xs text-slate-500">
  <p>Betalning sker till: {{organization_name}}</p>
  <p class="mt-1">Denna faktura är upprättad enligt Bokföringslagen (1999:1078) och Mervärdesskattelagen (2023:200)</p>
</div>`
  },
  {
    id: 'two-columns',
    name: '2 Kolumner',
    icon: '▥',
    isResizable: true,
    preset: '50-50',
    preview: (
      <div className="grid grid-cols-2 gap-1">
        <div className="bg-slate-100 rounded p-1">
          <div className="h-1.5 bg-slate-400 rounded w-full"></div>
        </div>
        <div className="bg-slate-100 rounded p-1">
          <div className="h-1.5 bg-slate-400 rounded w-full"></div>
        </div>
      </div>
    ),
    html: `<div class="grid grid-cols-2 gap-6">
  <div>
    <h3 class="font-semibold text-slate-900">Vänster kolumn</h3>
    <p class="text-slate-600">Innehåll...</p>
  </div>
  <div>
    <h3 class="font-semibold text-slate-900">Höger kolumn</h3>
    <p class="text-slate-600">Innehåll...</p>
  </div>
</div>`
  },
  {
    id: 'page-break',
    name: 'Sidbrytning',
    icon: '📃',
    preview: (
      <div className="border-t-2 border-dashed border-slate-400 my-1 relative">
        <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 bg-white px-1 text-[6px] text-slate-400">NY SIDA</span>
      </div>
    ),
    html: `<div class="page-break"></div>`
  }
];

/**
 * BlockPalette - Displays available layout blocks that can be inserted into templates
 */
export default function BlockPalette({ onInsertBlock, onInsertColumns }) {
  return (
    <div className="p-3 space-y-2">
      <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Layout-block</h4>
      <div className="grid grid-cols-2 gap-2">
        {LAYOUT_BLOCKS.map(block => (
          <button
            key={block.id}
            onClick={() => block.isResizable && onInsertColumns ? onInsertColumns(block.preset) : onInsertBlock(block.html)}
            className={`p-2 bg-white dark:bg-gray-800 border rounded-sm hover:border-blue-400 hover:shadow-md transition-all text-left group ${block.isResizable ? 'border-blue-200' : 'border-gray-200 dark:border-gray-700'}`}
            title={block.isResizable ? `${block.name} (resizable)` : block.name}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-lg">{block.icon}</span>
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300 group-hover:text-blue-600">{block.name}</span>
              {block.isResizable && (
                <span className="ml-auto text-[9px] px-1.5 py-0.5 bg-blue-100 text-blue-600 rounded font-medium">↔</span>
              )}
            </div>
            <div className="h-12 overflow-hidden rounded bg-gray-50 dark:bg-gray-900 p-1.5">
              {block.preview}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
