// Supabase Edge Function for processing inbound supplier invoice emails
// US-264b: Inbound Email Processing (Backend)
// Handles webhooks from Resend for emails sent to {slug}@dortal.resend.app

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Email domain for receiving supplier invoices
const RECEIVING_DOMAIN = 'dortal.resend.app'

interface EmailAttachment {
  filename: string
  content: string // Base64 encoded
  content_type: string
  size: number
}

interface InboundEmail {
  from: string
  to: string | string[]
  subject: string
  text?: string
  html?: string
  attachments?: EmailAttachment[]
  headers?: Record<string, string>
  message_id?: string
  date?: string
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
 */
function extractSlug(toAddress: string): string | null {
  const match = toAddress.toLowerCase().match(/^([a-z0-9-]+)@/i)
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
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    // Verify webhook signature if secret is configured
    if (webhookSecret) {
      const signature = req.headers.get('x-webhook-signature')
      // TODO: Implement Resend signature verification when they provide documentation
      // For now, we rely on the URL being secret
    }

    const payload: WebhookPayload = await req.json()
    
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

    // Process attachments
    const attachments = email.attachments || []
    const validAttachments = attachments.filter(att => 
      isAllowedFileType(att.filename, att.content_type) && att.size <= MAX_FILE_SIZE
    )

    if (validAttachments.length === 0) {
      // Create inbox item with no_attachment status
      const { data: inboxItem, error: insertError } = await supabase
        .from('supplier_inbox_items')
        .insert({
          organization_id: organization.id,
          status: 'no_attachment',
          from_email: senderEmail,
          from_name: extractSenderName(email.from),
          subject: email.subject || '(No subject)',
          received_at: email.date || payload.created_at,
          message_id: email.message_id,
          message_hash: messageHash,
          email_body_preview: (email.text || '').substring(0, 500),
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

    // Process each valid attachment
    const createdItems = []
    
    for (const attachment of validAttachments) {
      // Generate storage path
      const storagePath = generateStoragePath(organization.id, attachment.filename)
      
      // Decode base64 and upload to storage
      const fileBuffer = Uint8Array.from(atob(attachment.content), c => c.charCodeAt(0))
      
      const { error: uploadError } = await supabase.storage
        .from('supplier-inbox')
        .upload(storagePath, fileBuffer, {
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
          from_email: senderEmail,
          from_name: extractSenderName(email.from),
          subject: email.subject || '(No subject)',
          received_at: email.date || payload.created_at,
          message_id: email.message_id,
          message_hash: messageHash,
          email_body_preview: (email.text || '').substring(0, 500),
          file_name: attachment.filename,
          file_type: attachment.content_type,
          file_size: attachment.size,
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
