# RCCG Member Birthdays

A Next.js, Supabase, Resend, and optional Twilio app for member onboarding and automatic birthday care.

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

Custom email requires `RESEND_API_KEY` and `RESEND_FROM_EMAIL`. Custom SMS requires `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_FROM_PHONE`.

## Birthday Scheduler

Supabase free tier should only be used here as the database. Do not rely on Supabase cron for this app.

The included GitHub Actions workflow calls the birthday endpoint every day at 07:00 UTC:

```text
.github/workflows/birthday-cron.yml
```

Add these repository secrets in GitHub:

```text
APP_URL=https://your-domain.com
CRON_SECRET=YOUR_CRON_SECRET
```

You can also run it manually from the GitHub Actions tab with `workflow_dispatch`.

The endpoint it calls is:

```text
GET https://your-domain.com/api/cron/birthdays
Authorization: Bearer YOUR_CRON_SECRET
```

The endpoint checks today’s birthdays, sends member birthday messages, emails admin for birthdays today, and sends admin reminders using `BIRTHDAY_REMINDER_DAYS`.

If you do not want to use GitHub Actions, use any external scheduler that can send an authorization header, such as cron-job.org, EasyCron, or a Vercel Cron Job.
