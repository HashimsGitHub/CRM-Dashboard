import { saveOrderAction } from "@/app/admin/actions";
import { ORDER_TYPES } from "@/lib/constants";
import { FIELD_SECTIONS } from "@/lib/constants";
import { ORDER_STATUSES } from "@/lib/status";
import type { listFieldDefinitions } from "@/lib/admin-service";
import { ActionForm } from "./action-form";
import { Area, Select, Text } from "./inputs";

type Def = Awaited<ReturnType<typeof listFieldDefinitions>>[number];

export interface OrderFormValues {
  customerName?: string; company?: string | null; email?: string | null; phone?: string | null;
  orderType?: string; title?: string; description?: string | null; overallStatus?: string; progressPercentage?: number;
  currentPhase?: string | null; orderDate?: string; expectedCompletionDate?: string | null; completedDate?: string | null; internalNotes?: string | null;
}

function CustomInput({ def, value }: { def: Def; value?: string }) {
  const name = `cf_${def.id}`;
  const label = `${def.label}${def.customerVisible ? "" : " (internal)"}`;
  const common = { name, label, defaultValue: value ?? "" };
  switch (def.dataType) {
    case "LONG_TEXT": return <Area {...common} className="sm:col-span-2" />;
    case "NUMBER": return <Text {...common} type="number" step="any" />;
    case "DATE": return <Text {...common} type="date" />;
    case "URL": return <Text {...common} type="url" placeholder="https://" />;
    case "EMAIL": return <Text {...common} type="email" />;
    case "PHONE": return <Text {...common} type="tel" />;
    case "BOOLEAN": return <Select {...common} blank="—" options={[["true", "Yes"], ["false", "No"]]} />;
    case "SELECT": return <Select {...common} blank="—" options={(def.options ?? []).map((o) => [o, o] as [string, string])} />;
    default: return <Text {...common} />;
  }
}

export function OrderForm({ orderId, v = {}, defs, customValues = {} }: {
  orderId: string | null; v?: OrderFormValues; defs: Def[]; customValues?: Record<string, string>;
}) {
  const active = defs.filter((d) => d.isActive);
  const sections = (Object.keys(FIELD_SECTIONS) as (keyof typeof FIELD_SECTIONS)[])
    .map((s) => [s, active.filter((d) => d.section === s)] as const).filter(([, l]) => l.length);
  return (
    <ActionForm action={saveOrderAction.bind(null, orderId)} submitLabel={orderId ? "Save order" : "Create order"}>
      <fieldset className="card grid gap-4 p-5 sm:grid-cols-2">
        <legend className="sr-only">Customer</legend>
        <h2 className="text-base font-semibold sm:col-span-2">Customer</h2>
        <Text name="customerName" label="Customer name" required defaultValue={v.customerName} />
        <Text name="company" label="Company" defaultValue={v.company} />
        <Text name="email" label="Email" type="email" defaultValue={v.email} />
        <Text name="phone" label="Phone" type="tel" defaultValue={v.phone} />
      </fieldset>

      <fieldset className="card grid gap-4 p-5 sm:grid-cols-2">
        <legend className="sr-only">Order</legend>
        <h2 className="text-base font-semibold sm:col-span-2">Order</h2>
        <Text name="title" label="Order / project title" required className="sm:col-span-2" defaultValue={v.title} />
        <Select name="orderType" label="Order type" defaultValue={v.orderType ?? "HARDWARE"} options={Object.entries(ORDER_TYPES)} />
        <Select name="overallStatus" label="Overall status" defaultValue={v.overallStatus ?? "ORDER_RECEIVED"} options={Object.entries(ORDER_STATUSES).map(([k, d]) => [k, d.label])} />
        <Text name="progressPercentage" label="Progress (%)" type="number" required defaultValue={v.progressPercentage ?? 0} />
        <Text name="currentPhase" label="Current phase" defaultValue={v.currentPhase} hint="Shown to the customer, e.g. “On-site installation”." />
        <Text name="orderDate" label="Order date" type="date" required defaultValue={v.orderDate ?? new Date().toISOString().slice(0, 10)} />
        <Text name="expectedCompletionDate" label="Expected completion" type="date" defaultValue={v.expectedCompletionDate} />
        <Text name="completedDate" label="Completed date" type="date" defaultValue={v.completedDate} />
        <Area name="description" label="Description (customer-visible)" className="sm:col-span-2" defaultValue={v.description} />
        <Area name="internalNotes" label="Internal notes (never shown to customers)" className="sm:col-span-2" defaultValue={v.internalNotes} />
      </fieldset>

      {sections.map(([s, list]) => (
        <fieldset key={s} className="card grid gap-4 p-5 sm:grid-cols-2">
          <legend className="sr-only">{FIELD_SECTIONS[s]}</legend>
          <h2 className="text-base font-semibold sm:col-span-2">{FIELD_SECTIONS[s]} <span className="text-sm font-normal text-slate-500">· custom fields</span></h2>
          {list.map((d) => <CustomInput key={d.id} def={d} value={customValues[d.id]} />)}
        </fieldset>
      ))}
    </ActionForm>
  );
}
