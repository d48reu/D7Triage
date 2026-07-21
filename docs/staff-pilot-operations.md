# District 7 Issue Reporter Staff Pilot Operations

Last updated: July 15, 2026

This project is in an active staff pilot. Real cases are being entered, so the live Render data should be treated as operational data.

## Live Pilot

- App URL: https://district-7-issue-reporter.onrender.com
- Hosting: Render web service
- Data storage: SQLite database and attachment files on the Render persistent disk at `/var/data`
- Audience: District 7 staff only

## Daily Backup

At the end of each day with real case entry:

1. Sign in to the staff area.
2. Open **Staff analytics**.
3. In **Exports**, download **Pilot backup JSON**.
4. Store the downloaded file somewhere staff-controlled.

The pilot backup JSON includes:

- cases
- status history
- internal updates
- field-level audit history
- referrals
- attachment metadata
- notification events
- AI routing suggestions
- jurisdiction/routing configuration
- staff member and agency metadata

The JSON does not include attachment file bytes. Attachment files remain on the Render persistent disk, so keep the Render disk intact and do not reset the service data directory.

## Weekly Case Quality Review

Once or twice per week during the staff pilot, review the real cases entered so far.

Look for:

- reports with unclear or wrong categories
- AI routing suggestions staff disagrees with
- District 7 coverage checks that are uncertain for known in-district addresses
- cases in unincorporated Miami-Dade that are incorrectly described as municipal responsibility
- missing photos or upload failures
- cases that needed edits after intake
- cases with no assignment, no referral, or no status movement
- audit history that does not explain meaningful edits

Capture findings as short action items:

- routing rule to update
- category to add or rename
- address/geocoding pattern to improve
- staff workflow clarification
- public-language change for later rollout

## Desk Workflow

For each incoming call or staff-entered case:

1. Create the report while the information is fresh.
2. Attach any available photo.
3. Open the case from the staff inbox.
4. Use the inbox filters and flags to find cases still waiting on triage.
5. Check the case-page triage checklist.
6. Edit details if the category, address, or description is wrong.
7. Review the AI routing suggestion when one exists.
8. Assign the case if a staff owner is clear.
9. Add a referral when the case is sent to an agency or department.
10. Move the status as the case progresses.
11. Add an internal update for any important call-back, referral, or resolution context.

The staff inbox should be worked from **Active** or **Received** first. The main goal is that real cases do not stay in `received` after staff has reviewed them.

Recommended status discipline:

- **Received / needs review**: newly entered and not yet triaged.
- **In review**: staff is checking jurisdiction, ownership, or missing details.
- **Routed / referred**: sent to an agency, department, or staff owner.
- **Awaiting agency**: waiting on outside response.
- **Needs more info**: staff needs more from the constituent or caller.
- **Resolved**: issue addressed or staff follow-up complete.
- **Closed outside jurisdiction**: confirmed outside District 7 or not county/D7 responsibility.
- **Closed duplicate**: linked to a primary case.

## Routing Rule

For this pilot, treat **unincorporated Miami-Dade within District 7** as District 7/county-side responsibility. It should not be dismissed as a municipal case.

If staff disagrees with an AI suggestion, update the managed routing rule or capture the example during weekly review.

## Assignment Notifications

When a case owner changes, the app sends an internal assignment email to the assigned staff member when email is configured.

Required Render environment variables:

- `RESEND_API_KEY`
- `ISSUE_REPORT_FROM_EMAIL`
- `STAFF_ASSIGNMENT_EMAIL_ENABLED=true`

Before relying on this workflow:

1. In Render, set `RESEND_API_KEY`.
2. In Render, set `ISSUE_REPORT_FROM_EMAIL` to a verified sender address.
3. In Render, confirm `STAFF_ASSIGNMENT_EMAIL_ENABLED=true`.
4. Redeploy the service after changing environment variables.
5. Open **Staff routing** and check **Assignment email readiness**.
6. Confirm each active staff member has the correct email address in **Staff routing**.
7. Assign one low-risk real case to yourself or another staff member.
8. Confirm the assignment email arrives.
9. Confirm the case timeline includes an internal update showing whether the assignment notification was sent, skipped, or failed.

Assignment emails are only for internal staff. They do not turn on constituent email.

## Before Expanding Beyond Staff

Do not open the app to constituents until these are green:

- daily backup habit is working
- staff can reliably submit and edit cases
- photo uploads are stable
- audit history is useful
- common categories and routing rules match real casework
- District 7 coverage language is understandable
- staff has a clear status/referral workflow
- shared-password staff access is replaced or hardened
- custom domain and public-facing language are decided
- notification/referral process is finalized
