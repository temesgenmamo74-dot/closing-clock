create table public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  days int not null default 365,
  amount numeric,
  note text,
  paid_at timestamptz not null default now(),
  recorded_by uuid
);
create index payments_user_idx on public.payments(user_id);
grant select, insert on public.payments to authenticated;
grant all on public.payments to service_role;
alter table public.payments enable row level security;
create policy "payments admin all" on public.payments for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "payments own read" on public.payments for select to authenticated using (user_id = auth.uid());