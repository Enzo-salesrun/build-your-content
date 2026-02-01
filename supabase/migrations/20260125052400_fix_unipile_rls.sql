-- Migration: Fix RLS policies for unipile_accounts
-- Problem: The current policies restrict access to profile_id = auth.uid()
-- but the Team page needs to view unipile_accounts for all team members (internal profiles)
-- Solution: Allow authenticated users to view unipile_accounts for internal team members

-- Drop the restrictive SELECT policy
DROP POLICY IF EXISTS "Users can view own accounts" ON public.unipile_accounts;

-- Create a more permissive policy that allows viewing unipile_accounts
-- for profiles that the user has access to (all internal team members)
CREATE POLICY "Authenticated users can view team unipile accounts" ON public.unipile_accounts
  FOR SELECT USING (
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = profile_id AND p.type = 'internal'
    )
  );

-- Keep the INSERT policy but make it work for team member connections
DROP POLICY IF EXISTS "Users can insert own accounts" ON public.unipile_accounts;
CREATE POLICY "Authenticated users can insert unipile accounts" ON public.unipile_accounts
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = profile_id AND p.type = 'internal'
    )
  );

-- Keep UPDATE policy for team members
DROP POLICY IF EXISTS "Users can update own accounts" ON public.unipile_accounts;
CREATE POLICY "Authenticated users can update unipile accounts" ON public.unipile_accounts
  FOR UPDATE USING (
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = profile_id AND p.type = 'internal'
    )
  );

-- Keep DELETE policy for team members
DROP POLICY IF EXISTS "Users can delete own accounts" ON public.unipile_accounts;
CREATE POLICY "Authenticated users can delete unipile accounts" ON public.unipile_accounts
  FOR DELETE USING (
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = profile_id AND p.type = 'internal'
    )
  );

COMMENT ON POLICY "Authenticated users can view team unipile accounts" ON public.unipile_accounts 
  IS 'Allows authenticated users to view LinkedIn connection status for internal team members';
