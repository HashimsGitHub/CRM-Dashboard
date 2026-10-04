import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { OrderForm } from "@/components/admin/order-form";
import { ItemsPanel, ProjectPanel, ShipmentsPanel, TimelinePanel, UpdatesPanel } from "@/components/admin/order-sections";
import { getCustomValues, getOrderForAdmin, listFieldDefinitions } from "@/lib/admin-service";

export const metadata: Metadata = { title: "Edit Order" };

export default async function EditOrder({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const [o, defs, values, sp] = await Promise.all([getOrderForAdmin(id), listFieldDefinitions(false), getCustomValues(id), searchParams]);
  if (!o) notFound();
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Edit order</h1>
          <p className="font-mono text-sm text-slate-500">{o.trackingNumber}</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/admin/orders/${o.id}`} className="btn-secondary">Back to order</Link>
          <Link href={`/track/${o.trackingNumber}`} target="_blank" className="btn-secondary">Customer view ↗</Link>
        </div>
      </div>
      {sp.created && (
        <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          Order created. Customer tracking number: <strong className="font-mono">{o.trackingNumber}</strong>. Add items, milestones and shipments below.
        </div>
      )}
      <nav aria-label="Sections" className="flex flex-wrap gap-2 text-sm">
        {[["updates", "Updates"], ["project", "Project & milestones"], ["items", "Items"], ["shipments", "Shipments"], ["timeline", "Timeline"]].map(([h, l]) => (
          <a key={h} href={`#${h}`} className="rounded-full border border-slate-200 bg-white px-3 py-1 font-medium text-slate-600 hover:bg-slate-100">{l}</a>
        ))}
      </nav>
      <OrderForm
        orderId={o.id} defs={defs} customValues={values}
        v={{ ...o, customerName: o.customer.name, company: o.customer.company, email: o.customer.email, phone: o.customer.phone }}
      />
      <UpdatesPanel o={o} />
      <ProjectPanel o={o} />
      <ItemsPanel o={o} />
      <ShipmentsPanel o={o} />
      <TimelinePanel o={o} />
    </div>
  );
}
