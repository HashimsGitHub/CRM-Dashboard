import { Package } from "lucide-react";

export function Logo({ name }: { name: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-slate-900">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white" aria-hidden="true"><Package className="h-4.5 w-4.5" /></span>
      <span className="text-base font-semibold tracking-tight">{name}</span>
    </span>
  );
}
