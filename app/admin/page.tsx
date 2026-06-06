import { BriefcaseBusiness, CalendarDays, Church, Home, Mail, Phone, Search, ShieldCheck } from "lucide-react";
import { fullName, nextBirthdayDate, startOfDay } from "@/lib/birthday";
import type { Member } from "@/lib/member-schema";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import "@/app/globals.css";

type AdminPageProps = {
  searchParams: Promise<{ key?: string }>;
};

function daysUntil(date: Date) {
  const diff = startOfDay(date).getTime() - startOfDay(new Date()).getTime();
  return Math.round(diff / 86_400_000);
}

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const params = await searchParams;
  const expectedKey = process.env.ADMIN_DASHBOARD_KEY;

  if (!expectedKey || params.key !== expectedKey) {
    return (
      <main className="admin-lock">
        <section>
          <Search size={28} />
          <h1>Admin access</h1>
          <p>Add your admin key to the URL to view member records.</p>
        </section>
      </main>
    );
  }

  const supabase = getSupabaseAdmin();
  const { data } = await supabase
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
      address_line_2,
      city,
      postal_code,
      country,
      occupation,
      ministry_department,
      emergency_contact_name,
      emergency_contact_phone,
      consent_email,
      consent_sms,
      created_at
    `)
    .order("first_name", { ascending: true });

  const members = ((data ?? []) as Member[])
    .map((member) => ({
      member,
      birthday: nextBirthdayDate(member),
      days: daysUntil(nextBirthdayDate(member))
    }))
    .sort((a, b) => a.days - b.days);

  return (
    <main className="admin-shell">
      <header className="admin-header">
        <div>
          <p>RCCG member care</p>
          <h1>Member records</h1>
        </div>
        <div className="metric">
          <span>{members.length}</span>
          <small>members</small>
        </div>
      </header>

      <section className="birthday-list" aria-label="Member records">
        {members.map(({ member, birthday, days }) => (
          <article className="member-row" key={member.id}>
            <div className="avatar">{member.first_name.slice(0, 1)}{member.last_name.slice(0, 1)}</div>
            <div>
              <h2>{fullName(member)}</h2>
              <p>
                <CalendarDays size={16} />
                {birthday.toLocaleDateString("en", { month: "long", day: "numeric" })}
                <span>{days === 0 ? "Today" : `in ${days} days`}</span>
              </p>
              <div className="member-tags">
                <span>{member.marital_status.replaceAll("_", " ")}</span>
                {member.is_ordained ? <span><ShieldCheck size={14} />Ordained</span> : null}
              </div>
            </div>
            <div className="contact-lines">
              <span><Mail size={15} />{member.email}</span>
              <span><Phone size={15} />{member.phone}</span>
              <span><Home size={15} />{[member.address_line_1, member.address_line_2, member.city, member.postal_code, member.country].filter(Boolean).join(", ")}</span>
              {member.occupation ? <span><BriefcaseBusiness size={15} />{member.occupation}</span> : null}
              {member.ministry_department ? <span><Church size={15} />{member.ministry_department}</span> : null}
              {member.emergency_contact_name || member.emergency_contact_phone ? (
                <span><Phone size={15} />Emergency: {[member.emergency_contact_name, member.emergency_contact_phone].filter(Boolean).join(" - ")}</span>
              ) : null}
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
