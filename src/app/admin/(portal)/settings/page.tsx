import type { Metadata } from "next";
import { saveSettingsAction } from "@/app/admin/actions";
import { ActionForm } from "@/components/admin/action-form";
import { Area, Text } from "@/components/admin/inputs";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const s = await getSettings();
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold">Settings</h1>
      <p className="text-sm text-slate-600">Shown to customers in the “Need Help?” section and header.</p>
      <div className="card p-5">
        <ActionForm action={saveSettingsAction}>
          <div className="grid gap-3">
            <Text name="companyName" label="Company name" required defaultValue={s.companyName} />
            <Text name="supportEmail" label="Support email" type="email" defaultValue={s.supportEmail} />
            <Text name="supportPhone" label="Support phone" type="tel" defaultValue={s.supportPhone} />
            <Text name="supportHours" label="Support hours" defaultValue={s.supportHours} />
            <Area name="supportMessage" label="Message" defaultValue={s.supportMessage} />
          </div>
        </ActionForm>
      </div>
    </div>
  );
}
