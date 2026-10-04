import Link from "next/link";
import { Search } from "lucide-react";
import { ProgressBar } from "@/components/ui/progress";
import { StatusBadge } from "@/components/ui/status-badge";
import { ORDER_TYPES } from "@/lib/constants";
import { listOrders, type OrderFilters } from "@/lib/admin-service";
import { ORDER_STATUSES } from "@/lib/status";
import { formatDate } from "@/lib/utils";

export type SearchParams = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export function filtersFrom(sp: SearchParams): OrderFilters {
  const state = one(sp.state);
  return {
    q: one(sp.q), type: one(sp.type), status: one(sp.status), customer: one(sp.customer), from: one(sp.from), to: one(sp.to),
    state: (["active", "completed", "archived", "all"].includes(state) ? state : "active") as OrderFilters["state"],
  };
}

export async function OrdersBrowser({ sp }: { sp: SearchParams }) {
  const f = filtersFrom(sp);
  const rows = await listOrders(f);
  return (
    <section aria-labelledby="orders-h" className="space-y-4">
      <h2 id="orders-h" className="text-lg font-semibold">Orders</h2>
      <form method="get" action="/admin" className="card grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2">
          <label htmlFor="q" className="label">Search</label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" aria-hidden="true" />
            <input id="q" name="q" defaultValue={f.q} placeholder="Order no., customer, company, project or shipment tracking no." className="field" style={{ paddingLeft: "2.25rem" }} />
          </div>
        </div>
        <div>
          <label htmlFor="customer" className="label">Customer</label>
          <input id="customer" name="customer" defaultValue={f.customer} className="field" />
        </div>
        <div>
          <label htmlFor="state" className="label">Show</label>
          <select id="state" name="state" defaultValue={f.state} className="field">
            <option value="active">Active</option><option value="completed">Completed</option>
            <option value="all">All (not archived)</option><option value="archived">Archived</option>
          </select>
        </div>
        <div>
          <label htmlFor="type" className="label">Order type</label>
          <select id="type" name="type" defaultValue={f.type} className="field">
            <option value="">All types</option>
            {Object.entries(ORDER_TYPES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="status" className="label">Status</label>
          <select id="status" name="status" defaultValue={f.status} className="field">
            <option value="">All statuses</option>
            {Object.entries(ORDER_STATUSES).map(([k, d]) => <option key={k} value={k}>{d.label}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="from" className="label">Ordered from</label>
          <input id="from" name="from" type="date" defaultValue={f.from} className="field" />
        </div>
        <div>
          <label htmlFor="to" className="label">Ordered to</label>
          <input id="to" name="to" type="date" defaultValue={f.to} className="field" />
        </div>
        <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-4">
          <button type="submit" className="btn-primary">Apply filters</button>
          <Link href="/admin" className="btn-secondary">Reset</Link>
          <span className="ml-auto text-sm text-slate-500">{rows.length} order{rows.length === 1 ? "" : "s"}</span>
        </div>
      </form>

      {rows.length === 0 ? (
        <div className="card p-8 text-center text-slate-600">No orders match these filters.</div>
      ) : (
        <>
          {/* Table on wide screens, cards on narrow ones */}
          <div className="card hidden overflow-x-auto md:block">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Orders</caption>
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr><th scope="col" className="px-4 py-3">Order</th><th scope="col" className="px-4 py-3">Customer</th><th scope="col" className="px-4 py-3">Type</th><th scope="col" className="px-4 py-3">Status</th><th scope="col" className="px-4 py-3">Progress</th><th scope="col" className="px-4 py-3">Ordered</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <Link href={`/admin/orders/${r.id}`} className="font-medium text-brand-700 hover:underline">{r.title}</Link>
                      <div className="font-mono text-xs text-slate-500">{r.trackingNumber}</div>
                    </td>
                    <td className="px-4 py-3">{r.customerName}<div className="text-xs text-slate-500">{r.company}</div></td>
                    <td className="px-4 py-3">{ORDER_TYPES[r.orderType as keyof typeof ORDER_TYPES] ?? r.orderType}</td>
                    <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                    <td className="w-40 px-4 py-3"><div className="flex items-center gap-2"><ProgressBar value={r.progress} label={`${r.title} progress`} className="h-1.5" /><span className="w-9 text-xs tabular-nums">{r.progress}%</span></div></td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">{formatDate(r.orderDate, "short")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="space-y-3 md:hidden">
            {rows.map((r) => (
              <li key={r.id} className="card p-4">
                <Link href={`/admin/orders/${r.id}`} className="font-semibold text-brand-700">{r.title}</Link>
                <p className="font-mono text-xs text-slate-500">{r.trackingNumber}</p>
                <p className="mt-1 text-sm text-slate-600">{r.customerName}{r.company ? ` · ${r.company}` : ""}</p>
                <div className="mt-2 flex items-center justify-between gap-3"><StatusBadge status={r.status} /><span className="text-sm tabular-nums">{r.progress}%</span></div>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
