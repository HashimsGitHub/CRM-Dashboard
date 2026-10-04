import { CheckCircle2, CircleDashed, Clock, PauseCircle, Truck, XCircle, type LucideIcon } from "lucide-react";
import { statusDef, type Tone } from "@/lib/status";
import { cn } from "@/lib/utils";

const TONE_CLASS: Record<Tone, string> = {
  neutral: "bg-slate-100 text-slate-700 ring-slate-200",
  info: "bg-sky-50 text-sky-800 ring-sky-200",
  progress: "bg-blue-50 text-blue-800 ring-blue-200",
  warning: "bg-amber-50 text-amber-900 ring-amber-200",
  success: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  danger: "bg-red-50 text-red-800 ring-red-200",
};
const TONE_ICON: Record<Tone, LucideIcon> = {
  neutral: CircleDashed, info: Clock, progress: Truck, warning: PauseCircle, success: CheckCircle2, danger: XCircle,
};

export function Badge({ tone, children, className }: { tone: Tone; children: React.ReactNode; className?: string }) {
  const Icon = TONE_ICON[tone];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset", TONE_CLASS[tone], className)}>
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {children}
    </span>
  );
}

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const d = statusDef(status);
  return <Badge tone={d.tone} className={className}>{d.label}</Badge>;
}

const SHIP_TONE: Record<string, Tone> = {
  PREPARING: "info", SHIPPED: "progress", IN_TRANSIT: "progress", OUT_FOR_DELIVERY: "progress",
  DELIVERED: "success", EXCEPTION: "danger", RETURNED: "warning",
};
const SHIP_LABEL: Record<string, string> = {
  PREPARING: "Preparing", SHIPPED: "Shipped", IN_TRANSIT: "In transit", OUT_FOR_DELIVERY: "Out for delivery",
  DELIVERED: "Delivered", EXCEPTION: "Delivery exception", RETURNED: "Returned",
};
export const ShipmentBadge = ({ status }: { status: string }) => <Badge tone={SHIP_TONE[status] ?? "neutral"}>{SHIP_LABEL[status] ?? status}</Badge>;
