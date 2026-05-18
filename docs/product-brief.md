# District 7 Issue Reporter Product Brief

## Summary

The District 7 Issue Reporter is a constituent-facing intake tool and staff triage workspace for **Miami-Dade County Commission District 7**. It is designed to help residents report problems without needing to know which agency owns the issue, while giving staff a structured way to route, follow up, and learn from recurring patterns.

## Primary Users

- residents reporting local issues
- District 7 staff triaging and routing reports
- office leadership reviewing trends, follow-up load, and recurring hotspots

## Core Problems

- residents often do not know whether a problem belongs to the county, state, a city, a utility, transit, parks, schools, or private property
- generic 311-style submission can feel opaque and weak on follow-up
- staff lose time reconstructing context and manually repeating routing work
- recurring issues are hard to see across multiple reports

## What The Prototype Already Covers

- mobile-first intake form
- typed location plus optional device coordinates
- automatic address geocoding when coordinates are missing
- private resident tracking page
- staff inbox and case detail views
- editable agencies and routing rules
- duplicate review workflow
- referral outcome tracking
- jurisdiction hints plus Miami-Dade District 7 boundary support
- AI-assisted routing suggestions with manual review
- analytics, exports, and notification previews

## MVP Guardrails

- staff remain the authority for routing, referral, closure, and resident-facing communication
- AI is advisory only
- newsletter consent is separate from case-update consent
- live email remains deferred until the office is ready for domain and IT decisions
- the current auth and persistence approach are prototype-grade, not production-grade

## Success Signals For The Next Phase

- residents can submit a usable report in under two minutes
- staff can identify a likely owner and next step within one review pass
- duplicate issues are linked instead of handled as separate cases
- jurisdiction clues reduce avoidable routing mistakes
- the office can export newsletter-ready contacts only from explicit opt-ins
