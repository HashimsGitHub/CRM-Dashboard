import { redirect } from "next/navigation";
import { Logo } from "@/components/customer/logo";
import { LookupForm } from "@/components/customer/lookup-form";
import { getSettings } from "@/lib/settings";
import { normalizeTrackingNumber } from "@/lib/tracking";

export const dynamic = "force-dynamic";

export default async function TrackIndex({ searchParams }: { searchParams: Promise<{ n?: string }> }) {
  const { n } = await searchParams;
  const valid = normalizeTrackingNumber(n);
  if (valid) redirect(`/track/${valid}`);
  const site = await getSettings();
  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <Logo name={site.companyName} />
      <h1 className="mt-8 text-2xl font-bold">Find your order</h1>
      <div className="card mt-6 p-5"><LookupForm defaultValue={typeof n === "string" ? n.slice(0, 40) : ""} /></div>
    </div>
  );
}
