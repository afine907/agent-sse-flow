import { memo, useMemo, useRef, useCallback } from 'react';
import type { FlowEvent } from './types';
import { EVENT_DOT_COLORS, formatTime } from './utils';

const BH = 28, LH = 48, TAW = 70;

interface Lane { agentName: string; agentColor: string; events: FlowEvent[]; }

function buildLanes(events: FlowEvent[]): Lane[] {
  const m = new Map<string, Lane>();
  for (const e of events) {
    const n = e.agentName || 'Unknown Agent';
    let l = m.get(n);
    if (!l) { l = { agentName: n, agentColor: e.agentColor || 'var(--af-accent)', events: [] }; m.set(n, l); }
    l.events.push(e);
  }
  return Array.from(m.values());
}

export const SwimlaneView = memo(function SwimlaneView({ events, theme }: { events: FlowEvent[]; theme: 'dark' | 'light' }) {
  const ref = useRef<HTMLDivElement>(null);
  const lanes = useMemo(() => buildLanes(events), [events]);
  const tr = useMemo(() => {
    const wt = events.filter(e => e.timestamp);
    if (!wt.length) return { s: 0, d: 0 };
    const s = wt[0].timestamp!, last = wt[wt.length - 1];
    return { s, d: Math.max(last.timestamp! + (last.duration ?? 0) - s, 1) };
  }, [events]);
  const ticks = useMemo(() => Array.from({ length: 6 }, (_, i) => { const p = i / 5; return { p, l: formatTime(Math.round(tr.s + tr.d * p)) }; }), [tr]);
  const hw = useCallback((e: React.WheelEvent) => { const c = ref.current?.querySelector('.agent-flow__swimlane-content'); if (c) c.scrollLeft += e.deltaX || e.deltaY; }, []);
  if (!lanes.length) return <div className="agent-flow__swimlane-empty">No agent events found for swimlane view.</div>;
  return (
    <div className="agent-flow__swimlane" ref={ref} onWheel={hw}>
      <div className="agent-flow__swimlane-time-axis" style={{ paddingLeft: TAW }}>
        {ticks.map(({ p, l }) => <span key={p} className="agent-flow__swimlane-tick" style={{ left: `${TAW + p * 100}%` }}>{l}</span>)}
      </div>
      <div className="agent-flow__swimlane-content">
        {lanes.map(lane => (
          <div key={lane.agentName} className="agent-flow__swimlane-lane" style={{ height: LH }}>
            <div className="agent-flow__swimlane-label" style={{ width: TAW }}>
              <span className="agent-flow__swimlane-agent-dot" style={{ background: lane.agentColor.startsWith('#') ? lane.agentColor : 'var(--af-accent)' }} />
              <span className="agent-flow__swimlane-agent-name" title={lane.agentName}>{lane.agentName}</span>
            </div>
            <div className="agent-flow__swimlane-track">
              {ticks.map(({ p }) => <div key={p} className="agent-flow__swimlane-grid-line" style={{ left: `${p * 100}%` }} />)}
              {lane.events.map(e => {
                if (!e.timestamp) return null;
                const lp = ((e.timestamp - tr.s) / tr.d) * 100;
                const dur = e.duration ?? 100;
                const wp = Math.max(0.5, (dur / tr.d) * 100);
                return <div key={e.id} className="agent-flow__swimlane-block" style={{ left: `${lp}%`, width: `${Math.min(wp, 30)}%`, background: EVENT_DOT_COLORS[e.type], top: (LH - BH) / 2 }} title={`${e.type}${e.tool ? ': ' + e.tool : ''}${dur ? ` (${dur}ms)` : ''}`}><span className="agent-flow__swimlane-block-label">{e.tool || e.type}</span></div>;
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});
SwimlaneView.displayName = 'SwimlaneView';
