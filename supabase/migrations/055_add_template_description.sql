-- Migration 055: Add description field to invoice_templates

-- Add description column to invoice_templates table
ALTER TABLE invoice_templates
ADD COLUMN IF NOT EXISTS description TEXT;

-- Add descriptions to existing system templates
UPDATE invoice_templates
SET description = 'Modern och fräsch design med tydlig struktur. Perfekt för startups och moderna företag.'
WHERE name = 'Hallå - Modern' AND is_system = true;

UPDATE invoice_templates
SET description = 'Klassisk professionell layout som passar etablerade företag och konservativa branscher.'
WHERE name = 'Klassisk - Professionell' AND is_system = true;

UPDATE invoice_templates
SET description = 'Ren minimalistisk design som fokuserar på innehållet. Elegant och tidlös.'
WHERE name = 'Ren - Minimalistisk' AND is_system = true;

UPDATE invoice_templates
SET description = 'Elegant design med understrykning som skapar tydlig visuell hierarki.'
WHERE name = 'Understruken - Elegant' AND is_system = true;

UPDATE invoice_templates
SET description = 'Tvåkolumns layout med sidebar för tydlig informationsstruktur.'
WHERE name = 'Sidebar - Tvåkolumn' AND is_system = true;

UPDATE invoice_templates
SET description = 'Kompakt och enkel design som passar kortare fakturor med få rader.'
WHERE name = 'Kompakt - Enkel' AND is_system = true;

UPDATE invoice_templates
SET description = 'Professional dark-themed design with bold header. Perfect for creative agencies and modern businesses.'
WHERE name = 'Studio Dark' AND is_system = true;

UPDATE invoice_templates
SET description = 'Elegant floral design with sophisticated typography. Ideal for premium services and boutique businesses.'
WHERE name = 'Elegant Floral' AND is_system = true;
