import { describe, expect, it } from "vitest";
import { generateTrackingNumber, normalizeTrackingNumber } from "@/lib/tracking";

describe("tracking number format", () => {
  it("generates readable, random numbers", () => {
    const set = new Set(Array.from({ length: 500 }, () => generateTrackingNumber(new Date("2026-05-01"))));
    expect(set.size).toBe(500);
    for (const n of set) expect(n).toMatch(/^ORD-26-[A-HJKMN-Z2-9]{4}-[A-HJKMN-Z2-9]{4}$/);
  });
  it("normalises input and rejects junk", () => {
    expect(normalizeTrackingNumber(" ord-26-ab12-cd34 ")).toBe("ORD-26-AB12-CD34");
    expect(normalizeTrackingNumber("ORD-26-AB12")).toBeNull();
    expect(normalizeTrackingNumber(42)).toBeNull();
    expect(normalizeTrackingNumber("ORD-26-AB12-CD34\n; select 1")).toBeNull();
  });
});
