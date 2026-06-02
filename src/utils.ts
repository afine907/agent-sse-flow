import type { FlowEvent } from './types';

/** Format timestamp to HH:MM:SS */
export function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString('en-US', { hour12: false });
}

/** Format timestamp as relative time (e.g. "3s ago", "2m ago", "1h ago") */
export function formatRelativeTime(ts: number): string {
  const diffMs = Date.now() - ts;
  if (diffMs < 0) return 'just now';
  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/** Copy text to clipboard with fallback for non-HTTPS */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textarea);
    return success;
  } catch (err) {
    console.error('[AgentFlow] Failed to copy:', err);
    return false;
  }
}

export const EVENT_DOT_COLORS: Record<FlowEvent['type'], string> = {
  start: '#3b82f6',
  thinking: '#8b5cf6',
  tool_call: '#f59e0b',
  tool_result: '#10b981',
  message: '#06b6d4',
  error: '#ef4444',
  end: '#10b981',
};

/** Trigger a file download in the browser */
function downloadFile(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Escape a CSV field, quoting if necessary */
function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/** Export events as JSON file */
export function exportToJSON(events: FlowEvent[]): void {
  const data = JSON.stringify(events, null, 2);
  downloadFile('agent-flow-events.json', data, 'application/json');
}

/** Export events as CSV file */
export function exportToCSV(events: FlowEvent[]): void {
  const headers = ['id', 'type', 'message', 'tool', 'timestamp', 'agentName', 'cost', 'tokens', 'duration'];
  const rows = events.map(e =>
    headers.map(h => csvEscape(e[h as keyof FlowEvent])).join(',')
  );
  const csv = [headers.join(','), ...rows].join('\n');
  downloadFile('agent-flow-events.csv', csv, 'text/csv');
}

/** Generate a curl command from a tool_call event */
export function generateCurlCommand(event: FlowEvent): string {
  const tool = event.tool || 'unknown';
  const args = event.argsJson || (event.args ? JSON.stringify(event.args, null, 2) : '{}');
  const endpoint = `/tools/${tool}`;
  return `curl -X POST '${endpoint}' \\\n  -H 'Content-Type: application/json' \\\n  -d '${args.replace(/'/g, "'\\''")}'`;
}

/** Generate a one-line summary for the collapsed timeline view */
export function getSummary(event: FlowEvent): string {
  switch (event.type) {
    case 'message':
      return event.message?.split('\n')[0]?.slice(0, 80) ?? '';
    case 'tool_call':
      return event.tool + (event.args?.path ? ` ${event.args.path}` : '');
    case 'tool_result':
      return event.result?.split('\n')[0]?.slice(0, 80) ?? '';
    case 'error':
      return event.message?.split('\n')[0]?.slice(0, 80) ?? 'Error';
    case 'thinking':
      return event.message?.split('\n')[0]?.slice(0, 80) ?? 'Thinking...';
    default:
      return event.type;
  }
}
