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

## Still Needed Before A Broader Pilot

1. replace local staff auth with a real identity provider
2. decide where the shared source of truth should live if multiple staff need simultaneous access
3. define backup and restore procedures for `.data/issues.db` and `.data/uploads`
4. confirm internal guidance for sensitive reports and data retention
5. choose whether live email will use an official county-controlled sender domain

## Local Operations Notes

- database path: `.data/issues.db`
- uploads path: `.data/uploads`
- local staff password: `.env.local`
- session secret: `.env.local`
- rate-limit values: `.env.local`

## Practical Next Milestone

Move from “single-machine local prototype” to “small internal pilot” by solving auth, backup, and shared deployment together before turning on live email.
