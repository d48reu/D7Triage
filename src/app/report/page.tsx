import { DemoSiteNotice } from "@/components/demo-site-notice";
import Link from "next/link";
import { ReportForm } from "@/components/report-form";
import { isDemoMode } from "@/lib/demo-mode";

export const runtime = "nodejs";

export default function ReportPage() {
  const demoMode = isDemoMode();

  return (
    <main className="min-h-screen bg-[#f5f6fb] text-[#181b34]">
      <header className="flex h-10 items-center justify-between border-b border-[#d9e0ef] bg-[#eef2fb] px-3">
        <div className="flex items-center gap-2">
          <div className="grid size-6 grid-cols-2 gap-0.5" aria-hidden="true">
            <span className="rounded-full bg-[#6161ff]" />
            <span className="rounded-full bg-[#8b5cf6]" />
            <span className="rounded-full bg-[#3b82f6]" />
            <span className="rounded-full bg-[#7c3aed]" />
          </div>
          <div className="text-[15px] font-semibold">
            d7 <span className="font-normal">work management</span>
          </div>
        </div>
        <div className="flex items-center gap-3 text-sm text-[#323650]">
          <span className="rounded-full bg-white px-2 py-1 shadow-sm">99+</span>
          <span className="hidden md:inline">Search</span>
          <span>?</span>
          <span className="rounded-full bg-[#ff642e] px-2 py-1 text-xs font-semibold text-white">
            D
          </span>
        </div>
      </header>

      <div className="grid min-h-[calc(100vh-40px)] grid-cols-[260px_1fr] max-lg:grid-cols-1">
        <aside className="border-r border-[#d9e0ef] bg-white px-3 py-3 max-lg:hidden">
          <nav className="space-y-1 text-sm text-[#48506c]">
            <RailItem label="Home" />
            <RailItem label="My work" />
            <RailItem label="More" />
          </nav>

          <div className="mt-8 text-xs font-semibold text-[#181b34]">
            Workspace
          </div>
          <div className="mt-3 flex items-center gap-2 rounded border border-[#c9d3e8] bg-[#f7f8fc] px-2 py-2">
            <span className="rounded bg-[#ff5ac8] px-1.5 py-1 text-xs font-bold text-white">
              D7
            </span>
            <span className="min-w-0 flex-1 truncate text-sm font-semibold">
              D7 Main workflow
            </span>
            <span className="text-[#67708d]">v</span>
          </div>
          <div className="mt-2 rounded bg-[#0073ea] px-3 py-2 text-center text-xl font-light text-white">
            +
          </div>

          <div className="mt-5 space-y-1 text-sm text-[#4d5672]">
            <WorkspaceItem label="Constituent Calls" active />
            <WorkspaceItem label="Proclamations" />
            <WorkspaceItem label="Disability Contacts" />
            <WorkspaceItem label="Media Contacts" />
            <WorkspaceItem label="Content calendar" />
            <WorkspaceItem label="Project plan" />
          </div>

          <div className="mt-6 rounded-lg border border-[#edf0f7] bg-[#fbfcff] p-4 text-center text-sm shadow-sm">
            <div className="font-semibold">D7 Intake Board</div>
            <p className="mt-2 text-xs leading-5 text-[#68728f]">
              Same daily call workflow, now connected to District 7 case routing.
            </p>
          </div>
        </aside>

        <section className="min-w-0 bg-white">
          <div className="border-b border-[#d9e0ef] px-10 pt-6 max-md:px-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-[26px] font-semibold tracking-[-0.01em]">
                    Constituent Calls
                  </h1>
                  <span className="text-[#69708b]">v</span>
                </div>
                <div className="mt-4 flex flex-wrap items-end gap-7 text-sm">
                  <Tab label="Main table" active />
                  <Tab label="Form" />
                  <Tab label="Table" />
                  <Tab label="Diegos Tickets" />
                  <Tab label="Build Vibe view" accent />
                  <span className="pb-3 text-lg text-[#48506c]">+</span>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <span>AI suggestions</span>
                <span className="rounded border border-[#0073ea] px-1.5 py-0.5 text-xs text-[#0073ea]">
                  New
                </span>
                <span>Integrate</span>
                <span>Automate</span>
                <span className="rounded-full bg-[#ff642e] px-2 py-1 text-xs font-semibold text-white">
                  D
                </span>
                <Link
                  href="/staff"
                  className="rounded border border-[#c9d3e8] bg-white px-3 py-2 font-medium hover:bg-[#f5f7fb]"
                >
                  Command Center
                </Link>
              </div>
            </div>
          </div>

          {demoMode ? (
            <div className="mx-10 mt-4 max-md:mx-4">
              <DemoSiteNotice body="This hosted demo keeps the AI routing and staff views live, but new public submissions are not retained after you test the flow." />
            </div>
          ) : null}

          <ReportForm demoMode={demoMode} />
        </section>
      </div>
    </main>
  );
}

function RailItem({ label }: { label: string }) {
  return (
    <div className="rounded px-3 py-2 hover:bg-[#f5f7fb]">
      {label}
    </div>
  );
}

function WorkspaceItem({
  label,
  active = false,
}: {
  label: string;
  active?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-2 rounded px-3 py-2 ${
        active
          ? "bg-[#eaf3ff] font-semibold text-[#181b34]"
          : "hover:bg-[#f5f7fb]"
      }`}
    >
      <span className="h-3 w-3 rounded-sm border border-[#8b94ad]" />
      <span className="truncate">{label}</span>
    </div>
  );
}

function Tab({
  label,
  active = false,
  accent = false,
}: {
  label: string;
  active?: boolean;
  accent?: boolean;
}) {
  return (
    <div
      className={`border-b-2 pb-3 ${
        active
          ? "border-[#0073ea] text-[#181b34]"
          : "border-transparent text-[#181b34]"
      }`}
    >
      {accent ? <span className="text-[#ff2ea6]">v </span> : null}
      {label}
    </div>
  );
}
