import type { Member } from "@/lib/member-schema";

export function getReminderDays() {
  return (process.env.BIRTHDAY_REMINDER_DAYS ?? "7,3,1")
    .split(",")
    .map((value) => Number.parseInt(value.trim(), 10))
    .filter((value) => Number.isInteger(value) && value > 0);
}

export function birthdayKey(date: Date) {
  return `${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function memberBirthdayKey(member: Pick<Member, "date_of_birth">) {
  return member.date_of_birth.slice(5, 10);
}

export function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function membersForBirthday(members: Member[], date: Date) {
  const key = birthdayKey(date);
  return members.filter((member) => memberBirthdayKey(member) === key);
}

export function fullName(member: Pick<Member, "first_name" | "last_name">) {
  return `${member.first_name} ${member.last_name}`.trim();
}

export function nextBirthdayDate(member: Pick<Member, "date_of_birth">, from = new Date()) {
  const [month, day] = memberBirthdayKey(member).split("-").map(Number);
  const candidate = new Date(from.getFullYear(), month - 1, day);
  if (candidate < startOfDay(from)) {
    candidate.setFullYear(candidate.getFullYear() + 1);
  }
  return candidate;
}

export function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
