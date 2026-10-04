import { redirect } from "next/navigation";
import type { SearchParams } from "@/components/admin/orders-browser";

// The order list lives on the dashboard; keep /admin/orders working with the same filters.
export default async function OrdersIndex({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) if (typeof v === "string") qs.set(k, v);
  redirect(qs.size ? `/admin?${qs}` : "/admin");
}
