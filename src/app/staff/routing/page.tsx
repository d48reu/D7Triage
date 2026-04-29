import Link from "next/link";
import { listAgencies, listManagedRoutingRules } from "@/lib/issues-repository";
import { requireStaffSession } from "@/lib/staff-auth";
import {
  saveAgencyAction,
  saveRoutingRuleAction,
} from "@/server-actions/routing";

export default async function RoutingGuidePage() {
  await requireStaffSession();
  const agencies = listAgencies();
  const routingRules = listManagedRoutingRules();

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
            {routingRules.map((rule) => (
              <form
                key={rule.category}
                action={saveRoutingRuleAction}
                className="rounded-md border border-slate-200 bg-slate-50 p-4"
              >
                <input type="hidden" name="category" value={rule.category} />
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
      </div>
    </main>
  );
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

function TextArea({
  name,
  label,
  defaultValue,
  className = "",
}: {
  name: string;
  label: string;
  defaultValue?: string;
  className?: string;
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
    </label>
  );
}
