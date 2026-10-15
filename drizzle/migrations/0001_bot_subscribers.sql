create table public.bot_subscribers (
  chat_id bigint primary key,
  first_name text,
  subscribed_at timestamptz not null default now()
);

grant all on public.bot_subscribers to service_role;

alter table public.bot_subscribers enable row level security;