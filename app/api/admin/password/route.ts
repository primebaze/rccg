import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import {
  ADMIN_SESSION_COOKIE,
  hashPassword,
  setStoredPasswordHash,
  verifyAdminPassword,
  verifyAdminSessionValue
} from "@/lib/admin-auth";
import { getClientIp, rateLimit, tooManyRequests } from "@/lib/rate-limit";

const passwordSchema = z.object({
  current_password: z.string().min(1),
  new_password: z.string().min(8, "New password must be at least 8 characters.")
});

export async function POST(request: Request) {
  const cookieStore = await cookies();
  if (!verifyAdminSessionValue(cookieStore.get(ADMIN_SESSION_COOKIE)?.value)) {
    return NextResponse.json({ message: "Not signed in." }, { status: 401 });
  }

  // Defense-in-depth: cap current-password guessing at 10 tries per IP / 10 min.
  const gate = rateLimit(`password:${getClientIp(request)}`, 10, 600);
  if (!gate.ok) {
    return tooManyRequests(gate.retryAfterSeconds, "Too many attempts. Please wait a few minutes and try again.");
  }

  const payload = await request.json().catch(() => null);
  const parsed = passwordSchema.safeParse(payload);

  if (!parsed.success) {
    const message = parsed.error?.issues[0]?.message ?? "Enter your current and new password.";
    return NextResponse.json({ message }, { status: 400 });
  }

  const currentMatches = await verifyAdminPassword(parsed.data.current_password);
  if (!currentMatches) {
    return NextResponse.json({ message: "Current password is incorrect." }, { status: 401 });
  }

  if (parsed.data.new_password === parsed.data.current_password) {
    return NextResponse.json(
      { message: "New password must be different from the current one." },
      { status: 400 }
    );
  }

  try {
    await setStoredPasswordHash(hashPassword(parsed.data.new_password));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update password.";
    return NextResponse.json({ message }, { status: 500 });
  }

  return NextResponse.json({ message: "Password updated." });
}
