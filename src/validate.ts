/**
 * FlowEvent Data Validation
 *
 * Validates incoming event data against the FlowEvent schema.
 * Returns structured validation errors with field-level details.
 */

import type { EventType } from './types';

// Valid EventType values
const VALID_EVENT_TYPES: ReadonlySet<string> = new Set([
  'start',
  'thinking',
  'tool_call',
  'tool_result',
  'message',
  'error',
  'end',
]);

// Hex color pattern (#RGB, #RRGGBB, #RRGGBBAA)
const HEX_COLOR_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

export interface ValidationError {
  /** The field path that failed validation (e.g. "type", "agentColor") */
  field: string;
  /** Human-readable error message */
  message: string;
  /** The actual value that was received */
  value: unknown;
}

export interface ValidationResult {
  /** Whether the data is a valid FlowEvent */
  valid: boolean;
  /** List of validation errors (empty when valid) */
  errors: ValidationError[];
}

/**
 * Validate incoming event data against the FlowEvent schema.
 *
 * Returns a ValidationResult with field-level error details.
 * Does not throw -- errors are collected and returned.
 *
 * @param data - Raw parsed JSON data to validate
 * @returns ValidationResult
 */
export function validateFlowEvent(data: unknown): ValidationResult {
  const errors: ValidationError[] = [];

  // Must be a non-null object
  if (data === null || data === undefined || typeof data !== 'object') {
    return {
      valid: false,
      errors: [{ field: '(root)', message: 'Event data must be a non-null object', value: data }],
    };
  }

  const obj = data as Record<string, unknown>;

  // --- Required fields ---

  // type (required, must be a valid EventType)
  if (obj.type === undefined || obj.type === null) {
    errors.push({ field: 'type', message: 'Field "type" is required', value: obj.type });
  } else if (typeof obj.type !== 'string' || !VALID_EVENT_TYPES.has(obj.type)) {
    errors.push({
      field: 'type',
      message: `Invalid event type. Expected one of: ${[...VALID_EVENT_TYPES].join(', ')}`,
      value: obj.type,
    });
  }

  // --- Optional fields ---

  // message
  if (obj.message !== undefined && obj.message !== null && typeof obj.message !== 'string') {
    errors.push({ field: 'message', message: 'Field "message" must be a string', value: obj.message });
  }

  // tool
  if (obj.tool !== undefined && obj.tool !== null && typeof obj.tool !== 'string') {
    errors.push({ field: 'tool', message: 'Field "tool" must be a string', value: obj.tool });
  }

  // args
  if (obj.args !== undefined && obj.args !== null && typeof obj.args !== 'object') {
    errors.push({ field: 'args', message: 'Field "args" must be an object', value: obj.args });
  }

  // result
  if (obj.result !== undefined && obj.result !== null && typeof obj.result !== 'string') {
    errors.push({ field: 'result', message: 'Field "result" must be a string', value: obj.result });
  }

  // timestamp
  if (obj.timestamp !== undefined && obj.timestamp !== null) {
    if (typeof obj.timestamp !== 'number' || !Number.isFinite(obj.timestamp)) {
      errors.push({
        field: 'timestamp',
        message: 'Field "timestamp" must be a finite number',
        value: obj.timestamp,
      });
    } else if (obj.timestamp < 0) {
      errors.push({
        field: 'timestamp',
        message: 'Field "timestamp" must be non-negative',
        value: obj.timestamp,
      });
    }
  }

  // agentName
  if (obj.agentName !== undefined && obj.agentName !== null && typeof obj.agentName !== 'string') {
    errors.push({ field: 'agentName', message: 'Field "agentName" must be a string', value: obj.agentName });
  }

  // agentColor
  if (obj.agentColor !== undefined && obj.agentColor !== null) {
    if (typeof obj.agentColor !== 'string') {
      errors.push({
        field: 'agentColor',
        message: 'Field "agentColor" must be a string',
        value: obj.agentColor,
      });
    } else if (!HEX_COLOR_RE.test(obj.agentColor)) {
      errors.push({
        field: 'agentColor',
        message: 'Field "agentColor" must be a valid hex color (e.g. #3b82f6)',
        value: obj.agentColor,
      });
    }
  }

  // agentAvatar
  if (obj.agentAvatar !== undefined && obj.agentAvatar !== null && typeof obj.agentAvatar !== 'string') {
    errors.push({
      field: 'agentAvatar',
      message: 'Field "agentAvatar" must be a string',
      value: obj.agentAvatar,
    });
  }

  // cost
  if (obj.cost !== undefined && obj.cost !== null) {
    if (typeof obj.cost !== 'number' || !Number.isFinite(obj.cost)) {
      errors.push({ field: 'cost', message: 'Field "cost" must be a finite number', value: obj.cost });
    } else if (obj.cost < 0) {
      errors.push({ field: 'cost', message: 'Field "cost" must be non-negative', value: obj.cost });
    }
  }

  // tokens
  if (obj.tokens !== undefined && obj.tokens !== null) {
    if (typeof obj.tokens !== 'number' || !Number.isFinite(obj.tokens)) {
      errors.push({
        field: 'tokens',
        message: 'Field "tokens" must be a finite number',
        value: obj.tokens,
      });
    } else if (obj.tokens < 0) {
      errors.push({ field: 'tokens', message: 'Field "tokens" must be non-negative', value: obj.tokens });
    }
  }

  // duration
  if (obj.duration !== undefined && obj.duration !== null) {
    if (typeof obj.duration !== 'number' || !Number.isFinite(obj.duration)) {
      errors.push({
        field: 'duration',
        message: 'Field "duration" must be a finite number',
        value: obj.duration,
      });
    } else if (obj.duration < 0) {
      errors.push({
        field: 'duration',
        message: 'Field "duration" must be non-negative',
        value: obj.duration,
      });
    }
  }

  // --- Semantic checks ---

  // tool_call should have a tool field
  if (obj.type === 'tool_call' && !obj.tool) {
    errors.push({
      field: 'tool',
      message: 'Events of type "tool_call" should include a "tool" field',
      value: obj.tool,
    });
  }

  // tool_result should have a result field
  if (obj.type === 'tool_result' && !obj.result) {
    errors.push({
      field: 'result',
      message: 'Events of type "tool_result" should include a "result" field',
      value: obj.result,
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Format validation errors into a human-readable string.
 *
 * @param errors - Array of ValidationError objects
 * @returns Formatted error string
 */
export function formatValidationErrors(errors: ValidationError[]): string {
  if (errors.length === 0) return '';
  return errors.map(e => `[${e.field}] ${e.message} (got: ${JSON.stringify(e.value)})`).join('; ');
}
