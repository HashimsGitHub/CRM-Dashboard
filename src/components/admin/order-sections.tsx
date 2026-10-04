import { ArrowDown, ArrowUp, EyeOff, Trash2 } from "lucide-react";
import * as A from "@/app/admin/actions";
import { CARRIERS, MILESTONE_STATUSES, SHIPMENT_STATUSES } from "@/lib/constants";
import type { getOrderForAdmin } from "@/lib/admin-service";
import { Badge } from "@/components/ui/status-badge";
import { formatDate } from "@/lib/utils";
import { ActionForm, ConfirmButton } from "./action-form";
import { Area, Check, Select, Text } from "./inputs";

type Order = NonNullable<Awaited<ReturnType<typeof getOrderForAdmin>>>;

function Panel({ id, title, hint, children }: { id: string; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="card scroll-mt-4 p-5">
      <h2 id={`${id}-h`} className="text-base font-semibold">{title}</h2>
      {hint && <p className="mt-0.5 text-sm text-slate-500">{hint}</p>}
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

const Visibility = ({ visible }: { visible: boolean }) =>
  visible ? <Badge tone="info">Customer-visible</Badge> : <Badge tone="warning"><EyeOff className="hidden" />Internal only</Badge>;

function DeleteForm({ action, what }: { action: () => Promise<void>; what: string }) {
  return (
    <form action={action}>
      <ConfirmButton message={`Delete this ${what}?`} className="btn-danger px-2.5 py-1.5"><Trash2 className="h-4 w-4" aria-hidden="true" /><span className="sr-only">Delete {what}</span></ConfirmButton>
    </form>
  );
}

/* ───────── Updates & notes ───────── */

export function UpdatesPanel({ o }: { o: Order }) {
  return (
    <Panel id="updates" title="Status updates & notes" hint="Customer-visible updates appear under “Latest Update”. Internal notes are never returned by the public API.">
      <ActionForm action={A.addUpdateAction.bind(null, o.id)} submitLabel="Add update" reset>
        <Text name="title" label="Headline (optional)" />
        <Area name="body" label="Update / note" required rows={3} />
        <Check name="customerVisible" label="Visible to customer" hint="Untick to save as an internal admin-only note." defaultChecked />
      </ActionForm>
      <ul className="divide-y divide-slate-100">
        {o.statusUpdates.map((u) => (
          <li key={u.id} className="flex items-start justify-between gap-3 py-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2"><Visibility visible={u.customerVisible} /><span className="text-xs text-slate-500">{formatDate(u.createdAt)}</span></div>
              {u.title && <p className="mt-1 font-medium">{u.title}</p>}
              <p className="whitespace-pre-line text-sm text-slate-700">{u.body}</p>
            </div>
            <DeleteForm action={A.deleteUpdateAction.bind(null, o.id, u.id)} what="update" />
          </li>
        ))}
      </ul>
    </Panel>
  );
}

/* ───────── Project & milestones ───────── */

const msOptions = Object.entries(MILESTONE_STATUSES);

function MilestoneFields({ m }: { m?: Order["milestones"][number] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Text name="title" label="Title" required className="sm:col-span-2" defaultValue={m?.title} />
      <Select name="status" label="Status" defaultValue={m?.status ?? "PENDING"} options={msOptions} />
      <Text name="progressPercentage" label="Progress (%)" type="number" defaultValue={m?.progressPercentage ?? 0} />
      <Text name="plannedStartDate" label="Planned start" type="date" defaultValue={m?.plannedStartDate} />
      <Text name="plannedCompletionDate" label="Planned completion" type="date" defaultValue={m?.plannedCompletionDate} />
      <Text name="actualCompletionDate" label="Actual completion" type="date" defaultValue={m?.actualCompletionDate} hint="Defaults to today when marked completed." />
      <Area name="description" label="Description" rows={2} defaultValue={m?.description} className="sm:col-span-2" />
      <Area name="customerNotes" label="Notes (customer-visible)" rows={2} defaultValue={m?.customerNotes} />
      <Area name="internalNotes" label="Internal notes" rows={2} defaultValue={m?.internalNotes} />
    </div>
  );
}

export function ProjectPanel({ o }: { o: Order }) {
  const p = o.project;
  return (
    <Panel id="project" title="Project details & milestones">
      <ActionForm action={A.saveProjectAction.bind(null, o.id)} submitLabel={p ? "Save project" : "Add project"}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Text name="name" label="Project name" required defaultValue={p?.name ?? o.title} className="sm:col-span-2" />
          <Text name="startDate" label="Start date" type="date" defaultValue={p?.startDate} />
          <Text name="plannedCompletionDate" label="Planned completion" type="date" defaultValue={p?.plannedCompletionDate} />
          <Area name="description" label="Project description (customer-visible)" defaultValue={p?.description} className="sm:col-span-2" />
        </div>
      </ActionForm>

      <div className="border-t border-slate-100 pt-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-medium">Milestones ({o.milestones.length})</h3>
          {o.milestones.length > 0 && (
            <form action={A.progressFromMilestonesAction.bind(null, o.id)}>
              <button className="btn-secondary px-3 py-1.5" type="submit">Set progress from completed milestones</button>
            </form>
          )}
        </div>
        <ol className="mt-3 space-y-2">
          {o.milestones.map((m, i) => (
            <li key={m.id} className="rounded-lg border border-slate-200">
              <details>
                <summary className="flex cursor-pointer flex-wrap items-center gap-3 p-3">
                  <span className="font-medium">{i + 1}. {m.title}</span>
                  <Badge tone={m.status === "COMPLETED" ? "success" : m.status === "IN_PROGRESS" ? "progress" : m.status === "BLOCKED" ? "warning" : m.status === "CANCELLED" ? "danger" : "neutral"}>
                    {MILESTONE_STATUSES[m.status as keyof typeof MILESTONE_STATUSES] ?? m.status}
                  </Badge>
                </summary>
                <div className="space-y-3 border-t border-slate-100 p-3">
                  <ActionForm action={A.updateMilestoneAction.bind(null, o.id, m.id)} submitLabel="Save milestone"><MilestoneFields m={m} /></ActionForm>
                </div>
              </details>
              <div className="flex gap-2 border-t border-slate-100 p-2">
                <form action={A.moveMilestoneAction.bind(null, o.id, m.id, "up")}><button disabled={i === 0} className="btn-secondary px-2.5 py-1.5" type="submit"><ArrowUp className="h-4 w-4" aria-hidden="true" /><span className="sr-only">Move {m.title} up</span></button></form>
                <form action={A.moveMilestoneAction.bind(null, o.id, m.id, "down")}><button disabled={i === o.milestones.length - 1} className="btn-secondary px-2.5 py-1.5" type="submit"><ArrowDown className="h-4 w-4" aria-hidden="true" /><span className="sr-only">Move {m.title} down</span></button></form>
                <div className="ml-auto"><DeleteForm action={A.deleteMilestoneAction.bind(null, o.id, m.id)} what="milestone" /></div>
              </div>
            </li>
          ))}
        </ol>
        <details className="mt-4 rounded-lg border border-dashed border-slate-300 p-3" open={o.milestones.length === 0}>
          <summary className="cursor-pointer font-medium text-brand-700">Add milestone</summary>
          <div className="mt-3"><ActionForm action={A.addMilestoneAction.bind(null, o.id)} submitLabel="Add milestone" reset><MilestoneFields /></ActionForm></div>
        </details>
      </div>
    </Panel>
  );
}

/* ───────── Items ───────── */

export function ItemsPanel({ o }: { o: Order }) {
  return (
    <Panel id="items" title="Products & services" hint="Supplier cost is internal and never exposed to customers.">
      {o.items.length > 0 && (
        <ul className="divide-y divide-slate-100">
          {o.items.map((it) => (
            <li key={it.id} className="flex items-start justify-between gap-3 py-2.5">
              <div className="min-w-0 text-sm">
                <p className="font-medium">{it.name} <span className="text-slate-500">× {it.quantity}</span></p>
                <p className="text-slate-500">{[it.sku && `SKU ${it.sku}`, it.supplierCost && `cost $${it.supplierCost} (internal)`].filter(Boolean).join(" · ")}</p>
                <Visibility visible={it.customerVisible} />
              </div>
              <DeleteForm action={A.deleteItemAction.bind(null, o.id, it.id)} what="item" />
            </li>
          ))}
        </ul>
      )}
      <ActionForm action={A.addItemAction.bind(null, o.id)} submitLabel="Add item" reset>
        <div className="grid gap-3 sm:grid-cols-4">
          <Text name="name" label="Item" required className="sm:col-span-2" />
          <Text name="sku" label="SKU" />
          <Text name="quantity" label="Quantity" type="number" defaultValue={1} required />
          <Text name="description" label="Description" className="sm:col-span-2" />
          <Text name="supplierCost" label="Supplier cost (internal)" type="number" step="0.01" />
          <Check name="customerVisible" label="Show to customer" defaultChecked className="self-end pb-2" />
        </div>
      </ActionForm>
    </Panel>
  );
}

/* ───────── Shipments ───────── */

function ShipmentFields({ s }: { s?: Order["shipments"][number] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Select name="carrier" label="Carrier" defaultValue={s?.carrier ?? "UPS"} options={Object.entries(CARRIERS)} />
      <Text name="carrierName" label="Carrier name (if “Other”)" defaultValue={s?.carrierName} />
      <Text name="trackingNumber" label="Tracking number" defaultValue={s?.trackingNumber} />
      <Select name="status" label="Status" defaultValue={s?.status ?? "PREPARING"} options={Object.entries(SHIPMENT_STATUSES)} />
      <Text name="shipDate" label="Ship date" type="date" defaultValue={s?.shipDate} />
      <Text name="estimatedDeliveryDate" label="Estimated delivery" type="date" defaultValue={s?.estimatedDeliveryDate} />
      <Text name="actualDeliveryDate" label="Actual delivery" type="date" defaultValue={s?.actualDeliveryDate} />
      <Text name="trackingUrl" label="Tracking URL" type="url" defaultValue={s?.trackingUrl} hint="Leave blank to auto-generate for UPS, FedEx, USPS and DHL." />
      <Area name="customerNotes" label="Notes (customer-visible)" rows={2} defaultValue={s?.customerNotes} />
      <Area name="internalNotes" label="Internal notes" rows={2} defaultValue={s?.internalNotes} />
    </div>
  );
}

export function ShipmentsPanel({ o }: { o: Order }) {
  return (
    <Panel id="shipments" title={`Shipments (${o.shipments.length})`}>
      {o.shipments.map((s) => (
        <details key={s.id} className="rounded-lg border border-slate-200">
          <summary className="flex cursor-pointer flex-wrap items-center gap-3 p-3">
            <span className="font-medium">{CARRIERS[s.carrier as keyof typeof CARRIERS] ?? s.carrier}</span>
            <span className="font-mono text-sm text-slate-600">{s.trackingNumber}</span>
            <Badge tone={s.status === "DELIVERED" ? "success" : "progress"}>{SHIPMENT_STATUSES[s.status as keyof typeof SHIPMENT_STATUSES] ?? s.status}</Badge>
          </summary>
          <div className="space-y-3 border-t border-slate-100 p-3">
            <ActionForm action={A.updateShipmentAction.bind(null, o.id, s.id)} submitLabel="Save shipment" secondary={null}><ShipmentFields s={s} /></ActionForm>
            <DeleteForm action={A.deleteShipmentAction.bind(null, o.id, s.id)} what="shipment" />
          </div>
        </details>
      ))}
      <details className="rounded-lg border border-dashed border-slate-300 p-3" open={o.shipments.length === 0}>
        <summary className="cursor-pointer font-medium text-brand-700">Add shipment</summary>
        <div className="mt-3"><ActionForm action={A.addShipmentAction.bind(null, o.id)} submitLabel="Add shipment" reset><ShipmentFields /></ActionForm></div>
      </details>
    </Panel>
  );
}

/* ───────── Timeline ───────── */

export function TimelinePanel({ o }: { o: Order }) {
  return (
    <Panel id="timeline" title="Activity timeline" hint="Status changes, completed milestones and new shipments are added automatically.">
      <ActionForm action={A.addTimelineAction.bind(null, o.id)} submitLabel="Add event" reset>
        <div className="grid gap-3 sm:grid-cols-2">
          <Text name="title" label="Event" required className="sm:col-span-2" />
          <Text name="eventDate" label="Date" type="date" hint="Defaults to now." />
          <Check name="customerVisible" label="Visible to customer" defaultChecked className="self-end pb-2" />
          <Area name="description" label="Details" rows={2} className="sm:col-span-2" />
        </div>
      </ActionForm>
      <ul className="divide-y divide-slate-100">
        {o.timelineEvents.map((e) => (
          <li key={e.id} className="flex items-start justify-between gap-3 py-2.5">
            <div className="min-w-0 text-sm">
              <div className="flex flex-wrap items-center gap-2"><Visibility visible={e.customerVisible} /><span className="text-xs text-slate-500">{formatDate(e.eventDate)}</span></div>
              <p className="mt-0.5 font-medium">{e.title}</p>
              {e.description && <p className="text-slate-600">{e.description}</p>}
            </div>
            <DeleteForm action={A.deleteTimelineAction.bind(null, o.id, e.id)} what="event" />
          </li>
        ))}
      </ul>
    </Panel>
  );
}
