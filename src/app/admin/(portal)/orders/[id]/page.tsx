import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { archiveOrderAction } from "@/app/admin/actions";
import { ConfirmButton } from "@/components/admin/action-form";
import { Badge, ShipmentBadge, StatusBadge } from "@/components/ui/status-badge";
import { ProgressBar } from "@/components/ui/progress";
import { Fact } from "@/components/ui/section";
import { getCustomValues, getOrderForAdmin, listFieldDefinitions } from "@/lib/admin-service";
import { FIELD_SECTIONS, MILESTONE_STATUSES, ORDER_TYPES } from "@/lib/constants";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Order" };

export default async function OrderDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const [o, defs, values] = await Promise.all([getOrderForAdmin(id), listFieldDefinitions(), getCustomValues(id)]);
  if (!o) notFound();
  const fields = defs.filter((d) => values[d.id]);
  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-sm text-slate-500">{o.trackingNumber}</p>
          <h1 className="text-2xl font-bold">{o.title}</h1>
          <p className="text-slate-600">{o.customer.name}{o.customer.company ? ` · ${o.customer.company}` : ""}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/admin/orders/${o.id}/edit`} className="btn-primary">Edit</Link>
          <Link href={`/track/${o.trackingNumber}`} target="_blank" className="btn-secondary">Customer view ↗</Link>
          <form action={archiveOrderAction.bind(null, o.id, o.isActive)}>
            <ConfirmButton message={o.isActive ? "Archive this order? Customers will no longer be able to view it." : "Restore this order?"} className="btn-secondary">
              {o.isActive ? "Archive" : "Restore"}
            </ConfirmButton>
          </form>
        </div>
      </div>
      {!o.isActive && <p role="status" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">This order is archived and hidden from customers.</p>}

      <section className="card grid gap-4 p-5 sm:grid-cols-4" aria-label="Summary">
        <Fact label="Status"><StatusBadge status={o.overallStatus} /></Fact>
        <Fact label="Type">{ORDER_TYPES[o.orderType as keyof typeof ORDER_TYPES]}</Fact>
        <Fact label="Ordered">{formatDate(o.orderDate)}</Fact>
        <Fact label="Expected">{formatDate(o.expectedCompletionDate) || "—"}</Fact>
        <div className="sm:col-span-4"><ProgressBar value={o.progressPercentage} label="Progress" /><p className="mt-1 text-sm text-slate-600">{o.progressPercentage}% complete{o.currentPhase ? ` · ${o.currentPhase}` : ""}</p></div>
        {o.internalNotes && <div className="sm:col-span-4 rounded-lg bg-amber-50 p-3 text-sm"><p className="font-medium text-amber-900">Internal notes</p><p className="whitespace-pre-line text-amber-900">{o.internalNotes}</p></div>}
      </section>

      {fields.length > 0 && (
        <section className="card p-5" aria-label="Custom fields">
          <h2 className="mb-3 font-semibold">Custom fields</h2>
          <dl className="grid gap-4 sm:grid-cols-2">
            {fields.map((d) => <Fact key={d.id} label={`${d.label} · ${FIELD_SECTIONS[d.section as keyof typeof FIELD_SECTIONS]}${d.customerVisible ? "" : " · internal"}`}>{values[d.id]}</Fact>)}
          </dl>
        </section>
      )}

      {o.milestones.length > 0 && (
        <section className="card p-5"><h2 className="mb-3 font-semibold">Milestones</h2>
          <ol className="space-y-2 text-sm">{o.milestones.map((m) => <li key={m.id} className="flex items-center justify-between gap-3"><span>{m.title}</span><Badge tone={m.status === "COMPLETED" ? "success" : m.status === "IN_PROGRESS" ? "progress" : "neutral"}>{MILESTONE_STATUSES[m.status as keyof typeof MILESTONE_STATUSES]}</Badge></li>)}</ol>
        </section>
      )}
      {o.shipments.length > 0 && (
        <section className="card p-5"><h2 className="mb-3 font-semibold">Shipments</h2>
          <ul className="space-y-2 text-sm">{o.shipments.map((s) => <li key={s.id} className="flex flex-wrap items-center gap-3"><span className="font-medium">{s.carrier}</span><span className="font-mono">{s.trackingNumber}</span><ShipmentBadge status={s.status} /></li>)}</ul>
        </section>
      )}
      {o.items.length > 0 && (
        <section className="card p-5"><h2 className="mb-3 font-semibold">Items</h2>
          <ul className="space-y-1 text-sm">{o.items.map((i) => <li key={i.id}>{i.name} × {i.quantity}</li>)}</ul>
        </section>
      )}
    </div>
  );
}
