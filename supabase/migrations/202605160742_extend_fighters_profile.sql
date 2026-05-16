alter table public.fighters
  add column if not exists birthplace text,
  add column if not exists birth_date text,
  add column if not exists height text,
  add column if not exists weight text,
  add column if not exists affiliation text,
  add column if not exists twitter_url text,
  add column if not exists instagram_url text,
  add column if not exists youtube_url text,
  add column if not exists description text,
  add column if not exists submission integer not null default 70,
  add column if not exists stamina integer not null default 75,
  add column if not exists speed integer not null default 70,
  add column if not exists defense integer not null default 75;

alter table public.fighters
  alter column striking set default 60,
  alter column grappling set default 85,
  alter column power set default 65;

update public.fighters
set
  striking = coalesce(striking, 60),
  grappling = coalesce(grappling, 85),
  submission = coalesce(submission, 70),
  stamina = coalesce(stamina, 75),
  power = coalesce(power, 65),
  speed = coalesce(speed, 70),
  defense = coalesce(defense, 75);

create unique index if not exists fighters_name_unique_idx
  on public.fighters (name);
