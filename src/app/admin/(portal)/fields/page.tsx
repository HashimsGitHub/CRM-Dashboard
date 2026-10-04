import type { Metadata } from "next";
import { FieldForm } from "@/components/admin/field-forms";
import { Badge } from "@/components/ui/status-badge";
import { listFieldDefinitions } from "@/lib/admin-service";
import { FIELD_SECTIONS, FIELD_TYPES } from "@/lib/constants";

export const metadata: Metadata = { title: "Custom Fields" };

export default async function FieldsPage() {
  const defs = await listFieldDefinitions();
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Custom fields</h1>
        <p className="text-sm text-slate-600">Add extra data to orders without any code changes. Fields marked “Show to customer” appear in the matching section of the customer dashboard; all others stay internal.</p>
      </div>
      <section className="card p-5" aria-labelledby="add-h">
        <h2 id="add-h" className="mb-4 font-semibold">Add custom field</h2>
        <FieldForm />
      </section>
      <section aria-labelledby="list-h" className="space-y-2">
        <h2 id="list-h" className="font-semibold">Existing fields ({defs.length})</h2>
        {defs.map((d) => (
          <details key={d.id} className="card">
            <summary className="flex cursor-pointer flex-wrap items-center gap-3 p-4">
              <span className="font-medium">{d.label}</span>
              <span className="text-sm text-slate-500">{FIELD_TYPES[d.dataType as keyof typeof FIELD_TYPES]} · {FIELD_SECTIONS[d.section as keyof typeof FIELD_SECTIONS]}</span>
              <Badge tone={d.customerVisible ? "info" : "warning"}>{d.customerVisible ? "Customer-visible" : "Internal"}</Badge>
              {!d.isActive && <Badge tone="neutral">Inactive</Badge>}
            </summary>
            <div className="border-t border-slate-100 p-4"><FieldForm def={d} /></div>
          </details>
        ))}
      </section>
    </div>
  );
}
