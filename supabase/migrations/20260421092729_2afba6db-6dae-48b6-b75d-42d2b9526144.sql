-- Block client-side credit edits. Only service_role (edge functions) or owners can change credits.
CREATE OR REPLACE FUNCTION public.prevent_client_credit_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.credits IS DISTINCT FROM OLD.credits THEN
    -- Allow if no auth context (service role / triggers) or caller is owner
    IF auth.uid() IS NULL OR public.is_owner() THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'Not allowed to modify credits';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_protect_credits ON public.profiles;
CREATE TRIGGER profiles_protect_credits
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_client_credit_change();