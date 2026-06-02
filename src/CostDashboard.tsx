import { memo, useMemo } from 'react';
import type { FlowEvent, EventType } from './types';
import { EVENT_DOT_COLORS } from './utils';

const PS = 140, PR = 55, PC = PS / 2;

function arc(cx: number, cy: number, r: number, sa: number, ea: number): string {
  const sr = ((sa - 90) * Math.PI) / 180, er = ((ea - 90) * Math.PI) / 180;
  return `M ${cx} ${cy} L ${cx + r * Math.cos(sr)} ${cy + r * Math.sin(sr)} A ${r} ${r} 0 ${ea - sa > 180 ? 1 : 0} 1 ${cx + r * Math.cos(er)} ${cy + r * Math.sin(er)} Z`;
}

export const CostDashboard = memo(function CostDashboard({ events, theme }: { events: FlowEvent[]; theme: 'dark' | 'light' }) {
  const isDark = theme === 'dark';
  const a = useMemo(() => {
    let tc = 0, tt = 0, tcc = 0, tcc2 = 0;
    const ba = new Map<string, number>(), bt = new Map<EventType, number>();
    for (const e of events) { const c = e.cost || 0, t = e.tokens || 0; tc += c; tt += t; if (e.type === 'tool_call') { tcc++; tcc2 += c; } if (e.agentName) ba.set(e.agentName, (ba.get(e.agentName) || 0) + c); bt.set(e.type, (bt.get(e.type) || 0) + c); }
    return { tc, tt, tcc, avg: tcc > 0 ? tcc2 / tcc : 0, ba: Array.from(ba.entries()).sort((x, y) => y[1] - x[1]), bt: Array.from(bt.entries()).sort((x, y) => y[1] - x[1]) };
  }, [events]);
  const pd = useMemo(() => a.bt.filter(([, v]) => v > 0).map(([t, v]) => ({ l: t, v, c: EVENT_DOT_COLORS[t] })), [a.bt]);
  const slices = useMemo(() => { const tot = pd.reduce((s, d) => s + d.v, 0); if (!tot) return []; let ca = 0; return pd.map(d => { const ang = (d.v / tot) * 360, sl = { p: arc(PC, PC, PR, ca, ca + ang), c: d.c, l: d.l, pct: ((d.v / tot) * 100).toFixed(1) }; ca += ang; return sl; }); }, [pd]);
  if (!a.tc && !a.tt) return <div className="agent-flow__cost-empty">No cost or token data available.</div>;
  const sb = isDark ? 'var(--af-surface)' : 'var(--af-surface)', tc2 = isDark ? '#e2e4ed' : '#1a1d2e', sc = isDark ? '#8b8fa4' : '#6b7085';
  return (
    <div className="agent-flow__cost-dashboard">
      <div className="agent-flow__cost-cards">
        {[['Total Cost', `$${a.tc.toFixed(4)}`], ['Total Tokens', a.tt.toLocaleString()], ['Avg Cost / Tool Call', `$${a.avg.toFixed(4)}`], ['Tool Calls', String(a.tcc)]].map(([l, v]) => <div key={l} className="agent-flow__cost-card" style={{ background: sb }}><span className="agent-flow__cost-card-label">{l}</span><span className="agent-flow__cost-card-value">{v}</span></div>)}
      </div>
      <div className="agent-flow__cost-details">
        {slices.length > 0 && (
          <div className="agent-flow__cost-pie-section">
            <span className="agent-flow__cost-section-title">Cost by Event Type</span>
            <svg width={PS} height={PS} viewBox={`0 0 ${PS} ${PS}`}>{slices.map((s, i) => <path key={i} d={s.p} fill={s.c} stroke={isDark ? '#0f1117' : '#ffffff'} strokeWidth="1.5" />)}</svg>
            <div className="agent-flow__cost-pie-legend">{slices.map((s, i) => <div key={i} className="agent-flow__cost-pie-legend-item"><span className="agent-flow__cost-pie-legend-dot" style={{ background: s.c }} /><span className="agent-flow__cost-pie-legend-label" style={{ color: sc }}>{s.l}</span><span className="agent-flow__cost-pie-legend-pct" style={{ color: tc2 }}>{s.pct}%</span></div>)}</div>
          </div>
        )}
        {a.ba.length > 0 && (
          <div className="agent-flow__cost-agent-section">
            <span className="agent-flow__cost-section-title">Cost by Agent</span>
            <div className="agent-flow__cost-agent-list">{a.ba.map(([ag, cost]) => <div key={ag} className="agent-flow__cost-agent-row"><span className="agent-flow__cost-agent-name" style={{ color: tc2 }}>{ag}</span><span className="agent-flow__cost-agent-bar-wrapper"><span className="agent-flow__cost-agent-bar" style={{ width: `${Math.max(2, (cost / a.tc) * 100)}%`, background: 'var(--af-accent)' }} /></span><span className="agent-flow__cost-agent-value" style={{ color: sc }}>${cost.toFixed(4)}</span></div>)}</div>
          </div>
        )}
      </div>
    </div>
  );
});
CostDashboard.displayName = 'CostDashboard';
