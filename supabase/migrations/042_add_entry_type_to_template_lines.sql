-- Migration: Add entry_type to journal_entry_template_lines
-- This enables "smart" templates that disable the field users shouldn't fill in

-- Add entry_type column to indicate if a line is debit or credit
ALTER TABLE journal_entry_template_lines
ADD COLUMN entry_type VARCHAR(10) DEFAULT NULL;

-- Add check constraint for valid values
ALTER TABLE journal_entry_template_lines
ADD CONSTRAINT check_entry_type CHECK (entry_type IN ('debit', 'credit') OR entry_type IS NULL);

-- Add comment explaining the field
COMMENT ON COLUMN journal_entry_template_lines.entry_type IS 
'Indicates whether this line is a debit or credit line. 
When set, the UI should disable the opposite field (e.g., if entry_type is "debit", 
the credit field should be disabled). NULL means both fields are editable.';
