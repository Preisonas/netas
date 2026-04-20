create table public.credit_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  stripe_session_id text not null unique,
  amount_eur integer not null,
  credits integer not null,
  discount_code text,
  status text not null default 'pending',
  environment text not null default 'sandbox',
  created_at timestamptz not null default now(),
  fulfilled_at timestamptz
);

create index idx_credit_purchases_user on public.credit_purchases(user_id);

alter table public.credit_purchases enable row level security;

create policy "Users view own credit purchases"
  on public.credit_purchases for select
  to authenticated
  using (auth.uid() = user_id or public.is_owner());
