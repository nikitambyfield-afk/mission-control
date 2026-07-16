// Live dashboard — fetches fleet data on each page load (Render SSR)
import Shell from './Shell';
import FleetClient from './FleetClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getFleetData() {
  // Read live data from your Mac (when running locally)
  // On Render, fall back to build-time snapshot
  const fs = await import('node:fs/promises');
  const path = await import('node:path');
  const HOME = process.env.HOME || '/Users/nikita';

  const safeRead = async (p) => {
    try { return await fs.readFile(p, 'utf8'); } catch { return null; }
  };

  // Live launchd jobs
  let launchd = [];
  try {
    const { execSync } = await import('node:child_process');
    const out = execSync('launchctl list', { encoding: 'utf8', timeout: 5 });
    for (const line of out.splitlines()) {
      const lower = line.toLowerCase();
      if (!['calypso', 'hermes', 'openclaw'].some((k) => lower.includes(k))) continue;
      const parts = line.split('\t');
      if (parts.length < 3) continue;
      const [pid, status, label] = parts;
      if (pid === '-' && !label.startsWith('ai.')) continue;
      launchd.push({ pid, status, label, active: pid !== '-' });
    }
  } catch {}

  // Live transcripts
  let transcripts = [];
  try {
    const vaultDir = path.join(HOME, 'Movies/HermesMemory/Research/YouTube');
    const channels = await fs.readdir(vaultDir);
    for (const chName of channels) {
      const chDir = path.join(vaultDir, chName);
      try {
        const files = (await fs.readdir(chDir)).filter((f) => f.endsWith('_transcript.md'));
        for (const f of files) {
          const fullPath = path.join(chDir, f);
          const stat = await fs.stat(fullPath);
          const content = await fs.readFile(fullPath, 'utf8');
          const meta = {};
          for (const line of content.split('\n').slice(0, 15)) {
            const m = line.match(/^(\w+):\s*(.+)$/);
            if (m) meta[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
          }
          transcripts.push({
            channel: meta.channel || chName,
            title: meta.title || 'untitled',
            video_id: meta.video_id || '',
            published: meta.published || '',
            chars: stat.size,
            mtime: stat.mtime.toISOString(),
          });
        }
      } catch {}
    }
    transcripts.sort((a, b) => b.mtime.localeCompare(a.mtime));
  } catch {}

  // Pipeline heartbeat
  let heartbeat = null;
  try {
    const hb = await safeRead(path.join(HOME, '.hermes/profiles/paladinknox/state/youtube-channels/heartbeat.json'));
    if (hb) heartbeat = JSON.parse(hb);
  } catch {}

  // Channels
  let channelList = [];
  try {
    const ch = await safeRead(path.join(HOME, '.hermes/profiles/paladinknox/state/youtube-channels/channels.json'));
    if (ch) channelList = JSON.parse(ch).channels || [];
  } catch {}

  return {
    generated_at: new Date().toISOString(),
    summary: {
      fleet_active_jobs: launchd.filter((j) => j.active).length,
      fleet_total_jobs: launchd.length,
      youtube_transcripts: transcripts.length,
      youtube_channels_total: channelList.length,
      channels_with_transcripts: new Set(transcripts.map((t) => t.channel)).size,
      pipeline_status: heartbeat?.cycle?.status || 'unknown',
      pipeline_last_run: heartbeat?.last_run || null,
    },
    launchd,
    transcripts,
    channels: channelList,
    pipeline_heartbeat: heartbeat,
    fleet: [
      { id: 'nikita', name: 'Nikita (CEO)', emoji: '👑', tier: 1, role: 'Owner', status: 'active', location: 'MacBook Air' },
      { id: 'athena', name: 'Athena', emoji: '✨', tier: 2, role: 'Telegram override voice', status: 'active', location: 'Telegram DM' },
      { id: 'hermes', name: 'Hermes', emoji: '👁️', tier: 3, role: 'Operator', status: 'active', location: '~/.hermes/hermes-agent/' },
      { id: 'calypso', name: 'Calypso', emoji: '🌊', tier: 4, role: 'Marketing research', status: 'active', location: 'calypso-bot.pages.dev' },
      { id: 'persephone', name: 'Persephone', emoji: '🌸', tier: 4, role: 'Reserved', status: 'dormant', location: 'not deployed' },
      { id: 'artemis', name: 'Artemis', emoji: '🏹', tier: 4, role: 'Reserved', status: 'dormant', location: 'not deployed' },
      { id: 'hestia', name: 'Hestia', emoji: '🔥', tier: 4, role: 'Reserved', status: 'dormant', location: 'not deployed' },
      { id: 'youtube-pipeline', name: 'YouTube Pipeline', emoji: '📺', tier: 4, role: 'Calypso learning cron', status: heartbeat?.cycle?.status === 'ok' ? 'active' : 'dormant', location: 'launchd' },
      { id: 'watchdog', name: 'Watchdog', emoji: '🐕', tier: 4, role: 'Heartbeat alerts', status: 'active', location: 'launchd' },
    ],
    approvals: [
      { item: 'Add OpenAI API key for backup', status: 'pending', blocker: 'Cost lock - no API spend without explicit OK' },
      { item: 'Restore calypso-bot API routes', status: 'blocked', blocker: 'Next.js 16 not supported by @cloudflare/next-on-pages' },
      { item: 'Deploy bow-and-brunch-site', status: 'blocked', blocker: 'Source has no package.json' },
      { item: 'Deploy hermes-mobile', status: 'pending', blocker: 'User decision needed' },
    ],
    cloudflare_projects: [],
    vault_links: {
      youtube_vault: '~/Movies/HermesMemory/Research/YouTube/',
      shared_brain: '~/.hermes/shared/',
    },
  };
}

export default async function DashboardPage() {
  const data = await getFleetData();
  return <FleetClient data={data} />;
}
