-- Migration: US-264b Inbound Email Processing
-- Creates supplier_inbox_items table for storing received supplier invoices via email
-- Also creates the supplier-inbox storage bucket

-- ============================================
-- SUPPLIER INBOX STATUS ENUM
-- ============================================
DO $$ BEGIN
  CREATE TYPE supplier_inbox_status AS ENUM ('new', 'processed', 'archived', 'duplicate', 'no_attachment');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- SUPPLIER INBOX ITEMS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS supplier_inbox_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID REFERENCES organizations ON DELETE CASCADE NOT NULL,
  
  -- Email metadata
  sender_email TEXT NOT NULL,
  subject TEXT DEFAULT '(No subject)',
  email_body TEXT,
  received_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL,
  
  -- Attachment info
  file_name TEXT,
  storage_path TEXT,
  file_size INTEGER,
  file_hash TEXT, -- SHA-256 hash for duplicate detection
  content_type TEXT, -- MIME type (application/pdf, image/jpeg, image/png)
  
  -- Status tracking
  status supplier_inbox_status DEFAULT 'new' NOT NULL,
  is_duplicate_of UUID REFERENCES supplier_inbox_items(id) ON DELETE SET NULL,
  supplier_invoice_id UUID REFERENCES supplier_invoices(id) ON DELETE SET NULL,
  
  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL,
  archived_at TIMESTAMP WITH TIME ZONE,
  archived_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Constraints
  CONSTRAINT valid_status_for_duplicate CHECK (
    (status = 'duplicate' AND is_duplicate_of IS NOT NULL) OR
    (status != 'duplicate')
  ),
  CONSTRAINT valid_processed_status CHECK (
    (status = 'processed' AND supplier_invoice_id IS NOT NULL) OR
    (status != 'processed')
  )
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_supplier_inbox_org_id ON supplier_inbox_items(organization_id);
CREATE INDEX IF NOT EXISTS idx_supplier_inbox_status ON supplier_inbox_items(status);
CREATE INDEX IF NOT EXISTS idx_supplier_inbox_received_at ON supplier_inbox_items(received_at DESC);
CREATE INDEX IF NOT EXISTS idx_supplier_inbox_file_hash ON supplier_inbox_items(file_hash);
CREATE INDEX IF NOT EXISTS idx_supplier_inbox_sender_email ON supplier_inbox_items(sender_email);
CREATE INDEX IF NOT EXISTS idx_supplier_inbox_org_status ON supplier_inbox_items(organization_id, status);

-- ============================================
-- UPDATED_AT TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION update_supplier_inbox_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::TEXT, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_supplier_inbox_updated_at ON supplier_inbox_items;
CREATE TRIGGER trg_supplier_inbox_updated_at
  BEFORE UPDATE ON supplier_inbox_items
  FOR EACH ROW
  EXECUTE FUNCTION update_supplier_inbox_updated_at();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE supplier_inbox_items ENABLE ROW LEVEL SECURITY;

-- Users can view inbox items for organizations they're members of
CREATE POLICY "Users can view inbox items for their organizations"
  ON supplier_inbox_items
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid()
    )
  );

-- Users can insert inbox items for their organizations (via Edge Function with service role)
-- Note: Edge Function uses service_role key, bypassing RLS
-- This policy is for direct inserts if needed
CREATE POLICY "Users can insert inbox items for their organizations"
  ON supplier_inbox_items
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid()
    )
  );

-- Users can update inbox items for their organizations
CREATE POLICY "Users can update inbox items for their organizations"
  ON supplier_inbox_items
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid()
    )
  );

