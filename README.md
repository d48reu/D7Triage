# District 7 Issue Reporter

Local-first constituent issue intake and staff triage tool for **Miami-Dade County Commission District 7**.

## What It Does

This app helps residents submit issues without needing to know which agency owns the problem, and gives staff a structured place to triage, route, follow up, and review trends.

Current capabilities:

- public intake form at `/report`
- optional photo upload
- optional device geolocation capture
- automatic server-side address geocoding through the U.S. Census geocoder when coordinates are missing
- municipality detection using official Miami-Dade municipality boundaries
- first-pass parcel and probable right-of-way lookup using official Miami-Dade parcel GIS
- private resident tracking page at `/report/[trackingToken]`
- local staff login
- staff inbox, case detail, notes, status updates, and referrals
- duplicate review workflow
- editable agencies, routing rules, and jurisdiction heuristics
- Miami-Dade District 7 boundary-aware hinting when coordinates are available
- AI-assisted routing suggestions with guardrails and staff feedback
- analytics, saved views, and CSV exports
- notification preview center with editable templates

## Current Architecture

- `Next.js` App Router
- `TypeScript`
- `Tailwind CSS`
- `better-sqlite3` for local persistence in `.data/issues.db`
- local file storage in `.data/uploads`
- optional `OpenAI` integration for staff-only routing suggestions
- optional `Resend` integration reserved for later

The app can also be deployed to **Render** with a persistent disk for a stable shareable demo environment.
For a **free shareable walkthrough**, the repo now also supports a **Vercel-hosted demo mode** with seeded cases and live AI routing.

This repo still contains some future-facing dependencies and docs references from the earlier Supabase plan, but the **actual running app is local-first today**.

## Local Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Setup

Copy [`.env.example`](</C:/Users/d48re/OneDrive/Documents/New project 2/district-7-issue-reporter/.env.example>) to `.env.local`.

Most local work only needs:

- `STAFF_PASSWORD`
- optional `STAFF_SESSION_SECRET`
- optional AI variables if you want routing suggestions enabled
- `DEMO_MODE` and `NEXT_PUBLIC_DEMO_MODE` if you want the shareable hosted demo behavior

For Render or other hosted environments that need persistent local storage, you can also set:

- `DATA_DIR`

### Geocoding

Automatic address geocoding uses the official U.S. Census geocoder from the server side when:

- the report has a typed address, and
- no device coordinates were captured

That keeps the boundary and jurisdiction hints useful even when residents skip “Use My Location.”

### Municipality And Parcel Intelligence

The routing admin can now load the official Miami-Dade municipality boundary layer for municipality-aware routing. When a report has coordinates, the app also performs a first-pass parcel lookup against Miami-Dade parcel GIS so staff can distinguish “on parcel” from “probably in public right-of-way” more clearly.

### Local Hardening Controls

The current prototype includes:

- configurable report rate limiting by IP and email
- configurable photo count limits
- file type and file size validation
- hidden honeypot field on the intake form
- dedicated staff session secret support
- content-type hardening on attachment responses

## Important Local Paths

- Database: [`.data/issues.db`](</C:/Users/d48re/OneDrive/Documents/New project 2/district-7-issue-reporter/.data/issues.db>)
- Uploads: [`.data/uploads`](</C:/Users/d48re/OneDrive/Documents/New project 2/district-7-issue-reporter/.data/uploads>)
- Public intake: `/report`
- Staff inbox: `/staff`
- Routing admin: `/staff/routing`
- Analytics: `/staff/analytics`
- Notifications: `/staff/notifications`

## Current Auth

Staff auth is still local password-based and is suitable for development or tightly controlled internal testing only. Before any broader pilot, plan to replace it with a real identity system.

## Docs

- [Product brief](</C:/Users/d48re/OneDrive/Documents/New project 2/district-7-issue-reporter/docs/product-brief.md>)
- [Implementation plan](</C:/Users/d48re/OneDrive/Documents/New project 2/district-7-issue-reporter/docs/implementation-plan.md>)
- [Pilot readiness checklist](</C:/Users/d48re/OneDrive/Documents/New project 2/district-7-issue-reporter/docs/pilot-readiness.md>)
- [Render deployment guide](</C:/Users/d48re/OneDrive/Documents/New project 2/district-7-issue-reporter/docs/render-deployment.md>)
- [Vercel demo deployment guide](</C:/Users/d48re/OneDrive/Documents/New project 2/district-7-issue-reporter/docs/vercel-demo-deployment.md>)
