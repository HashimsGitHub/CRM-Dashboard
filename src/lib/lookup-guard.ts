import "server-only";
import { headers } from "next/headers";
import { clientIp, hit } from "./rate-limit";

/** 30 lookups per IP per minute; shared by the page, API route and form. */
export async function lookupAllowed(): Promise<{ allowed: boolean; retryAfterSec: number }> {
  return hit(`lookup:${clientIp(await headers())}`, 30, 60_000);
}
