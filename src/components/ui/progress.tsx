import { cn } from "@/lib/utils";

export function ProgressBar({ value, label, className, tone = "bg-brand-600" }: { value: number; label: string; className?: string; tone?: string }) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div
      role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={v}
      className={cn("h-2.5 w-full overflow-hidden rounded-full bg-slate-200", className)}
    >
      <div className={cn("h-full rounded-full transition-[width] duration-500", tone)} style={{ width: `${v}%` }} />
    </div>
  );
}

export function ProgressRing({ value, size = 120, complete = false }: { value: number; size?: number; complete?: boolean }) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={`${v}% complete`}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-slate-200" />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - v / 100)}
          className={cn("transition-[stroke-dashoffset] duration-700", complete ? "stroke-emerald-600" : "stroke-brand-600")}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold tabular-nums text-slate-900">{v}%</span>
        <span className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Complete</span>
      </div>
    </div>
  );
}
