# Render Pilot Checklist

This checklist is for the first staff-only District 7 Issue Reporter pilot on Render.

## Pilot Decisions

- Host: Render web service with persistent disk
- Audience: staff only
- Mode: real pilot mode, not demo mode
- Domain: use an easy-to-remember custom domain if approved and available
- AI routing: off for initial launch, enable after the non-AI workflow is stable

## What Codex Can Do

- Maintain `render.yaml`
- Keep env examples safe and placeholder-only
- Run build, lint, and audit checks
- Diagnose Render build or runtime logs
- Smoke-test the deployed app if given the URL and staff password
- Draft staff launch instructions and SOP

## What The User Must Do In Render

1. Create or open the Render web service.
2. Connect the GitHub repo or deployment source.
3. Confirm the service uses the Issue Reporter app root.
4. Attach the persistent disk.
5. Paste real environment variable values into Render.
6. Add the custom domain in Render.
7. Add DNS records wherever the domain is managed.
8. Trigger deploys/restarts from the Render UI when needed.

## Render Service Settings

- Runtime: Node
- Plan: Starter or another paid plan that supports persistent disks
- Build command: `npm install && npm run build`
- Start command: `npm run start`
- Health check path: `/`
- Disk name: `district-7-data`
- Disk mount path: `/var/data`
- Disk size: `1 GB` for the first pilot
- `DATA_DIR`: `/var/data`

If deploying from the larger `d7-ai-lab` repo instead of the nested Issue Reporter repo, set the service root directory to:

```text
district-7-issue-reporter
```

If deploying from the nested Issue Reporter repo, use:

```text
.
```

## Required Environment Variables

Use `render-pilot.env.example` as the non-secret template. Paste real values in Render, not in committed files.

Required:

- `NEXT_PUBLIC_APP_URL`
- `DATA_DIR`
- `DEMO_MODE`
- `NEXT_PUBLIC_DEMO_MODE`
- `STAFF_PASSWORD`
- `STAFF_SESSION_SECRET`
- `STAFF_SESSION_MAX_AGE_HOURS`
- `RATE_LIMIT_SECRET`

Recommended defaults:

- `DEMO_MODE=false`
- `NEXT_PUBLIC_DEMO_MODE=false`
- `DATA_DIR=/var/data`
- `AI_ROUTING_ENABLED=false`
- `REPORT_RATE_LIMIT_ENABLED=true`

Optional for launch:

- `OPENAI_API_KEY`
- `RESEND_API_KEY`
- `ISSUE_REPORT_FROM_EMAIL`

## Custom Domain Steps

1. Pick a short staff-only pilot domain.
2. Add it under the Render service custom domains screen.
3. Copy Render's DNS target.
4. Add the DNS record in the domain registrar or DNS provider.
5. Wait for Render to show the domain as verified.
6. Set `NEXT_PUBLIC_APP_URL` to the custom domain.
7. Redeploy after changing `NEXT_PUBLIC_APP_URL`.

Good domain patterns:

- `d7issues.org`
- `reportd7.org`
- `d7report.org`
- `issues.district7.org`
- `report.miamidade-d7.org`

## Persistence Test

Run this before inviting staff:

1. Submit a test report.
2. Upload one small image.
3. Open `/staff` and confirm the report appears.
4. Open the case detail and confirm the image attachment opens.
5. Restart the Render service.
6. Confirm the report still appears.
7. Confirm the attachment still opens.
8. Trigger a redeploy.
9. Confirm the report and attachment still exist.

Phase 2 is complete only after the restart and redeploy persistence checks pass.

## Staff-Only Launch Rule

Do not publish the public intake link broadly during the first pilot. Share the URL and staff password only with approved staff testers.
