# Vercel Demo Deployment

This app now supports a **shareable demo mode** that works well on Vercel Hobby.

## What Demo Mode Does

- seeds the app with curated Miami-Dade District 7 example cases
- includes the staff roster, routing data, and official boundary layers
- keeps **AI routing live**
- keeps the public form interactive, but does **not** retain new public submissions
- stores temporary runtime data under the server temp directory instead of the project folder

That makes it a good fit for a free hosted walkthrough without pretending it is a production system.

## Required Environment Variables

Set these in Vercel:

- `NEXT_PUBLIC_APP_URL`
  - your deployed Vercel URL
- `DEMO_MODE=true`
- `NEXT_PUBLIC_DEMO_MODE=true`
- `STAFF_PASSWORD`
  - a demo password you choose
- `STAFF_SESSION_SECRET`
  - any long random string
- `OPENAI_API_KEY`
  - fresh key recommended for the hosted demo
- `AI_ROUTING_ENABLED=true`
- `OPENAI_ROUTING_MODEL=gpt-5-nano`
- `AI_ROUTING_MAX_GENERATIONS_PER_REPORT_PER_DAY=2`

Optional:

- `REPORT_RATE_LIMIT_ENABLED=false`
  - useful if you do not want demo reviewers blocked by the local anti-spam limits

## Deploy Steps

1. Push the project to GitHub.
2. In Vercel, import the repo.
3. Keep the framework preset as **Next.js**.
4. Add the environment variables above.
5. Deploy.

## Demo Workflow Notes

- Public form submissions will route to a demo explanation page instead of creating durable new cases.
- Staff views use seeded cases so reviewers always have something good to explore.
- AI routing remains real and uses the configured OpenAI key.
- Staff-side edits may reset between cold starts or fresh instances, which is acceptable for a walkthrough demo.
