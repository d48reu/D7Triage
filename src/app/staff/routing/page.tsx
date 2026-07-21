import Link from "next/link";
import { parseGeoJsonFeatures } from "@/lib/geojson-utils";
import { getStaffAssignmentEmailReadiness } from "@/lib/staff-assignment-notifications";
import {
  getJurisdictionConfig,
  listAgencies,
  listManagedRoutingRules,
  listStaffMembers,
} from "@/lib/issues-repository";
import { requireStaffSession } from "@/lib/staff-auth";
import {
  loadOfficialCommissionDistrictsAction,
  loadOfficialMunicipalitiesAction,
  saveAgencyAction,
  saveJurisdictionConfigAction,
  saveRoutingRuleAction,
  sendAssignmentTestEmailAction,
  saveStaffMemberAction,
} from "@/server-actions/routing";

export default async function RoutingGuidePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireStaffSession();
  const params = (await searchParams) ?? {};
  const assignmentEmailTest = readSearchParam(params, "assignmentEmailTest");
  const assignmentEmailMessage = readSearchParam(params, "assignmentEmailMessage");
  const agencies = listAgencies();
  const routingRules = listManagedRoutingRules();
  const staffMembers = listStaffMembers();
  const activeStaffMembers = staffMembers.filter((staffMember) => staffMember.isActive);
  const activeStaffMissingEmail = activeStaffMembers.filter(
    (staffMember) => !staffMember.email?.trim(),
  );
  const assignmentEmailReadiness = getStaffAssignmentEmailReadiness();
  const jurisdictionConfig = getJurisdictionConfig();
  const municipalityNames = Array.from(
    new Set(
      parseGeoJsonFeatures(jurisdictionConfig.municipalityBoundaryGeoJson)
        .map((feature) => String(feature.properties.NAME || "").trim())
        .filter(Boolean),
    ),
  ).sort((a, b) => a.localeCompare(b));
  const genericRules = routingRules.filter((rule) => !rule.municipalityName);
  const municipalityRules = routingRules.filter((rule) => Boolean(rule.municipalityName));

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4">
          <div>
            <Link href="/staff" className="text-sm font-medium text-sky-700">
              Staff inbox
            </Link>
            <h1 className="mt-1 text-xl font-semibold">Routing guide</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/staff/analytics"
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Analytics
            </Link>
            <Link
              href="/staff/notifications"
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Notifications
            </Link>
            <Link
              href="/report"
              className="rounded-md bg-sky-700 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-800"
            >
              New Report
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-6 px-5 py-6">
        <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">Jurisdiction hints</h2>
              <p className="mt-1 text-sm text-slate-600">
                Teach the local hint engine which neighborhoods, landmarks, or
                corridors usually mean “inside District 7” or “outside District 7.”
              </p>
            </div>
            {jurisdictionConfig.updatedAt ? (
              <div className="text-xs text-slate-500">
                Updated {new Date(jurisdictionConfig.updatedAt).toLocaleString()}
              </div>
            ) : null}
          </div>

          <form
            action={saveJurisdictionConfigAction}
            className="mt-5 grid gap-4 lg:grid-cols-2 xl:grid-cols-3"
          >
            <TextArea
              name="districtMatchKeywords"
              label="District 7 match keywords"
              defaultValue={jurisdictionConfig.districtMatchKeywords.join("\n")}
              helperText="One per line or comma-separated. Use neighborhood names, landmarks, schools, parks, or corridors that usually mean the report belongs inside District 7."
            />
            <TextArea
              name="districtOutsideKeywords"
              label="Outside-district keywords"
              defaultValue={jurisdictionConfig.districtOutsideKeywords.join("\n")}
              helperText="One per line or comma-separated. Use neighboring areas, jurisdictions, or landmarks that usually mean the report sits outside District 7."
            />
            <TextArea
              name="stateKeywords"
              label="State ownership keywords"
              defaultValue={jurisdictionConfig.stateKeywords.join("\n")}
              helperText="Use route names, freeway labels, or landmarks that usually signal state ownership."
            />
            <TextArea
              name="countyKeywords"
              label="County ownership keywords"
              defaultValue={jurisdictionConfig.countyKeywords.join("\n")}
              helperText="Use county facility names, unincorporated areas, or county-specific service clues."
            />
            <TextArea
              name="utilityKeywords"
              label="Utility keywords"
              defaultValue={jurisdictionConfig.utilityKeywords.join("\n")}
              helperText="Use provider names, water districts, or recurring utility asset phrases."
            />
            <TextArea
              name="privatePropertyKeywords"
              label="Private property keywords"
              defaultValue={jurisdictionConfig.privatePropertyKeywords.join("\n")}
              helperText="Use HOA names, apartment complexes, shopping centers, or privately managed facilities."
            />
            <TextArea
              name="schoolKeywords"
              label="School keywords"
              defaultValue={jurisdictionConfig.schoolKeywords.join("\n")}
              helperText="Use school names, district facilities, or campus landmarks."
            />
            <TextArea
              name="transitKeywords"
              label="Transit keywords"
              defaultValue={jurisdictionConfig.transitKeywords.join("\n")}
              helperText="Use transit line names, station names, or operator-specific stop references."
            />
            <TextArea
              name="parksKeywords"
              label="Parks keywords"
              defaultValue={jurisdictionConfig.parksKeywords.join("\n")}
              helperText="Use park names, trail names, recreation centers, or facility names."
            />
            <Field
              name="districtBoundaryName"
              label="Boundary dataset name"
              defaultValue={jurisdictionConfig.districtBoundaryName ?? ""}
            />
            <Field
              name="municipalityBoundaryName"
              label="Municipality boundary dataset name"
              defaultValue={jurisdictionConfig.municipalityBoundaryName ?? ""}
            />
            <Field
              name="countyCommissionDistrictsName"
              label="County commission districts dataset name"
              defaultValue={jurisdictionConfig.countyCommissionDistrictsName ?? ""}
            />
            <TextArea
              name="districtBoundaryGeoJson"
              label="District boundary GeoJSON"
              defaultValue={jurisdictionConfig.districtBoundaryGeoJson ?? ""}
              className="xl:col-span-2"
              helperText="Paste a GeoJSON Polygon, MultiPolygon, Feature, or FeatureCollection for District 7. If reports include captured coordinates, the hint engine will use this boundary before keyword matching."
            />
            <TextArea
              name="municipalityBoundaryGeoJson"
              label="Municipality boundary GeoJSON"
              defaultValue={jurisdictionConfig.municipalityBoundaryGeoJson ?? ""}
              className="xl:col-span-2"
              helperText="Paste a GeoJSON FeatureCollection for Miami-Dade municipalities, or use the official loader below."
            />
            <TextArea
              name="countyCommissionDistrictsGeoJson"
              label="County commission districts GeoJSON"
              defaultValue={jurisdictionConfig.countyCommissionDistrictsGeoJson ?? ""}
              className="xl:col-span-2"
              helperText="Paste a GeoJSON FeatureCollection for all Miami-Dade County commission districts, or use the official loader below."
            />
            <div className="xl:col-span-3 lg:col-span-2">
              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  className="rounded-md bg-sky-700 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-800"
                >
                  Save Jurisdiction Rules
                </button>
                <button
                  type="submit"
                  formAction={loadOfficialMunicipalitiesAction}
                  className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Load Official Miami-Dade Municipalities
                </button>
                <button
                  type="submit"
                  formAction={loadOfficialCommissionDistrictsAction}
                  className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Load Official County Commission Districts
                </button>
              </div>
              {municipalityNames.length > 0 ? (
                <p className="mt-3 text-xs text-slate-500">
                  Loaded municipalities: {municipalityNames.length}
                </p>
              ) : null}
              {jurisdictionConfig.countyCommissionDistrictsGeoJson ? (
                <p className="mt-1 text-xs text-slate-500">
                  County commission districts dataset is loaded.
                </p>
              ) : null}
            </div>
          </form>
        </section>

        <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">Assignment email readiness</h2>
              <p className="mt-1 text-sm text-slate-600">
                These internal emails go only to assigned staff members when a case owner changes.
              </p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-sm font-semibold ${
                assignmentEmailReadiness.ready && activeStaffMissingEmail.length === 0
                  ? "bg-emerald-100 text-emerald-900"
                  : "bg-amber-100 text-amber-900"
              }`}
            >
              {assignmentEmailReadiness.ready && activeStaffMissingEmail.length === 0
                ? "Ready"
                : "Needs setup"}
            </span>
          </div>

          {assignmentEmailMessage ? (
            <div
              className={`mt-4 rounded-md border px-4 py-3 text-sm font-medium ${
                assignmentEmailTest === "sent"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                  : "border-amber-200 bg-amber-50 text-amber-950"
              }`}
            >
              {assignmentEmailMessage}
            </div>
          ) : null}

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <ReadinessItem
              label="Assignment email"
              value={assignmentEmailReadiness.enabled ? "Enabled" : "Disabled"}
              ready={assignmentEmailReadiness.enabled}
            />
            <ReadinessItem
              label="Resend API key"
              value={assignmentEmailReadiness.hasResendApiKey ? "Configured" : "Missing"}
              ready={assignmentEmailReadiness.hasResendApiKey}
            />
            <ReadinessItem
              label="From email"
              value={assignmentEmailReadiness.fromEmail ?? "Missing"}
              ready={assignmentEmailReadiness.hasFromEmail}
            />
            <ReadinessItem
              label="Active staff emails"
              value={`${activeStaffMembers.length - activeStaffMissingEmail.length}/${activeStaffMembers.length} configured`}
              ready={activeStaffMissingEmail.length === 0}
            />
          </div>

          {assignmentEmailReadiness.ready ? (
            <p className="mt-4 text-sm leading-6 text-slate-700">
              Assign one low-risk case to yourself to confirm delivery. The case timeline
              will record whether the notification was sent, skipped, or failed.
            </p>
          ) : (
            <p className="mt-4 text-sm leading-6 text-slate-700">
              To enable assignment emails, set `RESEND_API_KEY`,
              `ISSUE_REPORT_FROM_EMAIL`, and `STAFF_ASSIGNMENT_EMAIL_ENABLED=true`
              in Render, then redeploy.
            </p>
          )}

          {activeStaffMissingEmail.length > 0 ? (
            <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
              Missing emails:{" "}
              {activeStaffMissingEmail
                .map((staffMember) => staffMember.name)
                .join(", ")}
            </div>
          ) : null}
        </section>

        <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">Staff members</h2>
              <p className="mt-1 text-sm text-slate-600">
                Manage the local list of assignable staff members for case ownership.
              </p>
            </div>
          </div>

          <form action={saveStaffMemberAction} className="mt-5 grid gap-3 border-b border-slate-200 pb-5 md:grid-cols-2 xl:grid-cols-4">
            <Field name="name" label="Staff name" required />
            <Field name="email" label="Email" type="email" />
            <Field name="title" label="Title" />
            <TextArea
              name="focusAreas"
              label="Focus areas"
              helperText="Comma-separated or sentence-style portfolio notes."
            />
            <label className="flex items-center gap-2 pt-7 text-sm text-slate-700">
              <input name="isActive" type="checkbox" defaultChecked />
              Active
            </label>
            <div className="flex items-end">
              <button
                type="submit"
                className="rounded-md bg-sky-700 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-800"
              >
                Add Staff Member
              </button>
            </div>
          </form>

          <div className="mt-5 space-y-4">
            {staffMembers.length > 0 ? (
              staffMembers.map((staffMember) => (
                <div
                  key={staffMember.id}
                  className="rounded-md border border-slate-200 bg-slate-50 p-4"
                >
                  <form
                    action={saveStaffMemberAction}
                    className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"
                  >
                    <input type="hidden" name="staffMemberId" value={staffMember.id} />
                    <Field name="name" label="Staff name" defaultValue={staffMember.name} required />
                    <Field
                      name="email"
                      label="Email"
                      type="email"
                      defaultValue={staffMember.email ?? ""}
                    />
                    <Field
                      name="title"
                      label="Title"
                      defaultValue={staffMember.title ?? ""}
                    />
                    <TextArea
                      name="focusAreas"
                      label="Focus areas"
                      defaultValue={staffMember.focusAreas ?? ""}
                      helperText="Comma-separated or sentence-style portfolio notes."
                    />
                    <label className="flex items-center gap-2 pt-7 text-sm text-slate-700">
                      <input
                        name="isActive"
                        type="checkbox"
                        defaultChecked={staffMember.isActive}
                      />
                      Active
                    </label>
                    <div className="flex items-end">
                      <button
                        type="submit"
                        className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-white"
                      >
                        Save Staff Member
                      </button>
                    </div>
                  </form>
                  <form
                    action={sendAssignmentTestEmailAction}
                    className="mt-3 flex flex-wrap items-center gap-3 border-t border-slate-200 pt-3"
                  >
                    <input type="hidden" name="staffMemberId" value={staffMember.id} />
                    <button
                      type="submit"
                      className="rounded-md border border-sky-200 bg-white px-4 py-2 text-sm font-semibold text-sky-800 hover:bg-sky-50"
                    >
                      Send Test Email
                    </button>
                    <span className="text-xs text-slate-500">
                      Sends to the saved email for {staffMember.name}.
                    </span>
                  </form>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-600">
                No staff members have been added yet.
              </p>
            )}
          </div>
        </section>

        <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">Agencies and contacts</h2>
              <p className="mt-1 text-sm text-slate-600">
                Manage agency contact records used by routing rules and case referrals.
              </p>
            </div>
          </div>

          <form action={saveAgencyAction} className="mt-5 grid gap-3 border-b border-slate-200 pb-5 md:grid-cols-2 xl:grid-cols-4">
            <Field name="name" label="Agency name" required />
            <Field name="contactName" label="Contact name" />
            <Field name="contactEmail" label="Contact email" type="email" />
            <Field name="contactPhone" label="Contact phone" />
            <Field name="contactUrl" label="Portal or URL" />
            <Field name="defaultReferralMethod" label="Default method" />
            <TextArea name="escalationNotes" label="Escalation notes" className="xl:col-span-2" />
            <label className="flex items-center gap-2 pt-7 text-sm text-slate-700">
              <input name="isActive" type="checkbox" defaultChecked />
              Active
            </label>
            <div className="flex items-end">
              <button
                type="submit"
                className="rounded-md bg-sky-700 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-800"
              >
                Add Agency
              </button>
            </div>
          </form>

          <div className="mt-5 space-y-4">
            {agencies.map((agency) => (
              <form
                key={agency.id}
                action={saveAgencyAction}
                className="grid gap-3 rounded-md border border-slate-200 bg-slate-50 p-4 md:grid-cols-2 xl:grid-cols-4"
              >
                <input type="hidden" name="agencyId" value={agency.id} />
                <Field name="name" label="Agency name" defaultValue={agency.name} required />
                <Field
                  name="contactName"
                  label="Contact name"
                  defaultValue={agency.contactName ?? ""}
                />
                <Field
                  name="contactEmail"
                  label="Contact email"
                  type="email"
                  defaultValue={agency.contactEmail ?? ""}
                />
                <Field
                  name="contactPhone"
                  label="Contact phone"
                  defaultValue={agency.contactPhone ?? ""}
                />
                <Field
                  name="contactUrl"
                  label="Portal or URL"
                  defaultValue={agency.contactUrl ?? ""}
                />
                <Field
                  name="defaultReferralMethod"
                  label="Default method"
                  defaultValue={agency.defaultReferralMethod ?? ""}
                />
                <TextArea
                  name="escalationNotes"
                  label="Escalation notes"
                  defaultValue={agency.escalationNotes ?? ""}
                  className="xl:col-span-2"
                />
                <label className="flex items-center gap-2 pt-7 text-sm text-slate-700">
                  <input
                    name="isActive"
                    type="checkbox"
                    defaultChecked={agency.isActive}
                  />
                  Active
                </label>
                <div className="flex items-end">
                  <button
                    type="submit"
                    className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-white"
                  >
                    Save Agency
                  </button>
                </div>
              </form>
            ))}
          </div>
        </section>

        <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Routing rules</h2>
          <p className="mt-1 text-sm text-slate-600">
            Each category can point to a managed agency or use a custom owner label.
          </p>

          <div className="mt-5 space-y-4">
            {genericRules.map((rule) => (
              <form
                key={`${rule.category}-default`}
                action={saveRoutingRuleAction}
                className="rounded-md border border-slate-200 bg-slate-50 p-4"
              >
                <input type="hidden" name="category" value={rule.category} />
                <input type="hidden" name="municipalityName" value="" />
                <div className="grid gap-3 md:grid-cols-[220px_1fr_1fr]">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                      Category
                    </div>
                    <div className="mt-2 font-medium text-slate-950">
                      {rule.category}
                    </div>
                  </div>
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-800">
                      Managed agency
                    </span>
                    <select
                      name="agencyId"
                      defaultValue={rule.agencyId ?? ""}
                      className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-sky-700 focus:ring-2 focus:ring-sky-100"
                    >
                      <option value="">No linked agency</option>
                      {agencies
                        .filter((agency) => agency.isActive)
                        .map((agency) => (
                          <option key={agency.id} value={agency.id}>
                            {agency.name}
                          </option>
                        ))}
                    </select>
                  </label>
                  <Field
                    name="ownerLabel"
                    label="Owner label"
                    defaultValue={rule.ownerLabel}
                    required
                  />
                </div>

                <div className="mt-4 grid gap-3 lg:grid-cols-3">
                  <TextArea
                    name="staffGuidance"
                    label="Staff guidance"
                    defaultValue={rule.staffGuidance}
                  />
                  <TextArea
                    name="residentExplanation"
                    label="Resident explanation"
                    defaultValue={rule.residentExplanation}
                  />
                  <TextArea
                    name="escalationNotes"
                    label="Escalation notes"
                    defaultValue={rule.escalationNotes}
                  />
                </div>

                <div className="mt-4 flex justify-end">
                  <button
                    type="submit"
                    className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-white"
                  >
                    Save Rule
                  </button>
                </div>
              </form>
            ))}
          </div>
        </section>

        <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Municipality overrides</h2>
          <p className="mt-1 text-sm text-slate-600">
            Add narrower routing rules for cases where the municipality changes the likely owner.
          </p>

          <form
            action={saveRoutingRuleAction}
            className="mt-5 grid gap-3 rounded-md border border-slate-200 bg-slate-50 p-4 lg:grid-cols-2 xl:grid-cols-4"
          >
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-800">
                Category
              </span>
              <select
                name="category"
                defaultValue="SIDEWALKS"
                className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-sky-700 focus:ring-2 focus:ring-sky-100"
              >
                {genericRules.map((rule) => (
                  <option key={rule.category} value={rule.category}>
                    {rule.category}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-800">
                Municipality
              </span>
              <select
                name="municipalityName"
                defaultValue={municipalityNames[0] ?? ""}
                className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-sky-700 focus:ring-2 focus:ring-sky-100"
              >
                {municipalityNames.length > 0 ? (
                  municipalityNames.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))
                ) : (
                  <option value="">Load municipality boundaries first</option>
                )}
              </select>
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-800">
                Managed agency
              </span>
              <select
                name="agencyId"
                defaultValue=""
                className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-sky-700 focus:ring-2 focus:ring-sky-100"
              >
                <option value="">No linked agency</option>
                {agencies
                  .filter((agency) => agency.isActive)
                  .map((agency) => (
                    <option key={agency.id} value={agency.id}>
                      {agency.name}
                    </option>
                  ))}
              </select>
            </label>
            <Field name="ownerLabel" label="Owner label" required />
            <TextArea name="staffGuidance" label="Staff guidance" className="xl:col-span-2" />
            <TextArea name="residentExplanation" label="Resident explanation" />
            <TextArea name="escalationNotes" label="Escalation notes" />
            <div className="xl:col-span-4">
              <button
                type="submit"
                className="rounded-md bg-sky-700 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-800"
              >
                Add Municipality Override
              </button>
            </div>
          </form>

          <div className="mt-5 space-y-4">
            {municipalityRules.length > 0 ? (
              municipalityRules.map((rule) => (
                <form
                  key={`${rule.category}-${rule.municipalityName}`}
                  action={saveRoutingRuleAction}
                  className="rounded-md border border-slate-200 bg-slate-50 p-4"
                >
                  <input type="hidden" name="category" value={rule.category} />
                  <input type="hidden" name="municipalityName" value={rule.municipalityName ?? ""} />
                  <div className="grid gap-3 md:grid-cols-[180px_180px_1fr_1fr]">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                        Category
                      </div>
                      <div className="mt-2 font-medium text-slate-950">{rule.category}</div>
                    </div>
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                        Municipality
                      </div>
                      <div className="mt-2 font-medium text-slate-950">
                        {rule.municipalityName}
                      </div>
                    </div>
                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-slate-800">
                        Managed agency
                      </span>
                      <select
                        name="agencyId"
                        defaultValue={rule.agencyId ?? ""}
                        className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-sky-700 focus:ring-2 focus:ring-sky-100"
                      >
                        <option value="">No linked agency</option>
                        {agencies
                          .filter((agency) => agency.isActive)
                          .map((agency) => (
                            <option key={agency.id} value={agency.id}>
                              {agency.name}
                            </option>
                          ))}
                      </select>
                    </label>
                    <Field
                      name="ownerLabel"
                      label="Owner label"
                      defaultValue={rule.ownerLabel}
                      required
                    />
                  </div>

                  <div className="mt-4 grid gap-3 lg:grid-cols-3">
                    <TextArea
                      name="staffGuidance"
                      label="Staff guidance"
                      defaultValue={rule.staffGuidance}
                    />
                    <TextArea
                      name="residentExplanation"
                      label="Resident explanation"
                      defaultValue={rule.residentExplanation}
                    />
                    <TextArea
                      name="escalationNotes"
                      label="Escalation notes"
                      defaultValue={rule.escalationNotes}
                    />
                  </div>

                  <div className="mt-4 flex justify-end">
                    <button
                      type="submit"
                      className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-white"
                    >
                      Save Override
                    </button>
                  </div>
                </form>
              ))
            ) : (
              <p className="text-sm text-slate-600">
                No municipality-specific overrides yet.
              </p>
            )}
          </div>
        </section>
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

function Field({
  name,
  label,
  defaultValue,
  type = "text",
  required = false,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-800">
        {label}
      </span>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        required={required}
        className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-sky-700 focus:ring-2 focus:ring-sky-100"
      />
    </label>
  );
}

function ReadinessItem({
  label,
  value,
  ready,
}: {
  label: string;
  value: string;
  ready: boolean;
}) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
        {label}
      </div>
      <div className="mt-2 flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-slate-900">{value}</span>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
            ready ? "bg-emerald-100 text-emerald-900" : "bg-amber-100 text-amber-900"
          }`}
        >
          {ready ? "OK" : "Needs setup"}
        </span>
      </div>
    </div>
  );
}

function TextArea({
  name,
  label,
  defaultValue,
  className = "",
  helperText,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  className?: string;
  helperText?: string;
}) {
  return (
    <label className={`block ${className}`.trim()}>
      <span className="mb-2 block text-sm font-medium text-slate-800">
        {label}
      </span>
      <textarea
        name={name}
        defaultValue={defaultValue}
        className="min-h-24 w-full rounded-md border border-slate-300 bg-white px-3 py-3 text-sm leading-6 outline-none focus:border-sky-700 focus:ring-2 focus:ring-sky-100"
      />
      {helperText ? (
        <p className="mt-2 text-xs leading-5 text-slate-500">{helperText}</p>
      ) : null}
    </label>
  );
}
