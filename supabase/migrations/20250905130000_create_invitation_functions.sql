-- Function to get invitation details by token
-- This function is callable by anonymous users but only returns data for valid, pending invitations.
CREATE OR REPLACE FUNCTION public.get_invitation_details_by_token(p_token TEXT)
RETURNS TABLE(email TEXT, role public.user_role, canteen_id UUID, status public.invitation_status, expires_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT i.email, i.role, i.canteen_id, i.status, i.expires_at
  FROM public.invitations i
  WHERE i.token = p_token;
END;
$$;

-- Function to mark an invitation as accepted
-- This should only be called after a user has successfully signed up.
CREATE OR REPLACE FUNCTION public.mark_invitation_accepted(p_token TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.invitations
  SET status = 'accepted'
  WHERE token = p_token;
END;
$$;
