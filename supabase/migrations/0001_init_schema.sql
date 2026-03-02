create extension if not exists pgcrypto;

create table if not exists shops (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  status text not null default 'pending' check (status in ('pending', 'active', 'suspended', 'deleted')),
  plan text not null default 'start' check (plan in ('start', 'basic', 'pro', 'custom')),
  logo_template_url text,
  generations_limit integer not null default 50 check (generations_limit >= 0),
  generations_used integer not null default 0 check (generations_used >= 0),
  regen_limit_per_order integer not null default 1 check (regen_limit_per_order >= 0),
  resolution text not null default '1K' check (resolution in ('1K', '2K', '4K')),
  subscription_expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  telegram_id bigint not null unique,
  username text,
  role text not null check (role in ('super_admin', 'shop_admin', 'operator')),
  shop_id uuid references shops (id),
  display_name text,
  created_at timestamptz not null default now(),
  constraint users_shop_rule check (
    (role = 'super_admin' and shop_id is null) or
    (role in ('shop_admin', 'operator') and shop_id is not null)
  )
);

create table if not exists invite_tokens (
  token uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops (id) on delete cascade,
  role text not null check (role in ('shop_admin', 'operator')),
  created_by bigint not null,
  display_name text,
  used_at timestamptz,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops (id) on delete cascade,
  plan text not null check (plan in ('start', 'basic', 'pro', 'custom')),
  price numeric(12, 2) not null default 0,
  generations_limit integer not null check (generations_limit >= 0),
  resolution text not null check (resolution in ('1K', '2K', '4K')),
  regen_limit integer not null check (regen_limit >= 0),
  started_at timestamptz not null,
  expires_at timestamptz not null,
  status text not null default 'active' check (status in ('active', 'expired', 'cancelled')),
  payment_ref text,
  created_by bigint not null,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops (id) on delete cascade,
  operator_id uuid not null references users (id),
  photos_input jsonb not null default '[]'::jsonb,
  style text not null,
  description text not null,
  greeting_text text not null,
  variants jsonb not null default '[]'::jsonb,
  chosen_variant integer check (chosen_variant in (1, 2)),
  regen_count integer not null default 0 check (regen_count >= 0),
  created_at timestamptz not null default now()
);

create table if not exists generation_log (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops (id) on delete cascade,
  order_id uuid not null references orders (id) on delete cascade,
  operator_id uuid not null references users (id),
  resolution_used text not null check (resolution_used in ('1K', '2K', '4K')),
  is_regen boolean not null default false,
  api_credits_spent numeric(12, 4) not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_users_shop_id on users (shop_id);
create index if not exists idx_users_role on users (role);
create index if not exists idx_invite_tokens_shop_id on invite_tokens (shop_id);
create index if not exists idx_invite_tokens_expires_at on invite_tokens (expires_at);
create index if not exists idx_subscriptions_shop_id on subscriptions (shop_id);
create index if not exists idx_subscriptions_expires_at on subscriptions (expires_at);
create index if not exists idx_orders_shop_id on orders (shop_id);
create index if not exists idx_orders_operator_id on orders (operator_id);
create index if not exists idx_generation_log_shop_id on generation_log (shop_id);
create index if not exists idx_generation_log_created_at on generation_log (created_at);

create or replace view billing_summary as
select
  gl.shop_id,
  date_trunc('month', gl.created_at) as period,
  count(*)::bigint as generations_total,
  sum(case when gl.is_regen then 1 else 0 end)::bigint as regens_total,
  coalesce(sum(gl.api_credits_spent), 0)::numeric(14, 4) as credits_spent,
  (
    select s.plan
    from subscriptions s
    where s.shop_id = gl.shop_id
    order by s.created_at desc
    limit 1
  ) as active_plan
from generation_log gl
group by gl.shop_id, date_trunc('month', gl.created_at);
