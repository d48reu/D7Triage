import Link from "next/link";
import { notFound } from "next/navigation";
import { AiSuggestionPanel } from "@/components/ai-suggestion-panel";
import { getAiRoutingAvailability } from "@/lib/ai-routing";
import { formatStatus, ISSUE_STATUSES } from "@/lib/issue-types";
import {
  analyzeReportJurisdiction,
  formatDistrictHintStatus,
  formatOwnershipHint,
} from "@/lib/jurisdiction";
import {
  findPotentialDuplicates,
  getJurisdictionConfig,
  getLatestAiSuggestion,
  getManagedRoutingRule,
  getIssueReportById,
  listLinkedDuplicateReports,
  listAgencies,
  listAttachments,
  listNotificationEvents,
  listReferrals,
  listStaffNotes,
  listStatusEvents,
} from "@/lib/issues-repository";
import { requireStaffSession } from "@/lib/staff-auth";
import {
  addReferralAction,
  addStaffNoteAction,
  markDistinctAction,
  markDuplicateAction,
  updateReferralOutcomeAction,
  updateIssueStatusAction,
} from "@/server-actions/issues";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function StaffReportPage({
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

  const events = listStatusEvents(report.id);
  const notes = listStaffNotes(report.id);
  const referrals = listReferrals(report.id);
  const agencies = listAgencies().filter((agency) => agency.isActive);
  const attachments = listAttachments(report.id);
  const notifications = listNotificationEvents(report.id);
  const duplicateCandidates = findPotentialDuplicates(report);
  const linkedDuplicates = listLinkedDuplicateReports(report.id);
  const routingRule = getManagedRoutingRule(report.category);
  const latestSuggestion = getLatestAiSuggestion(report.id);
  const aiRoutingAvailability = getAiRoutingAvailability();
  const jurisdictionConfig = getJurisdictionConfig();
  const jurisdiction = analyzeReportJurisdiction(report, jurisdictionConfig);
  const defaultOwnerLabel = routingRule?.ownerLabel ?? "District 7 triage";
  const masterReport = report.duplicateOfReportId
    ? getIssueReportById(report.duplicateOfReportId)
    : null;

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4">
          <div>
            <Link href="/staff" className="text-sm font-medium text-sky-700">
              Staff inbox
            </Link>
            <h1 className="mt-1 text-xl font-semibold">Case detail</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/staff/notifications"
              className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Notifications
            </Link>
            <Link
              href={`/report/${report.publicTrackingToken}`}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Tracking Page
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-5 px-5 py-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                {report.category}
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                {formatStatus(report.status)}
              </h2>
            </div>
          </div>

          <div className="mt-5 rounded-md border border-sky-100 bg-sky-50 p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-800">
              Routing suggestion
            </div>
            <div className="mt-2 text-sm font-semibold text-slate-950">
              {defaultOwnerLabel}
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              {routingRule?.staffGuidance ??
                "Review manually and determine the best responsible party."}
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Resident explanation:{" "}
              {routingRule?.residentExplanation ??
                "Staff will review the report and determine the most appropriate routing path."}
            </p>
            {routingRule?.agency ? (
              <div className="mt-3 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
                <div>
                  Contact: {routingRule.agency.contactName || "Not set"}
                </div>
                <div>
                  Email: {routingRule.agency.contactEmail || "Not set"}
                </div>
                <div>
                  Phone: {routingRule.agency.contactPhone || "Not set"}
                </div>
                <div>
                  Method: {routingRule.agency.defaultReferralMethod || "Not set"}
                </div>
              </div>
            ) : null}
          </div>

          <div className="mt-5 rounded-md border border-amber-200 bg-amber-50 p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-800">
              Jurisdiction hints
            </div>
            <div className="mt-2 flex flex-wrap gap-2 text-sm font-medium text-slate-900">
              <span className="rounded-full bg-white px-3 py-1">
                {formatOwnershipHint(jurisdiction.ownershipHint)}
              </span>
              <span className="rounded-full bg-white px-3 py-1">
                {formatDistrictHintStatus(jurisdiction.districtHintStatus)}
              </span>
              <span className="rounded-full bg-white px-3 py-1">
                Confidence: {formatStatus(jurisdiction.confidence)}
              </span>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-700">
              {jurisdiction.summary}
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              {jurisdiction.staffGuidance}
            </p>
            {jurisdiction.matchedClues.length > 0 ? (
              <div className="mt-3">
                <div className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                  Matched clues
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {jurisdiction.matchedClues.map((clue) => (
                    <span
                      key={clue}
                      className="rounded-full border border-amber-200 bg-white px-3 py-1 text-xs text-slate-700"
                    >
                      {clue}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <div className="mt-5 grid gap-4 border-t border-slate-200 pt-5 sm:grid-cols-2">
            <Detail label="Location" value={report.addressText} />
            <Detail label="Email" value={report.residentEmail} />
            <Detail label="Name" value={report.residentName || "Not provided"} />
            <Detail label="Phone" value={report.residentPhone || "Not provided"} />
            <Detail label="Language" value={report.preferredLanguage} />
            <Detail
              label="Newsletter"
              value={report.newsletterOptIn ? "Opted in" : "Case updates only"}
            />
            <Detail
              label="Submitted"
              value={new Date(report.createdAt).toLocaleString()}
            />
          </div>

          <div className="mt-6">
            <h2 className="text-sm font-semibold text-slate-700">
              Resident description
            </h2>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
              {report.description}
            </p>
          </div>

          <div className="mt-6 border-t border-slate-200 pt-5">
            <h2 className="text-sm font-semibold text-slate-700">Photos</h2>
            {attachments.length > 0 ? (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {attachments.map((attachment) => (
                  <a
                    key={attachment.id}
                    href={`/attachments/${attachment.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="block overflow-hidden rounded-md border border-slate-200 bg-slate-50"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/attachments/${attachment.id}`}
                      alt={attachment.fileName}
                      className="aspect-video w-full object-cover"
                    />
                    <div className="truncate px-3 py-2 text-xs text-slate-600">
                      {attachment.fileName}
                    </div>
                  </a>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-slate-600">
                No photos were attached to this report.
              </p>
            )}
          </div>

          <div className="mt-6 border-t border-slate-200 pt-5">
            <h2 className="text-sm font-semibold text-slate-700">
              Duplicate review
            </h2>
            {masterReport ? (
              <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-4">
                <div className="text-sm font-semibold text-slate-900">
                  This case is linked to a primary case.
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-700">
                  Primary case:{" "}
                  <Link
                    href={`/staff/reports/${masterReport.id}`}
                    className="font-medium text-sky-700 hover:underline"
                  >
                    {masterReport.category} at {masterReport.addressText}
                  </Link>
                </p>
                {report.duplicateReviewNote ? (
                  <p className="mt-2 text-sm leading-6 text-slate-700">
                    Review note: {report.duplicateReviewNote}
                  </p>
                ) : null}
              </div>
            ) : null}

            {linkedDuplicates.length > 0 ? (
              <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-4">
                <div className="text-sm font-semibold text-slate-900">
                  Linked duplicate cases
                </div>
                <div className="mt-3 space-y-2">
                  {linkedDuplicates.map((duplicate) => (
                    <Link
                      key={duplicate.id}
                      href={`/staff/reports/${duplicate.id}`}
                      className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 hover:bg-slate-50"
                    >
                      <span>
                        <span className="font-medium">{duplicate.category}</span>
                        <span className="ml-2 text-slate-600">
                          {duplicate.addressText}
                        </span>
                      </span>
                      <span className="text-xs text-slate-500">
                        {formatStatus(duplicate.status)}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}

            {duplicateCandidates.length > 0 ? (
              <div className="mt-3 space-y-2">
                {duplicateCandidates.map((candidate) => (
                  <div
                    key={candidate.id}
                    className="rounded-md border border-amber-200 bg-amber-50 p-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="text-sm text-slate-800">
                        <Link
                          href={`/staff/reports/${candidate.id}`}
                          className="font-medium text-sky-700 hover:underline"
                        >
                          {candidate.category}
                        </Link>
                        <span className="ml-2 text-slate-600">
                          {candidate.addressText}
                        </span>
                        <div className="mt-1 text-xs text-slate-500">
                          Submitted {new Date(candidate.createdAt).toLocaleString()}
                        </div>
                      </div>
                      <div className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600">
                        {formatStatus(candidate.status)}
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <form action={markDuplicateAction}>
                        <input type="hidden" name="reportId" value={report.id} />
                        <input
                          type="hidden"
                          name="masterReportId"
                          value={candidate.id}
                        />
                        <button
                          type="submit"
                          className="rounded-md bg-amber-700 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-800"
                        >
                          Link To This Primary Case
                        </button>
                      </form>
                      <Link
                        href={`/staff/reports/${candidate.id}`}
                        className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Open Case
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-slate-600">
                No same-category reports at this location were found.
              </p>
            )}

            <form action={markDistinctAction} className="mt-4 space-y-3 rounded-md border border-slate-200 bg-slate-50 p-4">
              <input type="hidden" name="reportId" value={report.id} />
              <div className="text-sm font-semibold text-slate-900">
                Keep this case separate
              </div>
              <p className="text-sm text-slate-600">
                Use this when staff reviewed duplicate candidates and decided this report still needs its own case.
              </p>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">
                  Review note
                </span>
                <textarea
                  name="note"
                  defaultValue={report.duplicateReviewDecision === "kept_separate" ? report.duplicateReviewNote ?? "" : ""}
                  className="min-h-20 w-full rounded-md border border-slate-300 bg-white px-3 py-3 text-sm leading-6 outline-none focus:border-sky-700 focus:ring-2 focus:ring-sky-100"
                  placeholder="Optional context for why this case should stay separate."
                />
              </label>
              <button
                type="submit"
                className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                Keep Separate
              </button>
            </form>
          </div>
        </section>

        <aside className="space-y-6">
          <AiSuggestionPanel
            reportId={report.id}
            initialSuggestion={
              latestSuggestion
                ? {
                    id: latestSuggestion.id,
                    summary: latestSuggestion.summary,
                    suggestedCategory: latestSuggestion.suggestedCategory,
                    suggestedUrgency: latestSuggestion.suggestedUrgency,
                    suggestedResponsibleParty:
                      latestSuggestion.suggestedResponsibleParty,
                    suggestedAgencyId: latestSuggestion.suggestedAgencyId,
                    confidence: latestSuggestion.confidence,
                    explanation: latestSuggestion.explanation,
                    recommendedNextStep: latestSuggestion.recommendedNextStep,
                    missingInformation: latestSuggestion.missingInformation,
                    draftResponse: latestSuggestion.draftResponse,
                    model: latestSuggestion.model,
                    inputTokens: latestSuggestion.inputTokens,
                    outputTokens: latestSuggestion.outputTokens,
                    totalTokens: latestSuggestion.totalTokens,
                    feedbackDisposition: latestSuggestion.feedbackDisposition,
                    feedbackNote: latestSuggestion.feedbackNote,
                    feedbackCreatedAt: latestSuggestion.feedbackCreatedAt,
                    createdAt: latestSuggestion.createdAt,
                  }
                : null
            }
            isEnabled={aiRoutingAvailability.enabled}
            availabilityMessage={
              aiRoutingAvailability.enabled
                ? "Generate a suggestion to get an AI-assisted routing recommendation."
                : aiRoutingAvailability.reason ||
                  "AI routing is unavailable right now."
            }
            modelName={aiRoutingAvailability.model}
            maxGenerationsPerDay={
              aiRoutingAvailability.maxGenerationsPerReportPerDay
            }
          />

          <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold">Record referral</h2>
            <form action={addReferralAction} className="mt-4 space-y-4">
              <input type="hidden" name="reportId" value={report.id} />
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">
                  Managed agency
                </span>
                <select
                  name="agencyId"
                  defaultValue={routingRule?.agencyId ?? ""}
                  className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-sky-700 focus:ring-2 focus:ring-sky-100"
                >
                  <option value="">No linked agency</option>
                  {agencies.map((agency) => (
                    <option key={agency.id} value={agency.id}>
                      {agency.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">
                  Responsible party label
                </span>
                <input
                  name="agencyName"
                  required
                  defaultValue={defaultOwnerLabel}
                  className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-sky-700 focus:ring-2 focus:ring-sky-100"
                />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-700">
                    Method
                  </span>
                  <select
                    name="referralMethod"
                    defaultValue={routingRule?.agency?.defaultReferralMethod || "Email"}
                    className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-sky-700 focus:ring-2 focus:ring-sky-100"
                  >
                    <option>Email</option>
                    <option>Phone</option>
                    <option>Portal</option>
                    <option>311</option>
                    <option>Other</option>
                  </select>
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-700">
                    Initial outcome
                  </span>
                  <select
                    name="outcomeStatus"
                    defaultValue="sent"
                    className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-sky-700 focus:ring-2 focus:ring-sky-100"
                  >
                    <option value="sent">Sent</option>
                    <option value="acknowledged">Acknowledged</option>
                    <option value="work_scheduled">Work scheduled</option>
                    <option value="resolved_by_agency">Resolved by agency</option>
                    <option value="outside_jurisdiction">Outside jurisdiction</option>
                  </select>
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-700">
                    Follow-up date
                  </span>
                  <input
                    name="followUpDate"
                    type="date"
                    className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-sky-700 focus:ring-2 focus:ring-sky-100"
                  />
                </label>
              </div>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">
                  External reference
                </span>
                <input
                  name="externalReference"
                  className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-sky-700 focus:ring-2 focus:ring-sky-100"
                  placeholder="Case number, ticket ID, or portal reference"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">
                  Internal referral notes
                </span>
                <textarea
                  name="notes"
                  className="min-h-20 w-full rounded-md border border-slate-300 bg-white px-3 py-3 text-sm leading-6 outline-none focus:border-sky-700 focus:ring-2 focus:ring-sky-100"
                  placeholder="Who was contacted, what was sent, next follow-up."
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">
                  Outcome note
                </span>
                <textarea
                  name="outcomeNote"
                  className="min-h-20 w-full rounded-md border border-slate-300 bg-white px-3 py-3 text-sm leading-6 outline-none focus:border-sky-700 focus:ring-2 focus:ring-sky-100"
                  placeholder="Acknowledgement received, scheduled date, or jurisdiction notes."
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">
                  Public status note
                </span>
                <textarea
                  name="publicNote"
                  className="min-h-20 w-full rounded-md border border-slate-300 bg-white px-3 py-3 text-sm leading-6 outline-none focus:border-sky-700 focus:ring-2 focus:ring-sky-100"
                  defaultValue={`This report was referred to ${defaultOwnerLabel} for review.`}
                />
              </label>
              <button
                type="submit"
                className="rounded-md bg-sky-700 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-800"
              >
                Save Referral
              </button>
            </form>
          </section>

          <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold">Update status</h2>
            <form action={updateIssueStatusAction} className="mt-4 space-y-4">
              <input type="hidden" name="reportId" value={report.id} />
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">
                  Status
                </span>
                <select
                  name="status"
                  defaultValue={report.status}
                  className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-sky-700 focus:ring-2 focus:ring-sky-100"
                >
                  {ISSUE_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {formatStatus(status)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">
                  Public note
                </span>
                <textarea
                  name="publicNote"
                  className="min-h-24 w-full rounded-md border border-slate-300 bg-white px-3 py-3 text-sm leading-6 outline-none focus:border-sky-700 focus:ring-2 focus:ring-sky-100"
                  placeholder="Optional note shown on the tracking page"
                />
              </label>
              <button
                type="submit"
                className="rounded-md bg-sky-700 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-800"
              >
                Save Status
              </button>
            </form>
          </section>

          <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold">Internal note</h2>
            <form action={addStaffNoteAction} className="mt-4 space-y-4">
              <input type="hidden" name="reportId" value={report.id} />
              <textarea
                name="body"
                required
                className="min-h-24 w-full rounded-md border border-slate-300 bg-white px-3 py-3 text-sm leading-6 outline-none focus:border-sky-700 focus:ring-2 focus:ring-sky-100"
                placeholder="Add staff-only context, referral attempts, or next steps."
              />
              <button
                type="submit"
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
              >
                Add Note
              </button>
            </form>
          </section>
        </aside>

        <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
          <h2 className="text-lg font-semibold">Timeline</h2>
          <div className="mt-4 grid gap-6 lg:grid-cols-3">
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-700">
                Status events
              </h3>
              {events.map((event) => (
                <div key={event.id} className="border-l-2 border-sky-700 pl-4">
                  <div className="text-sm font-semibold">
                    {formatStatus(event.status)}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {new Date(event.createdAt).toLocaleString()}
                  </div>
                  {event.publicNote ? (
                    <p className="mt-2 text-sm leading-6 text-slate-700">
                      {event.publicNote}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-700">
                Referrals
              </h3>
              {referrals.length > 0 ? (
                referrals.map((referral) => (
                  <div
                    key={referral.id}
                    className="rounded-md border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="text-sm font-semibold">
                      {referral.agencyName}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {referral.referralMethod} |{" "}
                      {new Date(referral.createdAt).toLocaleString()}
                    </div>
                    <div className="mt-2 text-sm text-slate-700">
                      Outcome: {formatStatus(referral.outcomeStatus)}
                    </div>
                    {referral.externalReference ? (
                      <div className="mt-2 text-sm text-slate-700">
                        Reference: {referral.externalReference}
                      </div>
                    ) : null}
                    {referral.followUpDate ? (
                      <div className="mt-1 text-sm text-slate-700">
                        Follow-up: {referral.followUpDate}
                      </div>
                    ) : null}
                    {referral.outcomeNote ? (
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                        {referral.outcomeNote}
                      </p>
                    ) : null}
                    {referral.notes ? (
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                        {referral.notes}
                      </p>
                    ) : null}
                    <details className="mt-3">
                      <summary className="cursor-pointer text-sm font-medium text-sky-700">
                        Update referral outcome
                      </summary>
                      <form action={updateReferralOutcomeAction} className="mt-3 space-y-3">
                        <input type="hidden" name="reportId" value={report.id} />
                        <input type="hidden" name="referralId" value={referral.id} />
                        <label className="block">
                          <span className="mb-2 block text-sm font-semibold text-slate-700">
                            Outcome
                          </span>
                          <select
                            name="outcomeStatus"
                            defaultValue={referral.outcomeStatus}
                            className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-sky-700 focus:ring-2 focus:ring-sky-100"
                          >
                            <option value="sent">Sent</option>
                            <option value="acknowledged">Acknowledged</option>
                            <option value="work_scheduled">Work scheduled</option>
                            <option value="resolved_by_agency">Resolved by agency</option>
                            <option value="outside_jurisdiction">Outside jurisdiction</option>
                          </select>
                        </label>
                        <label className="block">
                          <span className="mb-2 block text-sm font-semibold text-slate-700">
                            Follow-up date
                          </span>
                          <input
                            name="followUpDate"
                            type="date"
                            defaultValue={referral.followUpDate ?? ""}
                            className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-sky-700 focus:ring-2 focus:ring-sky-100"
                          />
                        </label>
                        <label className="block">
                          <span className="mb-2 block text-sm font-semibold text-slate-700">
                            Outcome note
                          </span>
                          <textarea
                            name="outcomeNote"
                            defaultValue={referral.outcomeNote ?? ""}
                            className="min-h-20 w-full rounded-md border border-slate-300 bg-white px-3 py-3 text-sm leading-6 outline-none focus:border-sky-700 focus:ring-2 focus:ring-sky-100"
                          />
                        </label>
                        <label className="block">
                          <span className="mb-2 block text-sm font-semibold text-slate-700">
                            Internal notes
                          </span>
                          <textarea
                            name="notes"
                            defaultValue={referral.notes ?? ""}
                            className="min-h-20 w-full rounded-md border border-slate-300 bg-white px-3 py-3 text-sm leading-6 outline-none focus:border-sky-700 focus:ring-2 focus:ring-sky-100"
                          />
                        </label>
                        <button
                          type="submit"
                          className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                        >
                          Save outcome
                        </button>
                      </form>
                    </details>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-600">
                  No referrals have been recorded yet.
                </p>
              )}
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-700">
                Staff notes
              </h3>
              {notes.length > 0 ? (
                notes.map((note) => (
                  <div
                    key={note.id}
                    className="rounded-md border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="text-xs text-slate-500">
                      {new Date(note.createdAt).toLocaleString()}
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                      {note.body}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-600">
                  No internal notes have been added yet.
                </p>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
          <h2 className="text-lg font-semibold">Notification events</h2>
          <p className="mt-1 text-sm text-slate-600">
            Local stubs only. These records show what would become confirmation
            and status emails when a provider is connected.
          </p>
          <div className="mt-4 divide-y divide-slate-200">
            {notifications.map((notification) => (
              <div key={notification.id} className="py-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-medium text-slate-900">
                    {notification.subject}
                  </div>
                  <div className="text-xs uppercase tracking-[0.08em] text-slate-500">
                    {notification.deliveryStatus}
                  </div>
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  {notification.eventType} |{" "}
                  {new Date(notification.createdAt).toLocaleString()}
                </div>
                <p className="mt-2 text-slate-600">{notification.body}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
        {label}
      </div>
      <div className="mt-1 text-sm text-slate-800">{value}</div>
    </div>
  );
}
