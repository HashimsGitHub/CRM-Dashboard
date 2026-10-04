import { SearchX, Timer } from "lucide-react";
import Link from "next/link";
import { LookupForm } from "./lookup-form";

export function OrderNotFound() {
  return (
    <main id="main" className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-10">
      <div className="text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500" aria-hidden="true"><SearchX className="h-6 w-6" /></span>
        <h1 className="mt-4 text-xl font-bold">We couldn&apos;t find an order matching that tracking number.</h1>
        <p className="mt-2 text-slate-600">Please check the number and try again.</p>
      </div>
      <div className="card mt-6 p-5"><LookupForm /></div>
      <Link href="/" className="mt-4 text-center text-sm text-slate-500 hover:underline">Back to home</Link>
    </main>
  );
}

export function TooManyRequests() {
  return (
    <main id="main" className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-4 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-700" aria-hidden="true"><Timer className="h-6 w-6" /></span>
      <h1 className="mt-4 text-xl font-bold">Too many requests</h1>
      <p className="mt-2 text-slate-600">Please wait a minute and try again.</p>
    </main>
  );
}
