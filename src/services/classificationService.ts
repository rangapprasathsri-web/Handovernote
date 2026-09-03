import { DeduplicatedRecord } from '../models/deduplication.js';
import {
  HANDOVER_SECTIONS_ORDER,
  HandoverItem,
  HandoverNote,
  HandoverSection,
  HandoverSectionTitle,
  HandoverSummaryMetrics,
} from '../models/handover.js';
import { GenerationRequest, GenerationWarning, SourceStats } from '../models/generation.js';

const COMPLETED_STATUSES = new Set(['closed', 'resolved', 'done', 'completed']);
const IN_PROGRESS_STATUSES = new Set([
  'in_progress',
  'assigned',
  'working',
  'investigating',
  'verifying',
  'active',
]);
const BLOCKER_STATUSES = new Set(['blocked', 'escalated']);

/**
 * Checks if a status indicates completion.
 */
export function isCompletedStatus(status: string): boolean {
  const s = (status || '').trim().toLowerCase();
  return COMPLETED_STATUSES.has(s);
}

/**
 * Checks if a record meets the criteria for Blockers / Escalations:
 * - Status is 'blocked' or 'escalated'
 * - OR item is high-severity/p1/critical and not completed
 * - OR item is high-severity open with no owner
 * - OR details/tags explicitly note an active blocker/escalation
 */
export function isBlockerOrEscalation(record: DeduplicatedRecord): boolean {
  const status = (record.latest_status || '').trim().toLowerCase();
  const severity = (record.severity || '').trim().toLowerCase();
  const priority = (record.priority || '').trim().toLowerCase();

  // 1. Explicit blocker status
  if (BLOCKER_STATUSES.has(status) || status.includes('block') || status.includes('escalat')) {
    return true;
  }

  // If already resolved or closed, it's not currently blocking
  if (isCompletedStatus(status)) {
    return false;
  }

  // 2. Critical or P1 severity/priority that remains unresolved
  if (severity === 'p1' || severity === 'critical' || priority === 'critical' || priority === 'p1') {
    return true;
  }

  // 3. High severity open item with no owner or unassigned
  if ((severity === 'high' || priority === 'high') && status === 'open' && !record.owner) {
    return true;
  }

  // 4. Grounded mention of active blocker/escalation in details
  if (record.details) {
    const d = record.details.toLowerCase();
    if (d.includes('active escalated blocker') || d.includes('escalated blocker') || d.includes('active blocker')) {
      return true;
    }
  }

  return false;
}

/**
 * Checks if a record meets the criteria for In Progress:
 * Status indicates active work and is not a blocker.
 */
export function isInProgressStatus(status: string): boolean {
  const s = (status || '').trim().toLowerCase();
  return IN_PROGRESS_STATUSES.has(s);
}

/**
 * Deterministically assigns a deduplicated record to exactly one of the four sections
 * using documented precedence:
 * Blockers / Escalations → Completed → In Progress → Watch-list
 */
export function classify_record(record: DeduplicatedRecord): HandoverSectionTitle {
  // Precedence 1: Blockers / Escalations
  if (isBlockerOrEscalation(record)) {
    return 'Blockers / Escalations';
  }

  // Precedence 2: Completed
  if (isCompletedStatus(record.latest_status)) {
    return 'Completed';
  }

  // Precedence 3: In Progress
  if (isInProgressStatus(record.latest_status)) {
    return 'In Progress';
  }

  // Precedence 4: Watch-list (monitoring, open, pending, review, scheduled, etc.)
  return 'Watch-list';
}

/**
 * Formats grounded item text strictly from source fields.
 * Never invents ungrounded advice or unsupported claims.
 */
export function formatHandoverItemText(record: DeduplicatedRecord): string {
  const parts: string[] = [];

  // Lead with record ID and summary
  parts.push(`${record.record_id} — ${record.latest_summary.trim()}`);

  // Include details if present and not duplicate of summary
  if (record.details && record.details.trim()) {
    const cleanDetails = record.details.trim();
    if (!record.latest_summary.toLowerCase().includes(cleanDetails.toLowerCase())) {
      // Ensure clean punctuation
      const separator = cleanDetails.startsWith('.') || cleanDetails.startsWith(':') ? '' : '. ';
      parts.push(`${separator}${cleanDetails}`);
    }
  }

  // If there was a state progression observed across multiple shift updates, append it
  if (record.progression) {
    parts.push(` (Status progression: ${record.progression})`);
  }

  return parts.join('');
}

/**
 * Creates a HandoverItem from a DeduplicatedRecord and its section assignment.
 */
export function createHandoverItem(
  record: DeduplicatedRecord,
  section: HandoverSectionTitle
): HandoverItem {
  return {
    section,
    item: formatHandoverItemText(record),
    source: `${record.source}:${record.record_id}`,
    source_system: record.source,
    record_id: record.record_id,
    timestamp: record.latest_timestamp,
    status: record.latest_status,
    priority: record.priority ?? null,
    severity: record.severity ?? null,
    owner: record.owner ?? null,
    evidence_event_count: record.update_count,
    raw_record: record,
  };
}

/**
 * Computes a deterministic content fingerprint for the generated handover note.
 */
