// Supabase Edge Function for OCR and AI-powered invoice data extraction
// US-263: Supplier Invoice & Receipt OCR Upload

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-api-key',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// OpenAI API endpoint
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions'

// Prompt for invoice data extraction
const EXTRACTION_PROMPT = `You are an expert at extracting information from Swedish supplier invoices and receipts. 
Analyze the document and extract the relevant information.

IMPORTANT NOTES FOR SWEDISH INVOICES:

1. INVOICE NUMBER (Fakturanummer) - This can be tricky to identify:
   - Sometimes labeled "Fakturanr", "Fakturanummer", "Invoice no", "Fakt.nr"
   - OFTEN the invoice number is the SAME as the OCR/payment reference number
   - If you see "Fakturanr: Se ovan" or "Se betalningsreferens", the invoice number IS the OCR number
   - Look for "Anges vid betalning" (to be quoted when paying) - this number is usually BOTH the invoice number AND payment reference
   - The number after "Anges vid betalning" or in a box labeled similarly should be used as invoice_number
   - If there's only an OCR number visible and no separate invoice number, use the OCR as invoice_number
   - Some invoices use customer number + date as invoice reference

2. PAYMENT REFERENCE (OCR):
   - Usually a long number (10-25 digits) 
   - Often in a highlighted box or under "Anges vid betalning", "OCR", "Betalningsreferens"
   - This should ALSO be stored in payment_reference field
   - If the same number serves as both invoice number and OCR, put it in BOTH fields

3. SUPPLIER vs BUYER:
   - The SUPPLIER is the company SENDING the invoice (their details are usually at the top/header)
   - The BUYER/CUSTOMER ("Köpare", "Kund") is who receives the invoice - IGNORE buyer details
   - Extract ONLY the supplier/sender company information

Return a JSON object with the following structure (use null for fields that cannot be found):
{
  "supplier": {
    "name": "Company name (the company SENDING the invoice)",
    "organization_number": "Organization/registration number (Swedish format: XXXXXX-XXXX or 10 digits)",
    "vat_number": "VAT/tax number (Swedish format: SExxxxxxxxxx01)",
    "address": "Street address",
    "postal_code": "Postal code",
    "city": "City",
    "country": "Country",
    "email": "Email address",
    "phone": "Phone number",
    "bankgiro": "Bankgiro number (format: XXX-XXXX)",
    "plusgiro": "Plusgiro number",
    "iban": "IBAN number",
    "bic": "BIC/SWIFT code"
  },
  "invoice": {
    "invoice_number": "Invoice number - see notes above about Swedish conventions",
    "invoice_date": "Invoice date (YYYY-MM-DD format)",
    "due_date": "Due date/Förfallodatum (YYYY-MM-DD format)",
    "payment_reference": "OCR number or payment reference (often same as invoice_number)",
    "currency": "Currency code (default SEK)",
    "description": "Brief description of what the invoice is for"
  },
  "line_items": [
    {
      "description": "Item description",
      "quantity": 1,
      "unit_price": 0.00,
      "amount": 0.00,
      "vat_rate": 25,
      "vat_amount": 0.00,
      "suggested_account": "Suggested account number (Swedish BAS chart of accounts)",
      "suggested_account_name": "Account name",
      "category": "Expense category (e.g., 'office_supplies', 'travel', 'consulting', 'software', etc.)"
    }
  ],
  "totals": {
    "subtotal": 0.00,
    "vat_amount": 0.00,
    "total_amount": 0.00
  },
  "confidence": {
    "overall": 0.85,
    "supplier_name": 0.95,
    "invoice_number": 0.90,
    "amounts": 0.80,
    "notes": "Any notes about extraction quality or uncertain fields"
  }
}

For Swedish invoices, common expense accounts include:
- 4010: Inköp material och varor (Purchase of materials and goods)
- 5010: Lokalhyra (Rent)
- 5410: Förbrukningsinventarier (Consumables)
- 5420: Programvara (Software/IT)
- 5460: Förbrukningsinventarier under 5000 kr
- 5800: Resekostnader (Travel expenses)
- 5831: Taxi
- 5910: Annonsering (Advertising)
- 6110: Kontorsmaterial (Office supplies)
- 6212: Mobiltelefon (Mobile phone)
- 6230: Datakommunikation (IT services)
- 6250: Porto (Postage)
- 6310: Företagsförsäkringar (Company insurance)
- 6530: Redovisningstjänster (Accounting services)
- 6540: Juridiska tjänster (Legal services)
- 6570: Bankavgifter (Banking fees)
- 7510: Löner (Payroll costs)

Be precise with amounts. If VAT is shown separately, calculate the rates accurately.
Parse Swedish date formats (YYYY-MM-DD, DD/MM/YYYY, YYMMDD, etc.) to YYYY-MM-DD.

IMPORTANT: Return ONLY the JSON object, no additional text or markdown.`

