# Olympia Mission Control

## Kanban v4 and $0 telemetry

The dashboard treats cloud snapshots as snapshots and never labels them as live.
For real-time Mac telemetry without data-triggered Vercel deployments, use the
Cloudflare Worker + D1 package in `telemetry/worker`.

1. Authenticate Wrangler: `wrangler login`
2. Create a free D1 database named `olympia-telemetry`
3. Copy `telemetry/worker/wrangler.toml.example` to `telemetry/worker/wrangler.toml`
4. Insert the D1 database ID and apply `telemetry/worker/schema.sql`
5. Store `TELEMETRY_SECRET` with `wrangler secret put`
6. Deploy the Worker and set the two collector environment variables
7. Run `node scripts/telemetry-push.mjs` every 60–120 seconds on the Mac

Never commit `wrangler.toml` after inserting account identifiers or commit the
telemetry secret. Board movements remain browser-local until the Worker is
connected.

Unified dashboard for the Calypso + Hermes + 2D Office fleet.

## Stack

- Next.js 16.2 + React 19
- App Router with API routes
- Node.js 20+
- Deploy target: Render.com free tier (full SSR, live data)

## Local development

```bash
npm install
npm run dev      # http://localhost:3000
npm run build && npm start
```

## Deploy to Render

1. Sign up at https://dashboard.render.com (free, GitHub OAuth)
2. Click "New +" → "Blueprint"
3. Connect repo `nikitambyfield-afk/mission-control` (private)
4. Render detects `render.yaml` automatically
5. Set `CLOUDFLARE_API_TOKEN` env var to the real value
6. Deploy

Cost: **$0/mo** (Render free web service + Cloudflare Pages static mirrors)

## API endpoints

- `GET /api/health` — liveness check
- `GET /api/fleet` — live launchd + transcripts + cloudflare projects (no cache)

## Routes

- `/` Dashboard — live fleet status, auto-refresh every 60s
- `/calypso/` — research + transcripts
- `/hermes/` — memory + incidents
- `/office/` — 2D office floor plan

## Architecture

- **Render.com**: full Next.js SSR (this app)
- **Cloudflare Pages**: static mirror of calypso-bot
- **Mac**: YouTube pipeline writes transcripts to vault
- **launchd**: pipeline + watchdog crons run on Mac

## No Vercel. No cost bombs. No GitHub auto-deploy.

Manual deploys only. `autoDeploy: false` in render.yaml.
