'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Shell from './Shell';

const COMMANDS = [
  { match: ['unhealthy', 'risk', 'watchdog'], label: 'Scan fleet risks', result: 'Watchdog scan complete: pipeline heartbeat is the only elevated signal.' },
  { match: ['agents', 'fleet', 'status'], label: 'Show fleet status', result: 'Fleet view focused. Active and dormant agents are mapped below.' },
  { match: ['approval', 'approve'], label: 'Review approvals', result: 'Approval cockpit focused. No action was executed.' },
  { match: ['cost', 'spend', 'budget'], label: 'Check cost guard', result: 'Cost guard is active. Olympia remains configured for a $0 operating target.' },
  { match: ['calypso', 'research'], label: 'Open Calypso', result: 'Calypso is monitoring the research pipeline.' },
];

const STATIC_FLEET = [
  { id: 'nikita', name: 'Nikita', emoji: '👑', tier: 1, role: 'CEO / Owner', status: 'active', location: 'MacBook Air', mission: 'Direct Olympia and approve consequential actions', confidence: 100 },
  { id: 'athena', name: 'Athena', emoji: '✨', tier: 2, role: 'Override voice', status: 'active', location: 'Telegram DM', mission: 'Escalate decisions and protect executive focus', confidence: 98 },
  { id: 'hermes', name: 'Hermes', emoji: '👁️', tier: 3, role: 'Operator', status: 'active', location: 'Hermes runtime', mission: 'Operate the fleet, memory, and scheduled systems', confidence: 94 },
  { id: 'calypso', name: 'Calypso', emoji: '🌊', tier: 4, role: 'Research intelligence', status: 'active', location: 'Research wing', mission: 'Study markets and turn signals into principles', confidence: 88 },
  { id: 'persephone', name: 'Persephone', emoji: '🌸', tier: 4, role: 'Reserved', status: 'dormant', location: 'Unassigned', mission: 'Awaiting deployment brief', confidence: 0 },
  { id: 'artemis', name: 'Artemis', emoji: '🏹', tier: 4, role: 'Reserved', status: 'dormant', location: 'Unassigned', mission: 'Awaiting deployment brief', confidence: 0 },
  { id: 'hestia', name: 'Hestia', emoji: '🔥', tier: 4, role: 'Reserved', status: 'dormant', location: 'Unassigned', mission: 'Awaiting deployment brief', confidence: 0 },
  { id: 'youtube-pipeline', name: 'YouTube Pipeline', emoji: '📺', tier: 4, role: 'Learning pipeline', status: 'active', location: 'Engine room', mission: 'Ingest and index selected research sources', confidence: 82 },
  { id: 'watchdog', name: 'Watchdog', emoji: '🐕', tier: 4, role: 'Predictive guard', status: 'active', location: 'Engine room', mission: 'Detect stale pipelines, cost spikes, and loops', confidence: 96 },
];

const STATIC_APPROVALS = [
  { item: 'Add OpenAI API key for backup', status: 'pending', blocker: 'Cost lock — no API spend without explicit approval', risk: 'medium', cost: 'Variable' },
  { item: 'Restore Calypso API routes', status: 'blocked', blocker: 'Runtime compatibility decision required', risk: 'low', cost: '$0 target' },
  { item: 'Deploy bow-and-brunch-site', status: 'blocked', blocker: 'Source package is incomplete', risk: 'low', cost: '$0 target' },
  { item: 'Deploy Hermes mobile', status: 'pending', blocker: 'Product decision required', risk: 'medium', cost: '$0 target' },
];

