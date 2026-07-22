import Link from "next/link";
import { notFound } from "next/navigation";
import { AiSuggestionPanel } from "@/components/ai-suggestion-panel";
import { BoundaryPreview } from "@/components/boundary-preview";
import { DemoSiteNotice } from "@/components/demo-site-notice";
import { StaffHeader } from "@/components/staff-header";
import { getAiRoutingAvailability } from "@/lib/ai-routing";
import { isDemoMode } from "@/lib/demo-mode";
import { formatStatus, ISSUE_STATUSES } from "@/lib/issue-types";
import {
  analyzeReportJurisdiction,
  formatDistrictHintStatus,
  formatOwnershipHint,
} from "@/lib/jurisdiction";
import { findCountyCommissionDistrictForPoint } from "@/lib/location-intelligence";
import {
  findPotentialDuplicates,
  formatStaffMemberLabel,
  getCurrentAssignmentAcknowledgment,
  getJurisdictionConfig,
  getLatestAiSuggestion,
  getManagedRoutingRule,
  getNotificationTemplateMap,
  getIssueReportById,
  listIssueAuditEvents,
  listLinkedDuplicateReports,
  listAgencies,
  listAttachments,
  listNotificationEvents,
  listReferrals,
  listStaffMembers,
  listStaffNotes,
  listStatusEvents,
} from "@/lib/issues-repository";
import { requireStaffSession } from "@/lib/staff-auth";
import {
  addReferralAction,
  acknowledgeAssignmentAction,
  addIssuePhotosAction,
  addStaffNoteAction,
  markDistinctAction,
  markDuplicateAction,
  refreshLocationIntelligenceAction,
  saveQuickTriageAction,
  updateReferralOutcomeAction,
  updateIssueStatusAction,
} from "@/server-actions/issues";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function StaffReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireStaffSession();
  const { id } = await params;
  const query = (await searchParams) ?? {};
  const demoMode = isDemoMode();
  const detailsSaved =
    (Array.isArray(query.detailsSaved)
      ? query.detailsSaved[0]
      : query.detailsSaved) === "1";
  const triageSaved =
    (Array.isArray(query.triageSaved)
      ? query.triageSaved[0]
      : query.triageSaved) === "1";
  const photoSaved =
    (Array.isArray(query.photoSaved) ? query.photoSaved[0] : query.photoSaved) ===
    "1";
  const acknowledged =
    (Array.isArray(query.acknowledged) ? query.acknowledged[0] : query.acknowledged) ===
    "1";
  const report = getIssueReportById(id);

  if (!report) {
    notFound();
  }

  const events = listStatusEvents(report.id);
  const notes = listStaffNotes(report.id);
  const auditEvents = listIssueAuditEvents(report.id);
  const referrals = listReferrals(report.id);
  const agencies = listAgencies().filter((agency) => agency.isActive);
  const allStaffMembers = listStaffMembers();
  const staffMembers = allStaffMembers.filter((staffMember) => staffMember.isActive);
  const attachments = listAttachments(report.id);
  const notifications = listNotificationEvents(report.id);
  const duplicateCandidates = findPotentialDuplicates(report);
  const linkedDuplicates = listLinkedDuplicateReports(report.id);
  const routingRule = getManagedRoutingRule(report.category, report.municipalityName);
  const latestSuggestion = getLatestAiSuggestion(report.id);
  const aiRoutingAvailability = getAiRoutingAvailability();
  const jurisdictionConfig = getJurisdictionConfig();
  const notificationTemplateMap = getNotificationTemplateMap();
  const jurisdiction = analyzeReportJurisdiction(report, jurisdictionConfig);
  const countyCommissionDistrict = findCountyCommissionDistrictForPoint(
    report.latitude,
    report.longitude,
    jurisdictionConfig,
  );
  const isLikelyOutsideDistrict =
    jurisdiction.districtHintStatus === "likely_outside_district";
  const defaultOwnerLabel = routingRule?.ownerLabel ?? "District 7 triage";
  const masterReport = report.duplicateOfReportId
    ? getIssueReportById(report.duplicateOfReportId)
    : null;
  const assignedStaffMember = report.assignedStaffId
    ? allStaffMembers.find((staffMember) => staffMember.id === report.assignedStaffId) ?? null
    : null;
  const assignmentAcknowledgment = getCurrentAssignmentAcknowledgment(report);
  const triageItems = buildCaseTriageItems({
    status: report.status,
    assigned: Boolean(report.assignedStaffId),
    referralsCount: referrals.length,
    districtHintStatus: jurisdiction.districtHintStatus,
    geocodingStatus: report.geocodingStatus,
    latestAiFeedbackDisposition: latestSuggestion
      ? latestSuggestion.feedbackDisposition
      : undefined,
    description: report.description,
  });
  const suggestedNoteTemplates = buildSuggestedNoteTemplates({
    isLikelyInternalTest: triageItems.some((item) => item.label === "Internal test?"),
    districtUnclear: jurisdiction.districtHintStatus === "unclear",
    aiFeedbackPending: Boolean(latestSuggestion && !latestSuggestion.feedbackDisposition),
    hasReferral: referrals.length > 0,
  });

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <StaffHeader
        current="case"
        title="Case detail"
        subtitle={`${report.category} at ${report.addressText}`}
      />

      <div className="mx-auto grid max-w-7xl gap-5 px-5 py-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-md border border-sky-200 bg-white p-5 shadow-sm lg:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-800">
                Quick triage
              </p>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
                Set owner, status, and first updates
              </h2>
              <div className="mt-2 flex flex-wrap gap-2 text-sm text-slate-700">
                <span className="rounded-full bg-slate-100 px-3 py-1 font-medium">
                  {report.category}
                </span>
                <span className="rounded-full bg-slate-100 px-3 py-1">
                  {report.addressText}
                </span>
                <span className="rounded-full bg-slate-100 px-3 py-1">
                  Current: {formatStatus(report.status)}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/staff/reports/${report.id}/edit`}
                className="rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-800 hover:bg-sky-100"
              >
                Edit Details
              </Link>
              <Link
                href={`/report/${report.publicTrackingToken}`}
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Tracking Page
              </Link>
            </div>
          </div>

          {triageSaved ? (
            <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900">
              Quick triage saved.
            </div>
          ) : null}

          {acknowledged ? (
            <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900">
              Assignment acknowledged.
            </div>
          ) : null}

          <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Issue description
            </div>
            <p className="mt-2 whitespace-pre-wrap text-base leading-7 text-slate-900">
              {report.description}
            </p>
          </div>

          <form
            action={saveQuickTriageAction}
            className="mt-5 grid gap-4 xl:grid-cols-[0.9fr_0.9fr_1.1fr_1.1fr_auto]"
          >
            <input type="hidden" name="reportId" value={report.id} />
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-800">
                Owner
              </span>
              <select
                name="staffMemberId"
                defaultValue={report.assignedStaffId ?? ""}
                className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-sky-700 focus:ring-2 focus:ring-sky-100"
              >
                <option value="">Unassigned</option>
                {staffMembers.map((staffMember) => (
                  <option key={staffMember.id} value={staffMember.id}>
                    {formatStaffMemberLabel(staffMember)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-800">
                Status
              </span>
              <select
                name="status"
                required
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
              <span className="mb-2 block text-sm font-semibold text-slate-800">
                Internal update
              </span>
              <textarea
                name="internalNote"
                className="min-h-20 w-full rounded-md border border-slate-300 bg-white px-3 py-3 text-sm leading-6 outline-none focus:border-sky-700 focus:ring-2 focus:ring-sky-100"
                placeholder="Staff-only next step, context, or follow-up."
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-800">
                Public note
              </span>
              <textarea
                name="publicNote"
                className="min-h-20 w-full rounded-md border border-slate-300 bg-white px-3 py-3 text-sm leading-6 outline-none focus:border-sky-700 focus:ring-2 focus:ring-sky-100"
                placeholder="Optional update shown on the tracking page."
              />
            </label>
            <div className="flex items-end">
              <button
                type="submit"
                className="h-11 w-full rounded-md bg-sky-700 px-5 text-sm font-semibold text-white hover:bg-sky-800 xl:w-auto"
              >
                Save Triage
              </button>
            </div>
          </form>

          {assignedStaffMember ? (
            <div
              className={`mt-4 rounded-md border p-4 ${
                assignmentAcknowledgment
                  ? "border-emerald-200 bg-emerald-50"
                  : "border-amber-200 bg-amber-50"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    Assignment acknowledgment
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-slate-700">
                    {assignmentAcknowledgment
                      ? `${assignedStaffMember.name} acknowledged this assignment on ${new Date(
                          assignmentAcknowledgment.createdAt,
                        ).toLocaleString()}.`
                      : `${assignedStaffMember.name} has not acknowledged this assignment yet.`}
                  </p>
                </div>
                {!assignmentAcknowledgment ? (
                  <form action={acknowledgeAssignmentAction}>
                    <input type="hidden" name="reportId" value={report.id} />
                    <input
                      type="hidden"
                      name="staffMemberId"
                      value={assignedStaffMember.id}
                    />
                    <input
                      type="hidden"
                      name="returnTo"
                      value={`/staff/reports/${report.id}`}
                    />
                    <button
                      type="submit"
                      className="rounded-md bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700"
                    >
                      Acknowledge
                    </button>
                  </form>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="mt-4 rounded-md border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Attach photo
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  Current photos: {attachments.length}. JPEG, PNG, WebP, or GIF,
                  8 MB each.
                </p>
              </div>
              {photoSaved ? (
                <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-900">
                  Photo uploaded.
                </div>
              ) : null}
            </div>
            <form
              action={addIssuePhotosAction}
              className="mt-3 grid gap-3 md:grid-cols-[1fr_auto]"
            >
              <input type="hidden" name="reportId" value={report.id} />
              <input
                name="photos"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                multiple
                className="block w-full rounded-md border border-slate-300 bg-white text-sm text-slate-700 file:mr-4 file:h-11 file:border-0 file:bg-slate-100 file:px-4 file:text-sm file:font-semibold file:text-slate-700 hover:file:bg-slate-200"
              />
              <button
                type="submit"
                className="h-11 rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Upload Photo
              </button>
            </form>
          </div>

          <div className="mt-4 grid gap-3 text-sm text-slate-700 md:grid-cols-3">
            <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
              <span className="font-semibold text-slate-900">Needs review:</span>{" "}
              location or owner still needs checking.
            </div>
            <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
              <span className="font-semibold text-slate-900">Routed:</span>{" "}
              referral was sent and logged.
            </div>
            <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
              <span className="font-semibold text-slate-900">Awaiting agency:</span>{" "}
              staff is waiting on a response.
            </div>
          </div>
        </section>

        <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
          {demoMode ? (
            <div className="mb-5">
              <DemoSiteNotice body="This hosted demo keeps AI routing live on seeded cases. Other edits may reset between sessions, so treat staff-side changes here as temporary." />
            </div>
          ) : null}
          {detailsSaved ? (
            <div className="mb-5 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900">
              Case details saved.
            </div>
          ) : null}

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
              Confidence basis: {jurisdiction.confidenceReason}
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
            <BoundaryPreview
              boundaryGeoJson={jurisdictionConfig.districtBoundaryGeoJson}
              boundaryName={jurisdictionConfig.districtBoundaryName}
              latitude={report.latitude}
              longitude={report.longitude}
              districtStatusLabel={formatDistrictHintStatus(
                jurisdiction.districtHintStatus,
              )}
            />
          </div>

          {isLikelyOutsideDistrict ? (
            <div className="mt-5 rounded-md border border-rose-200 bg-rose-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-rose-800">
                Outside-district review
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-800">
                This case looks outside Miami-Dade County District 7. Staff can still
                review and re-route it, but it likely needs an outside-jurisdiction
                response.
              </p>
            </div>
          ) : null}

          <div className="mt-5 grid gap-4 border-t border-slate-200 pt-5 sm:grid-cols-2">
            <Detail label="Location" value={report.addressText} />
            <Detail
              label="Coordinates"
              value={
                report.latitude !== null && report.longitude !== null
                  ? `${report.latitude}, ${report.longitude}`
                  : "Not captured"
              }
            />
            <Detail
              label="Location source"
              value={formatLocationSource(report.locationSource)}
            />
            <Detail
              label="Municipality"
              value={report.municipalityName || "Not resolved"}
            />
            <Detail
              label="County commission district"
              value={
                countyCommissionDistrict
                  ? countyCommissionDistrict.commissionerName
                    ? `${countyCommissionDistrict.districtNumber} (${countyCommissionDistrict.commissionerName})`
                    : countyCommissionDistrict.districtNumber
                  : "Not resolved"
              }
            />
            <Detail
              label="Municipality lookup"
              value={formatLookupStatus(report.municipalityLookupStatus)}
            />
            <Detail
              label="Geocoding"
              value={formatGeocodingStatus(report.geocodingStatus)}
            />
            <Detail
              label="Matched address"
              value={report.geocodedAddress || "Not available"}
            />
            <Detail
              label="Parcel lookup"
              value={formatLookupStatus(report.parcelLookupStatus)}
            />
            <Detail
              label="Right-of-way hint"
              value={formatRightOfWayHint(report.rightOfWayHint)}
            />
            <Detail label="Parcel folio" value={report.parcelFolio || "Not available"} />
            <Detail label="Parcel address" value={report.parcelAddress || "Not available"} />
            <Detail label="Parcel owner" value={report.parcelOwner || "Not available"} />
            <Detail label="Email" value={report.residentEmail} />
            <Detail label="Name" value={report.residentName || "Not provided"} />
            <Detail label="Phone" value={report.residentPhone || "Not provided"} />
            <Detail label="Language" value={report.preferredLanguage} />
            <Detail
              label="Newsletter"
              value={report.newsletterOptIn ? "Opted in" : "Case updates only"}
            />
            <Detail
              label="Notification review"
              value={
                report.notificationReviewStatus
                  ? formatStatus(report.notificationReviewStatus)
                  : "Not reviewed"
              }
            />
            <Detail
              label="Assigned staff"
              value={
                assignedStaffMember
                  ? formatStaffMemberLabel(assignedStaffMember)
                  : "Unassigned"
              }
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
            <form action={refreshLocationIntelligenceAction} className="mt-4">
              <input type="hidden" name="reportId" value={report.id} />
              <button
                type="submit"
                className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Refresh Location Intelligence
              </button>
            </form>
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
          <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold">Triage checklist</h2>
            <p className="mt-1 text-sm text-slate-600">
              Work these items before leaving the case.
            </p>
            {triageItems.length > 0 ? (
              <div className="mt-4 space-y-2">
                {triageItems.map((item) => (
                  <div
                    key={item.label}
                    className={`rounded-md border px-3 py-2 text-sm ${
                      item.tone === "urgent"
                        ? "border-rose-200 bg-rose-50 text-rose-900"
                        : item.tone === "warning"
                          ? "border-amber-200 bg-amber-50 text-amber-950"
                          : "border-slate-200 bg-slate-50 text-slate-700"
                    }`}
                  >
                    <div className="font-semibold">{item.label}</div>
                    <div className="mt-1 leading-5">{item.detail}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
                No obvious triage gaps are flagged for this case.
              </div>
            )}
          </section>

          {isLikelyOutsideDistrict ? (
            <section className="rounded-md border border-rose-200 bg-rose-50 p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-950">
                Likely outside District 7
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-700">
                If staff confirms this is outside the district, use the quick close
                action below. It will mark the case accordingly and add a resident-facing
                note to the timeline.
              </p>
              {countyCommissionDistrict ? (
                <p className="mt-3 text-sm leading-6 text-slate-800">
                  Likely neighboring county district:{" "}
                  <span className="font-semibold">
                    District {countyCommissionDistrict.districtNumber}
                  </span>
                  {countyCommissionDistrict.commissionerName
                    ? ` (${countyCommissionDistrict.commissionerName})`
                    : ""}.
                </p>
              ) : null}
              <form action={updateIssueStatusAction} className="mt-4 space-y-3">
                <input type="hidden" name="reportId" value={report.id} />
                <input
                  type="hidden"
                  name="status"
                  value="closed_outside_jurisdiction"
                />
                <input
                  type="hidden"
                  name="publicNote"
                  value="This report appears to be outside Miami-Dade County District 7. District 7 staff reviewed it and may route it to the appropriate office when possible."
                />
                <button
                  type="submit"
                  className="rounded-md bg-rose-700 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-800"
                >
                  Close As Outside Jurisdiction
                </button>
              </form>
              <p className="mt-3 text-xs leading-5 text-slate-600">
                Suggested resident wording: This report appears to be outside Miami-Dade
                County District 7. District 7 staff reviewed it and may route it to the
                appropriate office when possible.
              </p>
            </section>
          ) : null}

          <AiSuggestionPanel
            reportId={report.id}
            reportCategory={report.category}
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
            allowFeedback={!demoMode}
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
            <h2 className="text-lg font-semibold">Internal update</h2>
            <div className="mt-3 space-y-2">
              {suggestedNoteTemplates.map((template) => (
                <details
                  key={template.label}
                  className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                >
                  <summary className="cursor-pointer font-medium text-slate-800">
                    {template.label}
                  </summary>
                  <p className="mt-2 whitespace-pre-wrap leading-6 text-slate-700">
                    {template.body}
                  </p>
                </details>
              ))}
            </div>
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
                Add Update
              </button>
            </form>
          </section>
        </aside>

        <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
          <h2 className="text-lg font-semibold">Timeline</h2>
          <div className="mt-4 grid gap-6 lg:grid-cols-2 xl:grid-cols-4">
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
                            Internal referral updates
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
                Internal updates
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
                  No internal updates have been added yet.
                </p>
              )}
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-700">
                Audit history
              </h3>
              {auditEvents.length > 0 ? (
                auditEvents.map((event) => (
                  <div
                    key={event.id}
                    className="rounded-md border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="text-sm font-semibold">{event.fieldLabel}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      {event.actorLabel} |{" "}
                      {new Date(event.createdAt).toLocaleString()}
                    </div>
                    <div className="mt-3 space-y-3 text-xs text-slate-600">
                      <div>
                        <div className="font-semibold uppercase tracking-[0.08em]">
                          Before
                        </div>
                        <p className="mt-1 break-words whitespace-pre-wrap text-sm leading-5 text-slate-800">
                          {event.oldValue || "Blank"}
                        </p>
                      </div>
                      <div>
                        <div className="font-semibold uppercase tracking-[0.08em]">
                          After
                        </div>
                        <p className="mt-1 break-words whitespace-pre-wrap text-sm leading-5 text-slate-800">
                          {event.newValue || "Blank"}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-600">
                  No case detail edits have been recorded yet.
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
                <div className="mt-1 text-xs text-slate-500">
                  {describeNotificationTemplateVersion(
                    notification.templateKey,
                    notification.templateUpdatedAt,
                    notificationTemplateMap,
                  )}
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

function buildCaseTriageItems(input: {
  status: string;
  assigned: boolean;
  referralsCount: number;
  districtHintStatus: string;
  geocodingStatus: string;
  latestAiFeedbackDisposition?: string | null;
  description: string;
}) {
  const items: Array<{
    label: string;
    detail: string;
    tone: "urgent" | "warning" | "neutral";
  }> = [];
  const isClosed = [
    "resolved",
    "closed_outside_jurisdiction",
    "closed_duplicate",
  ].includes(input.status);

  if (input.status === "received") {
    items.push({
      label: "Move out of received",
      detail: "Set a working status once staff has reviewed, routed, or resolved it.",
      tone: "urgent",
    });
  }

  if (!input.assigned && !isClosed) {
    items.push({
      label: "Assign owner",
      detail: "Choose a staff owner when follow-up is expected.",
      tone: "warning",
    });
  }

  if (
    input.referralsCount === 0 &&
    ["routed", "awaiting_agency", "follow_up_due"].includes(input.status)
  ) {
    items.push({
      label: "Referral missing",
      detail: "This status implies a handoff, but no referral has been logged yet.",
      tone: "urgent",
    });
  }

  if (input.districtHintStatus === "unclear" || input.geocodingStatus === "failed") {
    items.push({
      label: "Confirm location",
      detail: "The app could not confidently place this address or corridor.",
      tone: "warning",
    });
  }

  if (input.latestAiFeedbackDisposition === null) {
    items.push({
      label: "Review AI suggestion",
      detail: "Accept, accept with edits, or reject the latest AI suggestion.",
      tone: "neutral",
    });
  }

  if (/\b(test|smoke|persistence|upload test|body limit)\b/i.test(input.description)) {
    items.push({
      label: "Internal test?",
      detail: "If this is only a pilot test record, add a note and mark it resolved.",
      tone: "neutral",
    });
  }

  return items;
}

function buildSuggestedNoteTemplates(input: {
  isLikelyInternalTest: boolean;
  districtUnclear: boolean;
  aiFeedbackPending: boolean;
  hasReferral: boolean;
}) {
  const templates = [
    {
      label: "Referral already started",
      body:
        "Staff referral/contact already initiated before this case was triaged in the app. Logged here so the pilot record reflects current follow-up status.",
    },
    {
      label: "Manual routing review",
      body:
        "Staff reviewed the case details and selected the routing/status manually based on current office handling.",
    },
  ];

  if (input.districtUnclear) {
    templates.push({
      label: "Location manually reviewed",
      body:
        "Address/corridor language did not geocode cleanly. Staff manually reviewed the location before routing.",
    });
  }

  if (input.aiFeedbackPending) {
    templates.push({
      label: "Bad AI suggestion",
      body:
        "AI suggestion rejected because the suggested category/responsible party did not match the case facts. Staff triaged manually.",
    });
  }

  if (input.isLikelyInternalTest) {
    templates.push({
      label: "Internal test record",
      body:
        "Internal pilot test record. Used to verify upload/persistence/edit behavior. No constituent follow-up needed.",
    });
  }

  if (input.hasReferral) {
    templates.push({
      label: "Follow-up pending",
      body:
        "Referral has been logged. Staff is waiting on agency/department response before the next status update.",
    });
  }

  return templates;
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

function describeNotificationTemplateVersion(
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
    return `${currentTemplate.label}: matches current template.`;
  }

  return `${currentTemplate.label}: current template changed after this stub was logged.`;
}

function formatLocationSource(value: "device" | "census_geocoder" | "none") {
  switch (value) {
    case "device":
      return "Device location";
    case "census_geocoder":
      return "Census geocoder";
    default:
      return "Not captured";
  }
}

function formatGeocodingStatus(
  value: "captured" | "matched" | "failed" | "not_attempted",
) {
  switch (value) {
    case "captured":
      return "Coordinates captured from device";
    case "matched":
      return "Address matched automatically";
    case "failed":
      return "Address could not be matched";
    default:
      return "Not attempted";
  }
}

function formatLookupStatus(value: string) {
  switch (value) {
    case "matched":
      return "Matched";
    case "outside_municipality":
      return "Outside known municipality";
    case "probable_right_of_way":
      return "Probable right-of-way";
    case "failed":
      return "Lookup failed";
    default:
      return "Not attempted";
  }
}

function formatRightOfWayHint(
  value: "on_parcel" | "probable_public_right_of_way" | "unclear",
) {
  switch (value) {
    case "on_parcel":
      return "Point falls on a parcel";
    case "probable_public_right_of_way":
      return "Point appears outside a parcel";
    default:
      return "Unclear";
  }
}
