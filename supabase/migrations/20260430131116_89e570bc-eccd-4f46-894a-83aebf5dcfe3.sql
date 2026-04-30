-- Lucky wheel game state
CREATE TABLE public.lucky_wheels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | spinning | finished | cancelled
  ends_at TIMESTAMPTZ NOT NULL,
  spun_at TIMESTAMPTZ,
  winner_user_id UUID,
  winner_discord_id TEXT,
  winner_username TEXT,
  winner_entry_id UUID,
  winner_character_id UUID,
  delivery_id UUID,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT lucky_wheels_status_chk CHECK (status IN ('pending','spinning','finished','cancelled'))
);

-- Only one active (pending/spinning) wheel at a time
CREATE UNIQUE INDEX lucky_wheels_one_active_idx
  ON public.lucky_wheels ((1))
  WHERE status IN ('pending','spinning');

CREATE INDEX lucky_wheels_status_idx ON public.lucky_wheels (status);
CREATE INDEX lucky_wheels_ends_at_idx ON public.lucky_wheels (ends_at);

ALTER TABLE public.lucky_wheels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Wheels viewable by authenticated"
  ON public.lucky_wheels FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Owner can manage wheels"
  ON public.lucky_wheels FOR ALL
  TO authenticated
  USING (public.is_owner())
  WITH CHECK (public.is_owner());

CREATE TRIGGER update_lucky_wheels_updated_at
  BEFORE UPDATE ON public.lucky_wheels
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Entries
CREATE TABLE public.lucky_wheel_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  wheel_id UUID NOT NULL REFERENCES public.lucky_wheels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  discord_id TEXT NOT NULL,
  username TEXT,
  avatar_url TEXT,
  vip_tier TEXT,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (wheel_id, user_id)
);

CREATE INDEX lucky_wheel_entries_wheel_idx ON public.lucky_wheel_entries (wheel_id);

ALTER TABLE public.lucky_wheel_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Entries viewable by authenticated"
  ON public.lucky_wheel_entries FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Owner can manage entries"
  ON public.lucky_wheel_entries FOR ALL
  TO authenticated
  USING (public.is_owner())
  WITH CHECK (public.is_owner());

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.lucky_wheels;
ALTER PUBLICATION supabase_realtime ADD TABLE public.lucky_wheel_entries;
ALTER TABLE public.lucky_wheels REPLICA IDENTITY FULL;
ALTER TABLE public.lucky_wheel_entries REPLICA IDENTITY FULL;