-- Users can delete inbox items for their organizations
CREATE POLICY "Users can delete inbox items for their organizations"
  ON supplier_inbox_items
  FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid()
    )
  );

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to check for duplicate files within last 90 days
CREATE OR REPLACE FUNCTION check_inbox_duplicate(
  p_organization_id UUID,
  p_file_hash TEXT
)
RETURNS TABLE(
  is_duplicate BOOLEAN,
  duplicate_of UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    TRUE as is_duplicate,
    id as duplicate_of
  FROM supplier_inbox_items
  WHERE organization_id = p_organization_id
    AND file_hash = p_file_hash
    AND created_at > NOW() - INTERVAL '90 days'
    AND status != 'duplicate'
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- If no rows returned, return false
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE as is_duplicate, NULL::UUID as duplicate_of;
  END IF;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get inbox count by status for an organization
CREATE OR REPLACE FUNCTION get_inbox_count(
  p_organization_id UUID,
  p_status supplier_inbox_status DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  count_result INTEGER;
BEGIN
  IF p_status IS NULL THEN
    SELECT COUNT(*) INTO count_result
    FROM supplier_inbox_items
    WHERE organization_id = p_organization_id;
  ELSE
    SELECT COUNT(*) INTO count_result
    FROM supplier_inbox_items
    WHERE organization_id = p_organization_id
      AND status = p_status;
  END IF;
  
  RETURN count_result;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- WEBHOOK LOGS TABLE (for debugging)
-- ============================================
CREATE TABLE IF NOT EXISTS webhook_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  webhook_type TEXT NOT NULL, -- 'resend_inbound', etc.
  payload JSONB,
  error_message TEXT,
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL,
  success BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_webhook_logs_type ON webhook_logs(webhook_type);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_processed_at ON webhook_logs(processed_at DESC);

-- ============================================
-- EMAIL RATE LIMITING TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS email_rate_limits (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID REFERENCES organizations ON DELETE CASCADE NOT NULL,
  sender_email TEXT NOT NULL,
  window_start TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL,
  email_count INTEGER DEFAULT 1,
  UNIQUE(organization_id, sender_email, window_start)
);

CREATE INDEX IF NOT EXISTS idx_email_rate_limits_lookup 
  ON email_rate_limits(organization_id, sender_email, window_start);

-- Function to check and update rate limit
CREATE OR REPLACE FUNCTION check_email_rate_limit(
  p_organization_id UUID,
  p_sender_email TEXT,
  p_max_per_hour INTEGER DEFAULT 20
)
RETURNS BOOLEAN AS $$
DECLARE
  current_hour TIMESTAMP WITH TIME ZONE;
  current_count INTEGER;
BEGIN
  -- Get the start of current hour
  current_hour := date_trunc('hour', NOW());
  
  -- Try to insert or update the rate limit record
  INSERT INTO email_rate_limits (organization_id, sender_email, window_start, email_count)
  VALUES (p_organization_id, p_sender_email, current_hour, 1)
  ON CONFLICT (organization_id, sender_email, window_start)
  DO UPDATE SET email_count = email_rate_limits.email_count + 1
  RETURNING email_count INTO current_count;
  
  -- Check if limit exceeded
  RETURN current_count <= p_max_per_hour;
END;
$$ LANGUAGE plpgsql;

-- Cleanup old rate limit records (run periodically)
CREATE OR REPLACE FUNCTION cleanup_old_rate_limits()
RETURNS void AS $$
BEGIN
  DELETE FROM email_rate_limits
  WHERE window_start < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================
COMMENT ON TABLE supplier_inbox_items IS 'Stores supplier invoices received via email for processing';
COMMENT ON COLUMN supplier_inbox_items.file_hash IS 'SHA-256 hash for duplicate detection within 90 days';
COMMENT ON COLUMN supplier_inbox_items.status IS 'Workflow status: new (unprocessed), processed (linked to invoice), archived, duplicate, no_attachment';
COMMENT ON COLUMN supplier_inbox_items.is_duplicate_of IS 'Reference to original item if this is a detected duplicate';
COMMENT ON TABLE webhook_logs IS 'Logs for debugging webhook processing failures';
COMMENT ON TABLE email_rate_limits IS 'Rate limiting for inbound emails per sender per organization';
