import Link from "next/link";
import { StaffLoginForm } from "@/components/staff-login-form";
import { getStaffAuthConfiguration } from "@/lib/staff-auth";

export default function StaffLoginPage() {
  const authConfig = getStaffAuthConfiguration();

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <div className="mx-auto max-w-md px-5 py-12">
        <Link href="/" className="text-sm font-medium text-sky-700">
          District 7 Issue Reporter
        </Link>

        <section className="mt-6 rounded-md border border-slate-200 bg-white p-5 shadow-sm">
          <h1 className="text-xl font-semibold">Staff sign in</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            This is local prototype auth. Set `STAFF_PASSWORD` in `.env.local`
            before sharing the staff views beyond your machine, and add
            `STAFF_SESSION_SECRET` before any broader pilot.
          </p>
          <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700">
            <div>
              Session length: {authConfig.sessionMaxAgeHours} hours
            </div>
            <div>
              Password source:{" "}
              {authConfig.usingDefaultPassword ? "development fallback" : ".env.local"}
            </div>
            <div>
              Session signing secret:{" "}
              {authConfig.usingDedicatedSessionSecret
                ? "separate secret configured"
                : "derived from the staff password"}
            </div>
          </div>
          <StaffLoginForm />
        </section>
      </div>
    </main>
  );
}
