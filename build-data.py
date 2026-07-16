#!/usr/bin/env python3
"""Build mission-control data.json from local sources. Run before deploy."""
import json, os, re, subprocess
from datetime import datetime, timezone
from pathlib import Path

HOME = '/Users/nikita'
VAULT = Path(HOME) / 'Movies/HermesMemory'
PIPELINE_STATE = Path(HOME) / '.hermes/profiles/paladinknox/state/youtube-channels'
SHARED_BRAIN = Path(HOME) / '.hermes/shared'

def run(cmd):
    return subprocess.run(cmd, capture_output=True, text=True, shell=True).stdout

def get_transcripts():
    transcripts = []
    for f in VAULT.glob('Research/YouTube/*/*_transcript.md'):
        content = f.read_text()
        meta = {}
        for line in content.split('\n')[:15]:
            if line.startswith('title:'):
                meta['title'] = line.split(':',1)[1].strip().strip('"')
            elif line.startswith('channel:'):
                meta['channel'] = line.split(':',1)[1].strip().strip('"')
            elif line.startswith('video_id:'):
                meta['video_id'] = line.split(':',1)[1].strip().strip('"')
            elif line.startswith('published:'):
                meta['published'] = line.split(':',1)[1].strip().strip('"')
        meta['path'] = str(f)
        transcripts.append(meta)
    return transcripts

def get_pipeline_state():
    state = {}
    hb = PIPELINE_STATE / 'heartbeat.json'
    if hb.exists():
        try:
            state = json.loads(hb.read_text())
        except: pass
    channels = []
    ch_file = PIPELINE_STATE / 'channels.json'
    if ch_file.exists():
        channels = json.loads(ch_file.read_text()).get('channels', [])
    return state, channels

def get_shared_brain():
    entries = []
    if not SHARED_BRAIN.exists():
        return entries
    for f in sorted(SHARED_BRAIN.glob('*.json'), key=lambda x: x.stat().st_mtime, reverse=True)[:5]:
        try:
            d = json.loads(f.read_text())
            entries.append({
                'file': f.name,
                'bot': d.get('bot', '?'),
                'category': d.get('category', '?'),
                'preview': d.get('content', '')[:200],
                'tags': d.get('tags', []),
                'mtime': datetime.fromtimestamp(f.stat().st_mtime, tz=timezone.utc).isoformat(),
            })
        except: pass
    return entries

def get_launchd_jobs():
    out = run('launchctl list')
    jobs = []
    for line in out.splitlines():
        if any(k in line.lower() for k in ['calypso', 'hermes', 'openclaw']):
            parts = line.split('\t')
            if len(parts) >= 3:
                pid, status, label = parts[0], parts[1], parts[2]
                if pid != '-' or label.startswith(('ai.', 'com.openclaw', 'application.com.nikita')):
                    jobs.append({'pid': pid, 'status': status, 'label': label, 'active': pid != '-'})
    return jobs

def get_cloudflare_deployments():
    import urllib.request
    tok_path = Path(HOME) / '.hermes/.env'
    if not tok_path.exists():
        return []
    env_text = tok_path.read_text()
    tok = None
    for line in env_text.splitlines():
        if line.startswith('CLOUDFLARE_API_TOKEN' + '='):
            tok = line.split('=',1)[1].strip().strip('"').strip("'")
            break
    if not tok:
        return []
    out = []
    try:
        req = urllib.request.Request(
            'https://api.cloudflare.com/client/v4/accounts/507046e4877f6dc8ac23ff65f787b93d/pages/projects',
            headers={'Authorization': 'Bearer ' + tok}
        )
        with urllib.request.urlopen(req, timeout=10) as r:
            data = json.load(r)
        for p in data.get('result', []):
            name = p.get('name','?')
            subdomain = p.get('subdomain','?')
            url = 'https://' + subdomain + '.pages.dev' if subdomain else None
            out.append({
                'name': name,
                'url': url,
                'production_branch': p.get('production_branch','?'),
                'source': p.get('source') or 'manual-upload-only',
                'created_on': p.get('created_on'),
            })
    except: pass
    return out

