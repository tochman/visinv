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

/**
 * Build template data context from invoice data
 */
export function buildTemplateContext(invoiceData = {}) {
  // Sample invoice data for preview
  const sampleInvoice = {
    invoice_number: 'INV-0001',
    client_name: 'Acme Corporation',
    client_email: 'contact@acme.com',
    issue_date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: 'draft',
    subtotal: 10000,
    tax_rate: 25,
    tax_amount: 2500,
    total: 12500,
    currency: 'SEK',
    notes: 'Payment due within 30 days',
    line_items: [
      { description: 'Consulting Services', quantity: 10, unit_price: 800, amount: 8000 },
      { description: 'Project Management', quantity: 5, unit_price: 400, amount: 2000 }
    ]
  };
  
  return invoiceData && Object.keys(invoiceData).length > 0 ? invoiceData : sampleInvoice;
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
 * Strips CDN, uses app's Tailwind, inlines all computed styles as rgb
 */
export async function exportToPDF(html, filename = 'report.pdf') {
  const html2pdf = (await import('html2pdf.js')).default;
  
  // Remove CDN script tags completely - we'll use app's styles
  let processedHtml = html.replace(
    /<script src="https:\/\/cdn\.tailwindcss\.com[^"]*"><\/script>/gi,
    ''
  );
  
  const options = {
    margin: [10, 10],
    filename,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
      // CRITICAL: Remove all stylesheets in cloned document before parsing
      onclone: (clonedDoc) => {
        // Remove ALL stylesheets from cloned document to prevent oklch parsing
        const styles = clonedDoc.querySelectorAll('style, link[rel="stylesheet"]');
        styles.forEach(el => el.remove());
        
        // Remove all class attributes since styles are already inlined
        const elements = clonedDoc.querySelectorAll('*');
        elements.forEach(el => el.removeAttribute('class'));
      }
    },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };

  try {
    // Render in a hidden div with app's styles
    const container = document.createElement('div');
    container.style.cssText = 'position: fixed; left: -10000px; top: 0; width: 210mm; background: #ffffff;';
    container.innerHTML = processedHtml;
    document.body.appendChild(container);
    
    // Wait a moment for styles to apply
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Walk through all elements and inline computed styles as rgb
    const inlineAllStyles = (element) => {
      const computedStyle = window.getComputedStyle(element);
      const ctx = document.createElement('canvas').getContext('2d');
      
      // Helper to normalize colors to rgb
      const normalizeColor = (value) => {
        if (!value || value === 'none' || value === 'transparent') return value;
        try {
          ctx.fillStyle = '#000';
          ctx.fillStyle = value;
          return ctx.fillStyle; // Returns rgb()/rgba()/#hex
        } catch {
          return value;
        }
      };
      
      // Key style properties to inline
      const styleProps = [
        'color', 'backgroundColor', 'background', 
        'borderColor', 'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor',
        'borderWidth', 'borderStyle', 'borderRadius',
        'padding', 'margin', 'fontSize', 'fontWeight', 'fontFamily', 'lineHeight',
        'display', 'width', 'height', 'textAlign', 'verticalAlign'
      ];
      
      styleProps.forEach(prop => {
        let value = computedStyle.getPropertyValue(prop.replace(/([A-Z])/g, '-$1').toLowerCase());
        if (!value) return;
        
        // Normalize color values
        if (prop.includes('color') || prop.includes('Color') || prop === 'background') {
          value = normalizeColor(value);
        }
        
        try {
          element.style.setProperty(
            prop.replace(/([A-Z])/g, '-$1').toLowerCase(), 
            value, 
            'important'
          );
        } catch (e) {
          // ignore
        }
      });
      
      // Recursively process children
      Array.from(element.children).forEach(child => inlineAllStyles(child));
    };
    
    // Process all elements in the container
    const body = container.querySelector('body') || container;
    inlineAllStyles(body);
    
    // CRITICAL: Remove ALL stylesheets and style tags from container
    // so html2canvas doesn't try to parse oklch colors from CSS rules
    const styleElements = container.querySelectorAll('style, link[rel="stylesheet"]');
    styleElements.forEach(el => el.remove());
    
    // Also remove class attributes since we've inlined everything
    const allElements = container.querySelectorAll('*');
    allElements.forEach(el => el.removeAttribute('class'));

    // Generate PDF
    await html2pdf().set(options).from(body).save();

    container.remove();
    return true;
  } catch (error) {
    console.error('PDF export error:', error);
    throw new Error(`PDF export failed: ${error.message}`);
  }
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
