import Link from "next/link";
import { ROUTING_RULES } from "@/lib/routing-matrix";

export default function RoutingGuidePage() {
  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4">
          <div>
            <Link href="/staff" className="text-sm font-medium text-sky-700">
              Staff inbox
            </Link>
            <h1 className="mt-1 text-xl font-semibold">Routing guide</h1>
          </div>
          <Link
            href="/report"
            className="rounded-md bg-sky-700 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-800"
          >
            New Report
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-6">
        <section className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
          <div className="grid grid-cols-[190px_230px_1fr] border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500 max-lg:hidden">
            <div>Category</div>
            <div>Likely owner</div>
            <div>Staff guidance</div>
          </div>

          <div className="divide-y divide-slate-200">
            {ROUTING_RULES.map((rule) => (
              <article
                key={rule.category}
                className="grid gap-3 px-4 py-4 lg:grid-cols-[190px_230px_1fr]"
              >
                <div className="font-medium text-slate-950">{rule.category}</div>
                <div className="text-sm text-slate-700">
                  {rule.likelyResponsibleParty}
                </div>
                <div className="space-y-2 text-sm leading-6 text-slate-600">
                  <p>{rule.staffGuidance}</p>
                  <p className="text-slate-500">{rule.escalationNotes}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
