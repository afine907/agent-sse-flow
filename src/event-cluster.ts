import type { FlowEvent } from './types';
export interface EventCluster { key: string; label: string; events: FlowEvent[]; count: number; avgDuration?: number; totalCost?: number; totalTokens?: number; expanded: boolean; }
export function clusterEvents(events: FlowEvent[]): EventCluster[] {
  const clusterMap = new Map<string, FlowEvent[]>();
  for (const event of events) {
    const key = event.type === 'tool_call' && event.tool ? `tool:${event.tool}` : `type:${event.type}`;
    if (!clusterMap.has(key)) clusterMap.set(key, []);
    clusterMap.get(key)!.push(event);
  }
  const clusters: EventCluster[] = [];
  for (const [key, clusterEvents] of clusterMap) {
    const label = key.startsWith('tool:') ? key.slice(5) : key.slice(5);
    let totalDuration = 0, durationCount = 0, totalCost = 0, totalTokens = 0;
    for (const e of clusterEvents) { if (e.duration !== undefined) { totalDuration += e.duration; durationCount++; } if (e.cost !== undefined) totalCost += e.cost; if (e.tokens !== undefined) totalTokens += e.tokens; }
    clusters.push({ key, label, events: clusterEvents, count: clusterEvents.length, avgDuration: durationCount > 0 ? Math.round(totalDuration / durationCount) : undefined, totalCost: totalCost > 0 ? totalCost : undefined, totalTokens: totalTokens > 0 ? totalTokens : undefined, expanded: false });
  }
  clusters.sort((a, b) => b.count - a.count);
  return clusters;
}
export function getClusterColor(key: string): string {
  if (key.startsWith('tool:')) return '#f59e0b';
  const typeColors: Record<string, string> = { start: '#3b82f6', thinking: '#8b5cf6', tool_call: '#f59e0b', tool_result: '#10b981', message: '#06b6d4', error: '#ef4444', end: '#10b981' };
  return typeColors[key.replace('type:', '')] || '#6e8bfa';
}
