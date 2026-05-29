import type { FlowEvent } from './types';
export interface AnalysisResult { summary: string; findings?: AnalysisFinding[]; suggestions?: string[]; raw?: string; }
export interface AnalysisFinding { category: 'performance' | 'error' | 'pattern' | 'optimization' | 'general'; severity: 'info' | 'warning' | 'error'; description: string; relatedEventIds?: number[]; }
export interface AnalysisOptions { focus?: 'performance' | 'errors' | 'patterns' | 'all'; maxEvents?: number; includeArgs?: boolean; includeResults?: boolean; }
export type AnalyzeCallback = (events: FlowEvent[], options?: AnalysisOptions) => Promise<AnalysisResult>;
export function prepareEventsForAnalysis(events: FlowEvent[], options: AnalysisOptions = {}): FlowEvent[] {
  const { maxEvents = 100, includeArgs = false, includeResults = false } = options;
  return events.slice(-maxEvents).map(e => { const p: FlowEvent = { ...e }; if (!includeArgs) { delete p.args; delete p.argsJson; } if (!includeResults) delete p.result; return p; });
}
export function buildAnalysisPrompt(events: FlowEvent[], options: AnalysisOptions = {}): string {
  const p = prepareEventsForAnalysis(events, options);
  return `Analyze agent trace (${p.length} events). Focus: ${options.focus || 'all'}.\n${p.map(e => `[${e.type}]${e.tool ? ` tool=${e.tool}` : ''}${e.message ? ` "${e.message.slice(0,80)}"` : ''}`).join('\n')}`;
}
