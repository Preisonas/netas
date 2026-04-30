
ALTER TABLE public.lucky_wheels
  ADD COLUMN IF NOT EXISTS starts_at timestamp with time zone NOT NULL DEFAULT now();
