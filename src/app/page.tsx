import { Lock } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/customer/logo";
import { LookupForm } from "@/components/customer/lookup-form";
import { Pwa } from "@/components/pwa";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const site = await getSettings();
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto w-full max-w-5xl px-4 py-5 sm:px-6"><Logo name={site.companyName} /></header>
      <main id="main" className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 pb-16">
        <h1 className="text-center text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Track Your Order or Project</h1>
        <p className="mt-3 text-center text-slate-600">
          Enter your order number to view the latest status, shipping information and project progress.
        </p>
        <div className="card mt-8 p-5 sm:p-6"><LookupForm /></div>
        <p className="mt-4 text-center text-sm text-slate-500">
          Your order number was included in your confirmation. Need help? {site.supportEmail}
        </p>
        <Pwa />
      </main>
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-4 text-xs text-slate-500 sm:px-6">
          <span className="inline-flex items-center gap-1.5"><Lock className="h-3.5 w-3.5" aria-hidden="true" />Secure Customer Order Tracking</span>
          <Link href="/admin/login" className="hover:text-slate-700 hover:underline">Administrator Login</Link>
        </div>
      </footer>
    </div>
  );
}
