alter table public.members
  add column if not exists marital_status text not null default 'prefer_not_to_say',
  add column if not exists is_ordained boolean not null default false,
  add column if not exists address_line_1 text not null default '',
  add column if not exists address_line_2 text,
  add column if not exists city text not null default '',
  add column if not exists postal_code text not null default '',
  add column if not exists country text not null default '',
  add column if not exists occupation text,
  add column if not exists ministry_department text,
  add column if not exists emergency_contact_name text,
  add column if not exists emergency_contact_phone text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'members_marital_status_check'
  ) then
    alter table public.members
      add constraint members_marital_status_check
      check (marital_status in ('single', 'married', 'widowed', 'divorced', 'prefer_not_to_say'));
  end if;
end $$;

create index if not exists members_marital_status_idx on public.members (marital_status);
create index if not exists members_is_ordained_idx on public.members (is_ordained);

alter table public.members
  alter column consent_sms set default true;
