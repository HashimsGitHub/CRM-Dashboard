"use server";

import { redirect } from "next/navigation";
import { lookupAllowed } from "@/lib/lookup-guard";
import { normalizeTrackingNumber } from "@/lib/tracking";

export interface LookupState { error?: string }

export async function lookupAction(_prev: LookupState, formData: FormData): Promise<LookupState> {
  const n = normalizeTrackingNumber(formData.get("trackingNumber"));
  if (!n) return { error: "Please enter your order number in the format ORD-26-XXXX-XXXX." };
  if (!(await lookupAllowed()).allowed) return { error: "Too many attempts. Please wait a minute and try again." };
  redirect(`/track/${n}`);
}
