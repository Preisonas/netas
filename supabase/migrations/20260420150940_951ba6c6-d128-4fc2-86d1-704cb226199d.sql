CREATE TABLE IF NOT EXISTS public.discount_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  discount_percent integer not null check (discount_percent > 0 and discount_percent <= 100),
  expires_at timestamptz,
  max_uses integer,
  uses integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

ALTER TABLE public.discount_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view discount codes"
  ON public.discount_codes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Owner can insert discount codes"
  ON public.discount_codes FOR INSERT
  TO authenticated
  WITH CHECK (public.is_owner());

CREATE POLICY "Owner can update discount codes"
  ON public.discount_codes FOR UPDATE
  TO authenticated
  USING (public.is_owner());

CREATE POLICY "Owner can delete discount codes"
  ON public.discount_codes FOR DELETE
  TO authenticated
  USING (public.is_owner());

CREATE TRIGGER update_discount_codes_updated_at
  BEFORE UPDATE ON public.discount_codes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();