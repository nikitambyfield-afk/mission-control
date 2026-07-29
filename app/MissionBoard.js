'use client';

import { useEffect, useMemo, useState } from 'react';

const COLUMNS = [
  { id: 'signals', label: 'Signals', glyph: '◌', description: 'New intelligence' },
  { id: 'planned', label: 'Planned', glyph: '◇', description: 'Approved queue' },
  { id: 'running', label: 'Running', glyph: '▶', description: 'Verified execution' },
  { id: 'review', label: 'Review', glyph: '◎', description: 'Human decision' },
  { id: 'blocked', label: 'Blocked', glyph: '!', description: 'Needs intervention' },
  { id: 'complete', label: 'Complete', glyph: '✓', description: 'Proof attached' },
];

const CARD_LIMIT = 24;

function seedCards(data, fleet, approvals) {
  const telemetryMode = data?.telemetry_mode || 'snapshot';
  const generatedAt = data?.generated_at || null;
  const cards = [];

  cards.push({
    id: 'signal-telemetry',
    title: telemetryMode === 'live' ? 'Fleet telemetry connected' : 'Connect secure telemetry relay',
    detail: telemetryMode === 'live'
      ? 'Mac runtime is reporting directly to Olympia.'
      : 'Cloud view is using a verified snapshot. Live status is intentionally not inferred.',
    column: telemetryMode === 'live' ? 'complete' : 'signals',
    agent: 'Watchdog',
    emoji: '🐕',
    priority: telemetryMode === 'live' ? 'low' : 'high',
    cost: '$0',
    source: telemetryMode,
    evidenceAt: generatedAt,
    proof: telemetryMode === 'live' ? '/api/fleet' : null,
  });

  if (data?.hermes) {
    cards.push({
      id: 'signal-hermes',
      title: `Hermes agent · ${data.hermes.overall}`,
      detail: data.hermes.connected
        ? `v${data.hermes.version} · gateway ${data.hermes.gateway_state} · ${data.hermes.active_sessions} active sessions`
        : 'Hermes status channel is unavailable.',
      column: data.hermes.overall === 'healthy' ? 'running' : 'blocked',
      agent: 'Hermes',
      emoji: '👁️',
      priority: data.hermes.overall === 'healthy' ? 'medium' : 'high',
      cost: '$0',
      source: telemetryMode,
      evidenceAt: data.hermes.checked_at || generatedAt,
      proof: telemetryMode === 'live' ? 'Hermes /api/status' : null,
    });
  }

  approvals.forEach((approval, index) => {
    cards.push({
      id: `approval-${index}`,
      title: approval.item,
      detail: approval.blocker,
      column: approval.status === 'blocked' ? 'blocked' : 'review',
      agent: 'Nikita',
      emoji: '👑',
      priority: approval.status === 'blocked' ? 'high' : 'medium',
      cost: approval.cost || '$0 target',
      source: 'approval queue',
      evidenceAt: generatedAt,
      proof: null,
    });
  });

  fleet.filter((agent) => agent.status === 'active').slice(0, 6).forEach((agent) => {
    cards.push({
      id: `agent-${agent.id}`,
      title: agent.mission || agent.role,
      detail: `${agent.name} · ${agent.location}`,
      column: telemetryMode === 'live' ? 'running' : 'signals',
      agent: agent.name,
      emoji: agent.emoji,
      priority: 'medium',
      cost: '$0',
      source: telemetryMode,
      evidenceAt: generatedAt,
      proof: telemetryMode === 'live' ? '/api/fleet' : null,
    });
  });

  return cards.slice(0, CARD_LIMIT);
}

function ageLabel(value, now) {
  if (!now) return 'checking';
  if (!value) return 'no evidence';
  const delta = now.getTime() - new Date(value).getTime();
  const minutes = Math.max(0, Math.round(delta / 60000));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
}

