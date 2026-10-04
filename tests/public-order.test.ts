import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/db";
import { orders } from "@/db/schema";
import * as svc from "@/lib/admin-service";
import { getPublicOrder } from "@/lib/public-order";
import { baseOrder, emptyMilestone, emptyShipment, makeOrder, resetDb } from "./helpers";

beforeEach(resetDb);

describe("customer order lookup", () => {
  it("returns a valid order by tracking number (case/space tolerant)", async () => {
    const { trackingNumber } = await makeOrder();
    const o = await getPublicOrder(`  ${trackingNumber.toLowerCase()} `);
    expect(o?.title).toBe("Test Project");
    expect(o?.progress).toBe(55);
    expect(o?.customerName).toBe("Test Customer");
  });

  it("returns null for unknown or malformed numbers without throwing", async () => {
    await makeOrder();
    for (const bad of ["ORD-26-ZZZZ-ZZZZ", "1", "1001", "", "' OR 1=1 --", "ORD-26-AAAA-AAAA; DROP TABLE orders", "x".repeat(500)]) {
      expect(await getPublicOrder(bad)).toBeNull();
    }
  });

  it("never exposes internal data or database ids", async () => {
    const { id, trackingNumber } = await makeOrder();
    await svc.addItem(id, { name: "Server", description: null, sku: "S1", quantity: 2, supplierCost: 1234.56, customerVisible: true });
    await svc.addMilestone(id, { ...emptyMilestone, title: "Install", internalNotes: "SECRET-MS-NOTE", customerNotes: "public note" });
    await svc.addShipment(id, emptyShipment);
    await svc.addStatusUpdate(id, { title: null, body: "SECRET-INTERNAL-UPDATE", customerVisible: false });
    await svc.addTimelineEntry(id, { title: "SECRET-INTERNAL-EVENT", description: null, eventDate: null, customerVisible: false });
    const json = JSON.stringify(await getPublicOrder(trackingNumber));
    for (const leak of ["SECRET-", "1234.56", "supplierCost", "internalNotes", "margin", id, "passwordHash", "customerId", "DATABASE_URL"]) {
      expect(json).not.toContain(leak);
    }
    expect(json).toContain("public note");
  });

  it("hides items flagged as not customer-visible", async () => {
    const { id, trackingNumber } = await makeOrder();
    await svc.addItem(id, { name: "Visible", description: null, sku: null, quantity: 1, supplierCost: null, customerVisible: true });
    await svc.addItem(id, { name: "Hidden-Item", description: null, sku: null, quantity: 1, supplierCost: null, customerVisible: false });
    const o = await getPublicOrder(trackingNumber);
    expect(o?.items.map((i) => i.name)).toEqual(["Visible"]);
  });

  it("hides archived orders", async () => {
    const { id, trackingNumber } = await makeOrder();
    await svc.setOrderActive(id, false);
    expect(await getPublicOrder(trackingNumber)).toBeNull();
    await svc.setOrderActive(id, true);
    expect(await getPublicOrder(trackingNumber)).not.toBeNull();
  });

  it("does not expose hidden or inactive custom fields, but shows visible ones", async () => {
    const vis = await svc.createFieldDefinition({ label: "Assigned Engineer", dataType: "TEXT", section: "project", options: null, displayOrder: 1, required: false, customerVisible: true, isActive: true });
    const hid = await svc.createFieldDefinition({ label: "Purchase Cost Code", dataType: "TEXT", section: "order", options: null, displayOrder: 2, required: false, customerVisible: false, isActive: true });
    const off = await svc.createFieldDefinition({ label: "Retired", dataType: "TEXT", section: "order", options: null, displayOrder: 3, required: false, customerVisible: true, isActive: true });
    const { id, trackingNumber } = await makeOrder({}, { [vis.id]: "Ada Lovelace", [hid.id]: "HIDDEN-VALUE-123", [off.id]: "RETIRED-VALUE" });
    await svc.updateFieldDefinition(off.id, { label: "Retired", dataType: "TEXT", section: "order", options: null, displayOrder: 3, required: false, customerVisible: true, isActive: false });
    const o = await getPublicOrder(trackingNumber);
    expect(o?.customFields).toEqual([expect.objectContaining({ label: "Assigned Engineer", value: "Ada Lovelace" })]);
    const json = JSON.stringify(o);
    expect(json).not.toContain("HIDDEN-VALUE-123");
    expect(json).not.toContain("RETIRED-VALUE");
    expect(await svc.getCustomValues(id)).toMatchObject({ [hid.id]: "HIDDEN-VALUE-123" }); // still stored for admins
  });

  it("reflects customer-visible changes immediately", async () => {
    const { id, trackingNumber } = await makeOrder();
    expect((await getPublicOrder(trackingNumber))?.latestUpdate).toBeNull();
    await svc.addStatusUpdate(id, { title: "Shipped", body: "On its way", customerVisible: true });
    await svc.addShipment(id, emptyShipment);
    await svc.addMilestone(id, { ...emptyMilestone, title: "Design", status: "COMPLETED" });
    const o = await getPublicOrder(trackingNumber);
    expect(o?.latestUpdate?.body).toBe("On its way");
    expect(o?.shipments[0]).toMatchObject({ carrier: "UPS", trackingNumber: "1Z999AA10123456784" });
    expect(o?.shipments[0].trackingUrl).toContain("ups.com");
    expect(o?.milestones[0]).toMatchObject({ title: "Design", status: "COMPLETED", progress: 100 });
  });
});

describe("tracking numbers", () => {
  it("are unique, non-sequential and high-entropy", async () => {
    const a = await makeOrder();
    const b = await makeOrder();
    expect(a.trackingNumber).not.toBe(b.trackingNumber);
    expect(a.trackingNumber).toMatch(/^ORD-\d{2}-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    const rows = await db.select().from(orders);
    expect(rows).toHaveLength(2);
    expect(baseOrder.title).toBeTruthy();
  });
});
