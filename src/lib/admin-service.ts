import { and, asc, count, desc, eq, ilike, inArray, ne, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import {
  customFieldDefinitions, customFieldValues, customers, milestones, orderItems, orders, projects,
  shipments, statusUpdates, timelineEvents, settings,
} from "@/db/schema";
import { CARRIER_URL_TEMPLATES, type Carrier } from "./constants";
import { ORDER_STATUSES, TERMINAL_STATUSES, statusDef } from "./status";
import { generateTrackingNumber } from "./tracking";
import { slugify, validateFieldValue } from "./validation";
import type { z } from "zod";
import type {
  fieldDefinitionSchema, itemSchema, milestoneSchema, orderSchema, projectSchema, settingsSchema,
  shipmentSchema, statusUpdateSchema, timelineEventSchema,
} from "./validation";

/**
 * Admin data operations. Pure data layer: callers (server actions) are
 * responsible for authentication and for validating input with Zod.
 */
type OrderInput = z.infer<typeof orderSchema>;

async function upsertCustomer(i: Pick<OrderInput, "customerName" | "company" | "email" | "phone">) {
  const company = i.company ?? null;
  const [existing] = await db
    .select({ id: customers.id })
    .from(customers)
    .where(and(sql`lower(${customers.name}) = ${i.customerName.toLowerCase()}`, company ? sql`lower(${customers.company}) = ${company.toLowerCase()}` : sql`${customers.company} is null`))
    .limit(1);
  const data = { name: i.customerName, company, email: i.email ?? null, phone: i.phone ?? null };
  if (existing) {
    await db.update(customers).set(data).where(eq(customers.id, existing.id));
    return existing.id;
  }
  const [row] = await db.insert(customers).values(data).returning({ id: customers.id });
  return row.id;
}

export async function addTimelineEvent(orderId: string, title: string, customerVisible = true, description?: string | null, eventDate?: Date) {
  await db.insert(timelineEvents).values({ orderId, title, description: description ?? null, customerVisible, eventDate: eventDate ?? new Date() });
}

export async function createOrder(input: OrderInput, customValues: Record<string, string> = {}) {
  const customerId = await upsertCustomer(input);
  const values = {
    customerId, orderType: input.orderType, title: input.title, description: input.description ?? null,
    overallStatus: input.overallStatus, progressPercentage: input.progressPercentage, currentPhase: input.currentPhase ?? null,
    orderDate: input.orderDate, expectedCompletionDate: input.expectedCompletionDate ?? null,
    completedDate: input.completedDate ?? null, internalNotes: input.internalNotes ?? null,
  };
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const [row] = await db.insert(orders).values({ ...values, trackingNumber: generateTrackingNumber() }).returning({ id: orders.id, trackingNumber: orders.trackingNumber });
      await addTimelineEvent(row.id, "Order confirmed", true, null, new Date(`${input.orderDate}T12:00:00Z`));
      await setCustomValues(row.id, customValues);
      return row;
    } catch (e) {
      // 23505 = unique_violation on tracking_number: regenerate and retry.
      if ((e as { code?: string }).code !== "23505" || attempt === 4) throw e;
    }
  }
  throw new Error("unreachable");
}

export async function updateOrder(id: string, input: OrderInput, customValues?: Record<string, string>) {
  const [prev] = await db.select({ status: orders.overallStatus, completedDate: orders.completedDate }).from(orders).where(eq(orders.id, id));
  if (!prev) throw new Error("Order not found");
  const customerId = await upsertCustomer(input);
  const done = TERMINAL_STATUSES.includes(input.overallStatus);
  await db.update(orders).set({
    customerId, orderType: input.orderType, title: input.title, description: input.description ?? null,
    overallStatus: input.overallStatus, progressPercentage: done && input.overallStatus === "COMPLETED" ? 100 : input.progressPercentage,
    currentPhase: input.currentPhase ?? null, orderDate: input.orderDate,
    expectedCompletionDate: input.expectedCompletionDate ?? null,
    completedDate: input.completedDate ?? (done ? prev.completedDate ?? new Date().toISOString().slice(0, 10) : null),
    internalNotes: input.internalNotes ?? null,
  }).where(eq(orders.id, id));
  if (prev.status !== input.overallStatus) await addTimelineEvent(id, `Status changed to ${statusDef(input.overallStatus).label}`);
  if (customValues) await setCustomValues(id, customValues);
}

