-- Migration: Add function to get account balance and transaction count
-- Created: 2026-01-30

-- Function to get account balance and transaction count efficiently
CREATE OR REPLACE FUNCTION get_account_balance_and_count(
  p_account_id UUID,
  p_organization_id UUID,
  p_end_date DATE
)
RETURNS TABLE (
  account_id UUID,
  account_number TEXT,
  account_name TEXT,
  account_class TEXT,
  balance DECIMAL(15,2),
  debit_total DECIMAL(15,2),
  credit_total DECIMAL(15,2),
  transaction_count BIGINT,
  as_of_date DATE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH account_info AS (
    SELECT 
      a.id,
      a.account_number,
      a.name,
      a.account_class
    FROM accounts a
    WHERE a.id = p_account_id
      AND a.organization_id = p_organization_id
  ),
  transaction_totals AS (
    SELECT 
      COALESCE(SUM(jel.debit_amount), 0) as debit_total,
      COALESCE(SUM(jel.credit_amount), 0) as credit_total,
      COUNT(*) as transaction_count
    FROM journal_entry_lines jel
    JOIN journal_entries je ON jel.journal_entry_id = je.id
    WHERE jel.account_id = p_account_id
      AND je.organization_id = p_organization_id
      AND je.status = 'posted'
      AND je.entry_date <= p_end_date
  )
  SELECT 
    ai.id as account_id,
    ai.account_number,
    ai.name as account_name,
    ai.account_class,
    CASE 
      WHEN ai.account_class IN ('assets', 'expenses') THEN 
        tt.debit_total - tt.credit_total
      ELSE 
        tt.credit_total - tt.debit_total
    END as balance,
    tt.debit_total,
    tt.credit_total,
    tt.transaction_count,
    p_end_date as as_of_date
  FROM account_info ai
  CROSS JOIN transaction_totals tt;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_account_balance_and_count(UUID, UUID, DATE) TO authenticated;

-- Comment
COMMENT ON FUNCTION get_account_balance_and_count IS 'Get account balance and transaction count for a specific account up to a given date';