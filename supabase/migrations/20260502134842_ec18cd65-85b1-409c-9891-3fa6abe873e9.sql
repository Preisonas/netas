ALTER TABLE public.lucky_wheels REPLICA IDENTITY FULL;
ALTER TABLE public.lucky_wheel_entries REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.lucky_wheels;
ALTER PUBLICATION supabase_realtime ADD TABLE public.lucky_wheel_entries;