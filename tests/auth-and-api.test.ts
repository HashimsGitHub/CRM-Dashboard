import { beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { adminSessions } from "@/db/schema";
import { resetRateLimits } from "@/lib/rate-limit";
import { makeAdmin, makeOrder, resetDb } from "./helpers";

const jar = new Map<string, string>();
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (k: string) => (jar.has(k) ? { value: jar.get(k) } : undefined),
    set: (k: string, v: string) => void jar.set(k, v),
    delete: (k: string) => void jar.delete(k),
  }),
  headers: async () => new Headers({ "x-forwarded-for": "9.9.9.9" }),
}));
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Error(`NEXT_REDIRECT:${to}`);
  },
}));

const auth = await import("@/lib/auth");
const { GET } = await import("@/app/api/track/[trackingNumber]/route");
const call = (n: string, ip = "1.1.1.1") =>
  GET(new Request(`http://x/api/track/${n}`, { headers: { "x-forwarded-for": ip } }), { params: Promise.resolve({ trackingNumber: n }) });

beforeEach(async () => {
  jar.clear();
  resetRateLimits();
  await resetDb();
});

describe("administrator authentication", () => {
  it("accepts valid credentials and rejects invalid ones", async () => {
    await makeAdmin("Admin", "correct-horse-battery");
    expect((await auth.verifyCredentials("admin", "correct-horse-battery"))?.username).toBe("admin");
    expect(await auth.verifyCredentials("admin", "wrong")).toBeNull();
    expect(await auth.verifyCredentials("nobody", "correct-horse-battery")).toBeNull();
  });

  it("stores passwords hashed and session tokens hashed", async () => {
    const a = await makeAdmin();
    expect(a.passwordHash).not.toContain("correct-horse");
    expect(a.passwordHash).toMatch(/^\$2[aby]\$/);
    await auth.createSession(a.id);
    const token = jar.get(auth.SESSION_COOKIE)!;
    const [row] = await db.select().from(adminSessions);
    expect(row.tokenHash).not.toBe(token);
    expect(row.tokenHash).toBe(auth.hashToken(token));
  });

  it("blocks unauthenticated access server-side (customers cannot reach admin)", async () => {
    await expect(auth.requireAdmin()).rejects.toThrow("NEXT_REDIRECT:/admin/login");
    jar.set(auth.SESSION_COOKIE, "forged-token");
    await expect(auth.requireAdmin()).rejects.toThrow("NEXT_REDIRECT:/admin/login");
  });

  it("allows a valid session, and rejects expired or logged-out ones", async () => {
    const a = await makeAdmin();
    await auth.createSession(a.id);
    expect((await auth.requireAdmin()).id).toBe(a.id);
    await db.update(adminSessions).set({ expiresAt: new Date(Date.now() - 1000) }).where(eq(adminSessions.adminId, a.id));
    await expect(auth.requireAdmin()).rejects.toThrow("NEXT_REDIRECT");
    await auth.createSession(a.id);
    await auth.destroySession();
    expect(await db.select().from(adminSessions)).toHaveLength(1); // only the expired one remains
  });
});

describe("public tracking API", () => {
  it("returns the customer-safe order", async () => {
    const { trackingNumber } = await makeOrder();
    const res = await call(trackingNumber);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.order.title).toBe("Test Project");
    expect(JSON.stringify(body)).not.toMatch(/SECRET|internalNotes|passwordHash|"id"/);
  });

  it("returns a generic 404 for unknown, malformed and injection-style numbers", async () => {
    for (const n of ["ORD-26-ZZZZ-ZZZZ", "1001", "'%20OR%201=1--"]) {
      const res = await call(n);
      expect(res.status).toBe(404);
      expect(await res.json()).toEqual({ error: "Order not found" });
    }
  });

  it("rate-limits repeated lookups from one client", async () => {
    let last = 200;
    for (let i = 0; i < 40; i++) last = (await call("ORD-26-ZZZZ-ZZZZ", "7.7.7.7")).status;
    expect(last).toBe(429);
    expect((await call("ORD-26-ZZZZ-ZZZZ", "8.8.8.8")).status).toBe(404);
  });
});
