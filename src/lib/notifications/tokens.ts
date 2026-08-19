import crypto from "crypto";

const secret = () => process.env.NOTIFY_SECRET || "dev-insecure-change-me";
const b64url = (b: Buffer) => b.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

export function signConfirm(appointmentId: string, expMs: number): string {
  return b64url(crypto.createHmac("sha256", secret()).update(`${appointmentId}.${expMs}`).digest());
}

export function verifyConfirm(appointmentId: string, expMs: number, sig: string): boolean {
  if (!Number.isFinite(expMs) || Date.now() > expMs) return false;
  const expected = signConfirm(appointmentId, expMs);
  const a = Buffer.from(sig), b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function confirmUrl(base: string, appointmentId: string, ttlDays = 30): string {
  const exp = Date.now() + ttlDays * 24 * 60 * 60 * 1000;
  const u = new URL("/api/appointments/confirm", base);
  u.searchParams.set("a", appointmentId);
  u.searchParams.set("exp", String(exp));
  u.searchParams.set("sig", signConfirm(appointmentId, exp));
  return u.toString();
}
