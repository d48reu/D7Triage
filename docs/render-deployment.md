# Render Deployment

This app can be piloted on Render with **minimal code changes** because it supports a configurable persistent data directory.

## Why Render Fits This App

The current app uses:

- SQLite at `issues.db`
- local uploads for resident photos

Both need a writable filesystem that survives restarts. Render supports this with a **persistent disk** attached to a paid web service.

Relevant docs:

- [Render persistent disks](https://render.com/docs/disks)
- [Render Blueprint spec](https://render.com/docs/blueprint-spec)

## Included Setup

This repo includes:

- [`render.yaml`](</C:/Users/d48re/OneDrive/Documents/New project 2/district-7-issue-reporter/render.yaml>)
- configurable `DATA_DIR`

On Render, the app is configured to store data under:

- `/var/data/issues.db`
- `/var/data/uploads`

## Recommended Steps

1. Push this repo to GitHub.
2. In Render, choose **New +** -> **Blueprint**.
3. Connect the GitHub repo.
4. Render should detect [`render.yaml`](</C:/Users/d48re/OneDrive/Documents/New project 2/district-7-issue-reporter/render.yaml>).
5. Before the first deploy, set:
   - `NEXT_PUBLIC_APP_URL` to the Render service URL once you know it
   - `STAFF_PASSWORD` to a real password for the demo
   - optionally `OPENAI_API_KEY` if you want AI routing live
6. Deploy.

## Minimum Required Environment Variables

These must be set for a usable staff pilot:

- `NEXT_PUBLIC_APP_URL`
- `STAFF_PASSWORD`
- `DEMO_MODE=false`
- `NEXT_PUBLIC_DEMO_MODE=false`

These are optional:

- `OPENAI_API_KEY`
- `STAFF_ASSIGNMENT_EMAIL_PROVIDER`
- `ISSUE_REPORT_FROM_EMAIL`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `SMTP_PASSWORD`
- `RESEND_API_KEY`

## Notes

- `STAFF_SESSION_SECRET` and `RATE_LIMIT_SECRET` are generated automatically by the blueprint.
- AI routing is **off by default** in the blueprint and should stay off for the first baseline pilot pass.
- Email delivery is still optional and can stay disabled. For a no-County-IT
  pilot, use SMTP/Gmail instead of Resend domain verification.
- The Render `starter` plan is used because persistent disks require a paid service tier.
- See `docs/render-pilot-checklist.md` for the staff-only pilot workflow.
