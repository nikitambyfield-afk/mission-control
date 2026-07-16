'use client';

import { useEffect, useState, useCallback } from 'react';
import Shell from './Shell';
import Link from 'next/link';

export default function FleetClient({ data: initialData }) {
  const [data, setData] = useState(initialData);
  const [now, setNow] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const r = await fetch('/api/fleet', { cache: 'no-store' });
      if (r.ok) {
        const j = await r.json();
        setData(j);
        setLastRefresh(new Date());
      }
    } catch (e) {
      console.error('refresh failed', e);
    } finally {
      setRefreshing(false);
    }
  }, []);

  // Auto-refresh every 60s
  useEffect(() => {
    const id = setInterval(refresh, 60_000);
    return () => clearInterval(id);
  }, [refresh]);

  const s = data?.summary || {};
  const launchd = data?.launchd || [];
  const transcripts = data?.transcripts || [];
  const channels = data?.channels || [];

  return (
    <Shell summary={s} title="Dashboard" subtitle={`Live fleet · refreshed ${lastRefresh.toLocaleTimeString()}`}>
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div className="eyebrow" style={{ marginBottom: 12 }}>The Ogygia Observatory</div>
        <h1 className="headline" style={{ fontFamily: 'var(--display)', fontStyle: 'italic', fontSize: 32, fontWeight: 600, color: 'var(--ink)', margin: '0 0 24px', letterSpacing: '-0.01em' }}>
          A fleet that keeps <em style={{ color: 'var(--accent)' }}>learning</em><br />
          <span style={{ color: 'var(--muted)' }}>while the work gets done.</span>
        </h1>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <button
            onClick={refresh}
            disabled={refreshing}
            style={{
              background: 'var(--accent)',
              color: 'white',
              border: 'none',
              borderRadius: 999,
              padding: '8px 18px',
              fontFamily: 'var(--mono)',
              fontSize: 11,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              cursor: refreshing ? 'wait' : 'pointer',
              opacity: refreshing ? 0.5 : 1,
              fontWeight: 600,
              transition: 'all 0.2s',
            }}
          >
            {refreshing ? '⟳ refreshing' : '↻ refresh'}
          </button>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)', letterSpacing: '0.08em' }}>
            auto-refresh every 60s · last: {now ? now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) : '—'}
          </span>
        </div>

        <div className="mc-cards">
          <div className="mc-card">
            <div className="mc-label">Active fleet jobs</div>
            <div className="mc-value">{s.fleet_active_jobs ?? '—'}</div>
            <div className="mc-sub">{s.fleet_total_jobs ?? 0} total · live from launchctl</div>
          </div>
          <div className="mc-card">
            <div className="mc-label">Transcripts in vault</div>
            <div className="mc-value">{s.youtube_transcripts ?? 0}</div>
            <div className="mc-sub">{s.channels_with_transcripts ?? 0} of {s.youtube_channels_total ?? '—'} channels</div>
          </div>
          <div className="mc-card">
            <div className="mc-label">Pipeline</div>
            <div className="mc-value" style={{ fontSize: 16, color: s.pipeline_status === 'ok' ? 'var(--good)' : 'var(--hot)' }}>
              {s.pipeline_status?.toUpperCase() || '—'}
            </div>
            <div className="mc-sub">
              {s.pipeline_last_run ? new Date(s.pipeline_last_run).toLocaleString() : 'never'}
            </div>
          </div>
          <div className="mc-card">
            <div className="mc-label">Data freshness</div>
            <div className="mc-value" style={{ fontSize: 16 }}>
              {Math.round((now ? (now - new Date(data.generated_at)) : 0) / 1000)}s
            </div>
            <div className="mc-sub">seconds since last snapshot</div>
          </div>
        </div>

        <div className="mc-section">
          <div className="mc-section-head">
            <h2><span className="num">01</span>Live launchd jobs</h2>
            <span className="right">{launchd.length} active · auto-poll</span>
          </div>
          <div className="mc-panel">
            {launchd.length === 0 && (
              <div style={{ padding: 20, textAlign: 'center', color: 'var(--muted)', fontFamily: 'var(--mono)', fontSize: 12 }}>
                no launchd jobs detected (running on Render, not your Mac — jobs shown only when self-hosted)
              </div>
            )}
            {launchd.map((j, i) => (
              <div key={i} className="mc-row">
                <span className="mc-key"><code style={{ color: 'var(--accent)' }}>{j.label}</code></span>
                <span className="mc-val">
                  <span className={`mc-tag ${j.active ? 'active' : 'dormant'}`}>
                    {j.active ? 'active' : 'loaded'}
                  </span>
                  {j.pid !== '-' && <span style={{ marginLeft: 10, fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)' }}>pid {j.pid}</span>}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="mc-section">
          <div className="mc-section-head">
            <h2><span className="num">02</span>Recent transcripts</h2>
            <span className="right">{transcripts.length} total</span>
          </div>
          <div className="mc-panel">
            {transcripts.length === 0 && (
              <div style={{ padding: 20, textAlign: 'center', color: 'var(--muted)' }}>
                no transcripts yet · pipeline runs every 6h
              </div>
            )}
            {transcripts.slice(0, 5).map((t, i) => (
              <div key={i} className="mc-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
                <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between' }}>
                  <span className="mc-key">{t.channel} · <code style={{ color: 'var(--ink-soft)' }}>{t.video_id}</code></span>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)' }}>
                    {Math.round(t.chars / 1024)}kb · {new Date(t.mtime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
                <span style={{ color: 'var(--ink)', fontFamily: 'var(--display)', fontSize: 14 }}>{t.title}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mc-section">
          <div className="mc-section-head">
            <h2><span className="num">03</span>Live API</h2>
          </div>
          <div className="mc-panel">
            <div className="mc-row">
              <span className="mc-key"><code>/api/fleet</code></span>
              <span className="mc-val">
                <a href="/api/fleet" target="_blank">JSON</a> · auto-refreshes every 60s
              </span>
            </div>
            <div className="mc-row">
              <span className="mc-key"><code>/api/health</code></span>
              <span className="mc-val">health check · always available</span>
            </div>
          </div>
        </div>

        <div className="mc-section">
          <div className="mc-section-head">
            <h2><span className="num">04</span>Quick links</h2>
          </div>
          <div className="mc-panel">
            <div className="mc-row">
              <span className="mc-key">Calypso bot (static mirror)</span>
              <span className="mc-val"><a href="https://calypso-bot.pages.dev" target="_blank" rel="noreferrer">calypso-bot.pages.dev</a></span>
            </div>
            <div className="mc-row">
              <span className="mc-key">2D Office floor plan</span>
              <span className="mc-val"><Link href="/office/">view office →</Link></span>
            </div>
            <div className="mc-row">
              <span className="mc-key">Calypso research</span>
              <span className="mc-val"><Link href="/calypso/">view transcripts →</Link></span>
            </div>
            <div className="mc-row">
              <span className="mc-key">Hermes memory + incidents</span>
              <span className="mc-val"><Link href="/hermes/">view memory →</Link></span>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}
