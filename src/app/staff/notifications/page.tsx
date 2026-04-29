import type { ReactNode } from "react";
import Link from "next/link";
import { logoutStaffAction } from "@/server-actions/auth";
import {
  saveNotificationTemplateAction,
  updateNotificationReviewAction,
} from "@/server-actions/notifications";
import {
  buildNotificationPreview,
  getLastNotificationSummary,
} from "@/lib/notification-previews";
import {
  getNotificationTemplateMap,
  listIssueReports,
  listNotificationEvents,
  listReferrals,
  listStatusEvents,
} from "@/lib/issues-repository";
import { requireStaffSession } from "@/lib/staff-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function StaffNotificationsPage() {
  await requireStaffSession();

  const reports = listIssueReports();
  const templateMap = getNotificationTemplateMap();
  const templates = Array.from(templateMap.values()).sort((a, b) =>
    a.label.localeCompare(b.label),
  );
  const rows = reports.map((report) => {
    const events = listStatusEvents(report.id);
    const referrals = listReferrals(report.id);
    const notifications = listNotificationEvents(report.id);
    const preview = buildNotificationPreview({
      report,
      events,
      referrals,
      templates: templateMap,
    });

    return {
      report,
      preview,
      notifications,
      lastNotification: getLastNotificationSummary(notifications),
    };
  });

  const totalNotificationEvents = rows.reduce(
    (sum, row) => sum + row.notifications.length,
    0,
  );
  const readyPreviews = rows.filter(
    (row) => row.preview.deliveryStatus === "ready",
  );
  const suppressedPreviews = rows.filter(
    (row) => row.preview.deliveryStatus === "suppressed",
  );
  const followUpSensitive = rows.filter((row) =>
    ["needs_more_info", "follow_up_due", "awaiting_agency"].includes(
      row.report.status,
    ),
  );
  const readyForSend = rows.filter(
    (row) => row.report.notificationReviewStatus === "ready",
  );
  const needsEdit = rows.filter(
    (row) => row.report.notificationReviewStatus === "needs_edit",
  );
  const onHold = rows.filter(
    (row) => row.report.notificationReviewStatus === "hold",
  );

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4">
          <div>
            <Link href="/" className="text-sm font-medium text-sky-700">
              District 7 Issue Reporter
            </Link>
            <h1 className="mt-1 text-xl font-semibold">Notification center</h1>
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
              href="/staff/analytics"
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Analytics
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
        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Metric label="Cases with previews" value={rows.length} />
          <Metric label="Previews ready" value={readyPreviews.length} />
          <Metric label="Suppressed previews" value={suppressedPreviews.length} />
          <Metric label="Logged stubs" value={totalNotificationEvents} />
        </section>

        <section className="grid gap-3 md:grid-cols-3">
          <Metric label="Marked ready" value={readyForSend.length} />
          <Metric label="Needs edit" value={needsEdit.length} />
          <Metric label="On hold" value={onHold.length} />
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <Panel title="Follow-up sensitive cases">
            <p className="text-sm text-slate-600">
              These are the cases where message tone and timing usually matter most before live email gets switched on.
            </p>
            <div className="mt-4 space-y-2">
              {followUpSensitive.length > 0 ? (
                followUpSensitive.slice(0, 8).map((row) => (
                  <Link
                    key={row.report.id}
                    href={`/staff/reports/${row.report.id}`}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 hover:bg-slate-100"
                  >
                    <div>
                      <div className="font-medium text-slate-900">
                        {row.report.category}
                      </div>
                      <div className="mt-1 text-sm text-slate-600">
                        {row.preview.label}
                      </div>
                    </div>
                    <div className="text-sm text-slate-700">
                      {toTitle(row.preview.deliveryStatus)}
                    </div>
                  </Link>
                ))
              ) : (
                <p className="text-sm text-slate-600">
                  No cases currently need especially sensitive follow-up language.
                </p>
              )}
            </div>
          </Panel>

          <Panel title="How to use this">
            <div className="space-y-3 text-sm leading-6 text-slate-700">
              <p>
                This page shows the constituent message the app would send right now based on each case’s latest status, referral activity, and tracking state.
              </p>
              <p>
                Nothing sends from here yet. The goal is to pressure-test tone, clarity, and sequencing before we touch DNS, vendors, or IT approval.
              </p>
              <p>
                Each card also shows the most recent logged notification stub so staff can compare “what we last recorded” with “what we would say next.”
              </p>
            </div>
          </Panel>
        </section>

        <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">Message templates</h2>
              <p className="mt-1 text-sm text-slate-600">
                Adjust the default constituent wording here. The live previews below update from these templates.
              </p>
            </div>
            <div className="max-w-xl text-xs leading-6 text-slate-500">
              Available placeholders: <code>{`{{address}}`}</code>, <code>{`{{category}}`}</code>, <code>{`{{category_lower}}`}</code>, <code>{`{{status}}`}</code>, <code>{`{{trackingToken}}`}</code>, <code>{`{{agencyName}}`}</code>, <code>{`{{referralMethod}}`}</code>, <code>{`{{referralMethod_lower}}`}</code>, and <code>{`{{publicNote_or_default}}`}</code>.
            </div>
          </div>

          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            {templates.map((template) => (
              <form
                key={template.key}
                action={saveNotificationTemplateAction}
                className="rounded-md border border-slate-200 bg-slate-50 p-4"
              >
                <input type="hidden" name="templateKey" value={template.key} />
                <div className="text-sm font-semibold text-slate-900">
                  {template.label}
                </div>
                <div className="mt-1 text-xs uppercase tracking-[0.08em] text-slate-500">
                  {template.key}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  Updated {new Date(template.updatedAt).toLocaleString()}
                </div>
                <label className="mt-4 block">
                  <span className="mb-2 block text-sm font-semibold text-slate-700">
                    Subject template
                  </span>
                  <input
                    name="subjectTemplate"
                    defaultValue={template.subjectTemplate}
                    className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-sky-700 focus:ring-2 focus:ring-sky-100"
                  />
                </label>
                <label className="mt-4 block">
                  <span className="mb-2 block text-sm font-semibold text-slate-700">
                    Body template
                  </span>
                  <textarea
                    name="bodyTemplate"
                    defaultValue={template.bodyTemplate}
                    className="min-h-32 w-full rounded-md border border-slate-300 bg-white px-3 py-3 text-sm leading-6 outline-none focus:border-sky-700 focus:ring-2 focus:ring-sky-100"
                  />
                </label>
                <button
                  type="submit"
                  className="mt-4 rounded-md bg-sky-700 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-800"
                >
                  Save Template
                </button>
              </form>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          {rows.map((row) => (
            <section
              key={row.report.id}
              className="rounded-md border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-slate-900">
                    {row.report.category}
                  </div>
                  <div className="mt-1 text-sm text-slate-600">
                    {row.report.addressText}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      row.preview.deliveryStatus === "ready"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {toTitle(row.preview.deliveryStatus)}
                  </span>
                  <Link
                    href={`/staff/reports/${row.report.id}`}
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Open Case
                  </Link>
                  <Link
                    href={`/report/${row.report.publicTrackingToken}`}
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Tracking Page
                  </Link>
                </div>
              </div>

              <div className="mt-5 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="rounded-md border border-sky-100 bg-sky-50 p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.1em] text-sky-800">
                    Current preview
                  </div>
                  <div className="mt-2 text-sm font-semibold text-slate-900">
                    {row.preview.label}
                  </div>
                  <div className="mt-3 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                    Subject
                  </div>
                  <div className="mt-1 text-sm text-slate-800">
                    {row.preview.subject}
                  </div>
                  <div className="mt-3 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                    Body
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                    {row.preview.body}
                  </p>
                  <div className="mt-3 text-xs text-slate-500">
                    Recipient: {row.preview.recipient ?? "Unavailable"}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {row.preview.reason}
                  </div>
                </div>

                <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
                    Last logged stub
                  </div>
                  {row.lastNotification ? (
                    <>
                      <div className="mt-2 text-sm font-semibold text-slate-900">
                        {row.lastNotification.subject}
                      </div>
                      <div className="mt-2 text-xs text-slate-500">
                        {row.lastNotification.eventType} |{" "}
                        {new Date(row.lastNotification.createdAt).toLocaleString()}
                      </div>
                      <div className="mt-2 text-xs text-slate-500">
                        Delivery: {row.lastNotification.deliveryStatus}
                      </div>
                      <div className="mt-2 text-xs text-slate-500">
                        {describeTemplateVersion(
                          row.lastNotification.templateKey,
                          row.lastNotification.templateUpdatedAt,
                          templateMap,
                        )}
                      </div>
                      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                        {row.lastNotification.body}
                      </p>
                    </>
                  ) : (
                    <p className="mt-2 text-sm text-slate-600">
                      No notification stub has been recorded for this case yet.
                    </p>
                  )}
                </div>
              </div>

              <form
                action={updateNotificationReviewAction}
                className="mt-5 rounded-md border border-slate-200 bg-slate-50 p-4"
              >
                <input type="hidden" name="reportId" value={row.report.id} />
                <div className="text-sm font-semibold text-slate-900">
                  Staff review workflow
                </div>
                <p className="mt-1 text-sm text-slate-600">
                  Keep this local-only for now: mark the message as ready, needs edit, or hold.
                </p>
                <div className="mt-4 grid gap-4 lg:grid-cols-[220px_1fr_auto]">
                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-slate-700">
                      Review status
                    </span>
                    <select
                      name="reviewStatus"
                      defaultValue={row.report.notificationReviewStatus ?? "needs_edit"}
                      className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-sky-700 focus:ring-2 focus:ring-sky-100"
                    >
                      <option value="ready">Ready</option>
                      <option value="needs_edit">Needs edit</option>
                      <option value="hold">Hold</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-slate-700">
                      Review note
                    </span>
                    <input
                      name="reviewNote"
                      defaultValue={row.report.notificationReviewNote ?? ""}
                      placeholder="Optional note for staff about wording, timing, or whether to wait."
                      className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-sky-700 focus:ring-2 focus:ring-sky-100"
                    />
                  </label>
                  <div className="flex items-end">
                    <button
                      type="submit"
                      className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                    >
                      Save Review
                    </button>
                  </div>
                </div>
                {row.report.notificationReviewedAt ? (
                  <p className="mt-3 text-xs text-slate-500">
                    Last reviewed {new Date(row.report.notificationReviewedAt).toLocaleString()}
                  </p>
                ) : null}
              </form>
            </section>
          ))}
        </section>
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
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

function toTitle(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function describeTemplateVersion(
  templateKey: string | null,
  templateUpdatedAt: string | null,
  templateMap: Map<
    string,
    {
      key: string;
      label: string;
      subjectTemplate: string;
      bodyTemplate: string;
      updatedAt: string;
    }
  >,
) {
  if (!templateKey) {
    return "Legacy stub with no template version recorded.";
  }

  const currentTemplate = templateMap.get(templateKey);
  if (!currentTemplate) {
    return `Template key: ${templateKey}. Current template is unavailable.`;
  }

  if (!templateUpdatedAt) {
    return `${currentTemplate.label}: version not recorded on this stub.`;
  }

  if (currentTemplate.updatedAt === templateUpdatedAt) {
    return `${currentTemplate.label}: matches the current saved template.`;
  }

  return `${currentTemplate.label}: this stub used an older template version from ${new Date(
    templateUpdatedAt,
  ).toLocaleString()}. Current template was updated ${new Date(
    currentTemplate.updatedAt,
  ).toLocaleString()}.`;
}
