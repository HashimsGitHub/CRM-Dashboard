import { config } from "dotenv";
config({ path: ".env.local" });
config();
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as s from "./schema";

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
const db = drizzle(pool, { schema: s });

/** Date offset from today as YYYY-MM-DD / Date. */
const day = (offset: number) => new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);
const at = (offset: number, hour = 10) => new Date(`${day(offset)}T${String(hour).padStart(2, "0")}:00:00Z`);

export const DEMO = {
  hardware: "ORD-26-HW4K-9X2M",
  service: "ORD-26-M365-7QPD",
  turnkey: "ORD-26-TK8R-5NWC",
};

async function seedAdmin() {
  const username = process.env.ADMIN_USERNAME?.trim().toLowerCase();
  const password = process.env.ADMIN_INITIAL_PASSWORD;
  if (!username || !password) {
    console.log("ADMIN_USERNAME / ADMIN_INITIAL_PASSWORD not set — skipping admin creation.");
    return;
  }
  if (password.length < 10) throw new Error("ADMIN_INITIAL_PASSWORD must be at least 10 characters");
  const [existing] = await db.select().from(s.admins).where(eq(s.admins.username, username));
  if (existing) return console.log(`Admin "${username}" already exists — left unchanged.`);
  await db.insert(s.admins).values({ username, passwordHash: await bcrypt.hash(password, 12) });
  console.log(`Created administrator "${username}".`);
}

async function seedFields() {
  const defs = [
    { label: "Assigned Engineer", key: "assigned_engineer", dataType: "TEXT", section: "project", customerVisible: true, displayOrder: 1 },
    { label: "Project Manager", key: "project_manager", dataType: "TEXT", section: "project", customerVisible: true, displayOrder: 2 },
    { label: "Warranty Expiry", key: "warranty_expiry", dataType: "DATE", section: "order", customerVisible: true, displayOrder: 3 },
    { label: "Support Contract", key: "support_contract", dataType: "SELECT", section: "additional", options: ["None", "Standard", "Premium 24/7"], customerVisible: true, displayOrder: 4 },
    { label: "Purchase Order", key: "purchase_order", dataType: "TEXT", section: "order", customerVisible: false, displayOrder: 5 },
    { label: "Supplier Reference", key: "supplier_reference", dataType: "TEXT", section: "order", customerVisible: false, displayOrder: 6 },
  ];
  for (const d of defs) await db.insert(s.customFieldDefinitions).values(d).onConflictDoNothing();
  const rows = await db.select().from(s.customFieldDefinitions);
  return Object.fromEntries(rows.map((r) => [r.key, r.id]));
}

async function seedSettings() {
  const defaults = {
    companyName: "TechSource Direct",
    supportEmail: "support@techsource.example",
    supportPhone: "+1 (555) 010-0142",
    supportHours: "Mon–Fri, 8am–6pm ET",
    supportMessage: "Questions about your order or project? Our team is happy to help.",
  };
  for (const [key, value] of Object.entries(defaults)) await db.insert(s.settings).values({ key, value }).onConflictDoNothing();
}

