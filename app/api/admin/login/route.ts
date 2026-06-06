import { NextResponse } from "next/server";
import { z } from "zod";
import {
  ADMIN_SESSION_COOKIE,
  constantTimeEquals,
  createAdminSessionValue,
  getAdminCookieOptions,
  getAdminUsername,
  verifyAdminPassword
} from "@/lib/admin-auth";
import { getClientIp, rateLimit, resetRateLimit, tooManyRequests } from "@/lib/rate-limit";

const loginSchema = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(1)
});

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function POST(request: Request) {
  // Per-IP throttle: max 3 attempts per IP per 15 minutes. A successful login
  // clears the counter so a legitimate admin is never locked out.
  const ip = getClientIp(request);
  const key = `login:${ip}`;
  const gate = rateLimit(key, 3, 900);
  if (!gate.ok) {
    return tooManyRequests(gate.retryAfterSeconds, "Too many login attempts. Please wait a few minutes and try again.");
  }

  // Global gate to blunt distributed brute force across rotating IPs.
  const globalGate = rateLimit("login:global", 30, 300);
  if (!globalGate.ok) {
    return tooManyRequests(globalGate.retryAfterSeconds, "Login is temporarily busy. Please try again shortly.");
  }

  const payload = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ message: "Enter your admin login details." }, { status: 400 });
  }

  if (!process.env.ADMIN_DASHBOARD_KEY) {
    return NextResponse.json({ message: "Admin login is not configured." }, { status: 500 });
  }

  const usernameMatches = constantTimeEquals(parsed.data.username, getAdminUsername());
  const passwordMatches = usernameMatches && (await verifyAdminPassword(parsed.data.password));

  if (!usernameMatches || !passwordMatches) {
    // Slow failed attempts to make automated guessing expensive.
    await sleep(700);
    return NextResponse.json({ message: "Invalid admin login." }, { status: 401 });
  }

  resetRateLimit(key);

  const response = NextResponse.json({ message: "Signed in." });
  response.cookies.set(ADMIN_SESSION_COOKIE, createAdminSessionValue(), getAdminCookieOptions());
  return response;
}
