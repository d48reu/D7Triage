import Link from "next/link";
import { ISSUE_CATEGORIES } from "@/lib/issue-types";
import { submitIssueReportAction } from "@/server-actions/issues";

export const runtime = "nodejs";

export default function ReportPage() {
  return (
    <main className="min-h-screen bg-[#f7f4ee] px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="text-sm text-slate-600 underline">
          Back
        </Link>

        <div className="mt-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-teal-700">
            Constituent intake
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight">
            Report an issue
          </h1>
          <p className="mt-4 text-lg leading-8 text-slate-700">
            Tell us what happened and where. For this local MVP, your report
            saves to a local SQLite database and appears in the staff inbox.
          </p>
        </div>

        <form
          action={submitIssueReportAction}
          className="mt-8 space-y-5 rounded-md border border-slate-200 bg-white p-6 shadow-sm"
        >
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">
              What kind of issue is this?
            </span>
            <select
              name="category"
              required
              defaultValue="Other / unsure"
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-teal-600"
            >
              {ISSUE_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">
              Describe the issue
            </span>
            <textarea
              name="description"
              required
              minLength={12}
              className="min-h-36 w-full rounded-md border border-slate-300 bg-white px-3 py-3 text-sm leading-6 outline-none focus:border-teal-600"
              placeholder="Example: There is a large pothole near the school entrance and cars are swerving around it."
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">
              Location or address
            </span>
            <input
              name="addressText"
              required
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-teal-600"
              placeholder="Street address, intersection, park, or landmark"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">
                Name
              </span>
              <input
                name="residentName"
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-teal-600"
                placeholder="Optional"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">
                Email
              </span>
              <input
                name="residentEmail"
                type="email"
                required
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-teal-600"
                placeholder="you@example.com"
              />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">
                Phone
              </span>
              <input
                name="residentPhone"
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-teal-600"
                placeholder="Optional"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">
                Preferred language
              </span>
              <input
                name="preferredLanguage"
                defaultValue="English"
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-teal-600"
              />
            </label>
          </div>

          <label className="flex gap-3 rounded-md bg-slate-50 p-4 text-sm leading-6 text-slate-700">
            <input
              name="contactConsent"
              type="checkbox"
              required
              defaultChecked
              className="mt-1"
            />
            <span>
              I agree to receive email updates about this report. This local MVP
              uses email as the tracking and follow-up channel.
            </span>
          </label>

          <button
            type="submit"
            className="rounded-md bg-slate-900 px-5 py-3 text-sm font-semibold text-white"
          >
            Submit Report
          </button>
        </form>
      </div>
    </main>
  );
}
