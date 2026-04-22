import Link from "next/link";

export default function ReportPage() {
  return (
    <main className="min-h-screen bg-[#f7f4ee] px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="text-sm text-slate-600 underline">
          Back
        </Link>
        <h1 className="mt-8 text-4xl font-semibold tracking-tight">
          Report an issue
        </h1>
        <p className="mt-4 text-lg leading-8 text-slate-700">
          This placeholder will become the mobile-first constituent intake flow
          for descriptions, locations, photos, and email follow-up.
        </p>
      </div>
    </main>
  );
}
