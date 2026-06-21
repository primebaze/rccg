import { NextResponse } from "next/server";
import { addDays, getReminderDays, membersForBirthday } from "@/lib/birthday";
import type { Member } from "@/lib/member-schema";
import {
  sendAdminBirthdayEmail,
  sendMemberBirthdayEmailBatch,
  sendMemberBirthdaySms
} from "@/lib/notifications";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const headerSecret = request.headers.get("x-cron-secret");
  return bearer === secret || headerSecret === secret;
}

async function runBirthdayJob() {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("members")
    .select("id, first_name, last_name, email, phone, date_of_birth, consent_email, consent_sms, created_at")
    .order("first_name", { ascending: true });

  if (error) throw error;

  const members = (data ?? []) as Member[];
  const today = new Date();
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
    checked: members.length,
    birthdaysToday: todaysBirthdays.length,
    reminderDays,
    memberEmails: memberEmailResult.skipped ? 0 : memberEmailResult.sent,
    memberSmsNotifications: memberSmsResults.length,
    adminNotifications: ("skipped" in adminToday && adminToday.skipped ? 0 : 1) + adminReminders.length
  };
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const result = await runBirthdayJob();
  return NextResponse.json(result);
}

export async function POST(request: Request) {
  return GET(request);
}
