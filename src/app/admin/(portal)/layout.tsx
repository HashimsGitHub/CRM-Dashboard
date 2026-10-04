import Link from "next/link";
import { LogOut } from "lucide-react";
import { logoutAction } from "@/app/admin/actions";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

const NAV = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/orders/new", label: "New order" },
  { href: "/admin/fields", label: "Custom fields" },
  { href: "/admin/settings", label: "Settings" },
];

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin(); // server-side gate for every page in this group
  return (
    <div className="min-h-dvh">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 sm:px-6">
          <Link href="/admin" className="font-semibold">Order Admin</Link>
          <nav aria-label="Administration" className="flex flex-1 flex-wrap gap-1 text-sm">
            {NAV.map((n) => <Link key={n.href} href={n.href} className="rounded-md px-3 py-1.5 font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900">{n.label}</Link>)}
          </nav>
          <form action={logoutAction} className="flex items-center gap-3 text-sm text-slate-500">
            <span>{admin.username}</span>
            <button type="submit" className="btn-secondary px-3 py-1.5"><LogOut className="h-4 w-4" aria-hidden="true" />Log out</button>
          </form>
        </div>
      </header>
      <main id="main" className="mx-auto max-w-7xl px-4 py-6 sm:px-6">{children}</main>
    </div>
  );
}
