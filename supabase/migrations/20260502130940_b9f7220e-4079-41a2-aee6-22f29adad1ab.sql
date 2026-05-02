ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'car';
ALTER TABLE public.vehicles ADD CONSTRAINT vehicles_category_check CHECK (category IN ('car','helicopter'));
CREATE INDEX IF NOT EXISTS idx_vehicles_category ON public.vehicles(category);