-- US-074: Add mandatory field constraints for Swedish invoice compliance
-- This migration adds NOT NULL constraints for legally required fields
-- according to Mervärdesskattelagen (2023:200), Bokföringslagen, and Aktiebolagslagen

-- ============================================
-- STEP 1: Update existing NULL values to defaults
-- Must do this BEFORE adding NOT NULL constraints
-- ============================================

-- Organizations: Set defaults for NULL values
UPDATE organizations SET organization_number = '' WHERE organization_number IS NULL;
UPDATE organizations SET vat_number = '' WHERE vat_number IS NULL;
UPDATE organizations SET municipality = '' WHERE municipality IS NULL;
UPDATE organizations SET address = '' WHERE address IS NULL;
UPDATE organizations SET city = '' WHERE city IS NULL;
UPDATE organizations SET postal_code = '' WHERE postal_code IS NULL;
UPDATE organizations SET email = '' WHERE email IS NULL;

-- Clients: Set defaults for NULL values
UPDATE clients SET address = '' WHERE address IS NULL;
UPDATE clients SET city = '' WHERE city IS NULL;
UPDATE clients SET postal_code = '' WHERE postal_code IS NULL;

-- Invoices: Add delivery_date column and set to issue_date
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS delivery_date DATE;
UPDATE invoices SET delivery_date = issue_date WHERE delivery_date IS NULL;

-- Invoice rows: tax_rate should not be NULL
UPDATE invoice_rows SET tax_rate = 25.00 WHERE tax_rate IS NULL;

-- ============================================
-- STEP 2: Add NOT NULL constraints to ORGANIZATIONS
-- Required by Aktiebolagslagen and Mervärdesskattelagen
-- ============================================

-- Name is already NOT NULL in migration 007
-- organization_number (required by Aktiebolagslagen 2:5)
ALTER TABLE organizations ALTER COLUMN organization_number SET NOT NULL;

-- vat_number (required by Mervärdesskattelagen 11:1)
ALTER TABLE organizations ALTER COLUMN vat_number SET NOT NULL;

-- municipality (required by Aktiebolagslagen 2:5 - kommun där säte finns)
ALTER TABLE organizations ALTER COLUMN municipality SET NOT NULL;

-- Address fields (required by Mervärdesskattelagen for seller info)
ALTER TABLE organizations ALTER COLUMN address SET NOT NULL;
ALTER TABLE organizations ALTER COLUMN city SET NOT NULL;
ALTER TABLE organizations ALTER COLUMN postal_code SET NOT NULL;

-- Email (required for contact - practical necessity)
ALTER TABLE organizations ALTER COLUMN email SET NOT NULL;

-- ============================================
-- STEP 3: Add NOT NULL constraints to CLIENTS
-- Required by Mervärdesskattelagen for buyer info
-- ============================================

-- Name is already NOT NULL
-- Address fields (required by Mervärdesskattelagen for buyer address)
ALTER TABLE clients ALTER COLUMN address SET NOT NULL;
ALTER TABLE clients ALTER COLUMN city SET NOT NULL;
ALTER TABLE clients ALTER COLUMN postal_code SET NOT NULL;
-- country already has DEFAULT 'Sweden' and should not be NULL in practice

-- ============================================
-- STEP 4: Add NOT NULL constraints to INVOICES
-- Required by Mervärdesskattelagen and Bokföringslagen
-- ============================================

-- invoice_number is already NOT NULL and UNIQUE
-- issue_date is already NOT NULL (fakturadatum)
-- due_date is already NOT NULL (förfallodatum)

-- delivery_date (datum då varorna såldes eller tjänsterna utfördes)
ALTER TABLE invoices ALTER COLUMN delivery_date SET NOT NULL;

-- ============================================
-- STEP 5: Add NOT NULL and CHECK constraints to INVOICE_ROWS
-- Required by Mervärdesskattelagen for invoice items
-- ============================================

-- description is already NOT NULL (specifikation)
-- quantity is already NOT NULL
-- unit_price is already NOT NULL (pris exklusive moms)

-- tax_rate must not be NULL (momssats is mandatory)
ALTER TABLE invoice_rows ALTER COLUMN tax_rate SET NOT NULL;

-- Add check constraint: quantity must be greater than 0
ALTER TABLE invoice_rows ADD CONSTRAINT invoice_rows_quantity_positive 
  CHECK (quantity > 0);

-- ============================================
-- STEP 6: Add validation helper function
-- ============================================

-- Function to validate invoice completeness before sending
CREATE OR REPLACE FUNCTION validate_invoice_compliance(invoice_uuid UUID)
RETURNS TABLE (
  is_valid BOOLEAN,
  missing_fields TEXT[]
) AS $$
DECLARE
  missing TEXT[] := ARRAY[]::TEXT[];
  org_record RECORD;
  client_record RECORD;
  invoice_record RECORD;
  row_count INTEGER;
BEGIN
  -- Get invoice
  SELECT * INTO invoice_record FROM invoices WHERE id = invoice_uuid;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, ARRAY['Invoice not found']::TEXT[];
    RETURN;
  END IF;
  
  -- Check organization (if organization_id exists)
  IF invoice_record.organization_id IS NOT NULL THEN
    SELECT * INTO org_record FROM organizations WHERE id = invoice_record.organization_id;
    IF org_record.organization_number = '' THEN missing := array_append(missing, 'organization.organization_number'); END IF;
    IF org_record.vat_number = '' THEN missing := array_append(missing, 'organization.vat_number'); END IF;
    IF org_record.municipality = '' THEN missing := array_append(missing, 'organization.municipality'); END IF;
    IF org_record.address = '' THEN missing := array_append(missing, 'organization.address'); END IF;
    IF org_record.city = '' THEN missing := array_append(missing, 'organization.city'); END IF;
    IF org_record.postal_code = '' THEN missing := array_append(missing, 'organization.postal_code'); END IF;
    IF org_record.email = '' THEN missing := array_append(missing, 'organization.email'); END IF;
  END IF;
  
  -- Check client
  SELECT * INTO client_record FROM clients WHERE id = invoice_record.client_id;
  IF client_record.address = '' THEN missing := array_append(missing, 'client.address'); END IF;
  IF client_record.city = '' THEN missing := array_append(missing, 'client.city'); END IF;
  IF client_record.postal_code = '' THEN missing := array_append(missing, 'client.postal_code'); END IF;
  
  -- Check invoice has at least one row
  SELECT COUNT(*) INTO row_count FROM invoice_rows WHERE invoice_id = invoice_uuid;
  IF row_count = 0 THEN missing := array_append(missing, 'invoice.items'); END IF;
  
  -- Return result
  RETURN QUERY SELECT (array_length(missing, 1) IS NULL OR array_length(missing, 1) = 0), missing;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these to verify constraints are in place:
-- 
-- SELECT column_name, is_nullable, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'organizations' 
-- AND column_name IN ('organization_number', 'vat_number', 'municipality', 'address', 'city', 'postal_code', 'email');
--
-- SELECT column_name, is_nullable, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'clients' 
-- AND column_name IN ('name', 'address', 'city', 'postal_code');
--
-- SELECT column_name, is_nullable, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'invoices' 
-- AND column_name IN ('invoice_number', 'issue_date', 'due_date', 'delivery_date');
--
-- SELECT column_name, is_nullable, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'invoice_rows' 
-- AND column_name IN ('description', 'quantity', 'unit_price', 'tax_rate');
