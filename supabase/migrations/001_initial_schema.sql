-- VisInv Database Migration
-- Run this in your Supabase SQL Editor
-- https://supabase.com/dashboard/project/YOUR_PROJECT/sql

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PROFILES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  company_name TEXT,
  company_address TEXT,
  company_city TEXT,
  company_postal_code TEXT,
  company_country TEXT DEFAULT 'Sweden',
  company_phone TEXT,
  company_email TEXT,
  organization_number TEXT,
  vat_number TEXT,
  bank_name TEXT,
  bank_account TEXT,
  bank_iban TEXT,
  bank_bic TEXT,
  avatar_url TEXT,
  logo_url TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

-- ============================================
-- TEAMS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS teams (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES auth.users ON DELETE SET NULL NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

-- ============================================
-- TEAM MEMBERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS team_members (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  team_id UUID REFERENCES teams ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL,
  UNIQUE(team_id, user_id)
);

-- ============================================
-- TEAM INVITATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS team_invitations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  team_id UUID REFERENCES teams ON DELETE CASCADE NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'member', 'viewer')),
  invited_by UUID REFERENCES auth.users ON DELETE SET NULL NOT NULL,
  token TEXT UNIQUE DEFAULT uuid_generate_v4()::TEXT,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

-- ============================================
-- CLIENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS clients (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  team_id UUID REFERENCES teams ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  postal_code TEXT,
  country TEXT DEFAULT 'Sweden',
  organization_number TEXT,
  vat_number TEXT,
  contact_person TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

-- ============================================
-- PRODUCTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  team_id UUID REFERENCES teams ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  unit_price DECIMAL(12, 2) NOT NULL,
  unit TEXT DEFAULT 'st',
  tax_rate DECIMAL(5, 2) DEFAULT 25.00,
  sku TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

-- ============================================
-- TEMPLATES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS templates (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  team_id UUID REFERENCES teams ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_default BOOLEAN DEFAULT FALSE,
  is_system BOOLEAN DEFAULT FALSE,
  design_config JSONB NOT NULL DEFAULT '{}',
  preview_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

-- ============================================
-- INVOICES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS invoices (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  team_id UUID REFERENCES teams ON DELETE SET NULL,
  client_id UUID REFERENCES clients ON DELETE RESTRICT NOT NULL,
  template_id UUID REFERENCES templates ON DELETE SET NULL,
  invoice_number TEXT UNIQUE NOT NULL,
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
  currency TEXT DEFAULT 'SEK' NOT NULL,
  subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0,
  tax_rate DECIMAL(5, 2) DEFAULT 25.00,
  tax_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  notes TEXT,
  terms TEXT,
  reference TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

-- ============================================
-- INVOICE ROWS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS invoice_rows (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  invoice_id UUID REFERENCES invoices ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES products ON DELETE SET NULL,
  description TEXT NOT NULL,
  quantity DECIMAL(10, 2) NOT NULL DEFAULT 1,
  unit TEXT DEFAULT 'st',
  unit_price DECIMAL(12, 2) NOT NULL,
  tax_rate DECIMAL(5, 2) DEFAULT 25.00,
  amount DECIMAL(12, 2) NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

-- ============================================
-- SUBSCRIPTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL UNIQUE,
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'free' CHECK (status IN ('free', 'active', 'cancelled', 'past_due', 'trialing')),
  plan_type TEXT NOT NULL DEFAULT 'free' CHECK (plan_type IN ('free', 'premium')),
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

-- ============================================
-- PAYMENTS TABLE (for tracking invoice payments)
-- ============================================
CREATE TABLE IF NOT EXISTS payments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  invoice_id UUID REFERENCES invoices ON DELETE CASCADE NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT,
  reference TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

-- ============================================
-- AUDIT LOGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

-- ============================================
-- INVOICE NUMBER SEQUENCE
-- ============================================
CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START 1;

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::TEXT, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to generate invoice number
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT AS $$
DECLARE
  next_val INTEGER;
BEGIN
  next_val := nextval('invoice_number_seq');
  RETURN 'INV' || LPAD(next_val::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- Function to create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, is_admin)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.email = 'thomas+visinv@communitaslabs.io'
  );
  
  -- Create free subscription for new user
  INSERT INTO public.subscriptions (user_id, status, plan_type)
  VALUES (NEW.id, 'free', 'free');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate invoice totals
CREATE OR REPLACE FUNCTION calculate_invoice_totals()
RETURNS TRIGGER AS $$
DECLARE
  v_subtotal DECIMAL(12, 2);
  v_tax_amount DECIMAL(12, 2);
BEGIN
  -- Calculate subtotal from invoice rows
  SELECT COALESCE(SUM(amount), 0) INTO v_subtotal
  FROM invoice_rows
  WHERE invoice_id = COALESCE(NEW.invoice_id, OLD.invoice_id);
  
  -- Update the invoice
  UPDATE invoices
  SET 
    subtotal = v_subtotal,
    tax_amount = v_subtotal * (tax_rate / 100),
    total_amount = v_subtotal + (v_subtotal * (tax_rate / 100)),
    updated_at = TIMEZONE('utc'::TEXT, NOW())
  WHERE id = COALESCE(NEW.invoice_id, OLD.invoice_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGERS
-- ============================================

-- Updated at triggers
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_teams_updated_at
  BEFORE UPDATE ON teams
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_templates_updated_at
  BEFORE UPDATE ON templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger to create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Triggers to recalculate invoice totals
CREATE TRIGGER calculate_totals_on_row_insert
  AFTER INSERT ON invoice_rows
  FOR EACH ROW EXECUTE FUNCTION calculate_invoice_totals();

CREATE TRIGGER calculate_totals_on_row_update
  AFTER UPDATE ON invoice_rows
  FOR EACH ROW EXECUTE FUNCTION calculate_invoice_totals();

CREATE TRIGGER calculate_totals_on_row_delete
  AFTER DELETE ON invoice_rows
  FOR EACH ROW EXECUTE FUNCTION calculate_invoice_totals();

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON profiles(is_admin);

CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients(user_id);
CREATE INDEX IF NOT EXISTS idx_clients_team_id ON clients(team_id);
CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(name);

CREATE INDEX IF NOT EXISTS idx_products_user_id ON products(user_id);
CREATE INDEX IF NOT EXISTS idx_products_team_id ON products(team_id);

CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_team_id ON invoices(team_id);
CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_issue_date ON invoices(issue_date);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);

CREATE INDEX IF NOT EXISTS idx_invoice_rows_invoice_id ON invoice_rows(invoice_id);

CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members(team_id);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON audit_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_rows ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES - PROFILES
-- ============================================

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE
    )
  );

-- ============================================
-- RLS POLICIES - CLIENTS
-- ============================================

CREATE POLICY "Users can view own clients"
  ON clients FOR SELECT
  USING (
    auth.uid() = user_id
    OR team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own clients"
  ON clients FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own clients"
  ON clients FOR UPDATE
  USING (
    auth.uid() = user_id
    OR team_id IN (
      SELECT team_id FROM team_members 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Users can delete own clients"
  ON clients FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- RLS POLICIES - PRODUCTS
-- ============================================

CREATE POLICY "Users can view own products"
  ON products FOR SELECT
  USING (
    auth.uid() = user_id
    OR team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own products"
  ON products FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own products"
  ON products FOR UPDATE
  USING (
    auth.uid() = user_id
    OR team_id IN (
      SELECT team_id FROM team_members 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Users can delete own products"
  ON products FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- RLS POLICIES - TEMPLATES
-- ============================================

CREATE POLICY "Users can view own and system templates"
  ON templates FOR SELECT
  USING (
    is_system = TRUE
    OR auth.uid() = user_id
    OR team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own templates"
  ON templates FOR INSERT
  WITH CHECK (auth.uid() = user_id AND is_system = FALSE);

CREATE POLICY "Users can update own templates"
  ON templates FOR UPDATE
  USING (
    auth.uid() = user_id
    AND is_system = FALSE
  );

CREATE POLICY "Users can delete own templates"
  ON templates FOR DELETE
  USING (auth.uid() = user_id AND is_system = FALSE);

-- ============================================
-- RLS POLICIES - INVOICES
-- ============================================

CREATE POLICY "Users can view own invoices"
  ON invoices FOR SELECT
  USING (
    auth.uid() = user_id
    OR team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own invoices"
  ON invoices FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own invoices"
  ON invoices FOR UPDATE
  USING (
    auth.uid() = user_id
    OR team_id IN (
      SELECT team_id FROM team_members 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin', 'member')
    )
  );

CREATE POLICY "Users can delete own invoices"
  ON invoices FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- RLS POLICIES - INVOICE ROWS
-- ============================================

CREATE POLICY "Users can view invoice rows"
  ON invoice_rows FOR SELECT
  USING (
    invoice_id IN (
      SELECT id FROM invoices 
      WHERE user_id = auth.uid()
      OR team_id IN (
        SELECT team_id FROM team_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can insert invoice rows"
  ON invoice_rows FOR INSERT
  WITH CHECK (
    invoice_id IN (
      SELECT id FROM invoices WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update invoice rows"
  ON invoice_rows FOR UPDATE
  USING (
    invoice_id IN (
      SELECT id FROM invoices 
      WHERE user_id = auth.uid()
      OR team_id IN (
        SELECT team_id FROM team_members 
        WHERE user_id = auth.uid() 
        AND role IN ('owner', 'admin', 'member')
      )
    )
  );

CREATE POLICY "Users can delete invoice rows"
  ON invoice_rows FOR DELETE
  USING (
    invoice_id IN (
      SELECT id FROM invoices WHERE user_id = auth.uid()
    )
  );

-- ============================================
-- RLS POLICIES - TEAMS
-- ============================================

CREATE POLICY "Users can view teams they belong to"
  ON teams FOR SELECT
  USING (
    id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create teams"
  ON teams FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Team owners can update team"
  ON teams FOR UPDATE
  USING (
    id IN (
      SELECT team_id FROM team_members 
      WHERE user_id = auth.uid() 
      AND role = 'owner'
    )
  );

CREATE POLICY "Team owners can delete team"
  ON teams FOR DELETE
  USING (
    id IN (
      SELECT team_id FROM team_members 
      WHERE user_id = auth.uid() 
      AND role = 'owner'
    )
  );

-- ============================================
-- RLS POLICIES - TEAM MEMBERS
-- ============================================

CREATE POLICY "Team members can view their team members"
  ON team_members FOR SELECT
  USING (
    team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Team owners/admins can manage members"
  ON team_members FOR INSERT
  WITH CHECK (
    team_id IN (
      SELECT team_id FROM team_members 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Team owners/admins can update members"
  ON team_members FOR UPDATE
  USING (
    team_id IN (
      SELECT team_id FROM team_members 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Team owners/admins can remove members"
  ON team_members FOR DELETE
  USING (
    team_id IN (
      SELECT team_id FROM team_members 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin')
    )
    OR user_id = auth.uid() -- Users can leave teams
  );

-- ============================================
-- RLS POLICIES - TEAM INVITATIONS
-- ============================================

CREATE POLICY "Team admins can view invitations"
  ON team_invitations FOR SELECT
  USING (
    team_id IN (
      SELECT team_id FROM team_members 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin')
    )
    OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

CREATE POLICY "Team admins can create invitations"
  ON team_invitations FOR INSERT
  WITH CHECK (
    team_id IN (
      SELECT team_id FROM team_members 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Team admins can delete invitations"
  ON team_invitations FOR DELETE
  USING (
    team_id IN (
      SELECT team_id FROM team_members 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin')
    )
  );

-- ============================================
-- RLS POLICIES - SUBSCRIPTIONS
-- ============================================

CREATE POLICY "Users can view own subscription"
  ON subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own subscription"
  ON subscriptions FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================
-- RLS POLICIES - PAYMENTS
-- ============================================

CREATE POLICY "Users can view payments for their invoices"
  ON payments FOR SELECT
  USING (
    invoice_id IN (
      SELECT id FROM invoices 
      WHERE user_id = auth.uid()
      OR team_id IN (
        SELECT team_id FROM team_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can insert payments"
  ON payments FOR INSERT
  WITH CHECK (
    invoice_id IN (
      SELECT id FROM invoices WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update payments"
  ON payments FOR UPDATE
  USING (
    invoice_id IN (
      SELECT id FROM invoices WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete payments"
  ON payments FOR DELETE
  USING (
    invoice_id IN (
      SELECT id FROM invoices WHERE user_id = auth.uid()
    )
  );

-- ============================================
-- RLS POLICIES - AUDIT LOGS
-- ============================================

CREATE POLICY "Users can view own audit logs"
  ON audit_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all audit logs"
  ON audit_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE
    )
  );

-- ============================================
-- SEED DATA - SYSTEM TEMPLATES
-- ============================================

INSERT INTO templates (id, name, description, is_system, is_default, design_config) VALUES
(
  'a0000000-0000-0000-0000-000000000001',
  'Professional',
  'Clean and professional invoice template',
  TRUE,
  TRUE,
  '{
    "layout": "professional",
    "primaryColor": "#1e40af",
    "secondaryColor": "#64748b",
    "fontFamily": "Inter, sans-serif",
    "logoPosition": "top-left",
    "showLogo": true,
    "showCompanyInfo": true,
    "dateFormat": "YYYY-MM-DD",
    "currencyPosition": "after"
  }'::JSONB
),
(
  'a0000000-0000-0000-0000-000000000002',
  'Modern',
  'Modern and minimalist design',
  TRUE,
  FALSE,
  '{
    "layout": "modern",
    "primaryColor": "#0f172a",
    "secondaryColor": "#94a3b8",
    "fontFamily": "Poppins, sans-serif",
    "logoPosition": "top-center",
    "showLogo": true,
    "showCompanyInfo": true,
    "dateFormat": "YYYY-MM-DD",
    "currencyPosition": "after"
  }'::JSONB
),
(
  'a0000000-0000-0000-0000-000000000003',
  'Classic',
  'Traditional invoice layout',
  TRUE,
  FALSE,
  '{
    "layout": "classic",
    "primaryColor": "#374151",
    "secondaryColor": "#6b7280",
    "fontFamily": "Georgia, serif",
    "logoPosition": "top-left",
    "showLogo": true,
    "showCompanyInfo": true,
    "dateFormat": "DD/MM/YYYY",
    "currencyPosition": "before"
  }'::JSONB
),
(
  'a0000000-0000-0000-0000-000000000004',
  'Swedish Standard',
  'Standard Swedish invoice format',
  TRUE,
  FALSE,
  '{
    "layout": "swedish",
    "primaryColor": "#1e3a8a",
    "secondaryColor": "#fbbf24",
    "fontFamily": "Inter, sans-serif",
    "logoPosition": "top-left",
    "showLogo": true,
    "showCompanyInfo": true,
    "showBankgiro": true,
    "showOCR": true,
    "dateFormat": "YYYY-MM-DD",
    "currencyPosition": "after"
  }'::JSONB
);

-- ============================================
-- STORAGE BUCKETS
-- ============================================

-- Note: Run these in the Supabase Dashboard under Storage

-- Create avatars bucket (public)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', TRUE)
ON CONFLICT (id) DO NOTHING;

-- Create logos bucket (public)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('logos', 'logos', TRUE)
ON CONFLICT (id) DO NOTHING;

-- Create invoice-attachments bucket (private)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('invoice-attachments', 'invoice-attachments', FALSE)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for avatars
CREATE POLICY "Avatar images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars' 
    AND auth.uid()::TEXT = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update own avatar"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars' 
    AND auth.uid()::TEXT = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own avatar"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars' 
    AND auth.uid()::TEXT = (storage.foldername(name))[1]
  );

-- Storage policies for logos
CREATE POLICY "Logo images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'logos');

CREATE POLICY "Users can upload own logo"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'logos' 
    AND auth.uid()::TEXT = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update own logo"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'logos' 
    AND auth.uid()::TEXT = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own logo"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'logos' 
    AND auth.uid()::TEXT = (storage.foldername(name))[1]
  );

-- Storage policies for invoice attachments
CREATE POLICY "Users can view own invoice attachments"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'invoice-attachments' 
    AND auth.uid()::TEXT = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can upload invoice attachments"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'invoice-attachments' 
    AND auth.uid()::TEXT = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own invoice attachments"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'invoice-attachments' 
    AND auth.uid()::TEXT = (storage.foldername(name))[1]
  );

-- ============================================
-- DONE!
-- ============================================

-- After running this migration:
-- 1. Sign up with thomas+visinv@communitaslabs.io to create admin account
-- 2. The trigger will automatically set is_admin = TRUE for that email
-- 3. Configure Google OAuth in Supabase Dashboard > Authentication > Providers
