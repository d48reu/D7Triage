import { DemoSiteNotice } from "@/components/demo-site-notice";
import Link from "next/link";
import { StaffLoginForm } from "@/components/staff-login-form";
import { isDemoMode } from "@/lib/demo-mode";
import { getStaffAuthConfiguration } from "@/lib/staff-auth";
import { listStaffMembers } from "@/lib/issues-repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default function StaffLoginPage() {
  const authConfig = getStaffAuthConfiguration();
  const demoMode = isDemoMode();
  const staffMembers = listStaffMembers()
    .filter((staffMember) => staffMember.isActive)
    .map((staffMember) => ({
      id: staffMember.id,
      name: staffMember.name,
    }));

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <div className="mx-auto max-w-md px-5 py-12">
        <Link href="/" className="text-sm font-medium text-sky-700">
          District 7 Issue Reporter
        </Link>

        {demoMode ? (
          <div className="mt-6">
            <DemoSiteNotice body="This hosted demo uses a shared staff password so reviewers can explore the inbox and live AI routing flow." />
          </div>
        ) : null}

        <section className="mt-6 rounded-md border border-slate-200 bg-white p-5 shadow-sm">
          <h1 className="text-xl font-semibold">Staff sign in</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {demoMode
              ? "This demo uses lightweight password-based staff access. It is enough for review and walkthroughs, but not a production identity system."
              : "Choose your name and enter the individual password issued to you."}
          </p>
          <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700">
            <div>
              Session length: {authConfig.sessionMaxAgeHours} hours
            </div>
            <div>
              Password access: {authConfig.individualPasswordCount} individual, {" "}
              {authConfig.legacyPasswordStaffCount} existing password retained
            </div>
            {authConfig.sharedPasswordFallbackEnabled ? (
              <div>Development/demo shared-password fallback: enabled</div>
            ) : null}
            <div>
              Session signing secret:{" "}
              {authConfig.usingDedicatedSessionSecret
                ? "separate secret configured"
                : "derived from the staff password"}
            </div>
          </div>
          <StaffLoginForm staffMembers={staffMembers} />
        </section>
      </div>
    </main>
  );
}
