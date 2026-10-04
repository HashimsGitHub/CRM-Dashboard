import type { Metadata } from "next";
import { OrderForm } from "@/components/admin/order-form";
import { listFieldDefinitions } from "@/lib/admin-service";

export const metadata: Metadata = { title: "New Order" };

export default async function NewOrder() {
  const defs = await listFieldDefinitions(false);
  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <h1 className="text-2xl font-bold">New order</h1>
      <p className="text-sm text-slate-600">Create the order first — you can then add items, milestones, shipments and updates.</p>
      <OrderForm orderId={null} defs={defs} />
    </div>
  );
}
