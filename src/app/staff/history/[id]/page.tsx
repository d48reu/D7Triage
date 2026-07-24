import Link from "next/link";
import { notFound } from "next/navigation";
import { StaffHeader } from "@/components/staff-header";
import {
  getHistoricalCaseById,
  listHistoricalCaseAttachments,
  listHistoricalCaseUpdates,
} from "@/lib/historical-archive-repository";
import { requireStaffSession } from "@/lib/staff-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function HistoricalCasePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireStaffSession();
  const { id } = await params;
  const historicalCase = getHistoricalCaseById(id);
  if (!historicalCase) notFound();

  const updates = listHistoricalCaseUpdates(historicalCase.id);
  const attachments = listHistoricalCaseAttachments(historicalCase.id);

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <StaffHeader
        current="history"
        title={historicalCase.residentName || "Historical Case"}
        subtitle={`Read-only Monday.com case ${historicalCase.externalItemId}`}
      />

      <div className="mx-auto max-w-6xl px-5 py-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/staff/history"
            className="text-sm font-semibold text-sky-800 hover:underline"
          >
            ← Back to historical archive
          </Link>
          <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-700">
            Historical record · read only
          </span>
        </div>

        <section className="mt-5 rounded-md border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm text-slate-500">
                {historicalCase.sourceGroup}
              </p>
              <h2 className="mt-1 text-xl font-semibold">
                {historicalCase.summary || "No call summary entered"}
              </h2>
            </div>
            <span className="rounded-full bg-sky-50 px-3 py-1 text-sm font-semibold text-sky-800">
              {historicalCase.rawStatus || "No Monday status"}
            </span>
          </div>

          <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Detail
              label="Call date"
              value={
                historicalCase.occurredOn
                  ? formatDate(historicalCase.occurredOn)
                  : "Date not entered"
              }
            />
            <Detail
              label="Inferred category"
              value={historicalCase.inferredCategory}
            />
            <Detail
              label="Assigned in Monday"
              value={historicalCase.assignedPeople || "Unassigned"}
            />
            <Detail
              label="Answered by"
              value={historicalCase.answeredBy || "Not entered"}
            />
            <Detail
              label="Phone"
              value={historicalCase.phone || "Not entered"}
            />
            <Detail
              label="Email"
              value={historicalCase.email || "Not entered"}
            />
            <Detail
              label="Service / 311 number"
              value={historicalCase.serviceNumber || "Not entered"}
            />
            <Detail
              label="Monday item ID"
              value={historicalCase.externalItemId}
            />
          </dl>

          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <TextBlock
              label="Constituent address"
              value={historicalCase.addressText}
            />
            <TextBlock
              label="Action taken"
              value={historicalCase.actionTaken}
            />
          </div>

          {historicalCase.subitems.length > 0 ? (
            <div className="mt-5 border-t border-slate-200 pt-5">
              <h3 className="font-semibold">Monday subitems</h3>
              <div className="mt-3 space-y-2">
                {historicalCase.subitems.map((subitem) => (
                  <div
                    key={subitem.externalItemId}
                    className="rounded-md bg-slate-50 p-3 text-sm"
                  >
                    <span className="font-semibold">
                      {subitem.name || "Unnamed subitem"}
                    </span>
                    <span className="ml-2 text-slate-600">
                      {subitem.owner || "No owner"} ·{" "}
                      {subitem.rawStatus || "No status"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Monday timeline</h2>
              <span className="text-sm text-slate-500">
                {updates.length.toLocaleString()} updates and replies
              </span>
            </div>

            {updates.length > 0 ? (
              <div className="mt-4 space-y-3">
                {updates.map((update) => (
                  <article
                    key={update.id}
                    className={`rounded-md border p-4 ${
                      update.contentType === "Reply"
                        ? "ml-5 border-slate-200 bg-slate-50"
                        : "border-slate-200 bg-white"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">
                          {update.authorName || "Unknown historical user"}
                        </span>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                          {update.contentType}
                        </span>
                      </div>
                      <time className="text-xs text-slate-500">
                        {update.createdAt
                          ? formatDateTime(update.createdAt)
                          : update.createdAtRaw || "Date unknown"}
                      </time>
                    </div>
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                      {update.body || "No update text."}
                    </p>
                  </article>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-600">
                No Monday updates were recorded for this case.
              </p>
            )}
          </section>

          <aside className="space-y-6">
            <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="font-semibold">Archived files</h2>
              <p className="mt-1 text-sm text-slate-600">
                {attachments.length.toLocaleString()} file references
              </p>
              {attachments.length > 0 ? (
                <div className="mt-4 space-y-2">
                  {attachments.map((attachment) =>
                    attachment.storagePath ? (
                      <Link
                        key={attachment.id}
                        href={`/historical-attachments/${attachment.id}`}
                        target="_blank"
                        className="block rounded-md border border-slate-200 p-3 text-sm font-semibold text-sky-800 hover:bg-slate-50"
                      >
                        {attachment.fileName ||
                          `Monday file ${attachment.externalAssetId}`}
                      </Link>
                    ) : (
                      <div
                        key={attachment.id}
                        className="rounded-md border border-dashed border-slate-300 p-3 text-sm text-slate-600"
                      >
                        Monday file {attachment.externalAssetId}
                        <div className="mt-1 text-xs text-slate-500">
                          Reference preserved; file bytes not uploaded.
                        </div>
                      </div>
                    ),
                  )}
                </div>
              ) : (
                <p className="mt-3 text-sm text-slate-600">
                  No files were attached to this case or its updates.
                </p>
              )}
            </section>

            <section className="rounded-md border border-slate-200 bg-white p-5 text-sm shadow-sm">
              <h2 className="font-semibold">Archive handling</h2>
              <p className="mt-2 leading-6 text-slate-600">
                This page preserves the original Monday fields and wording.
                Editing and active follow-up remain in the live case workflow.
              </p>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </dt>
      <dd className="mt-1 break-words text-sm text-slate-800">{value}</dd>
    </div>
  );
}

function TextBlock({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </h3>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
        {value || "Not entered"}
      </p>
    </div>
  );
}

function formatDate(value: string) {
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime())
    ? date.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
        timeZone: "America/New_York",
      })
    : value;
}

function formatDateTime(value: string) {
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? date.toLocaleString("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "America/New_York",
      })
    : value;
}
