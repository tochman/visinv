-- Migration: Multi-Currency Product Pricing (US-024-A)
-- Creates product_prices table and removes unit_price from products table

-- Create product_prices table
CREATE TABLE IF NOT EXISTS product_prices (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  product_id UUID REFERENCES products ON DELETE CASCADE NOT NULL,
  currency TEXT NOT NULL CHECK (currency IN ('SEK', 'EUR', 'USD', 'GBP', 'NOK', 'DKK')),
  price DECIMAL(12, 2) NOT NULL CHECK (price >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL,
  UNIQUE(product_id, currency)
);

-- Create index for faster lookups
CREATE INDEX idx_product_prices_product_id ON product_prices(product_id);
CREATE INDEX idx_product_prices_currency ON product_prices(currency);

-- Enable RLS on product_prices
ALTER TABLE product_prices ENABLE ROW LEVEL SECURITY;

-- RLS Policies for product_prices
-- Users can view product prices for their own products
CREATE POLICY "Users can view their product prices"
  ON product_prices FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM products
      WHERE products.id = product_prices.product_id
      AND products.user_id = auth.uid()
    )
  );

-- Users can insert product prices for their own products
CREATE POLICY "Users can insert their product prices"
  ON product_prices FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM products
      WHERE products.id = product_prices.product_id
      AND products.user_id = auth.uid()
    )
  );

-- Users can update product prices for their own products
CREATE POLICY "Users can update their product prices"
  ON product_prices FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM products
      WHERE products.id = product_prices.product_id
      AND products.user_id = auth.uid()
    )
  );

-- Users can delete product prices for their own products
CREATE POLICY "Users can delete their product prices"
  ON product_prices FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM products
      WHERE products.id = product_prices.product_id
      AND products.user_id = auth.uid()
    )
  );

-- Migrate existing unit_price data to product_prices table
-- This assumes SEK as the default currency for existing products
INSERT INTO product_prices (product_id, currency, price)
SELECT id, 'SEK', unit_price
FROM products
WHERE unit_price IS NOT NULL;

-- Remove unit_price column from products table
ALTER TABLE products DROP COLUMN IF EXISTS unit_price;

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_product_prices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::TEXT, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_product_prices_timestamp
  BEFORE UPDATE ON product_prices
  FOR EACH ROW
  EXECUTE FUNCTION update_product_prices_updated_at();
