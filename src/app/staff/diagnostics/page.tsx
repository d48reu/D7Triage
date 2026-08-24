import { StaffHeader } from "@/components/staff-header";
import { getLatestDataBackupStatus } from "@/lib/automated-backups";
import {
  getOffsiteBackupConfiguration,
  readOffsiteBackupHealth,
} from "@/lib/offsite-backups";
import {
  getOperationalEventSummary,
  getReleaseLabel,
  listOperationalEvents,
} from "@/lib/operational-events";
import { requireStaffActionActor } from "@/lib/staff-action-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function StaffDiagnosticsPage() {
  await requireStaffActionActor();
  const [localBackup, offsiteHealth] = await Promise.all([
    getLatestDataBackupStatus(),
    readOffsiteBackupHealth(),
  ]);
  const offsiteConfig = getOffsiteBackupConfiguration();
  const events = listOperationalEvents(100);
  const summary = getOperationalEventSummary(7);

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <StaffHeader
        current="diagnostics"
        title="System Health"
        subtitle="Backup verification and privacy-safe reliability signals."
      />

      <div className="mx-auto max-w-7xl px-5 py-6">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <HealthCard
            label="Current release"
            value={getReleaseLabel()}
            detail="Use this code when reporting a problem."
          />
          <HealthCard
            label="Latest local backup"
            value={
              localBackup?.verification.ok
                ? "Verified"
                : localBackup
                  ? "Needs attention"
                  : "Not created yet"
            }
            detail={
              localBackup
                ? new Date(localBackup.createdAt).toLocaleString()
                : "The scheduled backup has not run."
            }
            tone={localBackup?.verification.ok ? "good" : "warning"}
          />
          <HealthCard
            label="Off-site backup"
            value={formatOffsiteStatus(offsiteHealth?.status, offsiteConfig.enabled)}
            detail={
              !offsiteConfig.enabled
                ? "Off-site backups are disabled in this environment."
                : offsiteHealth?.lastSuccessAt
                ? `Last success ${new Date(offsiteHealth.lastSuccessAt).toLocaleString()}`
                : offsiteConfig.configured
                  ? "Waiting for the next scheduled backup."
                  : "S3-compatible storage credentials are still required."
            }
            tone={offsiteHealth?.status === "success" ? "good" : "warning"}
          />
          <HealthCard
            label="Save failures · 7 days"
            value={String(summary.failed ?? 0)}
            detail={`${summary.conflict ?? 0} edit conflict${
              (summary.conflict ?? 0) === 1 ? "" : "s"
            } recorded.`}
            tone={(summary.failed ?? 0) > 0 ? "warning" : "good"}
          />
        </section>

        {localBackup && !localBackup.verification.ok ? (
          <section className="mt-6 rounded-md border border-rose-200 bg-rose-50 p-4 text-sm text-rose-950">
            <h2 className="font-semibold">Local backup verification failed</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {localBackup.verification.errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          </section>
        ) : null}

        {offsiteConfig.enabled && !offsiteConfig.configured ? (
          <section className="mt-6 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
            <h2 className="font-semibold">Off-site backup setup is incomplete</h2>
            <p className="mt-1">
              Missing: {offsiteConfig.missingVariables.join(", ")}.
            </p>
          </section>
        ) : null}

        <section className="mt-6 overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-lg font-semibold">Recent reliability events</h2>
            <p className="mt-1 text-sm text-slate-600">
              These entries contain operation codes and device dimensions only—never
              constituent names, addresses, notes, or form contents.
            </p>
          </div>
          {events.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">When</th>
                    <th className="px-4 py-3">Operation</th>
                    <th className="px-4 py-3">Outcome</th>
                    <th className="px-4 py-3">Error code</th>
                    <th className="px-4 py-3">Browser</th>
                    <th className="px-4 py-3">Viewport</th>
                    <th className="px-4 py-3">Release</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {events.map((event) => (
                    <tr key={event.id}>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                        {new Date(event.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 font-medium">{event.action}</td>
                      <td className="px-4 py-3">{event.outcome}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {event.errorCode ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {event.browserFamily ?? "Server"}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {event.viewportWidth && event.viewportHeight
                          ? `${event.viewportWidth} × ${event.viewportHeight}`
                          : "—"}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-600">
                        {event.release}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-5 py-8 text-sm text-slate-600">
              No reliability events have been recorded yet.
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function HealthCard({
  label,
  value,
  detail,
  tone = "neutral",
}: {
  label: string;
  value: string;
  detail: string;
  tone?: "neutral" | "good" | "warning";
}) {
  const toneClass =
    tone === "good"
      ? "border-emerald-200 bg-emerald-50"
      : tone === "warning"
        ? "border-amber-200 bg-amber-50"
        : "border-slate-200 bg-white";
  return (
    <div className={`rounded-md border p-4 shadow-sm ${toneClass}`}>
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-2 text-xl font-semibold">{value}</div>
      <div className="mt-1 text-sm text-slate-600">{detail}</div>
    </div>
  );
}

function formatOffsiteStatus(
  status: string | undefined,
  enabled: boolean,
) {
  if (!enabled) return "Disabled";
  if (status === "success") return "Verified";
  if (status === "error") return "Needs attention";
  if (status === "not_configured") return "Setup required";
  return "Waiting to run";
}
