import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-700">
              District 7 AI Lab
            </div>
            <h1 className="mt-1 text-xl font-semibold">Issue Reporter</h1>
          </div>
          <nav className="flex items-center gap-2 text-sm font-medium">
            <Link
              href="/report"
              className="rounded-md bg-sky-700 px-4 py-2 text-white hover:bg-sky-800"
            >
              Report Issue
            </Link>
            <Link
              href="/staff"
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-slate-700 hover:bg-slate-50"
            >
              Staff Inbox
            </Link>
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 py-10">
        <section className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <p className="text-sm font-medium text-slate-600">
              Local-first prototype
            </p>
            <h2 className="mt-3 max-w-3xl text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
              Help residents report the problem, then help staff route it
              correctly.
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
              The current build saves reports locally, gives residents a private
              status link, and gives staff a working inbox for triage, notes,
              and status updates.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/report"
                className="rounded-md bg-sky-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-800"
              >
                Start a Report
              </Link>
              <Link
                href="/staff"
                className="rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Open Staff Inbox
              </Link>
            </div>
          </div>

          <div className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">
              MVP Spine
            </h3>
            <div className="mt-4 divide-y divide-slate-200 text-sm">
              {[
                ["Resident intake", "Description, location, contact, category"],
                ["Private tracking", "Status page through an unguessable link"],
                ["Staff review", "Inbox, case detail, notes, status updates"],
                ["Local storage", "SQLite now, Supabase later if needed"],
              ].map(([label, value]) => (
                <div key={label} className="grid grid-cols-[130px_1fr] gap-4 py-3">
                  <div className="font-medium text-slate-900">{label}</div>
                  <div className="text-slate-600">{value}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