export async function setOrderActive(id: string, isActive: boolean) {
  await db.update(orders).set({ isActive }).where(eq(orders.id, id));
}

/* ───────── Items / project ───────── */

export async function addItem(orderId: string, i: z.infer<typeof itemSchema>) {
  const [{ n }] = await db.select({ n: count() }).from(orderItems).where(eq(orderItems.orderId, orderId));
  await db.insert(orderItems).values({
    orderId, name: i.name, description: i.description ?? null, sku: i.sku ?? null, quantity: i.quantity,
    supplierCost: i.supplierCost == null ? null : String(i.supplierCost), customerVisible: i.customerVisible, sortOrder: n,
  });
}
export const deleteItem = (orderId: string, id: string) => db.delete(orderItems).where(and(eq(orderItems.id, id), eq(orderItems.orderId, orderId)));

export async function saveProject(orderId: string, p: z.infer<typeof projectSchema>) {
  const v = { name: p.name, description: p.description ?? null, startDate: p.startDate ?? null, plannedCompletionDate: p.plannedCompletionDate ?? null };
  await db.insert(projects).values({ orderId, ...v }).onConflictDoUpdate({ target: projects.orderId, set: v });
}
export const deleteProject = (orderId: string) => db.delete(projects).where(eq(projects.orderId, orderId));

/* ───────── Milestones ───────── */

function milestoneValues(m: z.infer<typeof milestoneSchema>) {
  const completed = m.status === "COMPLETED";
  return {
    title: m.title, description: m.description ?? null, status: m.status,
    progressPercentage: completed ? 100 : m.status === "PENDING" ? 0 : m.progressPercentage,
    plannedStartDate: m.plannedStartDate ?? null, plannedCompletionDate: m.plannedCompletionDate ?? null,
    actualCompletionDate: completed ? m.actualCompletionDate ?? new Date().toISOString().slice(0, 10) : m.actualCompletionDate ?? null,
    customerNotes: m.customerNotes ?? null, internalNotes: m.internalNotes ?? null,
  };
}

export async function addMilestone(orderId: string, m: z.infer<typeof milestoneSchema>) {
  const [{ n }] = await db.select({ n: count() }).from(milestones).where(eq(milestones.orderId, orderId));
  await db.insert(milestones).values({ orderId, ...milestoneValues(m), sortOrder: n });
}

export async function updateMilestone(orderId: string, id: string, m: z.infer<typeof milestoneSchema>) {
  const [prev] = await db.select({ status: milestones.status }).from(milestones).where(and(eq(milestones.id, id), eq(milestones.orderId, orderId)));
  if (!prev) throw new Error("Milestone not found");
  await db.update(milestones).set(milestoneValues(m)).where(and(eq(milestones.id, id), eq(milestones.orderId, orderId)));
  if (prev.status !== "COMPLETED" && m.status === "COMPLETED") await addTimelineEvent(orderId, `Milestone completed: ${m.title}`);
}

export const deleteMilestone = (orderId: string, id: string) => db.delete(milestones).where(and(eq(milestones.id, id), eq(milestones.orderId, orderId)));

export async function moveMilestone(orderId: string, id: string, direction: "up" | "down") {
  const rows = await db.select({ id: milestones.id }).from(milestones).where(eq(milestones.orderId, orderId)).orderBy(asc(milestones.sortOrder), asc(milestones.title));
  const i = rows.findIndex((r) => r.id === id);
  const j = direction === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= rows.length) return;
  [rows[i], rows[j]] = [rows[j], rows[i]];
  await db.transaction(async (tx) => {
    for (const [idx, r] of rows.entries()) await tx.update(milestones).set({ sortOrder: idx }).where(eq(milestones.id, r.id));
  });
}

