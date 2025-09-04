-- Create enum for user roles
CREATE TYPE public.user_role AS ENUM ('owner', 'manager', 'cashier', 'chef', 'inventory_handler');

-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'cashier',
  canteen_id UUID,
  phone TEXT,
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create canteens table
CREATE TABLE public.canteens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  address TEXT,
  phone TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Update profiles to reference canteens
ALTER TABLE public.profiles ADD CONSTRAINT fk_canteen 
FOREIGN KEY (canteen_id) REFERENCES public.canteens(id) ON DELETE SET NULL;

-- Create categories table
CREATE TABLE public.categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  canteen_id UUID NOT NULL REFERENCES public.canteens(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create menu_items table
CREATE TABLE public.menu_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  canteen_id UUID NOT NULL REFERENCES public.canteens(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  image_url TEXT,
  is_available BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  preparation_time INTEGER DEFAULT 0, -- in minutes
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create orders table
CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  canteen_id UUID NOT NULL REFERENCES public.canteens(id) ON DELETE CASCADE,
  customer_name TEXT,
  customer_phone TEXT,
  total_amount DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'preparing', 'ready', 'completed', 'cancelled')),
  order_type TEXT DEFAULT 'dine_in' CHECK (order_type IN ('dine_in', 'takeaway', 'online')),
  payment_method TEXT CHECK (payment_method IN ('cash', 'card', 'upi', 'wallet')),
  served_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create order_items table
CREATE TABLE public.order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  menu_item_id UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  special_instructions TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canteens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON public.profiles
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for canteens
CREATE POLICY "Owners can manage their canteens" ON public.canteens
FOR ALL USING (auth.uid() = owner_id);

CREATE POLICY "Staff can view their canteen" ON public.canteens
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND canteen_id = public.canteens.id
  )
);

-- Create RLS policies for categories
CREATE POLICY "Canteen staff can manage categories" ON public.categories
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.canteens c ON p.canteen_id = c.id
    WHERE p.user_id = auth.uid() AND c.id = categories.canteen_id
    AND p.role IN ('owner', 'manager')
  )
);

CREATE POLICY "Staff can view categories" ON public.categories
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.canteens c ON p.canteen_id = c.id
    WHERE p.user_id = auth.uid() AND c.id = categories.canteen_id
  )
);

-- Create RLS policies for menu_items
CREATE POLICY "Canteen staff can manage menu items" ON public.menu_items
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.canteens c ON p.canteen_id = c.id
    WHERE p.user_id = auth.uid() AND c.id = menu_items.canteen_id
    AND p.role IN ('owner', 'manager', 'chef')
  )
);

CREATE POLICY "Staff can view menu items" ON public.menu_items
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.canteens c ON p.canteen_id = c.id
    WHERE p.user_id = auth.uid() AND c.id = menu_items.canteen_id
  )
);

-- Create RLS policies for orders
CREATE POLICY "Canteen staff can manage orders" ON public.orders
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.canteens c ON p.canteen_id = c.id
    WHERE p.user_id = auth.uid() AND c.id = orders.canteen_id
  )
);

-- Create RLS policies for order_items
CREATE POLICY "Staff can manage order items" ON public.order_items
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.orders o
    JOIN public.profiles p ON p.canteen_id = o.canteen_id
    WHERE o.id = order_items.order_id AND p.user_id = auth.uid()
  )
);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_canteens_updated_at
  BEFORE UPDATE ON public.canteens
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_categories_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_menu_items_updated_at
  BEFORE UPDATE ON public.menu_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();