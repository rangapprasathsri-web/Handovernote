import fs from 'fs/promises';
import path from 'path';
import { NormalizedEvent } from '../models/events.js';
import { SourceConfig } from '../models/sourceConfig.js';
import { SourceAdapter } from './types.js';
import {
  RawIncidentRecord,
  IncidentNormalizationError,
  normalize_event,
} from './incidentNormalizer.js';

export type { RawIncidentRecord };
export { IncidentNormalizationError, normalize_event };

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
