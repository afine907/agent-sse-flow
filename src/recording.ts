/**
 * Event Stream Recording
 *
 * Captures raw SSE event data as JSONL (JSON Lines) format.
 * Each line is a raw JSON object from the SSE stream.
 * The resulting file can be replayed using the mock server.
 */

export interface RecordingState {
  /** Whether recording is active */
  isRecording: boolean;
  /** Timestamp when recording started */
  startedAt: number | null;
  /** Number of events captured */
  eventCount: number;
}

/**
 * Create a new recording buffer.
 * Returns an object with methods to push events, get the current state,
 * and finalize the recording into a downloadable JSONL string.
 */
export function createRecordingBuffer() {
  const lines: string[] = [];
  let startedAt: number | null = null;
  let recording = false;

  return {
    /** Start recording */
    start(): void {
      lines.length = 0;
      startedAt = Date.now();
      recording = true;
    },

    /** Stop recording */
    stop(): void {
      recording = false;
    },

    /** Push a raw SSE event JSON string */
    push(rawJson: string): void {
      if (!recording) return;
      lines.push(rawJson);
    },

    /** Whether recording is active */
    get isRecording(): boolean {
      return recording;
    },

    /** When recording started */
    get startTime(): number | null {
      return startedAt;
    },

    /** Number of captured events */
    get count(): number {
      return lines.length;
    },

    /** Get the JSONL content as a string */
    toJSONL(): string {
      return lines.join('\n') + (lines.length > 0 ? '\n' : '');
    },

    /** Get captured raw JSON lines */
    getLines(): string[] {
      return [...lines];
    },

    /** Reset the buffer */
    reset(): void {
      lines.length = 0;
      startedAt = null;
      recording = false;
    },
  };
}

export type RecordingBuffer = ReturnType<typeof createRecordingBuffer>;

/**
 * Trigger a download of the recording as a .jsonl file.
 *
 * @param content - JSONL string content
 * @param filename - Optional filename (default: auto-generated with timestamp)
 */
export function downloadJSONL(content: string, filename?: string): void {
  const name = filename ?? `agent-flow-recording-${new Date().toISOString().replace(/[:.]/g, '-')}.jsonl`;
  const blob = new Blob([content], { type: 'application/jsonl' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Parse a JSONL string into an array of raw JSON objects.
 * Useful for replaying recorded streams.
 *
 * @param jsonl - JSONL string content
 * @returns Array of parsed JSON objects
 */
export function parseJSONL(jsonl: string): Record<string, unknown>[] {
  const results: Record<string, unknown>[] = [];
  const lines = jsonl.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const obj = JSON.parse(trimmed);
      if (obj && typeof obj === 'object') {
        results.push(obj);
      }
    } catch {
      // Skip malformed lines
    }
  }
  return results;
}