/** Set progress from completed milestones (convenience for the admin). */
export async function progressFromMilestones(orderId: string): Promise<number | null> {
  const rows = await db.select({ status: milestones.status }).from(milestones).where(and(eq(milestones.orderId, orderId), ne(milestones.status, "CANCELLED")));
  if (!rows.length) return null;
  const pct = Math.round((rows.filter((r) => r.status === "COMPLETED").length / rows.length) * 100);
  await db.update(orders).set({ progressPercentage: pct }).where(eq(orders.id, orderId));
  return pct;
}

/* ───────── Shipments ───────── */

function shipmentValues(s: z.infer<typeof shipmentSchema>) {
  const url = s.trackingUrl ?? (s.trackingNumber ? CARRIER_URL_TEMPLATES[s.carrier as Carrier]?.(s.trackingNumber) : null) ?? null;
  return {
    carrier: s.carrier, carrierName: s.carrier === "OTHER" ? s.carrierName ?? null : null, trackingNumber: s.trackingNumber ?? null,
    status: s.status, shipDate: s.shipDate ?? null, estimatedDeliveryDate: s.estimatedDeliveryDate ?? null,
    actualDeliveryDate: s.status === "DELIVERED" ? s.actualDeliveryDate ?? new Date().toISOString().slice(0, 10) : s.actualDeliveryDate ?? null,
    trackingUrl: url, customerNotes: s.customerNotes ?? null, internalNotes: s.internalNotes ?? null,
  };
}
export async function addShipment(orderId: string, s: z.infer<typeof shipmentSchema>) {
  await db.insert(shipments).values({ orderId, ...shipmentValues(s) });
  await addTimelineEvent(orderId, s.carrier === "OTHER" && s.carrierName ? `Shipment added via ${s.carrierName}` : `Shipment added via ${s.carrier}`);
}
export async function updateShipment(orderId: string, id: string, s: z.infer<typeof shipmentSchema>) {
  await db.update(shipments).set(shipmentValues(s)).where(and(eq(shipments.id, id), eq(shipments.orderId, orderId)));
}
export const deleteShipment = (orderId: string, id: string) => db.delete(shipments).where(and(eq(shipments.id, id), eq(shipments.orderId, orderId)));

/* ───────── Updates / timeline ───────── */

export async function addStatusUpdate(orderId: string, u: z.infer<typeof statusUpdateSchema>, adminId?: string) {
  await db.insert(statusUpdates).values({ orderId, title: u.title ?? null, body: u.body, customerVisible: u.customerVisible, createdBy: adminId ?? null });
}
export const deleteStatusUpdate = (orderId: string, id: string) => db.delete(statusUpdates).where(and(eq(statusUpdates.id, id), eq(statusUpdates.orderId, orderId)));

export async function addTimelineEntry(orderId: string, e: z.infer<typeof timelineEventSchema>) {
  await addTimelineEvent(orderId, e.title, e.customerVisible, e.description, e.eventDate ? new Date(e.eventDate.length <= 10 ? `${e.eventDate}T12:00:00Z` : e.eventDate) : undefined);
}
export const deleteTimelineEvent = (orderId: string, id: string) => db.delete(timelineEvents).where(and(eq(timelineEvents.id, id), eq(timelineEvents.orderId, orderId)));

/* ───────── Custom fields ───────── */

export class FieldValidationError extends Error {}

function parseOptions(raw: string | null | undefined): string[] | null {
  const list = (raw ?? "").split(/[\n,]/).map((s) => s.trim()).filter(Boolean);
  return list.length ? [...new Set(list)] : null;
}

