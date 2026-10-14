create type public.app_role as enum ('admin','user');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.user_roles where user_id = _user_id and role = _role) $$;

create policy "own roles read" on public.user_roles for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  phone text not null,
  full_name text,
  trial_ends_at timestamptz not null default now() + interval '7 days',
  paid_until timestamptz,
  created_at timestamptz not null default now()
);
grant select, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "read own or admin" on public.profiles for select to authenticated using (id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "admin update" on public.profiles for update to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create or replace function public.has_access(_uid uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select public.has_role(_uid,'admin') or exists (
  select 1 from public.profiles p where p.id = _uid and (p.trial_ends_at > now() or coalesce(p.paid_until, '-infinity') > now())) $$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, phone, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'phone', split_part(new.email,'@',1)), new.raw_user_meta_data->>'full_name');
  if not exists (select 1 from public.user_roles where role = 'admin') then
    insert into public.user_roles (user_id, role) values (new.id, 'admin');
  end if;
  insert into public.user_roles (user_id, role) values (new.id, 'user') on conflict do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create table public.app_settings (
  id int primary key default 1 check (id = 1),
  owner_phone text not null default '09XX XXX XXX',
  price_text text not null default 'ወርሃዊ ክፍያ'
);
insert into public.app_settings (id) values (1);
grant select on public.app_settings to anon, authenticated;
grant update on public.app_settings to authenticated;
grant all on public.app_settings to service_role;
alter table public.app_settings enable row level security;
create policy "settings read" on public.app_settings for select to anon, authenticated using (true);
create policy "settings admin update" on public.app_settings for update to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.sources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  url text not null unique,
  kind text not null default 'web',
  active boolean not null default true,
  last_run_at timestamptz,
  last_error text,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.sources to authenticated;
grant all on public.sources to service_role;
alter table public.sources enable row level security;
create policy "sources admin all" on public.sources for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

insert into public.sources (name, url, kind) values
 ('2merkato Tenders','https://www.2merkato.com/tenders','web'),
 ('EthioTender','https://ethiotender.com/','web'),
 ('Ethiopian Public Procurement (EGP)','https://egp.ppa.gov.et/egp/bids/all/tendering/open','web'),
 ('Addis Tender','https://www.addistender.com/','web'),
 ('Telegram: Ethio Tender','https://t.me/s/ethiotender','telegram'),
 ('Telegram: 2merkato','https://t.me/s/twomerkato','telegram');

create table public.tenders (
  id uuid primary key default gen_random_uuid(),
  fingerprint text not null unique,
  title text not null,
  organization text,
  category text,
  summary text,
  posted_date date,
  deadline date,
  address text,
  phone text,
  email text,
  source_url text,
  source_name text,
  created_at timestamptz not null default now()
);
create index tenders_deadline_idx on public.tenders(deadline);
grant select, delete on public.tenders to authenticated;
grant all on public.tenders to service_role;
alter table public.tenders enable row level security;
create policy "tenders read with access" on public.tenders for select to authenticated using (public.has_access(auth.uid()));
create policy "tenders admin delete" on public.tenders for delete to authenticated using (public.has_role(auth.uid(),'admin'));

create table public.saved_tenders (
  user_id uuid not null,
  tender_id uuid not null references public.tenders(id) on delete cascade,
  primary key (user_id, tender_id)
);
grant select, insert, delete on public.saved_tenders to authenticated;
grant all on public.saved_tenders to service_role;
alter table public.saved_tenders enable row level security;
create policy "own saved" on public.saved_tenders for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create table public.collector_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  added int not null default 0,
  error text
);
grant select on public.collector_runs to authenticated;
grant all on public.collector_runs to service_role;
alter table public.collector_runs enable row level security;
create policy "runs admin read" on public.collector_runs for select to authenticated using (public.has_role(auth.uid(),'admin'));