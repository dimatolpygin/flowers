alter table shops
  add column if not exists operators_limit integer not null default 1 check (operators_limit >= 0);
