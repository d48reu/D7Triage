# District 7 Issue Reporter Implementation Plan

## Phase 0: Discovery And Operating Model

- Review recent constituent issue examples and finalize the pilot taxonomy.
- Build the routing matrix with categories, owners, contacts, expected timelines, escalation paths, and resident-facing explanations.
- Define emergency redirect language for life safety and urgent utility hazards.

## Phase 1: App Foundation

- Maintain this as a separate Next.js app and Git repo.
- Use Supabase for staff auth, Postgres, and file storage.
- Use OpenAI for staff-reviewed classification, routing suggestions, summaries, and draft replies.
- Use Resend for confirmation and status update email.

## Phase 2: Core Case System

- Create tables for issue reports, attachments, status events, staff notes, agencies, routing rules, referrals, AI suggestions, and notification events.
- Store resident-facing status separately from internal notes.
- Track all staff status changes and referral actions in an auditable timeline.

## Phase 3: Resident Intake

- Build `/report` as a mobile-first intake flow.
- Capture description, location, optional photos, resident email, preferred language, and consent for updates.
- Return a private tracking token and send a confirmation email.

## Phase 4: Staff Triage

- Build `/staff` as the authenticated staff inbox.
- Add report detail pages with photos, location, AI suggestions, notes, status history, referral actions, and draft responses.
- Keep staff approval required for routing, resident messages, and closure.

## Phase 5: Pilot And Hardening

- Run a 4-8 week controlled pilot.
- Measure time to first review, time to first response, AI suggestion acceptance, duplicate rate, overdue follow-ups, and resident satisfaction.
- Add abuse protection, role-based permissions, audit logging, exports, and editable routing templates before broad launch.

## Phase 6: Expansion

- Add structured referral emails.
- Add 311/Open311 integration only after manual routing is validated.
- Add SMS if email-only follow-up underperforms.
- Add analytics for recurring hotspots and policy/budget insight.