export async function createFieldDefinition(i: z.infer<typeof fieldDefinitionSchema>) {
  const options = i.dataType === "SELECT" ? parseOptions(i.options) : null;
  if (i.dataType === "SELECT" && !options) throw new FieldValidationError("Dropdown fields need at least one option");
  const base = slugify(i.label);
  let key = base;
  for (let n = 2; ; n++) {
    const [dup] = await db.select({ id: customFieldDefinitions.id }).from(customFieldDefinitions).where(eq(customFieldDefinitions.key, key));
    if (!dup) break;
    key = `${base}_${n}`;
  }
  const [row] = await db.insert(customFieldDefinitions).values({
    label: i.label, key, dataType: i.dataType, section: i.section, options, displayOrder: i.displayOrder,
    required: i.required, customerVisible: i.customerVisible, isActive: i.isActive,
  }).returning({ id: customFieldDefinitions.id, key: customFieldDefinitions.key });
  return row;
}

export async function updateFieldDefinition(id: string, i: z.infer<typeof fieldDefinitionSchema>) {
  const options = i.dataType === "SELECT" ? parseOptions(i.options) : null;
  if (i.dataType === "SELECT" && !options) throw new FieldValidationError("Dropdown fields need at least one option");
  // The key and data type stay fixed once created so stored values remain valid.
  const [cur] = await db.select({ dataType: customFieldDefinitions.dataType }).from(customFieldDefinitions).where(eq(customFieldDefinitions.id, id));
  if (!cur) throw new FieldValidationError("Field not found");
  await db.update(customFieldDefinitions).set({
    label: i.label, section: i.section, options: cur.dataType === "SELECT" ? options : null, displayOrder: i.displayOrder,
    required: i.required, customerVisible: i.customerVisible, isActive: i.isActive,
  }).where(eq(customFieldDefinitions.id, id));
}

export const listFieldDefinitions = (includeInactive = true) =>
  db.select().from(customFieldDefinitions)
    .where(includeInactive ? undefined : eq(customFieldDefinitions.isActive, true))
    .orderBy(asc(customFieldDefinitions.section), asc(customFieldDefinitions.displayOrder), asc(customFieldDefinitions.label));

export async function getCustomValues(orderId: string): Promise<Record<string, string>> {
  const rows = await db.select({ fieldId: customFieldValues.fieldId, value: customFieldValues.value }).from(customFieldValues).where(eq(customFieldValues.orderId, orderId));
  return Object.fromEntries(rows.map((r) => [r.fieldId, r.value]));
}

/** values: fieldId → raw string. Blank deletes the value. Throws FieldValidationError. */
export async function setCustomValues(orderId: string, values: Record<string, string>) {
  const defs = await listFieldDefinitions(false);
  const byId = new Map(defs.map((d) => [d.id, d]));
  const errors: string[] = [];
  const toSave: { fieldId: string; value: string }[] = [];
  const toClear: string[] = [];
  const submitted = new Set(Object.keys(values));
  for (const d of defs) {
    if (!submitted.has(d.id)) continue;
    const v = (values[d.id] ?? "").trim();
    if (!v) {
      if (d.required) errors.push(`${d.label} is required`);
      toClear.push(d.id);
      continue;
    }
    const err = validateFieldValue(d, v);
    if (err) errors.push(err);
    else toSave.push({ fieldId: d.id, value: v });
  }
  for (const id of submitted) if (!byId.has(id)) errors.push("Unknown custom field");
  if (errors.length) throw new FieldValidationError(errors.join("; "));
  for (const s of toSave) {
    await db.insert(customFieldValues).values({ orderId, ...s }).onConflictDoUpdate({ target: [customFieldValues.orderId, customFieldValues.fieldId], set: { value: s.value } });
  }
  if (toClear.length) await db.delete(customFieldValues).where(and(eq(customFieldValues.orderId, orderId), inArray(customFieldValues.fieldId, toClear)));
}

/* ───────── Dashboard queries ───────── */

export interface OrderFilters {
  q?: string;
  type?: string;
  status?: string;
  customer?: string;
  from?: string;
  to?: string;
  state?: "active" | "completed" | "archived" | "all";
}

