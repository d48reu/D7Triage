import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f7f4ee] px-6 py-10 text-slate-900">
      <div className="mx-auto flex max-w-5xl flex-col gap-12">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-teal-700">
              District 7 AI Lab
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
              Issue Reporter
            </h1>
          </div>
          <nav className="flex gap-3 text-sm font-medium">
            <Link
              href="/report"
              className="rounded-md bg-slate-900 px-4 py-2 text-white"
            >
              Report Issue
            </Link>
            <Link
              href="/staff"
              className="rounded-md border border-slate-300 px-4 py-2 text-slate-700"
            >
              Staff
            </Link>
          </nav>
        </header>

        <section className="grid gap-8 md:grid-cols-[1.2fr_0.8fr]">
          <div>
            <h2 className="text-2xl font-semibold">
              A constituent issue concierge, not another black box.
            </h2>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-700">
              Residents will be able to describe a problem, attach a photo, and
              get a private tracking link. Staff will see AI-assisted routing
              suggestions, approve next steps, and keep follow-up moving.
            </p>
          </div>

          <div className="rounded-md border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-base font-semibold">MVP Defaults</h3>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-700">
              <li>Public web intake plus email updates</li>
              <li>No resident account required</li>
              <li>Staff approval for routing and responses</li>
              <li>Manual referrals tracked in the app first</li>
            </ul>
          </div>
        </section>
      </div>
    </main>
  );
}
