/**
 * Timestamp Normalization Utility
 *
 * Provides a single, centralized normalization mechanism for all source adapters
 * and the shift-window filtering service.
 *
 * Rules:
 * - Accepts valid ISO 8601 timestamps with explicit timezone offsets ('Z' or '+/-HH:MM').
 * - Normalizes to UTC representation and epoch milliseconds for strict, reliable temporal comparisons.
 * - Formats timestamps into the target/configured shift timezone for consistent reporting.
 * - Strictly rejects missing, empty, or unparseable timestamps.
 * - Strictly rejects naive/ambiguous timestamps that lack an explicit timezone offset.
 * - Preserves the original timestamp string for downstream traceability and diagnostics.
 */

import { formatInTimezone, getTimezoneOffsetString, parseIsoWithOffset } from './date.js';

export interface NormalizedTimestampResult {
  valid: true;
  /** Original raw string as provided in the source event */
  original: string;
  /** Exact instant in Unix epoch milliseconds */
  epochMs: number;
  /** Canonical UTC ISO 8601 string (e.g. 2026-09-03T14:12:00.000Z) */
  utcIso: string;
  /** ISO 8601 string formatted with offset in the specified target timezone */
  timezoneIso: string;
  /** The target timezone name used */
  timezone: string;
}

export interface TimestampNormalizationError {
  valid: false;
  error: string;
  original?: unknown;
}

export type TimestampResult = NormalizedTimestampResult | TimestampNormalizationError;

/**
 * Strict ISO 8601 pattern requiring explicit timezone designator:
 * Matches YYYY-MM-DD[T or space]HH:mm(:ss(.sss)?) followed strictly by Z or +/-HH(:MM)?
 */
const STRICT_TZ_AWARE_ISO_REGEX =
  /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d{1,6})?)?(?:Z|[+-]\d{2}:?\d{2})$/i;

/**
 * Normalizes a raw timestamp string to a canonical representation.
 *
 * @param raw - The timestamp string from a source record
 * @param targetTimezone - IANA timezone to project the normalized timestamp into (defaults to 'Asia/Kolkata')
 */
export function normalizeTimestamp(
  raw: unknown,
  targetTimezone: string = 'Asia/Kolkata'
): TimestampResult {
  if (raw === null || raw === undefined) {
    return {
      valid: false,
      error: 'Timestamp is missing (null or undefined)',
      original: raw,
    };
  }

  if (typeof raw !== 'string') {
    return {
      valid: false,
      error: `Timestamp must be a string, received ${typeof raw}`,
      original: raw,
    };
  }

  const trimmed = raw.trim();
  if (trimmed === '') {
    return {
      valid: false,
      error: 'Timestamp is an empty string',
      original: raw,
    };
  }

  // Reject naive timestamps missing timezone offset (e.g. "2026-09-03T17:00:00")
  if (!STRICT_TZ_AWARE_ISO_REGEX.test(trimmed)) {
    return {
      valid: false,
      error: `Timestamp '${trimmed}' is not a timezone-aware ISO 8601 string. Naive local timestamps without an offset ('Z' or '+/-HH:MM') are rejected.`,
      original: raw,
    };
  }

  const parsedEpochMs = Date.parse(trimmed);
  if (Number.isNaN(parsedEpochMs)) {
    return {
      valid: false,
      error: `Timestamp '${trimmed}' could not be parsed into a valid calendar date/time`,
      original: raw,
    };
  }

  const dateObj = new Date(parsedEpochMs);
  const utcIso = dateObj.toISOString();

  // Compute representation in target timezone
  let timezoneIso: string;
  try {
    const offset = getTimezoneOffsetString(targetTimezone, dateObj);
    // Format date parts in target timezone
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: targetTimezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    // en-CA produces YYYY-MM-DD, HH:mm:ss
    const formatted = formatter.format(dateObj).replace(', ', 'T');
    timezoneIso = `${formatted}${offset}`;
  } catch {
    timezoneIso = utcIso;
  }

  return {
    valid: true,
    original: trimmed,
    epochMs: parsedEpochMs,
    utcIso,
    timezoneIso,
    timezone: targetTimezone,
  };
}

/**
 * Checks whether an event epoch milliseconds falls within the shift window
 * using the strict half-open interval rule:
 *
 * shift_start <= event_timestamp < shift_end
 *
 * - Includes an event whose timestamp is exactly equal to shift_start.
 * - Excludes an event whose timestamp is exactly equal to shift_end.
 */
export function isWithinShiftWindow(
  eventEpochMs: number,
  shiftStartEpochMs: number,
  shiftEndEpochMs: number
): boolean {
  return eventEpochMs >= shiftStartEpochMs && eventEpochMs < shiftEndEpochMs;
}

/**
 * Deterministic event comparator:
 * 1. Normalized timestamp (chronological epoch milliseconds ascending)
 * 2. Source ID (alphabetical ascending)
 * 3. Record ID (alphabetical ascending)
 */
export function compareNormalizedEvents(
  a: { timestamp: string; source: string; record_id: string; normalized_timestamp_utc?: string },
  b: { timestamp: string; source: string; record_id: string; normalized_timestamp_utc?: string }
): number {
  const timeA = Date.parse(a.normalized_timestamp_utc || a.timestamp);
  const timeB = Date.parse(b.normalized_timestamp_utc || b.timestamp);

  if (timeA !== timeB) {
    return timeA - timeB;
  }

  const sourceCmp = a.source.localeCompare(b.source);
  if (sourceCmp !== 0) {
    return sourceCmp;
  }

  return a.record_id.localeCompare(b.record_id);
}