async function seedOrders() {
  const f = await seedFields();
  const exists = async (n: string) => (await db.select({ id: s.orders.id }).from(s.orders).where(eq(s.orders.trackingNumber, n))).length > 0;

  /* ── Demo 1: Hardware ── */
  if (!(await exists(DEMO.hardware))) {
    const [c] = await db.insert(s.customers).values({ name: "Dana Whitfield", company: "Acme Manufacturing", email: "dana@acme.example", phone: "+1 (555) 010-2001" }).returning();
    const [o] = await db.insert(s.orders).values({
      trackingNumber: DEMO.hardware, customerId: c.id, orderType: "HARDWARE", title: "Enterprise Server Purchase",
      description: "Two rack servers and supporting storage for the Acme plant-floor data centre refresh.",
      overallStatus: "SHIPPED", progressPercentage: 70, orderDate: day(-9), expectedCompletionDate: day(3),
      internalNotes: "Margin on this deal is 11%. Supplier gave 4% rebate — do not disclose.",
    }).returning();
    await db.insert(s.orderItems).values([
      { orderId: o.id, name: "Dell PowerEdge R760 Rack Server", sku: "PE-R760-XL", quantity: 2, supplierCost: "7420.00", sortOrder: 0, description: "2× Xeon Gold, 256 GB RAM, 4× 1.92 TB SSD" },
      { orderId: o.id, name: "NetApp 24-Bay Storage Shelf", sku: "NA-DS224C", quantity: 1, supplierCost: "11890.00", sortOrder: 1 },
      { orderId: o.id, name: "Rack Rails & Cable Kit", sku: "RK-STD-42", quantity: 2, supplierCost: "96.50", sortOrder: 2 },
    ]);
    await db.insert(s.shipments).values({
      orderId: o.id, carrier: "UPS", trackingNumber: "1Z999AA10123456784", status: "IN_TRANSIT", shipDate: day(-3),
      estimatedDeliveryDate: day(3), trackingUrl: "https://www.ups.com/track?tracknum=1Z999AA10123456784",
      customerNotes: "Signature required on delivery. Please arrange for a loading-dock contact.", internalNotes: "Freight insured for $42k.",
    });
    await db.insert(s.statusUpdates).values([
      { orderId: o.id, title: "Shipped via UPS", body: "Your servers and storage shelf left our warehouse and are now with UPS.\nDelivery is expected in 3 days.", customerVisible: true, createdAt: at(-3, 15) },
      { orderId: o.id, body: "Customer asked for early delivery; declined — carrier cut-off.", customerVisible: false, createdAt: at(-4) },
    ]);
    await db.insert(s.timelineEvents).values([
      { orderId: o.id, title: "Order confirmed", eventDate: at(-9), customerVisible: true },
      { orderId: o.id, title: "Payment received", eventDate: at(-8), customerVisible: true },
      { orderId: o.id, title: "Equipment received from supplier", eventDate: at(-6), customerVisible: true },
      { orderId: o.id, title: "Hardware configured and quality-tested", eventDate: at(-4), customerVisible: true },
      { orderId: o.id, title: "Shipped via UPS", description: "Tracking number 1Z999AA10123456784", eventDate: at(-3), customerVisible: true },
      { orderId: o.id, title: "Supplier invoice reconciled", eventDate: at(-2), customerVisible: false },
    ]);
    await db.insert(s.customFieldValues).values([
      { orderId: o.id, fieldId: f.warranty_expiry, value: day(365 * 3) },
      { orderId: o.id, fieldId: f.support_contract, value: "Standard" },
      { orderId: o.id, fieldId: f.purchase_order, value: "PO-ACME-77421" },
    ]);
  }

  /* ── Demo 2: IT service ── */
  if (!(await exists(DEMO.service))) {
    const [c] = await db.insert(s.customers).values({ name: "Priya Raman", company: "Northwind Consulting", email: "priya@northwind.example", phone: "+1 (555) 010-2002" }).returning();
    const [o] = await db.insert(s.orders).values({
      trackingNumber: DEMO.service, customerId: c.id, orderType: "SERVICE", title: "Microsoft 365 Migration",
      description: "Migration of 85 mailboxes, SharePoint sites and Teams from on-premises Exchange to Microsoft 365.",
      overallStatus: "IN_PROGRESS", progressPercentage: 65, currentPhase: "Mailbox migration — wave 2 of 3",
      orderDate: day(-35), expectedCompletionDate: day(18), internalNotes: "Scope creep risk: customer asking about Intune. Quote separately.",
    }).returning();
    await db.insert(s.projects).values({ orderId: o.id, name: "Microsoft 365 Migration", description: "Exchange → Exchange Online, file shares → SharePoint, Teams rollout.", startDate: day(-28), plannedCompletionDate: day(18) });
    await db.insert(s.milestones).values([
      { orderId: o.id, title: "Discovery & Requirements", description: "Inventory of mailboxes, licences and integrations.", status: "COMPLETED", progressPercentage: 100, plannedCompletionDate: day(-26), actualCompletionDate: day(-27), sortOrder: 0 },
      { orderId: o.id, title: "Tenant Setup & Security Baseline", description: "Tenant configuration, MFA and conditional access.", status: "COMPLETED", progressPercentage: 100, plannedCompletionDate: day(-19), actualCompletionDate: day(-18), sortOrder: 1 },
      { orderId: o.id, title: "Pilot Migration", description: "10 pilot users migrated and validated.", status: "COMPLETED", progressPercentage: 100, plannedCompletionDate: day(-11), actualCompletionDate: day(-10), customerNotes: "Pilot feedback incorporated into the main plan.", sortOrder: 2 },
      { orderId: o.id, title: "Mailbox Migration", description: "Remaining mailboxes in three waves.", status: "IN_PROGRESS", progressPercentage: 60, plannedStartDate: day(-9), plannedCompletionDate: day(4), customerNotes: "Wave 2 runs this weekend. No action required from your team.", sortOrder: 3 },
      { orderId: o.id, title: "SharePoint & Teams Rollout", description: "File share migration and Teams adoption.", status: "PENDING", progressPercentage: 0, plannedStartDate: day(5), plannedCompletionDate: day(13), sortOrder: 4 },
      { orderId: o.id, title: "Training & Handover", description: "Admin and end-user training, documentation handover.", status: "PENDING", progressPercentage: 0, plannedCompletionDate: day(18), sortOrder: 5 },
    ]);
    await db.insert(s.statusUpdates).values([
      { orderId: o.id, title: "Wave 1 complete", body: "Wave 1 (30 mailboxes) migrated successfully with no data loss.\nWave 2 is scheduled for this weekend.", customerVisible: true, createdAt: at(-2, 16) },
      { orderId: o.id, body: "Two users on legacy Outlook 2013 — need upgrade, billable.", customerVisible: false, createdAt: at(-3) },
    ]);
    await db.insert(s.timelineEvents).values([
      { orderId: o.id, title: "Order confirmed", eventDate: at(-35), customerVisible: true },
      { orderId: o.id, title: "Project kick-off meeting held", eventDate: at(-28), customerVisible: true },
      { orderId: o.id, title: "Milestone completed: Discovery & Requirements", eventDate: at(-27), customerVisible: true },
      { orderId: o.id, title: "Milestone completed: Tenant Setup & Security Baseline", eventDate: at(-18), customerVisible: true },
      { orderId: o.id, title: "Milestone completed: Pilot Migration", eventDate: at(-10), customerVisible: true },
      { orderId: o.id, title: "Wave 1 mailbox migration completed", eventDate: at(-2), customerVisible: true },
    ]);
    await db.insert(s.customFieldValues).values([
      { orderId: o.id, fieldId: f.assigned_engineer, value: "Marcus Lindqvist" },
      { orderId: o.id, fieldId: f.project_manager, value: "Elena Torres" },
      { orderId: o.id, fieldId: f.supplier_reference, value: "MS-CSP-INT-2291" },
    ]);
  }

  /* ── Demo 3: Turnkey ── */
  if (!(await exists(DEMO.turnkey))) {
    const [c] = await db.insert(s.customers).values({ name: "Jordan Castellano", company: "Contoso Retail", email: "jordan@contoso-retail.example", phone: "+1 (555) 010-2003" }).returning();
    const [o] = await db.insert(s.orders).values({
      trackingNumber: DEMO.turnkey, customerId: c.id, orderType: "TURNKEY", title: "New Office IT Infrastructure",
      description: "Complete IT build-out for the new Contoso Retail regional office: network, Wi-Fi, security and workstations.",
      overallStatus: "IMPLEMENTATION", progressPercentage: 55, currentPhase: "On-site installation",
      orderDate: day(-30), expectedCompletionDate: day(25), internalNotes: "Hardware margin 14%, services margin 38%. PO #CR-5521.",
    }).returning();
    await db.insert(s.projects).values({ orderId: o.id, name: "Regional Office IT Build-out", description: "Network design, hardware supply, installation and go-live support.", startDate: day(-25), plannedCompletionDate: day(25) });
    await db.insert(s.orderItems).values([
      { orderId: o.id, name: "Cisco Catalyst 9200 48-Port Switch", sku: "C9200-48P", quantity: 2, supplierCost: "3120.00", sortOrder: 0 },
      { orderId: o.id, name: "Fortinet FortiGate 100F Firewall", sku: "FG-100F", quantity: 1, supplierCost: "2480.00", sortOrder: 1 },
      { orderId: o.id, name: "Ubiquiti U6 Enterprise Access Point", sku: "U6-ENT", quantity: 8, supplierCost: "189.00", sortOrder: 2 },
      { orderId: o.id, name: "HP EliteBook 840 Laptop", sku: "HP-EB840-G10", quantity: 25, supplierCost: "1140.00", sortOrder: 3 },
      { orderId: o.id, name: "Network Cabling & Installation Service", quantity: 1, sortOrder: 4, description: "Structured cabling for 60 drops" },
    ]);
    await db.insert(s.shipments).values([
      { orderId: o.id, carrier: "FEDEX", trackingNumber: "794644790138", status: "DELIVERED", shipDate: day(-12), estimatedDeliveryDate: day(-9), actualDeliveryDate: day(-9), trackingUrl: "https://www.fedex.com/fedextrack/?trknbr=794644790138", customerNotes: "Network equipment delivered and signed for by site contact." },
      { orderId: o.id, carrier: "UPS", trackingNumber: "1Z999AA10198765432", status: "IN_TRANSIT", shipDate: day(-2), estimatedDeliveryDate: day(2), trackingUrl: "https://www.ups.com/track?tracknum=1Z999AA10198765432", customerNotes: "Laptops ship separately — 25 units across 3 cartons." },
    ]);
    await db.insert(s.milestones).values([
      { orderId: o.id, title: "Requirements & Site Survey", status: "COMPLETED", progressPercentage: 100, actualCompletionDate: day(-22), sortOrder: 0 },
      { orderId: o.id, title: "Solution Design", description: "Network topology, Wi-Fi heat-map and security design.", status: "COMPLETED", progressPercentage: 100, actualCompletionDate: day(-16), sortOrder: 1 },
      { orderId: o.id, title: "Hardware Procurement", status: "COMPLETED", progressPercentage: 100, actualCompletionDate: day(-12), sortOrder: 2 },
      { orderId: o.id, title: "Cabling & Installation", description: "On-site structured cabling and rack installation.", status: "IN_PROGRESS", progressPercentage: 50, plannedCompletionDate: day(7), customerNotes: "Our engineers are on site Monday–Thursday.", sortOrder: 3 },
      { orderId: o.id, title: "Configuration & Testing", status: "PENDING", progressPercentage: 0, plannedCompletionDate: day(16), sortOrder: 4 },
      { orderId: o.id, title: "Go-Live & Handover", status: "PENDING", progressPercentage: 0, plannedCompletionDate: day(25), sortOrder: 5 },
    ]);
    await db.insert(s.statusUpdates).values([
      { orderId: o.id, title: "Installation under way", body: "Network equipment has been delivered and rack installation started this week.\nLaptops are on their way via UPS and should arrive in 2 days.", customerVisible: true, createdAt: at(-1, 14) },
      { orderId: o.id, body: "Landlord delayed riser-room access by a day. Absorbed internally.", customerVisible: false, createdAt: at(-5) },
    ]);
    await db.insert(s.timelineEvents).values([
      { orderId: o.id, title: "Order confirmed", eventDate: at(-30), customerVisible: true },
      { orderId: o.id, title: "Site survey completed", eventDate: at(-22), customerVisible: true },
      { orderId: o.id, title: "Solution design approved by customer", eventDate: at(-16), customerVisible: true },
      { orderId: o.id, title: "Network equipment shipped via FedEx", eventDate: at(-12), customerVisible: true },
      { orderId: o.id, title: "Network equipment delivered", eventDate: at(-9), customerVisible: true },
      { orderId: o.id, title: "Laptops shipped via UPS", eventDate: at(-2), customerVisible: true },
      { orderId: o.id, title: "Installation started on site", eventDate: at(-1), customerVisible: true },
      { orderId: o.id, title: "Internal: change request CR-2 drafted", eventDate: at(-1, 9), customerVisible: false },
    ]);
    await db.insert(s.customFieldValues).values([
      { orderId: o.id, fieldId: f.assigned_engineer, value: "Aisha Okafor" },
      { orderId: o.id, fieldId: f.project_manager, value: "Elena Torres" },
      { orderId: o.id, fieldId: f.support_contract, value: "Premium 24/7" },
      { orderId: o.id, fieldId: f.purchase_order, value: "CR-5521" },
    ]);
  }
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set (see .env.example)");
  await seedAdmin();
  await seedSettings();
  await seedOrders();
  console.log("\nDemo tracking numbers:");
  for (const [k, v] of Object.entries(DEMO)) console.log(`  ${k.padEnd(9)} ${v}`);
  await pool.end();
}

main().catch((e) => {
  console.error("Seed failed:", e instanceof Error ? e.message : e);
  process.exit(1);
});
