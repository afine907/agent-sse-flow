import type { FlowEvent } from './types';
export interface EventCluster { key: string; label: string; events: FlowEvent[]; count: number; avgDuration?: number; totalCost?: number; totalTokens?: number; expanded: boolean; }
export function clusterEvents(events: FlowEvent[]): EventCluster[] {
  const m = new Map<string, FlowEvent[]>();
  for (const e of events) { const k = e.type === 'tool_call' && e.tool ? `tool:${e.tool}` : `type:${e.type}`; if (!m.has(k)) m.set(k, []); m.get(k)!.push(e); }
  const clusters: EventCluster[] = [];
  for (const [key, evts] of m) {
    let td = 0, dc = 0, tc = 0, tt = 0;
    for (const e of evts) { if (e.duration !== undefined) { td += e.duration; dc++; } if (e.cost !== undefined) tc += e.cost; if (e.tokens !== undefined) tt += e.tokens; }
    clusters.push({ key, label: key.split(':').pop() || key, events: evts, count: evts.length, avgDuration: dc > 0 ? Math.round(td / dc) : undefined, totalCost: tc > 0 ? tc : undefined, totalTokens: tt > 0 ? tt : undefined, expanded: false });
  }
  return clusters.sort((a, b) => b.count - a.count);
}
export function getClusterColor(key: string): string {
  if (key.startsWith('tool:')) return '#f59e0b';
  return ({ start: '#3b82f6', thinking: '#8b5cf6', tool_call: '#f59e0b', tool_result: '#10b981', message: '#06b6d4', error: '#ef4444', end: '#10b981' } as Record<string, string>)[key.replace('type:', '')] || '#6e8bfa';
}
