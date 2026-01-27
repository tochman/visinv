-- Migration: Add Swedish Payment Methods
-- Extends payment_method constraint to include Swedish-specific payment methods:
-- bankgiro, plusgiro, autogiro

-- Drop the existing check constraint
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_payment_method_check;

-- Add new check constraint with Swedish payment methods included
ALTER TABLE payments ADD CONSTRAINT payments_payment_method_check
  CHECK (payment_method IN ('bank_transfer', 'swish', 'card', 'cash', 'check', 'other', 'bankgiro', 'plusgiro', 'autogiro'));

-- Update the comment to reflect the new options
COMMENT ON COLUMN payments.payment_method IS 'Method used for payment (bank_transfer, swish, card, cash, check, other, bankgiro, plusgiro, autogiro)';
