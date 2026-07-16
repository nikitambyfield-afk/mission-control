# Olympia Mission Control

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
