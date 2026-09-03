import { NormalizedEvent } from './events.js';

export interface DeduplicatedRecord {
  /** Source system identifier (e.g., 'ticketing', 'incidents') */
  source: string;
  /** Unique record ID within that source */
  record_id: string;
  /** The most recent timestamp recorded for this record within the shift window */
  latest_timestamp: string;
  /** The initial timestamp observed for this record within the shift window */
  first_timestamp: string;
  /** Status of the record at the end of the shift window */
  latest_status: string;
  /** Summary or headline from the latest update */
  latest_summary: string;
  /** Priority rating (if any) */
  priority?: string | null;
  /** Severity rating (e.g., 'p1', 'p2', 'critical') */
  severity?: string | null;
  /** Current owner or assignee */
  owner?: string | null;
  /** Extended details, notes, or impact description from latest update */
  details?: string | null;
  /** High-level progression observed across updates (e.g. 'open → in_progress') */
  progression?: string | null;
  /** Total number of raw updates collapsed for this record */
  update_count: number;
  /** Full list of chronological events collapsed into this record */
  events: NormalizedEvent[];
}

export interface DeduplicationResult {
  /** Deduplicated records, exactly one per unique (source, record_id) pair */
  records: DeduplicatedRecord[];
  /** Total raw events received as input */
  total_events: number;
  /** Count of unique records */
  unique_records_count: number;
  /** Total updates collapsed (total_events - unique_records_count) */
  updates_collapsed_count: number;
}

/**
 * Secondary stable comparator for events with identical timestamps.
 */
function stableSecondaryCompare(a: NormalizedEvent, b: NormalizedEvent): number {
  const statusComp = (a.status || '').localeCompare(b.status || '');
  if (statusComp !== 0) return statusComp;
  return (a.summary || '').localeCompare(b.summary || '');
}

/**
 * Deterministically deduplicates a list of in-window NormalizedEvents.
 * Collapses multiple updates to the same (source, record_id) into a single grounded record.
 * Never merges records across different source systems even if their IDs match.
 */
export function deduplicate_events(events: NormalizedEvent[]): DeduplicationResult {
  if (!events || events.length === 0) {
    return {
      records: [],
      total_events: 0,
      unique_records_count: 0,
      updates_collapsed_count: 0,
    };
  }

  // 1. Group events strictly by source and record_id
  const groups = new Map<string, NormalizedEvent[]>();

  for (const event of events) {
    const key = `${event.source}:::${event.record_id}`;
    const existing = groups.get(key);
    if (existing) {
      existing.push(event);
    } else {
      groups.set(key, [event]);
    }
  }

  const deduplicatedRecords: DeduplicatedRecord[] = [];

  // 2. Process each group
  for (const [, groupEvents] of groups.entries()) {
    // Sort group chronologically ascending
    groupEvents.sort((a, b) => {
      const timeA = Date.parse(a.normalized_timestamp_utc || a.timestamp);
      const timeB = Date.parse(b.normalized_timestamp_utc || b.timestamp);
      if (timeA !== timeB) {
        return timeA - timeB;
      }
      return stableSecondaryCompare(a, b);
    });

    const first = groupEvents[0];
    const latest = groupEvents[groupEvents.length - 1];

    // Build state progression if status changed
    const statusSequence: string[] = [];
    for (const ev of groupEvents) {
      const s = ev.status.trim();
      if (statusSequence.length === 0 || statusSequence[statusSequence.length - 1] !== s) {
        statusSequence.push(s);
      }
    }
    const progression = statusSequence.length > 1 ? statusSequence.join(' → ') : null;

    deduplicatedRecords.push({
      source: latest.source,
      record_id: latest.record_id,
      latest_timestamp: latest.timestamp,
      first_timestamp: first.timestamp,
      latest_status: latest.status,
      latest_summary: latest.summary,
      priority: latest.priority ?? null,
      severity: latest.severity ?? null,
      owner: latest.owner ?? null,
      details: latest.details ?? null,
      progression,
      update_count: groupEvents.length,
      events: groupEvents,
    });
  }

  // 3. Deterministically sort deduplicated records:
  // Primary: latest_timestamp ascending (epoch ms)
  // Secondary: source ascending
  // Tertiary: record_id ascending
  deduplicatedRecords.sort((a, b) => {
    const timeA = Date.parse(a.latest_timestamp);
    const timeB = Date.parse(b.latest_timestamp);
    if (timeA !== timeB) {
      return timeA - timeB;
    }
    const sourceComp = a.source.localeCompare(b.source);
    if (sourceComp !== 0) {
      return sourceComp;
    }
    return a.record_id.localeCompare(b.record_id);
  });

  return {
    records: deduplicatedRecords,
    total_events: events.length,
    unique_records_count: deduplicatedRecords.length,
    updates_collapsed_count: Math.max(0, events.length - deduplicatedRecords.length),
  };
}
