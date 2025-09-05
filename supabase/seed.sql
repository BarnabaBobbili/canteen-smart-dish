-- Canteen Management System Seed Data
--
-- Note: This seed script uses placeholder UUIDs.
-- To use this script, you should:
-- 1. Sign up a new user in the application (this will be the owner).
-- 2. Get the `id` of this new user from the `auth.users` table in your Supabase dashboard.
-- 3. Replace the placeholder '00000000-0000-0000-0000-000000000001' with the actual owner's user ID.
-- 4. For other staff members, you can invite them through the app, or manually create users and replace their placeholder UUIDs here.

-- Insert a Canteen
INSERT INTO public.canteens (id, name, owner_id, address, phone, description)
VALUES ('10000000-0000-0000-0000-000000000001', 'TFS Canteen', '00000000-0000-0000-0000-000000000001', '123 Main St, Anytown, USA', '555-1234', 'The best canteen in town.');

-- Insert Profiles for staff members
-- The owner's user_id should match the one in the canteens table and your auth.users table
INSERT INTO public.profiles (user_id, email, full_name, role, canteen_id)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'owner@example.com', 'Canteen Owner', 'owner', '10000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000002', 'manager@example.com', 'Canteen Manager', 'manager', '10000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000003', 'chef@example.com', 'Head Chef', 'chef', '10000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000004', 'cashier@example.com', 'Lead Cashier', 'cashier', '10000000-0000-0000-0000-000000000001');

-- Insert Categories
INSERT INTO public.categories (id, canteen_id, name, description)
VALUES
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Main Course', 'Hearty and delicious main courses.'),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Snacks', 'Quick and tasty snacks.'),
  ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 'Beverages', 'Cool and refreshing drinks.');

-- Insert Menu Items
INSERT INTO public.menu_items (canteen_id, category_id, name, description, price, preparation_time)
VALUES
  ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Chicken Biryani', 'Aromatic rice dish with tender chicken.', 150.00, 25),
  ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Paneer Butter Masala', 'Creamy and rich paneer curry.', 120.00, 20),
  ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', 'Samosa', 'Crispy pastry filled with spiced potatoes.', 15.00, 10),
  ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', 'Veg Sandwich', 'Healthy and fresh vegetable sandwich.', 40.00, 5),
  ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000003', 'Masala Chai', 'Spiced tea.', 10.00, 5),
  ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000003', 'Fresh Lime Soda', 'Sweet and salty lime soda.', 25.00, 3);

-- Insert Orders and Order Items
-- To make this easier, we'll get the menu item IDs first
DO $$
DECLARE
    biryani_id UUID;
    paneer_id UUID;
    samosa_id UUID;
    chai_id UUID;
    order1_id UUID;
    order2_id UUID;
    order3_id UUID;
BEGIN
    SELECT id INTO biryani_id FROM public.menu_items WHERE name = 'Chicken Biryani';
    SELECT id INTO paneer_id FROM public.menu_items WHERE name = 'Paneer Butter Masala';
    SELECT id INTO samosa_id FROM public.menu_items WHERE name = 'Samosa';
    SELECT id INTO chai_id FROM public.menu_items WHERE name = 'Masala Chai';

    -- Order 1 (Completed)
    INSERT INTO public.orders (id, canteen_id, customer_name, total_amount, status, payment_method, served_by, created_at)
    VALUES ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Ankit', 165.00, 'completed', 'upi', '00000000-0000-0000-0000-000000000004', now() - interval '1 day')
    RETURNING id INTO order1_id;

    INSERT INTO public.order_items (order_id, menu_item_id, quantity, unit_price, total_price)
    VALUES
      (order1_id, biryani_id, 1, 150.00, 150.00),
      (order1_id, samosa_id, 1, 15.00, 15.00);

    -- Order 2 (Preparing)
    INSERT INTO public.orders (id, canteen_id, customer_name, total_amount, status, payment_method, served_by, created_at)
    VALUES ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Bhavna', 130.00, 'preparing', 'cash', '00000000-0000-0000-0000-000000000004', now() - interval '10 minutes')
    RETURNING id INTO order2_id;

    INSERT INTO public.order_items (order_id, menu_item_id, quantity, unit_price, total_price)
    VALUES
      (order2_id, paneer_id, 1, 120.00, 120.00),
      (order2_id, chai_id, 1, 10.00, 10.00);

    -- Order 3 (Pending)
    INSERT INTO public.orders (id, canteen_id, customer_name, total_amount, status, payment_method, served_by, created_at)
    VALUES ('30000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 'Chirag', 50.00, 'pending', 'card', '00000000-0000-0000-0000-000000000004', now() - interval '2 minutes')
    RETURNING id INTO order3_id;

    INSERT INTO public.order_items (order_id, menu_item_id, quantity, unit_price, total_price)
    VALUES
      (order3_id, chai_id, 5, 10.00, 50.00);
END $$;
