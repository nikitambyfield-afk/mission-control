import { loadData } from '../data-loader';
import Shell from '../Shell';

export const dynamic = 'force-static';

export default function CalypsoPage() {
  const data = loadData();
  const c = data?.calypso || {};
  const stats = c.stats || {};
  const transcripts = c.transcripts || [];
  const channels = c.channels || [];
  const principles = c.principles || [];
  const hb = c.pipeline_heartbeat || {};
  const completionPct = stats.channels_total ? Math.round(100 * (stats.channels_with_transcripts || 0) / stats.channels_total) : 0;

  const transByChannel = {};
  for (const t of transcripts) {
    const ch = t.channel || 'unknown';
    if (!transByChannel[ch]) transByChannel[ch] = [];
    transByChannel[ch].push(t);
  }

  return (
    <Shell summary={data?.summary} title="Calypso" subtitle="Marketing study & instruction · YouTube learning pipeline">
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div className="eyebrow" style={{ marginBottom: 12 }}>The Ogygia Observatory</div>
        <h1 className="headline" style={{ fontFamily: 'var(--display)', fontStyle: 'italic', fontSize: 30, fontWeight: 600, color: 'var(--ink)', margin: '0 0 12px', letterSpacing: '-0.01em' }}>
          A nymph who keeps <em style={{ color: 'var(--accent)' }}>studying</em><br />
          <span style={{ color: 'var(--muted)' }}>while the fleet does the work.</span>
        </h1>

        <div className="mc-cards">
          <div className="mc-card">
            <div className="mc-label">Channels tracked</div>
            <div className="mc-value">{stats.channels_total ?? '—'}</div>
            <div className="mc-sub">YouTube sources monitored</div>
          </div>
          <div className="mc-card">
            <div className="mc-label">Transcripts in vault</div>
            <div className="mc-value">{stats.total_transcripts ?? 0}</div>
            <div className="mc-sub">local · ~/Movies/HermesMemory/</div>
          </div>
          <div className="mc-card">
            <div className="mc-label">Pipeline heartbeat</div>
            <div className="mc-value" style={{ fontSize: 18 }}>{hb.last_run ? new Date(hb.last_run).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}</div>
            <div className="mc-sub"><span className="mc-tag active">{hb.cycle?.status ?? '?'}</span></div>
          </div>
          <div className="mc-card">
            <div className="mc-label">Completion</div>
            <div className="mc-value">{completionPct}%</div>
            <div className="mc-bar"><div className="mc-fill" style={{ width: `${completionPct}%` }} /></div>
            <div className="mc-sub">{stats.channels_with_transcripts ?? 0} of {stats.channels_total ?? '—'} channels</div>
          </div>
        </div>

        <div className="mc-section">
          <div className="mc-section-head">
            <h2><span className="num">01</span>Channels · {channels.length}</h2>
          </div>
          <div className="mc-panel">
            {channels.map((ch, i) => {
              const has = transByChannel[ch.name]?.length > 0;
              return (
                <div key={i} className="mc-row">
                  <span className="mc-key">
                    <code style={{ color: 'var(--accent)' }}>{ch.id}</code>
                    <span style={{ marginLeft: 10 }}>{ch.name}</span>
                  </span>
                  <span className="mc-val">
                    {has ? (
                      <><span className="mc-tag active">studied</span><span style={{ marginLeft: 8, fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)' }}>{transByChannel[ch.name].length} vid</span></>
                    ) : (
                      <span className="mc-tag pending">queued</span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mc-section">
          <div className="mc-section-head">
            <h2><span className="num">02</span>Transcripts · {transcripts.length}</h2>
          </div>
          <div className="mc-panel">
            {transcripts.length === 0 && <p style={{ color: 'var(--muted)', fontFamily: 'var(--ui)' }}>No transcripts yet. Pipeline runs every 6h.</p>}
            {transcripts.map((t, i) => (
              <div key={i} className="mc-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
                <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between' }}>
                  <span className="mc-key">{t.channel} · <code style={{ color: 'var(--ink-soft)' }}>{t.video_id}</code></span>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)' }}>{t.published?.slice(0, 10)}</span>
                </div>
                <span style={{ color: 'var(--ink)', fontFamily: 'var(--display)', fontSize: 14 }}>{t.title}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mc-section">
          <div className="mc-section-head">
            <h2><span className="num">03</span>Indexed principles · {principles.length}</h2>
          </div>
          <div className="mc-panel">
            <ol style={{ paddingLeft: 20, margin: 0 }}>
              {principles.map((p, i) => (
                <li key={i} style={{ padding: '14px 0', borderBottom: i < principles.length - 1 ? '1px solid var(--line)' : 'none', fontFamily: 'var(--ui)', fontSize: 13 }}>
                  <strong style={{ fontFamily: 'var(--display)', fontSize: 15 }}>{p.concept}</strong> — <em style={{ color: 'var(--accent)' }}>{p.book}</em>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6, fontFamily: 'var(--ui)' }}>{p.description}</div>
                </li>
              ))}
            </ol>
          </div>
        </div>

        <div className="mc-section">
          <div className="mc-section-head">
            <h2><span className="num">04</span>Pipeline status</h2>
          </div>
          <div className="mc-panel">
            <div className="mc-row">
              <span className="mc-key">Last cycle</span>
              <span className="mc-val">{hb.cycle ? new Date(hb.last_run).toLocaleString() : '—'}</span>
            </div>
            <div className="mc-row">
              <span className="mc-key">Result</span>
              <span className="mc-val">{hb.cycle?.transcripts_written ?? 0} written · {hb.cycle?.no_transcript ?? 0} skipped</span>
            </div>
            <div className="mc-row">
              <span className="mc-key">Schedule</span>
              <span className="mc-val">every 6h · launchd ai.calypso.youtube-pipeline</span>
            </div>
            <div className="mc-row">
              <span className="mc-key">Watchdog</span>
              <span className="mc-val"><span className="mc-tag active">live</span></span>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}
