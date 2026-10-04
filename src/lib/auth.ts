import "server-only";
import { createHash, createHmac, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { and, eq, gt } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "@/db";
import { adminSessions, admins } from "@/db/schema";

export const SESSION_COOKIE = "crm_admin_session";
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) throw new Error("SESSION_SECRET must be set to a random string of 16+ characters (32+ recommended)");
  return s;
}

/** Only an HMAC of the cookie token is stored, so a DB leak cannot be replayed as a session. */
export function hashToken(token: string): string {
  return createHmac("sha256", secret()).update(token).digest("hex");
}

// Valid hash of a random value, compared against when the user doesn't exist (constant-ish timing).
const DUMMY_HASH = bcrypt.hashSync(randomBytes(16).toString("hex"), 12);

export const hashPassword = (password: string) => bcrypt.hash(password, 12);

export async function verifyCredentials(username: string, password: string) {
  const [admin] = await db.select().from(admins).where(eq(admins.username, username.toLowerCase())).limit(1);
  const ok = await bcrypt.compare(password, admin?.passwordHash ?? DUMMY_HASH);
  return ok && admin ? admin : null;
}

export async function createSession(adminId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db.insert(adminSessions).values({ adminId, tokenHash: hashToken(token), expiresAt });
  await db.update(admins).set({ lastLoginAt: new Date() }).where(eq(admins.id, adminId));
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await db.delete(adminSessions).where(eq(adminSessions.tokenHash, hashToken(token)));
  jar.delete(SESSION_COOKIE);
}

export const getAdmin = cache(async () => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const [row] = await db
    .select({ id: admins.id, username: admins.username })
    .from(adminSessions)
    .innerJoin(admins, eq(admins.id, adminSessions.adminId))
    .where(and(eq(adminSessions.tokenHash, hashToken(token)), gt(adminSessions.expiresAt, new Date())))
    .limit(1);
  return row ?? null;
});

/** Call at the top of every admin page and server action. */
export async function requireAdmin() {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}

export const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
