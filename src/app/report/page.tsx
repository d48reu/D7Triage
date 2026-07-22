import { DemoSiteNotice } from "@/components/demo-site-notice";
import Link from "next/link";
import { ReportForm } from "@/components/report-form";
import { isDemoMode } from "@/lib/demo-mode";

export const runtime = "nodejs";

export default function ReportPage() {
  const demoMode = isDemoMode();

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4">
          <div>
            <Link href="/" className="text-sm font-medium text-sky-700">
              District 7 Issue Reporter
            </Link>
            <h1 className="mt-1 text-xl font-semibold">New case intake</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/staff"
              className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Command Center
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-5 px-5 py-6 lg:grid-cols-[320px_1fr]">
        <aside className="space-y-4 text-sm leading-6 text-slate-600">
          {demoMode ? (
            <div className="mb-4">
              <DemoSiteNotice body="This hosted demo keeps the AI routing and staff views live, but new public submissions are not retained after you test the flow." />
            </div>
          ) : null}
          <div className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-slate-900">Intake board</h2>
            <div className="mt-4 space-y-2">
              <BoardFact label="Status" value="Received" tone="neutral" />
              <BoardFact label="Owner" value="District 7 triage" tone="sky" />
              <BoardFact label="Source" value="Front desk / public" tone="neutral" />
              <BoardFact label="Photos" value="Optional" tone="neutral" />
            </div>
          </div>

          <div className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-slate-900">Required columns</h2>
            <div className="mt-4 space-y-2 text-sm">
              <RequiredColumn label="Category" />
              <RequiredColumn label="Description" />
              <RequiredColumn label="Location" />
              <RequiredColumn label="Email" />
            </div>
          </div>

          <div className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-slate-900">Urgent issues</h2>
            <p className="mt-3">
              If there is an immediate danger, call emergency services (911) or
              the appropriate urgent utility line. This form is for routing and
              follow-up by District 7 staff.
            </p>
          </div>
        </aside>

        <ReportForm demoMode={demoMode} />
      </div>
    </main>
  );
}

function BoardFact({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "neutral" | "sky";
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
      <span className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
        {label}
      </span>
      <span
        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
          tone === "sky" ? "bg-sky-100 text-sky-900" : "bg-white text-slate-800"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function RequiredColumn({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
      <span className="font-medium text-slate-800">{label}</span>
      <span className="rounded-full bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-800">
        Required
      </span>
    </div>
  );
}
