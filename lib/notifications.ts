import { Resend } from "resend";
import twilio from "twilio";
import type { Member } from "@/lib/member-schema";
import type { MemberFormInput } from "@/lib/member-schema";
import { fullName } from "@/lib/birthday";
import { toE164 } from "@/lib/phone";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

type EmailSendResult =
  | { skipped: true; reason: string }
  | { skipped: false; id?: string; error?: unknown };

type BatchEmailSendResult =
  | { skipped: true; reason: string; sent: 0 }
  | { skipped: false; sent: number; ids: string[]; error?: unknown };

function fromEmail() {
  return process.env.RESEND_FROM_EMAIL ?? "RCCG Members <onboarding@resend.dev>";
}

function replyToAddress() {
  return process.env.REPLY_TO_EMAIL ?? process.env.ADMIN_EMAIL ?? undefined;
}

// Twilio credentials. A restricted API key is preferred: it can be scoped to
// just sending messages and rotated without touching the account. The account
// auth token still works as a fallback, but it grants full account access.
function twilioSender() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const from = process.env.TWILIO_FROM_PHONE;
  if (!accountSid || !from) return null;

  const apiKeySid = process.env.TWILIO_API_KEY_SID;
  const apiKeySecret = process.env.TWILIO_API_KEY_SECRET;
  if (apiKeySid && apiKeySecret) {
    return { client: twilio(apiKeySid, apiKeySecret, { accountSid }), from };
  }

  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) return null;
  return { client: twilio(accountSid, authToken), from };
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function customEmailHtml(body: string) {
  return `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#17211f;max-width:640px">
      ${body
        .split("\n")
        .filter(Boolean)
        .map((line) => `<p>${escapeHtml(line)}</p>`)
        .join("")}
      <p style="margin-top:24px">RCCG Worship Tabernacle</p>
    </div>
  `;
}

export async function sendMemberSignupConfirmation(member: MemberFormInput): Promise<EmailSendResult> {
  if (!resend) return { skipped: true, reason: "RESEND_API_KEY is not configured" };
  if (!member.consentEmail) return { skipped: true, reason: "email consent is disabled" };

  const result = await resend.emails.send({
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

  if (result.error) {
    return { skipped: false, error: result.error };
  }

  return { skipped: false, id: result.data?.id };
}

function birthdayText(firstName: string) {
  return `Happy birthday, ${firstName}!\n\nToday we celebrate you and thank God for your life.\n\nMay this new year bring joy, strength, wisdom, and fresh grace.\n\nWith love,\nRCCG Family`;
}

export async function sendMemberBirthdayEmail(member: Member) {
  if (!resend || !member.consent_email) return { skipped: true };

  return resend.emails.send({
    from: fromEmail(),
    to: member.email,
    subject: `Happy birthday, ${member.first_name}!`,
    replyTo: replyToAddress(),
    text: birthdayText(member.first_name),
    html: `
      <div style="font-family:Arial,sans-serif;font-size:16px;line-height:1.6;color:#17211f">
        <p>Happy birthday, ${escapeHtml(member.first_name)}!</p>
        <p>Today we celebrate you and thank God for your life.</p>
        <p>May this new year bring joy, strength, wisdom, and fresh grace.</p>
        <p>With love,<br/>RCCG Family</p>
      </div>
    `
  });
}

export async function sendMemberBirthdayEmailBatch(
  members: Member[],
  idempotencyKey: string
): Promise<BatchEmailSendResult> {
  if (!resend) return { skipped: true, reason: "RESEND_API_KEY is not configured", sent: 0 };

  const recipients = members.filter((member) => member.consent_email);
  if (recipients.length === 0) {
    return { skipped: true, reason: "No birthday emails to send", sent: 0 };
  }
  if (recipients.length > 100) {
    return { skipped: true, reason: "A Resend batch can contain at most 100 emails", sent: 0 };
  }

  const result = await resend.batch.send(
    recipients.map((member) => ({
      from: fromEmail(),
      to: member.email,
      subject: `Happy birthday, ${member.first_name}!`,
      replyTo: replyToAddress(),
      text: birthdayText(member.first_name),
      html: `
        <div style="font-family:Arial,sans-serif;font-size:16px;line-height:1.6;color:#17211f">
          <p>Happy birthday, ${escapeHtml(member.first_name)}!</p>
          <p>Today we celebrate you and thank God for your life.</p>
          <p>May this new year bring joy, strength, wisdom, and fresh grace.</p>
          <p>With love,<br/>RCCG Family</p>
        </div>
      `
    })),
    { idempotencyKey }
  );

  if (result.error) {
    return { skipped: false, sent: 0, ids: [], error: result.error };
  }

  const ids = result.data?.data.map((email) => email.id) ?? [];
  return { skipped: false, sent: ids.length, ids };
}

export async function sendMemberBirthdaySms(member: Member) {
  if (!member.consent_sms) return { skipped: true };

  const sender = twilioSender();
  if (!sender) return { skipped: true };

  const { client, from } = sender;
  return client.messages.create({
    from,
    to: toE164(member.phone),
    body: `Happy birthday, ${member.first_name}! RCCG celebrates you today. May God bless your new year with joy and grace.`
  });
}

export async function sendCustomMemberEmail(member: Member, subject: string, body: string) {
  if (!resend || !member.consent_email) return { skipped: true };

  return resend.emails.send({
    from: fromEmail(),
    to: member.email,
    subject,
    text: body,
    html: customEmailHtml(body)
  });
}

export async function sendCustomMemberEmailBatch(
  members: Member[],
  subject: string,
  body: string,
  idempotencyKey: string
): Promise<BatchEmailSendResult> {
  if (!resend) return { skipped: true, reason: "RESEND_API_KEY is not configured", sent: 0 };

  const recipients = members.filter((member) => member.consent_email);
  if (recipients.length === 0) {
    return { skipped: true, reason: "No selected members have email enabled", sent: 0 };
  }
  if (recipients.length > 100) {
    return { skipped: true, reason: "A Resend batch can contain at most 100 emails", sent: 0 };
  }

  const result = await resend.batch.send(
    recipients.map((member) => ({
      from: fromEmail(),
      to: member.email,
      subject,
      text: body,
      html: customEmailHtml(body)
    })),
    { idempotencyKey }
  );

  if (result.error) {
    return { skipped: false, sent: 0, ids: [], error: result.error };
  }

  const ids = result.data?.data.map((email) => email.id) ?? [];
  return { skipped: false, sent: ids.length, ids };
}

export async function sendCustomMemberSms(member: Member, body: string) {
  if (!member.consent_sms) return { skipped: true };

  const sender = twilioSender();
  if (!sender) return { skipped: true };

  const { client, from } = sender;
  return client.messages.create({
    from,
    to: toE164(member.phone),
    body
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

  const textRows = members
    .map((member) => `- ${fullName(member)} | ${member.email} | ${member.phone}`)
    .join("\n");

  return resend.emails.send({
    from: fromEmail(),
    to: process.env.ADMIN_EMAIL,
    subject,
    text: `${reminderDays === undefined ? "Birthday today" : "Upcoming birthday reminder"}\n\n${textRows}`,
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