function relativeAge(value, now) {
  if (!now) return 'connecting…';
  if (!value) return 'no heartbeat';
  const seconds = Math.max(0, Math.round((now - new Date(value)) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m ago`;
  return `${Math.round(seconds / 3600)}h ago`;
}

export default function FleetClient({ data: initialData }) {
  const [data, setData] = useState(initialData);
  const [now, setNow] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [command, setCommand] = useState('');
  const [commandResult, setCommandResult] = useState(null);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [approvalStates, setApprovalStates] = useState({});

  useEffect(() => {
    setNow(new Date());
    setLastRefresh(new Date());
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const response = await fetch('/api/fleet', { cache: 'no-store' });
      if (response.ok) {
        const live = await response.json();
        setData((previous) => ({
          ...previous,
          ...live,
          summary: { ...previous?.summary, ...live?.summary },
          fleet: live?.fleet?.length ? live.fleet : previous?.fleet,
          approvals: live?.approvals?.length ? live.approvals : previous?.approvals,
        }));
        setLastRefresh(new Date());
      }
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const timer = setInterval(refresh, 60_000);
    return () => clearInterval(timer);
  }, [refresh]);

  const fleet = data?.fleet?.length ? data.fleet.map((agent) => ({
    confidence: agent.status === 'active' ? 90 : 0,
    mission: agent.role,
    ...agent,
  })) : STATIC_FLEET;
  const approvals = data?.approvals?.length ? data.approvals : STATIC_APPROVALS;
  const s = data?.summary || {};
  const snapshotJobs = data?.dashboard?.launchd_jobs || [];
  const liveJobs = data?.launchd?.length ? data.launchd : snapshotJobs;
  const activeAgents = fleet.filter((agent) => agent.status === 'active').length;
  const pipelineHealthy = s.pipeline_status === 'ok' || data?.pipeline_heartbeat?.cycle?.status === 'ok';

  const signals = useMemo(() => [
    {
      level: pipelineHealthy ? 'good' : 'warn',
      title: pipelineHealthy ? 'Pipeline nominal' : 'Pipeline heartbeat stale',
      detail: pipelineHealthy ? 'Research ingestion is reporting a healthy cycle.' : 'Cloud telemetry cannot verify the latest local heartbeat.',
    },
    {
      level: 'good',
      title: '$0 cost guard active',
      detail: 'Hobby limits, no payment method, and manual approvals protect spend.',
    },
    {
      level: liveJobs.length ? 'good' : 'info',
      title: liveJobs.length ? `${liveJobs.length} runtime records available` : 'Local runtime is offline',
      detail: liveJobs.length ? 'Using the most recent verified telemetry snapshot.' : 'Connect a secure telemetry relay for true live Mac status.',
    },
  ], [pipelineHealthy, liveJobs.length]);

  function runCommand(event) {
    event.preventDefault();
    const normalized = command.trim().toLowerCase();
    if (!normalized) return;
    const known = COMMANDS.find((item) => item.match.some((term) => normalized.includes(term)));
    setCommandResult(known?.result || 'Command understood as a planning request. Preview generated; no external action was executed.');
  }

  function setApproval(index, next) {
    setApprovalStates((current) => ({ ...current, [index]: next }));
  }

  return (
    <Shell
      summary={{ ...s, fleet_active_jobs: activeAgents, generated_at: data?.generated_at }}
      title="Command Center"
      subtitle={`Olympia neural operations · synchronized ${lastRefresh ? lastRefresh.toLocaleTimeString() : 'connecting…'}`}
    >
      <section className="command-deck" aria-label="Olympia command interface">
        <div className="command-orb">O</div>
        <div className="command-copy">
          <span className="eyebrow">Olympia Intelligence</span>
          <h1>What should the fleet do next?</h1>
          <form onSubmit={runCommand} className="command-form">
            <input
              value={command}
              onChange={(event) => setCommand(event.target.value)}
              placeholder="Ask about agents, risks, costs, approvals, or research…"
              aria-label="Command Olympia"
            />
            <button type="submit">Preview command ↗</button>
          </form>
          {commandResult && <div className="command-result"><span>PREVIEW</span>{commandResult}</div>}
          <div className="command-hints">
            {COMMANDS.slice(0, 4).map((item) => (
              <button key={item.label} onClick={() => setCommand(item.label)}>{item.label}</button>
            ))}
          </div>
        </div>
      </section>

      <div className="telemetry-strip">
        <div><span>ACTIVE INTELLIGENCE</span><strong>{activeAgents}/{fleet.length}</strong></div>
        <div><span>RESEARCH MEMORY</span><strong>{s.youtube_transcripts ?? data?.transcripts?.length ?? 0}</strong></div>
        <div><span>APPROVAL QUEUE</span><strong>{approvals.filter((a, i) => !approvalStates[i]).length}</strong></div>
        <div><span>SPEND TARGET</span><strong className="pink">$0</strong></div>
        <button className="sync-button" onClick={refresh} disabled={refreshing}>{refreshing ? 'SYNCING…' : 'SYNC NOW'}</button>
      </div>

      <section className="future-grid">
        <div className="neural-map panel-dark">
          <div className="future-heading">
            <div><span>01</span><h2>Neural Fleet Map</h2></div>
            <small>LIVE TOPOLOGY</small>
          </div>
          <div className="map-canvas">
            <svg className="map-lines" viewBox="0 0 900 420" preserveAspectRatio="none" aria-hidden="true">
              <path d="M450 210 L170 90 M450 210 L450 62 M450 210 L730 90 M450 210 L170 330 M450 210 L450 355 M450 210 L730 330" />
              <circle cx="450" cy="210" r="118" />
            </svg>
            <button className="agent-node core" onClick={() => setSelectedAgent(fleet[0])}>
              <span>⌑</span><strong>OLYMPIA</strong><small>ORCHESTRATOR</small>
            </button>
            {fleet.slice(1, 7).map((agent, index) => (
              <button
                key={agent.id}
                className={`agent-node node-${index + 1} ${agent.status}`}
                onClick={() => setSelectedAgent(agent)}
              >
                <span>{agent.emoji}</span><strong>{agent.name}</strong><small>{agent.status}</small>
              </button>
            ))}
          </div>
          <div className="map-legend"><span><i className="live" />active</span><span><i />dormant</span><span>select a node for telemetry</span></div>
        </div>

        <div className="watchdog-panel panel-dark">
          <div className="future-heading">
            <div><span>02</span><h2>Predictive Watchdog</h2></div>
            <small>3 SIGNALS</small>
          </div>
          <div className="signal-list">
            {signals.map((signal) => (
              <div className={`signal ${signal.level}`} key={signal.title}>
                <div className="signal-icon">{signal.level === 'good' ? '✓' : signal.level === 'warn' ? '!' : 'i'}</div>
                <div><strong>{signal.title}</strong><p>{signal.detail}</p></div>
              </div>
            ))}
          </div>
          <div className="heartbeat">
            <span>LAST HEARTBEAT</span>
            <strong>{relativeAge(s.pipeline_last_run || data?.pipeline_heartbeat?.last_run, now)}</strong>
          </div>
        </div>
      </section>

      <section className="future-section">
        <div className="future-heading light">
          <div><span>03</span><h2>Agent Digital Twins</h2></div>
          <small>{fleet.length} IDENTITIES</small>
        </div>
        <div className="twin-grid">
          {fleet.map((agent) => (
            <button className={`twin-card ${agent.status}`} key={agent.id} onClick={() => setSelectedAgent(agent)}>
              <div className="twin-top"><span className="twin-avatar">{agent.emoji}</span><i /></div>
              <strong>{agent.name}</strong>
              <small>{agent.role}</small>
              <p>{agent.mission}</p>
              <div className="confidence"><span style={{ width: `${agent.confidence || 0}%` }} /></div>
              <footer><span>{agent.location}</span><b>{agent.confidence || 0}%</b></footer>
            </button>
          ))}
        </div>
      </section>

      <section className="future-section">
        <div className="future-heading light">
          <div><span>04</span><h2>Human Approval Cockpit</h2></div>
          <small>CONSEQUENTIAL ACTIONS REQUIRE YOU</small>
        </div>
        <div className="approval-list">
          {approvals.map((approval, index) => {
            const decision = approvalStates[index];
            return (
              <article className="approval-card" key={approval.item}>
                <div className="approval-number">{String(index + 1).padStart(2, '0')}</div>
                <div className="approval-main">
                  <div><span className={`mc-tag ${approval.status}`}>{approval.status}</span><span className="risk">risk · {approval.risk || 'review'}</span></div>
                  <h3>{approval.item}</h3>
                  <p>{approval.blocker}</p>
                </div>
                <div className="approval-cost"><span>EST. COST</span><strong>{approval.cost || '$0 target'}</strong></div>
                <div className="approval-actions">
                  {decision ? <strong className={`decision ${decision}`}>{decision.toUpperCase()}</strong> : (
                    <>
                      <button onClick={() => setApproval(index, 'rejected')}>Reject</button>
                      <button className="primary" onClick={() => setApproval(index, 'approved')}>Approve</button>
                    </>
                  )}
                </div>
              </article>
            );
          })}
        </div>
        <p className="approval-note">This cockpit currently records decisions in the browser only. Backend execution remains intentionally disabled until an authenticated action gateway is connected.</p>
      </section>

      <section className="relay-banner">
        <div><span className="eyebrow">Next infrastructure step</span><h2>Connect the secure Mac telemetry relay</h2><p>That turns snapshot status into true real-time fleet health without exposing your machine publicly.</p></div>
        <Link href="/api/health">Inspect health endpoint ↗</Link>
      </section>

      {selectedAgent && (
        <div className="agent-modal-backdrop" onClick={() => setSelectedAgent(null)}>
          <div className="agent-modal" onClick={(event) => event.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedAgent(null)}>×</button>
            <span className="modal-avatar">{selectedAgent.emoji || '⌑'}</span>
            <span className={`mc-tag ${selectedAgent.status}`}>{selectedAgent.status}</span>
            <h2>{selectedAgent.name}</h2>
            <p>{selectedAgent.mission || selectedAgent.role}</p>
            <dl>
              <div><dt>Role</dt><dd>{selectedAgent.role}</dd></div>
              <div><dt>Location</dt><dd>{selectedAgent.location}</dd></div>
              <div><dt>Confidence</dt><dd>{selectedAgent.confidence || 0}%</dd></div>
              <div><dt>Tier</dt><dd>{selectedAgent.tier || 'core'}</dd></div>
            </dl>
          </div>
        </div>
      )}
    </Shell>
  );
}
