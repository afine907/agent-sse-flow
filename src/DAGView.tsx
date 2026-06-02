import { memo, useMemo } from 'react';
import type { FlowEvent } from './types';

interface DAGNode { name: string; color: string; eventCount: number; totalCost: number; }
interface DAGEdge { from: string; to: string; count: number; }
interface NodePos { x: number; y: number; }
const NW = 140, NH = 56, PX = 40, PY = 60;

function inferEdges(events: FlowEvent[]): DAGEdge[] {
  const m = new Map<string, number>();
  for (let i = 0; i < events.length - 1; i++) {
    const c = events[i], n = events[i + 1];
    if (!c.agentName || !n.agentName || c.agentName === n.agentName) continue;
    if ((c.type === 'tool_result' || c.type === 'message') && (n.type === 'thinking' || n.type === 'tool_call' || n.type === 'start')) {
      if (c.timestamp && n.timestamp && n.timestamp - c.timestamp > 10000) continue;
      const k = c.agentName + '->' + n.agentName;
      m.set(k, (m.get(k) || 0) + 1);
    }
  }
  return Array.from(m.entries()).map(([k, count]) => { const [from, to] = k.split('->'); return { from, to, count }; });
}

function extractNodes(events: FlowEvent[]): DAGNode[] {
  const m = new Map<string, DAGNode>();
  for (const e of events) {
    if (!e.agentName) continue;
    let n = m.get(e.agentName);
    if (!n) { n = { name: e.agentName, color: e.agentColor || 'var(--af-accent)', eventCount: 0, totalCost: 0 }; m.set(e.agentName, n); }
    n.eventCount++; n.totalCost += e.cost || 0;
  }
  return Array.from(m.values());
}

function layout(nodes: DAGNode[], edges: DAGEdge[]): Map<string, NodePos> {
  const pos = new Map<string, NodePos>(), names = nodes.map(n => n.name);
  if (!names.length) return pos;
  const inD = new Map<string, number>(), adj = new Map<string, string[]>();
  names.forEach(n => { inD.set(n, 0); adj.set(n, []); });
  edges.forEach(e => { if (inD.has(e.to)) inD.set(e.to, (inD.get(e.to) || 0) + 1); if (adj.has(e.from)) adj.get(e.from)!.push(e.to); });
  const layers: string[][] = [], assigned = new Set<string>();
  let q = names.filter(n => (inD.get(n) || 0) === 0);
  if (!q.length) q = [...names];
  while (q.length) {
    layers.push([...q]); q.forEach(n => assigned.add(n));
    const nq: string[] = [];
    q.forEach(name => { (adj.get(name) || []).forEach(nb => { if (!assigned.has(nb)) { const d = (inD.get(nb) || 1) - 1; inD.set(nb, d); if (d <= 0) nq.push(nb); } }); });
    q = nq;
  }
  const ua = names.filter(n => !assigned.has(n)); if (ua.length) layers.push(ua);
  const tw = Math.max(...layers.map(l => l.length * (NW + PX) - PX), 300);
  layers.forEach((l, li) => { const lw = l.length * (NW + PX) - PX, sx = (tw - lw) / 2; l.forEach((n, ni) => pos.set(n, { x: sx + ni * (NW + PX), y: li * (NH + PY) })); });
  return pos;
}

function edgePath(f: NodePos, t: NodePos): string {
  const x1 = f.x + NW / 2, y1 = f.y + NH, x2 = t.x + NW / 2, y2 = t.y, my = (y1 + y2) / 2;
  return `M ${x1} ${y1} C ${x1} ${my}, ${x2} ${my}, ${x2} ${y2}`;
}

export const DAGView = memo(function DAGView({ events, theme }: { events: FlowEvent[]; theme: 'dark' | 'light' }) {
  const nodes = useMemo(() => extractNodes(events), [events]);
  const edges = useMemo(() => inferEdges(events), [events]);
  const positions = useMemo(() => layout(nodes, edges), [nodes, edges]);
  if (!nodes.length) return <div className="agent-flow__dag-empty">No agent events found to build dependency graph.</div>;
  let mx = 0, my = 0;
  positions.forEach(p => { mx = Math.max(mx, p.x + NW); my = Math.max(my, p.y + NH); });
  const isDark = theme === 'dark', nf = isDark ? '#1e2133' : '#f4f5f7', tc = isDark ? '#e2e4ed' : '#1a1d2e', sc = isDark ? '#8b8fa4' : '#6b7085', ec = isDark ? '#3d4060' : '#c5c9d3';
  return (
    <div className="agent-flow__dag">
      <svg width={mx + 80} height={my + 80} viewBox={`0 0 ${mx + 80} ${my + 80}`} className="agent-flow__dag-svg">
        <defs><marker id="dag-arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill={ec} /></marker></defs>
        {edges.map((e, i) => { const fp = positions.get(e.from), tp = positions.get(e.to); if (!fp || !tp || e.from === e.to) return null; return (<g key={i}><path d={edgePath(fp, tp)} fill="none" stroke={ec} strokeWidth={Math.min(1 + e.count * 0.3, 4)} strokeDasharray={e.count === 1 ? '6 3' : undefined} markerEnd="url(#dag-arrowhead)" className="agent-flow__dag-edge" />{e.count > 1 && <text x={(fp.x + NW / 2 + tp.x + NW / 2) / 2} y={(fp.y + NH + tp.y) / 2} textAnchor="middle" fill={sc} fontSize="10" fontFamily="var(--af-mono)">{e.count}x</text>}</g>); })}
        {nodes.map(n => { const p = positions.get(n.name); if (!p) return null; const nc = n.color.startsWith('#') ? n.color : 'var(--af-accent)'; return (<g key={n.name} className="agent-flow__dag-node"><rect x={p.x} y={p.y} width={NW} height={NH} rx={8} ry={8} fill={nf} stroke={nc} strokeWidth={2} /><rect x={p.x} y={p.y} width={NW} height={4} rx={8} ry={8} fill={nc} /><rect x={p.x} y={p.y + 2} width={NW} height={2} fill={nc} /><text x={p.x + NW / 2} y={p.y + 24} textAnchor="middle" fill={tc} fontSize="12" fontWeight="600" fontFamily="var(--af-font)">{n.name.length > 14 ? n.name.slice(0, 14) + '...' : n.name}</text><text x={p.x + NW / 2} y={p.y + 42} textAnchor="middle" fill={sc} fontSize="10" fontFamily="var(--af-mono)">{n.eventCount} events{n.totalCost > 0 ? ` | $${n.totalCost.toFixed(3)}` : ''}</text></g>); })}
      </svg>
    </div>
  );
});
DAGView.displayName = 'DAGView';