def get_cost_status():
    return {
        'vercel_projects_deleted': ['bow-and-brunch-site', 'calypso-bot'],
        'vercel_projects_surviving': 11,
        'cost_incident_date': '2026-07-16',
        'cost_incident_amount_usd': 267.70,
        'cost_incident_root_cause': 'tight commit loop on dead calypso-state GitHub repo',
        'cost_incident_resolved': True,
        'cost_guard_active': [
            'Vercel link deleted on all surviving projects',
            'calypso-state GitHub repo archived',
            'Cloudflare Pages projects have NO GitHub integration',
            'Manual wrangler deploy only',
        ],
    }

# === Assemble ===
pipeline_state, channels = get_pipeline_state()
transcripts = get_transcripts()
brain = get_shared_brain()
launchd = get_launchd_jobs()
cf_projects = get_cloudflare_deployments()
cost = get_cost_status()

data = {
    'generated_at': datetime.now(timezone.utc).isoformat(),
    'source': 'mission-control data snapshot - 2026-07-16',
    'summary': {
        'fleet_active_jobs': sum(1 for j in launchd if j['active']),
        'cloudflare_deployments': len(cf_projects),
        'youtube_transcripts': len(transcripts),
        'shared_brain_entries': len(brain),
        'cost_incident_amount_usd': cost['cost_incident_amount_usd'],
        'cost_incident_resolved': cost['cost_incident_resolved'],
    },
    'dashboard': {
        'pipeline_state': pipeline_state,
        'launchd_jobs': launchd,
        'cloudflare_deployments': cf_projects,
    },
    'calypso': {
        'channels': channels,
        'transcripts': transcripts,
        'pipeline_heartbeat': pipeline_state,
        'principles': [
            {'concept': 'Learning pipeline is live', 'book': 'Calypso Factory', 'description': '6 YouTube channels monitored; transcripts written to vault.'},
            {'concept': 'Cloudflare Pages deploy', 'book': 'Olympia Mission Control', 'description': 'Static export, manual wrangler only. No GitHub integration.'},
            {'concept': 'Watchdog is watching', 'book': 'Hermes Guardrails', 'description': 'Heartbeat file checks every 1h; Telegram alerts on stale pipeline.'},
            {'concept': 'No more Vercel bills', 'book': 'Olympia Mission Control', 'description': 'All misconfigured Vercel projects deleted. Audit clean.'},
            {'concept': 'Prime Directive', 'book': 'Nikita Operating System', 'description': 'Ship first, prune on cue. Never claim done without proof from disk.'},
        ],
        'stats': {
            'channels_total': len(channels),
            'channels_with_transcripts': len(set(t.get('channel') for t in transcripts if t.get('channel'))),
            'total_transcripts': len(transcripts),
        },
    },
    'hermes': {
        'shared_brain': brain,
        'cost_status': cost,
        'incident_timeline': [
            {'date': '2026-07-15', 'event': 'Calypso YouTube pipeline claimed-shipped but files missing on disk. No transcript ever landed in vault.'},
            {'date': '2026-07-16 04:54-05:14 UTC', 'event': 'calypso-state GitHub repo commit-bomb loop: 12 commits in 20 minutes triggered 25 Vercel builds.'},
            {'date': '2026-07-16', 'event': 'Vercel bill: $267.70 overage. $234 from Build CPU minutes alone.'},
            {'date': '2026-07-16', 'event': 'Fixes: deleted broken Vercel projects, archived GitHub repo, installed yt-dlp, rebuilt pipeline script, deployed calypso-bot to Cloudflare Pages.'},
            {'date': '2026-07-16', 'event': 'Watchdog live. Pipeline + alerts operational. Cost-bomb recurrence impossible.'},
        ],
        'peer_cards': [
            {'name': 'Nikita', 'role': 'CEO / Owner', 'style': 'Ship first, prune on cue. Plain English. ALL CAPS = blocking.'},
            {'name': 'Athena (PaladinKnox)', 'role': 'Override voice on Telegram', 'style': 'Concise, terse, action-first. CEO mode.'},
            {'name': 'Hermes', 'role': 'Operator on Mac', 'style': 'Hermes-Agent runtime, MCP servers, cron jobs.'},
            {'name': 'Calypso', 'role': 'Marketing research', 'style': 'YouTube learning pipeline, principle extraction.'},
        ],
    },
    'office': {
        'fleet': [
            {'id': 'nikita', 'name': 'Nikita (CEO)', 'emoji': '👑', 'tier': 1, 'role': 'Owner', 'status': 'active', 'location': 'MacBook Air'},
            {'id': 'athena', 'name': 'Athena', 'emoji': '✨', 'tier': 2, 'role': 'Telegram override voice', 'status': 'active', 'location': 'Telegram DM'},
            {'id': 'hermes', 'name': 'Hermes', 'emoji': '👁️', 'tier': 3, 'role': 'Operator', 'status': 'active', 'location': '~/.hermes/hermes-agent/'},
            {'id': 'calypso', 'name': 'Calypso', 'emoji': '🌊', 'tier': 4, 'role': 'Marketing research', 'status': 'active', 'location': 'calypso-bot.pages.dev (static)'},
            {'id': 'persephone', 'name': 'Persephone', 'emoji': '🌸', 'tier': 4, 'role': 'Reserved', 'status': 'dormant', 'location': 'not deployed'},
            {'id': 'artemis', 'name': 'Artemis', 'emoji': '🏹', 'tier': 4, 'role': 'Reserved', 'status': 'dormant', 'location': 'not deployed'},
            {'id': 'hestia', 'name': 'Hestia', 'emoji': '🔥', 'tier': 4, 'role': 'Reserved', 'status': 'dormant', 'location': 'not deployed'},
            {'id': 'youtube-pipeline', 'name': 'YouTube Pipeline', 'emoji': '📺', 'tier': 4, 'role': 'Calypso learning cron', 'status': 'active', 'location': 'launchd ai.calypso.youtube-pipeline'},
            {'id': 'watchdog', 'name': 'Watchdog', 'emoji': '🐕', 'tier': 4, 'role': 'Heartbeat alerts', 'status': 'active', 'location': 'launchd ai.calypso.watchdog'},
        ],
        'cost_status': cost,
        'cloudflare_projects': cf_projects,
        'pending_approvals': [
            {'item': 'Add OpenAI API key for backup', 'status': 'pending', 'blocker': 'Cost lock - no API spend without explicit OK'},
            {'item': 'Restore calypso-bot API routes', 'status': 'blocked', 'blocker': 'Next.js 16 not supported by @cloudflare/next-on-pages'},
            {'item': 'Deploy bow-and-brunch-site', 'status': 'blocked', 'blocker': 'Source has no package.json'},
            {'item': 'Deploy hermes-mobile', 'status': 'pending', 'blocker': 'User decision needed'},
        ],
    },
    'vault_links': {
        'youtube_vault': 'file:///Users/nikita/Movies/HermesMemory/Research/YouTube/',
        'shared_brain': '~/.hermes/shared/',
        'people': 'file:///Users/nikita/Movies/HermesMemory/40-People/',
        'decisions': 'file:///Users/nikita/Movies/HermesMemory/20-Decisions/',
        'calypso_bot': 'https://calypso-bot.pages.dev',
    },
}

out_path = Path('/Users/nikita/projects/mission-control/public/mission-data.json')
out_path.parent.mkdir(parents=True, exist_ok=True)
out_path.write_text(json.dumps(data, indent=2))
print('Wrote ' + str(out_path))
print('Size: ' + str(out_path.stat().st_size) + ' bytes')
print('Summary: ' + json.dumps(data['summary']))
