-- Helper to check owner via discord id
CREATE OR REPLACE FUNCTION public.is_owner()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND discord_id = '1276583745490649214', '811365896824029184'
  );
$$;

-- CASES
CREATE TABLE public.cases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  image_url TEXT,
  price INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cases viewable by everyone" ON public.cases FOR SELECT USING (true);
CREATE POLICY "Owner can insert cases" ON public.cases FOR INSERT TO authenticated WITH CHECK (public.is_owner());
CREATE POLICY "Owner can update cases" ON public.cases FOR UPDATE TO authenticated USING (public.is_owner());
CREATE POLICY "Owner can delete cases" ON public.cases FOR DELETE TO authenticated USING (public.is_owner());

CREATE TRIGGER update_cases_updated_at BEFORE UPDATE ON public.cases
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- CASE ITEMS
CREATE TABLE public.case_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  item_name TEXT NOT NULL,
  chance NUMERIC(6,3) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.case_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Case items viewable by everyone" ON public.case_items FOR SELECT USING (true);
CREATE POLICY "Owner can insert case items" ON public.case_items FOR INSERT TO authenticated WITH CHECK (public.is_owner());
CREATE POLICY "Owner can update case items" ON public.case_items FOR UPDATE TO authenticated USING (public.is_owner());
CREATE POLICY "Owner can delete case items" ON public.case_items FOR DELETE TO authenticated USING (public.is_owner());

CREATE INDEX idx_case_items_case_id ON public.case_items(case_id);

-- VEHICLES
CREATE TABLE public.vehicles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  image_url TEXT,
  price INTEGER NOT NULL DEFAULT 0,
  top_speed INTEGER NOT NULL DEFAULT 0,
  trunk INTEGER,
  features TEXT[] NOT NULL DEFAULT '{}',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vehicles viewable by everyone" ON public.vehicles FOR SELECT USING (true);
CREATE POLICY "Owner can insert vehicles" ON public.vehicles FOR INSERT TO authenticated WITH CHECK (public.is_owner());
CREATE POLICY "Owner can update vehicles" ON public.vehicles FOR UPDATE TO authenticated USING (public.is_owner());
CREATE POLICY "Owner can delete vehicles" ON public.vehicles FOR DELETE TO authenticated USING (public.is_owner());

CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON public.vehicles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- STORAGE BUCKET
INSERT INTO storage.buckets (id, name, public) VALUES ('shop-assets', 'shop-assets', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Shop assets public read" ON storage.objects FOR SELECT USING (bucket_id = 'shop-assets');
CREATE POLICY "Owner can upload shop assets" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'shop-assets' AND public.is_owner());
CREATE POLICY "Owner can update shop assets" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'shop-assets' AND public.is_owner());
CREATE POLICY "Owner can delete shop assets" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'shop-assets' AND public.is_owner());