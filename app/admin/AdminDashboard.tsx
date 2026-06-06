"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  ChevronRight,
  Church,
  Download,
  Edit3,
  Home,
  KeyRound,
  LayoutDashboard,
  ListFilter,
  Loader2,
  LogOut,
  Mail,
  MessageSquare,
  Search,
  Send,
  Trash2,
  UsersRound,
  X
} from "lucide-react";
import { fullName, nextBirthdayDate, startOfDay } from "@/lib/birthday";
import type { Member } from "@/lib/member-schema";

type AdminDashboardProps = {
  initialMembers: Member[];
  view: "overview" | "members" | "messages" | "birthdays";
};

type BirthdayWindow = "all" | "today" | "week" | "month";
type MessageAction = {
  members: Member[];
  channel: "email" | "sms";
  title: string;
} | null;

function daysUntil(date: Date) {
  const diff = startOfDay(date).getTime() - startOfDay(new Date()).getTime();
  return Math.round(diff / 86_400_000);
}

function normalize(value: string | null | undefined) {
  return value?.toLowerCase().trim() ?? "";
}

function displayStatus(value: Member["marital_status"]) {
  return value.replaceAll("_", " ");
}

function csvEscape(value: string | number | boolean | null | undefined) {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

function memberToForm(member: Member) {
  return {
    ...member,
    occupation: member.occupation ?? "",
    ministry_department: member.ministry_department ?? "",
    emergency_contact_name: member.emergency_contact_name ?? "",
    emergency_contact_phone: member.emergency_contact_phone ?? ""
  };
}

export function AdminDashboard({ initialMembers, view }: AdminDashboardProps) {
  const [members, setMembers] = useState(initialMembers);
  const [query, setQuery] = useState("");
  const [maritalFilter, setMaritalFilter] = useState("all");
  const [ministryFilter, setMinistryFilter] = useState("all");
  const [ordainedFilter, setOrdainedFilter] = useState("all");
  const [birthdayWindow, setBirthdayWindow] = useState<BirthdayWindow>(view === "birthdays" ? "week" : "all");
  const [selectedId, setSelectedId] = useState("");
  const [editing, setEditing] = useState<Member | null>(null);
  const [messageAction, setMessageAction] = useState<MessageAction>(null);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 3500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  }, []);

  const enrichedMembers = useMemo(
    () =>
      members
        .map((member) => {
          const birthday = nextBirthdayDate(member);
          return { member, birthday, days: daysUntil(birthday) };
        })
        .sort((a, b) => a.days - b.days),
    [members]
  );

  const ministries = useMemo(
    () =>
      Array.from(new Set(members.map((member) => member.ministry_department).filter(Boolean) as string[])).sort(),
    [members]
  );

  const filteredMembers = useMemo(() => {
    const search = normalize(query);
    return enrichedMembers.filter(({ member, days }) => {
      const haystack = [
        fullName(member),
        member.email,
        member.phone,
        member.address_line_1,
        member.city,
        member.postal_code,
        member.occupation,
        member.ministry_department,
        member.emergency_contact_name,
        member.emergency_contact_phone
      ]
        .map(normalize)
        .join(" ");

      const matchesSearch = !search || haystack.includes(search);
      const matchesMarital = maritalFilter === "all" || member.marital_status === maritalFilter;
      const matchesMinistry = ministryFilter === "all" || member.ministry_department === ministryFilter;
      const matchesOrdained =
        ordainedFilter === "all" ||
        (ordainedFilter === "ordained" && member.is_ordained) ||
        (ordainedFilter === "not_ordained" && !member.is_ordained);
      const matchesBirthday =
        birthdayWindow === "all" ||
        (birthdayWindow === "today" && days === 0) ||
        (birthdayWindow === "week" && days >= 0 && days <= 7) ||
        (birthdayWindow === "month" && days >= 0 && days <= 30);

      return matchesSearch && matchesMarital && matchesMinistry && matchesOrdained && matchesBirthday;
    });
  }, [birthdayWindow, enrichedMembers, maritalFilter, ministryFilter, ordainedFilter, query]);

  const selectedMember = filteredMembers.find(({ member }) => member.id === selectedId)?.member ?? null;

  const stats = useMemo(() => {
    const ordained = members.filter((member) => member.is_ordained).length;
    const withMinistry = members.filter((member) => member.ministry_department).length;
    const birthdaysThisWeek = enrichedMembers.filter(({ days }) => days >= 0 && days <= 7).length;
    const missingEmergency = members.filter(
      (member) => !member.emergency_contact_name || !member.emergency_contact_phone
    ).length;

    return { ordained, withMinistry, birthdaysThisWeek, missingEmergency };
  }, [enrichedMembers, members]);

  function exportCsv() {
    const headers = [
      "First name",
      "Last name",
      "Email",
      "Phone",
      "Date of birth",
      "Marital status",
      "Ordained",
      "Address",
      "City",
      "Postcode",
      "Occupation",
      "Ministry",
      "Emergency contact",
      "Emergency phone",
      "Created"
    ];

    const rows = filteredMembers.map(({ member }) => [
      member.first_name,
      member.last_name,
      member.email,
      member.phone,
      member.date_of_birth,
      displayStatus(member.marital_status),
      member.is_ordained,
      member.address_line_1,
      member.city,
      member.postal_code,
      member.occupation,
      member.ministry_department,
      member.emergency_contact_name,
      member.emergency_contact_phone,
      member.created_at
    ]);

    const csv = [headers, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `rccg-members-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function saveMember(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;

    setSaving(true);
    setNotice("");

    const formData = new FormData(event.currentTarget);
    const payload = {
      first_name: String(formData.get("first_name") ?? ""),
      last_name: String(formData.get("last_name") ?? ""),
      email: String(formData.get("email") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      date_of_birth: String(formData.get("date_of_birth") ?? ""),
      marital_status: String(formData.get("marital_status") ?? "prefer_not_to_say"),
      is_ordained: formData.get("is_ordained") === "on",
      address_line_1: String(formData.get("address_line_1") ?? ""),
      city: String(formData.get("city") ?? ""),
      postal_code: String(formData.get("postal_code") ?? ""),
      occupation: String(formData.get("occupation") ?? "") || null,
      ministry_department: String(formData.get("ministry_department") ?? "") || null,
      emergency_contact_name: String(formData.get("emergency_contact_name") ?? "") || null,
      emergency_contact_phone: String(formData.get("emergency_contact_phone") ?? "") || null,
      consent_email: formData.get("consent_email") === "on",
      consent_sms: formData.get("consent_sms") === "on"
    };

    const response = await fetch(`/api/admin/members/${editing.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    const result = await response.json();

    setSaving(false);

    if (!response.ok) {
      setNotice(result.message ?? "Could not update member.");
      return;
    }

    setMembers((current) =>
      current.map((member) => (member.id === editing.id ? ({ ...member, ...payload } as Member) : member))
    );
    setEditing(null);
    setNotice("Member updated.");
  }

  async function deleteMember(member: Member) {
    const confirmed = window.confirm(`Delete ${fullName(member)} from member records? This cannot be undone.`);
    if (!confirmed) return;

    const response = await fetch(`/api/admin/members/${member.id}`, {
      method: "DELETE"
    });
    const result = await response.json();

    if (!response.ok) {
      setNotice(result.message ?? "Could not delete member.");
      return;
    }

    setMembers((current) => current.filter((item) => item.id !== member.id));
    setSelectedId("");
    setNotice("Member deleted.");
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.href = "/admin";
  }

  async function changePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setChangingPassword(true);
    setPasswordError("");

    const form = event.currentTarget;
    const formData = new FormData(form);
    const newPassword = String(formData.get("new_password") ?? "");
    const confirmPassword = String(formData.get("confirm_password") ?? "");

    if (newPassword !== confirmPassword) {
      setChangingPassword(false);
      setPasswordError("New passwords do not match.");
      return;
    }

    const response = await fetch("/api/admin/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        current_password: formData.get("current_password"),
        new_password: newPassword
      })
    });
    const result = await response.json();

    setChangingPassword(false);

    if (!response.ok) {
      setPasswordError(result.message ?? "Could not update password.");
      return;
    }

    form.reset();
    setPasswordOpen(false);
    setNotice("Password updated.");
  }

  function viewAllMembers() {
    window.location.href = "/admin/members";
  }

  function viewUpcomingBirthdays() {
    window.location.href = "/admin/birthdays";
  }

  async function sendMemberMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!messageAction) return;

    setSending(true);
    setNotice("");

    const formData = new FormData(event.currentTarget);
    const payload = {
      channel: messageAction.channel,
      subject: formData.get("subject"),
      body: formData.get("body")
    };
    const results = await Promise.all(
      messageAction.members.map(async (member) => {
        const response = await fetch(`/api/admin/members/${member.id}/message`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        return { ok: response.ok, result: await response.json() };
      })
    );

    setSending(false);

    const failed = results.filter((result) => !result.ok);
    if (failed.length) {
      setNotice(failed[0]?.result.message ?? "Could not send message.");
      return;
    }

    setMessageAction(null);
    setNotice(
      `${messageAction.channel === "email" ? "Email" : "SMS"} sent to ${messageAction.members.length} member${
        messageAction.members.length === 1 ? "" : "s"
      }.`
    );
  }

  return (
    <main className="manager-shell">
      <aside className="manager-sidebar">
        <div className="manager-brand">
          <LayoutDashboard size={24} />
          <div>
            <strong>RCCG</strong>
            <span>Member manager</span>
          </div>
        </div>
        <nav className="manager-nav" aria-label="Admin sections">
          <a className={view === "overview" ? "active" : ""} href="/admin">Overview</a>
          <a className={view === "members" ? "active" : ""} href="/admin/members">Members</a>
          <a className={view === "messages" ? "active" : ""} href="/admin/messages">Messages</a>
          <a className={view === "birthdays" ? "active" : ""} href="/admin/birthdays">Birthdays</a>
        </nav>
      </aside>

      <section className="manager-main">
        <header className="manager-topbar">
          <div>
            <p>Admin dashboard</p>
            <h1>
              {view === "overview"
                ? "Overview"
                : view === "members"
                  ? "Members"
                  : view === "messages"
                    ? "Messages"
                    : "Birthdays"}
            </h1>
          </div>
          <div className="manager-top-actions">
            <button className="ghost-button" onClick={() => setPasswordOpen(true)}>
              <KeyRound size={17} />
              Password
            </button>
            <button className="ghost-button" onClick={exportCsv}>
              <Download size={17} />
              Export CSV
            </button>
            <button className="ghost-button" onClick={logout}>
              <LogOut size={17} />
              Sign out
            </button>
          </div>
        </header>

        {notice ? <div className="manager-toast" role="status">{notice}</div> : null}

        {view === "overview" ? (
          <div className="overview">
            <section className="overview-hero">
              <div className="overview-hero-text">
                <p>{greeting}</p>
                <h2>Welcome back, admin</h2>
                <span>Here&apos;s what&apos;s happening across your member community today.</span>
              </div>
              <div className="overview-hero-badge">
                <UsersRound size={22} />
                <strong>{members.length}</strong>
                <small>Total members</small>
              </div>
            </section>

            <section className="stat-grid" aria-label="Member metrics">
              <article className="stat-card teal">
                <span className="stat-icon"><UsersRound size={20} /></span>
                <strong>{members.length}</strong>
                <small>Total members</small>
              </article>
              <article className="stat-card coral">
                <span className="stat-icon"><CalendarDays size={20} /></span>
                <strong>{stats.birthdaysThisWeek}</strong>
                <small>Birthdays in 7 days</small>
              </article>
              <article className="stat-card gold">
                <span className="stat-icon"><Church size={20} /></span>
                <strong>{stats.withMinistry}</strong>
                <small>Serving in ministry</small>
              </article>
              <article className="stat-card alert">
                <span className="stat-icon"><AlertCircle size={20} /></span>
                <strong>{stats.missingEmergency}</strong>
                <small>Missing emergency info</small>
              </article>
            </section>

            <section className="quick-actions" aria-label="Admin quick actions">
              <h3>Quick actions</h3>
              <div className="quick-action-grid">
                <button className="quick-action" onClick={viewAllMembers}>
                  <span className="qa-icon teal"><UsersRound size={22} /></span>
                  <span className="qa-text">
                    <strong>View all members</strong>
                    <small>Open the full member directory</small>
                  </span>
                  <ChevronRight className="qa-arrow" size={18} />
                </button>
                <button
                  className="quick-action"
                  disabled={members.length === 0}
                  onClick={() => (window.location.href = "/admin/messages?mode=email")}
                >
                  <span className="qa-icon coral"><Mail size={22} /></span>
                  <span className="qa-text">
                    <strong>Email members</strong>
                    <small>Compose a member email</small>
                  </span>
                  <ChevronRight className="qa-arrow" size={18} />
                </button>
                <button
                  className="quick-action"
                  disabled={members.length === 0}
                  onClick={() => (window.location.href = "/admin/messages?mode=sms")}
                >
                  <span className="qa-icon gold"><MessageSquare size={22} /></span>
                  <span className="qa-text">
                    <strong>Send SMS</strong>
                    <small>Compose a member text</small>
                  </span>
                  <ChevronRight className="qa-arrow" size={18} />
                </button>
                <button className="quick-action" onClick={viewUpcomingBirthdays}>
                  <span className="qa-icon teal"><CalendarDays size={22} /></span>
                  <span className="qa-text">
                    <strong>Upcoming birthdays</strong>
                    <small>Members in the next 7 days</small>
                  </span>
                  <ChevronRight className="qa-arrow" size={18} />
                </button>
                <button className="quick-action" onClick={exportCsv}>
                  <span className="qa-icon coral"><Download size={22} /></span>
                  <span className="qa-text">
                    <strong>Export members</strong>
                    <small>Download the current list as CSV</small>
                  </span>
                  <ChevronRight className="qa-arrow" size={18} />
                </button>
                <button className="quick-action" onClick={() => setPasswordOpen(true)}>
                  <span className="qa-icon gold"><KeyRound size={22} /></span>
                  <span className="qa-text">
                    <strong>Change password</strong>
                    <small>Update your admin login</small>
                  </span>
                  <ChevronRight className="qa-arrow" size={18} />
                </button>
              </div>
            </section>
          </div>
        ) : null}

        {view === "messages" ? (
          <section className="message-center">
            <article>
              <Mail size={28} />
              <h2>Email members</h2>
              <p>Send a custom email to every member, or narrow the list first using the member directory.</p>
              <button
                className="submit-button"
                disabled={members.length === 0}
                onClick={() => setMessageAction({ members, channel: "email", title: "Email all members" })}
              >
                <Send size={17} />
                Compose email
              </button>
            </article>
            <article>
              <MessageSquare size={28} />
              <h2>SMS members</h2>
              <p>Send a short text message to all members with SMS enabled and a valid phone number.</p>
              <button
                className="submit-button"
                disabled={members.length === 0}
                onClick={() => setMessageAction({ members, channel: "sms", title: "SMS all members" })}
              >
                <Send size={17} />
                Compose SMS
              </button>
            </article>
          </section>
        ) : null}

        {view === "members" || view === "birthdays" ? <section className="manager-workspace">
          <div className="member-directory" id="members">
            <div className="directory-toolbar">
              <div className="directory-toolbar-main">
                <label className="search-control">
                  <Search size={17} />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search members..."
                  />
                </label>
                <button className="filter-toggle" onClick={() => setFiltersOpen((current) => !current)}>
                  <ListFilter size={17} />
                  Filters
                </button>
              </div>
              <div className={`filter-panel ${filtersOpen ? "open" : ""}`}>
                <select value={birthdayWindow} onChange={(event) => setBirthdayWindow(event.target.value as BirthdayWindow)}>
                  <option value="all">All birthdays</option>
                  <option value="today">Today</option>
                  <option value="week">Next 7 days</option>
                  <option value="month">Next 30 days</option>
                </select>
                <select value={maritalFilter} onChange={(event) => setMaritalFilter(event.target.value)}>
                  <option value="all">All statuses</option>
                  <option value="single">Single</option>
                  <option value="married">Married</option>
                  <option value="widowed">Widowed</option>
                  <option value="divorced">Divorced</option>
                  <option value="prefer_not_to_say">Prefer not to say</option>
                </select>
                <select value={ordainedFilter} onChange={(event) => setOrdainedFilter(event.target.value)}>
                  <option value="all">All ordination</option>
                  <option value="ordained">Ordained</option>
                  <option value="not_ordained">Not ordained</option>
                </select>
                <select value={ministryFilter} onChange={(event) => setMinistryFilter(event.target.value)}>
                  <option value="all">All ministries</option>
                  {ministries.map((ministry) => (
                    <option key={ministry} value={ministry}>{ministry}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="member-table" role="table" aria-label="Members">
              <div className="member-table-head" role="row">
                <span>No.</span>
                <span>Name</span>
                <span>Contact</span>
                <span>Birthday</span>
                <span>Ministry</span>
              </div>
              {filteredMembers.map(({ member, birthday, days }, index) => (
                <button
                  className={`member-table-row ${selectedMember?.id === member.id ? "active" : ""}`}
                  key={member.id}
                  onClick={() => setSelectedId(member.id)}
                  role="row"
                >
                  <span className="row-number">{String(index + 1).padStart(2, "0")}</span>
                  <span className="member-cell-main">
                    <strong>{fullName(member)}</strong>
                    <small>
                      <span className="mini-chip">{displayStatus(member.marital_status)}</span>
                      {member.is_ordained ? <span className="mini-chip ordained">Ordained</span> : null}
                    </small>
                  </span>
                  <span className="member-cell-contact">
                    <small>{member.email}</small>
                    <small>{member.phone}</small>
                  </span>
                  <span className="member-cell-birthday">
                    <strong>{birthday.toLocaleDateString("en", { month: "short", day: "numeric" })}</strong>
                    <small className={days <= 7 ? "date-chip urgent" : "date-chip"}>{days === 0 ? "Today" : `${days} days`}</small>
                  </span>
                  <span className="member-cell-ministry">
                    <small>{member.ministry_department || "Not assigned"}</small>
                    <small>{[member.city, member.postal_code].filter(Boolean).join(", ") || "No location"}</small>
                  </span>
                </button>
              ))}
              {filteredMembers.length === 0 ? (
                <div className="directory-empty">
                  <UsersRound size={30} />
                  <h2>No members match these filters</h2>
                  <p>Use View all members to reset the directory.</p>
                  <button className="ghost-button" onClick={viewAllMembers}>View all members</button>
                </div>
              ) : null}
            </div>
          </div>

          <aside className={`profile-panel ${selectedMember ? "has-selection" : ""}`} id="profile">
            {selectedMember ? (
              <>
                <button className="profile-back" onClick={() => setSelectedId("")}>
                  <ArrowLeft size={18} />
                  Back to members
                </button>
                <div className="profile-header">
                  <div className="profile-avatar">
                    {selectedMember.first_name.slice(0, 1)}{selectedMember.last_name.slice(0, 1)}
                  </div>
                  <div>
                    <h2>{fullName(selectedMember)}</h2>
                    <p>{selectedMember.ministry_department || "No ministry assigned"}</p>
                  </div>
                </div>

                <div className="profile-actions">
                  <button onClick={() => setMessageAction({ members: [selectedMember], channel: "email", title: "Send email" })}>
                    <Send size={16} />
                    Send email
                  </button>
                  <button onClick={() => setMessageAction({ members: [selectedMember], channel: "sms", title: "Send SMS" })}>
                    <MessageSquare size={16} />
                    Send SMS
                  </button>
                  <button onClick={() => setEditing(selectedMember)}>
                    <Edit3 size={16} />
                    Edit
                  </button>
                </div>

                <div className="profile-actions secondary">
                  <button className="danger-button" onClick={() => deleteMember(selectedMember)}>
                    <Trash2 size={16} />
                    Delete
                  </button>
                </div>

                <dl className="profile-details">
                  <div><dt>Email</dt><dd><Mail size={15} />{selectedMember.email}</dd></div>
                  <div><dt>Phone</dt><dd><MessageSquare size={15} />{selectedMember.phone}</dd></div>
                  <div><dt>Address</dt><dd><Home size={15} />{[selectedMember.address_line_1, selectedMember.city, selectedMember.postal_code].filter(Boolean).join(", ")}</dd></div>
                  <div><dt>Birthday</dt><dd><CalendarDays size={15} />{nextBirthdayDate(selectedMember).toLocaleDateString("en", { month: "long", day: "numeric" })}</dd></div>
                  <div><dt>Occupation</dt><dd><BriefcaseBusiness size={15} />{selectedMember.occupation || "Not provided"}</dd></div>
                  <div><dt>Emergency</dt><dd><MessageSquare size={15} />{[selectedMember.emergency_contact_name, selectedMember.emergency_contact_phone].filter(Boolean).join(" - ") || "Not provided"}</dd></div>
                </dl>
              </>
            ) : (
              <div className="empty-profile">
                <UsersRound size={28} />
                <h2>No member selected</h2>
                <p>Adjust filters or select a member from the directory.</p>
              </div>
            )}
          </aside>
        </section> : null}
      </section>

      {editing ? (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <form className="edit-modal" onSubmit={saveMember}>
            <div className="modal-titlebar">
              <div>
                <p>Edit member</p>
                <h2>{fullName(editing)}</h2>
              </div>
              <button type="button" className="icon-button" onClick={() => setEditing(null)} aria-label="Close">
                <X size={18} />
              </button>
            </div>

            <div className="edit-grid">
              <label>First name<input name="first_name" defaultValue={memberToForm(editing).first_name} required /></label>
              <label>Last name<input name="last_name" defaultValue={memberToForm(editing).last_name} required /></label>
              <label>Email<input name="email" type="email" defaultValue={memberToForm(editing).email} required /></label>
              <label>Phone<input name="phone" defaultValue={memberToForm(editing).phone} required /></label>
              <label>Date of birth<input name="date_of_birth" type="date" defaultValue={memberToForm(editing).date_of_birth} required /></label>
              <label>
                Marital status
                <select name="marital_status" defaultValue={memberToForm(editing).marital_status} required>
                  <option value="single">Single</option>
                  <option value="married">Married</option>
                  <option value="widowed">Widowed</option>
                  <option value="divorced">Divorced</option>
                  <option value="prefer_not_to_say">Prefer not to say</option>
                </select>
              </label>
              <label>Address<input name="address_line_1" defaultValue={memberToForm(editing).address_line_1} required /></label>
              <label>City<input name="city" defaultValue={memberToForm(editing).city} required /></label>
              <label>Postcode<input name="postal_code" defaultValue={memberToForm(editing).postal_code} required /></label>
              <label>Occupation<input name="occupation" defaultValue={memberToForm(editing).occupation} /></label>
              <label>Ministry<input name="ministry_department" defaultValue={memberToForm(editing).ministry_department} /></label>
              <label>Emergency contact<input name="emergency_contact_name" defaultValue={memberToForm(editing).emergency_contact_name} /></label>
              <label>Emergency phone<input name="emergency_contact_phone" defaultValue={memberToForm(editing).emergency_contact_phone} /></label>
            </div>

            <div className="modal-checks">
              <label><input name="is_ordained" type="checkbox" defaultChecked={editing.is_ordained} />Ordained minister</label>
              <label><input name="consent_email" type="checkbox" defaultChecked={editing.consent_email} />Email enabled</label>
              <label><input name="consent_sms" type="checkbox" defaultChecked={editing.consent_sms} />SMS enabled</label>
            </div>

            <div className="modal-actions">
              <button type="button" className="ghost-button" onClick={() => setEditing(null)}>Cancel</button>
              <button className="submit-button" disabled={saving}>
                {saving ? "Saving..." : <><Check size={17} />Save changes</>}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {messageAction ? (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <form className="edit-modal message-modal" onSubmit={sendMemberMessage}>
            <div className="modal-titlebar">
              <div>
                <p>{messageAction.channel === "email" ? "Send email" : "Send SMS"}</p>
                <h2>{messageAction.title}</h2>
              </div>
              <button type="button" className="icon-button" onClick={() => setMessageAction(null)} aria-label="Close">
                <X size={18} />
              </button>
            </div>

            <div className="message-recipient">
              {messageAction.channel === "email" ? <Mail size={18} /> : <MessageSquare size={18} />}
              <span>
                {messageAction.members.length === 1
                  ? messageAction.channel === "email"
                    ? messageAction.members[0].email
                    : messageAction.members[0].phone
                  : `${messageAction.members.length} members in current list`}
              </span>
            </div>

            {messageAction.channel === "email" ? (
              <label className="message-field">
                Subject
                <input name="subject" defaultValue="Message from RCCG Worship Tabernacle" required />
              </label>
            ) : null}

            <label className="message-field">
              Message
              <textarea
                name="body"
                rows={8}
                defaultValue={messageAction.members.length === 1 ? `Hello ${messageAction.members[0].first_name},\n\n` : "Hello,\n\n"}
                maxLength={messageAction.channel === "sms" ? 320 : 1600}
                required
              />
            </label>

            <div className="modal-actions">
              <button type="button" className="ghost-button" onClick={() => setMessageAction(null)}>Cancel</button>
              <button className="submit-button" disabled={sending}>
                {sending ? <Loader2 className="spin" size={17} /> : <Send size={17} />}
                {sending ? "Sending..." : `Send ${messageAction.channel === "email" ? "email" : "SMS"}`}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {passwordOpen ? (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <form className="edit-modal password-modal" onSubmit={changePassword}>
            <div className="modal-titlebar">
              <div>
                <p>Account security</p>
                <h2>Change password</h2>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => {
                  setPasswordOpen(false);
                  setPasswordError("");
                }}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <label className="message-field">
              Current password
              <input name="current_password" type="password" autoComplete="current-password" required />
            </label>
            <label className="message-field">
              New password
              <input name="new_password" type="password" autoComplete="new-password" minLength={8} required />
            </label>
            <label className="message-field">
              Confirm new password
              <input name="confirm_password" type="password" autoComplete="new-password" minLength={8} required />
            </label>

            <p className="password-hint">Use at least 8 characters. You&apos;ll stay signed in after updating.</p>
            {passwordError ? <p className="form-message error">{passwordError}</p> : null}

            <div className="modal-actions">
              <button
                type="button"
                className="ghost-button"
                onClick={() => {
                  setPasswordOpen(false);
                  setPasswordError("");
                }}
              >
                Cancel
              </button>
              <button className="submit-button" disabled={changingPassword}>
                {changingPassword ? <Loader2 className="spin" size={17} /> : <KeyRound size={17} />}
                {changingPassword ? "Updating..." : "Update password"}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      <nav className="mobile-admin-tabs" aria-label="Admin mobile navigation">
        <a className={view === "overview" ? "active" : ""} href="/admin">
          <LayoutDashboard size={20} />
          <span>Overview</span>
        </a>
        <a className={view === "members" ? "active" : ""} href="/admin/members">
          <UsersRound size={20} />
          <span>Members</span>
        </a>
        <a className={view === "messages" ? "active" : ""} href="/admin/messages">
          <MessageSquare size={20} />
          <span>Messages</span>
        </a>
        <a className={view === "birthdays" ? "active" : ""} href="/admin/birthdays">
          <CalendarDays size={20} />
          <span>Birthdays</span>
        </a>
      </nav>
    </main>
  );
}
