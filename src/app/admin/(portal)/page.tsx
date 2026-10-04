import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { OrdersBrowser, type SearchParams } from "@/components/admin/orders-browser";
import { getStats } from "@/lib/admin-service";

export const metadata: Metadata = { title: "Admin Dashboard" };

export default async function AdminHome({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const [stats, sp] = await Promise.all([getStats(), searchParams]);
  const cards = [
    ["Total Orders", stats.total], ["Active Projects", stats.activeProjects], ["Awaiting Shipment", stats.awaitingShipment],
    ["In Transit", stats.inTransit], ["Completed", stats.completed], ["On Hold", stats.onHold],
  ] as const;
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <Link href="/admin/orders/new" className="btn-primary"><Plus className="h-4 w-4" aria-hidden="true" />New order</Link>
      </div>
      <dl className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {cards.map(([label, n]) => (
          <div key={label} className="card p-4">
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
            <dd className="mt-1 text-3xl font-bold tabular-nums">{n}</dd>
          </div>
        ))}
      </dl>
      <OrdersBrowser sp={sp} />
    </div>
  );
}
