import React from 'react';

// Variable groups for the sidebar
const VARIABLE_GROUPS = [
  {
    id: 'invoice',
    title: 'Faktura',
    color: 'blue',
    variables: [
      { var: '{{invoice_number}}', label: 'Fakturanummer' },
      { var: '{{payment_reference}}', label: 'OCR-nummer' },
      { var: '{{issue_date}}', label: 'Fakturadatum' },
      { var: '{{delivery_date}}', label: 'Leveransdatum' },
      { var: '{{due_date}}', label: 'Förfallodatum' },
      { var: '{{reference}}', label: 'Er referens' },
      { var: '{{status}}', label: 'Status' },
      { var: '{{currency}}', label: 'Valuta' },
    ]
  },
  {
    id: 'client',
    title: 'Kund',
    color: 'green',
    variables: [
      { var: '{{client_name}}', label: 'Namn' },
      { var: '{{client_email}}', label: 'E-post' },
      { var: '{{client_address}}', label: 'Adress' },
      { var: '{{client_city}}', label: 'Stad' },
      { var: '{{client_postal_code}}', label: 'Postnummer' },
      { var: '{{client_country}}', label: 'Land' },
    ]
  },
  {
    id: 'organization',
    title: 'Företag',
    color: 'purple',
    variables: [
      { var: '{{organization_name}}', label: 'Namn' },
      { var: '{{organization_number}}', label: 'Org.nr' },
      { var: '{{organization_vat_number}}', label: 'Moms nr' },
      { var: '{{organization_municipality}}', label: 'Kommun' },
      { var: '{{organization_address}}', label: 'Adress' },
      { var: '{{organization_city}}', label: 'Stad' },
      { var: '{{organization_postal_code}}', label: 'Postnummer' },
      { var: '{{organization_email}}', label: 'E-post' },
      { var: '{{organization_phone}}', label: 'Telefon' },
      { var: '{{organization_website}}', label: 'Webbplats' },
      { var: '{{organization_f_skatt_approved}}', label: 'F-skatt' },
    ]
  },
  {
    id: 'amounts',
    title: 'Belopp',
    color: 'emerald',
    variables: [
      { var: '{{subtotal}}', label: 'Delsumma' },
      { var: '{{tax_amount}}', label: 'Moms' },
      { var: '{{tax_rate}}', label: 'Momssats %' },
      { var: '{{total}}', label: 'Totalt' },
    ]
  },
  {
    id: 'line_items',
    title: 'Radfält (i line_items loop)',
    color: 'teal',
    variables: [
      { var: '{{description}}', label: 'Beskrivning' },
      { var: '{{quantity}}', label: 'Antal' },
      { var: '{{unit}}', label: 'Enhet' },
      { var: '{{unit_price}}', label: 'Á-pris' },
      { var: '{{tax_rate}}', label: 'Moms %' },
      { var: '{{amount}}', label: 'Belopp' },
    ]
  },
  {
    id: 'vat_groups',
    title: 'Momsfält (i vat_groups loop)',
    color: 'indigo',
    variables: [
      { var: '{{rate}}', label: 'Momssats' },
      { var: '{{base}}', label: 'Underlag' },
      { var: '{{vat}}', label: 'Momsbelopp' },
    ]
  },
  {
    id: 'other',
    title: 'Övrigt',
    color: 'slate',
    variables: [
      { var: '{{notes}}', label: 'Noteringar' },
      { var: '{{terms}}', label: 'Villkor' },
    ]
  }
];

// Loop templates
const LOOP_TEMPLATES = [
  {
    label: '📋 Fakturarader (line_items)',
    var: '{{#each line_items}}\n<tr>\n  <td>{{description}}</td>\n  <td>{{quantity}}</td>\n  <td>{{unit_price}}</td>\n  <td>{{amount}}</td>\n</tr>\n{{/each}}'
  },
  {
    label: '💰 Momsgrupper (vat_groups)',
    var: '{{#each vat_groups}}\n<tr>\n  <td>Moms {{rate}}%</td>\n  <td>{{base}} {{../currency}}</td>\n  <td>{{vat}} {{../currency}}</td>\n</tr>\n{{/each}}'
  }
];

// Conditional templates
const CONDITIONALS = [
  { label: '#if', var: '{{#if payment_reference}}\n  ...\n{{/if}}' },
  { label: '#if...else', var: '{{#if notes}}\n  ...\n{{else}}\n  <p>Inga noteringar</p>\n{{/if}}' },
  { label: '#unless', var: '{{#unless payment_reference}}\n  ...\n{{/unless}}' }
];

