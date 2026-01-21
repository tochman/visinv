-- Create organizations table for US-052
-- Organizations represent companies/businesses that issue invoices
-- Each organization has Swedish compliance fields and invoice settings

-- ============================================
-- ORGANIZATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS organizations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  
  -- Basic Information
  name TEXT NOT NULL,
  organization_number TEXT, -- Swedish org number (organisationsnummer)
  vat_number TEXT, -- Swedish VAT/Moms registration number
  
  -- Address (Required for Swedish invoices)
  address TEXT,
  city TEXT,
  postal_code TEXT,
  municipality TEXT, -- Swedish requirement (kommun)
  country TEXT DEFAULT 'Sweden',
  
  -- Contact Information
  email TEXT,
  phone TEXT,
  website TEXT,
  
  -- Banking Information (Optional but recommended)
  bank_account TEXT,
  bank_giro TEXT, -- Swedish bank giro
  plus_giro TEXT, -- Swedish plus giro
  bank_iban TEXT,
  bank_bic TEXT,
  
  -- Tax Information
  f_skatt_approved BOOLEAN DEFAULT FALSE, -- Swedish F-skatt approval
  
  -- Invoice Settings
  invoice_number_prefix TEXT DEFAULT 'INV',
  next_invoice_number INTEGER DEFAULT 1,
  default_payment_terms INTEGER DEFAULT 30, -- Days
  default_currency TEXT DEFAULT 'SEK',
  default_tax_rate DECIMAL(5, 2) DEFAULT 25.00,
  
  -- Logo
  logo_url TEXT,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

-- ============================================
-- ORGANIZATION MEMBERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS organization_members (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID REFERENCES organizations ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  is_default BOOLEAN DEFAULT FALSE, -- User's default organization
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL,
  UNIQUE(organization_id, user_id)
);

-- ============================================
-- ADD ORGANIZATION REFERENCE TO EXISTING TABLES
-- ============================================

-- Add organization_id to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations ON DELETE SET NULL;

-- Add organization_id to clients
ALTER TABLE clients ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations ON DELETE CASCADE;

-- Add organization_id to products
ALTER TABLE products ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations ON DELETE CASCADE;

-- Add organization_id to invoices
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations ON DELETE CASCADE;

-- Add organization_id to templates
ALTER TABLE templates ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations ON DELETE SET NULL;

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_organizations_created_at ON organizations(created_at);
CREATE INDEX IF NOT EXISTS idx_organization_members_org_id ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_user_id ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_organization_id ON profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_clients_organization_id ON clients(organization_id);
CREATE INDEX IF NOT EXISTS idx_products_organization_id ON products(organization_id);
CREATE INDEX IF NOT EXISTS idx_invoices_organization_id ON invoices(organization_id);
CREATE INDEX IF NOT EXISTS idx_templates_organization_id ON templates(organization_id);

-- ============================================
-- TRIGGERS
-- ============================================

-- Updated at trigger for organizations
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

-- Organizations RLS Policies
-- Users can view organizations they are members of
CREATE POLICY "Users can view their organizations"
  ON organizations FOR SELECT
  USING (
    id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

-- Organization owners can update their organizations
CREATE POLICY "Organization owners can update"
  ON organizations FOR UPDATE
  USING (
    id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Users can create organizations (they become the owner via trigger)
CREATE POLICY "Users can create organizations"
  ON organizations FOR INSERT
  WITH CHECK (true);

-- Only owners can delete organizations
CREATE POLICY "Organization owners can delete"
  ON organizations FOR DELETE
  USING (
    id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- Organization Members RLS Policies
-- Users can view members of their organizations
CREATE POLICY "Users can view organization members"
  ON organization_members FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

-- Organization owners/admins can invite members
CREATE POLICY "Organization admins can add members"
  ON organization_members FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Organization owners/admins can update member roles
CREATE POLICY "Organization admins can update members"
  ON organization_members FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Organization owners/admins can remove members
CREATE POLICY "Organization admins can remove members"
  ON organization_members FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to automatically add creator as organization owner
CREATE OR REPLACE FUNCTION handle_new_organization()
RETURNS TRIGGER AS $$
BEGIN
  -- Add the creator as the organization owner
  INSERT INTO public.organization_members (organization_id, user_id, role, is_default)
  VALUES (NEW.id, auth.uid(), 'owner', TRUE);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to add creator as owner
CREATE TRIGGER on_organization_created
  AFTER INSERT ON organizations
  FOR EACH ROW EXECUTE FUNCTION handle_new_organization();

-- ============================================
-- UPDATE EXISTING RLS POLICIES
-- ============================================

-- Note: Existing policies for clients, products, invoices, templates
-- will need to be updated to check organization_id in addition to user_id/team_id
-- This will be done in a separate migration to avoid breaking existing functionality
