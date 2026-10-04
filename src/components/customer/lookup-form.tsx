"use client";

import { Search } from "lucide-react";
import { useActionState } from "react";
import { lookupAction, type LookupState } from "@/app/actions";

export function LookupForm({ defaultValue = "" }: { defaultValue?: string }) {
  const [state, action, pending] = useActionState<LookupState, FormData>(lookupAction, {});
  return (
    <form action={action} className="w-full space-y-3" noValidate>
      <div>
        <label htmlFor="trackingNumber" className="label">Order Tracking Number</label>
        <input
          id="trackingNumber" name="trackingNumber" defaultValue={defaultValue} placeholder="ORD-26-A7K9-2MQ4"
          autoComplete="off" autoCapitalize="characters" spellCheck={false} required maxLength={40}
          aria-invalid={!!state.error} aria-describedby={state.error ? "lookup-error" : undefined}
          className="field h-12 text-base tracking-wide"
        />
        {state.error && <p id="lookup-error" role="alert" className="mt-2 text-sm text-red-700">{state.error}</p>}
      </div>
      <button type="submit" disabled={pending} className="btn-primary h-12 w-full text-base">
        <Search className="h-4 w-4" aria-hidden="true" />
        {pending ? "Looking up…" : "View Status"}
      </button>
    </form>
  );
}
