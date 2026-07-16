import { loadData } from '../data-loader';
import Shell from '../Shell';

export const dynamic = 'force-static';

export default function HermesPage() {
  const data = loadData();
  const h = data?.hermes || {};
  const cost = h.cost_status || {};
  const brain = h.shared_brain || [];
  const timeline = h.incident_timeline || [];
  const peers = h.peer_cards || [];

  return (
    <Shell summary={data?.summary} title="Hermes" subtitle="Memory · shared brain · incident history">
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div className="mc-cards">
          <div className="mc-card">
            <div className="mc-label">Peer cards</div>
            <div className="mc-value">{peers.length}</div>
            <div className="mc-sub">fleet + team</div>
          </div>
          <div className="mc-card">
            <div className="mc-label">Shared brain</div>
            <div className="mc-value">{brain.length}</div>
            <div className="mc-sub">recent entries</div>
          </div>
          <div className="mc-card">
            <div className="mc-label">Incidents logged</div>
            <div className="mc-value">{timeline.length}</div>
            <div className="mc-sub">current snapshot</div>
          </div>
          <div className="mc-card">
            <div className="mc-label">Cost incident</div>
            <div className="mc-value" style={{ color: cost.cost_incident_resolved ? 'var(--good)' : 'var(--hot)' }}>
              ${(cost.cost_incident_amount_usd ?? 0).toFixed(0)}
            </div>
            <div className="mc-sub"><span className="mc-tag active">resolved</span></div>
          </div>
        </div>

        <div className="mc-section">
          <div className="mc-section-head">
            <h2><span className="num">01</span>Peer cards</h2>
          </div>
          <div className="mc-panel">
            {peers.map((p, i) => (
              <div key={i} className="mc-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
                <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between' }}>
                  <span className="mc-key" style={{ color: 'var(--ink)' }}><strong style={{ fontFamily: 'var(--display)', fontSize: 15 }}>{p.name}</strong></span>
                  <span className="mc-tag">{p.role}</span>
                </div>
                <span style={{ color: 'var(--ink-soft)', fontSize: 12 }}>{p.style}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mc-section">
          <div className="mc-section-head">
            <h2><span className="num">02</span>Cost incident · {cost.cost_incident_date}</h2>
            <span className="right">{cost.cost_incident_resolved ? '✓ resolved' : '⚠ open'}</span>
          </div>
          <div className="mc-panel">
            <div className="mc-row">
              <span className="mc-key">Amount</span>
              <span className="mc-val" style={{ color: 'var(--hot)', fontFamily: 'var(--display)', fontSize: 18, fontWeight: 600 }}>
                ${(cost.cost_incident_amount_usd ?? 0).toFixed(2)}
              </span>
            </div>
            <div className="mc-row">
              <span className="mc-key">Root cause</span>
              <span className="mc-val" style={{ fontSize: 12 }}>{cost.cost_incident_root_cause}</span>
            </div>
            <div style={{ marginTop: 16 }}>
              <div className="mc-label" style={{ marginBottom: 8 }}>Active guards</div>
              <ul style={{ paddingLeft: 16, margin: 0, listStyle: 'none' }}>
                {(cost.cost_guard_active || []).map((g, i) => (
                  <li key={i} style={{ fontSize: 12, color: 'var(--ink-soft)', padding: '4px 0', fontFamily: 'var(--mono)' }}>
                    <span style={{ color: 'var(--good)' }}>✓</span> {g}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="mc-section">
          <div className="mc-section-head">
            <h2><span className="num">03</span>Incident timeline</h2>
          </div>
          <div className="mc-panel">
            {timeline.map((e, i) => (
              <div key={i} className="mc-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
                <span className="mc-key"><code style={{ color: 'var(--accent)' }}>{e.date}</code></span>
                <span style={{ color: 'var(--ink)', fontSize: 13, fontFamily: 'var(--ui)' }}>{e.event}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mc-section">
          <div className="mc-section-head">
            <h2><span className="num">04</span>Shared brain · recent</h2>
          </div>
          <div className="mc-panel">
            {brain.map((b, i) => (
              <div key={i} className="mc-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
                <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between' }}>
                  <span className="mc-key">
                    <code style={{ color: 'var(--accent)' }}>{b.bot}</code>
                    <span style={{ marginLeft: 8 }}>{b.category}</span>
                  </span>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)' }}>
                    {b.mtime ? new Date(b.mtime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
                  </span>
                </div>
                <span style={{ color: 'var(--ink-soft)', fontSize: 11 }}>{b.preview}</span>
                <div style={{ marginTop: 4 }}>
                  {(b.tags || []).slice(0, 4).map((t, j) => (
                    <span key={j} className="mc-tag">{t}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Shell>
  );
}
