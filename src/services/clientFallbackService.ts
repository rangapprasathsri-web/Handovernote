import rawTicketing from '../../data/ticketing.json';
import rawIncidents from '../../data/incidents.json';
import rawQuietOps from '../../data/quiet_ops.json';

import {
  normalize_event as normalizeTicket,
  RawTicketRecord,
} from '../sources/ticketNormalizer.js';
import {
  normalize_event as normalizeIncident,
  RawIncidentRecord,
} from '../sources/incidentNormalizer.js';
import {
  validateNormalizedEvent,
  NormalizedEvent,
} from '../models/events.js';
import {
  GenerationRequest,
  GenerationResult,
  SourceStats,
  GenerationWarning,
  validateGenerationRequest,
} from '../models/generation.js';
import {
  compareNormalizedEvents,
  isWithinShiftWindow,
} from '../utils/timestampNormalizer.js';
import { deduplicate_events } from '../models/deduplication.js';
import { buildHandoverNote } from './classificationService.js';
import { generateHandoverPdf, generateHandoverFilename } from './pdfService.js';
import { HandoverNote } from '../models/handover.js';
import {
  HandoverHistoryRecord,
  HandoverHistoryListResponse,
  HandoverHistoryFilterOptions,
} from '../models/history.js';
import { REGISTERED_SOURCES } from '../config/sources.js';

const STORAGE_KEY = 'shiftflow_handovers_history';

/**
 * Generates an in-browser deterministic history ID.
 */
function generateClientHistoryId(fingerprint: string): string {
  const shortFp = (fingerprint || 'unknown').slice(0, 8);
  const timestamp = Date.now();
  const rand = Math.random().toString(36).substring(2, 6);
  return `ho_${timestamp}_${shortFp}_${rand}`;
}

/**
 * Loads records from the embedded fixtures.
 */
function loadFixtureRecords(sourceId: string): unknown[] {
  switch (sourceId) {
    case 'ticketing':
      return rawTicketing as unknown[];
    case 'incidents':
      return rawIncidents as unknown[];
    case 'quiet_ops':
      return rawQuietOps as unknown[];
    default:
      return [];
  }
}

/**
 * Normalizes a raw fixture record for a given source.
 */
function normalizeClientRecord(
  sourceId: string,
  raw: unknown,
  timezone: string
): NormalizedEvent {
  if (sourceId === 'ticketing') {
    return normalizeTicket(raw as RawTicketRecord, timezone);
  }
  if (sourceId === 'incidents') {
    return normalizeIncident(raw as RawIncidentRecord, timezone);
  }
  return raw as NormalizedEvent;
}

/**
 * Client-Side Handover Generation Pipeline.
 *
 * Runs the complete, mathematically identical 10-step ShiftFlow pipeline directly
 * inside the browser. Used seamlessly on static deployments (e.g., Vercel, Netlify,
 * or GitHub Pages) or when backend API routes are unavailable.
 */
export async function generateHandoverClient(
  request: GenerationRequest
): Promise<GenerationResult> {
  const startTime = Date.now();

  // 1. Request Validation
  const validation = validateGenerationRequest(request);
  if (!validation.valid) {
    throw new Error(`Generation validation failed: ${validation.errors.join('; ')}`);
  }

  const shiftStartEpochMs = Date.parse(request.shift_start);
  const shiftEndEpochMs = Date.parse(request.shift_end);

  const inWindowEvents: NormalizedEvent[] = [];
  const sourceStatsList: SourceStats[] = [];
  const warnings: GenerationWarning[] = [];
  const errors: string[] = [];

  for (const sourceId of request.sources) {
    const sourceConfig = REGISTERED_SOURCES.find((s) => s.id === sourceId) || {
      id: sourceId,
      name: sourceId,
    };

    const rawRecords = loadFixtureRecords(sourceId);
    const fetchedCount = rawRecords.length;
    let includedCount = 0;
    let excludedCount = 0;
    let skippedCount = 0;
    const sourceSpecificWarnings: string[] = [];

    for (const rawRecord of rawRecords) {
      try {
        const normalized = normalizeClientRecord(sourceId, rawRecord, request.timezone);
        const eventValidation = validateNormalizedEvent(normalized);
        if (!eventValidation.valid) {
          throw new Error(eventValidation.errors.join('; '));
        }

        const eventEpochMs = Date.parse(
          normalized.normalized_timestamp_utc || normalized.timestamp
        );
        if (Number.isNaN(eventEpochMs)) {
          throw new Error(
            `Unable to parse event timestamp '${normalized.timestamp}'`
          );
        }

        if (isWithinShiftWindow(eventEpochMs, shiftStartEpochMs, shiftEndEpochMs)) {
          inWindowEvents.push(normalized);
          includedCount++;
        } else {
          excludedCount++;
        }
      } catch (recErr) {
        skippedCount++;
        const errMsg = recErr instanceof Error ? recErr.message : String(recErr);
        sourceSpecificWarnings.push(errMsg);

        let recordId: string | undefined;
        if (rawRecord && typeof rawRecord === 'object') {
          const r = rawRecord as Record<string, unknown>;
          recordId = (r.ticket_id || r.incident_id || r.record_id || r.id) as string | undefined;
        }

        warnings.push({
          code: 'RECORD_SKIPPED_MALFORMED',
          message: `Skipped malformed record in '${sourceConfig.name}': ${errMsg}`,
          source: sourceId,
          record_id: recordId || null,
          level: 'warning',
          timestamp: new Date().toISOString(),
        });
      }
    }

    let sourceStatus: 'ok' | 'success' | 'error' | 'skipped' = 'ok';
    if (fetchedCount > 0 && skippedCount === fetchedCount) {
      sourceStatus = 'error';
    }

    sourceStatsList.push({
      source: sourceId,
      source_id: sourceId,
      source_name: sourceConfig.name,
      fetched: fetchedCount,
      fetched_count: fetchedCount,
      included: includedCount,
      included_count: includedCount,
      excluded: excludedCount,
      excluded_out_of_window_count: excludedCount,
      skipped: skippedCount,
      skipped_malformed_count: skippedCount,
      status: sourceStatus,
      warnings: sourceSpecificWarnings,
      error_message: null,
    });
  }

  // Sort deterministically
  inWindowEvents.sort(compareNormalizedEvents);

  // Deduplicate
  const deduplicationResult = deduplicate_events(inWindowEvents);

  // Build Note
  const handoverNote = buildHandoverNote(
    request,
    deduplicationResult.records,
    sourceStatsList,
    warnings,
    errors
  );

  // Persist locally
  if (handoverNote) {
    saveClientHistory(handoverNote);
  }

  const durationMs = Date.now() - startTime;

  return {
    shift_start: request.shift_start,
    shift_end: request.shift_end,
    timezone: request.timezone,
    items: inWindowEvents,
    events: inWindowEvents,
    source_stats: sourceStatsList,
    warnings,
    errors,
    status: 'ready',
    meta: {
      generated_at: new Date().toISOString(),
      pipeline_step: 'Shift Handover Generation Pipeline (Client Mode)',
      duration_ms: durationMs,
      notes: `${deduplicationResult.unique_records_count} records represented across 4 sections.`,
    },
    note: handoverNote,
    handover_note: handoverNote,
    deduplicated_records: deduplicationResult.records,
    sections: handoverNote.sections,
    ordered_sections: handoverNote.ordered_sections,
    metrics: handoverNote.metrics,
    overview: handoverNote.overview,
    fingerprint: handoverNote.fingerprint,
  };
}

