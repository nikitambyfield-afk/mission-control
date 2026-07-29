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

function hermesPort() {
  try {
    const pids = execFileSync('pgrep', ['-f', 'hermes_cli.main serve'], { encoding: 'utf8', timeout: 3000 })
      .trim()
      .split('\n')
      .filter(Boolean);
    for (const pid of pids) {
      const output = execFileSync(
        'lsof',
        ['-nP', '-a', '-p', pid, '-iTCP', '-sTCP:LISTEN'],
        { encoding: 'utf8', timeout: 3000 },
      );
      const match = output.match(/127\.0\.0\.1:(\d+)\s+\(LISTEN\)/);
      if (match) return Number(match[1]);
    }
  } catch {}
  return null;
}

async function hermesStatus() {
  const port = hermesPort();
  if (!port) return { connected: false, overall: 'unavailable' };
  try {
    let launchGatewayRunning = false;
    let photonRunning = false;
    try {
      execFileSync('launchctl', ['list', 'ai.hermes.gateway'], { stdio: 'ignore', timeout: 3000 });
      launchGatewayRunning = true;
    } catch {}
    try {
      const photon = execFileSync(
        'lsof',
        ['-nP', '-iTCP:8789', '-sTCP:LISTEN'],
        { encoding: 'utf8', timeout: 3000 },
      );
      photonRunning = photon.includes('127.0.0.1:8789');
    } catch {}
    const response = await fetch(`http://127.0.0.1:${port}/api/status`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) return { connected: false, overall: 'unavailable' };
    const status = await response.json();
    const healthy = launchGatewayRunning && photonRunning;
    return {
      connected: true,
      version: status.version || null,
      overall: healthy ? 'healthy' : (status.overall || 'degraded'),
      gateway_running: launchGatewayRunning || Boolean(status.gateway_running),
      gateway_state: launchGatewayRunning ? 'running' : (status.gateway_state || 'unknown'),
      photon_running: photonRunning,
      gateway_busy: Boolean(status.gateway_busy),
      active_agents: Number(status.active_agents || 0),
      active_sessions: Number(status.active_sessions || 0),
      checked_at: new Date().toISOString(),
    };
  } catch {
    return { connected: false, overall: 'unavailable' };
  }
}

const jobs = launchJobs();
const pipeline = await heartbeat();
const hermes = await hermesStatus();
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
  hermes,
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
