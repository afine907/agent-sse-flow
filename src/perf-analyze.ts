/**
 * Performance Bottleneck Detection
 *
 * Analyzes an event stream for common performance issues:
 *   - Slow tool calls (duration > threshold)
 *   - High-cost events
 *   - Frequent error patterns
 *   - Long thinking times
 *   - Low token efficiency (high cost per token)
 */

import type { FlowEvent } from './types';

export type FindingSeverity = 'info' | 'warning' | 'error';

export interface PerfFinding {
  /** Category of the bottleneck */
  category: 'slow_tool' | 'high_cost' | 'error_rate' | 'long_thinking' | 'low_efficiency';
  /** Severity level */
  severity: FindingSeverity;
  /** Human-readable description */
  description: string;
  /** IDs of related events */
  relatedEventIds: number[];
  /** Optional suggestion for improvement */
  suggestion?: string;
}

export interface PerfAnalysisOptions {
  /** Duration threshold in ms for slow tool calls (default: 3000) */
  slowToolThreshold?: number;
  /** Cost threshold in USD for high-cost events (default: 0.01) */
  highCostThreshold?: number;
  /** Error rate threshold as a ratio 0-1 (default: 0.15) */
  errorRateThreshold?: number;
  /** Duration threshold in ms for long thinking (default: 10000) */
  longThinkingThreshold?: number;
  /** Cost-per-token threshold in USD (default: 0.0001) */
  costPerTokenThreshold?: number;
}

export interface PerfAnalysisResult {
  /** List of bottleneck findings, sorted by severity (error > warning > info) */
  findings: PerfFinding[];
  /** Total number of events analyzed */
  totalEvents: number;
  /** Timestamp of analysis */
  analyzedAt: number;
}

const SEVERITY_ORDER: Record<FindingSeverity, number> = {
  error: 0,
  warning: 1,
  info: 2,
};

/**
 * Analyze an event stream for performance bottlenecks.
 *
 * @param events - Array of FlowEvent objects to analyze
 * @param options - Optional thresholds for detection
 * @returns PerfAnalysisResult with sorted findings
 *
 * @example
 * ```ts
 * const result = analyzePerformance(events);
 * for (const finding of result.findings) {
 *   console.log(`[${finding.severity}] ${finding.description}`);
 * }
 * ```
 */
export function analyzePerformance(
  events: FlowEvent[],
  options: PerfAnalysisOptions = {},
): PerfAnalysisResult {
  const {
    slowToolThreshold = 3000,
    highCostThreshold = 0.01,
    errorRateThreshold = 0.15,
    longThinkingThreshold = 10000,
    costPerTokenThreshold = 0.0001,
  } = options;

  const findings: PerfFinding[] = [];

  // --- Slow tool calls ---
  const slowTools: FlowEvent[] = [];
  for (const e of events) {
    if (e.type === 'tool_call' && e.duration !== undefined && e.duration > slowToolThreshold) {
      slowTools.push(e);
    }
  }
  if (slowTools.length > 0) {
    const worstTools = slowTools
      .sort((a, b) => (b.duration ?? 0) - (a.duration ?? 0))
      .slice(0, 5);
    const toolNames = [...new Set(worstTools.map(e => e.tool).filter(Boolean))];
    findings.push({
      category: 'slow_tool',
      severity: slowTools.length >= 5 ? 'error' : 'warning',
      description: `${slowTools.length} tool call(s) exceeded ${slowToolThreshold}ms threshold. Slowest: ${toolNames.join(', ')}`,
      relatedEventIds: worstTools.map(e => e.id),
      suggestion: 'Consider optimizing tool implementations, adding caching, or increasing timeouts.',
    });
  }

  // --- High-cost events ---
  const highCostEvents: FlowEvent[] = [];
  for (const e of events) {
    if (e.cost !== undefined && e.cost > highCostThreshold) {
      highCostEvents.push(e);
    }
  }
  if (highCostEvents.length > 0) {
    const sorted = highCostEvents.sort((a, b) => (b.cost ?? 0) - (a.cost ?? 0)).slice(0, 5);
    const totalHighCost = highCostEvents.reduce((sum, e) => sum + (e.cost ?? 0), 0);
    findings.push({
      category: 'high_cost',
      severity: totalHighCost > 0.1 ? 'error' : 'warning',
      description: `${highCostEvents.length} event(s) exceeded $${highCostThreshold} threshold. Total high-cost: $${totalHighCost.toFixed(4)}`,
      relatedEventIds: sorted.map(e => e.id),
      suggestion: 'Review high-cost events for unnecessary operations or consider batching requests.',
    });
  }

  // --- Frequent errors ---
  const errorEvents = events.filter(e => e.type === 'error');
  if (events.length > 0) {
    const errorRate = errorEvents.length / events.length;
    if (errorRate > errorRateThreshold) {
      const recentErrors = errorEvents.slice(-5);
      findings.push({
        category: 'error_rate',
        severity: errorRate > 0.3 ? 'error' : 'warning',
        description: `Error rate is ${(errorRate * 100).toFixed(1)}% (${errorEvents.length}/${events.length} events), exceeding ${(errorRateThreshold * 100).toFixed(0)}% threshold`,
        relatedEventIds: recentErrors.map(e => e.id),
        suggestion: 'Investigate error causes. Common issues: network timeouts, invalid inputs, or service unavailability.',
      });
    }
  }

  // --- Long thinking times ---
  const longThinking: FlowEvent[] = [];
  for (const e of events) {
    if (e.type === 'thinking' && e.duration !== undefined && e.duration > longThinkingThreshold) {
      longThinking.push(e);
    }
  }
  if (longThinking.length > 0) {
    const sorted = longThinking.sort((a, b) => (b.duration ?? 0) - (a.duration ?? 0)).slice(0, 5);
    findings.push({
      category: 'long_thinking',
      severity: longThinking.length >= 3 ? 'warning' : 'info',
      description: `${longThinking.length} thinking step(s) exceeded ${longThinkingThreshold / 1000}s threshold`,
      relatedEventIds: sorted.map(e => e.id),
      suggestion: 'Long thinking may indicate complex reasoning. Consider breaking tasks into smaller steps.',
    });
  }

  // --- Low token efficiency ---
  const eventsWithBoth = events.filter(e => e.cost !== undefined && e.tokens !== undefined && e.tokens! > 0);
  const lowEfficiency: FlowEvent[] = [];
  for (const e of eventsWithBoth) {
    const costPerToken = e.cost! / e.tokens!;
    if (costPerToken > costPerTokenThreshold) {
      lowEfficiency.push(e);
    }
  }
  if (lowEfficiency.length > 0) {
    const sorted = lowEfficiency
      .sort((a, b) => (b.cost! / b.tokens!) - (a.cost! / a.tokens!))
      .slice(0, 5);
    const avgCpt = lowEfficiency.reduce((s, e) => s + e.cost! / e.tokens!, 0) / lowEfficiency.length;
    findings.push({
      category: 'low_efficiency',
      severity: avgCpt > costPerTokenThreshold * 3 ? 'warning' : 'info',
      description: `${lowEfficiency.length} event(s) have cost-per-token above $${costPerTokenThreshold} (avg: $${avgCpt.toFixed(6)})`,
      relatedEventIds: sorted.map(e => e.id),
      suggestion: 'Consider using a more cost-efficient model or reducing prompt length.',
    });
  }

  // Sort by severity
  findings.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);

  return {
    findings,
    totalEvents: events.length,
    analyzedAt: Date.now(),
  };
}
