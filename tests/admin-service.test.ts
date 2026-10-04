import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/db";
import { orders } from "@/db/schema";
import * as svc from "@/lib/admin-service";
import { FieldValidationError } from "@/lib/admin-service";
import { itemSchema, orderSchema, shipmentSchema } from "@/lib/validation";
import { baseOrder, emptyMilestone, emptyShipment, makeOrder, resetDb } from "./helpers";

beforeEach(resetDb);

describe("admin order management", () => {
  it("creates an order with customer and a confirmation event", async () => {
    const { id } = await makeOrder();
    const o = await svc.getOrderForAdmin(id);
    expect(o?.customer.name).toBe("Test Customer");
    expect(o?.timelineEvents.map((e) => e.title)).toContain("Order confirmed");
  });

  it("updates status, logs it on the timeline and stamps completion", async () => {
    const { id } = await makeOrder();
    await svc.updateOrder(id, { ...baseOrder, overallStatus: "COMPLETED", progressPercentage: 80 });
    const o = await svc.getOrderForAdmin(id);
    expect(o?.overallStatus).toBe("COMPLETED");
    expect(o?.progressPercentage).toBe(100);
    expect(o?.completedDate).toBeTruthy();
    expect(o?.timelineEvents.map((e) => e.title)).toContain("Status changed to Completed");
  });

  it("adds, reorders and updates milestones and derives progress", async () => {
    const { id } = await makeOrder();
    for (const t of ["A", "B", "C", "D"]) await svc.addMilestone(id, { ...emptyMilestone, title: t });
    let o = await svc.getOrderForAdmin(id);
    await svc.moveMilestone(id, o!.milestones[2].id, "up");
    o = await svc.getOrderForAdmin(id);
    expect(o!.milestones.map((m) => m.title)).toEqual(["A", "C", "B", "D"]);
    await svc.updateMilestone(id, o!.milestones[0].id, { ...emptyMilestone, title: "A", status: "COMPLETED" });
    expect(await svc.progressFromMilestones(id)).toBe(25);
  });

  it("adds shipments with an auto-generated carrier URL and supports multiple", async () => {
    const { id } = await makeOrder();
    await svc.addShipment(id, emptyShipment);
    await svc.addShipment(id, { ...emptyShipment, carrier: "FEDEX", trackingNumber: "7946" });
    const o = await svc.getOrderForAdmin(id);
    expect(o?.shipments).toHaveLength(2);
    expect(o?.shipments[1].trackingUrl).toContain("fedex.com");
  });

  it("archives instead of deleting", async () => {
    const { id } = await makeOrder();
    await svc.setOrderActive(id, false);
    const [row] = await db.select().from(orders).where(eq(orders.id, id));
    expect(row.isActive).toBe(false);
  });

  it("searches by order number, customer, project and shipment tracking number, and filters", async () => {
    const a = await makeOrder({ title: "Alpha Rollout", customerName: "Zed Zebra" });
    await makeOrder({ title: "Beta", orderType: "HARDWARE", overallStatus: "SHIPPED" });
    await svc.saveProject(a.id, { name: "Quantum Migration", description: null, startDate: null, plannedCompletionDate: null });
    await svc.addShipment(a.id, emptyShipment);
    const count = async (f: svc.OrderFilters) => (await svc.listOrders({ state: "all", ...f })).length;
    expect(await count({ q: a.trackingNumber.slice(4) })).toBe(1);
    expect(await count({ q: "zebra" })).toBe(1);
    expect(await count({ q: "quantum" })).toBe(1);
    expect(await count({ q: "1Z999AA101" })).toBe(1);
    expect(await count({ q: "%" })).toBe(0);
    expect(await count({ type: "HARDWARE" })).toBe(1);
    expect(await count({ status: "SHIPPED" })).toBe(1);
    const stats = await svc.getStats();
    expect(stats).toMatchObject({ total: 2, inTransit: 1, activeProjects: 1 });
  });
});

describe("custom field engine", () => {
  const def = { label: "Warranty Expiry", dataType: "DATE" as const, section: "order" as const, options: null, displayOrder: 0, required: false, customerVisible: true, isActive: true };

  it("generates unique keys and validates values by type", async () => {
    const a = await svc.createFieldDefinition(def);
    const b = await svc.createFieldDefinition(def);
    expect(a.key).toBe("warranty_expiry");
    expect(b.key).toBe("warranty_expiry_2");
    const { id } = await makeOrder();
    await expect(svc.setCustomValues(id, { [a.id]: "not a date" })).rejects.toBeInstanceOf(FieldValidationError);
    await svc.setCustomValues(id, { [a.id]: "2030-01-31" });
    expect((await svc.getCustomValues(id))[a.id]).toBe("2030-01-31");
    await svc.setCustomValues(id, { [a.id]: "" });
    expect(await svc.getCustomValues(id)).toEqual({});
  });

  it("supports dropdowns and required fields", async () => {
    const sel = await svc.createFieldDefinition({ ...def, label: "Tier", dataType: "SELECT", options: "Gold\nSilver" });
    const req = await svc.createFieldDefinition({ ...def, label: "PO", dataType: "TEXT", required: true });
    const { id } = await makeOrder();
    await expect(svc.setCustomValues(id, { [sel.id]: "Bronze" })).rejects.toThrow();
    await expect(svc.setCustomValues(id, { [req.id]: "" })).rejects.toThrow(/required/);
    await svc.setCustomValues(id, { [sel.id]: "Gold", [req.id]: "PO-1" });
    await expect(svc.createFieldDefinition({ ...def, label: "X", dataType: "SELECT", options: "" })).rejects.toBeInstanceOf(FieldValidationError);
  });
});

describe("input validation", () => {
  it("rejects bad orders, items and shipments", () => {
    expect(orderSchema.safeParse({ ...baseOrder, title: "" }).success).toBe(false);
    expect(orderSchema.safeParse({ ...baseOrder, progressPercentage: 150 }).success).toBe(false);
    expect(orderSchema.safeParse({ ...baseOrder, overallStatus: "NOPE" }).success).toBe(false);
    expect(orderSchema.safeParse({ ...baseOrder, orderType: "ADMIN" }).success).toBe(false);
    expect(itemSchema.safeParse({ name: "x", quantity: 0 }).success).toBe(false);
    expect(shipmentSchema.safeParse({ ...emptyShipment, trackingUrl: "javascript:alert(1)" }).success).toBe(false);
    expect(shipmentSchema.safeParse({ ...emptyShipment, trackingUrl: "https://ups.com/x" }).success).toBe(true);
  });
});
