// Live fleet data API — reads from launchd, vault, and Cloudflare API at request time
// (NOT baked at build time — this is what static export couldn't do)

import { NextResponse } from 'next/server';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';

// Force dynamic — never cache
export const dynamic = 'force-dynamic';

const HOME = process.env.HOME || '/Users/nikita';

function getLaunchdJobs() {
  try {
    const out = execSync('launchctl list', { encoding: 'utf8', timeout: 5 });
    const jobs = [];
    for (const line of out.splitlines()) {
      const lower = line.toLowerCase();
      if (!['calypso', 'hermes', 'openclaw'].some((k) => lower.includes(k))) continue;
      const parts = line.split('\t');
      if (parts.length < 3) continue;
      const [pid, status, label] = parts;
      if (pid === '-' && !label.startsWith('ai.')) continue;
      jobs.push({ pid, status, label, active: pid !== '-' });
    }
    return jobs;
  } catch (e) {
    return [];
  }
}

function getTranscripts() {
  try {
    const vaultDir = join(HOME, 'Movies/HermesMemory/Research/YouTube');
    const channelsDir = readdirSync(vaultDir);
    const transcripts = [];
    for (const chName of channelsDir) {
      const chDir = join(vaultDir, chName);
      try {
        const files = readdirSync(chDir).filter((f) => f.endsWith('_transcript.md'));
        for (const f of files) {
          const fullPath = join(chDir, f);
          const stat = statSync(fullPath);
          const content = readFileSync(fullPath, 'utf8');
          const meta = {};
          for (const line of content.split('\n').slice(0, 15)) {
            const m = line.match(/^(\w+):\s*(.+)$/);
            if (m) meta[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
          }
          transcripts.push({
            channel: meta.channel || chName,
            channel_name: chName,
            title: meta.title || 'untitled',
            video_id: meta.video_id || '',
            published: meta.published || '',
            ingested: meta.ingested || '',
            chars: stat.size,
            mtime: stat.mtime.toISOString(),
          });
        }
      } catch {}
    }
    return transcripts.sort((a, b) => b.mtime.localeCompare(a.mtime));
  } catch (e) {
    return [];
  }
}

function getHeartbeat() {
  try {
    const path = join(HOME, '.hermes/profiles/paladinknox/state/youtube-channels/heartbeat.json');
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
}

function getChannels() {
  try {
    const path = join(HOME, '.hermes/profiles/paladinknox/state/youtube-channels/channels.json');
    return JSON.parse(readFileSync(path, 'utf8')).channels || [];
  } catch {
    return [];
  }
}

function getCloudflareProjects(apiToken, accountId) {
  if (!apiToken) return [];
  try {
    const res = execSync(
      `curl -s -H "Authorization: Bearer ${apiToken}" "https://api.cloudflare.com/client/v4/accounts/${accountId}/pages/projects"`,
      { encoding: 'utf8', timeout: 10 }
    );
    const data = JSON.parse(res);
    return (data.result || []).map((p) => ({
      name: p.name,
      url: p.subdomain ? `https://${p.subdomain}.pages.dev` : null,
      production_branch: p.production_branch,
      source: p.source || 'manual-upload-only',
      created_on: p.created_on,
    }));
  } catch {
    return [];
  }
}

export async function GET() {
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || '507046e4877f6dc8ac23ff65f787b93d';

  const launchd = getLaunchdJobs();
  const transcripts = getTranscripts();
  const heartbeat = getHeartbeat();
  const channels = getChannels();
  const cfProjects = getCloudflareProjects(apiToken, accountId);

  const summary = {
    fleet_active_jobs: launchd.filter((j) => j.active).length,
    fleet_total_jobs: launchd.length,
    cloudflare_deployments: cfProjects.length,
    youtube_transcripts: transcripts.length,
    youtube_channels_total: channels.length,
    channels_with_transcripts: new Set(transcripts.map((t) => t.channel)).size,
    pipeline_status: heartbeat?.cycle?.status || 'unknown',
    pipeline_last_run: heartbeat?.last_run || null,
  };

  return NextResponse.json({
    generated_at: new Date().toISOString(),
    summary,
    launchd,
    transcripts,
    channels,
    cloudflare_projects: cfProjects,
    pipeline_heartbeat: heartbeat,
  });
}
