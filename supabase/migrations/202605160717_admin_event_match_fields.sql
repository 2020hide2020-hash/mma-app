alter table public.events
  add column if not exists logo_url text;

alter table public.matches
  add column if not exists bout_order integer,
  add column if not exists is_main_card boolean not null default false;

create index if not exists matches_event_bout_order_idx
  on public.matches (event_id, bout_order, id);
