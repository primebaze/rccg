import { NextResponse } from "next/server";
import { z } from "zod";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionValue } from "@/lib/admin-auth";
import type { Member } from "@/lib/member-schema";
import { sendCustomMemberEmailBatch } from "@/lib/notifications";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const batchEmailSchema = z.object({
  memberIds: z.array(z.string().uuid()).min(1).max(100),
  subject: z.string().trim().min(1).max(120),
  body: z.string().trim().min(3).max(1600),
  requestId: z.string().uuid()
});

function isAuthorized(request: Request) {
  const cookie = request.headers
    .get("cookie")
    ?.split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${ADMIN_SESSION_COOKIE}=`))
    ?.slice(ADMIN_SESSION_COOKIE.length + 1);

  return verifyAdminSessionValue(cookie);
}

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) return String(error.message);
  return "Resend could not send this email batch.";
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = batchEmailSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Select between 1 and 100 members and enter a valid email." },
      { status: 400 }
    );
  }

  const memberIds = [...new Set(parsed.data.memberIds)];
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("members")
    .select(`
      id,
      first_name,
      last_name,
      email,
      phone,
      date_of_birth,
      marital_status,
      is_ordained,
      address_line_1,
      city,
      postal_code,
      occupation,
      ministry_department,
      emergency_contact_name,
      emergency_contact_phone,
      consent_email,
      consent_sms,
      created_at
    `)
    .in("id", memberIds);

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  const eligibleMembers = ((data ?? []) as Member[]).filter((member) => member.consent_email);
  const result = await sendCustomMemberEmailBatch(
    eligibleMembers,
    parsed.data.subject,
    parsed.data.body,
    `admin-email-${parsed.data.requestId}`
  );

  if (result.skipped) {
    return NextResponse.json({ message: result.reason }, { status: 400 });
  }

  if (result.error) {
    console.error("Resend batch email failed", result.error);
    return NextResponse.json({ message: errorMessage(result.error) }, { status: 502 });
  }

  const skipped = memberIds.length - eligibleMembers.length;
  console.info("Resend batch email sent", { sent: result.sent, skipped, ids: result.ids });

  return NextResponse.json({
    message: `Email sent to ${result.sent} member${result.sent === 1 ? "" : "s"}.`,
    sent: result.sent,
    skipped
  });
}
