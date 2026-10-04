import { randomInt } from "node:crypto";

// No 0/O/1/I/L to keep numbers readable over the phone.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const TRACKING_PATTERN = /^ORD-\d{2}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;

export function generateTrackingNumber(now = new Date()): string {
  const group = () => Array.from({ length: 4 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
  const yy = String(now.getFullYear()).slice(-2);
  return `ORD-${yy}-${group()}-${group()}`;
}

/** Trim, uppercase and strip whitespace; returns null when the shape is invalid. */
export function normalizeTrackingNumber(input: unknown): string | null {
  if (typeof input !== "string" || input.length > 40) return null;
  const n = input.replace(/\s+/g, "").toUpperCase();
  return TRACKING_PATTERN.test(n) ? n : null;
}
