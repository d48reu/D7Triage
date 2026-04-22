# District 7 Issue Reporter

Constituent-facing issue reporting and staff-assisted routing tool for District 7.

This is a separate project from the District 7 knowledge base app. It may reuse proven patterns from that project, including Next.js, Supabase, OpenAI-assisted workflows, staff authentication, and management dashboards.

## Product Goal

Make it easy for constituents to report local issues even when they do not know which agency owns the problem. The first release is a staff-assisted MVP: residents submit issues through a mobile web form, AI suggests classification and routing, and staff approve every response or referral.

## Initial Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Supabase Auth, Postgres, and Storage
- OpenAI for staff-reviewed issue classification and draft responses
- Resend for email confirmations and status updates

## Local Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Environment Setup

Copy `.env.example` to `.env.local` and fill in project keys when available.

## Current Routes

- `/` project landing screen
- `/report` constituent intake placeholder
- `/staff` staff dashboard placeholder

## Docs

- `docs/product-brief.md`
- `docs/implementation-plan.md`
