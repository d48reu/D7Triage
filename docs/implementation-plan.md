# District 7 Issue Reporter Implementation Plan

## Current State

The app is now a **local-first internal prototype** for Miami-Dade County Commission District 7.

Implemented today:

- public issue intake
- optional photos
- optional device location capture
- automatic server-side address geocoding via the U.S. Census geocoder
- private tracking page
- local staff auth
- staff inbox and case detail views
- referrals with outcome tracking
- duplicate review workflow
- editable agencies and routing rules
- editable jurisdiction keywords and boundary GeoJSON
- AI-assisted routing suggestions with cost guardrails
- analytics, saved views, and CSV exports
- notification previews, template editing, and review workflow

## Phase 1: Local Prototype Foundation

Completed:

- separate Next.js repo
- SQLite persistence
- local file uploads
- local staff auth
- public and staff route structure

## Phase 2: Triage Operations

Completed:

- staff inbox and case detail pages
- status timeline
- staff notes
- referral logging
- duplicate linking
- editable routing guide

## Phase 3: Routing Intelligence

Completed:

- jurisdiction heuristics
- official Miami-Dade District 7 boundary loaded into local config
- AI routing suggestion flow
- staff feedback loop for AI quality

## Phase 4: Operations Visibility

Completed:

- analytics metrics
- saved analytics views
- date filters and trends
- CSV exports
- notification preview center

## Phase 5: Pilot Hardening

Now in progress:

- stronger local auth configuration
- intake rate limiting
- upload count validation
- attachment response hardening
- docs refresh

## Remaining Best Steps Before A Broader Pilot

1. replace local staff auth with a real identity system
2. decide whether SQLite remains sufficient or whether to move to shared/cloud persistence
3. add a more explicit operational backup and retention plan
4. tighten public copy and staff workflows with real District 7 usage
5. add live email only when domain, IT, and sender approvals are ready

## Deferred Until Later

- live transactional email
- newsletter sending workflow
- 311/Open311 integration
- SMS updates
- public issue map
- resident accounts
