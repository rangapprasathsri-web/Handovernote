import fs from 'fs/promises';
import path from 'path';
import { NormalizedEvent } from '../models/events.js';
import { SourceConfig } from '../models/sourceConfig.js';
import { normalizeTimestamp } from '../utils/timestampNormalizer.js';
import { SourceAdapter } from './types.js';

export interface RawIncidentRecord {
  incident_id: string;
  reported_at: string;
  headline: string;
  incident_state: string;
  priority?: string;
  severity?: string;
  incident_commander?: string | null;
  impact_summary?: string;
  subsystem?: string;
  updated_by?: string | null;
}

export class IncidentNormalizationError extends Error {
  public recordId?: string;
  constructor(message: string, recordId?: string) {
    super(message);
    this.name = 'IncidentNormalizationError';
    this.recordId = recordId;
  }
}

/**
 * Loads raw records from the configured incident/operations source fixture.
 */
export async function load_source_events(config: SourceConfig): Promise<RawIncidentRecord[]> {
  const resolvedPath = path.isAbsolute(config.path)
    ? config.path
    : path.resolve(process.cwd(), config.path);

  const fileData = await fs.readFile(resolvedPath, 'utf-8');
  const parsed = JSON.parse(fileData);

  if (!Array.isArray(parsed)) {
    throw new Error(`Expected array of incident records in ${config.path}, received ${typeof parsed}`);
  }

  return parsed as RawIncidentRecord[];
}

/**
 * Normalizes a raw incident/operations record into the shared NormalizedEvent contract.
 * Uses the shared timestamp normalization utility to reject missing or malformed timestamps.
 */
export function normalize_event(
  raw: RawIncidentRecord,
  targetTimezone: string = 'Asia/Kolkata'
): NormalizedEvent {
  if (!raw || typeof raw !== 'object') {
    throw new IncidentNormalizationError('Incident record must be a non-null object');
  }

  const recordId = typeof raw.incident_id === 'string' ? raw.incident_id.trim() : '';
  if (!recordId) {
    throw new IncidentNormalizationError("Missing or empty required field 'incident_id'");
  }

  if (typeof raw.headline !== 'string' || !raw.headline.trim()) {
    throw new IncidentNormalizationError(
      `Incident '${recordId}' is missing required field 'headline'`,
      recordId
    );
  }

  if (typeof raw.incident_state !== 'string' || !raw.incident_state.trim()) {
    throw new IncidentNormalizationError(
      `Incident '${recordId}' is missing required field 'incident_state'`,
      recordId
    );
  }

  // Normalize timestamp with strict timezone awareness check
  const tsResult = normalizeTimestamp(raw.reported_at, targetTimezone);
  if (tsResult.valid === false) {
    throw new IncidentNormalizationError(
      `Incident '${recordId}' has invalid timestamp: ${(tsResult as { error: string }).error}`,
      recordId
    );
  }

  return {
    source: 'incidents',
    record_id: recordId,
    // Provide timezone-aware ISO string formatted in the shift target timezone
    timestamp: tsResult.timezoneIso,
    original_timestamp: tsResult.original,
    normalized_timestamp_utc: tsResult.utcIso,
    summary: raw.headline.trim(),
    status: raw.incident_state.trim(),
    priority: raw.priority || null,
    owner: raw.incident_commander ?? null,
    severity: raw.severity || null,
    details: raw.impact_summary || null,
    updated_by: raw.updated_by || null,
  };
}

export class IncidentAdapter implements SourceAdapter<RawIncidentRecord> {
  public readonly id = 'incidents';
  public readonly source_id = 'incidents';
  public readonly name = 'Incident Management';
  public readonly display_name = 'Incident Management';

  async loadSourceEvents(config: SourceConfig): Promise<RawIncidentRecord[]> {
    return load_source_events(config);
  }

  async load_records(config: SourceConfig): Promise<RawIncidentRecord[]> {
    return load_source_events(config);
  }

  normalizeEvent(raw: RawIncidentRecord, targetTimezone?: string): NormalizedEvent {
    return normalize_event(raw, targetTimezone);
  }

  normalize_record(raw: RawIncidentRecord, targetTimezone?: string): NormalizedEvent {
    return normalize_event(raw, targetTimezone);
  }
}

export const incidentsAdapter = new IncidentAdapter();
