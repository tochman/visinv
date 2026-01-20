-- Create invoice_templates table
CREATE TABLE IF NOT EXISTS invoice_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  variables TEXT[],
  is_system BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE invoice_templates ENABLE ROW LEVEL SECURITY;

-- Users can view their own templates and system templates
CREATE POLICY "Users can view own and system templates"
  ON invoice_templates
  FOR SELECT
  USING (
    is_system = true OR 
    auth.uid() = user_id
  );

-- Users can insert their own templates
CREATE POLICY "Users can insert own templates"
  ON invoice_templates
  FOR INSERT
  WITH CHECK (auth.uid() = user_id AND is_system = false);

-- Users can update their own templates (not system templates)
CREATE POLICY "Users can update own templates"
  ON invoice_templates
  FOR UPDATE
  USING (auth.uid() = user_id AND is_system = false);

-- Users can delete their own templates (not system templates)
CREATE POLICY "Users can delete own templates"
  ON invoice_templates
  FOR DELETE
  USING (auth.uid() = user_id AND is_system = false);

-- Create indexes
CREATE INDEX idx_invoice_templates_user_id ON invoice_templates(user_id);
CREATE INDEX idx_invoice_templates_is_system ON invoice_templates(is_system);

-- Insert default system templates
INSERT INTO invoice_templates (name, content, variables, is_system, user_id)
VALUES 
(
  'Modern',
  '<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; padding: 40px; }
    .header { border-bottom: 3px solid #3b82f6; padding-bottom: 20px; margin-bottom: 30px; }
    .invoice-number { font-size: 24px; font-weight: bold; color: #3b82f6; }
    .details { margin: 20px 0; }
    .table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    .table th { background: #f3f4f6; padding: 10px; text-align: left; }
    .table td { padding: 10px; border-bottom: 1px solid #e5e7eb; }
    .total { text-align: right; font-size: 18px; font-weight: bold; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="invoice-number">{{invoice_number}}</div>
    <div>{{client_name}}</div>
  </div>
  
  <div class="details">
    <p><strong>Issue Date:</strong> {{issue_date}}</p>
    <p><strong>Due Date:</strong> {{due_date}}</p>
  </div>

  <table class="table">
    <thead>
      <tr>
        <th>Description</th>
        <th>Quantity</th>
        <th>Unit Price</th>
        <th>Amount</th>
      </tr>
    </thead>
    <tbody>
      {{#each line_items}}
      <tr>
        <td>{{description}}</td>
        <td>{{quantity}}</td>
        <td>{{unit_price}}</td>
        <td>{{amount}}</td>
      </tr>
      {{/each}}
    </tbody>
  </table>

  <div class="total">
    <div>Subtotal: {{subtotal}}</div>
    <div>Tax ({{tax_rate}}%): {{tax_amount}}</div>
    <div style="color: #3b82f6;">Total: {{total}} {{currency}}</div>
  </div>
</body>
</html>',
  ARRAY['invoice_number', 'client_name', 'issue_date', 'due_date', 'line_items', 'subtotal', 'tax_rate', 'tax_amount', 'total', 'currency'],
  true,
  NULL
),
(
  'Classic',
  '<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: ''Times New Roman'', serif; padding: 40px; }
    .header { text-align: center; margin-bottom: 40px; }
    .invoice-title { font-size: 28px; font-weight: bold; }
    .info-box { background: #f9fafb; padding: 15px; margin: 20px 0; border: 1px solid #d1d5db; }
    .table { width: 100%; border: 1px solid #000; border-collapse: collapse; margin: 20px 0; }
    .table th, .table td { border: 1px solid #000; padding: 8px; }
    .table th { background: #e5e7eb; }
    .footer { margin-top: 40px; text-align: right; }
  </style>
</head>
<body>
  <div class="header">
    <div class="invoice-title">INVOICE</div>
    <div>{{invoice_number}}</div>
  </div>

  <div class="info-box">
    <strong>Bill To:</strong><br>
    {{client_name}}
  </div>

  <div class="info-box">
    <strong>Issue Date:</strong> {{issue_date}}<br>
    <strong>Due Date:</strong> {{due_date}}
  </div>

  <table class="table">
    <thead>
      <tr>
        <th>Item</th>
        <th>Qty</th>
        <th>Price</th>
        <th>Total</th>
      </tr>
    </thead>
    <tbody>
      {{#each line_items}}
      <tr>
        <td>{{description}}</td>
        <td>{{quantity}}</td>
        <td>{{unit_price}}</td>
        <td>{{amount}}</td>
      </tr>
      {{/each}}
    </tbody>
  </table>

  <div class="footer">
    <p>Subtotal: {{subtotal}} {{currency}}</p>
    <p>Tax ({{tax_rate}}%): {{tax_amount}} {{currency}}</p>
    <p><strong>Total Due: {{total}} {{currency}}</strong></p>
  </div>
</body>
</html>',
  ARRAY['invoice_number', 'client_name', 'issue_date', 'due_date', 'line_items', 'subtotal', 'tax_rate', 'tax_amount', 'total', 'currency'],
  true,
  NULL
);

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_invoice_templates_updated_at
  BEFORE UPDATE ON invoice_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
