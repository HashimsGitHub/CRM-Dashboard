import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OrderView } from "@/components/customer/order-view";
import { TooManyRequests } from "@/components/customer/states";
import { lookupAllowed } from "@/lib/lookup-guard";
import { getPublicOrder } from "@/lib/public-order";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Order Status" };

export default async function TrackPage({ params }: { params: Promise<{ trackingNumber: string }> }) {
  if (!(await lookupAllowed()).allowed) return <TooManyRequests />;
  const { trackingNumber } = await params;
  const order = await getPublicOrder(trackingNumber);
  if (!order) notFound();
  return <OrderView order={order} />;
}
