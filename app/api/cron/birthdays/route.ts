import { NextResponse } from "next/server";
import { addDays, getReminderDays, membersForBirthday } from "@/lib/birthday";
import type { Member } from "@/lib/member-schema";
import {
  sendAdminBirthdayEmail,
  sendMemberBirthdayEmail,
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

  const memberNotifications = await Promise.allSettled(
    todaysBirthdays.flatMap((member) => [sendMemberBirthdayEmail(member), sendMemberBirthdaySms(member)])
  );
  const adminToday = await Promise.allSettled([sendAdminBirthdayEmail(todaysBirthdays)]);

  const adminReminders = await Promise.allSettled(
    reminderDays.map((days) => sendAdminBirthdayEmail(membersForBirthday(members, addDays(today, days)), days))
  );

  return {
    checked: members.length,
    birthdaysToday: todaysBirthdays.length,
    reminderDays,
    memberNotifications: memberNotifications.length,
    adminNotifications: adminToday.length + adminReminders.length
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
