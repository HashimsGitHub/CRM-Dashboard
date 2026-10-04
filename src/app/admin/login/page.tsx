import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { LoginForm } from "@/components/admin/login-form";
import { getAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "Administrator Login" };
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await getAdmin()) redirect("/admin");
  return (
    <main id="main" className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-4">
      <div className="mb-6 text-center">
        <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 text-white" aria-hidden="true"><ShieldCheck className="h-5 w-5" /></span>
        <h1 className="mt-3 text-xl font-bold">Administrator Login</h1>
      </div>
      <div className="card p-5"><LoginForm /></div>
    </main>
  );
}
