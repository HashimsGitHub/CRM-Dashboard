import { cn } from "@/lib/utils";

export function Section({ title, icon, children, className, id }: { title: string; icon?: React.ReactNode; children: React.ReactNode; className?: string; id?: string }) {
  const headingId = id ? `${id}-heading` : undefined;
  return (
    <section id={id} aria-labelledby={headingId} className={cn("card p-5 sm:p-6", className)}>
      <h2 id={headingId} className="mb-4 flex items-center gap-2 text-base font-semibold text-slate-900">
        {icon && <span className="text-slate-400" aria-hidden="true">{icon}</span>}
        {title}
      </h2>
      {children}
    </section>
  );
}

export function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-slate-900 break-words">{children}</dd>
    </div>
  );
}
