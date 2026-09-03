import { DeduplicatedRecord } from './deduplication.js';
import { GenerationWarning, SourceStats } from './generation.js';

export type HandoverSectionTitle =
  | 'Completed'
  | 'In Progress'
  | 'Blockers / Escalations'
  | 'Watch-list';

export const HANDOVER_SECTIONS_ORDER: HandoverSectionTitle[] = [
  'Completed',
  'In Progress',
  'Blockers / Escalations',
  'Watch-list',
];

export interface HandoverItem {
  section: HandoverSectionTitle;
  /** Formatted grounded summary string */
  item: string;
  /** Source identifier with record ID (e.g. 'ticketing:OPS-4821') */
  source: string;
  /** Source system ID (e.g. 'ticketing') */
  source_system: string;
  /** Individual record ID (e.g. 'OPS-4821') */
  record_id: string;
  /** Event timestamp with timezone */
  timestamp: string;
  /** Current status at the end of the shift */
  status: string;
  priority?: string | null;
  severity?: string | null;
  owner?: string | null;
  /** Number of raw events supporting this item */
  evidence_event_count: number;
  /** Raw deduplicated record for deep inspection */
  raw_record?: DeduplicatedRecord;
}

export interface HandoverSection {
  title: HandoverSectionTitle;
  items: HandoverItem[];
}

export interface HandoverSummaryMetrics {
  records_reviewed: number;
  events_in_shift: number;
  records_represented: number;
  updates_consolidated: number;
  sources_with_warnings: number;
}

export interface HandoverNote {
  title: string;
  shift_start: string;
  shift_end: string;
  timezone: string;
  sources: string[];
  source_display_names: string[];
  overview: string;
  sections: Record<HandoverSectionTitle, HandoverItem[]>;
  ordered_sections: HandoverSection[];
  metrics: HandoverSummaryMetrics;
  deduplicated_records: DeduplicatedRecord[];
  source_stats: SourceStats[];
  warnings: GenerationWarning[];
  errors: string[];
  status: 'ready' | 'failed';
  fingerprint: string;
  generated_at: string;
}
