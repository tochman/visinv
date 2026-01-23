-- Migration: Add Payment Recording (US-020)
-- Enables tracking of payments received against invoices
-- Supports partial payments and payment history

-- Drop existing table if it exists (in case of failed previous migration)
DROP TABLE IF EXISTS payments CASCADE;

-- Create payments table
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  payment_date DATE NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'bank_transfer'
    CHECK (payment_method IN ('bank_transfer', 'swish', 'card', 'cash', 'check', 'other')),
  reference TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX idx_payments_invoice_id ON payments(invoice_id);
CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_payments_organization_id ON payments(organization_id);
CREATE INDEX idx_payments_payment_date ON payments(payment_date);

-- Add updated_at trigger
CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE payments IS 'Records of payments received against invoices';
COMMENT ON COLUMN payments.amount IS 'Payment amount (must be positive)';
COMMENT ON COLUMN payments.payment_date IS 'Date when payment was received';
COMMENT ON COLUMN payments.payment_method IS 'Method used for payment (bank_transfer, swish, card, cash, check, other)';
COMMENT ON COLUMN payments.reference IS 'Payment reference number (e.g., transaction ID, check number)';
COMMENT ON COLUMN payments.notes IS 'Additional notes about the payment';

-- Row Level Security (RLS) Policies
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Users can view payments for their own invoices
CREATE POLICY "Users can view their own payments"
  ON payments FOR SELECT
  USING (
    payments.user_id = auth.uid()
    OR
    payments.organization_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE organization_members.user_id = auth.uid()
    )
  );

-- Users can create payments for their own invoices
CREATE POLICY "Users can create payments for their invoices"
  ON payments FOR INSERT
  WITH CHECK (
    payments.user_id = auth.uid()
    AND
    payments.organization_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE organization_members.user_id = auth.uid()
    )
  );

-- Users can update their own payments
CREATE POLICY "Users can update their own payments"
  ON payments FOR UPDATE
  USING (
    payments.user_id = auth.uid()
    OR
    payments.organization_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE organization_members.user_id = auth.uid()
    )
  );

-- Users can delete their own payments
CREATE POLICY "Users can delete their own payments"
  ON payments FOR DELETE
  USING (
    payments.user_id = auth.uid()
    OR
    payments.organization_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE organization_members.user_id = auth.uid()
    )
  );
