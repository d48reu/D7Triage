import Link from "next/link";
import { ISSUE_CATEGORIES } from "@/lib/issue-types";
import { submitIssueReportAction } from "@/server-actions/issues";

export const runtime = "nodejs";

export default function ReportPage() {
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
          <div className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-slate-900">Before you submit</h2>
            <p className="mt-3">
              If there is an immediate danger, call emergency services or the
              appropriate urgent utility line. This form is for routing and
              follow-up by District 7 staff.
            </p>
          </div>
        </aside>

        <form
          action={submitIssueReportAction}
          className="rounded-md border border-slate-200 bg-white shadow-sm"
        >
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-lg font-semibold">Issue details</h2>
            <p className="mt-1 text-sm text-slate-600">
              Use plain language. Staff will review and route it.
            </p>
          </div>

          <div className="space-y-5 p-5">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-800">
                Category
              </span>
              <select
                name="category"
                required
                defaultValue="Other / unsure"
                className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-sky-700 focus:ring-2 focus:ring-sky-100"
              >
                {ISSUE_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-800">
                Description
              </span>
              <textarea
                name="description"
                required
                minLength={12}
                className="min-h-36 w-full rounded-md border border-slate-300 bg-white px-3 py-3 text-sm leading-6 outline-none focus:border-sky-700 focus:ring-2 focus:ring-sky-100"
                placeholder="Example: There is a large pothole near the school entrance and cars are swerving around it."
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-800">
                Location or address
              </span>
              <input
                name="addressText"
                required
                className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-sky-700 focus:ring-2 focus:ring-sky-100"
                placeholder="Street address, intersection, park, or landmark"
              />
            </label>
          </div>

          <div className="border-y border-slate-200 bg-slate-50 px-5 py-4">
            <h2 className="text-lg font-semibold">Follow-up contact</h2>
          </div>

          <div className="space-y-5 p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field name="residentName" label="Name" placeholder="Optional" />
              <Field
                name="residentEmail"
                label="Email"
                placeholder="you@example.com"
                type="email"
                required
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field name="residentPhone" label="Phone" placeholder="Optional" />
              <Field
                name="preferredLanguage"
                label="Preferred language"
                defaultValue="English"
              />
            </div>

            <label className="flex gap-3 rounded-md border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
              <input
                name="contactConsent"
                type="checkbox"
                required
                defaultChecked
                className="mt-1"
              />
              <span>
                I agree to receive email updates about this report.
              </span>
            </label>

            <div className="flex justify-end border-t border-slate-200 pt-5">
              <button
                type="submit"
                className="rounded-md bg-sky-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sky-800"
              >
                Submit Report
              </button>
            </div>
          </div>
        </form>
      </div>
    </main>
  );
}

function Field({
  name,
  label,
  placeholder,
  type = "text",
  required = false,
  defaultValue,
}: {
  name: string;
  label: string;
  placeholder?: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-800">
        {label}
      </span>
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-sky-700 focus:ring-2 focus:ring-sky-100"
        placeholder={placeholder}
      />
    </label>
  );
}
