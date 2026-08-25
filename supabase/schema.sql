create extension if not exists "pgcrypto";

create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  email text not null unique,
  phone text not null,
  date_of_birth date not null,
  marital_status text not null default 'prefer_not_to_say'
    check (marital_status in ('single', 'married', 'widowed', 'divorced', 'prefer_not_to_say')),
  is_ordained boolean not null default false,
  address_line_1 text not null default '',
  address_line_2 text,
  city text not null default '',
  postal_code text not null default '',
  country text not null default '',
  occupation text,
  ministry_department text,
  emergency_contact_name text,
  emergency_contact_phone text,
  consent_email boolean not null default true,
  consent_sms boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists members_date_of_birth_idx on public.members (date_of_birth);

-- Tracks which calendar days the birthday job has already run for, so the
-- daily runner sends exactly once per day. The primary key gives us an atomic
-- "claim the day" via insert: the first request of the day succeeds, the rest
-- hit a unique violation and skip.
create table if not exists public.birthday_runs (
  run_date date primary key,
  created_at timestamptz not null default now(),
  -- Summary of what that day's job actually sent. pg_net drops HTTP responses
  -- after a few hours, so this is the durable record for diagnosing a missed
  -- send: `select run_date, result from birthday_runs order by run_date desc;`
  result jsonb
);

-- For databases created before the result column existed:
alter table public.birthday_runs add column if not exists result jsonb;

alter table public.birthday_runs enable row level security;

create policy "Service role manages birthday_runs"
  on public.birthday_runs
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- Automatic birthday notifications, driven entirely by Supabase (no GitHub
-- Action, no site visit). A pg_cron job wakes up every morning and makes an
-- authenticated HTTP call to the app's /api/cron/birthdays endpoint, which does
-- the actual sending (Resend + Twilio) and de-duplicates via birthday_runs.
--
-- The endpoint URL and shared secret are read from Supabase Vault so no secret
-- is committed here. Create them once (values shown are placeholders):
--
--   select vault.create_secret('https://your-domain.com', 'birthday_app_url');
--   select vault.create_secret('YOUR_CRON_SECRET', 'birthday_cron_secret');
--
-- CRON_SECRET must match the value set in the app's environment. Enable the
-- required extensions and schedule the job (07:00 UTC daily):
--
--   create extension if not exists pg_cron;
--   create extension if not exists pg_net;
--
--   select cron.schedule(
--     'daily-birthday-notifications',
--     '0 7 * * *',
--     $$
--       select net.http_post(
--         url := (select decrypted_secret from vault.decrypted_secrets
--                 where name = 'birthday_app_url') || '/api/cron/birthdays',
--         headers := jsonb_build_object(
--           'Content-Type', 'application/json',
--           'Authorization', 'Bearer ' || (select decrypted_secret
--             from vault.decrypted_secrets where name = 'birthday_cron_secret')
--         )
--       );
--     $$
--   );

create index if not exists members_marital_status_idx on public.members (marital_status);
create index if not exists members_is_ordained_idx on public.members (is_ordained);

alter table public.members enable row level security;

create policy "Service role manages members"
  on public.members
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_members_updated_at on public.members;
create trigger set_members_updated_at
before update on public.members
for each row execute function public.set_updated_at();
