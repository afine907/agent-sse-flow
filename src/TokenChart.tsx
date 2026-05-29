import { memo, useMemo } from 'react';
import type { FlowEvent, EventType } from './types';
import { EVENT_DOT_COLORS } from './utils';

const W = 600, H = 180, P = { t: 20, r: 20, b: 30, l: 60 };

export const TokenChart = memo(function TokenChart({ events, theme }: { events: FlowEvent[]; theme: 'dark' | 'light' }) {
  const pts = useMemo(() => { const p: { ts: number; ct: number; cc: number }[] = []; let ct = 0, cc = 0; for (const e of events) { ct += e.tokens || 0; cc += e.cost || 0; if (e.tokens || e.cost) p.push({ ts: e.timestamp || 0, ct, cc }); } return p; }, [events]);
  const isDark = theme === 'dark', tc = isDark ? '#8b8fa4' : '#6b7085', gc = isDark ? '#2a2d3e' : '#e2e4ea', lc = '#6e8bfa', cl = '#f59e0b';
  const byType = useMemo(() => { const m = new Map<EventType, number>(); for (const e of events) if (e.tokens) m.set(e.type, (m.get(e.type) || 0) + e.tokens); return Array.from(m.entries()).sort((a, b) => b[1] - a[1]); }, [events]);
  if (!pts.length) return <div className="agent-flow__chart-empty">No token or cost data available.</div>;
  const mt = Math.max(...pts.map(d => d.ct), 1), mc = Math.max(...pts.map(d => d.cc), 0.001), s0 = pts[0].ts, sr = Math.max(pts[pts.length - 1].ts - s0, 1), pw = W - P.l - P.r, ph = H - P.t - P.b;
  const sx = (t: number) => P.l + ((t - s0) / sr) * pw, syt = (v: number) => P.t + ph - (v / mt) * ph, syc = (v: number) => P.t + ph - (v / mc) * ph;
  const tp = pts.map((d, i) => `${i ? 'L' : 'M'} ${sx(d.ts)} ${syt(d.ct)}`).join(' '), cp = pts.map((d, i) => `${i ? 'L' : 'M'} ${sx(d.ts)} ${syc(d.cc)}`).join(' ');
  return (
    <div className="agent-flow__chart">
      <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" className="agent-flow__chart-svg">
        {[0, 0.25, 0.5, 0.75, 1].map(p => { const y = P.t + ph * (1 - p); return <g key={p}><line x1={P.l} y1={y} x2={W - P.r} y2={y} stroke={gc} strokeWidth="1" strokeDasharray="4 3" /><text x={P.l - 8} y={y + 3} textAnchor="end" fill={tc} fontSize="10" fontFamily="var(--af-mono)">{Math.round(mt * p).toLocaleString()}</text></g>; })}
        <path d={tp} fill="none" stroke={lc} strokeWidth="2" />
        <path d={cp} fill="none" stroke={cl} strokeWidth="1.5" strokeDasharray="6 3" />
        {pts.map((d, i) => <circle key={i} cx={sx(d.ts)} cy={syt(d.ct)} r="3" fill={lc} />)}
        <line x1={P.l} y1={H - 8} x2={P.l + 20} y2={H - 8} stroke={lc} strokeWidth="2" /><text x={P.l + 24} y={H - 5} fill={tc} fontSize="10" fontFamily="var(--af-font)">Tokens</text>
        <line x1={P.l + 80} y1={H - 8} x2={P.l + 100} y2={H - 8} stroke={cl} strokeWidth="1.5" strokeDasharray="6 3" /><text x={P.l + 104} y={H - 5} fill={tc} fontSize="10" fontFamily="var(--af-font)">Cost ($)</text>
      </svg>
      {byType.length > 0 && <div className="agent-flow__chart-breakdown">{byType.map(([t, tk]) => <span key={t} className="agent-flow__chart-breakdown-item"><span className="agent-flow__chart-breakdown-dot" style={{ background: EVENT_DOT_COLORS[t] }} /><span className="agent-flow__chart-breakdown-label">{t}</span><span className="agent-flow__chart-breakdown-value">{tk.toLocaleString()}</span></span>)}</div>}
    </div>
  );
});
TokenChart.displayName = 'TokenChart';
