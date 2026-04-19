
CREATE TABLE IF NOT EXISTS public.pending_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  discord_id text NOT NULL,
  character_id uuid NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
  character_identifier text NOT NULL,
  type text NOT NULL CHECK (type IN ('vehicle', 'case_item')),
  item_name text NOT NULL,
  label text NOT NULL,
  plate text,
  metadata jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'delivered', 'failed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  delivered_at timestamptz,
  error text
);

CREATE INDEX IF NOT EXISTS idx_pending_deliveries_char_status
  ON public.pending_deliveries(character_identifier, status);

CREATE INDEX IF NOT EXISTS idx_pending_deliveries_user
  ON public.pending_deliveries(user_id);

ALTER TABLE public.pending_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own deliveries"
  ON public.pending_deliveries FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.is_owner());

CREATE POLICY "Users can create deliveries for own characters"
  ON public.pending_deliveries FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND discord_id IN (
      SELECT discord_id FROM public.profiles
      WHERE user_id = auth.uid() AND discord_id IS NOT NULL
    )
  );

CREATE POLICY "Owner can manage deliveries"
  ON public.pending_deliveries FOR ALL
  TO authenticated
  USING (public.is_owner())
  WITH CHECK (public.is_owner());