export default function MissionBoard({ data, fleet, approvals }) {
  const seed = useMemo(() => seedCards(data, fleet, approvals), [data, fleet, approvals]);
  const [cards, setCards] = useState(seed);
  const [dragged, setDragged] = useState(null);
  const [filter, setFilter] = useState('all');
  const [proofOnly, setProofOnly] = useState(false);
  const [selected, setSelected] = useState(null);
  const [now, setNow] = useState(null);

  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('olympia-kanban-v4') || 'null');
      if (Array.isArray(stored) && stored.length) setCards(stored.slice(0, CARD_LIMIT));
    } catch {}
  }, []);

  useEffect(() => {
    try { localStorage.setItem('olympia-kanban-v4', JSON.stringify(cards)); } catch {}
  }, [cards]);

  useEffect(() => {
    if (data?.telemetry_mode !== 'live') return;
    setCards((current) => {
      const needsRefresh = current.some((card) => card.source === 'snapshot')
        || (data?.hermes && !current.some((card) => card.id === 'signal-hermes'));
      if (!needsRefresh) return current;
      const liveCards = seed.filter((card) => card.source === 'live');
      return [...liveCards, ...current.filter((card) => !['snapshot', 'live'].includes(card.source))].slice(0, CARD_LIMIT);
    });
  }, [data?.telemetry_mode, data?.hermes, seed]);

  function moveCard(cardId, column) {
    setCards((current) => current.map((card) => (
      card.id === cardId
        ? { ...card, column, movedAt: new Date().toISOString() }
        : card
    )));
  }

  function resetBoard() {
    setCards(seed);
    try { localStorage.removeItem('olympia-kanban-v4'); } catch {}
  }

  const filteredCards = cards.filter((card) => {
    if (proofOnly && !card.proof) return false;
    if (filter === 'all') return true;
    return card.priority === filter || card.agent.toLowerCase().includes(filter);
  });

  return (
    <section className="mission-board">
      <div className="board-toolbar">
        <div>
          <span className="eyebrow">Olympia Kanban v4</span>
          <h2>Mission Operations</h2>
          <p>Move work only when its state changes. “Running” means verified execution—not intention.</p>
        </div>
        <div className="board-controls">
          <select value={filter} onChange={(event) => setFilter(event.target.value)} aria-label="Filter mission cards">
            <option value="all">All missions</option>
            <option value="high">High priority</option>
            <option value="medium">Medium priority</option>
            <option value="watchdog">Watchdog</option>
            <option value="nikita">Nikita</option>
          </select>
          <button className={proofOnly ? 'active' : ''} onClick={() => setProofOnly((value) => !value)}>Proof mode</button>
          <button onClick={resetBoard}>Reset board</button>
        </div>
      </div>

      <div className="board-status">
        <span><i className={data?.telemetry_mode === 'live' ? 'live' : 'snapshot'} />Telemetry · {data?.telemetry_mode || 'snapshot'}</span>
        <span>{cards.length} mission cards</span>
        <span>{cards.filter((card) => card.column === 'blocked').length} blockers</span>
        <span>{cards.filter((card) => card.proof).length} with proof</span>
      </div>

      <div className="kanban-scroll">
        <div className="kanban-grid">
          {COLUMNS.map((column) => {
            const columnCards = filteredCards.filter((card) => card.column === column.id);
            return (
              <div
                className={`kanban-column column-${column.id}`}
                key={column.id}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => {
                  if (dragged) moveCard(dragged, column.id);
                  setDragged(null);
                }}
              >
                <header>
                  <div><b>{column.glyph}</b><strong>{column.label}</strong><span>{columnCards.length}</span></div>
                  <small>{column.description}</small>
                </header>
                <div className="kanban-stack">
                  {columnCards.map((card) => (
                    <article
                      className={`mission-card priority-${card.priority}`}
                      key={card.id}
                      draggable
                      onDragStart={() => setDragged(card.id)}
                      onDragEnd={() => setDragged(null)}
                      onClick={() => setSelected(card)}
                    >
                      <div className="mission-card-top">
                        <span className={`priority-dot ${card.priority}`} />
                        <span className="mission-source">{card.source}</span>
                        <span className="mission-age">{ageLabel(card.evidenceAt, now)}</span>
                      </div>
                      <h3>{card.title}</h3>
                      <p>{card.detail}</p>
                      <div className="mission-meta">
                        <span><b>{card.emoji}</b>{card.agent}</span>
                        <span>{card.cost}</span>
                      </div>
                      <footer>
                        <span className={card.proof ? 'has-proof' : 'no-proof'}>{card.proof ? '✓ proof' : '○ unverified'}</span>
                        <button onClick={(event) => { event.stopPropagation(); setSelected(card); }}>•••</button>
                      </footer>
                    </article>
                  ))}
                  {columnCards.length === 0 && <div className="empty-column">Drop mission here</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {selected && (
        <div className="mission-drawer-backdrop" onClick={() => setSelected(null)}>
          <aside className="mission-drawer" onClick={(event) => event.stopPropagation()}>
            <button className="drawer-close" onClick={() => setSelected(null)}>×</button>
            <span className={`mc-tag ${selected.column === 'blocked' ? 'blocked' : 'pending'}`}>{selected.column}</span>
            <h2>{selected.title}</h2>
            <p>{selected.detail}</p>
            <dl>
              <div><dt>Agent</dt><dd>{selected.emoji} {selected.agent}</dd></div>
              <div><dt>Priority</dt><dd>{selected.priority}</dd></div>
              <div><dt>Cost guard</dt><dd>{selected.cost}</dd></div>
              <div><dt>Data source</dt><dd>{selected.source}</dd></div>
              <div><dt>Evidence age</dt><dd>{ageLabel(selected.evidenceAt, now)}</dd></div>
              <div><dt>Proof</dt><dd>{selected.proof || 'Not attached'}</dd></div>
            </dl>
            <label>Move mission</label>
            <div className="drawer-columns">
              {COLUMNS.map((column) => (
                <button
                  className={selected.column === column.id ? 'active' : ''}
                  key={column.id}
                  onClick={() => {
                    moveCard(selected.id, column.id);
                    setSelected((card) => ({ ...card, column: column.id }));
                  }}
                >
                  {column.glyph} {column.label}
                </button>
              ))}
            </div>
          </aside>
        </div>
      )}
    </section>
  );
}
