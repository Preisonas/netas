DROP POLICY IF EXISTS "Admin can update any profile" ON public.profiles;
CREATE POLICY "Admin can update any profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (is_owner())
WITH CHECK (is_owner());