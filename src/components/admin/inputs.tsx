import { useId } from "react";
import { cn } from "@/lib/utils";

interface Base { name: string; label: string; hint?: string; className?: string }

export function Text({ name, label, hint, className, defaultValue, type = "text", required, placeholder, maxLength, step }: Base & {
  defaultValue?: string | number | null; type?: string; required?: boolean; placeholder?: string; maxLength?: number; step?: string;
}) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="label">{label}{required && <span className="text-red-600"> *</span>}</label>
      <input id={id} name={name} type={type} defaultValue={defaultValue ?? ""} required={required} placeholder={placeholder} maxLength={maxLength} step={step} className="field" />
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

export function Area({ name, label, hint, className, defaultValue, rows = 3, required }: Base & { defaultValue?: string | null; rows?: number; required?: boolean }) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="label">{label}{required && <span className="text-red-600"> *</span>}</label>
      <textarea id={id} name={name} rows={rows} defaultValue={defaultValue ?? ""} required={required} className="field" />
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

export function Select({ name, label, hint, className, defaultValue, options, blank }: Base & {
  defaultValue?: string | null; options: [string, string][]; blank?: string;
}) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="label">{label}</label>
      <select id={id} name={name} defaultValue={defaultValue ?? ""} className="field">
        {blank !== undefined && <option value="">{blank}</option>}
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

export function Check({ name, label, defaultChecked, className, hint }: Base & { defaultChecked?: boolean }) {
  const id = useId();
  return (
    <div className={cn("flex items-start gap-2", className)}>
      <input id={id} name={name} type="checkbox" defaultChecked={defaultChecked} className="mt-0.5 h-4 w-4 rounded border-slate-300" />
      <label htmlFor={id} className="text-sm text-slate-700">{label}{hint && <span className="block text-xs text-slate-500">{hint}</span>}</label>
    </div>
  );
}
