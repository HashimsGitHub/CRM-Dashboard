"use client";

import { useActionState, useEffect, useRef } from "react";
import type { FormState } from "@/app/admin/actions";
import { cn } from "@/lib/utils";

/** <form> wired to a server action; shows errors/success and resets after success when `reset` is set. */
export function ActionForm({
  action, children, submitLabel = "Save", reset = false, className, secondary,
}: {
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  children: React.ReactNode;
  submitLabel?: string;
  reset?: boolean;
  className?: string;
  secondary?: React.ReactNode;
}) {
  const [state, formAction, pending] = useActionState(action, {} as FormState);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok && reset) ref.current?.reset();
  }, [state.nonce, state.ok, reset]);
  return (
    <form ref={ref} action={formAction} className={cn("space-y-4", className)}>
      {children}
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className="btn-primary">{pending ? "Saving…" : submitLabel}</button>
        {secondary}
        <p role="status" aria-live="polite" className="text-sm">
          {state.error && <span className="text-red-700">{state.error}</span>}
          {state.ok && !state.error && <span className="text-emerald-700">Saved ✓</span>}
        </p>
      </div>
    </form>
  );
}

export function ConfirmButton({ children, message, className }: { children: React.ReactNode; message: string; className?: string }) {
  return (
    <button type="submit" className={className ?? "btn-danger"} onClick={(e) => { if (!confirm(message)) e.preventDefault(); }}>
      {children}
    </button>
  );
}