// Layout helpers
const LAYOUT_HELPERS = [
  { label: 'Sidbrytning', var: '<div class="page-break"></div>' },
  { label: 'Ingen brytning', var: '<div class="no-break">\n  ...\n</div>' }
];

// Color mappings for Tailwind classes
const colorClasses = {
  blue: { bg: 'bg-blue-50', hover: 'hover:bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500' },
  green: { bg: 'bg-green-50', hover: 'hover:bg-green-100', text: 'text-green-700', dot: 'bg-green-500' },
  purple: { bg: 'bg-purple-50', hover: 'hover:bg-purple-100', text: 'text-purple-700', dot: 'bg-purple-500' },
  emerald: { bg: 'bg-emerald-50', hover: 'hover:bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  amber: { bg: 'bg-amber-50', hover: 'hover:bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' },
  teal: { bg: 'bg-teal-50', hover: 'hover:bg-teal-100', text: 'text-teal-700', dot: 'bg-teal-500' },
  indigo: { bg: 'bg-indigo-50', hover: 'hover:bg-indigo-100', text: 'text-indigo-700', dot: 'bg-indigo-500' },
  slate: { bg: 'bg-slate-50', hover: 'hover:bg-slate-100', text: 'text-slate-700', dot: 'bg-slate-500' },
  pink: { bg: 'bg-pink-50', hover: 'hover:bg-pink-100', text: 'text-pink-700', dot: 'bg-pink-500' },
  gray: { bg: 'bg-gray-100 dark:bg-gray-700', hover: 'hover:bg-gray-200', text: 'text-gray-700 dark:text-gray-300', dot: 'bg-gray-400' }
};

/**
 * VariablesPanel - Displays template variables organized by category
 */
export default function VariablesPanel({ onInsertVariable }) {
  return (
    <div className="p-3 space-y-4 text-xs">
      <p className="text-slate-500 dark:text-slate-400">Klicka för att infoga variabel</p>
      
      {/* Variable groups */}
      {VARIABLE_GROUPS.map(group => {
        const colors = colorClasses[group.color];
        return (
          <div key={group.id}>
            <h4 className="font-semibold text-slate-900 dark:text-white mb-2 flex items-center gap-1">
              <span className={`w-2 h-2 ${colors.dot} rounded-full`}></span>
              {group.title}
            </h4>
            <div className="grid grid-cols-2 gap-1">
              {group.variables.map(v => (
                <button 
                  key={v.var}
                  onClick={() => onInsertVariable(v.var)} 
                  className={`px-2 py-1.5 ${colors.bg} ${colors.hover} ${colors.text} rounded transition text-left truncate`}
                  title={v.var}
                >
                  {v.label}
                </button>
              ))}
            </div>
          </div>
        );
      })}

      {/* Loops */}
      <div>
        <h4 className="font-semibold text-slate-900 dark:text-white mb-2 flex items-center gap-1">
          <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
          Loopar
        </h4>
        <div className="space-y-1">
          {LOOP_TEMPLATES.map((loop, idx) => (
            <button 
              key={idx}
              onClick={() => onInsertVariable(loop.var)} 
              className="w-full px-2 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded transition text-left"
            >
              {loop.label}
            </button>
          ))}
        </div>
      </div>

      {/* Conditionals */}
      <div>
        <h4 className="font-semibold text-slate-900 dark:text-white mb-2 flex items-center gap-1">
          <span className="w-2 h-2 bg-pink-500 rounded-full"></span>
          Villkor & Logik
        </h4>
        <div className="grid grid-cols-2 gap-1">
          {CONDITIONALS.map((cond, idx) => (
            <button 
              key={idx}
              onClick={() => onInsertVariable(cond.var)} 
              className="px-2 py-1 bg-pink-50 hover:bg-pink-100 text-pink-700 rounded transition text-left"
            >
              {cond.label}
            </button>
          ))}
        </div>
      </div>

      {/* Layout */}
      <div>
        <h4 className="font-semibold text-slate-900 dark:text-white mb-2 flex items-center gap-1">
          <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
          Layout & Print
        </h4>
        <div className="grid grid-cols-2 gap-1">
          {LAYOUT_HELPERS.map((helper, idx) => (
            <button 
              key={idx}
              onClick={() => onInsertVariable(helper.var)} 
              className="px-2 py-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 text-gray-700 dark:text-gray-300 rounded transition text-left"
            >
              {helper.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