export async function listOrders(f: OrderFilters, limit = 100) {
  const conds: (SQL | undefined)[] = [];
  const q = f.q?.trim();
  if (q) {
    const like = `%${q.replace(/[%_\\]/g, "\\$&")}%`;
    conds.push(or(
      ilike(orders.trackingNumber, like), ilike(orders.title, like), ilike(customers.name, like), ilike(customers.company, like),
      sql`exists (select 1 from ${projects} where ${projects.orderId} = ${orders.id} and ${projects.name} ilike ${like})`,
      sql`exists (select 1 from ${shipments} where ${shipments.orderId} = ${orders.id} and ${shipments.trackingNumber} ilike ${like})`,
    ));
  }
  if (f.type) conds.push(eq(orders.orderType, f.type));
  if (f.status) conds.push(eq(orders.overallStatus, f.status));
  if (f.customer?.trim()) conds.push(or(ilike(customers.name, `%${f.customer.trim()}%`), ilike(customers.company, `%${f.customer.trim()}%`)));
  if (f.from) conds.push(sql`${orders.orderDate} >= ${f.from}`);
  if (f.to) conds.push(sql`${orders.orderDate} <= ${f.to}`);
  const state = f.state ?? "active";
  if (state === "archived") conds.push(eq(orders.isActive, false));
  else {
    conds.push(eq(orders.isActive, true));
    if (state === "active") conds.push(sql`${orders.overallStatus} not in ('COMPLETED','DELIVERED','CANCELLED')`);
    if (state === "completed") conds.push(inArray(orders.overallStatus, ["COMPLETED", "DELIVERED"]));
  }
  return db
    .select({
      id: orders.id, trackingNumber: orders.trackingNumber, title: orders.title, orderType: orders.orderType,
      status: orders.overallStatus, progress: orders.progressPercentage, orderDate: orders.orderDate,
      expected: orders.expectedCompletionDate, isActive: orders.isActive, customerName: customers.name, company: customers.company,
    })
    .from(orders)
    .innerJoin(customers, eq(customers.id, orders.customerId))
    .where(and(...conds))
    .orderBy(desc(orders.createdAt))
    .limit(limit);
}

export async function getStats() {
  const [r] = await db
    .select({
      total: sql<number>`count(*) filter (where ${orders.isActive})::int`,
      activeProjects: sql<number>`count(*) filter (where ${orders.isActive} and ${orders.orderType} in ('SERVICE','SOFTWARE','TURNKEY') and ${orders.overallStatus} not in ('COMPLETED','DELIVERED','CANCELLED'))::int`,
      awaitingShipment: sql<number>`count(*) filter (where ${orders.isActive} and ${orders.overallStatus} in ('AWAITING_STOCK','PROCUREMENT','PREPARING_SHIPMENT'))::int`,
      inTransit: sql<number>`count(*) filter (where ${orders.isActive} and ${orders.overallStatus} in ('SHIPPED','IN_TRANSIT'))::int`,
      completed: sql<number>`count(*) filter (where ${orders.isActive} and ${orders.overallStatus} in ('COMPLETED','DELIVERED'))::int`,
      onHold: sql<number>`count(*) filter (where ${orders.isActive} and ${orders.overallStatus} = 'ON_HOLD')::int`,
    })
    .from(orders);
  return r;
}

export async function getOrderForAdmin(id: string) {
  return db.query.orders.findFirst({
    where: eq(orders.id, id),
    with: {
      customer: true, project: true,
      items: { orderBy: (t, { asc }) => asc(t.sortOrder) },
      milestones: { orderBy: (t, { asc }) => asc(t.sortOrder) },
      shipments: { orderBy: (t, { asc }) => asc(t.createdAt) },
      statusUpdates: { orderBy: (t, { desc }) => desc(t.createdAt) },
      timelineEvents: { orderBy: (t, { desc }) => desc(t.eventDate) },
    },
  });
}

export async function saveSettings(s: z.infer<typeof settingsSchema>) {
  for (const [key, value] of Object.entries(s)) {
    await db.insert(settings).values({ key, value: value ?? "" }).onConflictDoUpdate({ target: settings.key, set: { value: value ?? "" } });
  }
}

export { ORDER_STATUSES };
