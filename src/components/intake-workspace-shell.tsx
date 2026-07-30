"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";

const SIDEBAR_STORAGE_KEY = "district7.intake-sidebar-collapsed.v1";

const STAFF_LINKS = [
  { href: "/staff", label: "Case Dashboard", shortLabel: "CD" },
  { href: "/staff/my", label: "My Assignments", shortLabel: "MA" },
  { href: "/staff/routing", label: "Routing + Staff", shortLabel: "RS" },
  { href: "/staff/analytics", label: "Analytics", shortLabel: "AN" },
  { href: "/staff/notifications", label: "Notifications", shortLabel: "NT" },
  { href: "/staff/history", label: "Historical Archive", shortLabel: "HA" },
] as const;

export function IntakeWorkspaceShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const loadTimer = window.setTimeout(() => {
      try {
        setCollapsed(
          window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === "true",
        );
      } catch {
        // Sidebar preference is best-effort.
      }
    }, 0);

    return () => window.clearTimeout(loadTimer);
  }, []);

  function toggleSidebar() {
    const nextCollapsed = !collapsed;
    setCollapsed(nextCollapsed);
    try {
      window.localStorage.setItem(
        SIDEBAR_STORAGE_KEY,
        String(nextCollapsed),
      );
    } catch {
      // Sidebar preference is best-effort.
    }
    window.requestAnimationFrame(() => {
      window.dispatchEvent(new Event("resize"));
    });
  }

  return (
    <div
      className={`grid min-h-0 transition-[grid-template-columns] duration-150 max-lg:grid-cols-1 ${
        collapsed
          ? "grid-cols-[64px_minmax(0,1fr)]"
          : "grid-cols-[248px_minmax(0,1fr)]"
      }`}
    >
      <aside className="overflow-hidden border-r border-[#d9e0ef] bg-white px-3 py-3 max-lg:hidden">
        <div className={`mb-2 flex ${collapsed ? "justify-center" : "justify-end"}`}>
          <button
            type="button"
            onClick={toggleSidebar}
            className="flex h-8 items-center justify-center gap-2 rounded border border-[#c9d3e8] bg-white px-2 text-xs font-semibold text-[#48506c] hover:bg-[#f5f7fb]"
            aria-label={collapsed ? "Expand left menu" : "Collapse left menu"}
            aria-expanded={!collapsed}
            title={collapsed ? "Expand menu" : "Collapse menu"}
          >
            <span aria-hidden="true">{collapsed ? "→" : "←"}</span>
            {!collapsed ? <span>Collapse</span> : null}
          </button>
        </div>

        <nav className="space-y-1 text-sm text-[#48506c]" aria-label="Staff workspace">
          {STAFF_LINKS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex h-9 items-center rounded hover:bg-[#f5f7fb] ${
                collapsed ? "justify-center px-1" : "gap-2 px-3"
              }`}
              aria-label={item.label}
              title={collapsed ? item.label : undefined}
            >
              {collapsed ? (
                <span
                  className="grid size-8 place-items-center rounded bg-[#f0f3fb] text-[10px] font-bold text-[#4d5672]"
                  aria-hidden="true"
                >
                  {item.shortLabel}
                </span>
              ) : (
                <span>{item.label}</span>
              )}
            </Link>
          ))}
        </nav>

        {!collapsed ? (
          <>
            <div className="mt-7 text-xs font-semibold text-[#181b34]">
              Workspace
            </div>
            <div className="mt-3 flex items-center gap-2 rounded border border-[#c9d3e8] bg-[#f7f8fc] px-2 py-2">
              <span className="rounded bg-[#ff5ac8] px-1.5 py-1 text-xs font-bold text-white">
                D7
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                D7 Main workflow
              </span>
            </div>
          </>
        ) : (
          <div
            className="mx-auto mt-5 grid size-9 place-items-center rounded bg-[#ff5ac8] text-xs font-bold text-white"
            title="D7 Main workflow"
          >
            D7
          </div>
        )}

        <Link
          href="/staff/intake-board"
          aria-current="page"
          aria-label="Issue Intake Board"
          title={collapsed ? "Issue Intake Board" : undefined}
          className={`mt-3 flex h-10 items-center rounded bg-[#eaf3ff] text-sm font-semibold text-[#181b34] ${
            collapsed ? "justify-center px-1" : "gap-2 px-3"
          }`}
        >
          <span className="grid size-6 place-items-center rounded-sm border border-[#8b94ad] bg-white text-[9px] font-bold">
            {collapsed ? "CC" : ""}
          </span>
          {!collapsed ? <span>Issue Intake Board</span> : null}
        </Link>

        {!collapsed ? (
          <div className="mt-6 rounded-lg border border-[#edf0f7] bg-[#fbfcff] p-4 text-sm shadow-sm">
            <div className="font-semibold">One board, real cases</div>
            <p className="mt-2 text-xs leading-5 text-[#68728f]">
              Saved rows are in the staff queue. Draft rows remain on this
              computer until saved.
            </p>
          </div>
        ) : null}
      </aside>

      {children}
    </div>
  );
}
