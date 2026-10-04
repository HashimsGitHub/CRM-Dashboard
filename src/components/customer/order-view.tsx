import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { PublicOrder } from "@/lib/public-order";
import { Logo } from "./logo";
import {
  ActivityTimeline, AdditionalInfo, HelpFooter, Items, LatestUpdate, Milestones, OrderHeader, ProjectProgress, Shipments, SummaryDetails,
} from "./dashboard";

/** Sections render only when the order has data for them. */
export function OrderView({ order: o }: { order: PublicOrder }) {
  const bySection = (s: string) => o.customFields.filter((f) => f.section === s);
  const showProject = !!o.project || o.milestones.length > 0 || ["SERVICE", "SOFTWARE", "TURNKEY"].includes(o.orderType);
  const showShipping = o.shipments.length > 0 || ["HARDWARE", "TURNKEY"].includes(o.orderType);
  const orderFields = bySection("order");
  const additional = bySection("additional");

  return (
    <div className="min-h-dvh">
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          <Logo name={o.support.companyName} />
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />Track another order
          </Link>
        </div>
      </div>
      <main id="main" className="mx-auto max-w-5xl space-y-5 px-4 py-6 sm:px-6 sm:py-8">
        <OrderHeader o={o} />
        {o.latestUpdate && <LatestUpdate u={o.latestUpdate} />}
        {showProject && <ProjectProgress o={o} fields={bySection("project")} />}
        {o.milestones.length > 0 && <Milestones items={o.milestones} />}
        {showShipping && <Shipments shipments={o.shipments} fields={bySection("shipping")} />}
        {o.items.length > 0 && <Items items={o.items} />}
        <SummaryDetails o={o} fields={orderFields} />
        {additional.length > 0 && <AdditionalInfo fields={additional} />}
        {o.timeline.length > 0 && <ActivityTimeline events={o.timeline} />}
        <HelpFooter s={o.support} />
      </main>
    </div>
  );
}
