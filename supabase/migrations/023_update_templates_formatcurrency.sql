-- Migration 023: Update all templates to use formatCurrency helper
-- This updates Swedish templates to properly format monetary values

-- Update "Ren - Minimalistisk" template
UPDATE invoice_templates 
SET content = REPLACE(
  REPLACE(
    REPLACE(
      REPLACE(
        REPLACE(
          REPLACE(
            REPLACE(
              REPLACE(content, 
                '{{total}} {{currency}}', '{{formatCurrency total currency}}'),
              '{{subtotal}} {{currency}}', '{{formatCurrency subtotal currency}}'),
            '{{unit_price}}', '{{formatCurrency unit_price ../currency}}'),
          '{{amount}}', '{{formatCurrency amount ../currency}}'),
        '{{vat}} {{../currency}}', '{{formatCurrency vat ../currency}}'),
      '{{base}} {{../currency}}', '{{formatCurrency base ../currency}}'),
    '{{unit_price}} {{../currency}}', '{{formatCurrency unit_price ../currency}}'),
  '{{amount}} {{../currency}}', '{{formatCurrency amount ../currency}}'),
  updated_at = now()
WHERE name = 'Ren - Minimalistisk' AND is_system = true;

-- Update "Understruken - Elegant" template
UPDATE invoice_templates 
SET content = REPLACE(
  REPLACE(
    REPLACE(
      REPLACE(
        REPLACE(
          REPLACE(
            REPLACE(
              REPLACE(content, 
                '{{total}} {{currency}}', '{{formatCurrency total currency}}'),
              '{{subtotal}} {{currency}}', '{{formatCurrency subtotal currency}}'),
            '{{unit_price}}', '{{formatCurrency unit_price ../currency}}'),
          '{{amount}}', '{{formatCurrency amount ../currency}}'),
        '{{vat}} {{../currency}}', '{{formatCurrency vat ../currency}}'),
      '{{base}} {{../currency}}', '{{formatCurrency base ../currency}}'),
    '{{unit_price}} {{../currency}}', '{{formatCurrency unit_price ../currency}}'),
  '{{amount}} {{../currency}}', '{{formatCurrency amount ../currency}}'),
  updated_at = now()
WHERE name = 'Understruken - Elegant' AND is_system = true;

-- Update "Sidebar - Tvåkolumn" template
UPDATE invoice_templates 
SET content = REPLACE(
  REPLACE(
    REPLACE(
      REPLACE(
        REPLACE(
          REPLACE(
            REPLACE(
              REPLACE(content, 
                '{{total}} {{currency}}', '{{formatCurrency total currency}}'),
              '{{subtotal}} {{currency}}', '{{formatCurrency subtotal currency}}'),
            '{{unit_price}}', '{{formatCurrency unit_price ../currency}}'),
          '{{amount}}', '{{formatCurrency amount ../currency}}'),
        '{{vat}} {{../currency}}', '{{formatCurrency vat ../currency}}'),
      '{{base}} {{../currency}}', '{{formatCurrency base ../currency}}'),
    '{{unit_price}} {{../currency}}', '{{formatCurrency unit_price ../currency}}'),
  '{{amount}} {{../currency}}', '{{formatCurrency amount ../currency}}'),
  updated_at = now()
WHERE name = 'Sidebar - Tvåkolumn' AND is_system = true;

-- Update "Kompakt - Enkel" template
UPDATE invoice_templates 
SET content = REPLACE(
  REPLACE(
    REPLACE(
      REPLACE(
        REPLACE(
          REPLACE(
            REPLACE(
              REPLACE(content, 
                '{{total}} {{currency}}', '{{formatCurrency total currency}}'),
              '{{subtotal}} {{currency}}', '{{formatCurrency subtotal currency}}'),
            '{{unit_price}}', '{{formatCurrency unit_price ../currency}}'),
          '{{amount}}', '{{formatCurrency amount ../currency}}'),
        '{{vat}} {{../currency}}', '{{formatCurrency vat ../currency}}'),
      '{{base}} {{../currency}}', '{{formatCurrency base ../currency}}'),
    '{{unit_price}} {{../currency}}', '{{formatCurrency unit_price ../currency}}'),
  '{{amount}} {{../currency}}', '{{formatCurrency amount ../currency}}'),
  updated_at = now()