// Function to extract text using OCR (Tesseract.js via Supabase)
async function extractTextFromImage(imageBase64: string): Promise<string> {
  // For images, we'll use OpenAI's vision capabilities directly
  // This is more accurate than traditional OCR for invoices
  return imageBase64 // Return base64 for vision API
}

// Function to call OpenAI API for data extraction
async function extractInvoiceDataWithAI(
  ocrText: string,
  imageBase64: string | null,
  openaiApiKey: string
): Promise<object> {
  const messages: Array<{ role: string; content: any }> = [
    {
      role: 'system',
      content: EXTRACTION_PROMPT
    }
  ]

  // If we have an image, use vision capabilities
  if (imageBase64) {
    messages.push({
      role: 'user',
      content: [
        {
          type: 'text',
          text: `Extract invoice data from this document image. ${ocrText ? `Additional OCR text for reference: ${ocrText}` : ''}`
        },
        {
          type: 'image_url',
          image_url: {
            url: `data:image/jpeg;base64,${imageBase64}`,
            detail: 'high'
          }
        }
      ]
    })
  } else {
    messages.push({
      role: 'user',
      content: `Extract invoice data from the following OCR text:\n\n${ocrText}`
    })
  }

  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${openaiApiKey}`
    },
    body: JSON.stringify({
      model: imageBase64 ? 'gpt-4o' : 'gpt-4o-mini',
      messages,
      max_tokens: 2000,
      temperature: 0.1 // Low temperature for more deterministic extraction
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('OpenAI API error:', errorText)
    throw new Error(`OpenAI API error: ${response.status}`)
  }

  const data = await response.json()
  const content = data.choices[0]?.message?.content

  if (!content) {
    throw new Error('No response from OpenAI')
  }

  // Parse JSON from response (handling potential markdown code blocks)
  let jsonContent = content.trim()
  if (jsonContent.startsWith('```json')) {
    jsonContent = jsonContent.slice(7)
  }
  if (jsonContent.startsWith('```')) {
    jsonContent = jsonContent.slice(3)
  }
  if (jsonContent.endsWith('```')) {
    jsonContent = jsonContent.slice(0, -3)
  }

  return JSON.parse(jsonContent.trim())
}

// Convert PDF to images using pdf.js (for PDF processing)
async function processPdf(pdfBase64: string): Promise<{ text: string; images: string[] }> {
  // For PDFs, we extract text directly and also get page images
  // The actual PDF processing happens client-side using pdf.js
  // This function receives already-processed data
  return { text: '', images: [] }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 204,
      headers: corsHeaders 
    })
  }

  try {
    // Verify authorization header exists (Supabase handles JWT validation)
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    
    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ 
          error: 'OpenAI API key not configured',
          code: 'OPENAI_NOT_CONFIGURED'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { 
      fileBase64,
      fileType, // 'pdf', 'image/jpeg', 'image/png'
      ocrText, // Optional: pre-extracted OCR text from client-side processing
      organizationId,
      existingSuppliers // Optional: list of existing suppliers for matching
    } = await req.json()

    if (!fileBase64) {
      return new Response(
        JSON.stringify({ error: 'File content is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let extractedData: object
    let imageBase64: string | null = null

    // Determine if we can use vision API
    if (fileType.startsWith('image/')) {
      imageBase64 = fileBase64
    }
    // For PDFs, the client should send the first page as an image

    // Extract invoice data using AI
    extractedData = await extractInvoiceDataWithAI(ocrText || '', imageBase64, openaiApiKey)

    // Match against existing suppliers if provided
    if (existingSuppliers && Array.isArray(existingSuppliers)) {
      const extractedSupplierName = (extractedData as any)?.supplier?.name?.toLowerCase()
      const extractedOrgNumber = (extractedData as any)?.supplier?.organization_number

      for (const supplier of existingSuppliers) {
        // Match by organization number (most reliable)
        if (extractedOrgNumber && supplier.organization_number === extractedOrgNumber) {
          (extractedData as any).matched_supplier = {
            id: supplier.id,
            name: supplier.name,
            match_type: 'organization_number',
            confidence: 1.0
          }
          break
        }
        
        // Match by name (fuzzy)
        if (extractedSupplierName && supplier.name?.toLowerCase().includes(extractedSupplierName)) {
          (extractedData as any).matched_supplier = {
            id: supplier.id,
            name: supplier.name,
            match_type: 'name',
            confidence: 0.8
          }
          // Don't break - continue looking for exact org number match
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: extractedData,
        processing: {
          used_vision: !!imageBase64,
          file_type: fileType
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Invoice extraction error:', error)
    
    let errorMessage = 'Failed to extract invoice data'
    let errorCode = 'EXTRACTION_FAILED'
    
    if (error.message.includes('JSON')) {
      errorMessage = 'Failed to parse extracted data'
      errorCode = 'PARSE_ERROR'
    } else if (error.message.includes('OpenAI')) {
      errorMessage = 'AI service error'
      errorCode = 'AI_SERVICE_ERROR'
    }

    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        code: errorCode,
        details: error.message
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
