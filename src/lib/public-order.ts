import "server-only";
import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { customFieldDefinitions, customFieldValues, orders } from "@/db/schema";
import { getSettings } from "./settings";
import { normalizeTrackingNumber } from "./tracking";

/**
 * Customer-safe DTOs. Every field is copied explicitly — nothing from the
 * database row is passed through — so internal columns can never leak by
 * being added to a table later. Internal IDs are never included.
 */
export interface PublicOrder {
  trackingNumber: string;
  title: string;
  description: string | null;
  orderType: string;
  status: string;
  progress: number;
  currentPhase: string | null;
  orderDate: string;
  expectedCompletionDate: string | null;
  completedDate: string | null;
  customerName: string;
  company: string | null;
  items: { name: string; description: string | null; sku: string | null; quantity: number }[];
  project: { name: string; description: string | null; startDate: string | null; plannedCompletionDate: string | null } | null;
  milestones: {
    title: string;
    description: string | null;
    status: string;
    progress: number;
    plannedStartDate: string | null;
    plannedCompletionDate: string | null;
    actualCompletionDate: string | null;
    notes: string | null;
  }[];
  shipments: {
    carrier: string;
    trackingNumber: string | null;
    status: string;
    shipDate: string | null;
    estimatedDeliveryDate: string | null;
    actualDeliveryDate: string | null;
    trackingUrl: string | null;
    notes: string | null;
  }[];
  latestUpdate: { title: string | null; body: string; date: string } | null;
  timeline: { date: string; title: string; description: string | null }[];
  customFields: { label: string; type: string; section: string; value: string }[];
  support: { email: string; phone: string; hours: string; message: string; companyName: string };
}

export async function getPublicOrder(rawTrackingNumber: string): Promise<PublicOrder | null> {
  const trackingNumber = normalizeTrackingNumber(rawTrackingNumber);
  if (!trackingNumber) return null;

  const order = await db.query.orders.findFirst({
    where: and(eq(orders.trackingNumber, trackingNumber), eq(orders.isActive, true)),
    columns: {
      id: true, trackingNumber: true, title: true, description: true, orderType: true, overallStatus: true,
      progressPercentage: true, currentPhase: true, orderDate: true, expectedCompletionDate: true, completedDate: true,
    },
    with: {
      customer: { columns: { name: true, company: true } },
      project: { columns: { name: true, description: true, startDate: true, plannedCompletionDate: true } },
      items: {
        columns: { name: true, description: true, sku: true, quantity: true },
        where: (t, { eq }) => eq(t.customerVisible, true),
        orderBy: (t, { asc }) => asc(t.sortOrder),
      },
      milestones: {
        columns: {
          title: true, description: true, status: true, progressPercentage: true, plannedStartDate: true,
          plannedCompletionDate: true, actualCompletionDate: true, customerNotes: true,
        },
        orderBy: (t, { asc }) => asc(t.sortOrder),
      },
      shipments: {
        columns: {
          carrier: true, carrierName: true, trackingNumber: true, status: true, shipDate: true,
          estimatedDeliveryDate: true, actualDeliveryDate: true, trackingUrl: true, customerNotes: true,
        },
        orderBy: (t, { asc }) => asc(t.createdAt),
      },
      statusUpdates: {
        columns: { title: true, body: true, createdAt: true },
        where: (t, { eq }) => eq(t.customerVisible, true),
        orderBy: (t, { desc }) => desc(t.createdAt),
        limit: 1,
      },
      timelineEvents: {
        columns: { eventDate: true, title: true, description: true },
        where: (t, { eq }) => eq(t.customerVisible, true),
        orderBy: (t, { desc }) => desc(t.eventDate),
        limit: 50,
      },
    },
  });
  if (!order) return null;

  // Visibility is enforced in SQL: hidden/inactive definitions are never read.
  const [fields, site] = await Promise.all([
    db
      .select({
        label: customFieldDefinitions.label,
        type: customFieldDefinitions.dataType,
        section: customFieldDefinitions.section,
        value: customFieldValues.value,
      })
      .from(customFieldValues)
      .innerJoin(customFieldDefinitions, eq(customFieldDefinitions.id, customFieldValues.fieldId))
      .where(
        and(
          eq(customFieldValues.orderId, order.id),
          eq(customFieldDefinitions.customerVisible, true),
          eq(customFieldDefinitions.isActive, true),
        ),
      )
      .orderBy(asc(customFieldDefinitions.displayOrder), desc(customFieldDefinitions.createdAt)),
    getSettings(),
  ]);

  const update = order.statusUpdates[0];
  return {
    trackingNumber: order.trackingNumber,
    title: order.title,
    description: order.description,
    orderType: order.orderType,
    status: order.overallStatus,
    progress: order.progressPercentage,
    currentPhase: order.currentPhase,
    orderDate: order.orderDate,
    expectedCompletionDate: order.expectedCompletionDate,
    completedDate: order.completedDate,
    customerName: order.customer.name,
    company: order.customer.company,
    items: order.items,
    project: order.project ?? null,
    milestones: order.milestones.map((m) => ({
      title: m.title, description: m.description, status: m.status, progress: m.progressPercentage,
      plannedStartDate: m.plannedStartDate, plannedCompletionDate: m.plannedCompletionDate,
      actualCompletionDate: m.actualCompletionDate, notes: m.customerNotes,
    })),
    shipments: order.shipments.map((s) => ({
      carrier: s.carrier === "OTHER" && s.carrierName ? s.carrierName : s.carrier,
      trackingNumber: s.trackingNumber, status: s.status, shipDate: s.shipDate,
      estimatedDeliveryDate: s.estimatedDeliveryDate, actualDeliveryDate: s.actualDeliveryDate,
      trackingUrl: s.trackingUrl, notes: s.customerNotes,
    })),
    latestUpdate: update ? { title: update.title, body: update.body, date: update.createdAt.toISOString() } : null,
    timeline: order.timelineEvents.map((e) => ({ date: e.eventDate.toISOString(), title: e.title, description: e.description })),
    customFields: fields,
    support: {
      email: site.supportEmail, phone: site.supportPhone, hours: site.supportHours,
      message: site.supportMessage, companyName: site.companyName,
    },
  };
}
