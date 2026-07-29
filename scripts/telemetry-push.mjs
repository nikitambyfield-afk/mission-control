import { createHmac } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const endpoint = process.env.OLYMPIA_TELEMETRY_ENDPOINT;
const secret = process.env.OLYMPIA_TELEMETRY_SECRET;
const userHome = process.env.HOME;

if (!endpoint || !secret || !userHome) {
  console.error('Set OLYMPIA_TELEMETRY_ENDPOINT and OLYMPIA_TELEMETRY_SECRET.');
  process.exit(1);
}

function launchJobs() {
  try {
    const output = execFileSync('launchctl', ['list'], { encoding: 'utf8', timeout: 5000 });
    return output.split('\n').flatMap((line) => {
      const lower = line.toLowerCase();
      if (!['calypso', 'hermes', 'openclaw'].some((term) => lower.includes(term))) return [];
      const [pid, status, label] = line.split('\t');
      if (!label) return [];
      return [{ id: label, name: label, status: pid && pid !== '-' ? 'active' : 'loaded', pid: pid || null, exit_status: status || null }];
    });
  } catch {
    return [];
  }
}

async function heartbeat() {
  try {
    const file = join(userHome, '.hermes/profiles/paladinknox/state/youtube-channels/heartbeat.json');
    return JSON.parse(await readFile(file, 'utf8'));
  } catch {
    return null;
  }
}

const jobs = launchJobs();
const pipeline = await heartbeat();
const payload = {
  schema_version: 1,
  generated_at: new Date().toISOString(),
  collector: { id: 'nikita-mac', version: '1.0.0' },
  summary: {
    fleet_active_jobs: jobs.filter((job) => job.status === 'active').length,
    fleet_total_jobs: jobs.length,
    pipeline_status: pipeline?.cycle?.status || 'unknown',
    pipeline_last_run: pipeline?.last_run || null,
    spend_target_usd: 0,
  },
  agents: jobs,
  missions: [],
  approvals: [],
  pipeline_heartbeat: pipeline,
};

const body = JSON.stringify(payload);
const signature = createHmac('sha256', secret).update(body).digest('hex');
const response = await fetch(endpoint, {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'x-olympia-signature': signature },
  body,
});

if (!response.ok) {
  console.error(`Telemetry push failed: ${response.status} ${await response.text()}`);
  process.exit(1);
}

console.log(`Telemetry accepted at ${new Date().toISOString()}`);
