import type { FlowEvent } from './types';
export interface AnalysisResult { summary: string; findings?: AnalysisFinding[]; suggestions?: string[]; raw?: string; }
export interface AnalysisFinding { category: 'performance' | 'error' | 'pattern' | 'optimization' | 'general'; severity: 'info' | 'warning' | 'error'; description: string; relatedEventIds?: number[]; }
export interface AnalysisOptions { focus?: 'performance' | 'errors' | 'patterns' | 'all'; maxEvents?: number; includeArgs?: boolean; includeResults?: boolean; }
export type AnalyzeCallback = (events: FlowEvent[], options?: AnalysisOptions) => Promise<AnalysisResult>;
export function prepareEventsForAnalysis(events: FlowEvent[], options: AnalysisOptions = {}): FlowEvent[] {
  const { maxEvents = 100, includeArgs = false, includeResults = false } = options;
  const sliced = events.slice(-maxEvents);
  return sliced.map(e => { const prepared: FlowEvent = { ...e }; if (!includeArgs) { delete prepared.args; delete prepared.argsJson; } if (!includeResults) delete prepared.result; return prepared; });
}
export function buildAnalysisPrompt(events: FlowEvent[], options: AnalysisOptions = {}): string {
  const prepared = prepareEventsForAnalysis(events, options);
  const focus = options.focus || 'all';
  const eventSummary = prepared.map(e => { const parts = [`[${e.type}]`]; if (e.tool) parts.push(`tool=${e.tool}`); if (e.message) parts.push(`msg="${e.message.slice(0,100)}"`); if (e.duration) parts.push(`${e.duration}ms`); return parts.join(' '); }).join('\n');
  return `Analyze the following agent execution trace. Focus on: ${focus}.\n\nEvents (${prepared.length}):\n${eventSummary}\n\nProvide:\n1. A brief summary\n2. Key findings\n3. Suggestions for improvement`;
}
