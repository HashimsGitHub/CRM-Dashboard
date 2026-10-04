import "server-only";
import { cache } from "react";
import { db } from "@/db";
import { settings } from "@/db/schema";

export interface SiteSettings {
  companyName: string;
  supportEmail: string;
  supportPhone: string;
  supportHours: string;
  supportMessage: string;
}

const DEFAULTS: SiteSettings = {
  companyName: "TechSource Direct",
  supportEmail: "support@example.com",
  supportPhone: "+1 (555) 010-0100",
  supportHours: "Mon–Fri, 8am–6pm ET",
  supportMessage: "Have a question about your order? Our team is happy to help.",
};

export const getSettings = cache(async (): Promise<SiteSettings> => {
  const rows = await db.select().from(settings);
  const out = { ...DEFAULTS };
  for (const r of rows) if (r.key in out) (out as Record<string, string>)[r.key] = r.value;
  return out;
});
