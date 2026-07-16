'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
  { href: '/', label: 'Dashboard', emoji: '⚡' },
  { href: '/calypso/', label: 'Calypso', emoji: '🌊' },
  { href: '/hermes/', label: 'Hermes', emoji: '🧠' },
  { href: '/office/', label: '2D Office', emoji: '📐' },
];

export default function Sidebar({ summary }) {
  const pathname = usePathname() || '/';
  const isActive = (href) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <aside className="mc-sidebar">
      <div className="brand">
        <div className="mark"><span className="glyph">⌑</span>Olympia</div>
        <span className="sub">Mission Control</span>
      </div>
      <nav className="mc-nav">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`mc-nav-item ${isActive(item.href) ? 'active' : ''}`}
          >
            <span className="mc-emoji">{item.emoji}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
      <div className="mc-sidebar-foot">
        <div><span className="pill"><span className="dot" /> {summary?.fleet_active_jobs ?? '—'} active</span></div>
        <div style={{ marginTop: 6 }}>
          <span className="pill"><span className="dot mute" /> {summary?.cloudflare_deployments ?? 0} CF deploys</span>
        </div>
        <div style={{ marginTop: 12, fontSize: 9, opacity: 0.5 }}>
          v2.0 · Ogygia Observatory<br />
          {new Date(summary?.generated_at || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </div>
      </div>
    </aside>
  );
}
