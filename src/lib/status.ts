export type Tone = "neutral" | "info" | "progress" | "warning" | "success" | "danger";

export interface StatusDef {
  label: string;
  tone: Tone;
  /** Statuses that count as finished for the Active/Completed filter. */
  terminal?: boolean;
}

/**
 * Registry of order statuses. To add a status, add one entry here —
 * badges, filters and forms all read from this map.
 */
export const ORDER_STATUSES: Record<string, StatusDef> = {
  ORDER_RECEIVED: { label: "Order Received", tone: "neutral" },
  PROCESSING: { label: "Processing", tone: "info" },
  AWAITING_STOCK: { label: "Awaiting Stock", tone: "warning" },
  PROCUREMENT: { label: "Procurement", tone: "info" },
  PREPARING_SHIPMENT: { label: "Preparing Shipment", tone: "info" },
  SHIPPED: { label: "Shipped", tone: "progress" },
  IN_TRANSIT: { label: "In Transit", tone: "progress" },
  DELIVERED: { label: "Delivered", tone: "success", terminal: true },
  PROJECT_PLANNING: { label: "Project Planning", tone: "info" },
  PROJECT_STARTED: { label: "Project Started", tone: "progress" },
  IN_PROGRESS: { label: "In Progress", tone: "progress" },
  AWAITING_CUSTOMER: { label: "Awaiting Customer", tone: "warning" },
  TESTING: { label: "Testing", tone: "progress" },
  IMPLEMENTATION: { label: "Implementation", tone: "progress" },
  COMPLETED: { label: "Completed", tone: "success", terminal: true },
  ON_HOLD: { label: "On Hold", tone: "warning" },
  CANCELLED: { label: "Cancelled", tone: "danger", terminal: true },
};

export const STATUS_KEYS = Object.keys(ORDER_STATUSES);
export const TERMINAL_STATUSES = STATUS_KEYS.filter((k) => ORDER_STATUSES[k].terminal);

export function statusDef(key: string): StatusDef {
  return ORDER_STATUSES[key] ?? { label: key.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase()), tone: "neutral" };
}