WHERE name = 'Kompakt - Enkel' AND is_system = true;

-- Update "Hallå - Modern" template
UPDATE invoice_templates 
SET content = REPLACE(
  REPLACE(
    REPLACE(
      REPLACE(
        REPLACE(
          REPLACE(
            REPLACE(
              REPLACE(content, 
                '{{total}} {{currency}}', '{{formatCurrency total currency}}'),
              '{{subtotal}} {{currency}}', '{{formatCurrency subtotal currency}}'),
            '{{unit_price}}', '{{formatCurrency unit_price ../currency}}'),
          '{{amount}}', '{{formatCurrency amount ../currency}}'),
        '{{vat}} {{../currency}}', '{{formatCurrency vat ../currency}}'),
      '{{base}} {{../currency}}', '{{formatCurrency base ../currency}}'),
    '{{unit_price}} {{../currency}}', '{{formatCurrency unit_price ../currency}}'),
  '{{amount}} {{../currency}}', '{{formatCurrency amount ../currency}}'),
  updated_at = now()
WHERE name = 'Hallå - Modern' AND is_system = true;

-- Update "Klassisk - Professionell" template
UPDATE invoice_templates 
SET content = REPLACE(
  REPLACE(
    REPLACE(
      REPLACE(
        REPLACE(
          REPLACE(
            REPLACE(
              REPLACE(content, 
                '{{total}} {{currency}}', '{{formatCurrency total currency}}'),
              '{{subtotal}} {{currency}}', '{{formatCurrency subtotal currency}}'),
            '{{unit_price}}', '{{formatCurrency unit_price ../currency}}'),
          '{{amount}}', '{{formatCurrency amount ../currency}}'),
        '{{vat}} {{../currency}}', '{{formatCurrency vat ../currency}}'),
      '{{base}} {{../currency}}', '{{formatCurrency base ../currency}}'),
    '{{unit_price}} {{../currency}}', '{{formatCurrency unit_price ../currency}}'),
  '{{amount}} {{../currency}}', '{{formatCurrency amount ../currency}}'),
  updated_at = now()
WHERE name = 'Klassisk - Professionell' AND is_system = true;

-- Update "Modern" template
UPDATE invoice_templates 
SET content = REPLACE(
  REPLACE(
    REPLACE(
      REPLACE(
        REPLACE(
          REPLACE(
            REPLACE(
              REPLACE(content, 
                '{{total}} {{currency}}', '{{formatCurrency total currency}}'),
              '{{subtotal}} {{currency}}', '{{formatCurrency subtotal currency}}'),
            '{{unit_price}}', '{{formatCurrency unit_price ../currency}}'),
          '{{amount}}', '{{formatCurrency amount ../currency}}'),
        '{{vat}} {{../currency}}', '{{formatCurrency vat ../currency}}'),
      '{{base}} {{../currency}}', '{{formatCurrency base ../currency}}'),
    '{{unit_price}} {{../currency}}', '{{formatCurrency unit_price ../currency}}'),
  '{{amount}} {{../currency}}', '{{formatCurrency amount ../currency}}'),
  updated_at = now()
WHERE name = 'Modern' AND is_system = true;

-- Update "Classic" template
UPDATE invoice_templates 
SET content = REPLACE(
  REPLACE(
    REPLACE(
      REPLACE(
        REPLACE(
          REPLACE(
            REPLACE(
              REPLACE(content, 
                '{{total}} {{currency}}', '{{formatCurrency total currency}}'),
              '{{subtotal}} {{currency}}', '{{formatCurrency subtotal currency}}'),
            '{{unit_price}}', '{{formatCurrency unit_price ../currency}}'),
          '{{amount}}', '{{formatCurrency amount ../currency}}'),
        '{{vat}} {{../currency}}', '{{formatCurrency vat ../currency}}'),
      '{{base}} {{../currency}}', '{{formatCurrency base ../currency}}'),
    '{{unit_price}} {{../currency}}', '{{formatCurrency unit_price ../currency}}'),
  '{{amount}} {{../currency}}', '{{formatCurrency amount ../currency}}'),
  updated_at = now()
WHERE name = 'Classic' AND is_system = true;
