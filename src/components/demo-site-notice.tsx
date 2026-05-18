export function DemoSiteNotice({
  title = "Hosted demo mode",
  body = "This shareable demo is seeded with example cases. AI routing is live, but new public submissions and some staff-side edits may reset.",
}: {
  title?: string;
  body?: string;
}) {
  return (
    <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
      <div className="font-semibold">{title}</div>
      <p className="mt-1 leading-6">{body}</p>
    </div>
  );
}
