/**
 * Shared Normalized Event Data Contract
 *
 * Defines the standard shape of all events ingested across disparate sources
 * (ticketing, incident management, chat logs, monitoring alerts, etc.).
 */

export interface NormalizedEvent {
  /** The originating source identifier (e.g. 'ticketing', 'incidents') */
  source: string;
  /** Unique identifier of the record in the originating source */
  record_id: string;
  /** ISO 8601 timestamp with explicit timezone offset (e.g. 2026-09-03T19:42:00+05:30) */
  timestamp: string;
  /** Brief summary or title of the event */
  summary: string;
  /** Current state/status (e.g. 'open', 'in_progress', 'resolved', 'escalated', 'monitoring') */
  status: string;
  /** Priority level (e.g. 'low', 'medium', 'high', 'critical') */
  priority?: string | null;
  /** Current owner or assignee */
  owner?: string | null;
  /** Severity rating (e.g. 'low', 'medium', 'high', 'critical', 'p1', 'p2') */
  severity?: string | null;
  /** Extended details, notes, or root cause context */
  details?: string | null;
  /** Optional author or user who last modified the record */
  updated_by?: string | null;
  /** Original raw timestamp string preserved from the source for auditability/diagnostics */
  original_timestamp?: string | null;
  /** Canonical UTC ISO 8601 string (e.g. 2026-09-03T14:12:00.000Z) */
  normalized_timestamp_utc?: string | null;
}

export interface EventValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validates whether a timestamp string is an ISO 8601 timestamp WITH an explicit timezone designator (Z or +/-HH:MM).
 * Ambiguous local timestamps (e.g., '2026-09-03T19:42:00') are strictly rejected.
 */
export function isTimezoneAwareIso8601(ts: unknown): boolean {
  if (typeof ts !== 'string' || !ts.trim()) {
    return false;
  }
  const trimmed = ts.trim();

  // Must match ISO 8601 format ending with either 'Z' or a timezone offset like '+05:30' or '-07:00'
  const isoWithTzPattern =
    /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d{1,6})?)?(?:Z|[+-]\d{2}:?\d{2})$/i;

  if (!isoWithTzPattern.test(trimmed)) {
    return false;
  }

  const parsed = Date.parse(trimmed);
  return !Number.isNaN(parsed);
}

/**
 * Validates a normalized event against the strict data contract.
 * Required fields: source, record_id, timestamp (timezone-aware), summary, status.
 */
export function validateNormalizedEvent(event: unknown): EventValidationResult {
  const errors: string[] = [];

  if (!event || typeof event !== 'object') {
    return { valid: false, errors: ['Event must be a non-null object'] };
  }

  const record = event as Record<string, unknown>;

  // 1. source (required non-empty string)
  if (typeof record.source !== 'string' || record.source.trim() === '') {
    errors.push("Field 'source' is required and must be a non-empty string");
  }

  // 2. record_id (required non-empty string)
  if (typeof record.record_id !== 'string' || record.record_id.trim() === '') {
    errors.push("Field 'record_id' is required and must be a non-empty string");
  }

  // 3. timestamp (required, timezone-aware ISO 8601)
  if (!record.timestamp) {
    errors.push("Field 'timestamp' is required");
  } else if (!isTimezoneAwareIso8601(record.timestamp)) {
    errors.push(
      `Field 'timestamp' must be a valid timezone-aware ISO 8601 string (received: '${record.timestamp}'). Ambiguous local timestamps without offset or Z are rejected.`
    );
  }

  // 4. summary (required non-empty string)
  if (typeof record.summary !== 'string' || record.summary.trim() === '') {
    errors.push("Field 'summary' is required and must be a non-empty string");
  }

  // 5. status (required non-empty string)
  if (typeof record.status !== 'string' || record.status.trim() === '') {
    errors.push("Field 'status' is required and must be a non-empty string");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
