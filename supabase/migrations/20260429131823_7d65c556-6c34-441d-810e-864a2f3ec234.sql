-- Reverse order to avoid duplicate key on unique tier column
UPDATE public.vip_tiers
SET tier = 'platinum', name = 'Platinum VIP', price = 50,
    description = 'Aukščiausias VIP lygis 30 dienų.',
    color = '#e5e4e2',
    perks = ARRAY['Visi Gold privalumai', 'Platinum vardas', '+20% kreditų bonusas', 'Nemokamas custom plate', 'Paslėpta įranga'],
    sort_order = 3
WHERE tier = 'gold';

UPDATE public.vip_tiers
SET tier = 'gold', name = 'Gold VIP', price = 35,
    description = 'Vidutinis VIP lygis 30 dienų.',
    color = '#ffd700',
    perks = ARRAY['Visi Silver privalumai', 'Spalvotas vardas žaidime', '+10% kreditų bonusas', 'Išskirtinės dėžės'],
    sort_order = 2
WHERE tier = 'silver';

UPDATE public.vip_tiers
SET tier = 'silver', name = 'Silver VIP', price = 20,
    description = 'Pradinis VIP lygis 30 dienų.',
    color = '#c0c0c0',
    perks = ARRAY['VIP žymė Discord serveryje', 'Prioritetinis prisijungimas', '+5% kreditų bonusas'],
    sort_order = 1
WHERE tier = 'bronze';