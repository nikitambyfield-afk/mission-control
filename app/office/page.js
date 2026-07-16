import { loadData } from '../data-loader';
import Shell from '../Shell';

export const dynamic = 'force-static';

export default function OfficePage() {
  const data = loadData();
  const o = data?.office || {};
  const fleet = o.fleet || [];
  const approvals = o.pending_approvals || [];

  // Position fleet members in rooms
  const rooms = [
    { id: 'ceo', label: 'CEO Office', x: 5, y: 5, w: 30, h: 35, members: fleet.filter(b => b.tier === 1) },
    { id: 'override', label: 'Override Booth', x: 40, y: 5, w: 25, h: 25, members: fleet.filter(b => b.tier === 2) },
    { id: 'ops', label: 'Operations', x: 70, y: 5, w: 25, h: 35, members: fleet.filter(b => b.tier === 3) },
    { id: 'research', label: 'Research Wing', x: 40, y: 38, w: 25, h: 25, members: fleet.filter(b => b.id === 'calypso' || b.id === 'persephone' || b.id === 'artemis' || b.id === 'hestia') },
    { id: 'pipeline', label: 'Engine Room', x: 5, y: 48, w: 30, h: 22, members: fleet.filter(b => b.id === 'youtube-pipeline' || b.id === 'watchdog') },
    { id: 'reserved', label: 'Reserved Desks', x: 70, y: 48, w: 25, h: 22, members: [] },
  ];

  return (
    <Shell summary={data?.summary} title="2D Office" subtitle="Fleet floor plan · who sits where">
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div className="mc-cards">
          <div className="mc-card">
            <div className="mc-label">Fleet total</div>
            <div className="mc-value">{fleet.length}</div>
            <div className="mc-sub">across {rooms.length} rooms</div>
          </div>
          <div className="mc-card">
            <div className="mc-label">Active now</div>
            <div className="mc-value" style={{ color: 'var(--good)' }}>{fleet.filter((b) => b.status === 'active').length}</div>
            <div className="mc-sub">live + working</div>
          </div>
          <div className="mc-card">
            <div className="mc-label">Reserved</div>
            <div className="mc-value" style={{ color: 'var(--muted)' }}>{fleet.filter((b) => b.status === 'dormant').length}</div>
            <div className="mc-sub">defined, not deployed</div>
          </div>
          <div className="mc-card">
            <div className="mc-label">Approvals</div>
            <div className="mc-value" style={{ color: 'var(--wait)' }}>{approvals.length}</div>
            <div className="mc-sub">awaiting Nikita</div>
          </div>
        </div>

        {/* Real 2D Floor Plan */}
        <div className="mc-section">
          <div className="mc-section-head">
            <h2><span className="num">01</span>Floor Plan · The Ogygia Office</h2>
            <span className="right">hover rooms for detail</span>
          </div>
          <div className="floor-plan" style={{ height: 420, position: 'relative' }}>
            <div className="floor-plan-bg" />
            {/* Rooms */}
            {rooms.map((room) => (
              <div
                key={room.id}
                className="room"
                style={{
                  left: room.x + '%',
                  top: room.y + '%',
                  width: room.w + '%',
                  height: room.h + '%',
                }}
              >
                <span className="room-label">{room.label}</span>
                {room.members.length === 0 ? (
                  <span style={{ color: 'var(--dim)', fontSize: 11, fontFamily: 'var(--mono)' }}>empty</span>
                ) : (
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', paddingTop: 8 }}>
                    {room.members.map((m, i) => (
                      <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                        <span className="avatar">{m.emoji}</span>
                        <span className="avatar-name">{m.name.split(' ')[0]}</span>
                        <span className={`avatar-status ${m.status}`} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Fleet detail */}
        <div className="mc-section">
          <div className="mc-section-head">
            <h2><span className="num">02</span>Fleet roster</h2>
          </div>
          <div className="mc-panel">
            {fleet.map((b, i) => (
              <div key={i} className="mc-row" style={{ alignItems: 'center' }}>
                <span className="mc-key" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 20 }}>{b.emoji}</span>
                  <strong style={{ fontFamily: 'var(--display)', fontSize: 15, color: 'var(--ink)' }}>{b.name}</strong>
                </span>
                <span className="mc-val" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <span style={{ color: 'var(--muted)', fontSize: 11, fontFamily: 'var(--mono)' }}>{b.role}</span>
                  <code style={{ fontSize: 10 }}>{b.location}</code>
                  <span className={`mc-tag ${b.status}`}>{b.status}</span>
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Pending approvals */}
        <div className="mc-section">
          <div className="mc-section-head">
            <h2><span className="num">03</span>Pending approvals · {approvals.length}</h2>
          </div>
          <div className="mc-panel">
            {approvals.map((a, i) => (
              <div key={i} className="mc-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
                <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between' }}>
                  <span className="mc-key" style={{ color: 'var(--ink)' }}>
                    <strong style={{ fontFamily: 'var(--display)', fontSize: 14 }}>{a.item}</strong>
                  </span>
                  <span className={`mc-tag ${a.status}`}>{a.status}</span>
                </div>
                <span style={{ color: 'var(--ink-soft)', fontSize: 12 }}>blocker: {a.blocker}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Shell>
  );
}
