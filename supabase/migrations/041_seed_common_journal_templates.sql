-- Migration: Seed common journal entry templates
-- Creates system-wide journal entry templates for common Swedish business transactions
-- These templates use BAS (Bas Kontoplanen) standard account numbers

-- Note: These are organization-specific templates, so they need to be created
-- for each organization. This migration creates a function that can be called
-- to seed templates for an organization.

-- Function to create common templates for an organization
CREATE OR REPLACE FUNCTION seed_journal_entry_templates(p_organization_id UUID, p_created_by UUID DEFAULT NULL)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_template_id UUID;
  v_templates_created INTEGER := 0;
  v_account_id UUID;
BEGIN
  -- ========================================
  -- SALARY TEMPLATES (Lönetransaktioner)
  -- ========================================

  -- Template 1: Monthly Salary Payment (Månadslön)
  -- Typical flow: Gross salary -> Tax deduction -> Net payment
  IF NOT EXISTS (
    SELECT 1 FROM journal_entry_templates 
    WHERE organization_id = p_organization_id AND name = 'Månadslön - Utbetalning'
  ) THEN
    INSERT INTO journal_entry_templates (organization_id, name, description, default_description, created_by)
    VALUES (
      p_organization_id,
      'Månadslön - Utbetalning',
      'Bokföring av månadslön med skatteavdrag och arbetsgivaravgifter. Bruttolön debiteras på 7010, skatt krediteras på 2710, nettolön krediteras på 2820.',
      'Lön månad [MÅNAD]',
      p_created_by
    )
    RETURNING id INTO v_template_id;

    -- Line 1: Bruttolön (Gross salary) - Debit 7010
    SELECT id INTO v_account_id FROM accounts 
    WHERE organization_id = p_organization_id AND account_number = '7010' LIMIT 1;
    IF v_account_id IS NOT NULL THEN
      INSERT INTO journal_entry_template_lines (template_id, account_id, debit_amount, credit_amount, description, line_order)
      VALUES (v_template_id, v_account_id, 0, 0, 'Bruttolön', 0);
    END IF;

    -- Line 2: Preliminärskatt (Tax deduction) - Credit 2710
    SELECT id INTO v_account_id FROM accounts 
    WHERE organization_id = p_organization_id AND account_number = '2710' LIMIT 1;
    IF v_account_id IS NOT NULL THEN
      INSERT INTO journal_entry_template_lines (template_id, account_id, debit_amount, credit_amount, description, line_order)
      VALUES (v_template_id, v_account_id, 0, 0, 'Preliminärskatt', 1);
    END IF;

    -- Line 3: Nettolön skuld (Net salary payable) - Credit 2820
    SELECT id INTO v_account_id FROM accounts 
    WHERE organization_id = p_organization_id AND account_number = '2820' LIMIT 1;
    IF v_account_id IS NOT NULL THEN
      INSERT INTO journal_entry_template_lines (template_id, account_id, debit_amount, credit_amount, description, line_order)
      VALUES (v_template_id, v_account_id, 0, 0, 'Nettolön att betala', 2);
    END IF;

    v_templates_created := v_templates_created + 1;
  END IF;

  -- Template 2: Arbetsgivaravgifter (Employer contributions)
  IF NOT EXISTS (
    SELECT 1 FROM journal_entry_templates 
    WHERE organization_id = p_organization_id AND name = 'Arbetsgivaravgifter'
  ) THEN
    INSERT INTO journal_entry_templates (organization_id, name, description, default_description, created_by)
    VALUES (
      p_organization_id,
      'Arbetsgivaravgifter',
      'Bokföring av lagstadgade arbetsgivaravgifter (31,42% av bruttolön). Kostnad debiteras på 7510, skuld krediteras på 2730.',
      'Arbetsgivaravgifter [MÅNAD]',
      p_created_by
    )
    RETURNING id INTO v_template_id;

    -- Line 1: Arbetsgivaravgifter kostnad - Debit 7510
    SELECT id INTO v_account_id FROM accounts 
    WHERE organization_id = p_organization_id AND account_number = '7510' LIMIT 1;
    IF v_account_id IS NOT NULL THEN
      INSERT INTO journal_entry_template_lines (template_id, account_id, debit_amount, credit_amount, description, line_order)
      VALUES (v_template_id, v_account_id, 0, 0, 'Arbetsgivaravgifter', 0);
    END IF;

    -- Line 2: Arbetsgivaravgifter skuld - Credit 2730
    SELECT id INTO v_account_id FROM accounts 
    WHERE organization_id = p_organization_id AND account_number = '2730' LIMIT 1;
    IF v_account_id IS NOT NULL THEN
      INSERT INTO journal_entry_template_lines (template_id, account_id, debit_amount, credit_amount, description, line_order)
      VALUES (v_template_id, v_account_id, 0, 0, 'Skuld arbetsgivaravgifter', 1);
    END IF;

    v_templates_created := v_templates_created + 1;
  END IF;

  -- Template 3: Salary Payment from Bank (Utbetalning av nettolön)
  IF NOT EXISTS (
    SELECT 1 FROM journal_entry_templates 
    WHERE organization_id = p_organization_id AND name = 'Löneutbetalning från bank'
  ) THEN
    INSERT INTO journal_entry_templates (organization_id, name, description, default_description, created_by)
    VALUES (
      p_organization_id,
      'Löneutbetalning från bank',
      'Utbetalning av nettolön från bankkonto. Löneskuld debiteras på 2820, bankkonto krediteras på 1930.',
      'Löneutbetalning [MÅNAD]',
      p_created_by
    )
    RETURNING id INTO v_template_id;

    -- Line 1: Löneskuld - Debit 2820
    SELECT id INTO v_account_id FROM accounts 
    WHERE organization_id = p_organization_id AND account_number = '2820' LIMIT 1;
    IF v_account_id IS NOT NULL THEN
      INSERT INTO journal_entry_template_lines (template_id, account_id, debit_amount, credit_amount, description, line_order)
      VALUES (v_template_id, v_account_id, 0, 0, 'Löneskuld', 0);
    END IF;

    -- Line 2: Bank - Credit 1930
    SELECT id INTO v_account_id FROM accounts 
    WHERE organization_id = p_organization_id AND account_number = '1930' LIMIT 1;
    IF v_account_id IS NOT NULL THEN
      INSERT INTO journal_entry_template_lines (template_id, account_id, debit_amount, credit_amount, description, line_order)
      VALUES (v_template_id, v_account_id, 0, 0, 'Företagskonto', 1);
    END IF;

    v_templates_created := v_templates_created + 1;
  END IF;

  -- ========================================
  -- PURCHASE TEMPLATES (Inköp)
  -- ========================================

  -- Template 4: Purchase with VAT (Inköp med moms)
  IF NOT EXISTS (
    SELECT 1 FROM journal_entry_templates 
    WHERE organization_id = p_organization_id AND name = 'Inköp med moms 25%'
  ) THEN
    INSERT INTO journal_entry_templates (organization_id, name, description, default_description, created_by)
    VALUES (
      p_organization_id,
      'Inköp med moms 25%',
      'Inköp av varor/tjänster med 25% moms. Inköp debiteras på 4010, ingående moms debiteras på 2640, leverantörsskuld krediteras på 2440.',
      'Inköp [LEVERANTÖR]',
      p_created_by
    )
    RETURNING id INTO v_template_id;

    -- Line 1: Inköp varor - Debit 4010
    SELECT id INTO v_account_id FROM accounts 
    WHERE organization_id = p_organization_id AND account_number = '4010' LIMIT 1;
    IF v_account_id IS NOT NULL THEN
      INSERT INTO journal_entry_template_lines (template_id, account_id, debit_amount, credit_amount, description, line_order, vat_code)
      VALUES (v_template_id, v_account_id, 0, 0, 'Inköp varor', 0, '25');
    END IF;

    -- Line 2: Ingående moms 25% - Debit 2640
    SELECT id INTO v_account_id FROM accounts 
    WHERE organization_id = p_organization_id AND account_number = '2640' LIMIT 1;
    IF v_account_id IS NOT NULL THEN
      INSERT INTO journal_entry_template_lines (template_id, account_id, debit_amount, credit_amount, description, line_order)
      VALUES (v_template_id, v_account_id, 0, 0, 'Ingående moms 25%', 1);
    END IF;

    -- Line 3: Leverantörsskuld - Credit 2440
    SELECT id INTO v_account_id FROM accounts 
    WHERE organization_id = p_organization_id AND account_number = '2440' LIMIT 1;
    IF v_account_id IS NOT NULL THEN
      INSERT INTO journal_entry_template_lines (template_id, account_id, debit_amount, credit_amount, description, line_order)
      VALUES (v_template_id, v_account_id, 0, 0, 'Leverantörsskuld', 2);
    END IF;

    v_templates_created := v_templates_created + 1;
  END IF;

  -- Template 5: Supplier Payment (Leverantörsbetalning)
  IF NOT EXISTS (
    SELECT 1 FROM journal_entry_templates 
    WHERE organization_id = p_organization_id AND name = 'Leverantörsbetalning'
  ) THEN
    INSERT INTO journal_entry_templates (organization_id, name, description, default_description, created_by)
    VALUES (
      p_organization_id,
      'Leverantörsbetalning',
      'Betalning till leverantör från bankkonto. Leverantörsskuld debiteras på 2440, bankkonto krediteras på 1930.',
      'Betalning [LEVERANTÖR]',
      p_created_by
    )
    RETURNING id INTO v_template_id;

    -- Line 1: Leverantörsskuld - Debit 2440
    SELECT id INTO v_account_id FROM accounts 
    WHERE organization_id = p_organization_id AND account_number = '2440' LIMIT 1;
    IF v_account_id IS NOT NULL THEN
      INSERT INTO journal_entry_template_lines (template_id, account_id, debit_amount, credit_amount, description, line_order)
      VALUES (v_template_id, v_account_id, 0, 0, 'Leverantörsskuld', 0);
    END IF;

    -- Line 2: Bank - Credit 1930
    SELECT id INTO v_account_id FROM accounts 
    WHERE organization_id = p_organization_id AND account_number = '1930' LIMIT 1;
    IF v_account_id IS NOT NULL THEN
      INSERT INTO journal_entry_template_lines (template_id, account_id, debit_amount, credit_amount, description, line_order)
      VALUES (v_template_id, v_account_id, 0, 0, 'Företagskonto', 1);
    END IF;

    v_templates_created := v_templates_created + 1;
  END IF;

  -- ========================================
  -- RENT & PREMISES (Hyra & Lokaler)
  -- ========================================

  -- Template 6: Monthly Rent (Månadshyra)
  IF NOT EXISTS (
    SELECT 1 FROM journal_entry_templates 
    WHERE organization_id = p_organization_id AND name = 'Lokalhyra'
  ) THEN
    INSERT INTO journal_entry_templates (organization_id, name, description, default_description, created_by)
    VALUES (
      p_organization_id,
      'Lokalhyra',
      'Månadshyra för kontor/lokal med moms. Hyreskostnad debiteras på 5010, ingående moms debiteras på 2640, leverantörsskuld krediteras på 2440.',
      'Hyra [MÅNAD]',
      p_created_by
    )
    RETURNING id INTO v_template_id;

    -- Line 1: Lokalhyra - Debit 5010
    SELECT id INTO v_account_id FROM accounts 
    WHERE organization_id = p_organization_id AND account_number = '5010' LIMIT 1;
    IF v_account_id IS NOT NULL THEN
      INSERT INTO journal_entry_template_lines (template_id, account_id, debit_amount, credit_amount, description, line_order, vat_code)
      VALUES (v_template_id, v_account_id, 0, 0, 'Lokalhyra', 0, '25');
    END IF;

    -- Line 2: Ingående moms - Debit 2640
    SELECT id INTO v_account_id FROM accounts 
    WHERE organization_id = p_organization_id AND account_number = '2640' LIMIT 1;
    IF v_account_id IS NOT NULL THEN
      INSERT INTO journal_entry_template_lines (template_id, account_id, debit_amount, credit_amount, description, line_order)
      VALUES (v_template_id, v_account_id, 0, 0, 'Ingående moms 25%', 1);
    END IF;

    -- Line 3: Leverantörsskuld - Credit 2440
    SELECT id INTO v_account_id FROM accounts 
    WHERE organization_id = p_organization_id AND account_number = '2440' LIMIT 1;
    IF v_account_id IS NOT NULL THEN
      INSERT INTO journal_entry_template_lines (template_id, account_id, debit_amount, credit_amount, description, line_order)
      VALUES (v_template_id, v_account_id, 0, 0, 'Leverantörsskuld', 2);
    END IF;

    v_templates_created := v_templates_created + 1;
  END IF;

  -- ========================================
  -- UTILITIES (El, Värme, Vatten)
  -- ========================================

  -- Template 7: Electricity (El)
  IF NOT EXISTS (
    SELECT 1 FROM journal_entry_templates 
    WHERE organization_id = p_organization_id AND name = 'Elkostnad'
  ) THEN
    INSERT INTO journal_entry_templates (organization_id, name, description, default_description, created_by)
    VALUES (
      p_organization_id,
      'Elkostnad',
      'Månadsfaktura för el med moms. Elkostnad debiteras på 5310, ingående moms debiteras på 2640, leverantörsskuld krediteras på 2440.',
      'El [MÅNAD]',
      p_created_by
    )
    RETURNING id INTO v_template_id;

    -- Line 1: El - Debit 5310
    SELECT id INTO v_account_id FROM accounts 
    WHERE organization_id = p_organization_id AND account_number = '5310' LIMIT 1;
    IF v_account_id IS NOT NULL THEN
      INSERT INTO journal_entry_template_lines (template_id, account_id, debit_amount, credit_amount, description, line_order, vat_code)
      VALUES (v_template_id, v_account_id, 0, 0, 'El', 0, '25');
    END IF;

    -- Line 2: Ingående moms - Debit 2640
    SELECT id INTO v_account_id FROM accounts 
    WHERE organization_id = p_organization_id AND account_number = '2640' LIMIT 1;
    IF v_account_id IS NOT NULL THEN
      INSERT INTO journal_entry_template_lines (template_id, account_id, debit_amount, credit_amount, description, line_order)
      VALUES (v_template_id, v_account_id, 0, 0, 'Ingående moms 25%', 1);
    END IF;

    -- Line 3: Leverantörsskuld - Credit 2440
    SELECT id INTO v_account_id FROM accounts 
    WHERE organization_id = p_organization_id AND account_number = '2440' LIMIT 1;
    IF v_account_id IS NOT NULL THEN
      INSERT INTO journal_entry_template_lines (template_id, account_id, debit_amount, credit_amount, description, line_order)
      VALUES (v_template_id, v_account_id, 0, 0, 'Leverantörsskuld', 2);
    END IF;

    v_templates_created := v_templates_created + 1;
  END IF;

  -- Template 8: Heating (Värme)
  IF NOT EXISTS (
    SELECT 1 FROM journal_entry_templates 
    WHERE organization_id = p_organization_id AND name = 'Värmekostnad'
  ) THEN
    INSERT INTO journal_entry_templates (organization_id, name, description, default_description, created_by)
    VALUES (
      p_organization_id,
      'Värmekostnad',
      'Månadsfaktura för värme med moms. Värmekostnad debiteras på 5320, ingående moms debiteras på 2640, leverantörsskuld krediteras på 2440.',
      'Värme [MÅNAD]',
      p_created_by
    )
    RETURNING id INTO v_template_id;

    -- Line 1: Värme - Debit 5320
    SELECT id INTO v_account_id FROM accounts 
    WHERE organization_id = p_organization_id AND account_number = '5320' LIMIT 1;
    IF v_account_id IS NOT NULL THEN
      INSERT INTO journal_entry_template_lines (template_id, account_id, debit_amount, credit_amount, description, line_order, vat_code)
      VALUES (v_template_id, v_account_id, 0, 0, 'Värme', 0, '25');
    END IF;

    -- Line 2: Ingående moms - Debit 2640
    SELECT id INTO v_account_id FROM accounts 
    WHERE organization_id = p_organization_id AND account_number = '2640' LIMIT 1;
    IF v_account_id IS NOT NULL THEN
      INSERT INTO journal_entry_template_lines (template_id, account_id, debit_amount, credit_amount, description, line_order)
      VALUES (v_template_id, v_account_id, 0, 0, 'Ingående moms 25%', 1);
    END IF;

    -- Line 3: Leverantörsskuld - Credit 2440
    SELECT id INTO v_account_id FROM accounts 
    WHERE organization_id = p_organization_id AND account_number = '2440' LIMIT 1;
    IF v_account_id IS NOT NULL THEN
      INSERT INTO journal_entry_template_lines (template_id, account_id, debit_amount, credit_amount, description, line_order)
      VALUES (v_template_id, v_account_id, 0, 0, 'Leverantörsskuld', 2);
    END IF;

    v_templates_created := v_templates_created + 1;
  END IF;

  -- ========================================
  -- TELECOMMUNICATIONS (Telefon, Internet)
  -- ========================================

  -- Template 9: Phone & Internet (Telefon & Internet)
  IF NOT EXISTS (
    SELECT 1 FROM journal_entry_templates 
    WHERE organization_id = p_organization_id AND name = 'Telefon & Internet'
  ) THEN
    INSERT INTO journal_entry_templates (organization_id, name, description, default_description, created_by)
    VALUES (
      p_organization_id,
      'Telefon & Internet',
      'Månadsfaktura för telefon och internet med moms. Telekostnad debiteras på 6210, ingående moms debiteras på 2640, leverantörsskuld krediteras på 2440.',
      'Telefon/Internet [MÅNAD]',
      p_created_by
    )
    RETURNING id INTO v_template_id;

    -- Line 1: Telekommunikation - Debit 6210
    SELECT id INTO v_account_id FROM accounts 
    WHERE organization_id = p_organization_id AND account_number = '6210' LIMIT 1;
    IF v_account_id IS NOT NULL THEN
      INSERT INTO journal_entry_template_lines (template_id, account_id, debit_amount, credit_amount, description, line_order, vat_code)
      VALUES (v_template_id, v_account_id, 0, 0, 'Telefon & Internet', 0, '25');
    END IF;

    -- Line 2: Ingående moms - Debit 2640
    SELECT id INTO v_account_id FROM accounts 
    WHERE organization_id = p_organization_id AND account_number = '2640' LIMIT 1;
    IF v_account_id IS NOT NULL THEN
      INSERT INTO journal_entry_template_lines (template_id, account_id, debit_amount, credit_amount, description, line_order)
      VALUES (v_template_id, v_account_id, 0, 0, 'Ingående moms 25%', 1);
    END IF;

    -- Line 3: Leverantörsskuld - Credit 2440
    SELECT id INTO v_account_id FROM accounts 
    WHERE organization_id = p_organization_id AND account_number = '2440' LIMIT 1;
    IF v_account_id IS NOT NULL THEN
      INSERT INTO journal_entry_template_lines (template_id, account_id, debit_amount, credit_amount, description, line_order)
      VALUES (v_template_id, v_account_id, 0, 0, 'Leverantörsskuld', 2);
    END IF;

    v_templates_created := v_templates_created + 1;
  END IF;

  -- ========================================
  -- SALES & REVENUE (Försäljning)
  -- ========================================

  -- Template 10: Customer Invoice (Kundfaktura)
  IF NOT EXISTS (
    SELECT 1 FROM journal_entry_templates 
    WHERE organization_id = p_organization_id AND name = 'Kundfaktura med moms 25%'
  ) THEN
    INSERT INTO journal_entry_templates (organization_id, name, description, default_description, created_by)
    VALUES (
      p_organization_id,
      'Kundfaktura med moms 25%',
      'Bokföring av kundfaktura med 25% moms. Kundfordran debiteras på 1510, försäljning krediteras på 3010, utgående moms krediteras på 2610.',
      'Faktura [KUND]',
      p_created_by
    )
    RETURNING id INTO v_template_id;

    -- Line 1: Kundfordran - Debit 1510
    SELECT id INTO v_account_id FROM accounts 
    WHERE organization_id = p_organization_id AND account_number = '1510' LIMIT 1;
    IF v_account_id IS NOT NULL THEN
      INSERT INTO journal_entry_template_lines (template_id, account_id, debit_amount, credit_amount, description, line_order)
      VALUES (v_template_id, v_account_id, 0, 0, 'Kundfordran', 0);
    END IF;

    -- Line 2: Försäljning - Credit 3010
    SELECT id INTO v_account_id FROM accounts 
    WHERE organization_id = p_organization_id AND account_number = '3010' LIMIT 1;
    IF v_account_id IS NOT NULL THEN
      INSERT INTO journal_entry_template_lines (template_id, account_id, debit_amount, credit_amount, description, line_order, vat_code)
      VALUES (v_template_id, v_account_id, 0, 0, 'Försäljning varor/tjänster', 1, '25');
    END IF;

    -- Line 3: Utgående moms - Credit 2610
    SELECT id INTO v_account_id FROM accounts 
    WHERE organization_id = p_organization_id AND account_number = '2610' LIMIT 1;
    IF v_account_id IS NOT NULL THEN
      INSERT INTO journal_entry_template_lines (template_id, account_id, debit_amount, credit_amount, description, line_order)
      VALUES (v_template_id, v_account_id, 0, 0, 'Utgående moms 25%', 2);
    END IF;

    v_templates_created := v_templates_created + 1;
  END IF;

  -- Template 11: Customer Payment (Kundbetalning)
  IF NOT EXISTS (
    SELECT 1 FROM journal_entry_templates 
    WHERE organization_id = p_organization_id AND name = 'Kundbetalning'
  ) THEN
    INSERT INTO journal_entry_templates (organization_id, name, description, default_description, created_by)
    VALUES (
      p_organization_id,
      'Kundbetalning',
      'Inbetalning från kund till bankkonto. Bankkonto debiteras på 1930, kundfordran krediteras på 1510.',
      'Betalning från [KUND]',
      p_created_by
    )
    RETURNING id INTO v_template_id;

    -- Line 1: Bank - Debit 1930
    SELECT id INTO v_account_id FROM accounts 
    WHERE organization_id = p_organization_id AND account_number = '1930' LIMIT 1;
    IF v_account_id IS NOT NULL THEN
      INSERT INTO journal_entry_template_lines (template_id, account_id, debit_amount, credit_amount, description, line_order)
      VALUES (v_template_id, v_account_id, 0, 0, 'Företagskonto', 0);
    END IF;

    -- Line 2: Kundfordran - Credit 1510
    SELECT id INTO v_account_id FROM accounts 
    WHERE organization_id = p_organization_id AND account_number = '1510' LIMIT 1;
    IF v_account_id IS NOT NULL THEN
      INSERT INTO journal_entry_template_lines (template_id, account_id, debit_amount, credit_amount, description, line_order)
      VALUES (v_template_id, v_account_id, 0, 0, 'Kundfordran', 1);
    END IF;

    v_templates_created := v_templates_created + 1;
  END IF;

  -- ========================================
  -- TAX PAYMENTS (Skattebetalningar)
  -- ========================================

  -- Template 12: VAT Payment (Momsbetalning)
  IF NOT EXISTS (
    SELECT 1 FROM journal_entry_templates 
    WHERE organization_id = p_organization_id AND name = 'Momsbetalning till Skatteverket'
  ) THEN
    INSERT INTO journal_entry_templates (organization_id, name, description, default_description, created_by)
    VALUES (
      p_organization_id,
      'Momsbetalning till Skatteverket',
      'Betalning av moms till Skatteverket. Momsskuld debiteras på 2650, bankkonto krediteras på 1930.',
      'Momsbetalning period [PERIOD]',
      p_created_by
    )
    RETURNING id INTO v_template_id;

    -- Line 1: Momsskuld - Debit 2650
    SELECT id INTO v_account_id FROM accounts 
    WHERE organization_id = p_organization_id AND account_number = '2650' LIMIT 1;
    IF v_account_id IS NOT NULL THEN
      INSERT INTO journal_entry_template_lines (template_id, account_id, debit_amount, credit_amount, description, line_order)
      VALUES (v_template_id, v_account_id, 0, 0, 'Redovisad moms', 0);
    END IF;

    -- Line 2: Bank - Credit 1930
    SELECT id INTO v_account_id FROM accounts 
    WHERE organization_id = p_organization_id AND account_number = '1930' LIMIT 1;
    IF v_account_id IS NOT NULL THEN
      INSERT INTO journal_entry_template_lines (template_id, account_id, debit_amount, credit_amount, description, line_order)
      VALUES (v_template_id, v_account_id, 0, 0, 'Företagskonto', 1);
    END IF;

    v_templates_created := v_templates_created + 1;
  END IF;

  -- Template 13: Tax & Employer Contribution Payment (Skatt & arbetsgivaravgift)
  IF NOT EXISTS (
    SELECT 1 FROM journal_entry_templates 
    WHERE organization_id = p_organization_id AND name = 'Skattebetalning (skatt & AG-avgift)'
  ) THEN
    INSERT INTO journal_entry_templates (organization_id, name, description, default_description, created_by)
    VALUES (
      p_organization_id,
      'Skattebetalning (skatt & AG-avgift)',
      'Betalning av preliminärskatt och arbetsgivaravgifter till Skatteverket. Skatteskuld 2710 och AG-avgift 2730 debiteras, bank 1930 krediteras.',
      'Skattebetalning [MÅNAD]',
      p_created_by
    )
    RETURNING id INTO v_template_id;

    -- Line 1: Personalskatt - Debit 2710
    SELECT id INTO v_account_id FROM accounts 
    WHERE organization_id = p_organization_id AND account_number = '2710' LIMIT 1;
    IF v_account_id IS NOT NULL THEN
      INSERT INTO journal_entry_template_lines (template_id, account_id, debit_amount, credit_amount, description, line_order)
      VALUES (v_template_id, v_account_id, 0, 0, 'Personalskatt', 0);
    END IF;

    -- Line 2: Arbetsgivaravgifter - Debit 2730
    SELECT id INTO v_account_id FROM accounts 
    WHERE organization_id = p_organization_id AND account_number = '2730' LIMIT 1;
    IF v_account_id IS NOT NULL THEN
      INSERT INTO journal_entry_template_lines (template_id, account_id, debit_amount, credit_amount, description, line_order)
      VALUES (v_template_id, v_account_id, 0, 0, 'Arbetsgivaravgifter', 1);
    END IF;

    -- Line 3: Bank - Credit 1930
    SELECT id INTO v_account_id FROM accounts 
    WHERE organization_id = p_organization_id AND account_number = '1930' LIMIT 1;
    IF v_account_id IS NOT NULL THEN
      INSERT INTO journal_entry_template_lines (template_id, account_id, debit_amount, credit_amount, description, line_order)
      VALUES (v_template_id, v_account_id, 0, 0, 'Företagskonto', 2);
    END IF;

    v_templates_created := v_templates_created + 1;
  END IF;

  -- ========================================
  -- OFFICE & ADMIN (Kontorskostnader)
  -- ========================================

  -- Template 14: Office Supplies (Kontorsmaterial)
  IF NOT EXISTS (
    SELECT 1 FROM journal_entry_templates 
    WHERE organization_id = p_organization_id AND name = 'Kontorsmaterial'
  ) THEN
    INSERT INTO journal_entry_templates (organization_id, name, description, default_description, created_by)
    VALUES (
      p_organization_id,
      'Kontorsmaterial',
      'Inköp av kontorsmaterial med moms. Kontorsmaterial debiteras på 6110, ingående moms på 2640, leverantörsskuld krediteras på 2440.',
      'Kontorsmaterial',
      p_created_by
    )
    RETURNING id INTO v_template_id;

    -- Line 1: Kontorsmaterial - Debit 6110
    SELECT id INTO v_account_id FROM accounts 
    WHERE organization_id = p_organization_id AND account_number = '6110' LIMIT 1;
    IF v_account_id IS NOT NULL THEN
      INSERT INTO journal_entry_template_lines (template_id, account_id, debit_amount, credit_amount, description, line_order, vat_code)
      VALUES (v_template_id, v_account_id, 0, 0, 'Kontorsmaterial', 0, '25');
    END IF;

    -- Line 2: Ingående moms - Debit 2640
    SELECT id INTO v_account_id FROM accounts 
    WHERE organization_id = p_organization_id AND account_number = '2640' LIMIT 1;
    IF v_account_id IS NOT NULL THEN
      INSERT INTO journal_entry_template_lines (template_id, account_id, debit_amount, credit_amount, description, line_order)
      VALUES (v_template_id, v_account_id, 0, 0, 'Ingående moms 25%', 1);
    END IF;

    -- Line 3: Leverantörsskuld - Credit 2440
    SELECT id INTO v_account_id FROM accounts 
    WHERE organization_id = p_organization_id AND account_number = '2440' LIMIT 1;
    IF v_account_id IS NOT NULL THEN
      INSERT INTO journal_entry_template_lines (template_id, account_id, debit_amount, credit_amount, description, line_order)
      VALUES (v_template_id, v_account_id, 0, 0, 'Leverantörsskuld', 2);
    END IF;

    v_templates_created := v_templates_created + 1;
  END IF;

  -- Template 15: Bank Fees (Bankavgifter)
  IF NOT EXISTS (
    SELECT 1 FROM journal_entry_templates 
    WHERE organization_id = p_organization_id AND name = 'Bankavgifter'
  ) THEN
    INSERT INTO journal_entry_templates (organization_id, name, description, default_description, created_by)
    VALUES (
      p_organization_id,
      'Bankavgifter',
      'Avgifter från banken (momsfritt). Bankavgifter debiteras på 6570, bank krediteras på 1930.',
      'Bankavgifter [MÅNAD]',
      p_created_by
    )
    RETURNING id INTO v_template_id;

    -- Line 1: Bankavgifter - Debit 6570
    SELECT id INTO v_account_id FROM accounts 
    WHERE organization_id = p_organization_id AND account_number = '6570' LIMIT 1;
    IF v_account_id IS NOT NULL THEN
      INSERT INTO journal_entry_template_lines (template_id, account_id, debit_amount, credit_amount, description, line_order)
      VALUES (v_template_id, v_account_id, 0, 0, 'Bankavgifter', 0);
    END IF;

    -- Line 2: Bank - Credit 1930
    SELECT id INTO v_account_id FROM accounts 
    WHERE organization_id = p_organization_id AND account_number = '1930' LIMIT 1;
    IF v_account_id IS NOT NULL THEN
      INSERT INTO journal_entry_template_lines (template_id, account_id, debit_amount, credit_amount, description, line_order)
      VALUES (v_template_id, v_account_id, 0, 0, 'Företagskonto', 1);
    END IF;

    v_templates_created := v_templates_created + 1;
  END IF;

  -- ========================================
  -- INSURANCE (Försäkringar)
  -- ========================================

  -- Template 16: Business Insurance (Företagsförsäkring)
  IF NOT EXISTS (
    SELECT 1 FROM journal_entry_templates 
    WHERE organization_id = p_organization_id AND name = 'Företagsförsäkring'
  ) THEN
    INSERT INTO journal_entry_templates (organization_id, name, description, default_description, created_by)
    VALUES (
      p_organization_id,
      'Företagsförsäkring',
      'Betalning av företagsförsäkring (momsfritt). Försäkringskostnad debiteras på 6310, leverantörsskuld/bank krediteras.',
      'Försäkring [PERIOD]',
      p_created_by
    )
    RETURNING id INTO v_template_id;

    -- Line 1: Försäkring - Debit 6310
    SELECT id INTO v_account_id FROM accounts 
    WHERE organization_id = p_organization_id AND account_number = '6310' LIMIT 1;
    IF v_account_id IS NOT NULL THEN
      INSERT INTO journal_entry_template_lines (template_id, account_id, debit_amount, credit_amount, description, line_order)
      VALUES (v_template_id, v_account_id, 0, 0, 'Företagsförsäkring', 0);
    END IF;

    -- Line 2: Bank - Credit 1930
    SELECT id INTO v_account_id FROM accounts 
    WHERE organization_id = p_organization_id AND account_number = '1930' LIMIT 1;
    IF v_account_id IS NOT NULL THEN
      INSERT INTO journal_entry_template_lines (template_id, account_id, debit_amount, credit_amount, description, line_order)
      VALUES (v_template_id, v_account_id, 0, 0, 'Företagskonto', 1);
    END IF;

    v_templates_created := v_templates_created + 1;
  END IF;

  RETURN v_templates_created;
