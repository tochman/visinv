// Supabase Edge Function for processing inbound supplier invoice emails
// US-264b: Inbound Email Processing (Backend)
// Handles webhooks from Resend for emails sent to {slug}@dortal.resend.app
//
// DEPLOYMENT NOTE: This function must be deployed with --no-verify-jwt
// to allow unauthenticated webhook calls from Resend:
//   supabase functions deploy process-inbound-supplier-invoice --no-verify-jwt
//
// REQUIRED ENV VARS:
//   - SUPABASE_URL
//   - SUPABASE_SERVICE_ROLE_KEY
//   - RESEND_WEBHOOK_SECRET (from Resend webhook settings, starts with 'whsec_')

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, svix-id, svix-timestamp, svix-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Email domain for receiving supplier invoices
const RECEIVING_DOMAIN = 'dortal.resend.app'

// Resend webhook attachment metadata (does NOT include content)
interface WebhookAttachment {
  id: string
  filename: string
  content_type: string
  content_disposition: string
  content_id?: string
}

// Resend API attachment response with download URL
interface ResendAttachment {
  id: string
  filename: string
  content_type: string
  content_disposition: string
  content_id?: string
  download_url: string
  expires_at: string
}

interface InboundEmail {
  email_id: string // ID to fetch attachment content
  from: string
  to: string | string[]
  subject: string
  text?: string
  html?: string
  attachments?: WebhookAttachment[]
  headers?: Record<string, string>
  message_id?: string
  date?: string
  created_at?: string
}

interface WebhookPayload {
  type: string
  created_at: string
  data: InboundEmail
}

// Allowed attachment types
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/gif',
  'image/webp',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
  'application/vnd.ms-excel', // xls
]

const ALLOWED_EXTENSIONS = ['.pdf', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.xlsx', '.xls']

// Maximum file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024

/**
 * Extract email slug from recipient address
 * Supports alphanumeric characters, hyphens, and underscores
 */
function extractSlug(toAddress: string): string | null {
  const match = toAddress.toLowerCase().match(/^([a-z0-9_-]+)@/i)
  return match ? match[1].toLowerCase() : null
}

/**
 * Extract sender email address
 */
function extractSenderEmail(from: string): string {
  // Handle formats like "Name <email@example.com>" or just "email@example.com"
  const match = from.match(/<([^>]+)>/)
  return match ? match[1].toLowerCase() : from.toLowerCase()
}

/**
 * Extract sender name
 */
function extractSenderName(from: string): string | null {
  const match = from.match(/^([^<]+)\s*</)
  return match ? match[1].trim() : null
}

/**
 * Check if file type is allowed
 */
function isAllowedFileType(filename: string, contentType: string): boolean {
  const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'))
  return ALLOWED_EXTENSIONS.includes(ext) || ALLOWED_MIME_TYPES.includes(contentType)
}

/**
 * Generate a unique storage path for the attachment
 */
function generateStoragePath(organizationId: string, filename: string): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  const safeFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_')
  return `${organizationId}/${timestamp}-${random}-${safeFilename}`
}

/**
 * Fetch attachment details with download URLs from Resend API
 */
