import { NextResponse } from "next/server";
import { z } from "zod";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionValue } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const adminMemberUpdateSchema = z.object({
  first_name: z.string().trim().min(2).max(80),
  last_name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(160),
  phone: z.string().trim().min(7).max(32),
  date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  marital_status: z.enum(["single", "married", "widowed", "divorced", "prefer_not_to_say"]),
  is_ordained: z.boolean(),
  address_line_1: z.string().trim().min(3).max(180),
  city: z.string().trim().min(2).max(100),
  postal_code: z.string().trim().min(2).max(24),
  occupation: z.string().trim().max(120).nullable(),
  ministry_department: z.string().trim().max(120).nullable(),
  emergency_contact_name: z.string().trim().max(120).nullable(),
  emergency_contact_phone: z.string().trim().max(32).nullable(),
  consent_email: z.boolean(),
  consent_sms: z.boolean()
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

export async function PATCH(request: Request, context: RouteContext) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = adminMemberUpdateSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Please check the member details and try again.", errors: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { id } = await context.params;
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("members").update(parsed.data).eq("id", id);

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: "Member updated." });
}

export async function DELETE(request: Request, context: RouteContext) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("members").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: "Member deleted." });
}
