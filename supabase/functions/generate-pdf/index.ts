// Supabase Edge Function for PDF Generation using Browserless API
// This uses a headless Chrome service to render HTML to PDF

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

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
    const { html, filename = 'invoice.pdf' } = await req.json()

    if (!html) {
      return new Response(
        JSON.stringify({ error: 'HTML content is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Use Browserless.io API for PDF generation
    // You'll need to set BROWSERLESS_API_KEY in your Supabase secrets
    const browserlessApiKey = Deno.env.get('BROWSERLESS_API_KEY')
    
    if (!browserlessApiKey) {
      // Fallback: Return HTML as downloadable file if no API key
      // User can print to PDF from browser
      return new Response(html, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/html',
          'Content-Disposition': `attachment; filename="${filename.replace('.pdf', '.html')}"`,
        },
      })
    }

    // Call Browserless PDF API
    const pdfResponse = await fetch('https://chrome.browserless.io/pdf', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${btoa(browserlessApiKey + ':')}`,
      },
      body: JSON.stringify({
        html,
        options: {
          format: 'A4',
          printBackground: true,
          margin: {
            top: '10mm',
            right: '10mm',
            bottom: '10mm',
            left: '10mm',
          },
        },
      }),
    })

    if (!pdfResponse.ok) {
      const errorText = await pdfResponse.text()
      console.error('Browserless API error:', errorText)
      throw new Error(`PDF generation failed: ${pdfResponse.status}`)
    }

    const pdfBuffer = await pdfResponse.arrayBuffer()

    return new Response(pdfBuffer, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('PDF generation error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
