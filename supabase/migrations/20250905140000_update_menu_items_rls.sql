-- Drop the existing broad policy for menu_items to replace it with more granular ones.
-- Note: Dropping a policy requires temporarily disabling RLS if it's the last policy for a certain command.
-- The SELECT policy will remain, so this should be safe.
DROP POLICY IF EXISTS "Canteen staff can manage menu items" ON public.menu_items;

-- The SELECT policy "Staff can view menu items" is still in place and is correct.

-- Create new granular policies for INSERT, UPDATE, DELETE

-- Policy for INSERT
CREATE POLICY "Owners and managers can create menu items"
ON public.menu_items FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
    AND p.canteen_id = menu_items.canteen_id
    AND p.role IN ('owner', 'manager')
  )
);

-- Policy for UPDATE
-- Owners and managers can update all columns of menu items in their canteen.
CREATE POLICY "Owners and managers can update menu items"
ON public.menu_items FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
    AND p.canteen_id = menu_items.canteen_id
    AND p.role IN ('owner', 'manager')
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
    AND p.canteen_id = menu_items.canteen_id
    AND p.role IN ('owner', 'manager')
  )
);


-- Chefs can also update menu items in their canteen.
-- The UI will restrict them to only updating the 'is_available' field.
CREATE POLICY "Chefs can update menu items"
ON public.menu_items FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
    AND p.canteen_id = menu_items.canteen_id
    AND p.role = 'chef'
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
    AND p.canteen_id = menu_items.canteen_id
    AND p.role = 'chef'
  )
);

-- Policy for DELETE
CREATE POLICY "Owners and managers can delete menu items"
ON public.menu_items FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
    AND p.canteen_id = menu_items.canteen_id
    AND p.role IN ('owner', 'manager')
  )
);
