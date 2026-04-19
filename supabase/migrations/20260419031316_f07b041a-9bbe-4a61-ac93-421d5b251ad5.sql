-- Characters table for FiveM ESX sync
CREATE TABLE public.characters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  discord_id TEXT NOT NULL,
  identifier TEXT NOT NULL UNIQUE,
  first_name TEXT,
  last_name TEXT,
  job TEXT,
  job_grade INTEGER DEFAULT 0,
  cash INTEGER DEFAULT 0,
  bank INTEGER DEFAULT 0,
  black_money INTEGER DEFAULT 0,
  position JSONB,
  inventory JSONB,
  metadata JSONB,
  last_synced_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_characters_discord_id ON public.characters(discord_id);

ALTER TABLE public.characters ENABLE ROW LEVEL SECURITY;

-- Users can view characters that match their linked discord_id
CREATE POLICY "Users can view own characters"
ON public.characters
FOR SELECT
TO authenticated
USING (
  discord_id IN (
    SELECT discord_id FROM public.profiles WHERE user_id = auth.uid() AND discord_id IS NOT NULL
  )
);

-- Owner can view all
CREATE POLICY "Owner can view all characters"
ON public.characters
FOR SELECT
TO authenticated
USING (is_owner());

CREATE TRIGGER update_characters_updated_at
BEFORE UPDATE ON public.characters
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();