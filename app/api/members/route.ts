import { NextResponse } from "next/server";
import { memberSchema } from "@/lib/member-schema";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  const parsed = memberSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Please check the form and try again.", errors: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const member = parsed.data;
  const supabase = getSupabaseAdmin();

  const { error } = await supabase.from("members").upsert(
    {
      first_name: member.firstName,
      last_name: member.lastName,
      email: member.email.toLowerCase(),
      phone: member.phone,
      date_of_birth: member.dateOfBirth,
      marital_status: member.maritalStatus,
      is_ordained: member.isOrdained,
      address_line_1: member.addressLine1,
      address_line_2: member.addressLine2 || null,
      city: member.city,
      postal_code: member.postalCode,
      country: member.country,
      occupation: member.occupation || null,
      ministry_department: member.ministryDepartment || null,
      emergency_contact_name: member.emergencyContactName || null,
      emergency_contact_phone: member.emergencyContactPhone || null,
      consent_email: member.consentEmail,
      consent_sms: member.consentSms
    },
    { onConflict: "email" }
  );

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: "You are registered. Welcome to the RCCG family." });
}
