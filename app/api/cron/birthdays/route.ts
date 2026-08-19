import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { addDays, getReminderDays, membersForBirthday } from "@/lib/birthday";
import type { Member } from "@/lib/member-schema";
import {
  sendAdminBirthdayEmail,
  sendMemberBirthdayEmailBatch,
  sendMemberBirthdaySms
} from "@/lib/notifications";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

// This endpoint is invoked once a day by a Supabase pg_cron job (see
// supabase/schema.sql), which sends an authenticated request server-side — no
// GitHub Action and no site visit required. The work is guarded so it runs at
// most once per calendar day even if the request is retried.

// Remembers the last day this warm serverless instance has already handled, so
// a retried call short-circuits before touching the database.
let memoryClaim = "";

function isoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const headerSecret = request.headers.get("x-cron-secret");
  return bearer === secret || headerSecret === secret;
}

async function runBirthdayJob(supabase: SupabaseClient, today: Date) {
  const { data, error } = await supabase
    .from("members")
    .select("id, first_name, last_name, email, phone, date_of_birth, consent_email, consent_sms, created_at")
    .order("first_name", { ascending: true });

  if (error) throw error;

  const members = (data ?? []) as Member[];
  const todaysBirthdays = membersForBirthday(members, today);
  const reminderDays = getReminderDays();
  const dateKey = [today.getFullYear(), today.getMonth() + 1, today.getDate()].join("-");

  const memberEmailResult = await sendMemberBirthdayEmailBatch(
    todaysBirthdays,
    `birthday-members-${dateKey}`
  );
  const memberSmsResults = await Promise.allSettled(todaysBirthdays.map((member) => sendMemberBirthdaySms(member)));
  const adminToday = await sendAdminBirthdayEmail(todaysBirthdays);

  const adminReminders = [];
  for (const days of reminderDays) {
    adminReminders.push(await sendAdminBirthdayEmail(membersForBirthday(members, addDays(today, days)), days));
  }

  return {
    ran: true,
    checked: members.length,
    birthdaysToday: todaysBirthdays.length,
    reminderDays,
    memberEmails: memberEmailResult.skipped ? 0 : memberEmailResult.sent,
    memberSmsNotifications: memberSmsResults.length,
    adminNotifications: ("skipped" in adminToday && adminToday.skipped ? 0 : 1) + adminReminders.length
  };
}

// Runs the birthday job only if it hasn't already run today. The database claim
// is atomic across every serverless instance, so a retried or duplicated cron
// call still sends exactly one set of notifications.
async function maybeRunBirthdayJob() {
  const today = new Date();
  const runDate = isoDate(today);

  if (memoryClaim === runDate) {
    return { ran: false, reason: "Already sent today", via: "memory" as const };
  }

  const supabase = getSupabaseAdmin();
  const { error: claimError } = await supabase.from("birthday_runs").insert({ run_date: runDate });

  if (claimError) {
    // Unique violation: another request already claimed today. Nothing to do.
    if (claimError.code === "23505") {
      memoryClaim = runDate;
      return { ran: false, reason: "Already sent today", via: "db" as const };
    }
    throw claimError;
  }

  memoryClaim = runDate;
  return runBirthdayJob(supabase, today);
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const result = await maybeRunBirthdayJob();
  return NextResponse.json(result);
}

export async function POST(request: Request) {
  return GET(request);
}
