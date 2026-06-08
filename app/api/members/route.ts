import { NextResponse } from "next/server";
import { memberSchema } from "@/lib/member-schema";
import { sendMemberSignupConfirmation } from "@/lib/notifications";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getClientIp, rateLimit, tooManyRequests } from "@/lib/rate-limit";

export async function POST(request: Request) {
  // Rate limit: max 3 registrations per IP per 10 minutes, plus a global gate
  // to blunt distributed spam across rotating IPs.
  const ip = getClientIp(request);
  const limit = rateLimit(`register:${ip}`, 3, 600);
  if (!limit.ok) {
    return tooManyRequests(limit.retryAfterSeconds, "Too many sign-ups from this device. Please try again later.");
  }
  const globalLimit = rateLimit("register:global", 40, 600);
  if (!globalLimit.ok) {
    return tooManyRequests(globalLimit.retryAfterSeconds, "Registrations are temporarily busy. Please try again shortly.");
  }

  const payload = await request.json().catch(() => null);
  const parsed = memberSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Please check the form and try again.", errors: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const member = parsed.data;

  // Bot trap: return a decoy success so bots don't learn they were filtered.
  // Do not block fast submits here; autofill or repeated church onboarding can
  // be quick and still be a real member registration.
  if (member.website) {
    return NextResponse.json({ message: "You are registered. Welcome!." });
  }

  const supabase = getSupabaseAdmin();

  const { error } = await supabase.from("members").insert({
    first_name: member.firstName,
    last_name: member.lastName,
    email: member.email.toLowerCase(),
    phone: member.phone,
    date_of_birth: member.dateOfBirth,
    marital_status: member.maritalStatus,
    is_ordained: member.isOrdained,
    address_line_1: member.addressLine1,
    city: member.city,
    postal_code: member.postalCode,
    occupation: member.occupation || null,
    ministry_department: member.ministryDepartment || null,
    emergency_contact_name: member.emergencyContactName || null,
    emergency_contact_phone: member.emergencyContactPhone || null,
    consent_email: member.consentEmail,
    consent_sms: member.consentSms
  });

  if (error) {
    // Unique violation on email — record already exists. Don't overwrite it.
    if (error.code === "23505") {
      return NextResponse.json(
        { message: "This email is already registered. Please contact a church admin to update your details." },
        { status: 409 }
      );
    }
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  try {
    const emailResult = await sendMemberSignupConfirmation(member);

    if (emailResult.skipped) {
      console.info("Member signup confirmation email skipped", {
        email: member.email.toLowerCase(),
        reason: emailResult.reason
      });
    } else if (emailResult.error) {
      console.error("Failed to send member signup confirmation", {
        email: member.email.toLowerCase(),
        error: emailResult.error
      });
    } else {
      console.info("Member signup confirmation email sent", {
        email: member.email.toLowerCase(),
        id: emailResult.id
      });
    }
  } catch (sendError) {
    console.error("Failed to send member signup confirmation", {
      email: member.email.toLowerCase(),
      error: sendError
    });
  }

  return NextResponse.json({ message: "You are registered. Welcome to the WORSHIP TABERNACLE family!" });
}
