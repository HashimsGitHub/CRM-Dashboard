import { createFieldAction, updateFieldAction } from "@/app/admin/actions";
import { FIELD_SECTIONS, FIELD_TYPES } from "@/lib/constants";
import type { listFieldDefinitions } from "@/lib/admin-service";
import { ActionForm } from "./action-form";
import { Check, Select, Text, Area } from "./inputs";

type Def = Awaited<ReturnType<typeof listFieldDefinitions>>[number];

export function FieldForm({ def }: { def?: Def }) {
  const action = def ? updateFieldAction.bind(null, def.id) : createFieldAction;
  return (
    <ActionForm action={action} submitLabel={def ? "Save field" : "Add custom field"} reset={!def}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Text name="label" label="Field label" required defaultValue={def?.label} placeholder="Assigned Engineer" />
        <div>
          <label htmlFor={`dataType${def?.id ?? ""}`} className="label">Field type</label>
          <select id={`dataType${def?.id ?? ""}`} name="dataType" defaultValue={def?.dataType ?? "TEXT"} disabled={!!def} className="field">
            {Object.entries(FIELD_TYPES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
          {def && <><input type="hidden" name="dataType" value={def.dataType} /><p className="mt-1 text-xs text-slate-500">Type can’t change once created.</p></>}
        </div>
        <Select name="section" label="Section" defaultValue={def?.section ?? "additional"} options={Object.entries(FIELD_SECTIONS)} />
        <Text name="displayOrder" label="Display order" type="number" defaultValue={def?.displayOrder ?? 0} />
        {(!def || def.dataType === "SELECT") && (
          <Area name="options" label="Dropdown options" rows={2} defaultValue={def?.options?.join("\n")} className="sm:col-span-2" hint="One per line. Only used for the Dropdown type." />
        )}
        <div className="flex flex-wrap gap-x-6 gap-y-2 sm:col-span-2">
          <Check name="customerVisible" label="Show to customer" defaultChecked={def?.customerVisible ?? false} />
          <Check name="required" label="Required" defaultChecked={def?.required ?? false} />
          <Check name="isActive" label="Active" defaultChecked={def?.isActive ?? true} />
        </div>
      </div>
    </ActionForm>
  );
}
