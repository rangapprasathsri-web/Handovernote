import {
  NormalizedEvent,
  validateNormalizedEvent,
} from '../models/events.js';
import {
  GenerationRequest,
  GenerationResult,
  GenerationWarning,
  SourceStats,
  validateGenerationRequest,
} from '../models/generation.js';
import { getAdapter, getSourceConfigById } from '../sources/registry.js';
import {
  compareNormalizedEvents,
  isWithinShiftWindow,
} from '../utils/timestampNormalizer.js';
import { deduplicate_events, DeduplicationResult } from '../models/deduplication.js';
import {
  buildHandoverNote,
  classify_record,
} from './classificationService.js';
import { HandoverNote } from '../models/handover.js';

export class GenerationValidationError extends Error {
  public errors: string[];
  constructor(errors: string[]) {
    super(`Generation request validation failed: ${errors.join('; ')}`);
    this.name = 'GenerationValidationError';
    this.errors = errors;
  }
}

/**
 * Executes Step 2 of the Shift Handover pipeline:
 *
 * 1. Validates the incoming generation request (ISO 8601 timestamps, valid timezone, valid sources).
 * 2. Resolves configured adapters for each requested source.
 * 3. Ingests raw records via the respective source adapter.
 * 4. Normalizes records to the NormalizedEvent contract using centralized timezone normalization.
 * 5. Resiliently skips and logs individual malformed records without failing the pipeline.
 * 6. Applies strict half-open shift-window filtering: shift_start <= event_timestamp < shift_end.
 * 7. Records per-source counts (fetched, included, excluded, skipped) and diagnostics.
 * 8. Deterministically sorts in-window events by:
 *      (a) normalized timestamp ascending (epoch ms),
 *      (b) source ID ascending,
 *      (c) record ID ascending.
 * 9. Returns a structured GenerationResult / FetchResult contract.
 */
