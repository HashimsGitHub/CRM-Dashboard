import bcrypt from "bcryptjs";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { admins } from "@/db/schema";
import * as svc from "@/lib/admin-service";
import type { orderSchema } from "@/lib/validation";
import type { z } from "zod";

export async function resetDb() {
  await db.execute(sql`truncate table admin_sessions, admins, custom_field_values, custom_field_definitions, timeline_events, status_updates, shipments, milestones, projects, order_items, orders, customers, settings restart identity cascade`);
}

export const baseOrder: z.infer<typeof orderSchema> = {
  customerName: "Test Customer", company: "Testco", email: null, phone: null, orderType: "TURNKEY",
  title: "Test Project", description: "Public description", overallStatus: "IN_PROGRESS", progressPercentage: 55,
  currentPhase: null, orderDate: "2026-10-01", expectedCompletionDate: "2026-11-15", completedDate: null,
  internalNotes: "SECRET-INTERNAL-NOTE margin 40%",
};

export const makeOrder = (over: Partial<z.infer<typeof orderSchema>> = {}, values: Record<string, string> = {}) =>
  svc.createOrder({ ...baseOrder, ...over }, values);

export async function makeAdmin(username = "admin", password = "correct-horse-battery") {
  const [a] = await db.insert(admins).values({ username: username.toLowerCase(), passwordHash: await bcrypt.hash(password, 4) }).returning();
  return a;
}

export const emptyMilestone = {
  title: "M", description: null, status: "PENDING" as const, progressPercentage: 0, plannedStartDate: null,
  plannedCompletionDate: null, actualCompletionDate: null, customerNotes: null, internalNotes: null,
};
export const emptyShipment = {
  carrier: "UPS" as const, carrierName: null, trackingNumber: "1Z999AA10123456784", status: "IN_TRANSIT" as const, shipDate: null,
  estimatedDeliveryDate: "2026-10-12", actualDeliveryDate: null, trackingUrl: null, customerNotes: "Leave at dock", internalNotes: "SECRET-SHIP-NOTE",
};
