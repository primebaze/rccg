# RCCG Worship Tabernacle — Member Registration

A Next.js, Supabase, Resend, and optional Twilio app for member registration and ongoing member care.

## Features

- Member registration with email and SMS consent
- Supabase member storage
- Resend birthday emails to members
- Optional Twilio SMS greetings
- Admin birthday email on the day
- Admin reminder emails before birthdays
- Protected admin dashboard at `/admin`
- Protected cron endpoint at `/api/cron/birthdays`

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy `.env.example` to `.env.local` and fill in the values.

3. Run `supabase/schema.sql` in your Supabase SQL editor.

If you already created the `members` table before the profile fields were added, run:

```text
supabase/add-profile-fields.sql
```

4. Start the app:

```bash
npm run dev
```

## Admin Login

Open:

```text
/admin
```

The default username is `admin`, or set a custom username with:

```text
ADMIN_USERNAME=admin
```

The admin password is the value of:

```text
ADMIN_DASHBOARD_KEY=choose-a-long-random-value
```

The admin dashboard includes member search, filters, CSV export, edit/delete, and member actions.

Admin pages:

- `/admin` overview
- `/admin/members` member directory and profile management
- `/admin/messages` email and SMS tools
- `/admin/birthdays` birthday planning view

Member actions:

- `Email` opens the admin device email app with the member address.
- `SMS` opens the admin device SMS app with the member phone number.
- `Call` opens the admin device phone app.
- `Send email` sends a custom email through Resend.
- `Send SMS` sends a custom SMS through Twilio.

Custom email requires `RESEND_API_KEY` and `RESEND_FROM_EMAIL`.

SMS requires `TWILIO_ACCOUNT_SID` and `TWILIO_FROM_PHONE`, plus credentials.
Prefer a restricted API key, which can be scoped to sending messages and
rotated without touching the account:

```text
TWILIO_API_KEY_SID=SKxxxxxxxx
TWILIO_API_KEY_SECRET=your-api-key-secret
```

`TWILIO_AUTH_TOKEN` is still accepted as a fallback, but it grants full
account access, so the API key is the safer choice.

## Birthday Scheduler

Birthday notifications send themselves — no GitHub Action and no one needs to
visit the site. A **Supabase `pg_cron` job** runs every morning (07:00 UTC) and
makes an authenticated call to the birthday endpoint, which does the sending and
de-duplicates so it only ever runs once per calendar day (tracked in the
`birthday_runs` table).

The endpoint it calls is:

```text
GET https://your-domain.com/api/cron/birthdays
Authorization: Bearer YOUR_CRON_SECRET
```

It checks today’s birthdays, sends member birthday messages, emails admin for
birthdays today, and sends admin reminders using `BIRTHDAY_REMINDER_DAYS`.

### Setting up the Supabase job

Store the app URL and the shared secret in Supabase Vault (so nothing sensitive
lives in SQL), enable the extensions, and schedule the job. The full SQL is in
`supabase/schema.sql`. In short:

```sql
select vault.create_secret('https://your-domain.com', 'birthday_app_url');
select vault.create_secret('YOUR_CRON_SECRET', 'birthday_cron_secret');

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'daily-birthday-notifications',
  '0 7 * * *',
  $$
    select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets
              where name = 'birthday_app_url') || '/api/cron/birthdays',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (select decrypted_secret
          from vault.decrypted_secrets where name = 'birthday_cron_secret')
      )
    );
  $$
);
```

`CRON_SECRET` must match the value set in the app's environment. Because a daily
Supabase job keeps the database active, the project also won't be auto-paused as
long as the schedule is running.
