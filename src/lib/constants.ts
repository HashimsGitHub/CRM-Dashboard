export const ORDER_TYPES = {
  HARDWARE: "Hardware",
  SOFTWARE: "Software",
  SERVICE: "IT Service",
  TURNKEY: "Turnkey Solution",
  OTHER: "Other",
} as const;
export type OrderType = keyof typeof ORDER_TYPES;
export const ORDER_TYPE_KEYS = Object.keys(ORDER_TYPES) as [OrderType, ...OrderType[]];

export const CARRIERS = { UPS: "UPS", FEDEX: "FedEx", USPS: "USPS", DHL: "DHL", OTHER: "Other" } as const;
export type Carrier = keyof typeof CARRIERS;
export const CARRIER_KEYS = Object.keys(CARRIERS) as [Carrier, ...Carrier[]];

/** Used to prefill a tracking URL when the admin leaves it blank. */
export const CARRIER_URL_TEMPLATES: Partial<Record<Carrier, (n: string) => string>> = {
  UPS: (n) => `https://www.ups.com/track?tracknum=${encodeURIComponent(n)}`,
  FEDEX: (n) => `https://www.fedex.com/fedextrack/?trknbr=${encodeURIComponent(n)}`,
  USPS: (n) => `https://tools.usps.com/go/TrackConfirmAction?tLabels=${encodeURIComponent(n)}`,
  DHL: (n) => `https://www.dhl.com/us-en/home/tracking.html?tracking-id=${encodeURIComponent(n)}`,
};

export const MILESTONE_STATUSES = {
  PENDING: "Pending",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
  BLOCKED: "Blocked",
  CANCELLED: "Cancelled",
} as const;
export type MilestoneStatus = keyof typeof MILESTONE_STATUSES;
export const MILESTONE_STATUS_KEYS = Object.keys(MILESTONE_STATUSES) as [MilestoneStatus, ...MilestoneStatus[]];

export const SHIPMENT_STATUSES = {
  PREPARING: "Preparing",
  SHIPPED: "Shipped",
  IN_TRANSIT: "In transit",
  OUT_FOR_DELIVERY: "Out for delivery",
  DELIVERED: "Delivered",
  EXCEPTION: "Delivery exception",
  RETURNED: "Returned",
} as const;
export type ShipmentStatus = keyof typeof SHIPMENT_STATUSES;
export const SHIPMENT_STATUS_KEYS = Object.keys(SHIPMENT_STATUSES) as [ShipmentStatus, ...ShipmentStatus[]];

export const FIELD_TYPES = {
  TEXT: "Text",
  LONG_TEXT: "Long text",
  NUMBER: "Number",
  DATE: "Date",
  URL: "URL",
  EMAIL: "Email",
  PHONE: "Phone",
  BOOLEAN: "Yes / No",
  SELECT: "Dropdown",
} as const;
export type FieldType = keyof typeof FIELD_TYPES;
export const FIELD_TYPE_KEYS = Object.keys(FIELD_TYPES) as [FieldType, ...FieldType[]];

export const FIELD_SECTIONS = {
  order: "Order Details",
  project: "Project Details",
  shipping: "Shipping & Delivery",
  additional: "Additional Information",
} as const;
export type FieldSection = keyof typeof FIELD_SECTIONS;
export const FIELD_SECTION_KEYS = Object.keys(FIELD_SECTIONS) as [FieldSection, ...FieldSection[]];
