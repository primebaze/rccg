import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const ADMIN_SESSION_COOKIE = "rccg_admin_session";
const sessionMaxAgeSeconds = 60 * 60 * 8;

function getSecret() {
  return process.env.ADMIN_DASHBOARD_KEY;
}

export function getAdminUsername() {
  return process.env.ADMIN_USERNAME ?? "admin";
}

function sign(value: string) {
  const secret = getSecret();
  if (!secret) throw new Error("Missing ADMIN_DASHBOARD_KEY");
  return createHmac("sha256", secret).update(value).digest("hex");
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

/** Constant-time string comparison (length-safe). */
export function constantTimeEquals(left: string, right: string) {
  return safeEqual(left, right);
}

export function createAdminSessionValue() {
  const issuedAt = Date.now().toString();
  return `${issuedAt}.${sign(issuedAt)}`;
}

export function verifyAdminSessionValue(value?: string) {
  if (!value || !getSecret()) return false;

  const [issuedAt, signature] = value.split(".");
  if (!issuedAt || !signature) return false;

  const issuedAtMs = Number.parseInt(issuedAt, 10);
  if (!Number.isFinite(issuedAtMs)) return false;

  const isExpired = Date.now() - issuedAtMs > sessionMaxAgeSeconds * 1000;
  if (isExpired) return false;

  return safeEqual(sign(issuedAt), signature);
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${derived}`;
}

export function verifyPasswordHash(password: string, stored: string) {
  const [scheme, salt, derived] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !derived) return false;
  const candidate = scryptSync(password, salt, 64).toString("hex");
  return safeEqual(candidate, derived);
}

export async function getStoredPasswordHash() {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("admin_settings")
    .select("password_hash")
    .eq("id", true)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data?.password_hash ?? null;
}

export async function setStoredPasswordHash(hash: string) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("admin_settings")
    .upsert({ id: true, password_hash: hash, updated_at: new Date().toISOString() });

  if (error) throw new Error(error.message);
}

/**
 * Verifies an admin password. Uses the hash stored in the database when one
 * has been set; otherwise falls back to the ADMIN_DASHBOARD_KEY env value so
 * the dashboard keeps working before a custom password is chosen.
 */
export async function verifyAdminPassword(password: string) {
  const storedHash = await getStoredPasswordHash();
  if (storedHash) {
    return verifyPasswordHash(password, storedHash);
  }

  const envPassword = process.env.ADMIN_DASHBOARD_KEY;
  return Boolean(envPassword) && safeEqual(password, envPassword as string);
}

export function getAdminCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: sessionMaxAgeSeconds
  };
}
