import Link from "next/link";
import type { ReactNode } from "react";
import { logoutStaffAction } from "@/server-actions/auth";

type StaffSection =
  | "command"
  | "intake"
  | "assignments"
  | "events"
  | "case"
  | "routing"
  | "analytics"
  | "notifications"
  | "history";

export function StaffHeader({
  current,
  title,
  subtitle,
}: {
  current: StaffSection;
  title: string;
  subtitle?: string;
}) {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-4 md:flex-row md:items-center md:justify-between">
        <div>
          <Link href="/staff" className="text-sm font-medium text-sky-700">
            District 7 Issue Reporter
          </Link>
          <h1 className="mt-1 text-xl font-semibold">{title}</h1>
          {subtitle ? (
            <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
          ) : null}
        </div>
        <nav className="flex flex-wrap items-center justify-end gap-2">
          <Link
            href="/staff"
            className={navClass(current === "command")}
          >
            Case Dashboard
          </Link>
          <Link
            href="/staff/intake-board"
            className={
              current === "intake"
                ? "rounded-md bg-sky-800 px-4 py-2 text-sm font-semibold text-white"
                : "rounded-md bg-sky-700 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-800"
            }
          >
            Intake Board
          </Link>
          <Link
            href="/staff/my"
            className={navClass(current === "assignments")}
          >
            My Assignments
          </Link>
          <Link
            href="/staff/events"
            className={navClass(current === "events")}
          >
            Events
          </Link>
          <details className="relative">
            <summary
              className={`${navClass(
                current === "routing" ||
                  current === "analytics" ||
                  current === "notifications" ||
                  current === "history",
              )} cursor-pointer list-none [&::-webkit-details-marker]:hidden`}
            >
              Tools
            </summary>
            <div className="absolute right-0 z-10 mt-2 w-52 rounded-md border border-slate-200 bg-white p-2 shadow-lg">
              <ToolLink href="/staff/routing" active={current === "routing"}>
                Routing + Staff
              </ToolLink>
              <ToolLink href="/staff/analytics" active={current === "analytics"}>
                Analytics
              </ToolLink>
              <ToolLink
                href="/staff/notifications"
                active={current === "notifications"}
              >
                Notifications
              </ToolLink>
              <ToolLink href="/staff/history" active={current === "history"}>
                Historical Archive
              </ToolLink>
            </div>
          </details>
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
  );
}

function ToolLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`block rounded px-3 py-2 text-sm font-semibold ${
        active ? "bg-sky-50 text-sky-800" : "text-slate-700 hover:bg-slate-50"
      }`}
    >
      {children}
    </Link>
  );
}

function navClass(active: boolean) {
  return `rounded-md border px-4 py-2 text-sm font-semibold ${
    active
      ? "border-sky-200 bg-sky-50 text-sky-800"
      : "border-slate-300 text-slate-700 hover:bg-slate-50"
  }`;
}
