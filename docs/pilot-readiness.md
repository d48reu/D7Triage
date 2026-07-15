# Pilot Readiness Checklist

## Already In Place

- local staff login with configurable password
- optional dedicated session signing secret
- configurable session lifetime
- rate limiting for public report submissions by IP and email
- upload count, file type, and file size validation
- hidden honeypot field on the public intake form
- attachment responses sent with `X-Content-Type-Options: nosniff`
- separate newsletter consent from case-update consent
- AI routing disabled by default with explicit usage caps when enabled
- editable notification templates and previews instead of live outbound email
- staff-only pilot backup JSON export from the analytics page

## Still Needed Before A Broader Pilot

1. replace local staff auth with a real identity provider
2. keep using the Render persistent disk as the staff pilot source of truth
3. confirm restore procedures for the Render data directory and downloaded pilot backup JSON
4. confirm internal guidance for sensitive reports and data retention
5. choose whether live email will use an official county-controlled sender domain

## Local Operations Notes

- database path: `.data/issues.db`
- uploads path: `.data/uploads`
- local staff password: `.env.local`
- session secret: `.env.local`
- rate-limit values: `.env.local`
- staff pilot operations: `docs/staff-pilot-operations.md`

## Practical Next Milestone

Move from “single-machine local prototype” to “small internal pilot” by solving auth, backup, and shared deployment together before turning on live email.