END;
$$;

-- Add comment explaining the function
COMMENT ON FUNCTION seed_journal_entry_templates(UUID, UUID) IS 
'Creates common Swedish journal entry templates for an organization. 
Templates include: salary payments, employer contributions, purchases, 
rent, utilities, customer invoices, supplier payments, tax payments, 
office supplies, bank fees, and insurance.
All templates use BAS (Bas Kontoplanen) standard account numbers.';

-- Create a trigger function to auto-seed templates when accounts are first imported
-- This allows templates to be created after an organization imports their chart of accounts
CREATE OR REPLACE FUNCTION auto_seed_templates_after_accounts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_account_count INTEGER;
  v_template_count INTEGER;
BEGIN
  -- Only proceed for new accounts
  IF TG_OP = 'INSERT' THEN
    -- Count how many accounts this organization has now
    SELECT COUNT(*) INTO v_account_count
    FROM accounts
    WHERE organization_id = NEW.organization_id;
    
    -- Count existing templates
    SELECT COUNT(*) INTO v_template_count
    FROM journal_entry_templates
    WHERE organization_id = NEW.organization_id;
    
    -- If this is the first batch of accounts (5+ accounts) and no templates exist yet
    -- then seed the common templates
    IF v_account_count >= 5 AND v_template_count = 0 THEN
      -- Check if we have the minimum required accounts for the templates
      IF EXISTS (
        SELECT 1 FROM accounts 
        WHERE organization_id = NEW.organization_id 
        AND account_number IN ('1510', '1930', '2440', '2610', '2640', '3010')
        HAVING COUNT(DISTINCT account_number) >= 4
      ) THEN
        PERFORM seed_journal_entry_templates(NEW.organization_id, NEW.created_by);
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Note: We're NOT automatically creating the trigger here to avoid unexpected behavior.
-- Organizations can manually call seed_journal_entry_templates() or 
-- enable the trigger if desired.

-- Example of how to enable auto-seeding (commented out):
-- CREATE TRIGGER trigger_auto_seed_templates
-- AFTER INSERT ON accounts
-- FOR EACH ROW
-- EXECUTE FUNCTION auto_seed_templates_after_accounts();
