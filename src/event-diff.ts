import type { FlowEvent } from './types';
export type DiffLineType = 'equal' | 'added' | 'removed' | 'changed';
export interface DiffLine { type: DiffLineType; field: string; leftValue: string; rightValue: string; }
export function diffEvents(left: FlowEvent, right: FlowEvent): DiffLine[] {
  const lines: DiffLine[] = [];
  const fields = ['type', 'message', 'tool', 'argsJson', 'result', 'duration'] as const;
  for (const field of fields) {
    const lv = left[field] !== undefined ? String(left[field]) : '';
    const rv = right[field] !== undefined ? String(right[field]) : '';
    if (lv === rv) { if (lv) lines.push({ type: 'equal', field, leftValue: lv, rightValue: rv }); }
    else if (!lv && rv) lines.push({ type: 'added', field, leftValue: '', rightValue: rv });
    else if (lv && !rv) lines.push({ type: 'removed', field, leftValue: lv, rightValue: '' });
    else lines.push({ type: 'changed', field, leftValue: lv, rightValue: rv });
  }
  return lines;
}
