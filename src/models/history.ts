import { HandoverNote } from './handover.js';

export interface HandoverShiftWindow {
  shift_start: string;
  shift_end: string;
}

export interface HandoverHistoryRecord {
  /** Generated unique history identifier (e.g. 'ho_1725350400000_abcde') */
  id: string;
  /** Human-readable handover title */
  title: string;
  /** Shift window boundaries */
  shift_window: HandoverShiftWindow;
  /** Primary operational timezone */
  timezone: string;
  /** List of ingested source IDs */
  sources: string[];
  /** ISO-8601 UTC timestamp of note creation */
  generated_at: string;
  /** Deterministic content fingerprint for deduplicating identical runs */
  fingerprint: string;
  /** Full structured HandoverNote document matching the production contract */
  note: HandoverNote;
  /** Metadata timestamp for storage audit */
  created_at?: string;
  updated_at?: string;
}

export interface HandoverHistoryFilterOptions {
  page?: number;
  limit?: number;
  source?: string;
  startDate?: string;
  endDate?: string;
}

export interface HandoverHistoryListResponse {
  items: HandoverHistoryRecord[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}
