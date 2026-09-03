import { isTimezoneAwareIso8601, NormalizedEvent } from './events.js';
import { DeduplicatedRecord } from './deduplication.js';
import {
  HandoverItem,
  HandoverNote,
  HandoverSection,
  HandoverSectionTitle,
  HandoverSummaryMetrics,
} from './handover.js';

export interface GenerationRequest {
  shift_start: string;
  shift_end: string;
  timezone: string;
  sources: string[];
}

export interface SourceStats {
  /** Identifier of the source (e.g. 'ticketing') */
  source: string;
  /** Legacy alias for source identifier (Step 1 compatibility) */
  source_id: string;
  /** Human-readable display name */
  source_name: string;
  /** Total raw records fetched from the source fixture */
  fetched: number;
  /** Alias for total fetched (Step 2 naming) */
  fetched_count: number;
  /** Records falling strictly inside the shift window [shift_start, shift_end) */
  included: number;
  /** Alias for records included in window (Step 2 naming) */
  included_count: number;
  /** Records excluded because they are outside the shift window */
  excluded: number;
  /** Alias for records excluded out of window (Step 2 naming) */
  excluded_out_of_window_count: number;
  /** Records skipped due to malformed timestamps or missing required fields */
  skipped: number;
  /** Alias for malformed records skipped (Step 2 naming) */
  skipped_malformed_count: number;
  /** Processing status for this source */
  status: 'ok' | 'success' | 'error' | 'skipped';
  /** Source-level warning messages */
  warnings: string[];
  /** Error message if source failed to load */
  error_message?: string | null;
}

export interface GenerationWarning {
  code: string;
  message: string;
  source?: string | null;
  record_id?: string | null;
  level: 'info' | 'warning' | 'error';
  timestamp: string;
}

export interface GenerationResult {
  shift_start: string;
  shift_end: string;
  timezone: string;
  /** In-window normalized events (Step 1 compatibility name) */
  items: NormalizedEvent[];
  /** In-window normalized events (Step 2 naming) */
  events: NormalizedEvent[];
  source_stats: SourceStats[];
  warnings: GenerationWarning[];
  /** Array of hard error messages if generation encountered errors */
  errors: string[];
  status: 'ready' | 'failed';
  meta?: {
    generated_at: string;
    pipeline_step?: string;
    duration_ms: number;
    notes?: string;
  };
  /** Complete structured handover note */
  note?: HandoverNote;
  handover_note?: HandoverNote;
  /** Collapsed records across events */
  deduplicated_records?: DeduplicatedRecord[];
  /** Four section categorized items */
  sections?: Record<HandoverSectionTitle, HandoverItem[]>;
  ordered_sections?: HandoverSection[];
  metrics?: HandoverSummaryMetrics;
  overview?: string;
  fingerprint?: string;
}

export interface RequestValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validates whether an IANA timezone identifier is valid using standard Intl.
 */
export function isValidTimezone(tz: unknown): boolean {
  if (typeof tz !== 'string' || !tz.trim()) {
    return false;
  }
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz.trim() });
    return true;
  } catch {
    return false;
  }
}

/**
 * Validates a GenerationRequest according to Step 1 specifications:
 * 1. Required fields presence (shift_start, shift_end, timezone, sources)
 * 2. shift_start must be timezone-aware ISO 8601
 * 3. shift_end must be timezone-aware ISO 8601
 * 4. shift_end must be strictly after shift_start
 * 5. timezone must be valid IANA timezone
 * 6. at least one source selected in sources array
 */
export function validateGenerationRequest(req: unknown): RequestValidationResult {
  const errors: string[] = [];

  if (!req || typeof req !== 'object') {
    return { valid: false, errors: ['Request body must be a non-null object'] };
  }

  const r = req as Record<string, unknown>;

  // 1. shift_start
  if (!r.shift_start || typeof r.shift_start !== 'string' || r.shift_start.trim() === '') {
    errors.push("Field 'shift_start' is required");
  } else if (!isTimezoneAwareIso8601(r.shift_start)) {
    errors.push(
      `Field 'shift_start' must be a timezone-aware ISO 8601 timestamp (received: '${r.shift_start}')`
    );
  }

  // 2. shift_end
  if (!r.shift_end || typeof r.shift_end !== 'string' || r.shift_end.trim() === '') {
    errors.push("Field 'shift_end' is required");
  } else if (!isTimezoneAwareIso8601(r.shift_end)) {
    errors.push(
      `Field 'shift_end' must be a timezone-aware ISO 8601 timestamp (received: '${r.shift_end}')`
    );
  }

  // 3. Chronological order (shift_end > shift_start)
  if (
    typeof r.shift_start === 'string' &&
    typeof r.shift_end === 'string' &&
    isTimezoneAwareIso8601(r.shift_start) &&
    isTimezoneAwareIso8601(r.shift_end)
  ) {
    const startTime = Date.parse(r.shift_start);
    const endTime = Date.parse(r.shift_end);

    if (endTime <= startTime) {
      errors.push(
        `Shift end (${r.shift_end}) must be chronologically after shift start (${r.shift_start})`
      );
    }
  }

  // 4. Timezone validation
  if (!r.timezone || typeof r.timezone !== 'string' || r.timezone.trim() === '') {
    errors.push("Field 'timezone' is required");
  } else if (!isValidTimezone(r.timezone)) {
    errors.push(`Invalid timezone '${r.timezone}'. Must be a valid IANA timezone name`);
  }

  // 5. Sources array
  if (!Array.isArray(r.sources)) {
    errors.push("Field 'sources' is required and must be an array");
  } else if (r.sources.length === 0) {
    errors.push('At least one source must be selected');
  } else {
    for (let i = 0; i < r.sources.length; i++) {
      if (typeof r.sources[i] !== 'string' || r.sources[i].trim() === '') {
        errors.push(`Source at index ${i} must be a non-empty string`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