/**
 * Stores a handover note in browser localStorage.
 */
export function saveClientHistory(note: HandoverNote): HandoverHistoryRecord {
  const recordId = generateClientHistoryId(note.fingerprint);
  const nowIso = new Date().toISOString();

  const record: HandoverHistoryRecord = {
    id: recordId,
    title: note.title,
    shift_window: {
      shift_start: note.shift_start,
      shift_end: note.shift_end,
    },
    timezone: note.timezone,
    sources: [...note.sources],
    generated_at: note.generated_at || nowIso,
    fingerprint: note.fingerprint,
    note: JSON.parse(JSON.stringify(note)),
    created_at: nowIso,
    updated_at: nowIso,
  };

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const list: HandoverHistoryRecord[] = raw ? JSON.parse(raw) : [];

    // Deduplicate by fingerprint
    const existingIndex = list.findIndex((h) => h.fingerprint === note.fingerprint);
    if (existingIndex >= 0) {
      list[existingIndex] = {
        ...list[existingIndex],
        note: record.note,
        updated_at: nowIso,
      };
    } else {
      list.unshift(record);
    }

    // Keep max 100
    if (list.length > 100) {
      list.length = 100;
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // LocalStorage quota or unavailable in some sandbox contexts
  }

  return record;
}

/**
 * Lists history records from browser localStorage.
 */
export function getClientHistory(
  options: HandoverHistoryFilterOptions = {}
): HandoverHistoryListResponse {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    let list: HandoverHistoryRecord[] = raw ? JSON.parse(raw) : [];

    if (options.source && options.source.trim()) {
      const src = options.source.trim();
      list = list.filter((r) => r.sources.includes(src));
    }

    const page = Math.max(1, options.page || 1);
    const limit = Math.max(1, options.limit || 20);
    const total = list.length;
    const startIndex = (page - 1) * limit;
    const items = list.slice(startIndex, startIndex + limit);

    return {
      items,
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit) || 1,
    };
  } catch {
    return {
      items: [],
      total: 0,
      page: 1,
      limit: 20,
      total_pages: 1,
    };
  }
}

/**
 * Retrieves a single history record by ID from localStorage.
 */
export function getClientHistoryById(id: string): HandoverNote | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const list: HandoverHistoryRecord[] = JSON.parse(raw);
    const found = list.find((h) => h.id === id);
    return found ? (found.note || null) : null;
  } catch {
    return null;
  }
}

/**
 * Gets total history count.
 */
export function getClientHistoryCount(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return 0;
    const list: unknown[] = JSON.parse(raw);
    return Array.isArray(list) ? list.length : 0;
  } catch {
    return 0;
  }
}

/**
 * Returns source previews for client-side inspector.
 */
export function getClientSourcePreview(sourceId: string) {
  const records = loadFixtureRecords(sourceId);
  const config = REGISTERED_SOURCES.find((s) => s.id === sourceId);

  return {
    source_id: sourceId,
    name: config?.name || sourceId,
    type: config?.type || 'seeded_json',
    total_records: records.length,
    sample: records.slice(0, 3),
    sample_records: records.slice(0, 3),
    schema_fields:
      records.length > 0 && typeof records[0] === 'object' && records[0] !== null
        ? Object.keys(records[0])
        : [],
  };
}

/**
 * Generates and downloads the PDF directly in the browser.
 */
export async function downloadHandoverPdfClient(note: HandoverNote): Promise<void> {
  const pdfBytes = await generateHandoverPdf(note);
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const url = window.URL.createObjectURL(blob);
  const filename = generateHandoverFilename(note);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}
