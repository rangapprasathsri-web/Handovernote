import { NormalizedEvent } from '../models/events.js';
import { SourceConfig } from '../models/sourceConfig.js';

/**
 * Interface defining the contract for all source adapters.
 * Even though Step 1 loads local JSON fixtures, this abstraction ensures
 * API-based or database adapters can be introduced in later steps without
 * altering the generation orchestration pipeline.
 */
export interface SourceAdapter<TRaw = unknown> {
  /** Source identifier matching SourceConfig.id (Step 1 naming) */
  id: string;
  /** Source identifier matching SourceConfig.id (Step 2 naming) */
  source_id: string;
  /** Human-readable display name (Step 1 naming) */
  name: string;
  /** Human-readable display name (Step 2 naming) */
  display_name: string;
  /** Loads raw records from the underlying data source (Step 1 naming) */
  loadSourceEvents(config: SourceConfig): Promise<TRaw[]>;
  /** Loads raw records from the underlying data source (Step 2 naming) */
  load_records(config: SourceConfig): Promise<TRaw[]>;
  /** Maps a source-specific raw record into the shared NormalizedEvent contract (Step 1 naming) */
  normalizeEvent(raw: TRaw, targetTimezone?: string): NormalizedEvent;
  /** Maps a source-specific raw record into the shared NormalizedEvent contract (Step 2 naming) */
  normalize_record(raw: TRaw, targetTimezone?: string): NormalizedEvent;
}
