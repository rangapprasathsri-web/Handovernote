import { NormalizedEvent } from '../models/events.js';
import { normalizeTimestamp } from '../utils/timestampNormalizer.js';

export interface RawTicketRecord {
  ticket_id: string;
  created_at: string;
  subject: string;
  ticket_status: string;
  urgency?: string;
  assignee?: string | null;
  severity_level?: string;
  description?: string;
  tags?: string[];
  updated_by?: string | null;
}

export class TicketNormalizationError extends Error {
  public recordId?: string;
  constructor(message: string, recordId?: string) {
    super(message);
    this.name = 'TicketNormalizationError';
    this.recordId = recordId;
  }
}

/**
 * Normalizes a raw ticketing system record into the shared NormalizedEvent contract.
 * Uses the shared timestamp normalization utility to reject missing or malformed timestamps.
 */
export function normalize_event(
  raw: RawTicketRecord,
  targetTimezone: string = 'Asia/Kolkata'
): NormalizedEvent {
  if (!raw || typeof raw !== 'object') {
    throw new TicketNormalizationError('Ticket record must be a non-null object');
  }

  const recordId = typeof raw.ticket_id === 'string' ? raw.ticket_id.trim() : '';
  if (!recordId) {
    throw new TicketNormalizationError("Missing or empty required field 'ticket_id'");
  }

  if (typeof raw.subject !== 'string' || !raw.subject.trim()) {
    throw new TicketNormalizationError(
      `Ticket '${recordId}' is missing required field 'subject'`,
      recordId
    );
  }

  if (typeof raw.ticket_status !== 'string' || !raw.ticket_status.trim()) {
    throw new TicketNormalizationError(
      `Ticket '${recordId}' is missing required field 'ticket_status'`,
      recordId
    );
  }

  // Normalize timestamp with strict timezone awareness check
  const tsResult = normalizeTimestamp(raw.created_at, targetTimezone);
  if (tsResult.valid === false) {
    throw new TicketNormalizationError(
      `Ticket '${recordId}' has invalid timestamp: ${(tsResult as { error: string }).error}`,
      recordId
    );
  }

  return {
    source: 'ticketing',
    record_id: recordId,
    // Provide timezone-aware ISO string formatted in the shift target timezone
    timestamp: tsResult.timezoneIso,
    original_timestamp: tsResult.original,
    normalized_timestamp_utc: tsResult.utcIso,
    summary: raw.subject.trim(),
    status: raw.ticket_status.trim(),
    priority: raw.urgency || null,
    owner: raw.assignee ?? null,
    severity: raw.severity_level || null,
    details: raw.description || null,
    updated_by: raw.updated_by || null,
  };
}
