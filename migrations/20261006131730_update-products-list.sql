-- Update products list and delete old products

-- 1. Ensure foreign key on order_items has ON DELETE SET NULL
ALTER TABLE order_items DROP CONSTRAINT IF EXISTS order_items_product_id_fkey;
ALTER TABLE order_items ADD CONSTRAINT order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL;

-- 2. Clear old product associations and products
DELETE FROM product_addon_groups;
DELETE FROM products;

-- 3. Insert the updated 14 items with prices
INSERT INTO products (id, category_id, name, short_name, selling_price, availability, is_active, sort_order)
VALUES
  -- Nashta Special
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111103', 'Channay', 'Channay', 260.00, 'available', true, 1),
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111103', 'Daleem', 'Daleem', 260.00, 'available', true, 2),
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111103', 'Qoftay', 'Qoftay', 400.00, 'available', true, 3),
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111103', 'Choley Puri', 'Choley Puri', 140.00, 'available', true, 4),
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111103', 'Maghaz', 'Maghaz', 500.00, 'available', true, 5),
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111103', 'Paye', 'Paye', 1200.00, 'available', true, 6),

  -- Parathas
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111101', 'Paratha Sada', 'Paratha Sada', 70.00, 'available', true, 7),
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111101', 'Paratha Aloo Wala', 'Aloo Paratha', 100.00, 'available', true, 8),

  -- Eggs
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111102', 'Anda Omelette', 'Omelette', 60.00, 'available', true, 9),
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111102', 'Anda Boiled Hua', 'Boiled Egg', 50.00, 'available', true, 10),

  -- Naan & Extras
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111106', 'Sada Naan', 'Sada Naan', 30.00, 'available', true, 11),
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111106', 'Roghni Naan', 'Roghni Naan', 70.00, 'available', true, 12),
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111106', 'Raita', 'Raita', 50.00, 'available', true, 13),

  -- Chai
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111104', 'Chai', 'Chai', 70.00, 'available', true, 14);
