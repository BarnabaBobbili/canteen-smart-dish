-- Security hardening to prevent cross-canteen data access via self-edited profiles
-- 1) Helper functions to read current user's role and canteen with SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS public.user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_current_user_canteen_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT canteen_id FROM public.profiles WHERE user_id = auth.uid();
$$;

-- 2) Tighten UPDATE policy on profiles to prevent users switching canteen or elevating role
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can update their own profile (safe)"
ON public.profiles
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND (
    (
      -- Non-owners can update only if canteen_id and role remain unchanged
      canteen_id IS NOT DISTINCT FROM public.get_current_user_canteen_id()
      AND role IS NOT DISTINCT FROM public.get_current_user_role()
    )
    OR public.get_current_user_role() = 'owner'
  )
);

-- Note: Orders RLS already restricts access to staff whose canteen matches orders.canteen_id.
-- The above change removes the ability for staff to change their profile.canteen_id to another canteen,
-- closing the data exfiltration vector without breaking existing flows.