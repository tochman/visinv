# Svethna - Invoice SaaS Database Schema

This document outlines the Supabase database schema for the Svethna application.

## Tables

### users (Managed by Supabase Auth)
Supabase Auth handles user authentication. Additional user profile data can be stored in a `profiles` table.

### profiles
```sql
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  email text unique not null,
  full_name text,
  company_name text,
  avatar_url text,
  logo_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);
```

### clients
```sql
create table clients (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  team_id uuid references teams on delete set null,
  name text not null,
  email text,
  phone text,
  address text,
  city text,
  postal_code text,
  country text default 'Sweden',
  organization_number text,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);
```

### invoices
```sql
create table invoices (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  team_id uuid references teams on delete set null,
  client_id uuid references clients on delete restrict not null,
  template_id uuid references templates on delete set null,
  invoice_number text unique not null,
  issue_date date not null,
  due_date date not null,
  status text not null check (status in ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
  currency text default 'SEK' not null,
  subtotal decimal(12, 2) not null,
  tax_rate decimal(5, 2) default 25.00,
  tax_amount decimal(12, 2) not null,
  total_amount decimal(12, 2) not null,
  notes text,
  terms text,
  sent_at timestamp with time zone,
  paid_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);
```

### invoice_rows
```sql
create table invoice_rows (
  id uuid default uuid_generate_v4() primary key,
  invoice_id uuid references invoices on delete cascade not null,
  product_id uuid references products on delete set null,
  description text not null,
  quantity decimal(10, 2) not null,
  unit_price decimal(12, 2) not null,
  amount decimal(12, 2) not null,
  sort_order integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
```

### products
```sql
create table products (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  team_id uuid references teams on delete set null,
  name text not null,
  description text,
  unit_price decimal(12, 2) not null,
  unit text default 'st',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);
```

### templates
```sql
create table templates (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade,
  team_id uuid references teams on delete set null,
  name text not null,
  description text,
  is_default boolean default false,
  is_custom boolean default false,
  design_config jsonb not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);
```

### teams
```sql
create table teams (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  description text,
  created_by uuid references auth.users on delete set null not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);
```

### team_members
```sql
create table team_members (
  id uuid default uuid_generate_v4() primary key,
  team_id uuid references teams on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  role text not null check (role in ('owner', 'admin', 'member', 'viewer')),
  joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(team_id, user_id)
);
```

### team_invitations
```sql
create table team_invitations (
  id uuid default uuid_generate_v4() primary key,
  team_id uuid references teams on delete cascade not null,
  email text not null,
  role text not null check (role in ('admin', 'member', 'viewer')),
  invited_by uuid references auth.users on delete set null not null,
  expires_at timestamp with time zone default (now() + interval '7 days'),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
```

### subscriptions
```sql
create table subscriptions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null unique,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  status text not null check (status in ('active', 'cancelled', 'past_due', 'trialing')),
  plan_type text not null check (plan_type in ('free', 'premium')),
  current_period_start timestamp with time zone,
  current_period_end timestamp with time zone,
  cancel_at_period_end boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);
```

### payments
```sql
create table payments (
  id uuid default uuid_generate_v4() primary key,
  invoice_id uuid references invoices on delete cascade not null,
  amount decimal(12, 2) not null,
  payment_date date not null,
  payment_method text,
  reference text,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
```

### audit_logs
```sql
create table audit_logs (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  changes jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
```

## Row Level Security (RLS) Policies

Enable RLS on all tables:
```sql
alter table profiles enable row level security;
alter table clients enable row level security;
alter table invoices enable row level security;
alter table invoice_rows enable row level security;
alter table products enable row level security;
alter table templates enable row level security;
alter table teams enable row level security;
alter table team_members enable row level security;
alter table subscriptions enable row level security;
alter table payments enable row level security;
```

### Example RLS Policies for clients table:
```sql
-- Users can view their own clients or team clients
create policy "Users can view own clients"
  on clients for select
  using (
    auth.uid() = user_id
    or team_id in (
      select team_id from team_members where user_id = auth.uid()
    )
  );

-- Users can insert their own clients
create policy "Users can insert own clients"
  on clients for insert
  with check (auth.uid() = user_id);

-- Users can update their own clients or team clients (if admin/owner)
create policy "Users can update own clients"
  on clients for update
  using (
    auth.uid() = user_id
    or team_id in (
      select team_id from team_members 
      where user_id = auth.uid() 
      and role in ('owner', 'admin')
    )
  );

-- Users can delete their own clients
create policy "Users can delete own clients"
  on clients for delete
  using (auth.uid() = user_id);
```

## Indexes

```sql
-- Performance indexes
create index idx_clients_user_id on clients(user_id);
create index idx_clients_team_id on clients(team_id);
create index idx_invoices_user_id on invoices(user_id);
create index idx_invoices_client_id on invoices(client_id);
create index idx_invoices_status on invoices(status);
create index idx_invoice_rows_invoice_id on invoice_rows(invoice_id);
create index idx_products_user_id on products(user_id);
create index idx_team_members_user_id on team_members(user_id);
create index idx_team_members_team_id on team_members(team_id);
create index idx_subscriptions_user_id on subscriptions(user_id);
```

## Functions

### Update updated_at timestamp
```sql
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Apply to relevant tables
create trigger update_profiles_updated_at before update on profiles
  for each row execute procedure update_updated_at_column();

create trigger update_clients_updated_at before update on clients
  for each row execute procedure update_updated_at_column();

create trigger update_invoices_updated_at before update on invoices
  for each row execute procedure update_updated_at_column();

-- ... apply to other tables with updated_at column
```

### Generate invoice number
```sql
create or replace function generate_invoice_number()
returns text as $$
declare
  next_number integer;
  invoice_num text;
begin
  select coalesce(max(cast(substring(invoice_number from '[0-9]+$') as integer)), 0) + 1
  into next_number
  from invoices;
  
  invoice_num := 'INV' || lpad(next_number::text, 6, '0');
  return invoice_num;
end;
$$ language plpgsql;
```

## Storage Buckets

Create storage buckets for file uploads:

1. **avatars** - User profile avatars
   - Public bucket
   - Max file size: 2MB
   - Allowed types: image/jpeg, image/png, image/webp

2. **logos** - Company logos
   - Public bucket
   - Max file size: 2MB
   - Allowed types: image/jpeg, image/png, image/svg+xml

3. **invoices** - Generated invoice PDFs (optional)
   - Private bucket
   - Max file size: 10MB
   - Allowed types: application/pdf

### Storage Policies
```sql
-- Allow users to upload their own avatar
create policy "Users can upload own avatar"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow users to view their own avatar
create policy "Users can view own avatar"
  on storage.objects for select
  using (bucket_id = 'avatars');
```
