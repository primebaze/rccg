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

// Errors are objects that don't survive JSON.stringify, so reduce them to text
// we can both log and store.
function describeError(error: unknown) {
  if (!error) return null;
  if (error instanceof Error) return error.message;
  if (typeof error === "object") {
    const maybe = error as { message?: unknown; name?: unknown };
    if (typeof maybe.message === "string") {
      return typeof maybe.name === "string" ? `${maybe.name}: ${maybe.message}` : maybe.message;
    }
  }
  return String(error);
}

// pg_net discards HTTP responses after a few hours, so the run summary is
// written back to birthday_runs. That gives a durable record of what each day's
// job actually did, which is the only way to diagnose a missed send later.
async function recordResult(supabase: SupabaseClient, runDate: string, result: unknown) {
  const { error } = await supabase.from("birthday_runs").update({ result }).eq("run_date", runDate);
  if (error) {
    // The column may not exist yet; never let bookkeeping break the job.
    console.warn("Could not store birthday run result", { runDate, error: describeError(error) });
  }
}

async function runBirthdayJob(supabase: SupabaseClient, today: Date, runDate: string) {
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

  // A rejected batch still resolves — surface the reason instead of silently
  // reporting zero sent.
  const emailError = memberEmailResult.skipped ? null : describeError(memberEmailResult.error);
  if (emailError) {
    console.error("Birthday member emails failed", {
      runDate,
      recipients: todaysBirthdays.map((member) => member.email),
      error: emailError
    });
  }

  const smsResults = await Promise.allSettled(todaysBirthdays.map((member) => sendMemberBirthdaySms(member)));
  const smsErrors = smsResults
    .map((result, i) =>
      result.status === "rejected"
        ? { phone: todaysBirthdays[i]?.phone, error: describeError(result.reason) }
        : null
    )
    .filter(Boolean);
  if (smsErrors.length) {
    console.error("Birthday member SMS failed", { runDate, failures: smsErrors });
  }

  const adminToday = await sendAdminBirthdayEmail(todaysBirthdays);
  const adminError = describeError((adminToday as { error?: unknown }).error);
  if (adminError) {
    console.error("Admin birthday email failed", { runDate, error: adminError });
  }

  const adminReminders = [];
  for (const days of reminderDays) {
    adminReminders.push(await sendAdminBirthdayEmail(membersForBirthday(members, addDays(today, days)), days));
  }

  const summary = {
    ran: true,
    checked: members.length,
    birthdaysToday: todaysBirthdays.length,
    reminderDays,
    memberEmails: memberEmailResult.skipped ? 0 : memberEmailResult.sent,
    memberEmailsSkipped: memberEmailResult.skipped ? memberEmailResult.reason : null,
    memberEmailError: emailError,
    smsFailures: smsErrors.length,
    adminEmailError: adminError,
    adminNotifications:
      ("skipped" in adminToday && adminToday.skipped ? 0 : 1) + adminReminders.length
  };

  console.info("Birthday job finished", summary);
  await recordResult(supabase, runDate, summary);
  return summary;
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
    // Any other claim failure is an infrastructure problem. Missing everyone's
    // birthday message is worse than risking a duplicate, so send anyway.
    console.error("Birthday run claim failed; sending anyway", {
      runDate,
      error: describeError(claimError)
    });
    return runBirthdayJob(supabase, today, runDate);
  }

  memoryClaim = runDate;

  try {
    return await runBirthdayJob(supabase, today, runDate);
  } catch (jobError) {
    // Release the claim so a later call can retry today rather than the day
    // staying marked done with nothing sent.
    memoryClaim = "";
    await supabase.from("birthday_runs").delete().eq("run_date", runDate);
    console.error("Birthday job failed; claim released for retry", {
      runDate,
      error: describeError(jobError)
    });
    throw jobError;
  }
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