export async function fetch_and_filter_events(
  request: GenerationRequest
): Promise<GenerationResult> {
  const startTime = Date.now();

  // 1. Request Validation
  const validation = validateGenerationRequest(request);
  if (!validation.valid) {
    throw new GenerationValidationError(validation.errors);
  }

  const shiftStartEpochMs = Date.parse(request.shift_start);
  const shiftEndEpochMs = Date.parse(request.shift_end);

  const warnings: GenerationWarning[] = [];
  const errors: string[] = [];
  const sourceStatsList: SourceStats[] = [];
  const inWindowEvents: NormalizedEvent[] = [];

  // 2. Iterate through each requested source
  for (const sourceId of request.sources) {
    const config = getSourceConfigById(sourceId);

    // 2a. Source configuration lookup
    if (!config) {
      const msg = `Requested source '${sourceId}' is not registered in source configuration.`;
      warnings.push({
        code: 'SOURCE_NOT_CONFIGURED',
        message: msg,
        source: sourceId,
        level: 'error',
        timestamp: new Date().toISOString(),
      });
      errors.push(msg);

      sourceStatsList.push({
        source: sourceId,
        source_id: sourceId,
        source_name: sourceId,
        fetched: 0,
        fetched_count: 0,
        included: 0,
        included_count: 0,
        excluded: 0,
        excluded_out_of_window_count: 0,
        skipped: 0,
        skipped_malformed_count: 0,
        status: 'error',
        warnings: [msg],
        error_message: `Source '${sourceId}' not found in configuration`,
      });
      continue;
    }

    // 2b. Source enabled check
    if (!config.enabled) {
      const msg = `Source '${config.name}' (${sourceId}) is currently disabled.`;
      warnings.push({
        code: 'SOURCE_DISABLED',
        message: msg,
        source: sourceId,
        level: 'info',
        timestamp: new Date().toISOString(),
      });

      sourceStatsList.push({
        source: sourceId,
        source_id: sourceId,
        source_name: config.name,
        fetched: 0,
        fetched_count: 0,
        included: 0,
        included_count: 0,
        excluded: 0,
        excluded_out_of_window_count: 0,
        skipped: 0,
        skipped_malformed_count: 0,
        status: 'skipped',
        warnings: [msg],
        error_message: 'Source is disabled',
      });
      continue;
    }

    // 2c. Resolve adapter
    const adapter = getAdapter(sourceId);
    if (!adapter) {
      const msg = `No adapter registered for source '${sourceId}'`;
      warnings.push({
        code: 'ADAPTER_MISSING',
        message: msg,
        source: sourceId,
        level: 'error',
        timestamp: new Date().toISOString(),
      });
      errors.push(msg);

      sourceStatsList.push({
        source: sourceId,
        source_id: sourceId,
        source_name: config.name,
        fetched: 0,
        fetched_count: 0,
        included: 0,
        included_count: 0,
        excluded: 0,
        excluded_out_of_window_count: 0,
        skipped: 0,
        skipped_malformed_count: 0,
        status: 'error',
        warnings: [msg],
        error_message: msg,
      });
      continue;
    }

    // 3. Load records from adapter
    let rawRecords: unknown[];
    try {
      if (typeof adapter.load_records === 'function') {
        rawRecords = await adapter.load_records(config);
      } else {
        rawRecords = await adapter.loadSourceEvents(config);
      }
    } catch (loadErr) {
      const errMsg = loadErr instanceof Error ? loadErr.message : String(loadErr);
      const msg = `Failed to load data for source '${config.name}': ${errMsg}`;
      warnings.push({
        code: 'SOURCE_LOAD_FAILED',
        message: msg,
        source: sourceId,
        level: 'error',
        timestamp: new Date().toISOString(),
      });
      errors.push(msg);

      sourceStatsList.push({
        source: sourceId,
        source_id: sourceId,
        source_name: config.name,
        fetched: 0,
        fetched_count: 0,
        included: 0,
        included_count: 0,
        excluded: 0,
        excluded_out_of_window_count: 0,
        skipped: 0,
        skipped_malformed_count: 0,
        status: 'error',
        warnings: [errMsg],
        error_message: errMsg,
      });
      continue;
    }

    // 4. Ingest and filter records for this source
    const recordsArray = Array.isArray(rawRecords) ? rawRecords : [];
    const fetchedCount = recordsArray.length;
    let includedCount = 0;
    let excludedCount = 0;
    let skippedCount = 0;
    const sourceSpecificWarnings: string[] = [];

    for (const rawRecord of recordsArray) {
      try {
        // Normalize record
        const normalized: NormalizedEvent =
          typeof adapter.normalize_record === 'function'
            ? adapter.normalize_record(rawRecord, request.timezone)
            : adapter.normalizeEvent(rawRecord, request.timezone);

        // Validate normalized event against shared contract
        const validationResult = validateNormalizedEvent(normalized);
        if (!validationResult.valid) {
          throw new Error(validationResult.errors.join('; '));
        }

        // Parse normalized timestamp to epoch ms for temporal comparison
        const eventEpochMs = Date.parse(
          normalized.normalized_timestamp_utc || normalized.timestamp
        );
        if (Number.isNaN(eventEpochMs)) {
          throw new Error(
            `Unable to parse event timestamp '${normalized.timestamp}' into calendar date/time`
          );
        }

        // Apply strict half-open window: shift_start <= event_timestamp < shift_end
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

        // Attempt to extract record ID if present on raw record
        let recordId: string | undefined;
        if (rawRecord && typeof rawRecord === 'object') {
          const r = rawRecord as Record<string, unknown>;
          recordId = (r.ticket_id || r.incident_id || r.record_id || r.id) as string | undefined;
        }

        warnings.push({
          code: 'RECORD_SKIPPED_MALFORMED',
          message: `Skipped malformed record in '${config.name}': ${errMsg}`,
          source: sourceId,
          record_id: recordId || null,
          level: 'warning',
          timestamp: new Date().toISOString(),
        });
      }
    }

    // Determine status for this source
    let sourceStatus: 'ok' | 'success' | 'error' | 'skipped' = 'ok';
    if (fetchedCount > 0 && skippedCount === fetchedCount) {
      sourceStatus = 'error';
    }

    sourceStatsList.push({
      source: sourceId,
      source_id: sourceId,
      source_name: config.name,
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

  // 5. Deterministic sorting of in-window events
  // Primary: Normalized timestamp ascending
  // Secondary: Source ID ascending
  // Tertiary: Record ID ascending
  inWindowEvents.sort(compareNormalizedEvents);

  // 6. Deduplicate events
  const deduplicationResult = deduplicate_events(inWindowEvents);

  // 7. Check if all sources failed
  const allSourcesFailed =
    sourceStatsList.length > 0 &&
    sourceStatsList.every((s) => s.status === 'error' || s.status === 'skipped');

  const overallStatus = allSourcesFailed ? 'failed' : 'ready';

  // 8. Pipeline diagnostic notice
  warnings.push({
    code: 'STEP_2_FILTERING_COMPLETE',
    message: `Ingestion & filtering complete: Processed ${inWindowEvents.length} in-window events into ${deduplicationResult.unique_records_count} deduplicated records.`,
    level: 'info',
    timestamp: new Date().toISOString(),
  });

  // 9. Build structured Handover Note
  const handoverNote = buildHandoverNote(
    request,
    deduplicationResult.records,
    sourceStatsList,
    warnings,
    errors
  );

  const durationMs = Date.now() - startTime;

  return {
    shift_start: request.shift_start,
    shift_end: request.shift_end,
    timezone: request.timezone,
    // Step 1 compatibility: items
    items: inWindowEvents,
    // Step 2 naming: events
    events: inWindowEvents,
    source_stats: sourceStatsList,
    warnings,
    errors,
    status: overallStatus,
    meta: {
      generated_at: new Date().toISOString(),
      pipeline_step: 'Shift Handover Generation Pipeline',
      duration_ms: durationMs,
      notes: `${deduplicationResult.unique_records_count} records represented across 4 sections.`,
    },
    // Production handover properties:
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
 * Direct function to generate a complete HandoverNote document.
 */
export async function generate_handover_note(
  request: GenerationRequest
): Promise<HandoverNote> {
  const result = await fetch_and_filter_events(request);
  if (!result.note) {
    throw new Error('Handover note could not be built');
  }
  return result.note;
}

export { deduplicate_events, classify_record };

/**
 * Backward-compatible alias for orchestrating the generation pipeline.
 */
export const orchestrateGeneration = fetch_and_filter_events;
