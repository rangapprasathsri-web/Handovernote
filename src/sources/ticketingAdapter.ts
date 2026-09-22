import fs from 'fs/promises';
import path from 'path';
import { NormalizedEvent } from '../models/events.js';
import { SourceConfig } from '../models/sourceConfig.js';
import { SourceAdapter } from './types.js';
import {
  RawTicketRecord,
  TicketNormalizationError,
  normalize_event,
} from './ticketNormalizer.js';

export type { RawTicketRecord };
export { TicketNormalizationError, normalize_event };

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
