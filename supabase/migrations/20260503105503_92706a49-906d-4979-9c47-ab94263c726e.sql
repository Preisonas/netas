
-- 1) VIP tiers: monthly EUR pricing for Stripe
ALTER TABLE public.vip_tiers
  ADD COLUMN IF NOT EXISTS eur_price numeric(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stripe_price_id text;

-- Seed eur_price from existing credit price if zero
UPDATE public.vip_tiers SET eur_price = price WHERE eur_price = 0;

-- 2) user_vips: track Stripe subscription
ALTER TABLE public.user_vips
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS gifter_user_id uuid,
  ADD COLUMN IF NOT EXISTS auto_renew boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS user_vips_stripe_sub_uniq
  ON public.user_vips (stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;

-- 3) pending_deliveries: allow gifts (recipient claims later)
ALTER TABLE public.pending_deliveries
  ALTER COLUMN character_id DROP NOT NULL,
  ALTER COLUMN character_identifier DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS recipient_user_id uuid,
  ADD COLUMN IF NOT EXISTS recipient_discord_id text,
  ADD COLUMN IF NOT EXISTS gifter_user_id uuid,
  ADD COLUMN IF NOT EXISTS is_gift boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS claimed_at timestamptz;

CREATE INDEX IF NOT EXISTS pending_deliveries_recipient_idx
  ON public.pending_deliveries (recipient_user_id)
  WHERE is_gift = true;

-- 4) RLS: recipients can see and claim their gifts
DROP POLICY IF EXISTS "Recipients can view own gifts" ON public.pending_deliveries;
CREATE POLICY "Recipients can view own gifts"
  ON public.pending_deliveries
  FOR SELECT
  TO authenticated
  USING (
    is_gift = true
    AND recipient_user_id = auth.uid()
  );

-- Note: claim flow goes through edge function with service role,
-- so no UPDATE policy needed for recipients.
