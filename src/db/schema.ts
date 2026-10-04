import { relations, sql } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

const id = () => uuid("id").primaryKey().default(sql`gen_random_uuid()`);
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());

/* ───────────── Administrators & sessions ───────────── */

export const admins = pgTable("admins", {
  id: id(),
  username: varchar("username", { length: 64 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: createdAt(),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
});

export const adminSessions = pgTable(
  "admin_sessions",
  {
    id: id(),
    adminId: uuid("admin_id").notNull().references(() => admins.id, { onDelete: "cascade" }),
    /** SHA-256 of the cookie token; the raw token is never stored. */
    tokenHash: varchar("token_hash", { length: 64 }).notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("admin_sessions_admin_idx").on(t.adminId), index("admin_sessions_expires_idx").on(t.expiresAt)],
);

/* ───────────── Customers & orders ───────────── */

export const customers = pgTable(
  "customers",
  {
    id: id(),
    name: varchar("name", { length: 160 }).notNull(),
    company: varchar("company", { length: 160 }),
    email: varchar("email", { length: 254 }),
    phone: varchar("phone", { length: 40 }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("customers_name_idx").on(t.name)],
);

export const orders = pgTable(
  "orders",
  {
    id: id(),
    /** Public, high-entropy lookup token (ORD-26-XXXX-XXXX). */
    trackingNumber: varchar("tracking_number", { length: 24 }).notNull(),
    customerId: uuid("customer_id").notNull().references(() => customers.id),
    orderType: varchar("order_type", { length: 16 }).notNull(), // HARDWARE | SERVICE | TURNKEY | SOFTWARE | OTHER
    title: varchar("title", { length: 200 }).notNull(),
    description: text("description"),
    overallStatus: varchar("overall_status", { length: 40 }).notNull().default("ORDER_RECEIVED"),
    progressPercentage: integer("progress_percentage").notNull().default(0),
    currentPhase: varchar("current_phase", { length: 160 }),
    orderDate: date("order_date", { mode: "string" }).notNull(),
    expectedCompletionDate: date("expected_completion_date", { mode: "string" }),
    completedDate: date("completed_date", { mode: "string" }),
    /** Internal-only; never included in customer DTOs. */
    internalNotes: text("internal_notes"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("orders_tracking_number_uq").on(t.trackingNumber),
    index("orders_status_idx").on(t.overallStatus),
    index("orders_customer_idx").on(t.customerId),
    index("orders_type_idx").on(t.orderType),
    index("orders_order_date_idx").on(t.orderDate),
  ],
);

export const orderItems = pgTable(
  "order_items",
  {
    id: id(),
    orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 200 }).notNull(),
    description: text("description"),
    sku: varchar("sku", { length: 64 }),
    quantity: integer("quantity").notNull().default(1),
    /** Internal-only supplier cost. */
    supplierCost: numeric("supplier_cost", { precision: 12, scale: 2 }),
    customerVisible: boolean("customer_visible").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [index("order_items_order_idx").on(t.orderId)],
);

export const projects = pgTable(
  "projects",
  {
    id: id(),
    orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 200 }).notNull(),
    description: text("description"),
    startDate: date("start_date", { mode: "string" }),
    plannedCompletionDate: date("planned_completion_date", { mode: "string" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("projects_order_uq").on(t.orderId)],
);

export const milestones = pgTable(
  "milestones",
  {
    id: id(),
    orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 200 }).notNull(),
    description: text("description"),
    status: varchar("status", { length: 16 }).notNull().default("PENDING"), // PENDING | IN_PROGRESS | COMPLETED | BLOCKED | CANCELLED
    progressPercentage: integer("progress_percentage").notNull().default(0),
    plannedStartDate: date("planned_start_date", { mode: "string" }),
    plannedCompletionDate: date("planned_completion_date", { mode: "string" }),
    actualCompletionDate: date("actual_completion_date", { mode: "string" }),
    customerNotes: text("customer_notes"),
    internalNotes: text("internal_notes"),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [index("milestones_order_idx").on(t.orderId, t.sortOrder)],
);

export const shipments = pgTable(
  "shipments",
  {
    id: id(),
    orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
    carrier: varchar("carrier", { length: 40 }).notNull(), // UPS | FEDEX | USPS | DHL | OTHER
    carrierName: varchar("carrier_name", { length: 80 }), // free text when carrier = OTHER
    trackingNumber: varchar("tracking_number", { length: 80 }),
    status: varchar("status", { length: 24 }).notNull().default("PREPARING"),
    shipDate: date("ship_date", { mode: "string" }),
    estimatedDeliveryDate: date("estimated_delivery_date", { mode: "string" }),
    actualDeliveryDate: date("actual_delivery_date", { mode: "string" }),
    trackingUrl: text("tracking_url"),
    customerNotes: text("customer_notes"),
    internalNotes: text("internal_notes"),
    /** Reserved for future carrier API integration / polling. */
    carrierMetadata: jsonb("carrier_metadata"),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("shipments_order_idx").on(t.orderId), index("shipments_tracking_idx").on(t.trackingNumber)],
);

export const statusUpdates = pgTable(
  "status_updates",
  {
    id: id(),
    orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 200 }),
    body: text("body").notNull(),
    customerVisible: boolean("customer_visible").notNull().default(true),
    createdBy: uuid("created_by").references(() => admins.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (t) => [index("status_updates_order_idx").on(t.orderId, t.createdAt)],
);

export const timelineEvents = pgTable(
  "timeline_events",
  {
    id: id(),
    orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
    eventDate: timestamp("event_date", { withTimezone: true }).notNull().defaultNow(),
    title: varchar("title", { length: 240 }).notNull(),
    description: text("description"),
    customerVisible: boolean("customer_visible").notNull().default(true),
    createdAt: createdAt(),
  },
  (t) => [index("timeline_events_order_idx").on(t.orderId, t.eventDate)],
);

/* ───────────── Custom fields ───────────── */

export const customFieldDefinitions = pgTable(
  "custom_field_definitions",
  {
    id: id(),
    label: varchar("label", { length: 120 }).notNull(),
    key: varchar("key", { length: 64 }).notNull().unique(),
    dataType: varchar("data_type", { length: 16 }).notNull(), // TEXT | LONG_TEXT | NUMBER | DATE | URL | EMAIL | PHONE | BOOLEAN | SELECT
    section: varchar("section", { length: 24 }).notNull().default("additional"), // order | project | shipping | additional
    options: jsonb("options").$type<string[]>(),
    displayOrder: integer("display_order").notNull().default(0),
    required: boolean("required").notNull().default(false),
    customerVisible: boolean("customer_visible").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: createdAt(),
  },
  (t) => [index("custom_field_defs_order_idx").on(t.section, t.displayOrder)],
);

export const customFieldValues = pgTable(
  "custom_field_values",
  {
    id: id(),
    orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
    fieldId: uuid("field_id").notNull().references(() => customFieldDefinitions.id, { onDelete: "cascade" }),
    value: text("value").notNull(),
  },
  (t) => [uniqueIndex("custom_field_values_uq").on(t.orderId, t.fieldId)],
);

/* ───────────── App settings (support details etc.) ───────────── */

export const settings = pgTable("settings", {
  key: varchar("key", { length: 64 }).primaryKey(),
  value: text("value").notNull(),
});

/* ───────────── Relations ───────────── */

export const ordersRelations = relations(orders, ({ one, many }) => ({
  customer: one(customers, { fields: [orders.customerId], references: [customers.id] }),
  project: one(projects, { fields: [orders.id], references: [projects.orderId] }),
  items: many(orderItems),
  milestones: many(milestones),
  shipments: many(shipments),
  statusUpdates: many(statusUpdates),
  timelineEvents: many(timelineEvents),
  customValues: many(customFieldValues),
}));
export const customersRelations = relations(customers, ({ many }) => ({ orders: many(orders) }));
export const orderItemsRelations = relations(orderItems, ({ one }) => ({ order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }) }));
export const projectsRelations = relations(projects, ({ one }) => ({ order: one(orders, { fields: [projects.orderId], references: [orders.id] }) }));
export const milestonesRelations = relations(milestones, ({ one }) => ({ order: one(orders, { fields: [milestones.orderId], references: [orders.id] }) }));
export const shipmentsRelations = relations(shipments, ({ one }) => ({ order: one(orders, { fields: [shipments.orderId], references: [orders.id] }) }));
export const statusUpdatesRelations = relations(statusUpdates, ({ one }) => ({ order: one(orders, { fields: [statusUpdates.orderId], references: [orders.id] }) }));
export const timelineEventsRelations = relations(timelineEvents, ({ one }) => ({ order: one(orders, { fields: [timelineEvents.orderId], references: [orders.id] }) }));
export const customFieldValuesRelations = relations(customFieldValues, ({ one }) => ({
  order: one(orders, { fields: [customFieldValues.orderId], references: [orders.id] }),
  field: one(customFieldDefinitions, { fields: [customFieldValues.fieldId], references: [customFieldDefinitions.id] }),
}));
