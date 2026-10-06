-- 1. Create sequences
CREATE SEQUENCE IF NOT EXISTS purchase_seq START WITH 1001;
CREATE SEQUENCE IF NOT EXISTS vendor_pay_seq START WITH 1001;

-- 2. Vendors table
CREATE TABLE IF NOT EXISTS vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  category VARCHAR(100) DEFAULT 'General',
  address TEXT,
  opening_balance NUMERIC(12,2) DEFAULT 0,
  current_balance NUMERIC(12,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Raw Materials catalogue
CREATE TABLE IF NOT EXISTS raw_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  unit VARCHAR(50) DEFAULT 'kg',
  default_price NUMERIC(12,2) DEFAULT 0,
  category VARCHAR(100) DEFAULT 'General',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Purchase Invoices (Maal Bill)
CREATE TABLE IF NOT EXISTS purchase_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number VARCHAR(50) NOT NULL UNIQUE,
  vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
  vendor_name_snapshot VARCHAR(255) NOT NULL,
  invoice_date DATE DEFAULT CURRENT_DATE,
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  paid_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  balance_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  payment_method VARCHAR(50) DEFAULT 'cash',
  payment_status VARCHAR(50) DEFAULT 'paid',
  notes TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Purchase Items
CREATE TABLE IF NOT EXISTS purchase_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES purchase_invoices(id) ON DELETE CASCADE,
  raw_material_id UUID REFERENCES raw_materials(id) ON DELETE SET NULL,
  item_name_snapshot VARCHAR(255) NOT NULL,
  quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
  unit VARCHAR(50) DEFAULT 'kg',
  unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  line_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Vendor Payments
CREATE TABLE IF NOT EXISTS vendor_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_number VARCHAR(50) NOT NULL UNIQUE,
  vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL,
  payment_date DATE DEFAULT CURRENT_DATE,
  payment_method VARCHAR(50) DEFAULT 'cash',
  reference_number VARCHAR(100),
  notes TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed initial common Raw Materials if empty
INSERT INTO raw_materials (name, unit, default_price, category)
SELECT name, unit, default_price, category FROM (
  VALUES
    ('Chakki Atta (Fine/Maida)', 'bori (50kg)', 4800, 'Flour'),
    ('Cooking Ghee (Dalda/Kisan)', 'tin (16L)', 8200, 'Oil & Ghee'),
    ('Cooking Oil', 'can (16L)', 8500, 'Oil & Ghee'),
    ('Barik White Channay', 'kg', 280, 'Pulses'),
    ('Eggs (Murghi Desi/Farm)', 'crate (30 pcs)', 720, 'Poultry'),
    ('Fresh Whole Milk (Bhains)', 'liter', 210, 'Dairy'),
    ('Tea Leaf (Danedar Patti)', 'kg', 1650, 'Beverages'),
    ('Sugar (Cheeni)', 'kg', 150, 'Groceries'),
    ('Yogurt (Dahi)', 'kg', 240, 'Dairy'),
    ('Onions (Piaz)', 'kg', 90, 'Vegetables'),
    ('Potatoes (Aloo)', 'kg', 75, 'Vegetables'),
    ('Green Chillies & Ginger', 'kg', 350, 'Spices'),
    ('Chaat Masala & Mix Masalay', 'packet', 180, 'Spices'),
    ('Takeaway Boxes & Bags', 'pack', 650, 'Packaging')
) AS v(name, unit, default_price, category)
WHERE NOT EXISTS (SELECT 1 FROM raw_materials LIMIT 1);

-- Seed initial sample vendors if empty
INSERT INTO vendors (name, phone, category, address, current_balance)
SELECT name, phone, category, address, current_balance FROM (
  VALUES
    ('Madina Atta Chakki', '0300-1234567', 'Flour', 'Ghalla Mandi, Hasilpur', 0),
    ('Haji Ghee & Oil Traders', '0301-9876543', 'Oil & Ghee', 'Main Bazar, Hasilpur', 0),
    ('Al-Noor Dairy Farm (Milk & Dahi)', '0302-5551234', 'Dairy', 'Hasilpur Road', 0),
    ('Bismillah Poultry & Egg Farm', '0303-7778899', 'Poultry', 'Vehari Road', 0)
) AS v(name, phone, category, address, current_balance)
WHERE NOT EXISTS (SELECT 1 FROM vendors LIMIT 1);
