import type { ReactNode } from "react";
import Link from "next/link";
import { logoutStaffAction } from "@/server-actions/auth";
import { formatStatus } from "@/lib/issue-types";
import {
  listAiSuggestions,
  listIssueReports,
  listNewsletterContacts,
  listReferrals,
} from "@/lib/issues-repository";
import { requireStaffSession } from "@/lib/staff-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function StaffAnalyticsPage() {
  await requireStaffSession();

  const reports = listIssueReports();
  const allSuggestions = reports.flatMap((report) => listAiSuggestions(report.id));
  const allReferrals = reports.flatMap((report) => listReferrals(report.id));
  const newsletterContacts = listNewsletterContacts();

  const unresolvedReports = reports.filter((report) =>
    !["resolved", "closed_outside_jurisdiction", "closed_duplicate"].includes(
      report.status,
    ),
  );
  const uniqueReporterEmails = new Set(
    reports.map((report) => report.residentEmail.toLowerCase()),
  );
  const aiReviewed = allSuggestions.filter(
    (suggestion) => suggestion.feedbackDisposition !== null,
  );
  const aiAccepted = aiReviewed.filter(
    (suggestion) =>
      suggestion.feedbackDisposition === "accepted" ||
      suggestion.feedbackDisposition === "accepted_with_edits",
  );
  const acceptedRate = aiReviewed.length
    ? Math.round((aiAccepted.length / aiReviewed.length) * 100)
    : null;

  const categoryCounts = countBy(
    reports.map((report) => report.category),
  );
  const agencyReferralCounts = countBy(
    allReferrals.map((referral) => referral.agencyName),
  );
  const aiFeedbackCounts = countBy(
    aiReviewed.map((suggestion) => formatDisposition(suggestion.feedbackDisposition!)),
  );

  const recentContacts = reports
    .filter((report) => report.residentEmail)
    .slice(0, 12);

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4">
          <div>
            <Link href="/" className="text-sm font-medium text-sky-700">
              District 7 Issue Reporter
            </Link>
            <h1 className="mt-1 text-xl font-semibold">Staff analytics</h1>
          </div>
          <nav className="flex flex-wrap gap-2">
            <Link
              href="/staff"
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Staff Inbox
            </Link>
            <Link
              href="/staff/routing"
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Routing Guide
            </Link>
            <form action={logoutStaffAction}>
              <button
                type="submit"
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Sign Out
              </button>
            </form>
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-6 px-5 py-6">
        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <Metric label="All reports" value={reports.length} />
          <Metric label="Unresolved" value={unresolvedReports.length} />
          <Metric label="Unique reporter emails" value={uniqueReporterEmails.size} />
          <Metric label="Newsletter opt-ins" value={newsletterContacts.length} />
          <Metric
            label="AI acceptance rate"
            value={acceptedRate !== null ? `${acceptedRate}%` : "No reviews"}
          />
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <Panel title="Reports by category">
            <CountList items={categoryCounts} emptyLabel="No reports yet." />
          </Panel>

          <Panel title="Referrals by agency">
            <CountList
              items={agencyReferralCounts}
              emptyLabel="No referrals recorded yet."
            />
          </Panel>
        </section>

        <Panel title="Exports">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <ExportLink
              href="/staff/analytics/export/newsletter-contacts"
              label="Newsletter contacts CSV"
              description="Only explicit newsletter opt-ins."
            />
            <ExportLink
              href="/staff/analytics/export/open-reports"
              label="Open reports CSV"
              description="All unresolved casework."
            />
            <ExportLink
              href="/staff/analytics/export/referrals"
              label="Referrals CSV"
              description="Agency handoffs and outcome tracking."
            />
            <ExportLink
              href="/staff/analytics/export/ai-feedback"
              label="AI feedback CSV"
              description="Suggestion quality and review outcomes."
            />
          </div>
        </Panel>

        <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <Panel title="AI feedback outcomes">
            <CountList
              items={aiFeedbackCounts}
              emptyLabel="No AI suggestions have been reviewed yet."
            />
          </Panel>

          <Panel title="Recent constituent contacts">
            {recentContacts.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="text-xs uppercase tracking-[0.08em] text-slate-500">
                    <tr>
                      <th className="pb-3 font-semibold">Name</th>
                      <th className="pb-3 font-semibold">Email</th>
                      <th className="pb-3 font-semibold">Newsletter</th>
                      <th className="pb-3 font-semibold">Submitted</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {recentContacts.map((report) => (
                      <tr key={report.id}>
                        <td className="py-3 pr-4 text-slate-800">
                          {report.residentName || "Not provided"}
                        </td>
                        <td className="py-3 pr-4 text-slate-700">
                          <a
                            href={`mailto:${report.residentEmail}`}
                            className="text-sky-700 hover:underline"
                          >
                            {report.residentEmail}
                          </a>
                        </td>
                        <td className="py-3 pr-4 text-slate-700">
                          {report.newsletterOptIn ? "Opted in" : "Case updates only"}
                        </td>
                        <td className="py-3 text-slate-500">
                          {new Date(report.createdAt).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-slate-600">
                No constituent contacts have been collected yet.
              </p>
            )}
          </Panel>
        </section>

        <Panel title="Newsletter-ready contacts">
          <p className="mb-4 text-sm text-slate-600">
            These contacts explicitly opted into District 7 newsletter and
            community updates. Case-update consent alone is not treated as
            newsletter consent.
          </p>
          {newsletterContacts.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="text-xs uppercase tracking-[0.08em] text-slate-500">
                  <tr>
                    <th className="pb-3 font-semibold">Email</th>
                    <th className="pb-3 font-semibold">Name</th>
                    <th className="pb-3 font-semibold">Language</th>
                    <th className="pb-3 font-semibold">Reports</th>
                    <th className="pb-3 font-semibold">Last opt-in</th>
                    <th className="pb-3 font-semibold">Latest case</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {newsletterContacts.map((contact) => (
                    <tr key={contact.residentEmail}>
                      <td className="py-3 pr-4 text-slate-700">
                        <a
                          href={`mailto:${contact.residentEmail}`}
                          className="text-sky-700 hover:underline"
                        >
                          {contact.residentEmail}
                        </a>
                      </td>
                      <td className="py-3 pr-4 text-slate-800">
                        {contact.residentName || "Not provided"}
                      </td>
                      <td className="py-3 pr-4 text-slate-700">
                        {contact.preferredLanguage}
                      </td>
                      <td className="py-3 pr-4 text-slate-700">
                        {contact.reportCount}
                      </td>
                      <td className="py-3 pr-4 text-slate-500">
                        {new Date(contact.lastOptedInAt).toLocaleString()}
                      </td>
                      <td className="py-3 text-slate-700">
                        {contact.latestReportId ? (
                          <Link
                            href={`/staff/reports/${contact.latestReportId}`}
                            className="text-sky-700 hover:underline"
                          >
                            Open case
                          </Link>
                        ) : (
                          "Unavailable"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-slate-600">
              No one has opted into broader email updates yet.
            </p>
          )}
        </Panel>

        <Panel title="Open reports snapshot">
          {unresolvedReports.length > 0 ? (
            <div className="space-y-2">
              {unresolvedReports.slice(0, 10).map((report) => (
                <Link
                  key={report.id}
                  href={`/staff/reports/${report.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 hover:bg-slate-100"
                >
                  <div>
                    <div className="font-medium text-slate-900">
                      {report.category}
                    </div>
                    <div className="mt-1 text-sm text-slate-600">
                      {report.addressText}
                    </div>
                  </div>
                  <div className="text-sm text-slate-700">
                    {formatStatus(report.status)}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-600">
              Nothing open right now.
            </p>
          )}
        </Panel>
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <div className="text-2xl font-semibold tabular-nums">{value}</div>
      <div className="mt-1 text-xs font-medium uppercase tracking-[0.08em] text-slate-500">
        {label}
      </div>
    </div>
  );
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function CountList({
  items,
  emptyLabel,
}: {
  items: Array<{ label: string; count: number }>;
  emptyLabel: string;
}) {
  if (items.length === 0) {
    return <p className="text-sm text-slate-600">{emptyLabel}</p>;
  }

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-4 py-3"
        >
          <div className="text-sm text-slate-800">{item.label}</div>
          <div className="text-sm font-semibold tabular-nums text-slate-950">
            {item.count}
          </div>
        </div>
      ))}
    </div>
  );
}

function ExportLink({
  href,
  label,
  description,
}: {
  href: string;
  label: string;
  description: string;
}) {
  return (
    <a
      href={href}
      className="rounded-md border border-slate-200 bg-slate-50 px-4 py-4 hover:bg-slate-100"
    >
      <div className="text-sm font-semibold text-slate-900">{label}</div>
      <div className="mt-1 text-sm text-slate-600">{description}</div>
    </a>
  );
}

function countBy(values: string[]) {
  const counts = new Map<string, number>();

  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

function formatDisposition(value: "accepted" | "accepted_with_edits" | "rejected") {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
