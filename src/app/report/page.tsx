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
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-4">
          <div>
            <Link href="/" className="text-sm font-medium text-sky-700">
              District 7 Issue Reporter
            </Link>
            <h1 className="mt-1 text-xl font-semibold">Report an issue</h1>
          </div>
          <Link
            href="/staff"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Staff
          </Link>
        </div>
      </header>

      <div className="mx-auto grid max-w-5xl gap-6 px-5 py-8 lg:grid-cols-[300px_1fr]">
        <aside className="text-sm leading-6 text-slate-600">
          {demoMode ? (
            <div className="mb-4">
              <DemoSiteNotice body="This hosted demo keeps the AI routing and staff views live, but new public submissions are not retained after you test the flow." />
            </div>
          ) : null}
          <div className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-slate-900">Before you submit</h2>
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
