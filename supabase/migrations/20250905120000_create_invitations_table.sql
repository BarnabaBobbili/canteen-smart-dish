-- Create enum for invitation status
CREATE TYPE public.invitation_status AS ENUM ('pending', 'accepted', 'expired');

-- Create invitations table
CREATE TABLE public.invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  canteen_id UUID NOT NULL REFERENCES public.canteens(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role public.user_role NOT NULL,
  token TEXT NOT NULL UNIQUE,
  status public.invitation_status NOT NULL DEFAULT 'pending',
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now() + interval '7 days'
);

-- Add an index on email and token for faster lookups
CREATE INDEX idx_invitations_email ON public.invitations(email);
CREATE INDEX idx_invitations_token ON public.invitations(token);

-- Add a partial unique index to prevent duplicate pending invitations
CREATE UNIQUE INDEX unique_pending_invitation_idx ON public.invitations (canteen_id, email) WHERE (status = 'pending');

-- Enable Row Level Security
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for invitations
CREATE POLICY "Owners can create invitations for their canteen"
ON public.invitations FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
    AND p.canteen_id = invitations.canteen_id
    AND p.role = 'owner'
  )
  AND invited_by = auth.uid()
);

CREATE POLICY "Owners and managers can view invitations for their canteen"
ON public.invitations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
    AND p.canteen_id = invitations.canteen_id
    AND p.role IN ('owner', 'manager')
  )
);

CREATE POLICY "Owners can delete pending invitations for their canteen"
ON public.invitations FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
    AND p.canteen_id = invitations.canteen_id
    AND p.role = 'owner'
  )
  AND status = 'pending'
);
