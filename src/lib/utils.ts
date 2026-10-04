import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

/** Parse a YYYY-MM-DD string as a local calendar date (no timezone shift). */
function parseDay(d: string): Date {
  const [y, m, day] = d.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, day);
}

export function formatDate(d: string | Date | null | undefined, style: "long" | "short" = "long"): string {
  if (!d) return "";
  const date = typeof d === "string" ? (d.length <= 10 ? parseDay(d) : new Date(d)) : d;
  return date.toLocaleDateString("en-US", {
    month: style === "long" ? "long" : "short",
    day: "numeric",
    year: style === "long" ? "numeric" : undefined,
    timeZone: typeof d === "string" && d.length <= 10 ? undefined : "UTC",
  });
}
