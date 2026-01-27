-- Migration: Create invoice_events table for audit trail
-- US-022-E: Audit Trail for Invoice Lifecycle

-- ============================================
-- INVOICE EVENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS invoice_events (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  invoice_id UUID REFERENCES invoices ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'created',
    'sent',
    'viewed',
    'payment_recorded',
    'status_changed',
    'reminder_sent',
    'credit_created',
    'copied',
    'updated'
  )),
  event_data JSONB,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

-- Index for fast lookup by invoice
CREATE INDEX idx_invoice_events_invoice_id ON invoice_events(invoice_id);

-- Index for sorting by created_at
CREATE INDEX idx_invoice_events_created_at ON invoice_events(created_at);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================
ALTER TABLE invoice_events ENABLE ROW LEVEL SECURITY;

-- Users can view events for invoices they own
CREATE POLICY "Users can view own invoice events"
  ON invoice_events FOR SELECT
  USING (
    invoice_id IN (
      SELECT id FROM invoices WHERE user_id = auth.uid()
    )
  );

-- Users can insert events for their own invoices
CREATE POLICY "Users can insert own invoice events"
  ON invoice_events FOR INSERT
  WITH CHECK (
    invoice_id IN (
      SELECT id FROM invoices WHERE user_id = auth.uid()
    )
  );

-- Users cannot update or delete events (audit trail is immutable)
-- No UPDATE or DELETE policies

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON TABLE invoice_events IS 'Audit trail for invoice lifecycle tracking (US-022-E)';
COMMENT ON COLUMN invoice_events.event_type IS 'Type of event: created, sent, viewed, payment_recorded, status_changed, reminder_sent, credit_created, copied, updated';
COMMENT ON COLUMN invoice_events.event_data IS 'JSON data with event-specific details (amount, old/new status, payment method, etc.)';
COMMENT ON COLUMN invoice_events.description IS 'Human-readable description of the event';
