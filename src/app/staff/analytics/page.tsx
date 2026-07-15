import type { ReactNode } from "react";
import Link from "next/link";
import { saveAnalyticsViewAction } from "@/server-actions/analytics";
import { logoutStaffAction } from "@/server-actions/auth";
import { formatStatus } from "@/lib/issue-types";
import {
  analyzeReportJurisdiction,
  formatDistrictHintStatus,
  formatOwnershipHint,
} from "@/lib/jurisdiction";
import {
  listAiSuggestions,
  getJurisdictionConfig,
  listAnalyticsViews,
  listIssueReports,
  listNewsletterContacts,
  listReferrals,
} from "@/lib/issues-repository";
import { requireStaffSession } from "@/lib/staff-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function StaffAnalyticsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireStaffSession();
  const params = (await searchParams) ?? {};
  const selectedPreset = readSearchParam(params, "preset") || "all";
  const dateFrom = readSearchParam(params, "dateFrom");
  const dateTo = readSearchParam(params, "dateTo");
  const filterRange = resolveFilterRange({
    preset: selectedPreset,
    dateFrom,
    dateTo,
  });

  const allReports = listIssueReports();
  const jurisdictionConfig = getJurisdictionConfig();
  const reports = allReports.filter((report) =>
    isIsoWithinRange(report.createdAt, filterRange.start, filterRange.end),
  );
  const analyticsViews = listAnalyticsViews();
  const allSuggestions = reports.flatMap((report) => listAiSuggestions(report.id));
  const allReferrals = reports.flatMap((report) => listReferrals(report.id));
  const newsletterContacts = listNewsletterContacts().filter((contact) =>
    isIsoWithinRange(contact.lastOptedInAt, filterRange.start, filterRange.end),
  );
  const jurisdictionAssessments = reports.map((report) => ({
    report,
    assessment: analyzeReportJurisdiction(report, jurisdictionConfig),
  }));

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
  const duplicateReviewed = reports.filter(
    (report) => report.duplicateReviewDecision !== null,
  );
  const closedAsDuplicate = reports.filter(
    (report) => report.status === "closed_duplicate",
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
  const ownershipHintCounts = countBy(
    jurisdictionAssessments.map((item) =>
      formatOwnershipHint(item.assessment.ownershipHint),
    ),
  );
  const districtHintCounts = countBy(
    jurisdictionAssessments.map((item) =>
      formatDistrictHintStatus(item.assessment.districtHintStatus),
    ),
  );
  const duplicateDecisionCounts = countBy(
    duplicateReviewed.map((report) =>
      report.duplicateReviewDecision === "linked_to_master"
        ? "Linked to primary case"
        : "Kept separate",
    ),
  );
  const linkedDuplicateCount =
    duplicateDecisionCounts.find(
      (item) => item.label === "Linked to primary case",
    )?.count ?? 0;

  const recentContacts = reports
    .filter((report) => report.residentEmail)
    .slice(0, 12);
  const resolvedThisWindow = reports.filter((report) =>
    ["resolved", "closed_outside_jurisdiction"].includes(report.status),
  );
  const reportsWithReferrals = new Set(allReferrals.map((referral) => referral.reportId));
  const reportsRoutedThisWindow = reports.filter((report) =>
    reportsWithReferrals.has(report.id),
  );
  const reportTrend = buildDailyTrend(reports.map((report) => report.createdAt), filterRange, "Reports");
  const referralTrend = buildDailyTrend(
    allReferrals.map((referral) => referral.createdAt),
    filterRange,
    "Referrals",
  );
  const aiReviewTrend = buildDailyTrend(
    aiReviewed
      .map((suggestion) => suggestion.feedbackCreatedAt)
      .filter((value): value is string => Boolean(value)),
    filterRange,
    "AI reviews",
  );
  const referralOutcomeCounts = countBy(
    allReferrals.map((referral) => formatStatus(referral.outcomeStatus)),
  );
  const windowLabel = formatWindowLabel(filterRange, selectedPreset);
  const quickRanges = buildQuickRangeLinks({
    currentPreset: selectedPreset,
    dateFrom,
    dateTo,
  });
  const exportQuerySuffix = buildExportQuerySuffix({
    preset: selectedPreset,
    dateFrom,
    dateTo,
  });

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
            <Link
              href="/staff/notifications"
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Notifications
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
        <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">Date filters</h2>
              <p className="mt-1 text-sm text-slate-600">
                Analytics below reflect reports created inside the selected window.
              </p>
            </div>
            <div className="text-sm text-slate-600">
              Current window: <span className="font-semibold text-slate-900">{windowLabel}</span>
            </div>
          </div>

          <form className="mt-5 grid gap-4 lg:grid-cols-[160px_1fr_1fr_auto]">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">
                Preset
              </span>
              <select
                name="preset"
                defaultValue={selectedPreset}
                className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-sky-700 focus:ring-2 focus:ring-sky-100"
              >
                <option value="all">All time</option>
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">
                From
              </span>
              <input
                type="date"
                name="dateFrom"
                defaultValue={dateFrom}
                className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-sky-700 focus:ring-2 focus:ring-sky-100"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">
                To
              </span>
              <input
                type="date"
                name="dateTo"
                defaultValue={dateTo}
                className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-sky-700 focus:ring-2 focus:ring-sky-100"
              />
            </label>
            <div className="flex items-end gap-2">
              <button
                type="submit"
                className="rounded-md bg-sky-700 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-800"
              >
                Apply
              </button>
              <Link
                href="/staff/analytics"
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Reset
              </Link>
            </div>
          </form>

          <div className="mt-4 flex flex-wrap gap-2">
            {quickRanges.map((range) => (
              <Link
                key={range.label}
                href={range.href}
                className={`rounded-full px-3 py-1 text-sm font-medium ${
                  range.active
                    ? "bg-sky-700 text-white"
                    : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                {range.label}
              </Link>
            ))}
          </div>

          <div className="mt-5 grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
            <form
              action={saveAnalyticsViewAction}
              className="rounded-md border border-slate-200 bg-slate-50 p-4"
            >
              <div className="text-sm font-semibold text-slate-900">
                Save this view
              </div>
              <p className="mt-1 text-sm text-slate-600">
                Save the current date window as a reusable staff shortcut.
              </p>
              <input type="hidden" name="preset" value={selectedPreset} />
              <input type="hidden" name="dateFrom" value={dateFrom} />
              <input type="hidden" name="dateTo" value={dateTo} />
              <div className="mt-4 flex flex-wrap gap-3">
                <input
                  name="name"
                  required
                  placeholder="Example: Last 30 days"
                  className="h-11 min-w-64 flex-1 rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-sky-700 focus:ring-2 focus:ring-sky-100"
                />
                <button
                  type="submit"
                  className="rounded-md bg-sky-700 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-800"
                >
                  Save View
                </button>
              </div>
            </form>

            <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
              <div className="text-sm font-semibold text-slate-900">
                Saved views
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {analyticsViews.length > 0 ? (
                  analyticsViews.map((view) => (
                    <Link
                      key={view.id}
                      href={buildAnalyticsHref({
                        preset: view.preset,
                        dateFrom: view.dateFrom ?? "",
                        dateTo: view.dateTo ?? "",
                      })}
                      className="rounded-full border border-slate-300 bg-white px-3 py-1 text-sm font-medium text-slate-700 hover:bg-slate-100"
                    >
                      {view.name}
                    </Link>
                  ))
                ) : (
                  <p className="text-sm text-slate-600">
                    No saved analytics views yet.
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>

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

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <Metric label="Duplicate reviews" value={duplicateReviewed.length} />
          <Metric label="Closed as duplicate" value={closedAsDuplicate.length} />
          <Metric label="Linked duplicate cases" value={linkedDuplicateCount} />
        </section>

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Metric label="Resolved this window" value={resolvedThisWindow.length} />
          <Metric label="Reports with referrals" value={reportsRoutedThisWindow.length} />
          <Metric label="Referrals logged" value={allReferrals.length} />
          <Metric label="AI reviews logged" value={aiReviewed.length} />
        </section>

        <section className="grid gap-6 xl:grid-cols-[1fr_1fr_1fr]">
          <Panel title="Report trend">
            <TrendList
              items={reportTrend}
              emptyLabel="No report activity in this window."
            />
          </Panel>

          <Panel title="Referral trend">
            <TrendList
              items={referralTrend}
              emptyLabel="No referrals logged in this window."
            />
          </Panel>

          <Panel title="AI review trend">
            <TrendList
              items={aiReviewTrend}
              emptyLabel="No AI reviews in this window."
            />
          </Panel>
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

        <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
          <Panel title="Jurisdiction ownership hints">
            <CountList
              items={ownershipHintCounts}
              emptyLabel="No jurisdiction hints yet."
            />
          </Panel>

          <Panel title="District match hints">
            <CountList
              items={districtHintCounts}
              emptyLabel="No district hints yet."
            />
          </Panel>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
          <Panel title="Duplicate review outcomes">
            <CountList
              items={duplicateDecisionCounts}
              emptyLabel="No duplicate reviews recorded yet."
            />
          </Panel>

          <Panel title="Referral outcomes">
            <CountList
              items={referralOutcomeCounts}
              emptyLabel="No referral outcomes recorded yet."
            />
          </Panel>
        </section>

        <Panel title="Exports">
          <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            Download the pilot backup JSON at the end of each day with real case
            entry. Attachment metadata is included here; attachment files remain
            on the Render persistent disk.
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <ExportLink
              href="/staff/analytics/export/pilot-backup"
              label="Pilot backup JSON"
              description="Cases, audit history, routing data, and staff metadata."
            />
            <ExportLink
              href={`/staff/analytics/export/newsletter-contacts${exportQuerySuffix}`}
              label="Newsletter contacts CSV"
              description="Only explicit newsletter opt-ins."
            />
            <ExportLink
              href={`/staff/analytics/export/open-reports${exportQuerySuffix}`}
              label="Open reports CSV"
              description="All unresolved casework."
            />
            <ExportLink
              href={`/staff/analytics/export/referrals${exportQuerySuffix}`}
              label="Referrals CSV"
              description="Agency handoffs and outcome tracking."
            />
            <ExportLink
              href={`/staff/analytics/export/ai-feedback${exportQuerySuffix}`}
              label="AI feedback CSV"
              description="Suggestion quality and review outcomes."
            />
            <ExportLink
              href={`/staff/analytics/export/notification-reviews${exportQuerySuffix}`}
              label="Notification review CSV"
              description="Ready, needs edit, and hold states for message workflow."
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

function readSearchParam(
  params: Record<string, string | string[] | undefined>,
  key: string,
) {
  const value = params[key];
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }
  return value ?? "";
}

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

function parseDateInput(value: string) {
  if (!value) return null;
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function resolveFilterRange(input: {
  preset: string;
  dateFrom: string;
  dateTo: string;
}): {
  start: Date | null;
  end: Date | null;
  kind: "all" | "preset" | "custom";
} {
  const now = new Date();
  const hasManualDates = Boolean(input.dateFrom || input.dateTo);

  if (hasManualDates) {
    return {
      start: input.dateFrom ? startOfDay(parseDateInput(input.dateFrom) ?? now) : null,
      end: input.dateTo ? endOfDay(parseDateInput(input.dateTo) ?? now) : null,
      kind: "custom" as const,
    };
  }

  if (input.preset === "7d" || input.preset === "30d" || input.preset === "90d") {
    const days = Number.parseInt(input.preset.replace("d", ""), 10);
    const start = startOfDay(new Date(now));
    start.setDate(start.getDate() - (days - 1));
    return {
      start,
      end: endOfDay(now),
      kind: "preset" as const,
    };
  }

  return {
    start: null,
    end: null,
    kind: "all" as const,
  };
}

function isIsoWithinRange(
  value: string,
  start: Date | null,
  end: Date | null,
) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return false;
  }
  if (start && parsed < start) {
    return false;
  }
  if (end && parsed > end) {
    return false;
  }
  return true;
}

function formatWindowLabel(
  range: { start: Date | null; end: Date | null; kind: "all" | "preset" | "custom" },
  preset: string,
) {
  if (range.kind === "all") {
    return "All time";
  }

  if (range.start && range.end) {
    return `${range.start.toLocaleDateString()} to ${range.end.toLocaleDateString()}`;
  }

  if (range.start) {
    return `From ${range.start.toLocaleDateString()}`;
  }

  if (range.end) {
    return `Through ${range.end.toLocaleDateString()}`;
  }

  return preset === "all" ? "All time" : preset;
}

function buildQuickRangeLinks(input: {
  currentPreset: string;
  dateFrom: string;
  dateTo: string;
}) {
  const options = [
    { label: "All time", preset: "all" },
    { label: "7 days", preset: "7d" },
    { label: "30 days", preset: "30d" },
    { label: "90 days", preset: "90d" },
  ];

  return options.map((option) => ({
    label: option.label,
    href: buildAnalyticsHref({
      preset: option.preset,
      dateFrom: "",
      dateTo: "",
    }),
    active:
      !input.dateFrom &&
      !input.dateTo &&
      input.currentPreset === option.preset,
  }));
}

function buildAnalyticsHref(input: {
  preset: string;
  dateFrom: string;
  dateTo: string;
}) {
  const query = new URLSearchParams();

  if (input.dateFrom) {
    query.set("dateFrom", input.dateFrom);
  }

  if (input.dateTo) {
    query.set("dateTo", input.dateTo);
  }

  if (!input.dateFrom && !input.dateTo && input.preset && input.preset !== "all") {
    query.set("preset", input.preset);
  }

  const serialized = query.toString();
  return serialized ? `/staff/analytics?${serialized}` : "/staff/analytics";
}

function buildExportQuerySuffix(input: {
  preset: string;
  dateFrom: string;
  dateTo: string;
}) {
  const query = new URLSearchParams();

  if (input.dateFrom) {
    query.set("dateFrom", input.dateFrom);
  }

  if (input.dateTo) {
    query.set("dateTo", input.dateTo);
  }

  if (!input.dateFrom && !input.dateTo && input.preset && input.preset !== "all") {
    query.set("preset", input.preset);
  }

  const serialized = query.toString();
  return serialized ? `?${serialized}` : "";
}

function buildDailyTrend(
  timestamps: string[],
  range: { start: Date | null; end: Date | null; kind: "all" | "preset" | "custom" },
  labelPrefix: string,
) {
  const filteredDates = timestamps
    .map((timestamp) => new Date(timestamp))
    .filter((date) => !Number.isNaN(date.getTime()))
    .filter((date) => (!range.start || date >= range.start) && (!range.end || date <= range.end));

  if (filteredDates.length === 0) {
    return [] as Array<{ label: string; count: number; fullLabel: string }>;
  }

  const maxBuckets = 14;
  const sorted = filteredDates.sort((a, b) => a.getTime() - b.getTime());
  const lastDate = range.end ? endOfDay(range.end) : endOfDay(sorted[sorted.length - 1]);
  const firstDate = range.start
    ? startOfDay(range.start)
    : startOfDay(new Date(lastDate.getTime() - (maxBuckets - 1) * 24 * 60 * 60 * 1000));

  const counts = new Map<string, number>();
  const cursor = startOfDay(firstDate);

  while (cursor <= lastDate) {
    counts.set(cursor.toISOString().slice(0, 10), 0);
    cursor.setDate(cursor.getDate() + 1);
  }

  for (const date of filteredDates) {
    const key = startOfDay(date).toISOString().slice(0, 10);
    if (counts.has(key)) {
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }

  const entries = Array.from(counts.entries()).slice(-maxBuckets);
  return entries.map(([dateKey, count]) => ({
    label: new Date(`${dateKey}T00:00:00`).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    }),
    count,
    fullLabel: `${labelPrefix} on ${dateKey}`,
  }));
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

function TrendList({
  items,
  emptyLabel,
}: {
  items: Array<{ label: string; count: number; fullLabel: string }>;
  emptyLabel: string;
}) {
  if (items.length === 0) {
    return <p className="text-sm text-slate-600">{emptyLabel}</p>;
  }

  const maxCount = Math.max(...items.map((item) => item.count), 1);

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.fullLabel}>
          <div className="mb-1 flex items-center justify-between gap-3 text-sm">
            <span className="text-slate-700">{item.label}</span>
            <span className="font-semibold tabular-nums text-slate-900">
              {item.count}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-sky-700"
              style={{
                width: `${Math.max(
                  (item.count / maxCount) * 100,
                  item.count > 0 ? 10 : 0,
                )}%`,
              }}
              aria-label={item.fullLabel}
            />
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
