/**
 * SSE JSON Parse Worker
 *
 * Offloads JSON.parse + args serialization to a dedicated thread,
 * keeping the main thread free during heavy SSE message bursts.
 *
 * Protocol:
 *   Main -> Worker: { type: 'parse', raw: string } (one per SSE message)
 *   Worker -> Main: { type: 'parsed', event: ParsedSSEEvent }
 *   Worker -> Main: { type: 'error', error: string }
 */

/** Minimal parsed shape returned by the worker (id assigned here) */
export interface ParsedSSEEvent {
  id: number;
  type: string;
  message?: string;
  tool?: string;
  args?: Record<string, unknown>;
  argsJson?: string;
  result?: string;
  timestamp: number;
  agentName?: string;
  agentColor?: string;
  cost?: number;
  tokens?: number;
  duration?: number;
}

/** Messages the worker accepts */
interface WorkerInputMessage {
  type: 'parse';
  raw: string;
}

/** Messages the worker sends back */
type WorkerOutputMessage =
  | { type: 'parsed'; event: ParsedSSEEvent }
  | { type: 'error'; error: string };

let idCounter = 0;

self.onmessage = (e: MessageEvent<WorkerInputMessage>) => {
  const { raw } = e.data;

  try {
    const data = JSON.parse(raw) as Record<string, unknown>;

    let argsJson: string | undefined;
    if (data.args) {
      try {
        argsJson = JSON.stringify(data.args, null, 2);
      } catch {
        argsJson = '[Unable to serialize]';
      }
    }

    const event: ParsedSSEEvent = {
      id: idCounter++,
      type: data.type as string,
      message: data.message as string | undefined,
      tool: data.tool as string | undefined,
      args: data.args as Record<string, unknown> | undefined,
      argsJson,
      result: data.result as string | undefined,
      timestamp: (data.timestamp as number) || Date.now(),
      agentName: data.agentName as string | undefined,
      agentColor: data.agentColor as string | undefined,
      cost: data.cost as number | undefined,
      tokens: data.tokens as number | undefined,
      duration: data.duration as number | undefined,
    };

    const response: WorkerOutputMessage = { type: 'parsed', event };
    self.postMessage(response);
  } catch (err) {
    const response: WorkerOutputMessage = {
      type: 'error',
      error: String(err),
    };
    self.postMessage(response);
  }
};