async function fetchResendAttachments(emailId: string, resendApiKey: string): Promise<ResendAttachment[]> {
  const response = await fetch(`https://api.resend.com/emails/receiving/${emailId}/attachments`, {
    headers: {
      'Authorization': `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
  })
  
  if (!response.ok) {
    const errorText = await response.text()
    console.error(`Resend API error: ${response.status} - ${errorText}`)
    throw new Error(`Failed to fetch attachments from Resend: ${response.status}`)
  }
  
  const data = await response.json()
  return data.data || []
}

/**
 * Download attachment content from Resend's signed URL
 */
async function downloadAttachment(downloadUrl: string): Promise<{ buffer: ArrayBuffer, size: number }> {
  const response = await fetch(downloadUrl)
  
  if (!response.ok) {
    throw new Error(`Failed to download attachment: ${response.status}`)
  }
  
  const buffer = await response.arrayBuffer()
  return { buffer, size: buffer.byteLength }
}

/**
 * Calculate message hash for duplicate detection
 */
async function calculateMessageHash(messageId: string | undefined, from: string, subject: string, date: string): Promise<string> {
  const content = `${messageId || ''}|${from}|${subject}|${date}`
  const encoder = new TextEncoder()
  const data = encoder.encode(content)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Verify Svix webhook signature (used by Resend)
 * Based on: https://docs.svix.com/receiving/verifying-payloads/how-manual
 */
async function verifyWebhookSignature(
  payload: string,
  headers: {
    svixId: string | null
    svixTimestamp: string | null
    svixSignature: string | null
  },
  secret: string
): Promise<boolean> {
  const { svixId, svixTimestamp, svixSignature } = headers
  
  // All headers are required
  if (!svixId || !svixTimestamp || !svixSignature) {
    console.error('Missing Svix headers for webhook verification')
    return false
  }
  
  // Check timestamp is within 5 minutes to prevent replay attacks
  const timestamp = parseInt(svixTimestamp, 10)
  const now = Math.floor(Date.now() / 1000)
  if (isNaN(timestamp) || Math.abs(now - timestamp) > 300) {
    console.error('Webhook timestamp too old or invalid')
    return false
  }
  
  // Prepare the signed content
  const signedContent = `${svixId}.${svixTimestamp}.${payload}`
  
  // Extract the secret key (remove 'whsec_' prefix if present)
  const secretKey = secret.startsWith('whsec_') ? secret.slice(6) : secret
  
  // Decode the base64 secret
  const secretBytes = Uint8Array.from(atob(secretKey), c => c.charCodeAt(0))
  
  // Import the key for HMAC
  const key = await crypto.subtle.importKey(
    'raw',
    secretBytes,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  
  // Sign the content
  const encoder = new TextEncoder()
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(signedContent))
  const expectedSignature = 'v1,' + btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)))
  
  // The signature header can contain multiple signatures (v1,sig1 v1,sig2)
  const signatures = svixSignature.split(' ')
  
  // Check if any signature matches
  for (const sig of signatures) {
    if (sig === expectedSignature) {
      return true
    }
  }
  
  console.error('No matching webhook signature found')
  return false
}

/**
 * Log webhook event for debugging
 */
async function logWebhook(
  supabase: any,
  type: string,
  payload: any,
  success: boolean,
  errorMessage?: string
): Promise<void> {
  try {
    await supabase.from('webhook_logs').insert({
      webhook_type: 'resend_inbound',
      event_type: type,
      payload,
      success,
      error_message: errorMessage,
    })
  } catch (e) {
    console.error('Failed to log webhook:', e)
  }
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Initialize Supabase client with service role for admin access
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const webhookSecret = Deno.env.get('RESEND_WEBHOOK_SECRET')
  const resendApiKey = Deno.env.get('RESEND_API_KEY')
  
  if (!resendApiKey) {
    console.error('RESEND_API_KEY not configured')
    return new Response(
      JSON.stringify({ error: 'Server configuration error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  // Get the raw body for signature verification
  const rawBody = await req.text()
  
  try {
    // Verify webhook signature if secret is configured
    if (webhookSecret) {
      const svixHeaders = {
        svixId: req.headers.get('svix-id'),
        svixTimestamp: req.headers.get('svix-timestamp'),
        svixSignature: req.headers.get('svix-signature'),
      }
      
      const isValid = await verifyWebhookSignature(rawBody, svixHeaders, webhookSecret)
      
      if (!isValid) {
        console.error('Invalid webhook signature')
        return new Response(
          JSON.stringify({ error: 'Invalid webhook signature' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      console.log('Webhook signature verified successfully')
    } else {
      console.warn('RESEND_WEBHOOK_SECRET not configured - skipping signature verification')
    }

    const payload: WebhookPayload = JSON.parse(rawBody)
    
    // Log incoming webhook
    await logWebhook(supabase, payload.type, payload, true)

    // Only process inbound email events
    if (payload.type !== 'email.received') {
      return new Response(
        JSON.stringify({ message: 'Event type ignored', type: payload.type }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const email = payload.data
    
    // Extract the recipient address(es)
    const toAddresses = Array.isArray(email.to) ? email.to : [email.to]
    
    // Find our receiving address
    const ourAddress = toAddresses.find(addr => addr.toLowerCase().includes(RECEIVING_DOMAIN))
    if (!ourAddress) {
      await logWebhook(supabase, 'email.received', payload, false, 'No matching recipient domain')
      return new Response(
        JSON.stringify({ error: 'Invalid recipient domain' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Extract slug from recipient
    const slug = extractSlug(ourAddress)
    if (!slug) {
      await logWebhook(supabase, 'email.received', payload, false, 'Could not extract slug')
      return new Response(
        JSON.stringify({ error: 'Invalid recipient format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Look up organization by email_slug
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .select('id, name, email_slug')
      .eq('email_slug', slug)
      .single()

    if (orgError || !organization) {
      await logWebhook(supabase, 'email.received', payload, false, `Organization not found for slug: ${slug}`)
      return new Response(
        JSON.stringify({ error: 'Organization not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check rate limit for this organization
    const senderEmail = extractSenderEmail(email.from)
    const { data: rateLimitOk } = await supabase.rpc('check_email_rate_limit', {
      p_organization_id: organization.id,
      p_sender_email: senderEmail
    })

    if (!rateLimitOk) {
      await logWebhook(supabase, 'email.received', payload, false, 'Rate limit exceeded')
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Calculate message hash for duplicate detection
    const messageHash = await calculateMessageHash(
      email.message_id,
      email.from,
      email.subject || '',
      email.date || payload.created_at
    )

    // Check for duplicates
    const { data: isDuplicate } = await supabase.rpc('check_inbox_duplicate', {
      p_organization_id: organization.id,
      p_message_hash: messageHash
    })

    if (isDuplicate) {
      await logWebhook(supabase, 'email.received', payload, false, 'Duplicate message')
      return new Response(
        JSON.stringify({ message: 'Duplicate message ignored' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Process attachments - webhook only has metadata, need to fetch content from Resend API
    const webhookAttachments = email.attachments || []
    const validWebhookAttachments = webhookAttachments.filter(att => 
      isAllowedFileType(att.filename, att.content_type)
    )

    if (validWebhookAttachments.length === 0) {
      // Create inbox item with no_attachment status
      const { data: inboxItem, error: insertError } = await supabase
        .from('supplier_inbox_items')
        .insert({
          organization_id: organization.id,
          status: 'no_attachment',
          sender_email: senderEmail,
          subject: email.subject || '(No subject)',
          received_at: email.created_at || payload.created_at,
          email_body: (email.text || '').substring(0, 1000),
        })
        .select()
        .single()

      if (insertError) {
        throw insertError
      }

      return new Response(
        JSON.stringify({ 
          message: 'Email received but no valid attachments',
          inbox_item_id: inboxItem.id,
          status: 'no_attachment'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch attachment download URLs from Resend API
    console.log(`Fetching attachments for email: ${email.email_id}`)
    let resendAttachments: ResendAttachment[] = []
    
    try {
      resendAttachments = await fetchResendAttachments(email.email_id, resendApiKey)
      console.log(`Retrieved ${resendAttachments.length} attachments from Resend API`)
    } catch (fetchErr) {
      console.error('Failed to fetch attachments from Resend:', fetchErr)
      await logWebhook(supabase, 'email.received', payload, false, `Failed to fetch attachments: ${fetchErr}`)
      
      // Still create an inbox item but without the file
      const { data: inboxItem, error: insertError } = await supabase
        .from('supplier_inbox_items')
        .insert({
          organization_id: organization.id,
          status: 'no_attachment',
          sender_email: senderEmail,
          subject: email.subject || '(No subject)',
          received_at: email.created_at || payload.created_at,
          email_body: `[Attachment fetch failed] ${(email.text || '').substring(0, 900)}`,
        })
        .select()
        .single()
      
      return new Response(
        JSON.stringify({ 
          error: 'Failed to fetch attachments',
          inbox_item_id: inboxItem?.id
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Process each attachment that has a valid type
    const createdItems = []
    
    for (const attachment of resendAttachments) {
      // Check if this attachment type is allowed
      if (!isAllowedFileType(attachment.filename, attachment.content_type)) {
        console.log(`Skipping disallowed file type: ${attachment.filename} (${attachment.content_type})`)
        continue
      }
      
      try {
        // Download the attachment content
        console.log(`Downloading attachment: ${attachment.filename}`)
        const { buffer, size } = await downloadAttachment(attachment.download_url)
        
        // Check file size
        if (size > MAX_FILE_SIZE) {
          console.log(`Skipping oversized attachment: ${attachment.filename} (${size} bytes)`)
          continue
        }
        
        // Generate storage path
        const storagePath = generateStoragePath(organization.id, attachment.filename)
        
        // Upload to Supabase storage
        const { error: uploadError } = await supabase.storage
          .from('supplier-inbox')
          .upload(storagePath, buffer, {
            contentType: attachment.content_type,
            upsert: false
          })

        if (uploadError) {
          console.error('Upload error:', uploadError)
          continue // Skip this attachment but continue with others
        }

        // Create inbox item
        const { data: inboxItem, error: insertError } = await supabase
          .from('supplier_inbox_items')
          .insert({
            organization_id: organization.id,
            status: 'new',
            sender_email: senderEmail,
            subject: email.subject || '(No subject)',
            received_at: email.created_at || payload.created_at,
            email_body: (email.text || '').substring(0, 1000),
            file_name: attachment.filename,
            content_type: attachment.content_type,
            file_size: size,
            storage_path: storagePath,
          })
          .select()
          .single()

        if (insertError) {
          console.error('Insert error:', insertError)
          // Try to clean up uploaded file
          await supabase.storage.from('supplier-inbox').remove([storagePath])
          continue
        }

        createdItems.push(inboxItem)
      } catch (attachErr) {
        console.error(`Failed to process attachment ${attachment.filename}:`, attachErr)
        continue
      }
    }

    if (createdItems.length === 0) {
      await logWebhook(supabase, 'email.received', payload, false, 'Failed to process any attachments')
      return new Response(
        JSON.stringify({ error: 'Failed to process attachments' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update webhook log with success
    await logWebhook(supabase, 'email.received', { 
      ...payload, 
      processed_items: createdItems.length 
    }, true)

    return new Response(
      JSON.stringify({ 
        message: 'Email processed successfully',
        items_created: createdItems.length,
        inbox_item_ids: createdItems.map(i => i.id)
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error processing inbound email:', error)
    await logWebhook(supabase, 'error', { error: error.message }, false, error.message)
    
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
