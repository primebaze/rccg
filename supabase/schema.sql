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
