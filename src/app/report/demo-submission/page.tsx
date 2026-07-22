import Link from "next/link";
import { redirect } from "next/navigation";
import { DEMO_REPORTS } from "@/demo-data/demo-seed";
import { isDemoMode } from "@/lib/demo-mode";

export const runtime = "nodejs";

export default function DemoSubmissionPage() {
  if (!isDemoMode()) {
    redirect("/report");
  }

  const sampleTrackingToken =
    DEMO_REPORTS.find((report) => report.id === "demo-report-sidewalks-miami")
      ?.publicTrackingToken ?? DEMO_REPORTS[0].publicTrackingToken;

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <div className="mx-auto max-w-3xl px-5 py-12">
        <Link href="/" className="text-sm font-medium text-sky-700">
          District 7 Issue Reporter
        </Link>

        <section className="mt-6 rounded-md border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-semibold">Thanks for testing the demo</h1>
          <p className="mt-3 text-sm leading-6 text-slate-700">
            This hosted version is a stable walkthrough environment, so new public
            submissions are not retained. The public form is still useful for
            showing the intake experience and district preview, and the seeded
            staff command center shows the full routing workflow.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/staff"
              className="rounded-md bg-sky-700 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-800"
            >
              Open Command Center
            </Link>
            <Link
              href={`/report/${sampleTrackingToken}`}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              View Sample Tracking Page
            </Link>
            <Link
              href="/report"
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Back to Report Form
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
