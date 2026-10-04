import { NextResponse } from "next/server";
import { getPublicOrder } from "@/lib/public-order";
import { clientIp, hit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const NOT_FOUND = { error: "Order not found" };

export async function GET(req: Request, ctx: { params: Promise<{ trackingNumber: string }> }) {
  const limit = hit(`lookup:${clientIp(req.headers)}`, 30, 60_000);
  if (!limit.allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } });
  }
  try {
    const { trackingNumber } = await ctx.params;
    const order = await getPublicOrder(trackingNumber);
    if (!order) return NextResponse.json(NOT_FOUND, { status: 404 });
    return NextResponse.json({ order });
  } catch (e) {
    console.error("track lookup failed", e instanceof Error ? e.name : "unknown");
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
