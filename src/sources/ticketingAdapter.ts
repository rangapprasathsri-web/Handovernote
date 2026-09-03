import fs from 'fs/promises';
import path from 'path';
import { NormalizedEvent } from '../models/events.js';
import { SourceConfig } from '../models/sourceConfig.js';
import { normalizeTimestamp } from '../utils/timestampNormalizer.js';
import { SourceAdapter } from './types.js';

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
 * Loads raw records from the configured ticketing source fixture.
 */
export async function load_source_events(config: SourceConfig): Promise<RawTicketRecord[]> {
  const resolvedPath = path.isAbsolute(config.path)
    ? config.path
    : path.resolve(process.cwd(), config.path);

  const fileData = await fs.readFile(resolvedPath, 'utf-8');
  const parsed = JSON.parse(fileData);

  if (!Array.isArray(parsed)) {
    throw new Error(`Expected array of ticket records in ${config.path}, received ${typeof parsed}`);
  }

  return parsed as RawTicketRecord[];
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

export class TicketingAdapter implements SourceAdapter<RawTicketRecord> {
  public readonly id = 'ticketing';
  public readonly source_id = 'ticketing';
  public readonly name = 'Ticketing System';
  public readonly display_name = 'Ticketing System';

  async loadSourceEvents(config: SourceConfig): Promise<RawTicketRecord[]> {
    return load_source_events(config);
  }

  async load_records(config: SourceConfig): Promise<RawTicketRecord[]> {
    return load_source_events(config);
  }

  normalizeEvent(raw: RawTicketRecord, targetTimezone?: string): NormalizedEvent {
    return normalize_event(raw, targetTimezone);
  }

  normalize_record(raw: RawTicketRecord, targetTimezone?: string): NormalizedEvent {
    return normalize_event(raw, targetTimezone);
  }
}

export const ticketingAdapter = new TicketingAdapter();
