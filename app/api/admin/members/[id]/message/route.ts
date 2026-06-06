import { NextResponse } from "next/server";
import { z } from "zod";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionValue } from "@/lib/admin-auth";
import type { Member } from "@/lib/member-schema";
import { sendCustomMemberEmail, sendCustomMemberSms } from "@/lib/notifications";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const messageSchema = z.object({
  channel: z.enum(["email", "sms"]),
  subject: z.string().trim().max(120).optional(),
  body: z.string().trim().min(3).max(1600)
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

function isAuthorized(request: Request) {
  const cookie = request.headers
    .get("cookie")
    ?.split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${ADMIN_SESSION_COOKIE}=`))
    ?.slice(ADMIN_SESSION_COOKIE.length + 1);

  return verifyAdminSessionValue(cookie);
}

export async function POST(request: Request, context: RouteContext) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = messageSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Please enter a valid message.", errors: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { id } = await context.params;
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
    .eq("id", id)
    .single();

  if (error || !data) {
    return NextResponse.json({ message: error?.message ?? "Member not found." }, { status: 404 });
  }

  const member = data as Member;
  const result =
    parsed.data.channel === "email"
      ? await sendCustomMemberEmail(member, parsed.data.subject || "Message from RCCG Worship Tabernacle", parsed.data.body)
      : await sendCustomMemberSms(member, parsed.data.body);

  if ("skipped" in result && result.skipped) {
    return NextResponse.json(
      { message: `${parsed.data.channel === "email" ? "Email" : "SMS"} is not configured or enabled for this member.` },
      { status: 400 }
    );
  }

  return NextResponse.json({ message: `${parsed.data.channel === "email" ? "Email" : "SMS"} sent.` });
}
