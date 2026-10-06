-- Migration: 20261001070136_init-schema.sql
-- Malik Tasty Nashta Point - Core Database Schema
-- Production PostgreSQL Schema for InsForge

-- 1. ROLES & PERMISSIONS
CREATE TABLE IF NOT EXISTS roles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS permissions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  module TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id TEXT NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

-- 2. USER PROFILES
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  display_name TEXT,
  role TEXT NOT NULL DEFAULT 'cashier' CHECK (role IN ('admin', 'cashier')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  pin_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. BUSINESS SETTINGS
CREATE TABLE IF NOT EXISTS business_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  business_name TEXT NOT NULL DEFAULT 'Malik Tasty Nashta Point',
  location TEXT NOT NULL DEFAULT 'Vehari Road, Hasilpur, Punjab, Pakistan',
  phone TEXT NOT NULL DEFAULT '0300-1234567',
  currency TEXT NOT NULL DEFAULT 'PKR',
  currency_symbol TEXT NOT NULL DEFAULT 'Rs.',
  timezone TEXT NOT NULL DEFAULT 'Asia/Karachi',
  is_setup_completed BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. POS SETTINGS & FEATURE FLAGS
CREATE TABLE IF NOT EXISTS pos_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  enable_discounts BOOLEAN NOT NULL DEFAULT TRUE,
  max_cashier_discount_percent NUMERIC(5,2) NOT NULL DEFAULT 15.00,
  require_pin_above_percent NUMERIC(5,2) NOT NULL DEFAULT 20.00,
  allow_fixed_discount BOOLEAN NOT NULL DEFAULT TRUE,
  allow_item_discount BOOLEAN NOT NULL DEFAULT TRUE,
  enable_split_payment BOOLEAN NOT NULL DEFAULT TRUE,
  enable_split_bill BOOLEAN NOT NULL DEFAULT FALSE,
  enable_hold_orders BOOLEAN NOT NULL DEFAULT TRUE,
  enable_item_notes BOOLEAN NOT NULL DEFAULT TRUE,
  enable_addons BOOLEAN NOT NULL DEFAULT TRUE,
  enable_tax BOOLEAN NOT NULL DEFAULT FALSE,
  tax_rate_percent NUMERIC(5,2) NOT NULL DEFAULT 0.00,
  enable_service_charge BOOLEAN NOT NULL DEFAULT FALSE,
  service_charge_percent NUMERIC(5,2) NOT NULL DEFAULT 0.00,
  enable_rounding BOOLEAN NOT NULL DEFAULT TRUE,
  require_open_register BOOLEAN NOT NULL DEFAULT TRUE,
  require_refund_approval BOOLEAN NOT NULL DEFAULT FALSE,
  require_void_approval BOOLEAN NOT NULL DEFAULT TRUE,
  require_refund_reason BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. RECEIPT SETTINGS
CREATE TABLE IF NOT EXISTS receipt_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  business_name TEXT NOT NULL DEFAULT 'MALIK TASTY NASHTA POINT',
  address TEXT NOT NULL DEFAULT 'Vehari Road, Hasilpur',
  phone TEXT NOT NULL DEFAULT '0300-1234567',
  receipt_prefix TEXT NOT NULL DEFAULT 'MTN-',
  order_prefix TEXT NOT NULL DEFAULT 'ORD-',
  refund_prefix TEXT NOT NULL DEFAULT 'REF-',
  header_message TEXT DEFAULT 'Fresh & Crispy Nashta Everyday',
  footer_message TEXT NOT NULL DEFAULT 'Thank You - Visit Again!',
  show_cashier BOOLEAN NOT NULL DEFAULT TRUE,
  show_customer BOOLEAN NOT NULL DEFAULT TRUE,
  show_payment_method BOOLEAN NOT NULL DEFAULT TRUE,
  show_discount BOOLEAN NOT NULL DEFAULT TRUE,
  auto_print BOOLEAN NOT NULL DEFAULT FALSE,
  paper_width_mm INTEGER NOT NULL DEFAULT 80,
  print_copies INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. PAYMENT METHODS
CREATE TABLE IF NOT EXISTS payment_methods (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('cash', 'digital', 'card')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  require_reference BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. CATEGORIES
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. PRODUCTS
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  short_name TEXT,
  sku TEXT,
  product_code TEXT,
  description TEXT,
  selling_price NUMERIC(12,2) NOT NULL CHECK (selling_price >= 0),
  cost_price NUMERIC(12,2) CHECK (cost_price >= 0),
  availability TEXT NOT NULL DEFAULT 'available' CHECK (availability IN ('available', 'sold_out', 'hidden', 'inactive')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. ADD-ON GROUPS & ADDONS
CREATE TABLE IF NOT EXISTS addon_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS addons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  addon_group_id UUID NOT NULL REFERENCES addon_groups(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (price >= 0),
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS product_addon_groups (
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  addon_group_id UUID NOT NULL REFERENCES addon_groups(id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, addon_group_id)
);

-- 10. QUICK NOTES
CREATE TABLE IF NOT EXISTS quick_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  text TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- 11. CUSTOMERS
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. REGISTER SESSIONS
CREATE TABLE IF NOT EXISTS register_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  user_name_snapshot TEXT NOT NULL,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  opening_amount NUMERIC(12,2) NOT NULL CHECK (opening_amount >= 0),
  closed_at TIMESTAMPTZ,
  expected_amount NUMERIC(12,2),
  actual_amount NUMERIC(12,2),
  difference NUMERIC(12,2),
  closing_note TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13. REGISTER TRANSACTIONS
CREATE TABLE IF NOT EXISTS register_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  register_session_id UUID NOT NULL REFERENCES register_sessions(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('OPENING', 'SALE', 'REFUND', 'CASH_IN', 'CASH_OUT', 'ADJUSTMENT')),
  amount NUMERIC(12,2) NOT NULL,
  order_id UUID,
  refund_id UUID,
  reason TEXT,
  note TEXT,
  created_by UUID REFERENCES auth.users(id),
  user_name_snapshot TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 14. ORDERS
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT NOT NULL UNIQUE,
  receipt_number TEXT NOT NULL UNIQUE,
  register_session_id UUID REFERENCES register_sessions(id),
  customer_id UUID REFERENCES customers(id),
  customer_name_snapshot TEXT,
  customer_phone_snapshot TEXT,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'held', 'refunded', 'partially_refunded', 'voided')),
  subtotal NUMERIC(12,2) NOT NULL CHECK (subtotal >= 0),
  discount_type TEXT CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value NUMERIC(12,2) DEFAULT 0.00,
  discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (discount_amount >= 0),
  tax_rate_percent NUMERIC(5,2) DEFAULT 0.00,
  tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (tax_amount >= 0),
  service_charge_percent NUMERIC(5,2) DEFAULT 0.00,
  service_charge_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (service_charge_amount >= 0),
  rounding_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  grand_total NUMERIC(12,2) NOT NULL CHECK (grand_total >= 0),
  total_paid NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  change_returned NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  notes TEXT,
  void_reason TEXT,
  voided_at TIMESTAMPTZ,
  voided_by UUID REFERENCES auth.users(id),
  reprint_count INTEGER NOT NULL DEFAULT 0,
  idempotency_key TEXT UNIQUE,
  created_by UUID REFERENCES auth.users(id),
  cashier_name_snapshot TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 15. ORDER ITEMS
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  product_name_snapshot TEXT NOT NULL,
  unit_price NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  item_subtotal NUMERIC(12,2) NOT NULL CHECK (item_subtotal >= 0),
  addons_total NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (addons_total >= 0),
  item_discount NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (item_discount >= 0),
  line_total NUMERIC(12,2) NOT NULL CHECK (line_total >= 0),
  note TEXT,
  refunded_quantity INTEGER NOT NULL DEFAULT 0 CHECK (refunded_quantity >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 16. ORDER ITEM ADDONS
CREATE TABLE IF NOT EXISTS order_item_addons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_item_id UUID NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
  addon_id UUID REFERENCES addons(id),
  addon_name_snapshot TEXT NOT NULL,
  price_snapshot NUMERIC(12,2) NOT NULL CHECK (price_snapshot >= 0),
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  line_total NUMERIC(12,2) NOT NULL CHECK (line_total >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 17. PAYMENTS
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  payment_method_id TEXT NOT NULL REFERENCES payment_methods(id),
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  reference_number TEXT,
  amount_tendered NUMERIC(12,2),
  change_returned NUMERIC(12,2),
  status TEXT NOT NULL DEFAULT 'completed',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 18. HELD ORDERS
CREATE TABLE IF NOT EXISTS held_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hold_number TEXT NOT NULL UNIQUE,
  customer_name TEXT,
  note TEXT,
  cart_payload JSONB NOT NULL,
  subtotal NUMERIC(12,2) NOT NULL,
  discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  grand_total NUMERIC(12,2) NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  cashier_name_snapshot TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'held' CHECK (status IN ('held', 'resumed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resumed_at TIMESTAMPTZ
);

-- 19. REFUNDS
CREATE TABLE IF NOT EXISTS refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  refund_number TEXT NOT NULL UNIQUE,
  order_id UUID NOT NULL REFERENCES orders(id),
  register_session_id UUID REFERENCES register_sessions(id),
  refund_type TEXT NOT NULL CHECK (refund_type IN ('full', 'partial')),
  total_refund_amount NUMERIC(12,2) NOT NULL CHECK (total_refund_amount > 0),
  refund_method TEXT NOT NULL,
  reason TEXT NOT NULL,
  notes TEXT,
  approved_by UUID REFERENCES auth.users(id),
  created_by UUID REFERENCES auth.users(id),
  user_name_snapshot TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS refund_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  refund_id UUID NOT NULL REFERENCES refunds(id) ON DELETE CASCADE,
  order_item_id UUID NOT NULL REFERENCES order_items(id),
  product_name_snapshot TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(12,2) NOT NULL,
  refund_amount NUMERIC(12,2) NOT NULL CHECK (refund_amount > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 20. AUDIT LOGS
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  user_name TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  description TEXT NOT NULL,
  old_values JSONB,
  new_values JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 21. SEQUENTIAL COUNTERS FOR NUMBER GENERATION
CREATE SEQUENCE IF NOT EXISTS receipt_seq START WITH 1001;
CREATE SEQUENCE IF NOT EXISTS order_seq START WITH 1;
CREATE SEQUENCE IF NOT EXISTS refund_seq START WITH 101;
CREATE SEQUENCE IF NOT EXISTS hold_seq START WITH 1;

-- 22. PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_receipt_number ON orders(receipt_number);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_refunds_order_id ON refunds(order_id);
CREATE INDEX IF NOT EXISTS idx_register_tx_session ON register_transactions(register_session_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- 23. SEED DEFAULT DATA
-- Roles
INSERT INTO roles (id, name, description) VALUES
  ('admin', 'Administrator', 'Full system access and configurations'),
  ('cashier', 'Cashier', 'Billing, orders, register operations and refunds')
ON CONFLICT (id) DO NOTHING;

-- Permissions
INSERT INTO permissions (id, name, description, module) VALUES
  ('pos.access', 'Access POS Screen', 'Can open POS interface', 'pos'),
  ('order.create', 'Create Orders', 'Can process billing and create orders', 'orders'),
  ('order.hold', 'Hold Orders', 'Can place orders on hold and resume them', 'orders'),
  ('order.cancel', 'Cancel Unpaid Cart', 'Can clear or cancel unpaid orders', 'orders'),
  ('order.void', 'Void Order', 'Can void completed orders with audit entry', 'orders'),
  ('refund.create', 'Create Refund', 'Can process full and partial refunds', 'refunds'),
  ('discount.apply', 'Apply Standard Discount', 'Can apply cashier discount within limit', 'discounts'),
  ('discount.override', 'Override Discount Limit', 'Can approve discounts above threshold', 'discounts'),
  ('receipt.print', 'Print Receipt', 'Can print 80mm thermal receipts', 'receipts'),
  ('receipt.reprint', 'Reprint Receipt', 'Can reprint duplicate receipts', 'receipts'),
  ('product.create', 'Create Products', 'Can add new menu items', 'products'),
  ('product.update', 'Update Products', 'Can modify prices, names, and availability', 'products'),
  ('category.manage', 'Manage Categories', 'Can add, edit, or reorder categories', 'categories'),
  ('register.open', 'Open Cash Register', 'Can perform shift opening count', 'register'),
  ('register.close', 'Close Cash Register', 'Can perform shift closing reconciliation', 'register'),
  ('cash.adjust', 'Cash In / Cash Out', 'Can record miscellaneous cash drawer adjustments', 'register'),
  ('reports.view', 'View Reports', 'Can inspect sales, payments, and product reports', 'reports'),
  ('settings.manage', 'Manage Settings', 'Can modify business, POS, and receipt settings', 'settings'),
  ('users.manage', 'Manage Users', 'Can manage cashier accounts and roles', 'users')
ON CONFLICT (id) DO NOTHING;

-- Role Permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT 'admin', id FROM permissions
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id) VALUES
  ('cashier', 'pos.access'),
  ('cashier', 'order.create'),
  ('cashier', 'order.hold'),
  ('cashier', 'order.cancel'),
  ('cashier', 'discount.apply'),
  ('cashier', 'receipt.print'),
  ('cashier', 'receipt.reprint'),
  ('cashier', 'register.open'),
  ('cashier', 'register.close'),
  ('cashier', 'cash.adjust'),
  ('cashier', 'refund.create')
ON CONFLICT DO NOTHING;

-- Business Settings
INSERT INTO business_settings (id, business_name, location, phone, currency, currency_symbol, timezone, is_setup_completed)
VALUES ('default', 'Malik Tasty Nashta Point', 'Vehari Road, Hasilpur, Punjab, Pakistan', '0300-1234567', 'PKR', 'Rs.', 'Asia/Karachi', TRUE)
ON CONFLICT (id) DO NOTHING;

-- POS Settings
INSERT INTO pos_settings (id, enable_discounts, max_cashier_discount_percent, require_pin_above_percent, allow_fixed_discount, allow_item_discount, enable_split_payment, enable_hold_orders, enable_item_notes, enable_addons, enable_rounding, require_open_register)
VALUES ('default', TRUE, 15.00, 20.00, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE)
ON CONFLICT (id) DO NOTHING;

-- Receipt Settings
INSERT INTO receipt_settings (id, business_name, address, phone, receipt_prefix, order_prefix, refund_prefix, header_message, footer_message, paper_width_mm, print_copies)
VALUES ('default', 'MALIK TASTY NASHTA POINT', 'Vehari Road, Hasilpur', '0300-1234567', 'MTN-', 'ORD-', 'REF-', 'Fresh & Crispy Nashta Everyday', 'Thank You - Visit Again!', 80, 1)
ON CONFLICT (id) DO NOTHING;

-- Payment Methods
INSERT INTO payment_methods (id, name, type, is_active, sort_order, is_default, require_reference) VALUES
  ('cash', 'Cash', 'cash', TRUE, 1, TRUE, FALSE),
  ('jazzcash', 'JazzCash', 'digital', TRUE, 2, FALSE, FALSE),
  ('easypaisa', 'Easypaisa', 'digital', TRUE, 3, FALSE, FALSE),
  ('card', 'Card / POS Terminal', 'card', TRUE, 4, FALSE, FALSE)
ON CONFLICT (id) DO NOTHING;

-- Quick Notes
INSERT INTO quick_notes (text, sort_order, is_active) VALUES
  ('Mirch kam', 1, TRUE),
  ('Oil kam', 2, TRUE),
  ('Extra crispy', 3, TRUE),
  ('No onion', 4, TRUE),
  ('Chai strong', 5, TRUE),
  ('Sugar kam', 6, TRUE),
  ('Meetha zyada', 7, TRUE),
  ('Garma garam', 8, TRUE)
ON CONFLICT (text) DO NOTHING;

-- Categories
INSERT INTO categories (id, name, slug, sort_order, is_active) VALUES
  ('11111111-1111-1111-1111-111111111101', 'Paratha', 'paratha', 1, TRUE),
  ('11111111-1111-1111-1111-111111111102', 'Eggs', 'eggs', 2, TRUE),
  ('11111111-1111-1111-1111-111111111103', 'Nashta Special', 'nashta-special', 3, TRUE),
  ('11111111-1111-1111-1111-111111111104', 'Chai & Tea', 'tea', 4, TRUE),
  ('11111111-1111-1111-1111-111111111105', 'Cold Drinks & Lassi', 'drinks', 5, TRUE),
  ('11111111-1111-1111-1111-111111111106', 'Roti & Extras', 'extras', 6, TRUE)
ON CONFLICT (id) DO NOTHING;

-- Addon Groups
INSERT INTO addon_groups (id, name, description, sort_order, is_active) VALUES
  ('22222222-2222-2222-2222-222222222201', 'Paratha & Egg Extras', 'Extra toppings and sides for paratha', 1, TRUE),
  ('22222222-2222-2222-2222-222222222202', 'Nashta Sides', 'Additional sides for salan and chana', 2, TRUE)
ON CONFLICT (id) DO NOTHING;

-- Addons
INSERT INTO addons (id, addon_group_id, name, price, sort_order, is_active) VALUES
  ('33333333-3333-3333-3333-333333333301', '22222222-2222-2222-2222-222222222201', 'Extra Egg', 60.00, 1, TRUE),
  ('33333333-3333-3333-3333-333333333302', '22222222-2222-2222-2222-222222222201', 'Extra Makhan / Butter', 40.00, 2, TRUE),
  ('33333333-3333-3333-3333-333333333303', '22222222-2222-2222-2222-222222222201', 'Achar Special', 20.00, 3, TRUE),
  ('33333333-3333-3333-3333-333333333304', '22222222-2222-2222-2222-222222222202', 'Extra Chana Katori', 70.00, 4, TRUE),
  ('33333333-3333-3333-3333-333333333305', '22222222-2222-2222-2222-222222222202', 'Raita Cup', 30.00, 5, TRUE),
  ('33333333-3333-3333-3333-333333333306', '22222222-2222-2222-2222-222222222202', 'Salad Plate', 25.00, 6, TRUE)
ON CONFLICT (id) DO NOTHING;

-- Products
INSERT INTO products (id, category_id, name, short_name, selling_price, cost_price, availability, is_active, sort_order) VALUES
  -- Paratha
  ('44444444-4444-4444-4444-444444444401', '11111111-1111-1111-1111-111111111101', 'Plain Crispy Paratha', 'Plain Paratha', 80.00, 45.00, 'available', TRUE, 1),
  ('44444444-4444-4444-4444-444444444402', '11111111-1111-1111-1111-111111111101', 'Anda Paratha Roll', 'Anda Paratha', 180.00, 95.00, 'available', TRUE, 2),
  ('44444444-4444-4444-4444-444444444403', '11111111-1111-1111-1111-111111111101', 'Spicy Aloo Paratha', 'Aloo Paratha', 140.00, 70.00, 'available', TRUE, 3),
  ('44444444-4444-4444-4444-444444444404', '11111111-1111-1111-1111-111111111101', 'Special Malai Paratha', 'Special Paratha', 220.00, 110.00, 'available', TRUE, 4),
  ('44444444-4444-4444-4444-444444444405', '11111111-1111-1111-1111-111111111101', 'Lachha Paratha', 'Lachha Paratha', 100.00, 55.00, 'available', TRUE, 5),

  -- Eggs
  ('44444444-4444-4444-4444-444444444406', '11111111-1111-1111-1111-111111111102', 'Full Fry Egg', 'Full Fry', 60.00, 35.00, 'available', TRUE, 6),
  ('44444444-4444-4444-4444-444444444407', '11111111-1111-1111-1111-111111111102', 'Half Fry Desi Egg', 'Half Fry', 70.00, 40.00, 'available', TRUE, 7),
  ('44444444-4444-4444-4444-444444444408', '11111111-1111-1111-1111-111111111102', 'Pakistani Masala Omelette', 'Omelette', 80.00, 45.00, 'available', TRUE, 8),
  ('44444444-4444-4444-4444-444444444409', '11111111-1111-1111-1111-111111111102', 'Double Egg Cheese Omelette', 'Double Omelette', 150.00, 85.00, 'available', TRUE, 9),

  -- Nashta Special
  ('44444444-4444-4444-4444-444444444410', '11111111-1111-1111-1111-111111111103', 'Lahori Murgh Chana Plate', 'Murgh Chana', 220.00, 120.00, 'available', TRUE, 10),
  ('44444444-4444-4444-4444-444444444411', '11111111-1111-1111-1111-111111111103', 'Sada Chana Plate', 'Chana Plate', 150.00, 75.00, 'available', TRUE, 11),
  ('44444444-4444-4444-4444-444444444412', '11111111-1111-1111-1111-111111111103', 'Halwa Puri Thali (2 Puri + Halwa + Chana)', 'Halwa Puri Thali', 240.00, 115.00, 'available', TRUE, 12),
  ('44444444-4444-4444-4444-444444444413', '11111111-1111-1111-1111-111111111103', 'Single Garam Puri', 'Puri Single', 45.00, 20.00, 'available', TRUE, 13),
  ('44444444-4444-4444-4444-444444444414', '11111111-1111-1111-1111-111111111103', 'Suji Halwa Plate', 'Halwa Plate', 120.00, 50.00, 'available', TRUE, 14),
  ('44444444-4444-4444-4444-444444444415', '11111111-1111-1111-1111-111111111103', 'Nalli Nihari Plate', 'Nihari', 380.00, 220.00, 'available', TRUE, 15),
  ('44444444-4444-4444-4444-444444444416', '11111111-1111-1111-1111-111111111103', 'Special Bong Paye', 'Bong Paye', 420.00, 250.00, 'available', TRUE, 16),

  -- Chai & Tea
  ('44444444-4444-4444-4444-444444444417', '11111111-1111-1111-1111-111111111104', 'Karak Chai Special', 'Karak Chai', 80.00, 35.00, 'available', TRUE, 17),
  ('44444444-4444-4444-4444-444444444418', '11111111-1111-1111-1111-111111111104', 'Doodh Patti Extra Cream', 'Doodh Patti', 110.00, 55.00, 'available', TRUE, 18),
  ('44444444-4444-4444-4444-444444444419', '11111111-1111-1111-1111-111111111104', 'Sabz Chai / Peshawari Qahwa', 'Qahwa', 60.00, 25.00, 'available', TRUE, 19),

  -- Drinks & Lassi
  ('44444444-4444-4444-4444-444444444420', '11111111-1111-1111-1111-111111111105', 'Meethi Malai Lassi (Glass)', 'Meethi Lassi', 160.00, 80.00, 'available', TRUE, 20),
  ('44444444-4444-4444-4444-444444444421', '11111111-1111-1111-1111-111111111105', 'Namkeen Zeera Lassi', 'Namkeen Lassi', 150.00, 75.00, 'available', TRUE, 21),
  ('44444444-4444-4444-4444-444444444422', '11111111-1111-1111-1111-111111111105', 'Cold Drink Regular 345ml', 'Cold Drink', 90.00, 65.00, 'available', TRUE, 22),
  ('44444444-4444-4444-4444-444444444423', '11111111-1111-1111-1111-111111111105', 'Mineral Water 500ml', 'Mineral Water', 50.00, 30.00, 'available', TRUE, 23),

  -- Extras
  ('44444444-4444-4444-4444-444444444424', '11111111-1111-1111-1111-111111111106', 'Tandoori Sada Roti', 'Sada Roti', 25.00, 12.00, 'available', TRUE, 24),
  ('44444444-4444-4444-4444-444444444425', '11111111-1111-1111-1111-111111111106', 'Rogani Naan', 'Rogani Naan', 60.00, 30.00, 'available', TRUE, 25)
ON CONFLICT (id) DO NOTHING;

-- Link Parathas & Eggs to Add-on Group
INSERT INTO product_addon_groups (product_id, addon_group_id) VALUES
  ('44444444-4444-4444-4444-444444444401', '22222222-2222-2222-2222-222222222201'),
  ('44444444-4444-4444-4444-444444444402', '22222222-2222-2222-2222-222222222201'),
  ('44444444-4444-4444-4444-444444444403', '22222222-2222-2222-2222-222222222201'),
  ('44444444-4444-4444-4444-444444444404', '22222222-2222-2222-2222-222222222201'),
  ('44444444-4444-4444-4444-444444444405', '22222222-2222-2222-2222-222222222201'),
  ('44444444-4444-4444-4444-444444444410', '22222222-2222-2222-2222-222222222202'),
  ('44444444-4444-4444-4444-444444444411', '22222222-2222-2222-2222-222222222202'),
  ('44444444-4444-4444-4444-444444444412', '22222222-2222-2222-2222-222222222202')
ON CONFLICT DO NOTHING;