function computeFingerprint(
  shiftStart: string,
  shiftEnd: string,
  items: HandoverItem[]
): string {
  const content = [
    shiftStart,
    shiftEnd,
    ...items.map((i) => `${i.section}|${i.source}|${i.timestamp}|${i.status}|${i.item}`),
  ].join(';;');

  // Fast deterministic 32-bit FNV-1a hash formatted as 8-character hex
  let hash = 2166136261;
  for (let i = 0; i < content.length; i++) {
    hash ^= content.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/**
 * Builds a grounded, objective activity overview statement based on generated items.
 */
function buildActivityOverview(
  metrics: HandoverSummaryMetrics,
  sections: Record<HandoverSectionTitle, HandoverItem[]>
): string {
  if (metrics.records_represented === 0) {
    return 'No activity was recorded during the specified shift window across all configured sources.';
  }

  const parts: string[] = [];

  const completedCount = sections['Completed'].length;
  const inProgressCount = sections['In Progress'].length;
  const blockersCount = sections['Blockers / Escalations'].length;
  const watchCount = sections['Watch-list'].length;

  parts.push(
    `During this shift, ${metrics.records_represented} operational record${
      metrics.records_represented === 1 ? '' : 's'
    } were tracked across ${metrics.events_in_shift} event update${
      metrics.events_in_shift === 1 ? '' : 's'
    }.`
  );

  const breakdown: string[] = [];
  if (blockersCount > 0) {
    breakdown.push(`${blockersCount} active blocker${blockersCount === 1 ? '' : 's'}/escalation${blockersCount === 1 ? '' : 's'}`);
  }
  if (completedCount > 0) {
    breakdown.push(`${completedCount} item${completedCount === 1 ? '' : 's'} completed`);
  }
  if (inProgressCount > 0) {
    breakdown.push(`${inProgressCount} in progress`);
  }
  if (watchCount > 0) {
    breakdown.push(`${watchCount} on watch-list`);
  }

  if (breakdown.length > 0) {
    parts.push(`Summary: ${breakdown.join(', ')}.`);
  }

  if (metrics.updates_consolidated > 0) {
    parts.push(
      `${metrics.updates_consolidated} duplicate or interim update${
        metrics.updates_consolidated === 1 ? '' : 's'
      } consolidated.`
    );
  }

  return parts.join(' ');
}

/**
 * Classifies deduplicated records into four sections and constructs the complete HandoverNote.
 */
export function buildHandoverNote(
  request: GenerationRequest,
  deduplicatedRecords: DeduplicatedRecord[],
  sourceStats: SourceStats[],
  warnings: GenerationWarning[],
  errors: string[]
): HandoverNote {
  const sections: Record<HandoverSectionTitle, HandoverItem[]> = {
    'Completed': [],
    'In Progress': [],
    'Blockers / Escalations': [],
    'Watch-list': [],
  };

  const allItems: HandoverItem[] = [];

  for (const record of deduplicatedRecords) {
    const sectionTitle = classify_record(record);
    const item = createHandoverItem(record, sectionTitle);
    sections[sectionTitle].push(item);
    allItems.push(item);
  }

  // Deterministically sort items within each section:
  // 1. Timestamp ascending (epoch ms)
  // 2. Source ascending
  // 3. Record ID ascending
  for (const title of HANDOVER_SECTIONS_ORDER) {
    sections[title].sort((a, b) => {
      const timeA = Date.parse(a.timestamp);
      const timeB = Date.parse(b.timestamp);
      if (timeA !== timeB) {
        return timeA - timeB;
      }
      const sourceComp = a.source_system.localeCompare(b.source_system);
      if (sourceComp !== 0) {
        return sourceComp;
      }
      return a.record_id.localeCompare(b.record_id);
    });
  }

  const orderedSections: HandoverSection[] = HANDOVER_SECTIONS_ORDER.map((title) => ({
    title,
    items: sections[title],
  }));

  const recordsReviewed = sourceStats.reduce((sum, s) => sum + (s.fetched_count ?? s.fetched ?? 0), 0);
  const eventsInShift = sourceStats.reduce((sum, s) => sum + (s.included_count ?? s.included ?? 0), 0);
  const recordsRepresented = deduplicatedRecords.length;
  const updatesConsolidated = Math.max(0, eventsInShift - recordsRepresented);
  const sourcesWithWarnings = sourceStats.filter(
    (s) => s.status === 'error' || (s.warnings && s.warnings.length > 0)
  ).length;

  const metrics: HandoverSummaryMetrics = {
    records_reviewed: recordsReviewed,
    events_in_shift: eventsInShift,
    records_represented: recordsRepresented,
    updates_consolidated: updatesConsolidated,
    sources_with_warnings: sourcesWithWarnings,
  };

  const sourceDisplayNames = sourceStats.map((s) => s.source_name || s.source);

  const overview = buildActivityOverview(metrics, sections);
  const fingerprint = computeFingerprint(request.shift_start, request.shift_end, allItems);

  const allSourcesFailed =
    sourceStats.length > 0 && sourceStats.every((s) => s.status === 'error' || s.status === 'skipped');

  return {
    title: 'Shift Handover Note',
    shift_start: request.shift_start,
    shift_end: request.shift_end,
    timezone: request.timezone,
    sources: request.sources,
    source_display_names: sourceDisplayNames,
    overview,
    sections,
    ordered_sections: orderedSections,
    metrics,
    deduplicated_records: deduplicatedRecords,
    source_stats: sourceStats,
    warnings,
    errors,
    status: allSourcesFailed ? 'failed' : 'ready',
    fingerprint,
    generated_at: new Date().toISOString(),
  };
}
