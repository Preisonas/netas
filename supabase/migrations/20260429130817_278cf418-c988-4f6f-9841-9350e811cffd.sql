-- VIP tiers catalog
CREATE TABLE public.vip_tiers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tier TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  price INTEGER NOT NULL DEFAULT 0,
  duration_days INTEGER NOT NULL DEFAULT 30,
  color TEXT NOT NULL DEFAULT '#a78bfa',
  perks TEXT[] NOT NULL DEFAULT '{}',
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.vip_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "VIP tiers viewable by everyone"
  ON public.vip_tiers FOR SELECT TO public USING (true);

CREATE POLICY "Owner can insert vip tiers"
  ON public.vip_tiers FOR INSERT TO authenticated WITH CHECK (is_owner());

CREATE POLICY "Owner can update vip tiers"
  ON public.vip_tiers FOR UPDATE TO authenticated USING (is_owner());

CREATE POLICY "Owner can delete vip tiers"
  ON public.vip_tiers FOR DELETE TO authenticated USING (is_owner());

CREATE TRIGGER vip_tiers_updated_at
  BEFORE UPDATE ON public.vip_tiers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Active user memberships
CREATE TABLE public.user_vips (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  discord_id TEXT,
  tier_id UUID NOT NULL REFERENCES public.vip_tiers(id) ON DELETE RESTRICT,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, tier_id)
);

CREATE INDEX idx_user_vips_user ON public.user_vips(user_id);
CREATE INDEX idx_user_vips_expires ON public.user_vips(expires_at);

ALTER TABLE public.user_vips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own vips"
  ON public.user_vips FOR SELECT TO authenticated
  USING ((auth.uid() = user_id) OR is_owner());

CREATE POLICY "Owner can manage user vips"
  ON public.user_vips FOR ALL TO authenticated
  USING (is_owner()) WITH CHECK (is_owner());

CREATE TRIGGER user_vips_updated_at
  BEFORE UPDATE ON public.user_vips
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed 3 default test tiers
INSERT INTO public.vip_tiers (tier, name, description, price, duration_days, color, perks, sort_order) VALUES
  ('bronze', 'Bronze VIP', 'Pradinis VIP lygis 30 dienų.', 10, 30, '#cd7f32',
    ARRAY['VIP žymė Discord serveryje', 'Prioritetinis prisijungimas', '+5% kreditų bonusas'], 1),
  ('silver', 'Silver VIP', 'Vidutinis VIP lygis 30 dienų.', 25, 30, '#c0c0c0',
    ARRAY['Visi Bronze privalumai', 'Spalvotas vardas žaidime', '+10% kreditų bonusas', 'Išskirtinės dėžės'], 2),
  ('gold', 'Gold VIP', 'Aukščiausias VIP lygis 30 dienų.', 50, 30, '#ffd700',
    ARRAY['Visi Silver privalumai', 'Auksinis vardas', '+20% kreditų bonusas', 'Nemokamas custom plate', 'Paslėpta įranga'], 3);