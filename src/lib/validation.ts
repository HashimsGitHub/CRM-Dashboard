import { z } from "zod";
import {
  CARRIER_KEYS,
  FIELD_SECTION_KEYS,
  FIELD_TYPE_KEYS,
  MILESTONE_STATUS_KEYS,
  ORDER_TYPE_KEYS,
  SHIPMENT_STATUS_KEYS,
} from "./constants";
import { STATUS_KEYS } from "./status";

/** Empty strings from HTML forms become undefined/null. */
const emptyToNull = (v: unknown) => (typeof v === "string" && v.trim() === "" ? null : v);
const optText = (max: number) => z.preprocess(emptyToNull, z.string().trim().max(max).nullable().optional());
const reqText = (max: number, label = "This field") => z.string().trim().min(1, `${label} is required`).max(max);
const optDate = z.preprocess(emptyToNull, z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid date").nullable().optional());
const percent = z.coerce.number().int().min(0).max(100);
const checkbox = z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean());
const httpUrl = z.preprocess(
  emptyToNull,
  z.string().trim().max(2000).url("Enter a valid URL").refine((u) => /^https?:\/\//i.test(u), "URL must start with http:// or https://").nullable().optional(),
);

export const loginSchema = z.object({
  username: z.string().trim().min(1, "Username is required").max(64),
  password: z.string().min(1, "Password is required").max(200),
});

export const customerSchema = z.object({
  customerName: reqText(160, "Customer name"),
  company: optText(160),
  email: z.preprocess(emptyToNull, z.string().trim().email("Enter a valid email").max(254).nullable().optional()),
  phone: optText(40),
});

export const orderSchema = customerSchema.extend({
  orderType: z.enum(ORDER_TYPE_KEYS),
  title: reqText(200, "Title"),
  description: optText(5000),
  overallStatus: z.string().refine((s) => STATUS_KEYS.includes(s), "Unknown status"),
  progressPercentage: percent,
  currentPhase: optText(160),
  orderDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Order date is required"),
  expectedCompletionDate: optDate,
  completedDate: optDate,
  internalNotes: optText(5000),
});

export const itemSchema = z.object({
  name: reqText(200, "Item name"),
  description: optText(1000),
  sku: optText(64),
  quantity: z.coerce.number().int().min(1).max(100000),
  supplierCost: z.preprocess(emptyToNull, z.coerce.number().min(0).max(1e9).nullable().optional()),
  customerVisible: checkbox,
});

export const projectSchema = z.object({
  name: reqText(200, "Project name"),
  description: optText(5000),
  startDate: optDate,
  plannedCompletionDate: optDate,
});

export const milestoneSchema = z.object({
  title: reqText(200, "Title"),
  description: optText(2000),
  status: z.enum(MILESTONE_STATUS_KEYS),
  progressPercentage: percent.default(0),
  plannedStartDate: optDate,
  plannedCompletionDate: optDate,
  actualCompletionDate: optDate,
  customerNotes: optText(2000),
  internalNotes: optText(2000),
});

export const shipmentSchema = z.object({
  carrier: z.enum(CARRIER_KEYS),
  carrierName: optText(80),
  trackingNumber: optText(80),
  status: z.enum(SHIPMENT_STATUS_KEYS),
  shipDate: optDate,
  estimatedDeliveryDate: optDate,
  actualDeliveryDate: optDate,
  trackingUrl: httpUrl,
  customerNotes: optText(2000),
  internalNotes: optText(2000),
});

export const statusUpdateSchema = z.object({
  title: optText(200),
  body: reqText(5000, "Update text"),
  customerVisible: checkbox,
});

export const timelineEventSchema = z.object({
  title: reqText(240, "Event title"),
  description: optText(2000),
  eventDate: z.preprocess(emptyToNull, z.string().regex(/^\d{4}-\d{2}-\d{2}/).nullable().optional()),
  customerVisible: checkbox,
});

export const fieldDefinitionSchema = z.object({
  label: reqText(120, "Label"),
  dataType: z.enum(FIELD_TYPE_KEYS),
  section: z.enum(FIELD_SECTION_KEYS),
  options: optText(2000),
  displayOrder: z.coerce.number().int().min(0).max(10000).default(0),
  required: checkbox,
  customerVisible: checkbox,
  isActive: checkbox.default(true),
});

export const settingsSchema = z.object({
  companyName: reqText(120, "Company name"),
  supportEmail: z.preprocess(emptyToNull, z.string().trim().email().max(254).nullable().optional()),
  supportPhone: optText(40),
  supportHours: optText(200),
  supportMessage: optText(500),
});

export const slugify = (label: string) =>
  label.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 60) || "field";

/** Validate a stored custom-field value against its definition. Returns an error string or null. */
export function validateFieldValue(
  def: { dataType: string; options: string[] | null; label: string },
  raw: string,
): string | null {
  const v = raw.trim();
  if (v.length > 5000) return `${def.label} is too long`;
  switch (def.dataType) {
    case "NUMBER":
      return Number.isFinite(Number(v)) ? null : `${def.label} must be a number`;
    case "DATE":
      return /^\d{4}-\d{2}-\d{2}$/.test(v) ? null : `${def.label} must be a date`;
    case "URL":
      return z.string().url().safeParse(v).success && /^https?:\/\//i.test(v) ? null : `${def.label} must be an http(s) URL`;
    case "EMAIL":
      return z.string().email().safeParse(v).success ? null : `${def.label} must be an email address`;
    case "BOOLEAN":
      return v === "true" || v === "false" ? null : `${def.label} must be yes or no`;
    case "SELECT":
      return def.options?.includes(v) ? null : `${def.label} must be one of the listed options`;
    default:
      return null;
  }
}
