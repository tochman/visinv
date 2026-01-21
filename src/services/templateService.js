import Handlebars from 'handlebars';
import { supabase } from './supabase';

/**
 * Template Service - Handles report template rendering with Handlebars
 * Supports placeholders, iterators, and conditional logic
 */

// Register Handlebars helpers
Handlebars.registerHelper('formatDate', function(date) {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('sv-SE', { year: 'numeric', month: 'short', day: 'numeric' });
});

Handlebars.registerHelper('formatDateTime', function(date) {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('sv-SE', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
});

Handlebars.registerHelper('ifEquals', function(arg1, arg2, options) {
  return (arg1 === arg2) ? options.fn(this) : options.inverse(this);
});

Handlebars.registerHelper('ifContains', function(array, value, options) {
  if (array && array.includes(value)) {
    return options.fn(this);
  }
  return options.inverse(this);
});

Handlebars.registerHelper('add', function(a, b) {
  return a + b;
});

Handlebars.registerHelper('subtract', function(a, b) {
  return a - b;
});

Handlebars.registerHelper('multiply', function(a, b) {
  return a * b;
});

Handlebars.registerHelper('divide', function(a, b) {
  return b !== 0 ? a / b : 0;
});

Handlebars.registerHelper('pluralize', function(count, singular, plural) {
  return count === 1 ? singular : plural;
});

Handlebars.registerHelper('uppercase', function(str) {
  return str ? str.toUpperCase() : '';
});

Handlebars.registerHelper('lowercase', function(str) {
  return str ? str.toLowerCase() : '';
});

Handlebars.registerHelper('truncate', function(str, length) {
  if (!str) return '';
  return str.length > length ? str.substring(0, length) + '...' : str;
});

Handlebars.registerHelper('json', function(context) {
  return JSON.stringify(context, null, 2);
});

// Currency formatting helper
Handlebars.registerHelper('formatCurrency', function(amount, currency = 'SEK') {
  if (amount === null || amount === undefined) return '';
  const num = parseFloat(amount);
  if (isNaN(num)) return '';
  
  // Format with Swedish locale by default
  return new Intl.NumberFormat('sv-SE', {
    style: 'currency',
    currency: typeof currency === 'string' ? currency : 'SEK',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(num);
});

// Index helper for loops (1-based) - use as {{indexPlusOne @index}}
Handlebars.registerHelper('indexPlusOne', function(index) {
  return index + 1;
});

/**
 * Get sample invoice data for template preview
 * Includes all Swedish-compliant fields for proper template rendering
 */
export function getSampleInvoiceData() {
  return {
    // Invoice basics
    invoice_number: 'INV-2024-0042',
    issue_date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: 'sent',
    currency: 'SEK',
    
    // Organization details (sender)
    organization_name: 'Nordic Design Studio AB',
    organization_address: 'Designvägen 12',
    organization_postal_code: '114 56',
    organization_city: 'Stockholm',
    organization_country: 'Sverige',
    organization_email: 'faktura@nordicdesign.se',
    organization_phone: '+46 8 123 45 67',
    organization_org_number: '556789-0123',
    organization_vat_number: 'SE556789012301',
    organization_bankgiro: '123-4567',
    organization_plusgiro: '12 34 56-7',
    organization_iban: 'SE45 5000 0000 0583 9825 7466',
    organization_bic: 'ESSESESS',
    organization_f_skatt: true,
    organization_website: 'www.nordicdesign.se',
    
    // Client details (recipient)
    client_name: 'Acme Corporation AB',
    client_email: 'ekonomi@acme.se',
    client_address: 'Företagsvägen 88',
    client_postal_code: '411 05',
    client_city: 'Göteborg',
    client_country: 'Sverige',
    client_org_number: '556123-4567',
    client_reference: 'Anna Andersson',
    
    // Payment details
    payment_terms: 30,
    payment_reference: '12345678901234',
    ocr_number: '12345678901234',
    your_reference: 'Order #2024-089',
    our_reference: 'Erik Lindqvist',
    
    // Line items (Swedish-compliant with VAT details)
    line_items: [
      { 
        description: 'UX Design Consultation', 
        quantity: 16, 
        unit: 'hours',
        unit_price: 1200, 
        tax_rate: 25,
        amount: 19200 
      },
      { 
        description: 'Brand Identity Package', 
        quantity: 1, 
        unit: 'st',
        unit_price: 35000, 
        tax_rate: 25,
        amount: 35000 
      },
      { 
        description: 'Project Management', 
        quantity: 8, 
        unit: 'hours',
        unit_price: 950, 
        tax_rate: 25,
        amount: 7600 
      }
    ],
    
    // VAT breakdown by rate
    vat_groups: [
      { rate: 25, base: 61800, vat: 15450 }
    ],
    
    // Totals
    subtotal: 61800,
    tax_rate: 25,
    tax_amount: 15450,
    total: 77250,
    amount_due: 77250,
    
    // Notes and terms
    notes: 'Betalningsvillkor: 30 dagar netto. Dröjsmålsränta enligt räntelagen.',
    terms: 'Vid utebliven betalning debiteras påminnelseavgift enligt lag.',
    
    // Metadata
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}

/**
 * Build template data context from invoice data
 */
export function buildTemplateContext(invoiceData = {}) {
  return invoiceData && Object.keys(invoiceData).length > 0 ? invoiceData : getSampleInvoiceData();
}

/**
 * Render template with data context
 */
export function renderTemplate(templateContent, context) {
  try {
    const template = Handlebars.compile(templateContent);
    return template(context);
  } catch (error) {
    console.error('Template rendering error:', error);
    throw new Error(`Template rendering failed: ${error.message}`);
  }
}

/**
 * Export rendered HTML to PDF
 * Tries Edge Function first (Puppeteer/Browserless), falls back to browser print
 */
export async function exportToPDF(html, filename = 'report.pdf') {
  // Try server-side PDF generation first
  try {
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-pdf`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ html, filename }),
    });

    if (response.ok) {
      const contentType = response.headers.get('Content-Type');
      
      if (contentType?.includes('application/pdf')) {
        // Download the PDF
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return true;
      }
    }
    
    // If edge function fails or returns non-PDF, fall through to browser print
    console.log('Edge function unavailable, using browser print');
  } catch (error) {
    console.log('Edge function error, using browser print:', error.message);
  }

  // Fallback: Use browser's native print functionality
  return exportToPDFViaPrint(html, filename);
}

/**
 * Fallback: Export using browser print dialog
 */
function exportToPDFViaPrint(html, filename) {
  // Add print-specific styles to the HTML
  const printStyles = `
    <style>
      @media print {
        body { 
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        @page { 
          size: A4; 
          margin: 10mm; 
        }
      }
    </style>
  `;
  
  // Inject print styles before </head>
  const htmlWithPrintStyles = html.replace('</head>', `${printStyles}</head>`);
  
  // Create a blob URL for the HTML
  const blob = new Blob([htmlWithPrintStyles], { type: 'text/html' });
  const blobUrl = URL.createObjectURL(blob);
  
  // Open in a new window
  const printWindow = window.open(blobUrl, '_blank', 'width=900,height=1100');
  
  if (!printWindow) {
    URL.revokeObjectURL(blobUrl);
    throw new Error('Could not open print window. Please allow popups for this site.');
  }
  
  // Wait for content to load, then trigger print
  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.print();
      // Clean up after print dialog closes
      printWindow.onafterprint = () => {
        printWindow.close();
        URL.revokeObjectURL(blobUrl);
      };
    }, 500);
  };
  
  return true;
}

/**
 * Fetch all templates (user's + system)
 * Returns: user-wide templates (wheel_id = null), wheel-specific templates, and system templates
 */
export async function fetchTemplates(wheelId = null) {
  try {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;
    
    let query = supabase
      .from('report_templates')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (wheelId && userId) {
      // Get: system templates, user's global templates, and wheel-specific templates
      query = query.or(`is_system.eq.true,and(user_id.eq.${userId},wheel_id.is.null),and(user_id.eq.${userId},wheel_id.eq.${wheelId})`);
    } else if (userId) {
      // Get: system templates and user's global templates
      query = query.or(`is_system.eq.true,and(user_id.eq.${userId},wheel_id.is.null)`);
    } else {
      // Only system templates for non-authenticated users
      query = query.eq('is_system', true);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching templates:', error);
    throw error;
  }
}

/**
 * Fetch single template
 */
export async function fetchTemplate(templateId) {
  try {
    const { data, error } = await supabase
      .from('report_templates')
      .select('*')
      .eq('id', templateId)
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching template:', error);
    throw error;
  }
}

/**
 * Create new template
 * If wheel_id is not provided, creates a user-wide template (visible on all wheels)
 */
export async function createTemplate(template) {
  try {
    const { data: userData } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from('report_templates')
      .insert({
        user_id: userData.user.id,
        wheel_id: template.wheel_id || null, // null = user-wide template
        ...template
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating template:', error);
    throw error;
  }
}

/**
 * Update template
 */
export async function updateTemplate(templateId, updates) {
  try {
    const { data, error } = await supabase
      .from('report_templates')
      .update(updates)
      .eq('id', templateId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating template:', error);
    throw error;
  }
}

/**
 * Delete template
 */
export async function deleteTemplate(templateId) {
  try {
    const { error } = await supabase
      .from('report_templates')
      .delete()
      .eq('id', templateId);
    
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting template:', error);
    throw error;
  }
}

/**
 * Validate template syntax
 */
export function validateTemplate(templateContent) {
  try {
    Handlebars.compile(templateContent);
    return { valid: true, error: null };
  } catch (error) {
    return { 
      valid: false, 
      error: error.message,
      line: error.line,
      column: error.column
    };
  }
}

/**
 * Get available template variables for documentation
 */
export function getTemplateVariables() {
  return {
    invoice: ['invoice_number', 'client_name', 'client_email', 'issue_date', 'due_date', 'status', 'subtotal', 'tax_rate', 'tax_amount', 'total', 'currency', 'notes'],
    line_items: ['description', 'quantity', 'unit_price', 'amount'],
    helpers: ['formatDate', 'formatDateTime', 'ifEquals', 'ifContains', 'add', 'subtract', 'multiply', 'divide', 'pluralize', 'uppercase', 'lowercase', 'truncate', 'json'],
    iteration: ['#each line_items', '/each']
  };
}

export default {
  buildTemplateContext,
  renderTemplate,
  exportToPDF,
  fetchTemplates,
  fetchTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  validateTemplate,
  getTemplateVariables
};
