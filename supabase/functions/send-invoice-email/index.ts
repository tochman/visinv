// Supabase Edge Function for sending invoice emails using Resend
// US-008: Invoice Email Delivery

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { invoiceId } = await req.json()

    if (!invoiceId) {
      return new Response(
        JSON.stringify({ error: 'Invoice ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get Resend API key from environment
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    if (!resendApiKey) {
      return new Response(
        JSON.stringify({ error: 'Resend API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Fetch invoice with client and organization data
    const { data: invoice, error: fetchError } = await supabase
      .from('invoices')
      .select(`
        *,
        client:clients(id, name, email),
        organization:organizations(id, name, email, address, city, postal_code, country, phone, org_number, vat_number),
        invoice_rows(*)
      `)
      .eq('id', invoiceId)
      .single()

    if (fetchError || !invoice) {
      return new Response(
        JSON.stringify({ error: 'Invoice not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate client email
    if (!invoice.client?.email) {
      return new Response(
        JSON.stringify({ error: 'Client email is missing' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Generate invoice HTML for PDF (reusing generate-pdf logic)
    const invoiceHtml = generateInvoiceHtml(invoice)

    // Generate PDF using Browserless or fallback
    let pdfBuffer: ArrayBuffer | null = null
    const browserlessApiKey = Deno.env.get('BROWSERLESS_API_KEY')

    if (browserlessApiKey) {
      try {
        const pdfResponse = await fetch('https://chrome.browserless.io/pdf', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${btoa(browserlessApiKey + ':')}`,
          },
          body: JSON.stringify({
            html: invoiceHtml,
            options: {
              format: 'A4',
              printBackground: true,
              margin: { top: '0', right: '0', bottom: '0', left: '0' }
            }
          })
        })

        if (pdfResponse.ok) {
          pdfBuffer = await pdfResponse.arrayBuffer()
        }
      } catch (err) {
        console.error('PDF generation failed:', err)
      }
    }

    // Prepare email content
    const subject = `Invoice ${invoice.invoice_number} from ${invoice.organization?.name || 'VisInv'}`
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Invoice ${invoice.invoice_number}</h2>
        <p>Dear ${invoice.client.name},</p>
        <p>Please find attached invoice ${invoice.invoice_number} dated ${formatDate(invoice.issue_date)}.</p>
        
        <div style="background: #f5f5f5; padding: 15px; margin: 20px 0; border-radius: 5px;">
          <p style="margin: 5px 0;"><strong>Invoice Number:</strong> ${invoice.invoice_number}</p>
          <p style="margin: 5px 0;"><strong>Issue Date:</strong> ${formatDate(invoice.issue_date)}</p>
          <p style="margin: 5px 0;"><strong>Due Date:</strong> ${formatDate(invoice.due_date)}</p>
          <p style="margin: 5px 0;"><strong>Amount:</strong> ${formatCurrency(invoice.total_amount, invoice.currency)}</p>
        </div>

        ${invoice.organization?.name ? `
        <p>If you have any questions, please contact us:</p>
        <p>
          ${invoice.organization.name}<br>
          ${invoice.organization.email || ''}<br>
          ${invoice.organization.phone || ''}
        </p>
        ` : ''}

        <p>Best regards,<br>${invoice.organization?.name || 'VisInv'}</p>
      </div>
    `

    // Prepare Resend email payload
    const emailPayload: any = {
      from: invoice.organization?.email || 'invoices@visinv.app',
      to: invoice.client.email,
      subject,
      html: emailHtml,
    }

    // Add PDF attachment if generated
    if (pdfBuffer) {
      const base64Pdf = btoa(String.fromCharCode(...new Uint8Array(pdfBuffer)))
      emailPayload.attachments = [{
        filename: `invoice-${invoice.invoice_number}.pdf`,
        content: base64Pdf,
      }]
    }

    // Send email via Resend
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify(emailPayload),
    })

    if (!resendResponse.ok) {
      const errorData = await resendResponse.json()
      console.error('Resend error:', errorData)
      return new Response(
        JSON.stringify({ error: 'Failed to send email', details: errorData }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const emailResult = await resendResponse.json()

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageId: emailResult.id,
        to: invoice.client.email 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error sending invoice email:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// Helper functions
function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString('sv-SE') // Swedish date format YYYY-MM-DD
}

function formatCurrency(amount: string | number, currency: string = 'SEK'): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  return `${num.toFixed(2)} ${currency}`
}

function generateInvoiceHtml(invoice: any): string {
  // Calculate totals
  const subtotal = invoice.invoice_rows.reduce((sum: number, row: any) => {
    return sum + (parseFloat(row.quantity) * parseFloat(row.unit_price))
  }, 0)
  
  const taxAmount = parseFloat(invoice.total_amount) - subtotal

  return `
<!DOCTYPE html>
<html lang="sv">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice ${invoice.invoice_number}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 12px; line-height: 1.5; padding: 20mm; }
    .invoice-header { display: flex; justify-content: space-between; margin-bottom: 40px; }
    .company-info { max-width: 50%; }
    .invoice-info { text-align: right; max-width: 50%; }
    .invoice-title { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
    .client-section { margin: 30px 0; padding: 20px; background: #f9f9f9; }
    .client-section h3 { margin-bottom: 10px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { text-align: left; padding: 10px; border-bottom: 1px solid #ddd; }
    th { background: #f5f5f5; font-weight: bold; }
    .text-right { text-align: right; }
    .totals { margin-top: 20px; text-align: right; }
    .totals table { width: auto; margin-left: auto; }
    .totals .total { font-size: 16px; font-weight: bold; }
    .footer { margin-top: 50px; font-size: 11px; color: #666; }
  </style>
</head>
<body>
  <div class="invoice-header">
    <div class="company-info">
      <h1>${invoice.organization?.name || 'VisInv'}</h1>
      ${invoice.organization?.address ? `<p>${invoice.organization.address}</p>` : ''}
      ${invoice.organization?.postal_code && invoice.organization?.city ? `<p>${invoice.organization.postal_code} ${invoice.organization.city}</p>` : ''}
      ${invoice.organization?.org_number ? `<p>Org. nr: ${invoice.organization.org_number}</p>` : ''}
      ${invoice.organization?.vat_number ? `<p>VAT: ${invoice.organization.vat_number}</p>` : ''}
      ${invoice.organization?.email ? `<p>${invoice.organization.email}</p>` : ''}
      ${invoice.organization?.phone ? `<p>${invoice.organization.phone}</p>` : ''}
    </div>
    <div class="invoice-info">
      <div class="invoice-title">INVOICE</div>
      <p><strong>Invoice Number:</strong> ${invoice.invoice_number}</p>
      <p><strong>Issue Date:</strong> ${formatDate(invoice.issue_date)}</p>
      <p><strong>Due Date:</strong> ${formatDate(invoice.due_date)}</p>
      ${invoice.delivery_date ? `<p><strong>Delivery Date:</strong> ${formatDate(invoice.delivery_date)}</p>` : ''}
    </div>
  </div>

  <div class="client-section">
    <h3>Bill To:</h3>
    <p><strong>${invoice.client?.name}</strong></p>
    ${invoice.client?.address ? `<p>${invoice.client.address}</p>` : ''}
    ${invoice.client?.postal_code && invoice.client?.city ? `<p>${invoice.client.postal_code} ${invoice.client.city}</p>` : ''}
    ${invoice.client?.org_number ? `<p>Org. nr: ${invoice.client.org_number}</p>` : ''}
  </div>

  <table>
    <thead>
      <tr>
        <th>Description</th>
        <th class="text-right">Quantity</th>
        <th class="text-right">Unit Price</th>
        <th class="text-right">VAT %</th>
        <th class="text-right">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${invoice.invoice_rows.map((row: any) => `
        <tr>
          <td>${row.description}</td>
          <td class="text-right">${parseFloat(row.quantity)} ${row.unit || ''}</td>
          <td class="text-right">${formatCurrency(row.unit_price, invoice.currency)}</td>
          <td class="text-right">${parseFloat(row.tax_rate)}%</td>
          <td class="text-right">${formatCurrency(parseFloat(row.quantity) * parseFloat(row.unit_price), invoice.currency)}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="totals">
    <table>
      <tr>
        <td>Subtotal:</td>
        <td class="text-right">${formatCurrency(subtotal, invoice.currency)}</td>
      </tr>
      <tr>
        <td>VAT (${parseFloat(invoice.tax_rate)}%):</td>
        <td class="text-right">${formatCurrency(taxAmount, invoice.currency)}</td>
      </tr>
      <tr class="total">
        <td><strong>Total:</strong></td>
        <td class="text-right"><strong>${formatCurrency(invoice.total_amount, invoice.currency)}</strong></td>
      </tr>
    </table>
  </div>

  ${invoice.notes ? `
  <div style="margin-top: 30px;">
    <h3>Notes:</h3>
    <p>${invoice.notes}</p>
  </div>
  ` : ''}

  <div class="footer">
    <p>Thank you for your business!</p>
    ${invoice.terms ? `<p>Terms: ${invoice.terms}</p>` : ''}
  </div>
</body>
</html>
  `.trim()
}
