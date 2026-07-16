'use client';

import { useEffect, useState } from 'react';
import Sidebar from './Sidebar';

export default function Shell({ children, summary, title, subtitle }) {
  const [now, setNow] = useState(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="mc-layout">
      {/* Warm sunset horizon */}
      <div className="horizon" aria-hidden="true">
        <svg viewBox="0 0 1440 220" preserveAspectRatio="none">
          <defs>
            <linearGradient id="seaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F4DDD4" stopOpacity="0" />
              <stop offset="60%" stopColor="#F4DDD4" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#C8856B" stopOpacity="0.15" />
            </linearGradient>
          </defs>
          <g className="wave1">
            <path d="M0,140 C240,110 480,170 720,150 C960,130 1200,170 1440,140 L1440,220 L0,220 Z" fill="url(#seaGrad)" />
          </g>
          <g className="wave2" opacity="0.4">
            <path d="M0,170 C240,150 480,195 720,180 C960,165 1200,195 1440,175 L1440,220 L0,220 Z" fill="#E8B4A0" />
          </g>
        </svg>
      </div>

      <Sidebar summary={summary} />

      <main className="mc-main">
        <header className="mc-topbar">
          <div>
            <h1>{title}</h1>
            {subtitle && <p className="mc-subtitle">{subtitle}</p>}
          </div>
          <div className="mc-topbar-right">
            <span className="pill">
              <span className="dot" /> fleet online
            </span>
            {now && (
              <span className="pill">
                <span className="dot mute" />
                {now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
              </span>
            )}
          </div>
        </header>

        {children}

        <footer className="mc-foot">
          <span>olympia-mission-control · cloudflare pages · $0/mo</span>
          <span>baked {summary?.generated_at ? new Date(summary.generated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}</span>
        </footer>
      </main>
    </div>
  );
}
