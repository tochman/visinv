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
 * Expects a complete HTML document with styling already included
 */
export async function exportToPDF(html, filename = 'report.pdf') {
  const html2pdf = (await import('html2pdf.js')).default;
  // Helper to inline computed colors as rgb() values to avoid unsupported color
  // functions (e.g. oklch) used by Tailwind v4 color tokens. html2canvas
  // cannot parse these, so we convert computed styles to rgb before rendering.
  const inlineComputedColors = (doc) => {
    try {
      // Canvas-based color normalizer: converts any valid CSS color (incl. oklch)
      // into a normalized rgb/rgba string that html2canvas can parse.
      const ctx = doc.createElement('canvas').getContext('2d');
      const isUnsupportedColorFn = (val) => /oklch\(|oklab\(|lch\(|lab\(|color-mix\(/i.test(val || ''));
      const normalizeColor = (value, prop = '') => {
        if (!value) return value;
        try {
          if (isUnsupportedColorFn(value)) {
            // Fallback: backgrounds to white, others to black
            return /background/i.test(prop) ? '#ffffff' : '#000000';
          }
          ctx.fillStyle = '#000';
          ctx.fillStyle = value;
          return ctx.fillStyle; // normalized to rgb()/rgba()/#hex
        } catch {
          // If canvas can't parse, provide conservative fallback
          return /background/i.test(prop) ? '#ffffff' : '#000000';
        }
      };
      const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_ELEMENT);
      const colorProps = [
        'color',
        'background',
        'backgroundColor',
        'borderColor',
        'borderTopColor',
        'borderRightColor',
        'borderBottomColor',
        'borderLeftColor',
        'outlineColor',
        'textDecorationColor',
        'caretColor',
        'columnRuleColor',
        'fill',
        'stroke'
      ];

      let node;
      while ((node = walker.nextNode())) {
        const cs = doc.defaultView?.getComputedStyle(node);
        if (!cs) continue;

        // If any value includes unsupported color functions, force inline as rgb()
        colorProps.forEach((prop) => {
          const val = cs.getPropertyValue(prop);
          if (!val) return;
          const normalized = normalizeColor(val, prop);
          try {
            // Force inline override
            node.style.setProperty(prop, normalized || val, 'important');
          } catch {
            // ignore failures for read-only props
          }
        });

        // Explicitly normalize background shorthand and remove images/gradients
        const bgColor = cs.getPropertyValue('background-color');
        if (bgColor) {
          const normalizedBg = normalizeColor(bgColor, 'background');
          node.style.setProperty('background-color', normalizedBg, 'important');
          node.style.setProperty('background-image', 'none', 'important');
          node.style.setProperty('background', normalizedBg, 'important');
        }

        // SVG fills/strokes
        if (node instanceof doc.defaultView.SVGElement) {
          const fill = normalizeColor(cs.getPropertyValue('fill'), 'fill');
          const stroke = normalizeColor(cs.getPropertyValue('stroke'), 'stroke');
          if (fill) node.setAttribute('fill', fill);
          if (stroke) node.setAttribute('stroke', stroke);
        }
      }

      // Ensure a white page background
      if (doc.body && !doc.body.style.backgroundColor) {
        doc.body.style.backgroundColor = '#ffffff';
      }
    } catch (err) {
      // Best-effort; don't block PDF generation if this fails
      // eslint-disable-next-line no-console
      console.warn('Color inlining failed, continuing anyway:', err);
    }
  };

  const options = {
    margin: [10, 10],
    filename,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      onclone: (clonedDoc) => {
        // First inline computed styles (colors, fills)
        inlineComputedColors(clonedDoc);

        // Then strip external styles to prevent html2canvas from parsing
        // unsupported CSS functions (oklch, color-mix, etc.) from Tailwind
        try {
          const styles = clonedDoc.querySelectorAll('link[rel="stylesheet"], style');
          styles.forEach((el) => el.parentNode && el.parentNode.removeChild(el));
        } catch (e) {
          // ignore
        }

        // Force-reset global CSS variables that Tailwind sets to oklch
        try {
          const root = clonedDoc.documentElement;
          const style = root.style;
          // Remove any --color-* variables to avoid oklch fallbacks
          Array.from(root.ownerDocument.defaultView.getComputedStyle(root)).forEach((prop) => {
            if (prop.startsWith('--')) {
              style.removeProperty(prop);
            }
          });
        } catch {}

        // Ensure cloned root has a safe background
        clonedDoc.documentElement.style.backgroundColor = '#ffffff';
        clonedDoc.body.style.backgroundColor = '#ffffff';
      }
    },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };

  try {
    // Ensure we work with a real DOM node so that onclone can traverse it
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '-10000px';
    container.style.top = '0';
    container.style.width = '800px';
    container.style.background = '#ffffff';
    container.innerHTML = html;
    document.body.appendChild(container);

    // As an extra safeguard, set all descendants to black text on white background
    try {
      container.style.setProperty('color', '#000000', 'important');
      const all = container.getElementsByTagName('*');
      for (let i = 0; i < all.length; i++) {
        const el = all[i];
        el.style.setProperty('color', '#000000', 'important');
        el.style.setProperty('background', '#ffffff', 'important');
        el.style.setProperty('background-image', 'none', 'important');
        el.style.setProperty('background-color', '#ffffff', 'important');
      }
    } catch {}

    await html2pdf().set(options).from(container).save();

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
