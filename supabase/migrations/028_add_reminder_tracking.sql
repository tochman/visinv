-- Migration: Add Overdue Invoice Alert Tracking (US-026-A)
-- Enables tracking of payment reminder communications

-- Add reminder_sent_at column to invoices table
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ;

-- Add reminder_count to track number of reminders sent
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS reminder_count INTEGER NOT NULL DEFAULT 0;

-- Add index for querying overdue invoices
CREATE INDEX IF NOT EXISTS idx_invoices_overdue ON invoices(due_date, status) 
WHERE status = 'sent';

-- Add comments for documentation
COMMENT ON COLUMN invoices.reminder_sent_at IS 'Timestamp when the last payment reminder was sent to the client';
COMMENT ON COLUMN invoices.reminder_count IS 'Number of payment reminders sent for this invoice';
