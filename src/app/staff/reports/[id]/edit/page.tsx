import Link from "next/link";
import { notFound } from "next/navigation";
import { ISSUE_CATEGORIES } from "@/lib/issue-types";
import { getIssueReportById } from "@/lib/issues-repository";
import { requireStaffSession } from "@/lib/staff-auth";
import { updateIssueDetailsAction } from "@/server-actions/issues";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function EditStaffReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireStaffSession();
  const { id } = await params;
  const report = getIssueReportById(id);

  if (!report) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-5 py-4">
          <div>
            <Link
              href={`/staff/reports/${report.id}`}
              className="text-sm font-medium text-sky-700"
            >
              Case detail
            </Link>
            <h1 className="mt-1 text-xl font-semibold">Edit case details</h1>
          </div>
          <Link
            href={`/staff/reports/${report.id}`}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-5 py-6">
        <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
          <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-slate-800">
            Staff edits update the case record. If the address changes, location
            intelligence will be refreshed from the edited address.
          </div>

          <form action={updateIssueDetailsAction} className="mt-5 space-y-5">
            <input type="hidden" name="reportId" value={report.id} />

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">
                  Category
                </span>
                <select
                  name="category"
                  required
                  defaultValue={report.category}
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
                <span className="mb-2 block text-sm font-semibold text-slate-700">
                  Preferred language
                </span>
                <input
                  name="preferredLanguage"
                  defaultValue={report.preferredLanguage}
                  maxLength={60}
                  className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-sky-700 focus:ring-2 focus:ring-sky-100"
                />
              </label>
            </div>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">
                Location or address
              </span>
              <input
                name="addressText"
                required
                defaultValue={report.addressText}
                maxLength={250}
                className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-sky-700 focus:ring-2 focus:ring-sky-100"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">
                Description
              </span>
              <textarea
                name="description"
                required
                defaultValue={report.description}
                maxLength={4000}
                className="min-h-40 w-full rounded-md border border-slate-300 bg-white px-3 py-3 text-sm leading-6 outline-none focus:border-sky-700 focus:ring-2 focus:ring-sky-100"
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">
                  Resident name
                </span>
                <input
                  name="residentName"
                  defaultValue={report.residentName ?? ""}
                  maxLength={120}
                  className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-sky-700 focus:ring-2 focus:ring-sky-100"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">
                  Resident email
                </span>
                <input
                  name="residentEmail"
                  type="email"
                  required
                  defaultValue={report.residentEmail}
                  className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-sky-700 focus:ring-2 focus:ring-sky-100"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">
                  Resident phone
                </span>
                <input
                  name="residentPhone"
                  defaultValue={report.residentPhone ?? ""}
                  maxLength={40}
                  className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-sky-700 focus:ring-2 focus:ring-sky-100"
                />
              </label>
            </div>

            <div className="grid gap-3 rounded-md border border-slate-200 bg-slate-50 p-4">
              <label className="flex items-start gap-3 text-sm text-slate-700">
                <input
                  name="contactConsent"
                  type="checkbox"
                  defaultChecked={report.contactConsent}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-sky-700 focus:ring-sky-700"
                />
                <span>Resident consents to case update contact.</span>
              </label>
              <label className="flex items-start gap-3 text-sm text-slate-700">
                <input
                  name="newsletterOptIn"
                  type="checkbox"
                  defaultChecked={report.newsletterOptIn}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-sky-700 focus:ring-sky-700"
                />
                <span>Resident opted in to broader District 7 updates.</span>
              </label>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                className="rounded-md bg-sky-700 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-800"
              >
                Save Details
              </button>
              <Link
                href={`/staff/reports/${report.id}`}
                className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </Link>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}

