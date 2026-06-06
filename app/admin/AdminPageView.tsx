import { Search } from "lucide-react";
import { cookies } from "next/headers";
import { AdminDashboard } from "@/app/admin/AdminDashboard";
import { AdminLogin } from "@/app/admin/AdminLogin";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionValue } from "@/lib/admin-auth";
import type { Member } from "@/lib/member-schema";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const memberSelect = `
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
`;

type AdminView = "overview" | "members" | "messages" | "birthdays";

export async function AdminPageView({ view }: { view: AdminView }) {
  const expectedKey = process.env.ADMIN_DASHBOARD_KEY;

  if (!expectedKey) {
    return (
      <main className="admin-lock">
        <section>
          <Search size={28} />
          <h1>Admin setup needed</h1>
          <p>Add ADMIN_DASHBOARD_KEY to your environment variables to enable manager actions.</p>
        </section>
      </main>
    );
  }

  const cookieStore = await cookies();
  const isSignedIn = verifyAdminSessionValue(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);

  if (!isSignedIn) {
    return <AdminLogin />;
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("members").select(memberSelect).order("first_name", { ascending: true });

  if (error) {
    return (
      <main className="admin-lock">
        <section>
          <Search size={28} />
          <h1>Could not load members</h1>
          <p>{error.message}</p>
        </section>
      </main>
    );
  }

  return <AdminDashboard initialMembers={(data ?? []) as Member[]} view={view} />;
}
