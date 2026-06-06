import { Resend } from "resend";
import twilio from "twilio";
import type { Member } from "@/lib/member-schema";
import type { MemberFormInput } from "@/lib/member-schema";
import { fullName } from "@/lib/birthday";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

function fromEmail() {
  return process.env.RESEND_FROM_EMAIL ?? "RCCG Members <onboarding@resend.dev>";
}

export async function sendMemberSignupConfirmation(member: MemberFormInput) {
  if (!resend || !member.consentEmail) return { skipped: true };

  return resend.emails.send({
    from: fromEmail(),
    to: member.email,
    subject: "Your member profile has been received",
    text: `Hello ${member.firstName},\n\nThank you for completing your RCCG Worship Tabernacle member profile. We have received your details and will use them to keep our member records current.\n\nIf any information changes, please contact the us.\n\nRCCG Worship Tabernacle`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#17211f;max-width:640px">
        <h1 style="color:#0f766e;margin:0 0 16px">Profile received</h1>
        <p>Hello ${member.firstName},</p>
        <p>Thank you for completing your RCCG Worship Tabernacle member profile.</p>
        <p>We have received your details and will use them to keep our member records current.</p>
        <p>If any information changes, please contact the us.</p>
        <p style="margin-top:24px">With love,<br/>RCCG Worship Tabernacle</p>
      </div>
    `
  });
}

export async function sendMemberBirthdayEmail(member: Member) {
  if (!resend || !member.consent_email) return { skipped: true };

  return resend.emails.send({
    from: fromEmail(),
    to: member.email,
    subject: `Happy birthday, ${member.first_name}!`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#17211f">
        <h1 style="color:#0f766e">Happy birthday, ${member.first_name}!</h1>
        <p>Today we celebrate you and thank God for your life.</p>
        <p>May this new year bring joy, strength, wisdom, and fresh grace.</p>
        <p>With love,<br/>RCCG Family</p>
      </div>
    `
  });
}

export async function sendMemberBirthdaySms(member: Member) {
  if (!member.consent_sms) return { skipped: true };

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_PHONE;

  if (!accountSid || !authToken || !from) return { skipped: true };

  const client = twilio(accountSid, authToken);
  return client.messages.create({
    from,
    to: member.phone,
    body: `Happy birthday, ${member.first_name}! RCCG celebrates you today. May God bless your new year with joy and grace.`
  });
}

export async function sendAdminBirthdayEmail(members: Member[], reminderDays?: number) {
  if (!resend || !process.env.ADMIN_EMAIL || members.length === 0) return { skipped: true };

  const subject =
    reminderDays === undefined
      ? `Birthday today: ${members.map(fullName).join(", ")}`
      : `Birthday reminder: ${members.map(fullName).join(", ")} in ${reminderDays} day${reminderDays === 1 ? "" : "s"}`;

  const rows = members
    .map(
      (member) => `
        <tr>
          <td style="padding:8px;border-bottom:1px solid #d7ebe6">${fullName(member)}</td>
          <td style="padding:8px;border-bottom:1px solid #d7ebe6">${member.email}</td>
          <td style="padding:8px;border-bottom:1px solid #d7ebe6">${member.phone}</td>
        </tr>
      `
    )
    .join("");

  return resend.emails.send({
    from: fromEmail(),
    to: process.env.ADMIN_EMAIL,
    subject,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#17211f">
        <h1 style="color:#0f766e">${reminderDays === undefined ? "Birthday today" : "Upcoming birthday reminder"}</h1>
        <table style="border-collapse:collapse;width:100%;max-width:720px">
          <thead>
            <tr>
              <th align="left" style="padding:8px;border-bottom:2px solid #0f766e">Member</th>
              <th align="left" style="padding:8px;border-bottom:2px solid #0f766e">Email</th>
              <th align="left" style="padding:8px;border-bottom:2px solid #0f766e">Phone</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `
  });
}
