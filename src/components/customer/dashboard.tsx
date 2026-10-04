import {
  AlertTriangle, Ban, CalendarClock, Check, CheckCircle2, CircleDot, ClipboardList, ExternalLink, History, LifeBuoy,
  ListChecks, Mail, Megaphone, Package, Phone, Truck, type LucideIcon,
} from "lucide-react";
import { Fact, Section } from "@/components/ui/section";
import { ProgressBar, ProgressRing } from "@/components/ui/progress";
import { ShipmentBadge, StatusBadge } from "@/components/ui/status-badge";
import { ORDER_TYPES } from "@/lib/constants";
import type { PublicOrder } from "@/lib/public-order";
import { statusDef } from "@/lib/status";
import { cn, formatDate } from "@/lib/utils";

type CF = PublicOrder["customFields"][number];

const safeHttp = (u: string | null) => (u && /^https?:\/\//i.test(u) ? u : null);

function FieldValue({ f }: { f: CF }) {
  switch (f.type) {
    case "BOOLEAN": return <>{f.value === "true" ? "Yes" : "No"}</>;
    case "DATE": return <>{formatDate(f.value)}</>;
    case "URL": return safeHttp(f.value) ? <a href={f.value} target="_blank" rel="noopener noreferrer" className="text-brand-700 underline">{f.value}</a> : <>{f.value}</>;
    case "EMAIL": return <a href={`mailto:${f.value}`} className="text-brand-700 underline">{f.value}</a>;
    case "PHONE": return <a href={`tel:${f.value.replace(/[^\d+]/g, "")}`} className="text-brand-700 underline">{f.value}</a>;
    case "LONG_TEXT": return <span className="whitespace-pre-line">{f.value}</span>;
    default: return <>{f.value}</>;
  }
}

function CustomFacts({ fields }: { fields: CF[] }) {
  if (!fields.length) return null;
  return <>{fields.map((f) => <Fact key={f.label} label={f.label}><FieldValue f={f} /></Fact>)}</>;
}

/* ───────── Header ───────── */

export function OrderHeader({ o }: { o: PublicOrder }) {
  const def = statusDef(o.status);
  const done = def.tone === "success";
  const cancelled = o.status === "CANCELLED";
  return (
    <header className={cn("card overflow-hidden", done && "border-emerald-200")}>
      {done && (
        <div className="flex items-center gap-2 bg-emerald-50 px-5 py-2.5 text-sm font-medium text-emerald-800 sm:px-6">
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          {o.status === "DELIVERED" ? "Your order has been delivered." : "This order is complete. Thank you for your business!"}
        </div>
      )}
      <div className="p-5 sm:p-6">
        <p className="text-sm font-medium text-slate-500">
          Order <span className="font-mono text-slate-700">{o.trackingNumber}</span> · {ORDER_TYPES[o.orderType as keyof typeof ORDER_TYPES] ?? o.orderType}
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{o.title}</h1>
        <p className="mt-1 text-sm text-slate-600">{o.company ? `${o.company} · ` : ""}{o.customerName}</p>
        {o.description && <p className="mt-3 max-w-3xl text-sm text-slate-700">{o.description}</p>}

        <dl className="mt-6 grid gap-5 sm:grid-cols-3">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Overall Status</dt>
            <dd className="mt-1.5"><StatusBadge status={o.status} className="px-3 py-1.5 text-sm" /></dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Progress</dt>
            <dd className="mt-1.5">
              <span className="text-2xl font-bold tabular-nums">{o.progress}%</span>
              <ProgressBar value={o.progress} label="Overall progress" className="mt-2" tone={done ? "bg-emerald-600" : cancelled ? "bg-red-400" : "bg-brand-600"} />
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{o.completedDate ? "Completed" : "Estimated Completion"}</dt>
            <dd className="mt-1.5 text-lg font-semibold">{formatDate(o.completedDate ?? o.expectedCompletionDate) || <span className="text-slate-500">To be confirmed</span>}</dd>
          </div>
        </dl>
      </div>
    </header>
  );
}

/* ───────── Latest update ───────── */

export function LatestUpdate({ u }: { u: NonNullable<PublicOrder["latestUpdate"]> }) {
  return (
    <Section title="Latest Update" icon={<Megaphone className="h-4 w-4" />} id="latest" className="border-brand-100 bg-brand-50/40">
      <p className="text-sm font-medium text-slate-500">{formatDate(u.date)}</p>
      {u.title && <p className="mt-1 text-lg font-semibold text-slate-900">{u.title}</p>}
      <p className="mt-2 whitespace-pre-line text-slate-800">{u.body}</p>
    </Section>
  );
}

/* ───────── Project progress + milestones ───────── */

const MS: Record<string, { label: string; icon: LucideIcon; dot: string; text: string }> = {
  COMPLETED: { label: "Completed", icon: Check, dot: "bg-emerald-600 text-white", text: "text-emerald-700" },
  IN_PROGRESS: { label: "In progress", icon: CircleDot, dot: "bg-brand-600 text-white ring-4 ring-brand-100", text: "text-brand-700" },
  PENDING: { label: "Pending", icon: ClipboardList, dot: "bg-white text-slate-400 ring-2 ring-inset ring-slate-300", text: "text-slate-500" },
  BLOCKED: { label: "Blocked", icon: AlertTriangle, dot: "bg-amber-500 text-white", text: "text-amber-700" },
  CANCELLED: { label: "Cancelled", icon: Ban, dot: "bg-slate-400 text-white", text: "text-slate-500" },
};

export function ProjectProgress({ o, fields }: { o: PublicOrder; fields: CF[] }) {
  const done = o.milestones.filter((m) => m.status === "COMPLETED").length;
  const complete = statusDef(o.status).tone === "success";
  return (
    <Section title="Project Progress" icon={<ListChecks className="h-4 w-4" />} id="progress">
      <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
        <ProgressRing value={o.progress} complete={complete} />
        <dl className="grid w-full flex-1 gap-4 sm:grid-cols-2">
          {o.project && <Fact label="Project">{o.project.name}</Fact>}
          {o.currentPhase && <Fact label="Current Phase">{o.currentPhase}</Fact>}
          {o.project?.startDate && <Fact label="Started">{formatDate(o.project.startDate)}</Fact>}
          {o.project?.plannedCompletionDate && <Fact label="Planned Completion">{formatDate(o.project.plannedCompletionDate)}</Fact>}
          {o.milestones.length > 0 && <Fact label="Milestones">{done} of {o.milestones.length} completed</Fact>}
          <CustomFacts fields={fields} />
        </dl>
      </div>
      {o.project?.description && <p className="mt-5 border-t border-slate-100 pt-4 text-sm text-slate-700">{o.project.description}</p>}
    </Section>
  );
}

export function Milestones({ items }: { items: PublicOrder["milestones"] }) {
  return (
    <Section title="Milestones" icon={<ClipboardList className="h-4 w-4" />} id="milestones">
      <ol className="space-y-0">
        {items.map((m, i) => {
          const d = MS[m.status] ?? MS.PENDING;
          const Icon = d.icon;
          const last = i === items.length - 1;
          const date = m.status === "COMPLETED"
            ? m.actualCompletionDate && `Completed ${formatDate(m.actualCompletionDate, "short")}`
            : m.plannedCompletionDate && `Target ${formatDate(m.plannedCompletionDate, "short")}`;
          return (
            <li key={i} className="relative flex gap-4 pb-6 last:pb-0">
              {!last && <span className="absolute left-[15px] top-8 h-[calc(100%-2rem)] w-0.5 bg-slate-200" aria-hidden="true" />}
              <span className={cn("z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full", d.dot)} aria-hidden="true"><Icon className="h-4 w-4" /></span>
              <div className="min-w-0 flex-1 pt-0.5">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                  <h3 className={cn("font-semibold", m.status === "PENDING" || m.status === "CANCELLED" ? "text-slate-600" : "text-slate-900", m.status === "CANCELLED" && "line-through")}>{m.title}</h3>
                  <span className={cn("text-xs font-semibold", d.text)}>{d.label}</span>
                  {date && <span className="text-xs text-slate-500">{date}</span>}
                </div>
                {m.description && <p className="mt-0.5 text-sm text-slate-600">{m.description}</p>}
                {m.status === "IN_PROGRESS" && m.progress > 0 && (
                  <div className="mt-2 flex max-w-xs items-center gap-3">
                    <ProgressBar value={m.progress} label={`${m.title} progress`} className="h-1.5" />
                    <span className="text-xs font-medium tabular-nums text-slate-600">{m.progress}%</span>
                  </div>
                )}
                {m.notes && <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">{m.notes}</p>}
              </div>
            </li>
          );
        })}
      </ol>
    </Section>
  );
}

/* ───────── Shipments ───────── */

export function Shipments({ shipments, fields }: { shipments: PublicOrder["shipments"]; fields: CF[] }) {
  return (
    <Section title="Shipment & Delivery" icon={<Truck className="h-4 w-4" />} id="shipping">
      {shipments.length === 0 ? (
        <p className="text-sm text-slate-600">Shipping information has not yet been assigned.</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {shipments.map((s, i) => {
            const url = safeHttp(s.trackingUrl);
            const delivered = s.status === "DELIVERED";
            return (
              <article key={i} className="rounded-lg border border-slate-200 p-4" aria-label={`Shipment ${i + 1} of ${shipments.length}`}>
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold">{shipments.length > 1 ? `Shipment ${i + 1}` : "Shipment"}</p>
                  <ShipmentBadge status={s.status} />
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-4">
                  <Fact label="Carrier">{s.carrier}</Fact>
                  {s.trackingNumber && <Fact label="Tracking Number"><span className="font-mono">{s.trackingNumber}</span></Fact>}
                  {s.shipDate && <Fact label="Shipped">{formatDate(s.shipDate)}</Fact>}
                  {delivered && s.actualDeliveryDate
                    ? <Fact label="Delivered">{formatDate(s.actualDeliveryDate)}</Fact>
                    : s.estimatedDeliveryDate && <Fact label="Expected Delivery">{formatDate(s.estimatedDeliveryDate)}</Fact>}
                </dl>
                {s.notes && <p className="mt-3 text-sm text-slate-600">{s.notes}</p>}
                {url && (
                  <a href={url} target="_blank" rel="noopener noreferrer" className="btn-secondary mt-4 w-full sm:w-auto">
                    Track Shipment <ExternalLink className="h-4 w-4" aria-hidden="true" /><span className="sr-only">(opens carrier website in a new tab)</span>
                  </a>
                )}
              </article>
            );
          })}
        </div>
      )}
      {fields.length > 0 && <dl className="mt-5 grid gap-4 border-t border-slate-100 pt-4 sm:grid-cols-2"><CustomFacts fields={fields} /></dl>}
    </Section>
  );
}

/* ───────── Items, extras, timeline, help ───────── */

export function Items({ items }: { items: PublicOrder["items"] }) {
  return (
    <Section title="Products & Services" icon={<Package className="h-4 w-4" />} id="items">
      <ul className="divide-y divide-slate-100">
        {items.map((it, i) => (
          <li key={i} className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
            <div className="min-w-0">
              <p className="font-medium text-slate-900">{it.name}</p>
              {it.description && <p className="text-sm text-slate-600">{it.description}</p>}
              {it.sku && <p className="mt-0.5 font-mono text-xs text-slate-500">SKU {it.sku}</p>}
            </div>
            <span className="shrink-0 rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold tabular-nums text-slate-700">
              <span className="sr-only">Quantity </span>× {it.quantity}
            </span>
          </li>
        ))}
      </ul>
    </Section>
  );
}

export function SummaryDetails({ o, fields }: { o: PublicOrder; fields: CF[] }) {
  return (
    <Section title="Order Summary" icon={<CalendarClock className="h-4 w-4" />} id="summary">
      <dl className="grid gap-4 sm:grid-cols-2">
        <Fact label="Tracking Number"><span className="font-mono">{o.trackingNumber}</span></Fact>
        <Fact label="Order Type">{ORDER_TYPES[o.orderType as keyof typeof ORDER_TYPES] ?? o.orderType}</Fact>
        <Fact label="Order Date">{formatDate(o.orderDate)}</Fact>
        {o.expectedCompletionDate && <Fact label="Expected Completion">{formatDate(o.expectedCompletionDate)}</Fact>}
        <CustomFacts fields={fields} />
      </dl>
    </Section>
  );
}

export function AdditionalInfo({ fields }: { fields: CF[] }) {
  return (
    <Section title="Additional Information" id="additional">
      <dl className="grid gap-4 sm:grid-cols-2"><CustomFacts fields={fields} /></dl>
    </Section>
  );
}

export function ActivityTimeline({ events }: { events: PublicOrder["timeline"] }) {
  return (
    <Section title="Activity Timeline" icon={<History className="h-4 w-4" />} id="activity">
      <ol className="space-y-5 border-l-2 border-slate-200 pl-5">
        {events.map((e, i) => (
          <li key={i} className="relative">
            <span className="absolute -left-[27px] top-1.5 h-3 w-3 rounded-full bg-white ring-2 ring-slate-400" aria-hidden="true" />
            <time dateTime={e.date} className="text-xs font-medium uppercase tracking-wide text-slate-500">{formatDate(e.date)}</time>
            <p className="font-medium text-slate-900">{e.title}</p>
            {e.description && <p className="text-sm text-slate-600">{e.description}</p>}
          </li>
        ))}
      </ol>
    </Section>
  );
}

export function HelpFooter({ s }: { s: PublicOrder["support"] }) {
  return (
    <Section title="Need Help?" icon={<LifeBuoy className="h-4 w-4" />} id="help">
      <p className="text-sm text-slate-700">{s.message}</p>
      <div className="mt-3 flex flex-col gap-2 text-sm sm:flex-row sm:flex-wrap sm:gap-x-6">
        <a href={`mailto:${s.email}`} className="inline-flex items-center gap-2 font-medium text-brand-700 hover:underline"><Mail className="h-4 w-4" aria-hidden="true" />{s.email}</a>
        <a href={`tel:${s.phone.replace(/[^\d+]/g, "")}`} className="inline-flex items-center gap-2 font-medium text-brand-700 hover:underline"><Phone className="h-4 w-4" aria-hidden="true" />{s.phone}</a>
        <span className="text-slate-500">{s.hours}</span>
      </div>
    </Section>
  );
}
